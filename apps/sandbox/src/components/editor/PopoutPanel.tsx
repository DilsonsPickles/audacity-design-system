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
  children: React.ReactNode;
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
  chrome.textContent = `
    .popout-panel__header {
      -webkit-app-region: drag;
      user-select: none;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 6px 0 10px;
      flex-shrink: 0;
      background: #f8f8f9;
      border-bottom: 1px solid #d4d5d9;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #14151a;
    }
    .popout-panel__header button { -webkit-app-region: no-drag; }
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
export function PopoutPanel({ title, width, height, onClose, children }: PopoutPanelProps) {
  const [popoutRoot, setPopoutRoot] = React.useState<HTMLElement | null>(null);

  // Ref-mirror: the popout's pagehide listener binds once and reads the
  // live callback through the ref
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    // Unique frame name per panel so two popouts never reuse one window;
    // the prefix is what main.cjs keys the frameless override on
    const frameName = `audacity-panel-popout-${title.replace(/\W+/g, '-')}`;
    const popout = window.open('', frameName, `popup=yes,width=${width},height=${height}`);
    if (!popout) {
      // Popup blocked (plain browser without a user gesture) — bail out
      // and let the consumer fall back to an in-app placement
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
    setPopoutRoot(root);

    // The user closing the OS window is the "re-dock" gesture. pagehide
    // also fires for our own cleanup close() below — the listener is
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
      root.remove();
      popout.close();
    };
    // Mount-once by design: title/size only apply to the initial open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!popoutRoot) return null;
  return createPortal(
    <>
      <div className="popout-panel__header">
        <span>{title}</span>
        <GhostButton
          icon="close"
          size="small"
          ariaLabel={`Close ${title} window`}
          onClick={() => onCloseRef.current()}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </>,
    popoutRoot,
  );
}

export default PopoutPanel;
