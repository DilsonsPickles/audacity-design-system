// Preload runs in the renderer process before page scripts, in a sandboxed
// context that can still use electron's contextBridge + ipcRenderer. We
// expose a tiny `window.electronMenu.onCommand(cb)` so the renderer can
// subscribe to native-menu clicks (File > Save, etc.) without granting it
// any other privileges.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronMenu', {
  onCommand: (cb) => {
    const listener = (_event, command) => cb(command);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
});

// Window-level commands the renderer can ask the main process to perform.
// Kept narrow on purpose — only what the UI explicitly needs.
contextBridge.exposeInMainWorld('electronShell', {
  openNewWindow: () => ipcRenderer.send('window:open-new'),
});
