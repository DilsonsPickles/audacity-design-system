import React from 'react';
import { createPortal } from 'react-dom';
import { ContextMenu, ContextMenuItem, GhostButton } from '@audacity-ui/components';

export interface PopoutMenuItem {
  label: string;
  onClick?: () => void;
  isDivider?: boolean;
}

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
  /** When set at mount, the popout opens mid-drag (a tab torn off a
   *  dock): the window appears under the pointer and follows it via
   *  MAIN-document pointer events until release, feeding the same
   *  onDragMove/onDragEnd stream. The host clears it in onDragEnd. */
  continueDragFrom?: { clientX: number; clientY: number; screenX: number; screenY: number } | null;
  /** Items for the tab's ⋯ menu — the same placement/Close entries the
   *  panel shows when docked. Rendered INSIDE the popout document. */
  menuItems?: PopoutMenuItem[];
  children: React.ReactNode;
}

/** Offsets keeping the popout's header under the pointer mid-drag */
const DRAG_OFFSET_X = 120;
const DRAG_OFFSET_Y = 16;

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
 * and the same ⋯ menu the docked tab carries (per the 2026-09-10
 * decision, Close lives in that menu — headers get no ✕). The OS
 * window closing still re-docks via `onClose`.
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

export function PopoutPanel({ title, width, height, onClose, onDragMove, onDragEnd, continueDragFrom, menuItems, children }: PopoutPanelProps) {
  const [popoutRoot, setPopoutRoot] = React.useState<HTMLElement | null>(null);
  const [headerEl, setHeaderEl] = React.useState<HTMLDivElement | null>(null);
  // Tab ⋯ menu, positioned in the POPOUT's viewport coordinates
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  // The tear-off start captured at MOUNT — the prop lives until the
  // host's onDragEnd clears it, but only the first render's value opens
  // a session
  const continueFromRef = React.useRef(continueDragFrom ?? null);
  const continueSessionStartedRef = React.useRef(false);

  // Ref-mirror: the popout's listeners bind once and read the live
  // callbacks through refs
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const onDragMoveRef = React.useRef(onDragMove);
  React.useEffect(() => { onDragMoveRef.current = onDragMove; }, [onDragMove]);
  const onDragEndRef = React.useRef(onDragEnd);
  React.useEffect(() => { onDragEndRef.current = onDragEnd; }, [onDragEnd]);

  // Continued tear-off drag: the popout opened mid-gesture, so the
  // pointer is still held over the MAIN window — its document keeps
  // receiving the pointer events (EditorLayout captured the pointer on
  // body, so they keep flowing even outside the app window). The popout
  // follows via moveTo until release.
  React.useEffect(() => {
    const start = continueFromRef.current;
    if (!popoutRoot || !start || continueSessionStartedRef.current) return;
    continueSessionStartedRef.current = true;
    const popout = popoutRoot.ownerDocument.defaultView;
    if (!popout) return;

    let lastClientX = start.clientX;
    let lastClientY = start.clientY;
    const end = (report: boolean) => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      if (report) onDragEndRef.current?.(lastClientX, lastClientY);
    };
    const onPointerMove = (ev: PointerEvent) => {
      // Released before we attached (ultra-fast tear): settle in place
      if (ev.buttons === 0) { end(true); return; }
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      try { popout.moveTo(ev.screenX - DRAG_OFFSET_X, ev.screenY - DRAG_OFFSET_Y); } catch { /* jsdom */ }
      onDragMoveRef.current?.(ev.clientX, ev.clientY);
    };
    const onPointerUp = (ev: PointerEvent) => {
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      end(true);
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => end(false);
  }, [popoutRoot]);

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
      // is entirely off-screen — the popout "disappears". A torn-off
      // panel opens under the pointer; otherwise land it over the
      // opener (Chromium clamps into the display either way).
      const tear = continueFromRef.current;
      const left = Math.max(0, Math.round(tear ? tear.screenX - DRAG_OFFSET_X : (window.screenX || 0) + 120));
      const top = Math.max(0, Math.round(tear ? tear.screenY - DRAG_OFFSET_Y : (window.screenY || 0) + 120));
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
      // Under Electron the popout is a frameless TRANSPARENT window
      // (main.cjs) — the panel draws its own corner radius. A plain
      // browser popup keeps its OS chrome, where rounding our content
      // would leave white corners behind it.
      const isElectron = Boolean((window as { electronMenu?: unknown }).electronMenu);
      if (isElectron) {
        popout.document.documentElement.style.background = 'transparent';
        popout.document.body.style.background = 'transparent';
        root.style.borderRadius = '4px';
      }
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
          {menuItems && menuItems.length > 0 && (
            <GhostButton
              icon="menu"
              size="small"
              ariaLabel={`${title} menu`}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPos({ x: rect.right, y: rect.bottom });
              }}
            />
          )}
        </div>
      </div>
      {menuItems && (
        <ContextMenu
          isOpen={menuPos !== null}
          onClose={() => setMenuPos(null)}
          x={menuPos?.x ?? 0}
          y={menuPos?.y ?? 0}
        >
          {menuItems.map((item, i) =>
            item.isDivider ? (
              <ContextMenuItem key={`divider-${i}`} isDivider label="" />
            ) : (
              <ContextMenuItem
                key={item.label}
                label={item.label}
                onClick={() => {
                  setMenuPos(null);
                  item.onClick?.();
                }}
              />
            ),
          )}
        </ContextMenu>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </>,
    popoutRoot,
  );
}

export default PopoutPanel;
