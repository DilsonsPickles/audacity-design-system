import { findBar, isVerticalRegion, TOOLBAR_REGIONS, type BarPlacement, type ToolbarLayout, type ToolbarRegion } from '@audacity-ui/components';
import { edgeZoneAt, sideZoneAt } from '../components/editor/DockZoneOverlay';

/** Near the window's top or bottom edge with no dock under the pointer,
 *  that edge's dock takes the drop (the old toolbar gripper's snap); the
 *  SIDES are the editor row's bands, `sideZoneAt` */
export const EDGE_SNAP_PX = 72;
/** The strip along a row's top and bottom edge that means "a NEW ROW
 *  here" — inside the row's 14px padding, so never over a control */
export const ROW_EDGE_PX = 12;
/** Just past a horizontal dock's inner edge still means a new row there */
export const ROW_REACH_PX = 24;

/** Where the pointer is among the docks */
export interface DockSpot {
  region: ToolbarRegion;
  vertical: boolean;
  dockEl: HTMLElement | null;
  /** On the line between two rows, or at a dock's edge: a new row would
   *  be made before the row at this index (the row count = after the last) */
  newRowAt: number | null;
  /** The line of bars the pointer is on (a side dock's one column) */
  lineEl: HTMLElement | null;
  /** That line's row in the layout */
  row: number;
}

/** Where a whole bar would land */
export interface BarDropTarget {
  region: ToolbarRegion;
  placement: BarPlacement;
  /** The drop is at a wrapped line's end: the indicator goes after this bar */
  lineEndAfter?: string;
  /** The bar has no vertical form and the dock is a side dock */
  refused: boolean;
}

const rowOf = (el: HTMLElement): number => Number(el.getAttribute('data-toolbar-row') ?? 0) || 0;

/**
 * THE DOCK, AND THE ROW OF IT, UNDER THE POINTER (2026-11-10, "I wanted
 * the ability to create new rows"). The dock is the one under the pointer;
 * failing that a strip just past a horizontal dock's inner edge, then an
 * empty side dock's band along the editor row, then the window's top and
 * bottom edges. In a horizontal dock each drawn line is 56px: its top and
 * bottom `ROW_EDGE_PX`, where two ROWS meet or at the dock's outer edge,
 * mean a NEW ROW there; the rest of the line is that row. (A wrap inside
 * one row is not a row boundary.) jsdom measures nothing, so there the
 * dock's last line stands in.
 */
export function locateDockSpot(x: number, y: number, layout: ToolbarLayout, editorRow: DOMRect | null): DockSpot | null {
  // (jsdom has no elementsFromPoint: the edges below stand in there)
  const stack: Element[] = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  const under = stack.find((el) => el.closest('[data-toolbar-dock]'))?.closest<HTMLElement>('[data-toolbar-dock]') ?? null;
  let region = under?.getAttribute('data-toolbar-dock') as ToolbarRegion | null;
  if (!region) {
    const side = editorRow ? sideZoneAt(x, y, editorRow) : null;
    const edge = editorRow ? edgeZoneAt(x, y, editorRow) : null;
    if (side) region = side;
    else if (edge && layout[edge].length === 0) region = edge;
    else {
      // Just below the top dock, or just above the bottom one: a new row
      // on that dock's inner edge
      for (const r of ['top', 'bottom'] as const) {
        const el = document.querySelector<HTMLElement>(`[data-toolbar-dock="${r}"]`);
        const rect = el?.getBoundingClientRect();
        if (!el || !rect || rect.height <= 0 || x < rect.left || x > rect.right) continue;
        const reached = r === 'top' ? y > rect.bottom && y <= rect.bottom + ROW_REACH_PX : y < rect.top && y >= rect.top - ROW_REACH_PX;
        if (reached) return { region: r, vertical: false, dockEl: el, newRowAt: r === 'top' ? layout.top.length : 0, lineEl: null, row: 0 };
      }
      if (y < EDGE_SNAP_PX) region = 'top';
      else if (y > window.innerHeight - EDGE_SNAP_PX) region = 'bottom';
      else return null;
    }
  }
  if (!TOOLBAR_REGIONS.includes(region)) return null;
  const vertical = isVerticalRegion(region);
  const dockEl = under ?? document.querySelector<HTMLElement>(`[data-toolbar-dock="${region}"]`);
  const lastRow = Math.max(0, layout[region].length - 1);
  const lines = dockEl ? Array.from(dockEl.querySelectorAll<HTMLElement>('.toolbar-dock__row')) : [];
  if (lines.length === 0) return { region, vertical, dockEl, newRowAt: null, lineEl: null, row: lastRow };
  if (vertical) return { region, vertical, dockEl, newRowAt: null, lineEl: lines[0], row: lastRow };

  const rects = lines.map((l) => l.getBoundingClientRect());
  const at = rects.findIndex((r) => r.height > 0 && y >= r.top && y <= r.bottom);
  if (at >= 0) {
    const row = rowOf(lines[at]);
    const first = at === 0 || rowOf(lines[at - 1]) !== row;
    const last = at === lines.length - 1 || rowOf(lines[at + 1]) !== row;
    if (first && y < rects[at].top + ROW_EDGE_PX) return { region, vertical, dockEl, newRowAt: row, lineEl: null, row };
    if (last && y > rects[at].bottom - ROW_EDGE_PX) return { region, vertical, dockEl, newRowAt: row + 1, lineEl: null, row };
    return { region, vertical, dockEl, newRowAt: null, lineEl: lines[at], row };
  }
  // Not on a line (the window's edge stood in, or nothing is measured):
  // the nearest measured line, else the dock's last
  let nearest = lines.length - 1;
  let best = Infinity;
  rects.forEach((r, i) => {
    if (r.height <= 0) return;
    const d = y < r.top ? r.top - y : y - r.bottom;
    if (d < best) { best = d; nearest = i; }
  });
  return { region, vertical, dockEl, newRowAt: null, lineEl: lines[nearest], row: rowOf(lines[nearest]) };
}

/** Before a bar, in the row the LAYOUT has it in */
export function placeBefore(layout: ToolbarLayout, region: ToolbarRegion, barId: string, fallbackRow: number): BarPlacement {
  return { region, row: findBar(layout, barId)?.row ?? fallbackRow, beforeBarId: barId };
}

/** After the last bar of a drawn line: before whatever its row holds next
 *  (which starts the next wrapped line), or at the row's end */
export function placeAfterLine(layout: ToolbarLayout, region: ToolbarRegion, lastBarId: string, fallbackRow: number): { placement: BarPlacement; lineEndAfter?: string } {
  const home = findBar(layout, lastBarId);
  if (!home || home.region !== region) return { placement: { region, row: fallbackRow, beforeBarId: null } };
  const next = layout[region][home.row][home.index + 1];
  return next
    ? { placement: { region, row: home.row, beforeBarId: next.id }, lineEndAfter: lastBarId }
    : { placement: { region, row: home.row, beforeBarId: null } };
}

/**
 * WHERE A WHOLE BAR WOULD LAND (the grip drag): on a new row, or in the
 * line under the pointer before the first bar whose middle is past it —
 * past them all, at the line's end. A side dock refuses a bar with no
 * vertical form.
 */
export function resolveBarDrop(x: number, y: number, layout: ToolbarLayout, editorRow: DOMRect | null, fitsVertical: boolean): BarDropTarget | null {
  const spot = locateDockSpot(x, y, layout, editorRow);
  if (!spot) return null;
  const { region, vertical } = spot;
  const refused = vertical && !fitsVertical;
  if (spot.newRowAt !== null) return { region, placement: { region, newRowAt: spot.newRowAt }, refused };
  const barEls = spot.lineEl ? Array.from(spot.lineEl.querySelectorAll<HTMLElement>('[data-toolbar-bar]')) : [];
  if (barEls.length === 0) return { region, placement: { region, row: spot.row, beforeBarId: null }, refused };
  const pos = vertical ? y : x;
  for (const barEl of barEls) {
    const r = barEl.getBoundingClientRect();
    const mid = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
    if (pos < mid) return { region, placement: placeBefore(layout, region, barEl.getAttribute('data-toolbar-bar') ?? '', spot.row), refused };
  }
  return { region, ...placeAfterLine(layout, region, barEls[barEls.length - 1].getAttribute('data-toolbar-bar') ?? '', spot.row), refused };
}
