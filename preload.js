/**
 * © 2026 Exotic. All Rights Reserved.
 * Engineered and Maintained by Exotic.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('exo', {
  // Config & Version
  fetchConfig: () => ipcRenderer.invoke('fetch-config'),
  getLocalVersion: () => ipcRenderer.invoke('get-local-version'),
  saveVersion: (data) => ipcRenderer.invoke('save-version', data),

  // File Operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  downloadFile: (opts) => ipcRenderer.invoke('download-file', opts),
  extractFile: (opts) => ipcRenderer.invoke('extract-file', opts),
  launchGame: (exePath) => ipcRenderer.invoke('launch-game', exePath),
  findExecutable: (opts) => ipcRenderer.invoke('find-executable', opts),
  createShortcut: (opts) => ipcRenderer.invoke('create-shortcut', opts),

  // Progress Listeners
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_, data) => cb(data)),
  onExtractProgress: (cb) => ipcRenderer.on('extract-progress', (_, data) => cb(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
});
