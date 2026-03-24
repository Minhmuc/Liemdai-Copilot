# 🖥️ Liemdai Copilot Desktop App (Electron)

## 📦 Setup

### 1. Install Node.js dependencies

```bash
cd desktop
npm install
```

This will install Electron (~150MB).

---

## 🚀 Run Desktop App

### Development Mode (with DevTools)

```bash
cd desktop
npm run dev
```

### Production Mode

```bash
cd desktop
npm start
```

---

## 🏗️ How it works

```
Electron App (main.js)
    ↓
1. Starts Python backend (backend/api.py)
2. Opens window with frontend/index.html immediately
3. Frontend performs backend readiness checks (retry)
4. Initializes sessions when backend is ready
```

---

## 🔧 Troubleshooting

### Backend won't start

Check if Python virtual environment is activated:

```bash
.venv\Scripts\python.exe --version
```

### Port already in use

Kill process on port 8000:

```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Window opens but shows error

1. Check DevTools (Ctrl+Shift+I)
2. Verify backend is running
3. Wait for retry flow to complete (no manual Ctrl+R needed)
4. Check API connection at http://localhost:8000/

---

## 📦 Build Executable (Optional)

Install electron-builder:

```bash
npm install --save-dev electron-builder
```

Add to `package.json`:

```json
"scripts": {
  "build": "electron-builder --win"
},
"build": {
  "appId": "com.liemdai.copilot",
  "productName": "Liemdai Copilot",
  "directories": {
    "output": "dist"
  },
  "files": [
    "main.js",
    "../frontend/**/*",
    "../backend/**/*",
    "../core/**/*",
    "../.venv/**/*"
  ],
  "win": {
    "target": "nsis",
    "icon": "../frontend/icon.ico"
  }
}
```

Build:

```bash
npm run build
```

Executable will be in `desktop/dist/`.

---

## ✨ Features

- ✅ Native desktop app (not browser)
- ✅ Auto-starts Python backend
- ✅ Frontend auto-retries while backend is warming up
- ✅ Application menu (File/Edit/View/Help)
- ✅ DevTools for debugging
- ✅ Graceful shutdown (kills backend)
- ✅ Modern UI (same as web version)

---

## 🎯 Next Steps

1. **Add app icon:** Create `frontend/icon.png` (256x256)
2. **Build installer:** Use electron-builder
3. **Auto-update:** Add electron-updater
4. **Tray icon:** Add system tray support

---

**Built with ❤️ by Liemdai Team**
