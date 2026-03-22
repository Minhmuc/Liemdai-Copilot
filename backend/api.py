"""
Liemdai Copilot - FastAPI Backend
Clean architecture with separated frontend/backend
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional, List
import sys
from pathlib import Path
import uuid

# Add project root to path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from core.llm import LLMProvider
from core.ask_mode import AskMode
from core.agent_mode import AgentMode
from core.memory import Memory

app = FastAPI(title="Liemdai Copilot API", version="1.0.0")

# CORS middleware for web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM, memory, and modes
print("🚀 Initializing Liemdai Copilot Backend...")
llm = LLMProvider()
memory = Memory()  # Initialize persistent memory
ask_mode = AskMode(llm, memory)
agent_mode = AgentMode(llm)

# Track current session
current_session_id = None

# ==================== Data Models ====================

class ChatRequest(BaseModel):
    message: str
    mode: Literal["ask", "agent"] = "ask"
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    mode: str
    has_task_intent: Optional[bool] = None
    session_id: Optional[str] = None

class TaskRequest(BaseModel):
    task: str

class TaskResponse(BaseModel):
    success: bool
    iterations: int
    final_message: str
    results: list

class HealthResponse(BaseModel):
    status: str
    version: str

# ==================== REST Endpoints ====================

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(status="online", version="1.0.0")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for Ask mode with session persistence
    
    Example:
        POST /chat
        {
            "message": "Xin chào, bạn là ai?",
            "mode": "ask",
            "session_id": "sess_abc123"
        }
    """
    global current_session_id
    
    try:
        # Create or load session
        session_id = request.session_id or str(uuid.uuid4())
        
        if not request.session_id or current_session_id != session_id:
            # New session or session switch
            ask_mode.set_session(session_id)
            current_session_id = session_id
        
        response, has_task_intent = ask_mode.chat(request.message)
        return ChatResponse(
            response=response,
            mode="ask",
            has_task_intent=has_task_intent,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions():
    """Get all past sessions with metadata"""
    try:
        sessions = memory.get_all_sessions()
        return {"sessions": sessions, "count": len(sessions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/session/{session_id}")
async def get_session_history(session_id: str):
    """Get all messages from a session"""
    try:
        messages = memory.get_session_history(session_id)
        return {"session_id": session_id, "messages": messages, "count": len(messages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/new-session")
async def create_new_session():
    """Create new chat session"""
    global current_session_id
    try:
        session_id = str(uuid.uuid4())
        ask_mode.set_session(session_id)
        current_session_id = session_id
        return {"session_id": session_id, "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute", response_model=TaskResponse)
async def execute_task(request: TaskRequest):
    """
    Execute task in Agent mode
    
    Example:
        POST /execute
        {
            "task": "Tạo file Word 2 trang về AI agents"
        }
    
    Note: This endpoint auto-confirms code execution.
    For interactive confirmation, use WebSocket endpoint.
    """
    try:
        result = agent_mode.execute_task(request.task)
        return TaskResponse(
            success=result['success'],
            iterations=result['iterations'],
            final_message=result['final_message'],
            results=result['results']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
async def get_history():
    """Get conversation history from Ask mode"""
    return {"history": ask_mode.conversation_history}

@app.post("/reset")
async def reset_history():
    """Reset conversation history"""
    ask_mode.conversation_history = []
    return {"status": "reset", "message": "Conversation history cleared"}

# ==================== WebSocket Endpoint ====================

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chat with streaming responses
    
    Client sends:
        {
            "type": "chat",
            "message": "Hello",
            "mode": "ask"
        }
        or
        {
            "type": "confirm",
            "confirmed": true
        }
    
    Server sends:
        {
            "type": "response" | "confirmation_request" | "status" | "error",
            "content": "...",
            "code": "...",  # for confirmation_request
            "is_dangerous": true,  # for confirmation_request
            "done": true
        }
    """
    await websocket.accept()
    
    # State for confirmation flow
    confirmation_result = None
    confirmation_event = None
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            message_type = data.get("type")
            
            if message_type == "chat":
                message = data.get("message", "")
                mode = data.get("mode", "ask")
                
                if mode == "ask":
                    # Ask mode
                    response, has_task_intent = ask_mode.chat(message)
                    
                    await websocket.send_json({
                        "type": "response",
                        "content": response,
                        "has_task_intent": has_task_intent,
                        "done": True
                    })
                    
                elif mode == "agent":
                    # Agent mode - execute with confirmation callback
                    await websocket.send_json({
                        "type": "status",
                        "content": f"🎯 Đang thực hiện: {message}"
                    })
                    
                    import asyncio
                    import concurrent.futures
                    
                    # Confirmation callback for agent mode
                    def request_confirmation(code: str, is_dangerous: bool) -> bool:
                        """Request confirmation from user via WebSocket"""
                        nonlocal confirmation_result, confirmation_event
                        
                        # Create event to wait for user response
                        confirmation_event = asyncio.Event()
                        confirmation_result = None
                        
                        # Send confirmation request via WebSocket
                        async def send_request():
                            await websocket.send_json({
                                "type": "confirmation_request",
                                "code": code,
                                "is_dangerous": is_dangerous,
                                "content": "⚠️ Thao tác này cần quyền đặc biệt (cài đặt/tải xuống). Xác nhận?"
                            })
                        
                        # Run in event loop
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(send_request())
                        
                        # Wait for confirmation (with timeout)
                        try:
                            loop.run_until_complete(asyncio.wait_for(confirmation_event.wait(), timeout=60.0))
                            return confirmation_result if confirmation_result is not None else False
                        except asyncio.TimeoutError:
                            return False
                    
                    try:
                        # Execute task with confirmation callback in thread pool
                        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                        future = executor.submit(agent_mode.execute_task, message, request_confirmation)
                        
                        # Wait for result with proper event loop handling
                        result = await asyncio.get_event_loop().run_in_executor(None, future.result)
                        
                        # Check if any dangerous operations were skipped
                        skipped_dangerous = [r for r in result['results'] if r.get('is_dangerous', False) and r.get('skipped', False)]
                        
                        if skipped_dangerous:
                            await websocket.send_json({
                                "type": "warning",
                                "content": f"⏭️ Đã bỏ qua {len(skipped_dangerous)} thao tác nguy hiểm"
                            })
                        
                        # Send final result
                        await websocket.send_json({
                            "type": "response",
                            "content": result['final_message'],
                            "success": result['success'],
                            "iterations": result['iterations'],
                            "done": True
                        })
                    except Exception as e:
                        await websocket.send_json({
                            "type": "error",
                            "content": f"❌ Lỗi: {str(e)}",
                            "done": True
                        })
            
            elif message_type == "confirm":
                # Handle confirmation response
                confirmed = data.get("confirmed", False)
                confirmation_result = confirmed
                
                if confirmation_event:
                    confirmation_event.set()
                
                # Acknowledge
                await websocket.send_json({
                    "type": "status",
                    "content": "✅ Đã xác nhận, đang thực thi..." if confirmed else "⏭️ Đã bỏ qua, tiếp tục..."
                })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "content": str(e)
        })

# ==================== Run Server ====================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Liemdai Copilot - Backend API Server")
    print("="*60)
    print("📡 Swagger Docs: http://localhost:8000/docs")
    print("🔌 WebSocket:    ws://localhost:8000/ws/chat")
    print("🌐 Frontend:     ../frontend/index.html")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
