const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true }
  });

  const DEV  = 'http://localhost:5173';
  const PROD = `file://${path.join(__dirname, 'dist', 'index.html')}`;

  win.loadURL(app.isPackaged ? PROD : DEV);

  if (process.argv.includes('--debug')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.webContents.on('did-fail-load',
    (_e, code, desc, url) => console.error('LOAD-FAIL', code, desc, url)
  );
}

app.whenReady().then(createWindow);