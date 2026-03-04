const { contextBridge, ipcRenderer } = require('electron');

// Expose only the small surface the renderer needs, keeping Node/Electron internals isolated.
contextBridge.exposeInMainWorld('stickyDesk', {
  version: '0.3.0',
  platform: process.platform,
  getIdleSeconds: () => ipcRenderer.invoke('activity:get-idle-seconds'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  setWindowSize: (width, height) =>
    ipcRenderer.invoke('window:set-size', width, height),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
  isCursorInsideWindow: () => ipcRenderer.invoke('window:is-cursor-inside'),
  setAutoFadeWhenInactive: (value) =>
    ipcRenderer.invoke('settings:set-auto-fade-when-inactive', value),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setTheme: (themeId) => ipcRenderer.invoke('settings:set-theme', themeId),
  setUiScale: (value) => ipcRenderer.invoke('settings:set-ui-scale', value),
  setShellOpacity: (value) => ipcRenderer.invoke('settings:set-shell-opacity', value),
  setNoteSort: (field, direction) =>
    ipcRenderer.invoke('settings:set-note-sort', field, direction),
  listNotes: () => ipcRenderer.invoke('notes:list'),
  listFutureTasks: () => ipcRenderer.invoke('future-tasks:list'),
  createFutureTask: (input) => ipcRenderer.invoke('future-tasks:create', input),
  deleteFutureTask: (id) => ipcRenderer.invoke('future-tasks:delete', id),
  createNote: (input) => ipcRenderer.invoke('notes:create', input),
  updateNote: (id, input) => ipcRenderer.invoke('notes:update', id, input),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
});
