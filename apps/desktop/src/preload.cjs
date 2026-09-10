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

// Browser-first sign-in (RFC 8252 loopback). The renderer opens muse-id's
// /authorize in the SYSTEM browser; the redirect back lands on this app's
// loopback server, which relays `{ code, state, error }` here over IPC so
// the renderer — which holds the PKCE verifier — can finish the exchange.
contextBridge.exposeInMainWorld('electronOAuth', {
  // `http://127.0.0.1:<port>` of whichever local server carries the relay
  // route (the app server when packaged; a relay-only server in dev, where
  // Vite serves the renderer). The renderer builds its redirect_uri from
  // this rather than its own origin.
  callbackOrigin: ipcRenderer.sendSync('oauth:callback-origin'),
  onCallback: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('oauth:callback', listener);
    return () => ipcRenderer.removeListener('oauth:callback', listener);
  },
});
