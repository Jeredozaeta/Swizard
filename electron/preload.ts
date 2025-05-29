import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  startFfmpegExport: (options: {
    chunks: ArrayBuffer[];
    outputPath: string;
    format: 'wav' | 'mp4';
    background?: {
      type: 'image' | 'video';
      path: string;
    };
  }) => ipcRenderer.invoke('start-ffmpeg-export', options),
  
  showSaveDialog: (options: {
    defaultPath: string;
  }) => ipcRenderer.invoke('show-save-dialog', options),
  
  checkDiskSpace: (filePath: string) => 
    ipcRenderer.invoke('check-disk-space', filePath),
  
  onExportProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('export-progress', (_, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('export-progress');
  },
  
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', () => callback());
    return () => ipcRenderer.removeAllListeners('update-available');
  },
  
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', () => callback());
    return () => ipcRenderer.removeAllListeners('update-downloaded');
  },

  getOnlineStatus: () => ipcRenderer.invoke('get-online-status'),
  
  onOnlineStatusChanged: (callback: (isOnline: boolean) => void) => {
    ipcRenderer.on('online-status-changed', (_, isOnline) => callback(isOnline));
    return () => ipcRenderer.removeAllListeners('online-status-changed');
  }
});