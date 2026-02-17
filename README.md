# Liemdai Copilot - AI Desktop Automation Agent

**🇻🇳 Tiếng Việt** | [🇬🇧 English](#english-version)

---

## 🇻🇳 Phiên bản Tiếng Việt

**AI Agent tự động điều khiển máy tính bằng cách sinh Python code. Thực hiện mọi task từ đơn giản đến phức tạp: tự động hóa văn phòng, mạng xã hội, email, nghiên cứu web...**

### 🎯 Kiến trúc

```
Liemdai-Copilot/
├── core/
│   ├── llm.py          # LLM provider (Gemini/Local)
│   ├── ask_mode.py     # Chatbot + phát hiện task
│   ├── agent_mode.py   # Code Interpreter Agent
│   └── executor.py     # Thực thi code an toàn
├── main.py             # Entry point
├── requirements.txt    # Dependencies
└── .env               # Configuration
```

### ✨ Tính năng chính

#### 🤖 Tự động hóa AI
- **Code Interpreter**: LLM sinh Python code → Execute → Verify
- **Autonomous Loop**: Tự động retry khi gặp lỗi
- **Safe Execution**: Hỏi user confirmation trước khi execute

#### 📱 Tích hợp mạng xã hội
- **Facebook**: Nhắn tin, post status (dùng session đã login)
- **Instagram**: Gửi DM, đăng ảnh
- **Email**: Tự động hóa Gmail qua trình duyệt

#### 📝 Tự động hóa văn phòng
- **Word**: Tạo documents với format phức tạp
- **Excel**: Tạo báo cáo, biểu đồ, phân tích dữ liệu
- **PowerPoint**: Tạo bài thuyết trình

#### 🌐 Tự động hóa web
- **Research**: Tìm kiếm Google → tóm tắt → lưu Word
- **Scraping**: Trích xuất dữ liệu → báo cáo Excel
- **Browser Control**: Điều khiển trình duyệt tự động

#### 💻 Công việc lập trình
- **VSCode Projects**: Tự động tạo dự án Python/Node.js
- **Virtual Environments**: Tạo venv, cài packages
- **Git**: Clone repos, commit, push

---

### 🚀 Bắt đầu nhanh

#### 1. Cài đặt
```bash
pip install -r requirements.txt
```

#### 2. Cấu hình
```bash
# Copy .env.example sang .env
cp .env.example .env

# Chỉnh sửa .env và thêm GEMINI_API_KEY
# Lấy free API key tại: https://makersuite.google.com/app/apikey
```

#### 3. Chạy
```bash
python main.py
```

---

### 💬 2 Chế độ

#### 💬 Ask Mode (Chatbot)
Trò chuyện như ChatGPT/Gemini, tự động phát hiện task intent, gợi ý switch sang Agent mode khi cần

#### 🤖 Agent Mode (Code Interpreter)
LLM sinh Python code để thực hiện task, user xác nhận trước khi execute, autonomous loop cho đến khi hoàn thành

---

### 📝 Ví dụ

#### 📄 Tự động hóa văn phòng
```
You: "Tạo Word document 2 trang về AI agents và lưu vào Desktop"
AI: [Generates python-docx code] → ✅ Desktop/ai_agents.docx

You: "Tạo Excel với 100 rows random data về sales"
AI: [Generates openpyxl code] → ✅ Desktop/sales_data.xlsx
```

#### 📱 Mạng xã hội (Facebook/Instagram)
```
You: "Nhắn tin Facebook cho Minh: 'Hẹn gặp 3pm'"
AI: [Playwright code sử dụng Chrome session đã login]
    → Mở Facebook Messenger
    → Tìm "Minh"
    → Gửi tin nhắn
    → ✅ Hoàn thành trong 3-5s

You: "Post lên Facebook: 'Hôm nay học về AI agents!'"
AI: [Browser automation] → ✅ Đã đăng
```

#### 📧 Tự động hóa email
```
You: "Gửi email Gmail cho john@example.com: 'Nhắc họp lúc 3pm'"
AI: [Mở Gmail trong Chrome với session đã login]
    → Click Compose
    → Điền người nhận, tiêu đề, nội dung
    → Gửi email
    → ✅ Hoàn thành
```

#### 🌐 Nghiên cứu web
```
You: "Search Google về 'Python AI trends 2026' và tạo Word summary"
AI: [requests + BeautifulSoup + python-docx]
    → Tìm kiếm Google
    → Trích xuất top 10 kết quả
    → Tóm tắt với LLM
    → Lưu vào Desktop/research.docx
    → ✅ Hoàn thành
```

#### 💻 Công việc lập trình
```
You: "Tạo Python Flask project tên 'MyAPI' với venv"
AI: [os.makedirs + subprocess]
    → Tạo cấu trúc project
    → Khởi tạo venv
    → Cài Flask, requests
    → Tạo main.py template
    → Mở VSCode
    → ✅ Sẵn sàng code!
```

#### ⚙️ Tác vụ hệ thống
```
You: "Tắt WiFi"
AI: [os.system] → ✅ Đã tắt WiFi

You: "Mở Notepad và gõ 'Hello World'"
AI: [subprocess + pyautogui] → ✅ Hoàn thành

You: "Xóa System32"
AI: [Code: Remove-Item -Recurse C:\Windows\System32]
    ⚠️ Xác nhận thực thi? (y/n):

You: "Format ổ C:\"
AI: [Code: format C: /q]
    ⚠️ Xác nhận thực thi? (y/n):

You: "Shutdown máy trong 5 giây"
AI: [Code: shutdown /s /t 5] → ✅ Đã thực thi
```

---

### 🎮 Lệnh

- `/mode` - Chuyển giữa Ask ↔️ Agent
- `/help` - Hiển thị trợ giúp
- `/clear` - Xóa màn hình
- `/exit` - Thoát chương trình

---

### ⚙️ Cấu hình (.env)

```bash
# LLM Provider
LLM_PROVIDER=gemini  # hoặc 'local' cho Qwen

# Gemini API (nếu dùng Gemini)
GEMINI_API_KEY=your_api_key_here
MODEL_NAME=gemini-flash-latest

# Local Model (nếu dùng Local)
# LLM_PROVIDER=local
# MODEL_PATH=Qwen/Qwen2.5-7B-Instruct
# LOAD_IN_4BIT=true

# Agent Settings
MAX_ITERATIONS=10
SAFE_MODE=true  # Luôn bật!
```

---

### 📦 Thư viện

**Core:**
- `google-genai` - Gemini API (khuyên dùng)
- `python-dotenv` - Environment config
- `python-docx` - Tự động hóa Word
- `openpyxl` - Tự động hóa Excel

**Browser Automation:**
- `playwright` - Web automation hiện đại (Facebook, Instagram, Gmail)
- `selenium` - Hỗ trợ browser cũ
- `beautifulsoup4` - Web scraping

**Local LLM (Tùy chọn):**
- `transformers` - Hugging Face models
- `torch` - PyTorch backend
- `bitsandbytes` - 4-bit quantization
- `accelerate` - GPU acceleration

**GUI Automation (Tùy chọn):**
- `pyautogui` - Điều khiển bàn phím/chuột
- `pywinauto` - Windows UI automation

---

### 🎓 Trường hợp sử dụng

**Học sinh/Sinh viên:**
- ✅ Tự động nghiên cứu & tạo báo cáo
- ✅ Tạo tài liệu nhanh (bài luận, bài tập)
- ✅ Quản lý mạng xã hội

**Lập trình viên:**
- ✅ Tự động tạo dự án
- ✅ Tự động hóa testing
- ✅ Sinh code & thực thi

**Chuyên gia:**
- ✅ Tự động hóa email
- ✅ Nhập liệu & báo cáo Excel
- ✅ Thu thập & phân tích dữ liệu web

---

### ⚠️ An toàn & Đạo đức

**Safe Mode mặc định BẬT:**
- ⚠️ Hỏi xác nhận trước khi thực thi bất kỳ code nào
- 🔒 Không tự động xử lý mật khẩu/credentials
- ✅ Code sinh ra hoàn toàn minh bạch (user xem trước khi chạy)
- 📝 Tất cả hành động được ghi log để kiểm tra

---

**Project:** Liemdai Copilot  
**License:** MIT  
**Author:** Liemdai Team

---
---

## 🇬🇧 English Version

**AI Agent that automatically controls your computer by generating Python code. Execute any task from simple to complex: office automation, social media, email, web research...**

### 🎯 Architecture

```
Liemdai-Copilot/
├── core/
│   ├── llm.py          # LLM provider (Gemini/Local)
│   ├── ask_mode.py     # Chatbot + task detection
│   ├── agent_mode.py   # Code Interpreter Agent
│   └── executor.py     # Safe code execution
├── main.py             # Entry point
├── requirements.txt    # Dependencies
└── .env               # Configuration
```

### ✨ Key Features

#### 🤖 AI-Powered Automation
- **Code Interpreter**: LLM generates Python code → Execute → Verify
- **Autonomous Loop**: Auto-retry on errors
- **Safe Execution**: Asks user confirmation before execution

#### 📱 Social Media Integration
- **Facebook**: Messaging, posting (uses existing login session)
- **Instagram**: Send DM, post photos
- **Email**: Gmail automation via browser

#### 📝 Office Automation
- **Word**: Create formatted documents
- **Excel**: Generate reports, charts, data analysis
- **PowerPoint**: Create presentations

#### 🌐 Web Automation
- **Research**: Search Google → summarize → save to Word
- **Scraping**: Extract data → Excel report
- **Browser Control**: Automated browser navigation

#### 💻 Development Tasks
- **VSCode Projects**: Auto setup Python/Node.js projects
- **Virtual Environments**: Create venv, install packages
- **Git**: Clone repos, commit, push

---

### 🚀 Quick Start

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2. Configure
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add GEMINI_API_KEY
# Get free API key: https://makersuite.google.com/app/apikey
```

#### 3. Run
```bash
python main.py
```

---

### 💬 2 Modes

#### 💬 Ask Mode (Chatbot)
Chat like ChatGPT/Gemini, auto-detect task intent, suggest switching to Agent mode when needed

#### 🤖 Agent Mode (Code Interpreter)
LLM generates Python code to execute tasks, user confirms before execution, autonomous loop until completion

---

### 📝 Examples

#### 📄 Office Automation
```
You: "Create 2-page Word document about AI agents and save to Desktop"
AI: [Generates python-docx code] → ✅ Desktop/ai_agents.docx

You: "Create Excel with 100 rows of random sales data"
AI: [Generates openpyxl code] → ✅ Desktop/sales_data.xlsx
```

#### 📱 Social Media (Facebook/Instagram)
```
You: "Send Facebook message to John: 'Meeting at 3pm'"
AI: [Playwright code using existing Chrome session]
    → Opens Facebook Messenger
    → Searches "John"
    → Sends message
    → ✅ Done in 3-5s

You: "Post to Facebook: 'Today I learned about AI agents!'"
AI: [Browser automation] → ✅ Posted
```

#### 📧 Email Automation
```
You: "Send Gmail to john@example.com: 'Meeting reminder at 3pm'"
AI: [Opens Gmail in Chrome with existing session]
    → Clicks Compose
    → Fills recipient, subject, body
    → Sends email
    → ✅ Done
```

#### 🌐 Web Research
```
You: "Search Google for 'Python AI trends 2026' and create Word summary"
AI: [requests + BeautifulSoup + python-docx]
    → Searches Google
    → Extracts top 10 results
    → Summarizes with LLM
    → Saves to Desktop/research.docx
    → ✅ Done
```

#### 💻 Development Tasks
```
You: "Create Python Flask project named 'MyAPI' with venv"
AI: [os.makedirs + subprocess]
    → Creates project structure
    → Initializes venv
    → Installs Flask, requests
    → Creates main.py template
    → Opens VSCode
    → ✅ Ready to code!
```

#### ⚙️ System Tasks
```
You: "Disable WiFi"
AI: [os.system] → ✅ WiFi disabled

You: "Open Notepad and type 'Hello World'"
AI: [subprocess + pyautogui] → ✅ Done

You: "Delete System32"
AI: [Code: Remove-Item -Recurse C:\Windows\System32]
    ⚠️ Confirm execution? (y/n):

You: "Format C:\ drive"
AI: [Code: format C: /q]
    ⚠️ Confirm execution? (y/n):

You: "Shutdown computer in 5 seconds"
AI: [Code: shutdown /s /t 5] → ✅ Executed
```

---

### 🎮 Commands

- `/mode` - Switch between Ask ↔️ Agent
- `/help` - Show help
- `/clear` - Clear screen
- `/exit` - Exit program

---

### ⚙️ Configuration (.env)

```bash
# LLM Provider
LLM_PROVIDER=gemini  # or 'local' for Qwen

# Gemini API (if using Gemini)
GEMINI_API_KEY=your_api_key_here
MODEL_NAME=gemini-flash-latest

# Local Model (if using Local)
# LLM_PROVIDER=local
# MODEL_PATH=Qwen/Qwen2.5-7B-Instruct
# LOAD_IN_4BIT=true

# Agent Settings
MAX_ITERATIONS=10
SAFE_MODE=true  # Always keep this enabled!
```

---

### 📦 Dependencies

**Core:**
- `google-genai` - Gemini API (recommended)
- `python-dotenv` - Environment config
- `python-docx` - Word automation
- `openpyxl` - Excel automation

**Browser Automation:**
- `playwright` - Modern web automation (Facebook, Instagram, Gmail)
- `selenium` - Legacy browser support
- `beautifulsoup4` - Web scraping

**Local LLM (Optional):**
- `transformers` - Hugging Face models
- `torch` - PyTorch backend
- `bitsandbytes` - 4-bit quantization
- `accelerate` - GPU acceleration

**GUI Automation (Optional):**
- `pyautogui` - Keyboard/mouse control
- `pywinauto` - Windows UI automation

---

### 🎓 Use Cases

**For Students:**
- ✅ Automated research & report generation
- ✅ Quick document creation (essays, assignments)
- ✅ Social media management

**For Developers:**
- ✅ Project scaffolding automation
- ✅ Automated testing tasks
- ✅ Code generation & execution

**For Professionals:**
- ✅ Email automation
- ✅ Data entry & Excel reports
- ✅ Web scraping & analysis

---

### ⚠️ Safety & Ethics

**Safe Mode enabled by default:**
- ⚠️ Asks confirmation before executing any code
- 🔒 No automatic password/credentials handling
- ✅ Transparent code generation (user can review before execution)
- 📝 All actions are logged for audit

---

**Project:** Liemdai Copilot  
**License:** MIT  
**Author:** Liemdai Team
