/**
 * FLOATING UI AS A FRAMELESS CHILD WINDOW (2026-11-17, "I want those
 * dropdowns dropping down and overlapping the window", then "Do the same
 * for the context menus in popout windows"): an OS window's content
 * cannot overflow the window, so under Electron a dropdown list or
 * context menu that would clip at its window's edge opens as its own
 * frameless, transparent child window at screen coordinates — a native
 * menu's behaviour. main.cjs keys the window options on the
 * `audacity-dropdown-popout` frame-name prefix (frameless, transparent,
 * unresizable, skip-taskbar, a child of its opener), shared by every
 * floating-UI window so no new main-process prefix — and no shell
 * restart — is needed per kind.
 */

/** The frame-name prefix main.cjs strips the frame for */
export const FLOATING_WINDOW_PREFIX = 'audacity-dropdown-popout';

/** True under the Electron shell (the preload's marker on the main window) */
export function isElectronHost(): boolean {
  return typeof window !== 'undefined' && Boolean((window as { electronMenu?: unknown }).electronMenu);
}

/**
 * Open a frameless child window at `viewportX/Y` of `ownerEl`'s window
 * (converted to screen coordinates), sized `width` × `height`, with the
 * opener's stylesheets adopted and a transparent page — the caller
 * portals its content into `document.body`. Returns null when the popup
 * is refused; the caller falls back to its in-window placement.
 */
export function openFloatingWindow(ownerEl: HTMLElement, name: string, viewportX: number, viewportY: number, width: number, height: number): Window | null {
  const doc = ownerEl.ownerDocument;
  const win = doc.defaultView ?? window;
  // screen coordinates: the window's origin, plus whatever chrome sits
  // above the content (outer − inner height; 0 for a frameless popout),
  // plus the spot's place in the content
  const chromeY = (win.outerHeight || 0) - (win.innerHeight || 0);
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  // KEPT ON THE SCREEN (2026-11-18, "I can't right click in the empty group
  // space to add tools": a group in the right toolbar of a full-screen-width
  // window opened its menu at the pointer's true place, 1487 on a 1512 screen,
  // so the 189px menu window sat almost wholly past the display's edge and
  // nothing showed): shifted back inside the screen's available area, as a
  // native menu shifts to fit
  const scr = win.screen as Screen & { availLeft?: number; availTop?: number };
  const availLeft = scr?.availLeft ?? 0;
  const availTop = scr?.availTop ?? 0;
  const availRight = availLeft + (scr?.availWidth || Infinity);
  const availBottom = availTop + (scr?.availHeight || Infinity);
  const rawLeft = Math.round((win.screenX || 0) + viewportX);
  const rawTop = Math.round((win.screenY || 0) + chromeY + viewportY);
  const left = Math.max(availLeft, Math.min(rawLeft, availRight - w));
  const top = Math.max(availTop, Math.min(rawTop, availBottom - h));
  let popup: Window | null = null;
  try {
    popup = win.open('', name, `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  } catch {
    return null;
  }
  if (!popup) return null;
  // THE WINDOW GOES WITH ITS PAGE (2026-11-18, "that add tools menu can't be
  // dismissed. And Esc isn't closing it"): a reload of the opener — a dev
  // rebuild, ⌘R — wiped the code that owned the window and left it on
  // screen with nothing to close it, deaf to Escape and to clicks; now the
  // opener's pagehide closes it
  const closeWithOpener = () => { if (!popup!.closed) popup!.close(); };
  win.addEventListener('pagehide', closeWithOpener, { once: true });
  adoptStyles(popup.document, doc);
  popup.document.documentElement.style.background = 'transparent';
  popup.document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden;';
  return popup;
}

/** The PopoutPanel style-adoption trick: a base href so relative URLs
 *  resolve, then every stylesheet cloned into the child window */
function adoptStyles(into: Document, from: Document): void {
  const base = into.createElement('base');
  base.href = from.baseURI;
  into.head.appendChild(base);
  from.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    into.head.appendChild(node.cloneNode(true));
  });
}
