import { useCallback, useRef, useState } from 'react';
import { findBar, isVerticalRegion, TOOLBAR_REGIONS, type ToolbarLayout, type ToolbarRegion } from '@audacity-ui/components';

export interface ToolbarDropTarget {
  region: ToolbarRegion;
  /** Before the bar at this index among the dock's bars (length = the end) */
  index: number;
  /** The bar has no vertical form and the dock is a side dock */
  refused: boolean;
}

export interface UseToolbarBarDragDeps {
  layout: ToolbarLayout;
  /** Does every tool of this bar have a vertical form? */
  barFitsVertical: (barId: string) => boolean;
  onDrop: (barId: string, region: ToolbarRegion, index: number) => void;
}

export interface UseToolbarBarDragReturn {
  /** The bar in hand, or null */
  draggingBarId: string | null;
  /** Where it would land */
  dropTarget: ToolbarDropTarget | null;
  /** The ghost that follows the pointer */
  ghost: { x: number; y: number; width: number; height: number } | null;
  onGripMouseDown: (barId: string, e: React.MouseEvent, barRect: DOMRect) => void;
}

/** Near a window edge with no dock under the pointer, the edge's dock
 *  takes the drop (the old toolbar gripper's snap) */
const EDGE_SNAP_PX = 72;

/**
 * A BAR'S GRIP DRAG (2026-11-09, custom toolbars — "persistent grippers"):
 * a press on a bar's grip lifts the whole bar; a ghost of its size follows
 * the pointer; the dock under the pointer shows where the bar would land
 * (between two bars, at a row's end, or an empty dock opened as a zone);
 * the release moves it there. A bar with no vertical form is refused by a
 * side dock, the indicator saying so. Self-cleaning document listeners
 * (attached on the press, removed on the release), as the old gripper's.
 */
export function useToolbarBarDrag({ layout, barFitsVertical, onDrop }: UseToolbarBarDragDeps): UseToolbarBarDragReturn {
  const [draggingBarId, setDraggingBarId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ToolbarDropTarget | null>(null);
  const [ghost, setGhost] = useState<UseToolbarBarDragReturn['ghost']>(null);
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
    setDraggingBarId(barId);
    setGhost({ x: barRect.left, y: barRect.top, width: barRect.width, height: barRect.height });
    let target: ToolbarDropTarget | null = null;
    const home = findBar(layoutRef.current, barId);

    const resolve = (x: number, y: number): ToolbarDropTarget | null => {
      // (jsdom has no elementsFromPoint: the edges below stand in there)
      const stack: Element[] = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
      const under = stack.find((el) => el.closest('[data-toolbar-dock]'))?.closest<HTMLElement>('[data-toolbar-dock]') ?? null;
      let region = under?.getAttribute('data-toolbar-dock') as ToolbarRegion | null;
      if (!region) {
        // No dock under the pointer: the window's edges stand in
        if (y < EDGE_SNAP_PX) region = 'top';
        else if (y > window.innerHeight - EDGE_SNAP_PX) region = 'bottom';
        else if (x < EDGE_SNAP_PX) region = 'left';
        else if (x > window.innerWidth - EDGE_SNAP_PX) region = 'right';
        else return null;
      }
      if (!TOOLBAR_REGIONS.includes(region)) return null;
      const refused = isVerticalRegion(region) && !fits;
      const dockEl = under ?? document.querySelector<HTMLElement>(`[data-toolbar-dock="${region}"]`);
      const bars = layoutRef.current[region];
      let index = bars.length;
      if (dockEl) {
        const vertical = isVerticalRegion(region);
        // The first bar whose middle is past the pointer, on the row the
        // pointer is on (a horizontal dock), is where the bar goes before
        for (let i = 0; i < bars.length; i++) {
          const el = dockEl.querySelector<HTMLElement>(`[data-toolbar-bar="${bars[i].id.replace(/"/g, '')}"]`);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (vertical) {
            if (y < r.top + r.height / 2) { index = i; break; }
          } else {
            const onRow = y >= r.top && y <= r.bottom;
            const rowAbove = y < r.top;
            if (rowAbove || (onRow && x < r.left + r.width / 2)) { index = i; break; }
          }
        }
      }
      return { region, index, refused };
    };

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
      if (!final || final.refused) return;
      if (home && home.region === final.region && (final.index === home.index || final.index === home.index + 1)) return;
      onDropRef.current(barId, final.region, final.index);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return { draggingBarId, dropTarget, ghost, onGripMouseDown };
}
