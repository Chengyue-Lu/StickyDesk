const { contextBridge, ipcRenderer } = require('electron');

// Expose only the small surface the renderer needs, keeping Node/Electron internals isolated.
contextBridge.exposeInMainWorld('stickyDesk', {
  version: '0.2.0',
  platform: process.platform,
  getIdleSeconds: () => ipcRenderer.invoke('activity:get-idle-seconds'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  setWindowSize: (width, height) =>
    ipcRenderer.invoke('window:set-size', width, height),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setTheme: (themeId) => ipcRenderer.invoke('settings:set-theme', themeId),
  setUiScale: (value) => ipcRenderer.invoke('settings:set-ui-scale', value),
  setNoteSort: (field, direction) =>
    ipcRenderer.invoke('settings:set-note-sort', field, direction),
  listNotes: () => ipcRenderer.invoke('notes:list'),
  createNote: (input) => ipcRenderer.invoke('notes:create', input),
  updateNote: (id, input) => ipcRenderer.invoke('notes:update', id, input),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
});
