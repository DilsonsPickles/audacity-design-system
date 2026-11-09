import { isVerticalRegion, TOOLBAR_REGIONS, type ToolbarLayout, type ToolbarRegion } from '@audacity-ui/components';
import { sideZoneAt } from '../components/editor/DockZoneOverlay';

/**
 * WHERE A DRAGGED TOOL WOULD LAND (2026-11-10, custom toolbars — "if I
 * pull a tool adjacent to another toolbar, put a line … to show that a
 * new container will be created"). Two outcomes, told apart by where the
 * pointer is along the row:
 *  - INTO a bar: the pointer is over the bar's tools — the tool joins it,
 *    before the first tool whose middle is past the pointer;
 *  - a NEW bar: the pointer is BESIDE a bar — on its grip, in the gap
 *    before it, past the row's last bar, or in an empty dock — and the
 *    tool gets a container of its own there.
 * A side dock refuses a tool with no vertical form.
 */
export type ToolDropTarget =
  | { kind: 'into'; region: ToolbarRegion; barId: string; beforeToolId: string | null; refused: boolean }
  | { kind: 'new'; region: ToolbarRegion; beforeBarId: string | null; refused: boolean };

/** The bar's leading strip that means "beside it", not "in it": its grip */
const GRIP_ZONE_PX = 24;
const GRIP_ZONE_VERTICAL_PX = 18;
/** Past a bar's last tool by this much is still that bar's end */
const BAR_END_SLACK_PX = 4;
/** Near the window's top or bottom edge with no dock under the pointer */
const EDGE_SNAP_PX = 72;

export function resolveToolDrop(
  x: number,
  y: number,
  layout: ToolbarLayout,
  editorRow: DOMRect | null,
  fitsVertical: boolean,
): ToolDropTarget | null {
  // (jsdom has no elementsFromPoint: the edges below stand in there)
  const stack: Element[] = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  const under = stack.find((el) => el.closest('[data-toolbar-dock]'))?.closest<HTMLElement>('[data-toolbar-dock]') ?? null;
  let region = under?.getAttribute('data-toolbar-dock') as ToolbarRegion | null;
  if (!region) {
    const side = editorRow ? sideZoneAt(x, y, editorRow) : null;
    if (side) region = side;
    else if (y < EDGE_SNAP_PX) region = 'top';
    else if (y > window.innerHeight - EDGE_SNAP_PX) region = 'bottom';
    else return null;
  }
  if (!TOOLBAR_REGIONS.includes(region)) return null;
  const vertical = isVerticalRegion(region);
  const refused = vertical && !fitsVertical;
  const atEnd: ToolDropTarget = { kind: 'new', region, beforeBarId: null, refused };
  const dockEl = under ?? document.querySelector<HTMLElement>(`[data-toolbar-dock="${region}"]`);
  if (!dockEl) return atEnd;

  // The row the pointer is on (a side dock is one column)
  const rows = Array.from(dockEl.querySelectorAll<HTMLElement>('.toolbar-dock__row'));
  const rowEl = rows.find((r) => {
    const rect = r.getBoundingClientRect();
    return vertical || (y >= rect.top && y <= rect.bottom);
  }) ?? rows[rows.length - 1];
  const barEls = rowEl ? Array.from(rowEl.querySelectorAll<HTMLElement>('[data-toolbar-bar]')) : [];
  if (barEls.length === 0) return atEnd;

  const pos = vertical ? y : x;
  for (const barEl of barEls) {
    const r = barEl.getBoundingClientRect();
    const start = vertical ? r.top : r.left;
    const end = vertical ? r.bottom : r.right;
    const barId = barEl.getAttribute('data-toolbar-bar') ?? '';
    if (pos < start + (vertical ? GRIP_ZONE_VERTICAL_PX : GRIP_ZONE_PX)) return { kind: 'new', region, beforeBarId: barId, refused };
    if (pos <= end + BAR_END_SLACK_PX) {
      let beforeToolId: string | null = null;
      for (const toolEl of Array.from(barEl.querySelectorAll<HTMLElement>('[data-toolbar-tool]'))) {
        const t = toolEl.getBoundingClientRect();
        const mid = vertical ? t.top + t.height / 2 : t.left + t.width / 2;
        if (pos < mid) { beforeToolId = toolEl.getAttribute('data-toolbar-tool'); break; }
      }
      return { kind: 'into', region, barId, beforeToolId, refused };
    }
  }
  // Past the row's last bar: a new bar after it (before whatever the
  // dock holds next, which starts the next row)
  const lastId = barEls[barEls.length - 1].getAttribute('data-toolbar-bar');
  const order = layout[region];
  const next = order[order.findIndex((b) => b.id === lastId) + 1];
  return { kind: 'new', region, beforeBarId: next?.id ?? null, refused };
}
