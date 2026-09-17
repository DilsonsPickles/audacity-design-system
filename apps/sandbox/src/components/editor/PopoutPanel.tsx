import React from 'react';
import { createPortal } from 'react-dom';

export interface PopoutPanelProps {
  /** OS window title */
  title: string;
  /** Initial window size */
  width: number;
  height: number;
  /** Called when the popout window is closed by the user (or when the
   *  popup could not be opened at all — blocked in a plain browser).
   *  The consumer re-docks the panel in response. */
  onClose: () => void;
  children: React.ReactNode;
}

/** Copy the parent document's styles into the popout so the portaled
 *  panel renders identically. A <base> pointing at the parent's baseURI
 *  goes in FIRST — the popout is about:blank, so without it every
 *  relative url() (fonts, images) in the cloned sheets would resolve
 *  against nothing. */
function adoptParentStyles(popoutDocument: Document) {
  const base = popoutDocument.createElement('base');
  base.href = document.baseURI;
  popoutDocument.head.appendChild(base);
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    popoutDocument.head.appendChild(node.cloneNode(true));
  });
}

/**
 * PopoutPanel — hosts children in a REAL separate window (an OS child
 * window under Electron, a popup in a plain browser) while their React
 * tree stays mounted in the main app: `window.open('')` is same-origin,
 * so `createPortal` renders straight into the popout's document and all
 * state/context/handlers keep living here. Closing the window (or the
 * popup being blocked) reports through `onClose`.
 */
export function PopoutPanel({ title, width, height, onClose, children }: PopoutPanelProps) {
  const [popoutRoot, setPopoutRoot] = React.useState<HTMLElement | null>(null);

  // Ref-mirror: the popout's pagehide listener binds once and reads the
  // live callback through the ref
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    const popout = window.open('', '_blank', `popup=yes,width=${width},height=${height}`);
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
      popout.close();
    };
    // Mount-once by design: title/size only apply to the initial open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!popoutRoot) return null;
  return createPortal(children, popoutRoot);
}

export default PopoutPanel;
