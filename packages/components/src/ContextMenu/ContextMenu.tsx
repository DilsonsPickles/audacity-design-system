import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';

/** The menu keeps this far from every edge of the viewport */
const EDGE_MARGIN = 10;
import { createPortal } from 'react-dom';
import { useTheme } from '../ThemeProvider';
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
  /** Render the menu into this element (its document's body, usually)
   *  instead of in place. A `position: fixed` menu inside an ancestor
   *  that is a containing block — a Dialog, whose `container-type:
   *  inline-size` makes it one — is placed relative to that ancestor and
   *  clipped by its overflow (the Go to dialog's timecode menu opened
   *  under the dialog, 2026-10-13). Pass the trigger's own document's
   *  body so a popout window's menu stays in its window. */
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

  // Store the trigger element when menu opens
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = ownerDoc().activeElement as HTMLElement;
    }
  }, [isOpen]);

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
  }, [isOpen]);

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
  }, [isOpen, autoFocus]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closedByPointerRef.current = true; // the pointer put the focus where it wanted
        onClose();
      }
    };

    // Add slight delay to prevent immediate close from the button click that opened it
    const doc = ownerDoc();
    setTimeout(() => {
      doc.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => doc.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

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
        menuRef.current.querySelectorAll(':scope > [role="menuitem"]:not([aria-disabled="true"])')
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
    return () => doc.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

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
    const menu = menuRef.current;
    const win = menu.ownerDocument.defaultView ?? window;
    const vw = win.innerWidth;
    const vh = win.innerHeight;
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    let ax = x;
    let ay = y;
    if (ax + w > vw - EDGE_MARGIN) ax = vw - w - EDGE_MARGIN;
    if (ay + h > vh - EDGE_MARGIN) ay = vh - h - EDGE_MARGIN;
    if (ax < EDGE_MARGIN) ax = EDGE_MARGIN;
    if (ay < EDGE_MARGIN) ay = EDGE_MARGIN;
    setClamped(ax !== x || ay !== y ? { x: ax, y: ay } : null);
  }, [isOpen, x, y]);

  if (!isOpen) return null;

  const menu = (
    <div
      ref={menuRef}
      className={`context-menu ${className}`}
      role="menu"
      style={{
        position: 'fixed',
        left: `${clamped?.x ?? x}px`,
        top: `${clamped?.y ?? y}px`,
        zIndex: 10000,
        ...style,
      }}
    >
      {children}
    </div>
  );
  return portalTo ? createPortal(menu, portalTo) : menu;
};
