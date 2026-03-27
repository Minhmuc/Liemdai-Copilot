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
import threading
import asyncio

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

class SessionTitleRequest(BaseModel):
    title: str

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

@app.delete("/sessions")
async def clear_all_sessions():
    """Delete all persistent chat data from LanceDB."""
    global current_session_id
    try:
        result = memory.clear_all_data()
        current_session_id = None
        ask_mode.clear_history()
        return {
            "status": "cleared",
            "removed_rows": result.get("removed_rows", 0)
        }
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

@app.patch("/session/{session_id}/title")
async def rename_session(session_id: str, request: SessionTitleRequest):
    """Rename a chat session"""
    try:
        result = memory.set_session_title(session_id, request.title)
        return {"status": "updated", **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/session/{session_id}/duplicate")
async def duplicate_session(session_id: str):
    """Duplicate an existing chat session into a new session"""
    global current_session_id
    try:
        new_session_id = str(uuid.uuid4())
        result = memory.duplicate_session(session_id, new_session_id)
        ask_mode.set_session(new_session_id)
        current_session_id = new_session_id
        return {"status": "duplicated", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    global current_session_id
    try:
        result = memory.clear_session(session_id)
        if current_session_id == session_id:
            current_session_id = None
            ask_mode.clear_history()
        return result
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
    
    # Thread-safe state for confirmation flow (agent execution runs in worker thread)
    confirmation_lock = threading.Lock()
    confirmation_event = threading.Event()
    confirmation_result = {"value": None}
    pending_request_id = {"value": None}
    active_ws_session_id = {"value": None}
    active_agent_stop_event = {"value": None}
    active_agent_future = {"value": None}
    active_agent_runner = {"value": None}
    active_agent_executor = {"value": None}

    async def finalize_agent_result(result: dict, session_id: str, stop_event):
        """Send and persist agent result if task wasn't cancelled by user."""
        if stop_event and stop_event.is_set():
            return

        # Check if any dangerous operations were skipped
        skipped_dangerous = [r for r in result['results'] if r.get('is_dangerous', False) and r.get('skipped', False)]

        if skipped_dangerous:
            warning_text = f"⏭️ Đã bỏ qua {len(skipped_dangerous)} thao tác nguy hiểm"
            if memory:
                memory.add_message(warning_text, "assistant", session_id, tags=["agent_status"])
            await websocket.send_json({
                "type": "warning",
                "content": warning_text
            })

        # Send final result
        await websocket.send_json({
            "type": "response",
            "content": result['final_message'],
            "success": result['success'],
            "iterations": result['iterations'],
            "session_id": session_id,
            "done": True
        })

        # Save final assistant response to persistent memory.
        if memory:
            memory.add_message(result['final_message'], "assistant", session_id)

    async def monitor_agent_future(future, session_id: str, stop_event):
        """Wait for worker thread completion without blocking websocket receive loop."""
        try:
            result = await asyncio.get_event_loop().run_in_executor(None, future.result)
            await finalize_agent_result(result, session_id, stop_event)
        except Exception as e:
            if stop_event and stop_event.is_set():
                return
            err_text = f"❌ Lỗi: {str(e)}"
            if memory:
                memory.add_message(err_text, "assistant", session_id)
            await websocket.send_json({
                "type": "error",
                "content": err_text,
                "session_id": session_id,
                "done": True
            })
        finally:
            executor_ref = active_agent_executor["value"]
            if executor_ref:
                try:
                    executor_ref.shutdown(wait=False)
                except Exception:
                    pass
            active_agent_future["value"] = None
            active_agent_runner["value"] = None
            active_agent_stop_event["value"] = None
            active_agent_executor["value"] = None
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            message_type = data.get("type")
            
            if message_type == "chat":
                message = data.get("message", "")
                mode = data.get("mode", "ask")
                session_id = data.get("session_id") or str(uuid.uuid4())
                active_ws_session_id["value"] = session_id
                
                if mode == "ask":
                    # Ask mode
                    ask_mode.set_session(session_id)
                    response, has_task_intent = ask_mode.chat(message)
                    
                    await websocket.send_json({
                        "type": "response",
                        "content": response,
                        "has_task_intent": has_task_intent,
                        "session_id": session_id,
                        "done": True
                    })
                    
                elif mode == "agent":
                    # Agent mode - execute with confirmation callback
                    import concurrent.futures
                    loop = asyncio.get_running_loop()
                    last_saved_status = {"value": ""}
                    stop_event = threading.Event()
                    active_agent_stop_event["value"] = stop_event

                    # Cancel previous unfinished runner if any.
                    if active_agent_runner["value"]:
                        active_agent_runner["value"].cancel()
                        active_agent_runner["value"] = None
                    if active_agent_future["value"]:
                        try:
                            prev_stop = active_agent_stop_event.get("value")
                            if prev_stop:
                                prev_stop.set()
                        except Exception:
                            pass

                    def emit_progress(status_text: str):
                        """Best-effort realtime progress events from worker thread."""
                        if stop_event.is_set():
                            return

                        normalized = (status_text or "").strip()
                        if not normalized:
                            return

                        # Save progress line so timeline/status chat can be restored from LanceDB.
                        if memory and normalized != last_saved_status["value"]:
                            try:
                                memory.add_message(normalized, "assistant", session_id, tags=["agent_status"])
                                last_saved_status["value"] = normalized
                            except Exception:
                                pass

                        try:
                            fut = asyncio.run_coroutine_threadsafe(
                                websocket.send_json({
                                    "type": "status",
                                    "content": normalized
                                }),
                                loop
                            )
                            fut.result(timeout=5)
                        except Exception:
                            pass
                    
                    # Confirmation callback for agent mode
                    def request_confirmation(code: str, is_dangerous: bool) -> bool:
                        """Request confirmation from user via WebSocket"""
                        if stop_event.is_set():
                            return False

                        request_id = str(uuid.uuid4())

                        with confirmation_lock:
                            confirmation_result["value"] = None
                            pending_request_id["value"] = request_id
                            confirmation_event.clear()

                        # Send confirmation request to main event loop from worker thread
                        try:
                            send_future = asyncio.run_coroutine_threadsafe(
                                websocket.send_json({
                                    "type": "confirmation_request",
                                    "request_id": request_id,
                                    "code": code,
                                    "is_dangerous": is_dangerous,
                                    "content": "⚠️ Thao tác này có thể tác động tới hệ thống hoặc file hệ thống. Bạn có muốn tiếp tục không?"
                                }),
                                loop
                            )
                            send_future.result(timeout=10)
                        except Exception:
                            with confirmation_lock:
                                pending_request_id["value"] = None
                            return False

                        # Wait for confirmation (timeout => skip)
                        if not confirmation_event.wait(timeout=90):
                            with confirmation_lock:
                                pending_request_id["value"] = None
                            return False

                        with confirmation_lock:
                            approved = bool(confirmation_result["value"])
                            pending_request_id["value"] = None

                        return approved
                    
                    try:
                        # Save user request to persistent memory for session restore.
                        if memory:
                            memory.add_message(message, "user", session_id)

                        # Execute task with confirmation callback in thread pool
                        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                        active_agent_executor["value"] = executor
                        future = executor.submit(
                            agent_mode.execute_task,
                            message,
                            request_confirmation,
                            emit_progress,
                            lambda: stop_event.is_set()
                        )

                        active_agent_future["value"] = future
                        active_agent_runner["value"] = asyncio.create_task(
                            monitor_agent_future(future, session_id, stop_event)
                        )
                    except Exception as e:
                        err_text = f"❌ Lỗi: {str(e)}"
                        if memory:
                            memory.add_message(err_text, "assistant", session_id)
                        await websocket.send_json({
                            "type": "error",
                            "content": err_text,
                            "session_id": session_id,
                            "done": True
                        })
            
            elif message_type == "confirm":
                # Handle confirmation response
                confirmed = data.get("confirmed", False)
                request_id = data.get("request_id")

                with confirmation_lock:
                    current_request_id = pending_request_id["value"]
                    if not current_request_id:
                        await websocket.send_json({
                            "type": "status",
                            "content": "⚠️ Không có yêu cầu xác nhận đang chờ."
                        })
                        continue

                    if request_id and request_id != current_request_id:
                        await websocket.send_json({
                            "type": "status",
                            "content": "⚠️ Yêu cầu xác nhận đã hết hạn."
                        })
                        continue

                    confirmation_result["value"] = bool(confirmed)
                    confirmation_event.set()
                
                # Acknowledge
                ack_text = "✅ Đã xác nhận, đang thực thi bước này..." if confirmed else "⏭️ Đã bỏ qua bước này theo yêu cầu."
                if memory and active_ws_session_id["value"]:
                    try:
                        memory.add_message(ack_text, "assistant", active_ws_session_id["value"], tags=["agent_status"])
                    except Exception:
                        pass
                await websocket.send_json({
                    "type": "status",
                    "content": ack_text
                })

            elif message_type == "stop":
                stop_event = active_agent_stop_event["value"]
                if stop_event:
                    stop_event.set()

                with confirmation_lock:
                    confirmation_result["value"] = False
                    confirmation_event.set()
                    pending_request_id["value"] = None

                await websocket.send_json({
                    "type": "status",
                    "content": "⏹️ Tôi đã nhận lệnh dừng và sẽ ngắt tác vụ hiện tại."
                })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        stop_event = active_agent_stop_event["value"]
        if stop_event:
            stop_event.set()
        with confirmation_lock:
            confirmation_result["value"] = False
            confirmation_event.set()
            pending_request_id["value"] = None
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
