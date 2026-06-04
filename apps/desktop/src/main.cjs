// Electron main process for the Audacity 4 desktop shell.
//
// Why this file exists at all: hosting the sandbox in Electron (rather
// than a browser tab) makes the moose-hub / adieu HTTP traffic feel like
// it's coming from a desktop app rather than from a website that happens
// to be online. The renderer itself is unchanged — Electron just gives us
// a window, a native dock entry, and a stable origin for OAuth + cookies.
//
// In dev we point the BrowserWindow at the Vite dev server. In prod we
// spin up a tiny Express server on the main process that serves the
// pre-built sandbox over http://, then load that. We deliberately avoid
// `file://` because:
//   - adieu's session cookie is SameSite=None; Secure, which the browser
//     refuses to set for a file:// origin;
//   - moose-hub's OAuth-PKCE flow validates the registered redirect URI,
//     and only loopback http URIs are on the allowlist;
//   - CORS rules treat file:// as a null origin, which would block every
//     cross-origin fetch the sandbox makes.
// A loopback http server sidesteps all three with no allowlist changes.

const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');
const net = require('node:net');

const DEV_URL = 'http://localhost:5173';
const PREFERRED_PORT = 5173;

// Find a usable loopback port. Prefer 5173 (matches moose-hub's OAuth
// allowlist) but fall back to whatever the OS gives us if it's taken.
// Loopback redirect URIs are spec-allowed for native OAuth clients
// (RFC 8252 §7.3), so any localhost port is acceptable to moose-hub —
// 5173 just keeps us aligned with the dev flow.
function findFreePort(preferred) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const tester = net.createServer();
      tester.unref();
      tester.on('error', () => {
        if (port === preferred) tryPort(0);
        else resolve(null);
      });
      tester.listen(port, '127.0.0.1', () => {
        const actual = tester.address().port;
        tester.close(() => resolve(actual));
      });
    };
    tryPort(preferred);
  });
}

async function startLocalRendererServer() {
  // Lazy-require so dev mode (which never hits this path) doesn't pay the
  // Express startup cost.
  const express = require('express');
  // In a packaged build the sandbox dist lives in
  // process.resourcesPath/renderer; in a dev electron-builder unpacked
  // run it can also be reached via the relative path inside the asar.
  const rendererDir = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer')
    : path.resolve(__dirname, '..', '..', 'sandbox', 'dist');

  const server = express();
  server.disable('x-powered-by');
  server.use(express.static(rendererDir, { index: 'index.html' }));
  // SPA fallback — the sandbox uses client-side routing.
  server.get('*', (_req, res) => {
    res.sendFile(path.join(rendererDir, 'index.html'));
  });

  const port = await findFreePort(PREFERRED_PORT);
  return new Promise((resolve, reject) => {
    const listener = server.listen(port, '127.0.0.1', () => {
      resolve(`http://localhost:${port}`);
    });
    listener.on('error', reject);
  });
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Audacity 4',
    backgroundColor: '#1D1D1F',
    // Default native title bar — the renderer's own toolbar lives just
    // under it. Frameless / titleBarStyle: 'hiddenInset' is a future
    // polish step once the in-app chrome is reworked to host its own
    // window controls.
    webPreferences: {
      // The sandbox is pure browser code; we never expose Node APIs to
      // it. Keeps the renderer untrusted and matches the assumptions of
      // the OAuth + adieu cookie flows.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external links in the system browser rather than spawning a
  // second BrowserWindow — keeps "View on audio.com" feeling like a
  // normal handoff to the user's default browser.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//.test(target)) {
      void shell.openExternal(target);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.loadURL(url);
  return win;
}

function setApplicationMenu() {
  // Bare-bones macOS-style menu so the standard shortcuts (⌘Q, ⌘W,
  // ⌘C/V, ⌘R for reload during dev, devtools) work out of the box. We
  // intentionally don't try to mirror the in-app File/Edit/View menus
  // here — those live in the toolbar and would diverge.
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
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
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  setApplicationMenu();

  // Dev mode: ELECTRON_START_URL is set by the `dev` script (which waits
  // for the Vite server before launching electron). Anything else is
  // treated as a packaged / preview build that needs the bundled static
  // server.
  const startUrl = process.env.ELECTRON_START_URL
    || (app.isPackaged ? await startLocalRendererServer() : DEV_URL);

  createWindow(startUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(startUrl);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
