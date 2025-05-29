import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import { checkDiskSpace } from './utils';
import { setupFfmpeg, exportWithFfmpeg } from './ffmpeg';

let mainWindow: BrowserWindow | null = null;
let isOnline = true;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// Check online status
const checkOnlineStatus = () => {
  const newIsOnline = navigator.onLine;
  if (newIsOnline !== isOnline) {
    isOnline = newIsOnline;
    mainWindow?.webContents.send('online-status-changed', isOnline);
  }
};

app.whenReady().then(() => {
  createWindow();
  setupFfmpeg();
  
  // Set up online/offline detection
  window.addEventListener('online', checkOnlineStatus);
  window.addEventListener('offline', checkOnlineStatus);
  checkOnlineStatus();
  
  if (process.env.NODE_ENV === 'production') {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file save dialog
ipcMain.handle('show-save-dialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Save Audio File',
    defaultPath: options.defaultPath,
    filters: [
      { name: 'WAV Audio', extensions: ['wav'] },
      { name: 'MP4 Video', extensions: ['mp4'] }
    ]
  });
  return result.filePath;
});

// Handle disk space check
ipcMain.handle('check-disk-space', async (_, filePath) => {
  return await checkDiskSpace(filePath);
});

// Handle FFmpeg export
ipcMain.handle('start-ffmpeg-export', async (_, options) => {
  const { chunks, outputPath, format, background } = options;
  
  try {
    await exportWithFfmpeg(
      chunks,
      outputPath,
      format,
      background,
      (progress) => {
        mainWindow?.webContents.send('export-progress', progress);
      }
    );
    return { success: true };
  } catch (error) {
    console.error('FFmpeg export error:', error);
    throw error;
  }
});

// Handle online status check
ipcMain.handle('get-online-status', () => {
  return isOnline;
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});