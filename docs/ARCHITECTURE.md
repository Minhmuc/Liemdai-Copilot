# Liemdai Copilot - Frontend/Backend Architecture

## 📁 Project Structure

```
Desktop-Copilot/
├── backend/              # FastAPI Backend Server
│   ├── app.py           # Main API server
│   └── requirements.txt # Backend dependencies
│
├── frontend/            # Frontend options
│   ├── web/             # Web frontend (HTML/JS)
│   │   └── index.html
│   └── desktop/         # Desktop app (Flet - optional)
│
├── core/                # Core logic (shared by CLI & API)
│   ├── llm.py
│   ├── ask_mode.py
│   ├── agent_mode.py
│   └── executor.py
│
├── main.py              # CLI version (legacy)
└── README.md
```

---

## 🚀 Quick Start

### 1. Cài đặt Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
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
# Từ folder backend/
python app.py

# hoặc trực tiếp với uvicorn:
uvicorn app:app --reload
```

Server sẽ chạy tại: `http://localhost:8000`

**API Documentation:** http://localhost:8000/docs (Swagger UI)

### 4. Chạy Frontend

#### Option A: Web Frontend (Đơn giản nhất)

1. Tạo file HTML:
```bash
cd frontend/web
python create_web.py
```

2. Mở `frontend/web/index.html` trong browser
   - Hoặc dùng Live Server extension trong VS Code

#### Option B: Desktop Frontend (Flet - Đang phát triển)

```bash
cd frontend/desktop
python desktop_app.py
```

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
    "mode": "ask"
}

Response: {
    "response": "Tôi là Liemdai Copilot...",
    "mode": "ask",
    "has_task_intent": false
}
```

#### 3. Execute Task (Agent Mode)
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

#### 4. Get History
```bash
GET /history
Response: {"history": [...]}
```

#### 5. Reset History
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

### 1. **Web Frontend** (Recommended)
- ✅ Dễ nhất, không cần cài đặt gì thêm
- ✅ Chạy trên bất kỳ browser nào
- ✅ UI giống Microsoft Copilot
- ✅ Responsive design

### 2. **Desktop Frontend (Flet)**
- ✅ Native desktop app
- ✅ Cross-platform (Windows/Mac/Linux)
- ⏳ Đang phát triển

### 3. **Mobile (React Native/Flutter)**
- ⏳ Tương lai

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

### Docker (Tương lai)

```dockerfile
# Dockerfile for backend
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

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
