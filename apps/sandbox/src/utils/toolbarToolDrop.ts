import type { BarPlacement, ToolbarLayout, ToolbarRegion } from '@audacity-ui/components';
import { locateDockSpot, placeAfterLine, placeBefore } from './toolbarDockDrop';

/**
 * WHERE A DRAGGED TOOL WOULD LAND (2026-11-10, custom toolbars — "if I
 * pull a tool adjacent to another toolbar, put a line … to show that a
 * new container will be created", then "I wanted the ability to create
 * new rows"). Three outcomes, told apart by where the pointer is:
 *  - INTO a bar: the pointer is over the bar's tools — the tool joins it,
 *    before the first tool whose middle is past the pointer;
 *  - a NEW bar BESIDE one: the pointer is on a bar's grip, in the gap
 *    before it, past the line's last bar, or in an empty dock — the tool
 *    gets a container of its own there, in that row;
 *  - a NEW bar on a NEW ROW: the pointer is on the line between two rows,
 *    or at a horizontal dock's edge (`locateDockSpot`).
 * A side dock refuses a tool with no vertical form.
 */
export type ToolDropTarget =
  | { kind: 'into'; region: ToolbarRegion; barId: string; beforeToolId: string | null; refused: boolean }
  | { kind: 'new'; region: ToolbarRegion; placement: BarPlacement; lineEndAfter?: string; refused: boolean };

/** The bar's leading strip that means "beside it", not "in it": its grip */
const GRIP_ZONE_PX = 24;
const GRIP_ZONE_VERTICAL_PX = 18;
/** Past a bar's last tool by this much is still that bar's end */
const BAR_END_SLACK_PX = 4;

export function resolveToolDrop(
  x: number,
  y: number,
  layout: ToolbarLayout,
  editorRow: DOMRect | null,
  fitsVertical: boolean,
): ToolDropTarget | null {
  const spot = locateDockSpot(x, y, layout, editorRow);
  if (!spot) return null;
  const { region, vertical } = spot;
  const refused = vertical && !fitsVertical;
  if (spot.newRowAt !== null) return { kind: 'new', region, placement: { region, newRowAt: spot.newRowAt }, refused };
  const barEls = spot.lineEl ? Array.from(spot.lineEl.querySelectorAll<HTMLElement>('[data-toolbar-bar]')) : [];
  if (barEls.length === 0) return { kind: 'new', region, placement: { region, row: spot.row, beforeBarId: null }, refused };

  const pos = vertical ? y : x;
  for (const barEl of barEls) {
    const r = barEl.getBoundingClientRect();
    const start = vertical ? r.top : r.left;
    const end = vertical ? r.bottom : r.right;
    const barId = barEl.getAttribute('data-toolbar-bar') ?? '';
    if (pos < start + (vertical ? GRIP_ZONE_VERTICAL_PX : GRIP_ZONE_PX)) {
      return { kind: 'new', region, placement: placeBefore(layout, region, barId, spot.row), refused };
    }
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
  // Past the line's last bar: a new bar after it, in its row
  return { kind: 'new', region, ...placeAfterLine(layout, region, barEls[barEls.length - 1].getAttribute('data-toolbar-bar') ?? '', spot.row), refused };
}
