import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';

/** The menu keeps this far from every edge of the viewport */
const EDGE_MARGIN = 10;
import { createPortal } from 'react-dom';
import { useTheme } from '../ThemeProvider';
import { FLOATING_WINDOW_PREFIX, isElectronHost, openFloatingWindow } from '../utils/floatingWindow';
import './ContextMenu.css';

export interface ContextMenuProps {
  /**
   * Whether the menu is open
   */
  isOpen: boolean;

  /**
   * Callback when menu should close
   */
  onClose: () => void;

  /**
   * X position for the menu (in pixels)
   */
  x: number;

  /**
   * Y position for the menu (in pixels)
   */
  y: number;

  /**
   * Menu items (children)
   */
  children: React.ReactNode;

  /**
   * Optional CSS class name
   */
  className?: string;
  /** Render the menu into this element instead of its own document's
   *  body. SINCE 2026-11-17 THE MENU ALWAYS PORTALS ("the context menus
   *  are being clipped by the modal, this should never happen"): a
   *  `position: fixed` menu left in place inside an ancestor that is a
   *  containing block — a Dialog, whose `container-type: inline-size`
   *  makes it one — is placed relative to that ancestor and clipped by
   *  its overflow (the Go to dialog's timecode menu, 2026-10-13). By
   *  default an invisible probe at the menu's place in the tree learns
   *  which document the menu lives in (a panel popout window's menus
   *  stay in their window) and the menu portals to that body; pass
   *  `portalTo` only to send it somewhere else. */
  portalTo?: Element | null;

  /**
   * Whether to auto-focus first item (when opened via keyboard)
   */
  autoFocus?: boolean;

  /**
   * Inline styles (for CSS custom properties)
   */
  style?: React.CSSProperties;
}

/**
 * ContextMenu - A floating context menu that appears at a specific position
 * Handles click-outside-to-close and positioning
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  children,
  className = '',
  portalTo = null,
  autoFocus = true,
  style: externalStyle,
}) => {
  const { theme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  // THE DEFAULT PORTAL TARGET: the body of the document the menu is
  // RENDERED IN — the module document's body at once (right for the main
  // window, so the menu mounts in the first commit and the effects bind),
  // corrected before paint by an invisible probe at the menu's place in
  // the tree when that is another document (a panel popout window's menu
  // stays in its window). Stable identity, or the ref re-fires per render.
  const [ownBody, setOwnBody] = useState<Element | null>(null);
  const probeRef = React.useCallback((el: HTMLElement | null) => {
    if (el) setOwnBody((prev) => (prev === el.ownerDocument.body ? prev : el.ownerDocument.body));
  }, []);
  // THE MENU AS ITS OWN OS WINDOW (2026-11-17, "Do the same for the
  // context menus in popout windows"): under Electron a menu that would
  // run past its window's edge opens at its TRUE position in a frameless
  // child window and overlaps the edge like a native menu, instead of
  // being clamped inside (the clamp stays as the plain browser's rule).
  const [menuWin, setMenuWin] = useState<Window | null>(null);
  const menuWinNameRef = useRef(`${FLOATING_WINDOW_PREFIX}-menu-${Math.random().toString(36).slice(2)}`);
  const popupBody = menuWin && !menuWin.closed ? menuWin.document.body : null;
  const host = popupBody ?? portalTo ?? ownBody ?? (typeof document === 'undefined' ? null : document.body);

  const internalStyle = {
    '--context-menu-bg': theme.background.menu.background,
    '--context-menu-border': theme.border.default,
    '--context-menu-shadow': '0 4px 16px rgba(0, 0, 0, 0.4)',
    '--context-menu-divider-bg': theme.border.divider,
  } as React.CSSProperties;

  const style = { ...internalStyle, ...externalStyle };

  // The menu can be portaled into ANOTHER document (a panel popout
  // window) — every global listener/measure below must target the
  // document the menu actually lives in, not the module-global one.
  const ownerDoc = () => menuRef.current?.ownerDocument ?? document;

  // Store the trigger element when menu opens — on the OPENING edge
  // only: a later host change (the probe's correction, or the menu
  // moving into its own OS window) must not overwrite the trigger with
  // the new document's activeElement
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      triggerElementRef.current = ownerDoc().activeElement as HTMLElement;
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, host]);

  // FOCUS RETURNS TO THE TRIGGER WHEN THE MENU CLOSES — the global rule
  // (user decision 2026-10-12, "once I've escaped from a context menu or
  // actioned an item, focus should go back to the trigger"): Escape did
  // it below; an actioned item, or a host unmounting the menu, left the
  // focus on a removed element (the body). This cleanup runs on BOTH
  // isOpen → false and unmount (hosts render menus conditionally) and
  // returns the focus when it was still IN the menu, or already gone to
  // the body — never when the user put it somewhere deliberately: an
  // outside click (closedByPointerRef) or a dialog an item opened, which
  // takes the focus after this and keeps it. A trigger that has left the
  // document gets nothing (the fade handle stays mounted for this).
  const focusWithinRef = useRef(false);
  const closedByPointerRef = useRef(false);
  useLayoutEffect(() => {
    if (!isOpen) return;
    closedByPointerRef.current = false;
    const doc = ownerDoc();
    const track = () => { focusWithinRef.current = !!menuRef.current && menuRef.current.contains(doc.activeElement); };
    doc.addEventListener('focusin', track);
    doc.addEventListener('focusout', track);
    return () => {
      doc.removeEventListener('focusin', track);
      doc.removeEventListener('focusout', track);
      const trigger = triggerElementRef.current;
      const active = doc.activeElement;
      const focusLost = !active || active === doc.body || (!!menuRef.current && menuRef.current.contains(active));
      if (!closedByPointerRef.current && trigger && trigger.isConnected && (focusWithinRef.current || focusLost)) {
        // After the host's commit, so a dialog the item opened can take
        // the focus from us instead of the other way round
        setTimeout(() => {
          const now = doc.activeElement;
          if (!now || now === doc.body) trigger.focus();
        }, 0);
      }
      focusWithinRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, host]);

  // Auto-focus first menu item when opened via keyboard
  useEffect(() => {
    if (!isOpen || !autoFocus || !menuRef.current) return;

    // Find first focusable menu item
    const firstItem = menuRef.current.querySelector('[role="menuitem"]') as HTMLElement;
    if (firstItem) {
      // Use setTimeout to ensure menu is rendered and positioned
      setTimeout(() => {
        firstItem.focus();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoFocus, host]);

  // Handle click outside to close. Bound ONCE per opening, the close read
  // through a ref (the ref-mirror rule): hosts pass an inline onClose, and a
  // host that re-renders faster than the timer below re-armed it on every
  // render — clearing it before it fired, so the menu NEVER heard a click
  // outside and stuck open (2026-11-16, the desktop app's title bar).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;

    // In the CAPTURE phase, and on pointerdown as well as mousedown: plenty of
    // the app stops a press on its way up (the ruler, the clip handles) or
    // default-prevents its pointerdown (which suppresses the mousedown), and
    // a menu that only heard a bubbling mousedown stayed open over them.
    let closed = false;
    const handleClickOutside = (e: MouseEvent) => {
      if (closed) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closed = true;
        closedByPointerRef.current = true; // the pointer put the focus where it wanted
        onCloseRef.current();
      }
    };

    // Add slight delay to prevent immediate close from the button click
    // that opened it. In child-window mode the menu's document and the
    // OPENER's are different documents — a press in either closes it.
    const docs = new Set<Document>([ownerDoc()]);
    const openerDoc = (ownBody ?? (typeof document === 'undefined' ? null : document.body))?.ownerDocument;
    if (openerDoc) docs.add(openerDoc);
    const timer = setTimeout(() => {
      docs.forEach((doc) => {
        doc.addEventListener('pointerdown', handleClickOutside, true);
        doc.addEventListener('mousedown', handleClickOutside, true);
      });
    }, 0);

    // (the timer too: a re-render before it fired used to add a listener
    // that no cleanup ever removed — 2026-11-11)
    return () => {
      clearTimeout(timer);
      docs.forEach((doc) => {
        doc.removeEventListener('pointerdown', handleClickOutside, true);
        doc.removeEventListener('mousedown', handleClickOutside, true);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, host]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const doc = ownerDoc();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!menuRef.current) return;

      // Escape closes ANY open menu — before the item walk below, which
      // a menu without direct menuitem children (the Customise toolbar
      // popover's rows are nested checkboxes) would otherwise bail out
      // of (2026-10-07)
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
        if (triggerElementRef.current) {
          const trigger = triggerElementRef.current;
          triggerElementRef.current = null;
          setTimeout(() => trigger.focus(), 0);
        }
        return;
      }

      // Only select direct children menu items, not nested submenu items
      // This ensures submenu navigation is isolated
      const items = Array.from(
        // …and those in a SCROLLING STRETCH of the menu (`data-menu-scroll`,
        // 2026-11-18: the Add tool list scrolls under its search field)
        menuRef.current.querySelectorAll(':scope > [role="menuitem"]:not([aria-disabled="true"]), :scope > [data-menu-scroll] > [role="menuitem"]:not([aria-disabled="true"])')
      ) as HTMLElement[];

      if (items.length === 0) return;

      const currentIndex = items.findIndex(item => item === doc.activeElement);

      // Only handle navigation if focus is within this menu level (not in a submenu)
      const focusedElement = doc.activeElement;
      const isInSubmenu = focusedElement &&
        !items.includes(focusedElement as HTMLElement) &&
        menuRef.current.contains(focusedElement);

      // If focus is in a submenu, let the submenu handle arrow keys
      if (isInSubmenu && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
      }

      // A TEXT FIELD IN A MENU (2026-11-17, the Add tool list's search) keeps
      // its own Home / End — they move the caret, not the menu's focus
      if ((e.key === 'Home' || e.key === 'End') && (focusedElement as HTMLElement | null)?.matches?.('input, textarea')) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          // stopImmediatePropagation + capture-phase listener (below)
          // beats the app-level Escape, which otherwise clears clip
          // selection / shuffles focus before we get a chance to close.
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onClose();
          if (triggerElementRef.current) {
            const trigger = triggerElementRef.current;
            triggerElementRef.current = null;
            setTimeout(() => trigger.focus(), 0);
          }
          break;

        case 'Tab':
          // Tab (with or without Shift) closes menu and moves focus outside
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onClose();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
          } else {
            // Wrap to first item
            items[0].focus();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex - 1].focus();
          } else {
            // Wrap to last item
            items[items.length - 1].focus();
          }
          break;

        case 'Home':
          e.preventDefault();
          items[0].focus();
          break;

        case 'End':
          e.preventDefault();
          items[items.length - 1].focus();
          break;
      }
    };

    doc.addEventListener('keydown', handleKeyDown, true);
    // A MENU IN ITS OWN WINDOW HEARS ESCAPE FROM THE OPENER TOO (2026-11-18,
    // "Esc isn't closing it"): the keyboard focus may still be in the main
    // window, where the menu's own document listener never hears it
    const openerDoc = typeof document === 'undefined' ? null : document;
    const onOpenerEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') handleKeyDown(e); };
    const listenOpener = !!openerDoc && openerDoc !== doc;
    if (listenOpener) openerDoc!.addEventListener('keydown', onOpenerEscape, true);
    return () => {
      doc.removeEventListener('keydown', handleKeyDown, true);
      if (listenOpener) openerDoc!.removeEventListener('keydown', onOpenerEscape, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose, host]);

  // KEEP THE MENU ON SCREEN (2026-10-14, "context menu is being cut
  // off": the clip menu opened near the window's bottom ran past it).
  // The clamp is STATE, not an imperative write to menu.style — the
  // style prop below re-applied the raw x / y on every re-render (a
  // hover anywhere in the host re-rendered the menu), undoing the
  // correction a moment after it was made — and it measures
  // offsetWidth / offsetHeight, the layout size, not a
  // getBoundingClientRect() that the open animation's scale(0.95) shrinks
  // for the first frame. A layout effect, so the first paint is already
  // in place. 10px from every edge.
  const [clamped, setClamped] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) { setClamped(null); return; }
    if (menuWin) return; // the child window holds the menu at 0,0
    const menu = menuRef.current;
    const win = menu.ownerDocument.defaultView ?? window;
    const vw = win.innerWidth;
    const vh = win.innerHeight;
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    // UNDER ELECTRON a menu that runs past the window's right or bottom
    // edge opens at its true position in a frameless child window and
    // OVERLAPS the edge (2026-11-17), instead of being clamped inside;
    // Chromium still keeps the popup on the display
    if ((x + w > vw - EDGE_MARGIN || y + h > vh - EDGE_MARGIN) && isElectronHost()) {
      const popup = openFloatingWindow(menu, menuWinNameRef.current, x, y, w + 2, h + 2);
      if (popup) {
        setMenuWin(popup);
        setClamped(null);
        return;
      }
    }
    let ax = x;
    let ay = y;
    if (ax + w > vw - EDGE_MARGIN) ax = vw - w - EDGE_MARGIN;
    if (ay + h > vh - EDGE_MARGIN) ay = vh - h - EDGE_MARGIN;
    if (ax < EDGE_MARGIN) ax = EDGE_MARGIN;
    if (ay < EDGE_MARGIN) ay = EDGE_MARGIN;
    setClamped(ax !== x || ay !== y ? { x: ax, y: ay } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, x, y, host, menuWin]);

  // The menu window's life follows the menu's: closing or unmounting the
  // menu closes the window; the user closing the window closes the menu
  useEffect(() => {
    if (!isOpen && menuWin) {
      setMenuWin(null);
      if (!menuWin.closed) menuWin.close();
    }
  }, [isOpen, menuWin]);
  useEffect(() => {
    if (!menuWin) return;
    const closeMenu = () => onCloseRef.current();
    menuWin.addEventListener('pagehide', closeMenu);
    return () => {
      menuWin.removeEventListener('pagehide', closeMenu);
      if (!menuWin.closed) menuWin.close();
    };
  }, [menuWin]);

  // SUBMENUS GROW THE WINDOW: a submenu opens absolutely at the item's
  // right edge, past the window sized to the root menu — so the window
  // grows to the content's reach while one is open (growing only: the
  // transparent remainder after it closes takes a press as an outside
  // press, which closes the menu — ordinary menu behaviour)
  useEffect(() => {
    if (!menuWin || menuWin.closed || !menuRef.current) return;
    const menu = menuRef.current;
    const fit = () => {
      if (menuWin.closed || !menuRef.current) return;
      let right = 0;
      let bottom = 0;
      for (const el of [menu, ...Array.from(menu.querySelectorAll<HTMLElement>('*'))]) {
        const r = el.getBoundingClientRect();
        if (r.right > right) right = r.right;
        if (r.bottom > bottom) bottom = r.bottom;
      }
      const w = Math.ceil(right) + 2;
      const h = Math.ceil(bottom) + 2;
      if (w > menuWin.innerWidth || h > menuWin.innerHeight) {
        menuWin.resizeTo(Math.max(w, menuWin.innerWidth), Math.max(h, menuWin.innerHeight));
      }
    };
    fit();
    const MO = (menuWin as Window & typeof globalThis).MutationObserver ?? MutationObserver;
    const mo = new MO(fit);
    mo.observe(menu, { childList: true, subtree: true, attributes: true });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuWin, host]);

  if (!isOpen) return null;

  const menu = (
    <div
      ref={menuRef}
      className={`context-menu ${className}`}
      role="menu"
      style={{
        position: 'fixed',
        // in its own OS window the menu sits at the window's origin, and
        // the native shadow replaces the CSS one (which the window's
        // bounds would clip)
        left: popupBody ? 0 : `${clamped?.x ?? x}px`,
        top: popupBody ? 0 : `${clamped?.y ?? y}px`,
        // above the Dialog's 10000: a menu is transient top-layer UI,
        // and a tie loses on DOM order to a later-mounted window
        zIndex: 10010,
        ...style,
        ...(popupBody ? ({ '--context-menu-shadow': 'none' } as React.CSSProperties) : null),
      }}
    >
      {children}
    </div>
  );
  return (
    <>
      <span ref={probeRef} style={{ display: 'none' }} aria-hidden data-context-menu-probe />
      {host ? createPortal(menu, host) : null}
    </>
  );
};
