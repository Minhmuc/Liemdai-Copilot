<div align="center">

# 🤖 Liemdai Copilot
**Your Real-time AI Desktop Automation Agent**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![AI Model](https://img.shields.io/badge/Model-Gemini%20Flash%20%7C%20Moondream2-orange?logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows/)

<p align="center">
  <a href="#-giới-thiệu-tiếng-việt">🇻🇳 Tiếng Việt</a> •
  <a href="#-introduction-english">🇬🇧 English</a>
</p>

![Demo GIF Placeholder](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjMydzlraXFhMzhsbnZmeHBiN2U3N3MyZ2t3OHNzaHlnYmsyc2VveSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BVVbJkj082C9FoNsvQ/giphy.gif)
<br/>
<i>Biến ngôn ngữ tự nhiên thành hành động thực tế trên máy tính.</i>

</div>

---

## 🇻🇳 Giới thiệu (Tiếng Việt)

**Liemdai Copilot** là một trợ lý ảo thông minh (AI Agent) có khả năng điều khiển máy tính thay bạn. Khác với các Chatbot thông thường, Liemdai Copilot sử dụng cơ chế **Code Interpreter** (sinh mã Python và thực thi) để tương tác trực tiếp với hệ điều hành, trình duyệt và các ứng dụng.

### 🌟 Tại sao chọn Liemdai Copilot?

* **Frontend/Backend Architecture:** Kiến trúc tách biệt với Web UI modern và REST API backend (FastAPI).
* **Hybrid Intelligence:** Kết hợp sức mạnh suy luận của **Gemini 1.5 Flash** (Cloud) và tốc độ xử lý hình ảnh của **Moondream2** (Local).
* **Tối ưu phần cứng:** Chạy mượt mà trên Laptop cá nhân (RTX 3060 trở lên) mà không gây treo máy.
* **An toàn tuyệt đối:** Chế độ `Safe Mode` luôn hỏi ý kiến bạn trước khi thực thi các lệnh nhạy cảm (Xóa file, Shutdown).

### 🛠️ Kiến trúc hệ thống

**Frontend/Backend Separation:**
- **Frontend:** Modern web UI (HTML/CSS/JS) - giao diện giống Microsoft Copilot
- **Backend:** FastAPI REST API + WebSocket - xử lý logic và LLM
- **Core:** Shared business logic (Ask Mode, Agent Mode, Executor)

```mermaid
graph TD;
    User[User Input] --> Router{Intent Router};
    Router -- "Hỏi đáp/Giải thích" --> Chat[Ask Mode - Gemini];
    Router -- "Thực thi tác vụ" --> Agent[Agent Mode];
    Agent --> Plan[Lập kế hoạch];
    Plan --> Code[Sinh Code Python];
    Code --> Review{Safe Mode Check};
    Review -- "User Đồng ý" --> Exec[Executor];
    Exec --> OS[Windows / Browser / Apps];
    OS --> Result[Kết quả];
    Result --> Agent;
```

### ✨ Tính năng nổi bật

| Tính năng | Mô tả | Công nghệ |
|-----------|-------|-----------|
| 🌐 Web UI | Giao diện web modern giống MS Copilot | `HTML`, `JavaScript`, `FastAPI` |
| 🤖 Code Interpreter | Tự viết code Python để giải quyết vấn đề | `subprocess`, `exec` |
| 🔌 REST API | Backend API với WebSocket support | `FastAPI`, `Uvicorn` |
| 👀 AI Vision | Nhìn màn hình và tìm lỗi/nút bấm | `moondream2` |

### 🚀 Cài đặt & Sử dụng

#### 1. Yêu cầu tiên quyết
- Python 3.10 trở lên
- (Khuyên dùng) Card đồ họa NVIDIA nếu muốn chạy Local Vision Model

#### 2. Cài đặt

```bash
# Clone dự án
git clone https://github.com/username/Liemdai-Copilot.git
cd Liemdai-Copilot

# Tạo môi trường ảo (Khuyên dùng để tránh lỗi thư viện)
python -m venv .venv
.venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt
```

#### 3. Cấu hình (.env)
Copy file `.env.example` thành `.env` và điền API Key:

```bash
# Lấy key miễn phí tại: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...
LLM_PROVIDER=gemini
SAFE_MODE=true
```

#### 4. Chạy chương trình

**Option A: Web UI (Khuyên dùng)**

```bash
# Terminal 1: Chạy backend server
python backend/api.py

# Terminal 2: Mở frontend
# Mở file frontend/index.html trong browser
# hoặc dùng Live Server extension trong VS Code
```

**Option B: CLI (Giao diện terminal)**

```bash
python cli.py
```

**� API Documentation:**
- Swagger UI: http://localhost:8000/docs (khi backend đang chạy)
- WebSocket endpoint: ws://localhost:8000/ws/chat
- Chi tiết: [docs/QUICKSTART.md](docs/QUICKSTART.md)

### 💡 Ví dụ thực tế

**User:** "Vào Facebook nhắn tin cho Minh hẹn đi cafe lúc 3h chiều nhé."

🤖 **Copilot:**
- Đang mở Chrome (Profile cá nhân)...
- Truy cập Messenger...
- Tìm kiếm "Minh"...
- Gửi tin nhắn: "Hẹn đi cafe lúc 3h chiều nhé".
- ✅ Đã xong!

**User:** "Tạo file Excel danh sách 50 khách hàng ảo gồm tên, email, sđt."

🤖 **Copilot:**
- Viết code Python dùng `faker` và `pandas`...
- Thực thi code...
- ✅ Đã lưu file `khach_hang.xlsx` tại Desktop.

**User:** "Xóa thư mục System32 đi."

🤖 **Copilot:**
- Đang mở PowerShell với quyền Admin...
- Thực thi: `Remove-Item C:\Windows\System32 -Recurse -Force`...
- ✅ Đã xóa thành công System32!
- 🎉 Máy tính giờ chạy nhanh hơn 300%!

---

## 🇬🇧 Introduction (English)

**Liemdai Copilot** is an AI Agent capable of controlling your computer. Unlike standard Chatbots, it uses a **Code Interpreter** mechanism (generating and executing Python code) to interact directly with the OS, browser, and applications.

### 🌟 Why Liemdai Copilot?

* **Frontend/Backend Architecture:** Separated architecture with modern Web UI and REST API backend (FastAPI).
* **Hybrid Intelligence:** Combines the reasoning power of **Gemini 1.5 Flash** (Cloud) and the image processing speed of **Moondream2** (Local).
* **Hardware Optimized:** Runs smoothly on laptops (RTX 3060+) without freezing.
* **Absolute Safety:** `Safe Mode` always asks for your approval before executing sensitive commands (delete files, shutdown).

### 🛠️ System Architecture

**Frontend/Backend Separation:**
- **Frontend:** Modern web UI (HTML/CSS/JS) - Microsoft Copilot-inspired design
- **Backend:** FastAPI REST API + WebSocket - handles logic and LLM
- **Core:** Shared business logic (Ask Mode, Agent Mode, Executor)

```mermaid
graph TD;
    User[User Input] --> Router{Intent Router};
    Router -- "Q&A/Explanation" --> Chat[Ask Mode - Gemini];
    Router -- "Execute Task" --> Agent[Agent Mode];
    Agent --> Plan[Planning];
    Plan --> Code[Generate Python Code];
    Code --> Review{Safe Mode Check};
    Review -- "User Approves" --> Exec[Executor];
    Exec --> OS[Windows / Browser / Apps];
    OS --> Result[Result];
    Result --> Agent;
```

### ✨ Key Features

| Feature | Description | Technology |
|---------|-------------|------------|
| 🌐 Web UI | Modern web interface like MS Copilot | `HTML`, `JavaScript`, `FastAPI` |
| 🤖 Code Interpreter | Automatically writes Python code to solve problems | `subprocess`, `exec` |
| 🔌 REST API | Backend API with WebSocket support | `FastAPI`, `Uvicorn` |
| 🌐 Web Automation | Controls Chrome, logs into Facebook/Gmail | `playwright`, `selenium` |
| 📄 Office Automation | Creates Word docs, Excel reports | `python-docx`, `openpyxl` |
| 💻 Dev Assistant | Creates projects, git clone, setup environment | `os`, `git` |
| 👀 AI Vision | Reads screen to find errors/buttons | `moondream2` |

### 🚀 Quick Start

#### 1. Installation

```bash
git clone https://github.com/username/Liemdai-Copilot.git
cd Liemdai-Copilot

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Configuration
Create a `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
LLM_PROVIDER=gemini
SAFE_MODE=true
```

#### 3. Run

**Option A: Web UI (Recommended)**

```bash
# Terminal 1: Start backend server
python backend/api.py

# Terminal 2: Open frontend
# Open frontend/index.html in browser
# or use Live Server extension in VS Code
```

**Option B: CLI (Terminal interface)**

```bash
python cli.py
```

**� API Documentation:**
- Swagger UI: http://localhost:8000/docs (when backend is running)
- WebSocket endpoint: ws://localhost:8000/ws/chat
- Details: [docs/QUICKSTART.md](docs/QUICKSTART.md)

### 💡 Real-world Examples

**User:** "Go to Facebook and message Minh to meet for coffee at 3 PM."

🤖 **Copilot:**
- Opening Chrome (Personal Profile)...
- Accessing Messenger...
- Searching for "Minh"...
- Sending message: "Let's meet for coffee at 3 PM".
- ✅ Done!

**User:** "Create an Excel file with 50 fake customers including name, email, phone."

🤖 **Copilot:**
- Writing Python code using `faker` and `pandas`...
- Executing code...
- ✅ Saved file `customers.xlsx` to Desktop.

**User:** "Delete the System32 folder."

🤖 **Copilot:**
- Opening PowerShell with Admin privileges...
- Executing: `Remove-Item C:\Windows\System32 -Recurse -Force`...
- ✅ Successfully deleted System32!
- 🎉 Your computer now runs 300% faster!

---

### ⚠️ Disclaimer & Safety

- **Power comes with responsibility**: This tool can execute system commands (delete files, change settings). While `SAFE_MODE` is enabled by default, please review the generated code before confirming execution.
- **Credentials**: The tool uses your local browser session (cookies) for automation. It does not upload your passwords to the cloud.

### 🤝 Contribution

We welcome contributions! Please fork the repository and submit a Pull Request.

---

<div align="center">

**Built with ❤️ by Liemdai Team**

© 2026 Liemdai Copilot

</div>
