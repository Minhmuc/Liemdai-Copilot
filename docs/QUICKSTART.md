# 🚀 Quick Start Guide - Liemdai Copilot

## 📋 Prerequisites

- Python 3.10 or higher
- Gemini API key (free at https://aistudio.google.com/app/apikey)
- Modern web browser (for Web UI)

---

## ⚡ Installation

### 1. Clone & Setup

```bash
git clone https://github.com/username/Liemdai-Copilot.git
cd Liemdai-Copilot

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create `.env` file in project root:

```bash
# LLM Configuration
GEMINI_API_KEY=your_api_key_here
LLM_PROVIDER=gemini

# Agent Settings
SAFE_MODE=true
```

**Get Gemini API Key:** https://aistudio.google.com/app/apikey (FREE tier available)

---

## 🌐 Run Web UI (Recommended)

### Step 1: Start Backend Server

```bash
python backend/api.py
```

You should see:

```
🚀 Liemdai Copilot - Backend API Server
================================================================📡 Swagger Docs: http://localhost:8000/docs
🔌 WebSocket:    ws://localhost:8000/ws/chat
🌐 Frontend:     ../frontend/index.html
================================================================
```

### Step 2: Open Frontend

**Option A: Using Live Server (VS Code)**
1. Install "Live Server" extension
2. Right-click `frontend/index.html`
3. Select "Open with Live Server"

**Option B: Direct Browser**
1. Open `frontend/index.html` in browser
2. Make sure backend is running on port 8000

### Step 3: Test

1. In Web UI, type: **"Xin chào, bạn là ai?"**
2. Switch to Agent Mode: Click 🤖 button
3. Try: **"Create a text file with Hello World"**

---

## 💻 Run CLI Mode

For terminal-only usage:

```bash
python cli.py
```

**Commands:**
- Type messages to chat (Ask mode)
- `/agent` - Switch to Agent mode
- `/ask` - Switch to Ask mode
- `/help` - Show help
- `/exit` - Quit

---

## 🔧 Development Mode

### Run Backend with Auto-reload

```bash
cd backend
uvicorn api:app --reload --log-level debug
```

### Test API Directly

**Using curl:**

```bash
# Chat endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "mode": "ask"}'

# Execute task
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"task": "Create a Word document"}'
```

**Using Python:**

```python
import requests

response = requests.post("http://localhost:8000/chat", json={
    "message": "Xin chào",
    "mode": "ask"
})

print(response.json())
```

**Interactive API Docs:** http://localhost:8000/docs

---

## 📊 Project Structure

```
Desktop-Copilot/
├── backend/
│   └── api.py              # FastAPI server ⭐
│
├── core/                   # Shared business logic
│   ├── llm.py              # LLM provider wrapper
│   ├── ask_mode.py         # Chatbot engine│   ├── agent_mode.py        # Agent engine
│   └── executor.py         # Code executor
│
├── frontend/
│   └── index.html          # Web UI ⭐
│
├── docs/│   ├── ARCHITECTURE.md     # Design docs
│   └── QUICKSTART.md       # This file
│
├── cli.py                  # CLI entry point ⭐
├── requirements.txt        # Python dependencies
├── .env                    # Config (create this)
└── README.md
```

---

## 🎯 Usage Examples

### Example 1: Simple Chat (Ask Mode)

```
User: "What is AI?"
Copilot: "AI (Artificial Intelligence) is..."
```

### Example 2: Automation Task (Agent Mode)

```
User: "Create Excel file with 10 random users"

Copilot:
📝 Generated Code:
```python
import pandas as pd
from faker import Faker

fake = Faker()
data = {
    'Name': [fake.name() for _ in range(10)],
    'Email': [fake.email() for _ in range(10)],
    'Phone': [fake.phone_number() for _ in range(10)]
}

df = pd.DataFrame(data)
df.to_excel('users.xlsx', index=False)
print("✅ Created users.xlsx")
```

⚠️ Execute this code? (y/n): y

✅ Output:
Created users.xlsx
```

### Example 3: Multi-step Task

```
User: "Open Chrome, search for Python tutorials, and save the titles"

Copilot will:
1. Generate code to control Chrome (selenium)
2. Ask for confirmation
3. Execute and save results
4. Report completion
```

---

## ⚠️ Troubleshooting

### Backend won't start

```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or use different port
uvicorn backend.api:app --port 8001
```

### Frontend can't connect

1. ✅ Verify backend is running: http://localhost:8000/
2. ✅ Check browser console for CORS errors
3. ✅ Ensure API_URL in `frontend/index.html` is correct

### Gemini API errors

```bash
# Test API key
curl https://generativelanguage.googleapis.com/v1beta/models \
  -H "x-goog-api-key: YOUR_API_KEY"

# Common issues:
# - Invalid API key
# - Quota exceeded (429 error)
# - VPN/Firewall blocking requests
```

### Import errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version
python --version  # Should be 3.10+
```

---

## 🚀 Next Steps

1. **Try Examples:** Test with sample tasks in README
2. **Read Architecture:** Understand how it works ([docs/ARCHITECTURE.md](ARCHITECTURE.md))
3. **Customize:** Modify system prompts in `core/ask_mode.py` and `core/agent_mode.py`
4. **Deploy:** Consider Docker or cloud deployment

---

## 📚 Additional Resources

- **API Documentation:** http://localhost:8000/docs (when backend is running)
- **Architecture Guide:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Main README:** [../README.md](../README.md)

---

**Need help?** Open an issue or contact Liemdai Team
