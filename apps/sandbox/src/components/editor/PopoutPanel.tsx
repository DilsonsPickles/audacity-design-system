import React from 'react';
import { createPortal } from 'react-dom';
import { GhostButton } from '@audacity-ui/components';

export interface PopoutPanelProps {
  /** OS window title (also the in-panel header label) */
  title: string;
  /** Initial window size */
  width: number;
  height: number;
  /** Called when the popout window is closed by the user (its ✕ or the
   *  OS close), or when the popup could not be opened at all — blocked
   *  in a plain browser. The consumer re-docks the panel in response. */
  onClose: () => void;
  /** Reports the pointer position (in the MAIN window's viewport
   *  coordinates) while the popout is dragged by its header — lets the
   *  host light up its dock zones */
  onDragMove?: (x: number, y: number) => void;
  /** Reports the pointer position when the header drag is RELEASED —
   *  the host docks the panel if it landed on a zone */
  onDragEnd?: (x: number, y: number) => void;
  children: React.ReactNode;
}

/** Translate a screen-coordinate pointer position into the MAIN
 *  window's viewport coordinates — the space the dock zones live in.
 *  The vertical chrome offset (titlebar) is outerHeight - innerHeight. */
function screenToMainViewport(screenX: number, screenY: number): { x: number; y: number } {
  const chromeY = Math.max(0, (window.outerHeight || 0) - window.innerHeight);
  return {
    x: screenX - (window.screenX || 0),
    y: screenY - (window.screenY || 0) - chromeY,
  };
}

/** Copy the parent document's styles into the popout so the portaled
 *  panel renders identically. A <base> pointing at the parent's baseURI
 *  goes in FIRST — the popout is about:blank, so without it every
 *  relative url() (fonts, images) in the cloned sheets would resolve
 *  against nothing. Also injects the popout's own chrome styles: the
 *  header is the frameless window's drag region (-webkit-app-region),
 *  with interactive children opted back out. */
function adoptParentStyles(popoutDocument: Document) {
  const base = popoutDocument.createElement('base');
  base.href = document.baseURI;
  popoutDocument.head.appendChild(base);
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    popoutDocument.head.appendChild(node.cloneNode(true));
  });
  const chrome = popoutDocument.createElement('style');
  // Mirrors PanelHeader's docked chrome: an elevated 32px strip whose
  // bottom hairline the active tab overlaps, tab on the default surface
  chrome.textContent = `
    .popout-panel__header {
      user-select: none;
      cursor: grab;
      height: 32px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      background: #ebedf0;
      position: relative;
    }
    .popout-panel__header::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 1px;
      background: #d4d5d9;
      pointer-events: none;
    }
    .popout-panel__header:active { cursor: grabbing; }
    .popout-panel__tab {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 32px;
      padding: 0 8px 0 12px;
      background: #f8f8f9;
      border-right: 1px solid #d4d5d9;
      position: relative;
      z-index: 1;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 400;
      line-height: 16px;
      color: #14151a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .popout-panel__header button { cursor: pointer; }
  `;
  popoutDocument.head.appendChild(chrome);
}

/**
 * PopoutPanel — hosts children in a REAL separate window (a FRAMELESS
 * OS child window under Electron — main.cjs's setWindowOpenHandler
 * strips the frame for the `audacity-panel-popout` frame-name prefix —
 * or a regular popup in a plain browser) while their React tree stays
 * mounted in the main app: `window.open('')` is same-origin, so
 * `createPortal` renders straight into the popout's document and all
 * state/context/handlers keep living here. The panel draws its own
 * 32px header: the drag region for the frameless window, the title,
 * and the ✕ (which, like the OS close, re-docks via `onClose`).
 */
interface PopoutEntry {
  win: Window;
  root: HTMLElement;
  /** Pending deferred-close timer (see cleanup below) */
  closeTimer: number | null;
}

/** Live popout windows by frame name. Module-scoped so a StrictMode
 *  remount (mount → cleanup → mount, synchronously in dev) RECLAIMS the
 *  window its doppelgänger opened instead of racing open/close on the
 *  same named window — which killed the popout the instant it opened. */
const popoutEntries = new Map<string, PopoutEntry>();

export function PopoutPanel({ title, width, height, onClose, onDragMove, onDragEnd, children }: PopoutPanelProps) {
  const [popoutRoot, setPopoutRoot] = React.useState<HTMLElement | null>(null);
  const [headerEl, setHeaderEl] = React.useState<HTMLDivElement | null>(null);

  // Ref-mirror: the popout's listeners bind once and read the live
  // callbacks through refs
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const onDragMoveRef = React.useRef(onDragMove);
  React.useEffect(() => { onDragMoveRef.current = onDragMove; }, [onDragMove]);
  const onDragEndRef = React.useRef(onDragEnd);
  React.useEffect(() => { onDragEndRef.current = onDragEnd; }, [onDragEnd]);

  // JS-driven window drag from the popout's own header. Deliberately
  // NOT a native -webkit-app-region drag: a native drag starves the
  // page of mouse events, so there'd be no way to highlight dock zones
  // live or to dock ONLY on release (macOS's 'moved' fires all through
  // the drag). Pointer capture keeps move/up flowing to the header even
  // when the pointer leaves the little window; window.moveTo is
  // permitted for script-opened windows. NOTE: React synthetic handlers
  // don't fire across documents (delegation lives in the main doc), so
  // these are native listeners on the portaled element.
  React.useEffect(() => {
    if (!headerEl) return;
    const popout = headerEl.ownerDocument.defaultView;
    if (!popout) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      try { headerEl.setPointerCapture(e.pointerId); } catch { /* jsdom / older engines */ }
      const startCursorX = e.screenX;
      const startCursorY = e.screenY;
      const startWinX = popout.screenX;
      const startWinY = popout.screenY;
      let dragging = false;

      const onPointerMove = (ev: PointerEvent) => {
        const dx = ev.screenX - startCursorX;
        const dy = ev.screenY - startCursorY;
        if (!dragging && Math.abs(dx) + Math.abs(dy) < 3) return;
        dragging = true;
        try { popout.moveTo(startWinX + dx, startWinY + dy); } catch { /* jsdom */ }
        const p = screenToMainViewport(ev.screenX, ev.screenY);
        onDragMoveRef.current?.(p.x, p.y);
      };
      const onPointerUp = (ev: PointerEvent) => {
        headerEl.removeEventListener('pointermove', onPointerMove);
        headerEl.removeEventListener('pointerup', onPointerUp);
        try { headerEl.releasePointerCapture(e.pointerId); } catch { /* jsdom */ }
        if (!dragging) return;
        // THE drop gesture — dock zones only act on actual release
        const p = screenToMainViewport(ev.screenX, ev.screenY);
        onDragEndRef.current?.(p.x, p.y);
      };
      headerEl.addEventListener('pointermove', onPointerMove);
      headerEl.addEventListener('pointerup', onPointerUp);
    };

    headerEl.addEventListener('pointerdown', onPointerDown);
    return () => headerEl.removeEventListener('pointerdown', onPointerDown);
  }, [headerEl]);

  React.useEffect(() => {
    // Unique frame name per panel so two popouts never reuse one window;
    // the prefix is what main.cjs keys the frameless override on
    const frameName = `audacity-panel-popout-${title.replace(/\W+/g, '-')}`;

    // Reclaim a window the previous mount opened (StrictMode remount),
    // cancelling its pending deferred close
    let entry = popoutEntries.get(frameName) ?? null;
    if (entry && entry.win.closed) {
      popoutEntries.delete(frameName);
      entry = null;
    }
    if (entry && entry.closeTimer !== null) {
      window.clearTimeout(entry.closeTimer);
      entry.closeTimer = null;
    }

    if (!entry) {
      // EXPLICIT position: Chromium's default places a popup to the
      // RIGHT of the opener window, which for a full-width main window
      // is entirely off-screen — the popout "disappears". Land it over
      // the opener instead (Chromium clamps it into the display).
      const left = Math.max(0, Math.round((window.screenX || 0) + 120));
      const top = Math.max(0, Math.round((window.screenY || 0) + 120));
      const popout = window.open(
        '',
        frameName,
        `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
      );
      if (!popout) {
        // Popup blocked (plain browser without a user gesture) — bail
        // out and let the consumer fall back to an in-app placement
        onCloseRef.current();
        return;
      }

      popout.document.title = title;
      adoptParentStyles(popout.document);
      popout.document.body.style.margin = '0';

      const root = popout.document.createElement('div');
      root.className = 'popout-panel-root';
      root.style.cssText = 'height:100vh;display:flex;flex-direction:column;overflow:hidden;background:#f8f8f9;';
      popout.document.body.appendChild(root);

      entry = { win: popout, root, closeTimer: null };
      popoutEntries.set(frameName, entry);
    }

    const { win: popout, root } = entry;
    const claimed = entry;
    setPopoutRoot(root);

    // The user closing the OS window is the "re-dock" gesture. pagehide
    // also fires for our own deferred close below — the listener is
    // removed first so unmounting never reports a close.
    const handlePageHide = () => onCloseRef.current();
    popout.addEventListener('pagehide', handlePageHide);
    // Take the popout down with the main window
    const closePopout = () => popout.close();
    window.addEventListener('pagehide', closePopout);

    return () => {
      popout.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pagehide', closePopout);
      setPopoutRoot(null);
      // DEFERRED close: a StrictMode remount runs synchronously before
      // timers, reclaims the entry above and cancels this — only a real
      // unmount lets it fire.
      claimed.closeTimer = window.setTimeout(() => {
        if (popoutEntries.get(frameName) === claimed) popoutEntries.delete(frameName);
        try {
          root.remove();
          popout.close();
        } catch {
          // The window may already be gone (user closed it first)
        }
      }, 0);
    };
    // Mount-once by design: title/size only apply to the initial open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!popoutRoot) return null;
  return createPortal(
    <>
      <div className="popout-panel__header" ref={setHeaderEl}>
        <div className="popout-panel__tab">
          <span>{title}</span>
          <GhostButton
            icon="close"
            size="small"
            ariaLabel={`Close ${title} window`}
            onClick={() => onCloseRef.current()}
          />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </>,
    popoutRoot,
  );
}

export default PopoutPanel;
