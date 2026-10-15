/**
 * useValueContextMenu — the right-click menu every draggable VALUE control
 * carries (2026-10-15): "Enter value…" (the host opens ManualValueDialog,
 * or its own typed entry) and, when the control has a default, "Reset to
 * …". The hook owns the menu's open state and position; the host spreads
 * `onContextMenu` on the control's wrapper and renders `menu`.
 */
import React from 'react';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';

export interface ValueContextMenuOptions {
  /** "Enter value…" */
  onEnterValue: () => void;
  /** "Reset to <resetLabel>" — omitted, there is no reset item */
  onReset?: () => void;
  /** What the reset goes to, for the item's label: "default", "1×", "centre" */
  resetLabel?: string;
  /** The menu does not open (a disabled control) */
  disabled?: boolean;
}

export function useValueContextMenu({ onEnterValue, onReset, resetLabel = 'default', disabled = false }: ValueContextMenuOptions) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const close = React.useCallback(() => setOpen(false), []);
  const onContextMenu = React.useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }, [disabled]);
  const menu = (
    <ContextMenu isOpen={open} onClose={close} x={pos.x} y={pos.y} className="value-context-menu">
      <ContextMenuItem label="Enter value…" onClick={onEnterValue} onClose={close} />
      {onReset && <ContextMenuItem label={`Reset to ${resetLabel}`} onClick={onReset} onClose={close} />}
    </ContextMenu>
  );
  return { onContextMenu, menu, open, close };
}
