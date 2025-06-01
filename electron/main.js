const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Determine the correct path to load
  const isDev = !app.isPackaged;
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  if (isDev) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(prodPath);
  }

  // Log any load failures
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('Load failed:', { code, desc, url });
    
    // Retry loading in production if initial load fails
    if (!isDev && code !== -3) {
      console.log('Retrying with file:', prodPath);
      win.loadFile(prodPath).catch(err => {
        console.error('Retry failed:', err);
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});