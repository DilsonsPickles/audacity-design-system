import { useCallback, useRef, useState } from 'react';
import type { BarPlacement, ToolbarLayout } from '@audacity-ui/components';
import { resolveBarDrop, type BarDropTarget } from '../utils/toolbarDockDrop';

export type ToolbarDropTarget = BarDropTarget;

export interface UseToolbarBarDragDeps {
  layout: ToolbarLayout;
  /** Does every tool of this bar have a vertical form? */
  barFitsVertical: (barId: string) => boolean;
  onDrop: (barId: string, placement: BarPlacement) => void;
}

export interface UseToolbarBarDragReturn {
  /** The bar in hand, or null */
  draggingBarId: string | null;
  /** Where it would land */
  dropTarget: ToolbarDropTarget | null;
  /** The ghost that follows the pointer */
  ghost: { x: number; y: number; width: number; height: number } | null;
  /** The editor row's rect at the press — the side bands' frame */
  rowRect: DOMRect | null;
  /** The bar in hand may dock vertically (the side bands show for it) */
  fitsVertical: boolean;
  onGripMouseDown: (barId: string, e: React.MouseEvent, barRect: DOMRect) => void;
}

/**
 * A BAR'S GRIP DRAG (2026-11-09, custom toolbars — "persistent grippers"):
 * a press on a bar's grip lifts the whole bar; a ghost of its size follows
 * the pointer; the dock under the pointer shows where the bar would land
 * (`resolveBarDrop`: between two bars, at a line's end, on a NEW ROW — the
 * line between rows or a dock's edge — or an empty side dock's band); the
 * release moves it there. A bar with no vertical form is refused by a
 * side dock, the indicator saying so. Self-cleaning document listeners
 * (attached on the press, removed on the release), as the old gripper's.
 */
export function useToolbarBarDrag({ layout, barFitsVertical, onDrop }: UseToolbarBarDragDeps): UseToolbarBarDragReturn {
  const [draggingBarId, setDraggingBarId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ToolbarDropTarget | null>(null);
  const [ghost, setGhost] = useState<UseToolbarBarDragReturn['ghost']>(null);
  const [rowRect, setRowRect] = useState<DOMRect | null>(null);
  const [fitsVertical, setFitsVertical] = useState(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const fitsRef = useRef(barFitsVertical);
  fitsRef.current = barFitsVertical;
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const onGripMouseDown = useCallback((barId: string, e: React.MouseEvent, barRect: DOMRect) => {
    if (e.button !== 0) return;
    const offsetX = e.clientX - barRect.left;
    const offsetY = e.clientY - barRect.top;
    const fits = fitsRef.current(barId);
    // The editor row frames the side bands (the dockable panels' zones):
    // the side docks' parent, measured at the press
    const row = document.querySelector<HTMLElement>('[data-editor-row]')?.getBoundingClientRect() ?? null;
    setDraggingBarId(barId);
    setFitsVertical(fits);
    setRowRect(row);
    setGhost({ x: barRect.left, y: barRect.top, width: barRect.width, height: barRect.height });
    let target: ToolbarDropTarget | null = null;
    const resolve = (x: number, y: number) => resolveBarDrop(x, y, layoutRef.current, row, fits);

    const onMove = (ev: MouseEvent) => {
      setGhost({ x: ev.clientX - offsetX, y: ev.clientY - offsetY, width: barRect.width, height: barRect.height });
      target = resolve(ev.clientX, ev.clientY);
      setDropTarget(target);
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const final = resolve(ev.clientX, ev.clientY) ?? target;
      setDraggingBarId(null);
      setDropTarget(null);
      setGhost(null);
      setRowRect(null);
      // (a drop that changes nothing — beside itself — is the layout's to ignore)
      if (!final || final.refused) return;
      onDropRef.current(barId, final.placement);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return { draggingBarId, dropTarget, ghost, rowRect, fitsVertical, onGripMouseDown };
}
