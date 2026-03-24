# Liemdai Copilot - Frontend/Backend Architecture

## 📁 Project Structure

```
Desktop-Copilot/
├── backend/              # FastAPI Backend Server
│   └── api.py            # Main API server
│
├── desktop/              # Electron desktop host
│   ├── main.js
│   ├── preload.js
│   └── package.json
│
├── frontend/             # Renderer UI (HTML/CSS/JS)
│   ├── index.html
│   ├── css/
│   └── js/
│
├── core/                # Core logic (shared by CLI & API)
│   ├── llm.py
│   ├── ask_mode.py
│   ├── agent_mode.py
│   ├── memory.py
│   └── executor.py
│
├── cli.py               # CLI entry point
└── README.md
```

---

## 🚀 Quick Start

### 1. Cài đặt Dependencies

**Python backend:**
```bash
pip install -r requirements.txt
```

**Desktop app:**
```bash
cd desktop
npm install
```

### 2. Cấu hình (.env)

Tạo file `.env` ở root folder:
```bash
GEMINI_API_KEY=your_api_key_here
LLM_PROVIDER=gemini
SAFE_MODE=true
```

### 3. Chạy Backend Server

```bash
# Từ root folder
python backend/api.py

# hoặc với uvicorn
uvicorn backend.api:app --reload
```

Server sẽ chạy tại: `http://localhost:8000`

**API Documentation:** http://localhost:8000/docs (Swagger UI)

### 4. Chạy Frontend

#### Option A: Desktop App (Khuyên dùng)

```bash
cd desktop
npm start
```

Desktop app tự chạy backend Python và frontend renderer.

#### Option B: Web Frontend (để debug)

1. Tạo file HTML:
```bash
cd frontend/web
python create_web.py
```

2. Mở `frontend/web/index.html` trong browser
   - Hoặc dùng Live Server extension trong VS Code

Mở `frontend/index.html` trực tiếp trong browser (khi backend đã chạy).

---

## 🔌 API Endpoints

### REST API

#### 1. Health Check
```bash
GET /
Response: {"status": "online", "version": "1.0.0"}
```

#### 2. Chat (Ask Mode)
```bash
POST /chat
Body: {
    "message": "Xin chào, bạn là ai?",
    "mode": "ask",
    "session_id": "optional_session_id"
}

Response: {
    "response": "Tôi là Liemdai Copilot...",
    "mode": "ask",
    "has_task_intent": false,
    "session_id": "generated_or_existing_session_id"
}
```

#### 3. Session Management
```bash
GET    /sessions
GET    /session/{session_id}
POST   /new-session
PATCH  /session/{session_id}/title
DELETE /session/{session_id}
```

#### 4. Execute Task (Agent Mode)
```bash
POST /execute
Body: {
    "task": "Tạo file Word 2 trang về AI agents"
}

Response: {
    "success": true,
    "iterations": 1,
    "final_message": "✅ Task hoàn thành!",
    "results": [...]
}
```

#### 5. Get History
```bash
GET /history
Response: {"history": [...]}
```

#### 6. Reset History
```bash
POST /reset
Response: {"status": "reset", "message": "Conversation history cleared"}
```

### WebSocket

**Endpoint:** `ws://localhost:8000/ws/chat`

**Client gửi:**
```json
{
    "type": "chat",
    "message": "Hello",
    "mode": "ask"
}
```

**Server trả về:**
```json
{
    "type": "response",
    "content": "Hello! How can I help?",
    "done": true
}
```

---

## 🎨 Frontend Options

### 1. **Desktop Frontend (Electron)** (Recommended)
- ✅ Native desktop app
- ✅ Auto-start backend
- ✅ Startup retry + loading flow
- ✅ Windows titlebar overlay integration

### 2. **Web Frontend (Debug)**
- ✅ Dễ debug HTML/CSS/JS
- ✅ Dùng cùng backend API

---

## 🛠️ Development

### Test API với curl:

```bash
# Health check
curl http://localhost:8000/

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "mode": "ask"}'
```

### Test với Python:

```python
import requests

# Ask mode
response = requests.post("http://localhost:8000/chat", json={
    "message": "Xin chào",
    "mode": "ask"
})
print(response.json())
```

---

## 📦 Deployment

### Gợi ý đóng gói desktop

- Build Electron app từ folder `desktop`
- Bundle backend Python cùng ứng dụng
- Ưu tiên Windows trước (môi trường hiện tại)

---

## ⚙️ Configuration

Tất cả config trong `.env`:

```bash
# LLM Provider
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Safety
SAFE_MODE=true
```

---

## 🤝 Contributing

Frontend/Backend tách biệt giúp:
- ✅ Development dễ dàng hơn
- ✅ Test độc lập từng phần
- ✅ Scale linh hoạt
- ✅ Hỗ trợ nhiều loại frontend

---

**Built with ❤️ by Liemdai Team**
