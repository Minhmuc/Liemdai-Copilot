const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let backendProcess;

// Function to start Python backend
function startBackend() {
  const pythonPath = path.join(__dirname, '../.venv/Scripts/python.exe');
  const apiPath = path.join(__dirname, '../backend/api.py');
  
  console.log('Starting backend:', pythonPath, apiPath);
  
  backendProcess = spawn(pythonPath, [apiPath], {
    cwd: path.join(__dirname, '..')
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString()}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString()}`);
  });
  
  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

// Function to create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,      // Cho phép resize
    maximizable: true,    // Cho phép maximize
    minimizable: true,    // Cho phép minimize
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Ẩn thanh tiêu đề mặc định nhưng giữ nút Min/Max/Close
    titleBarStyle: 'hidden',
    
    // Giữ lại 3 nút native với nền trong suốt
    titleBarOverlay: {
      color: '#00000000', // Nền trong suốt
      symbolColor: '#ffffff', // Màu icon trắng
      height: 40 // Chiều cao khu vực nút
    },
    
    // Không dùng transparent: true vì conflict với titleBarOverlay trên Windows
    // Thay vào đó dùng backgroundColor với alpha để có hiệu ứng tương tự
    backgroundColor: '#f0f0f0', // Nền sáng cho app
    backgroundMaterial: 'acrylic', // Windows 11 acrylic glass effect
    show: false, // Don't show until ready
    icon: path.join(__dirname, '../frontend/assets/icon.png')
  });

  // Load frontend HTML
  const frontendPath = path.join(__dirname, '../frontend/index.html');
  mainWindow.loadFile(frontendPath);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Liemdai Copilot',
              message: 'Liemdai Copilot v1.0.0',
              detail: 'AI Desktop Automation Agent\n\nBuilt with ❤️ by Liemdai Team'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// App lifecycle
app.whenReady().then(() => {
  console.log('🚀 Liemdai Copilot Desktop App Starting...');
  
  // Start backend first
  startBackend();
  
  // Wait 3 seconds for backend to initialize, then create window
  setTimeout(() => {
    createWindow();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    console.log('Killing backend process...');
    backendProcess.kill();
  }
  
  // Quit app
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
