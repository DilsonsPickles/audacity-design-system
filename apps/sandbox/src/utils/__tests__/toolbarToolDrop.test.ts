import { describe, it, expect, afterEach } from 'vitest';
import type { ToolbarLayout } from '@audacity-ui/components';
import { resolveToolDrop } from '../toolbarToolDrop';
import { resolveBarDrop } from '../toolbarDockDrop';

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() { return {}; } }) as DOMRect;

interface BarSpec { id: string; rect: DOMRect; tools: Array<{ id: string; rect: DOMRect }> }
interface LineSpec { row: number; rect: DOMRect; bars: BarSpec[] }

let host: HTMLElement | null = null;
let docks: Array<{ el: HTMLElement; rect: DOMRect }> = [];
const doc = document as Document & { elementsFromPoint?: (x: number, y: number) => Element[] };
afterEach(() => {
  host?.remove();
  host = null;
  docks = [];
  delete doc.elementsFromPoint;
});

/** A dock whose elements report the rects given (jsdom measures nothing),
 *  found under the pointer as a browser's elementsFromPoint would */
function dock(region: string, dockRect: DOMRect, lines: LineSpec[]): void {
  host = host ?? document.body.appendChild(document.createElement('div'));
  const dockEl = document.createElement('div');
  dockEl.setAttribute('data-toolbar-dock', region);
  dockEl.getBoundingClientRect = () => dockRect;
  for (const line of lines) {
    const lineEl = document.createElement('div');
    lineEl.className = 'toolbar-dock__row';
    lineEl.setAttribute('data-toolbar-row', String(line.row));
    lineEl.getBoundingClientRect = () => line.rect;
    for (const bar of line.bars) {
      const barEl = document.createElement('div');
      barEl.setAttribute('data-toolbar-bar', bar.id);
      barEl.getBoundingClientRect = () => bar.rect;
      for (const tool of bar.tools) {
        const toolEl = document.createElement('div');
        toolEl.setAttribute('data-toolbar-tool', tool.id);
        toolEl.getBoundingClientRect = () => tool.rect;
        barEl.appendChild(toolEl);
      }
      lineEl.appendChild(barEl);
    }
    dockEl.appendChild(lineEl);
  }
  host.appendChild(dockEl);
  docks.push({ el: dockEl, rect: dockRect });
  doc.elementsFromPoint = (x, y) => docks
    .filter((d) => d.rect.width > 0 && x >= d.rect.left && x <= d.rect.right && y >= d.rect.top && y <= d.rect.bottom)
    .map((d) => d.el);
}

// The top dock: ROW 0 is [a: one two][b: three][c: four] and WRAPS — c is
// on a second line; ROW 1 is [d: five]. Three drawn lines of 56px.
const LAYOUT: ToolbarLayout = {
  top: [
    [{ id: 'a', tools: ['one', 'two'] }, { id: 'b', tools: ['three'] }, { id: 'c', tools: ['four'] }],
    [{ id: 'd', tools: ['five'] }],
  ],
  bottom: [], left: [[{ id: 'v', tools: ['six', 'seven'] }]], right: [],
};
function topDock() {
  dock('top', rect(0, 0, 800, 170), [
    { row: 0, rect: rect(0, 0, 800, 56), bars: [
      { id: 'a', rect: rect(0, 14, 100, 28), tools: [{ id: 'one', rect: rect(32, 14, 28, 28) }, { id: 'two', rect: rect(68, 14, 28, 28) }] },
      { id: 'b', rect: rect(117, 14, 60, 28), tools: [{ id: 'three', rect: rect(149, 14, 28, 28) }] },
    ] },
    { row: 0, rect: rect(0, 57, 800, 56), bars: [
      { id: 'c', rect: rect(0, 71, 60, 28), tools: [{ id: 'four', rect: rect(32, 71, 28, 28) }] },
    ] },
    { row: 1, rect: rect(0, 114, 800, 56), bars: [
      { id: 'd', rect: rect(0, 128, 60, 28), tools: [{ id: 'five', rect: rect(32, 128, 28, 28) }] },
    ] },
  ]);
}

describe('resolveToolDrop — join a bar, a new container beside one, or a new row (2026-11-10)', () => {
  it('over a bar\'s tools the tool JOINS it, before the first tool whose middle is past the pointer', () => {
    topDock();
    expect(resolveToolDrop(40, 28, LAYOUT, null, true)).toEqual({ kind: 'into', region: 'top', barId: 'a', beforeToolId: 'one', refused: false });
    expect(resolveToolDrop(60, 28, LAYOUT, null, true)).toEqual({ kind: 'into', region: 'top', barId: 'a', beforeToolId: 'two', refused: false });
    // past the last tool's middle, to the bar's end (and 4px of slack): the end of that bar
    expect(resolveToolDrop(98, 28, LAYOUT, null, true)).toEqual({ kind: 'into', region: 'top', barId: 'a', beforeToolId: null, refused: false });
    expect(resolveToolDrop(104, 28, LAYOUT, null, true)).toMatchObject({ kind: 'into', barId: 'a', beforeToolId: null });
  });

  it('BESIDE a bar — on its grip, or in the gap before it — the tool gets a NEW bar there, in that bar\'s row', () => {
    topDock();
    // the gap between a and b, and b's grip (117..141)
    expect(resolveToolDrop(110, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', placement: { region: 'top', row: 0, beforeBarId: 'b' }, refused: false });
    expect(resolveToolDrop(130, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', placement: { region: 'top', row: 0, beforeBarId: 'b' }, refused: false });
    // past the grip, b's own tools
    expect(resolveToolDrop(145, 28, LAYOUT, null, true)).toMatchObject({ kind: 'into', barId: 'b', beforeToolId: 'three' });
    // the first bar's grip: a new bar at the row's start
    expect(resolveToolDrop(10, 28, LAYOUT, null, true)).toMatchObject({ kind: 'new', placement: { row: 0, beforeBarId: 'a' } });
    // the second row's bar
    expect(resolveToolDrop(10, 142, LAYOUT, null, true)).toMatchObject({ kind: 'new', placement: { row: 1, beforeBarId: 'd' } });
  });

  it('past a line\'s last bar the new bar goes after it: before the bar that starts the row\'s next line (the line drawn at this one\'s end), or at the row\'s end', () => {
    topDock();
    expect(resolveToolDrop(400, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', placement: { region: 'top', row: 0, beforeBarId: 'c' }, lineEndAfter: 'b', refused: false });
    // the wrapped line: still row 0, and its end is the row's end
    expect(resolveToolDrop(400, 85, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', placement: { region: 'top', row: 0, beforeBarId: null }, refused: false });
    expect(resolveToolDrop(10, 85, LAYOUT, null, true)).toMatchObject({ kind: 'new', placement: { row: 0, beforeBarId: 'c' } });
    expect(resolveToolDrop(400, 142, LAYOUT, null, true)).toMatchObject({ kind: 'new', placement: { row: 1, beforeBarId: null } });
  });

  it('A NEW ROW: the top and bottom 12px of a line, where two ROWS meet or at the dock\'s edge — never at a wrap inside one row', () => {
    topDock();
    const newRow = (at: number) => ({ kind: 'new', region: 'top', placement: { region: 'top', newRowAt: at }, refused: false });
    // the dock's top edge: above everything
    expect(resolveToolDrop(40, 5, LAYOUT, null, true)).toEqual(newRow(0));
    // the wrap between line 1 and line 2 is INSIDE row 0: not a row boundary
    expect(resolveToolDrop(40, 54, LAYOUT, null, true)).toMatchObject({ kind: 'into', barId: 'a' });
    expect(resolveToolDrop(40, 59, LAYOUT, null, true)).toMatchObject({ kind: 'into', barId: 'c' });
    // where row 0 meets row 1: either side of the line is "between them"
    expect(resolveToolDrop(40, 110, LAYOUT, null, true)).toEqual(newRow(1));
    expect(resolveToolDrop(40, 118, LAYOUT, null, true)).toEqual(newRow(1));
    // the dock's bottom edge, and the strip just below it: after the last row
    expect(resolveToolDrop(40, 165, LAYOUT, null, true)).toEqual(newRow(2));
    expect(resolveToolDrop(40, 185, LAYOUT, null, true)).toEqual(newRow(2));
    // further below is nowhere
    expect(resolveToolDrop(40, 300, LAYOUT, null, true)).toBeNull();
  });

  it('a side dock: its band along the editor row stands in when it is empty; bars stack, so the same rule runs down the column; a tool with no vertical form is refused', () => {
    dock('left', rect(0, 100, 48, 500), [
      { row: 0, rect: rect(0, 100, 48, 500), bars: [{ id: 'v', rect: rect(0, 100, 48, 90), tools: [{ id: 'six', rect: rect(10, 124, 28, 28) }, { id: 'seven', rect: rect(10, 160, 28, 28) }] }] },
    ]);
    dock('right', rect(1000, 100, 0, 500), []);
    const row = rect(0, 100, 1000, 500);
    // left: on the bar's grip (its top 18px) → a new bar above; among its tools → joins; below → the column's end
    expect(resolveToolDrop(20, 110, LAYOUT, row, true)).toEqual({ kind: 'new', region: 'left', placement: { region: 'left', row: 0, beforeBarId: 'v' }, refused: false });
    expect(resolveToolDrop(20, 150, LAYOUT, row, true)).toEqual({ kind: 'into', region: 'left', barId: 'v', beforeToolId: 'seven', refused: false });
    expect(resolveToolDrop(20, 400, LAYOUT, row, true)).toEqual({ kind: 'new', region: 'left', placement: { region: 'left', row: 0, beforeBarId: null }, refused: false });
    // no new-row zone in a column: the dock's very top is just the first bar's grip
    expect(resolveToolDrop(20, 101, LAYOUT, row, true)).toMatchObject({ placement: { row: 0, beforeBarId: 'v' } });
    // right: empty, reached by its band
    expect(resolveToolDrop(980, 300, LAYOUT, row, true)).toEqual({ kind: 'new', region: 'right', placement: { region: 'right', row: 0, beforeBarId: null }, refused: false });
    expect(resolveToolDrop(980, 300, LAYOUT, row, false)).toMatchObject({ region: 'right', refused: true });
    // the middle of the editor is nowhere
    expect(resolveToolDrop(500, 300, LAYOUT, row, true)).toBeNull();
  });
});

describe('resolveBarDrop — where a whole bar lands (the grip drag)', () => {
  it('in a line: before the first bar whose middle is past the pointer, else at the line\'s end', () => {
    topDock();
    expect(resolveBarDrop(40, 28, LAYOUT, null, true)).toEqual({ region: 'top', placement: { region: 'top', row: 0, beforeBarId: 'a' }, refused: false });
    expect(resolveBarDrop(60, 28, LAYOUT, null, true)).toEqual({ region: 'top', placement: { region: 'top', row: 0, beforeBarId: 'b' }, refused: false });
    // past b's middle: the line's end, which is before c in the row
    expect(resolveBarDrop(160, 28, LAYOUT, null, true)).toEqual({ region: 'top', placement: { region: 'top', row: 0, beforeBarId: 'c' }, lineEndAfter: 'b', refused: false });
    expect(resolveBarDrop(400, 142, LAYOUT, null, true)).toEqual({ region: 'top', placement: { region: 'top', row: 1, beforeBarId: null }, refused: false });
  });

  it('on the line between rows, at the dock\'s edges and just past its inner edge: a NEW ROW', () => {
    topDock();
    dock('bottom', rect(0, 700, 800, 56), [
      { row: 0, rect: rect(0, 700, 800, 56), bars: [{ id: 's', rect: rect(0, 714, 200, 28), tools: [] }] },
    ]);
    const layout: ToolbarLayout = { ...LAYOUT, bottom: [[{ id: 's', tools: ['status-cue'] }]] };
    expect(resolveBarDrop(300, 4, layout, null, true)).toEqual({ region: 'top', placement: { region: 'top', newRowAt: 0 }, refused: false });
    expect(resolveBarDrop(300, 112, layout, null, true)).toMatchObject({ placement: { newRowAt: 1 } });
    expect(resolveBarDrop(300, 168, layout, null, true)).toMatchObject({ placement: { newRowAt: 2 } });
    expect(resolveBarDrop(300, 190, layout, null, true)).toMatchObject({ region: 'top', placement: { newRowAt: 2 } });
    // the bottom dock: above the status bar (its top edge, and the strip just above it), and under it
    expect(resolveBarDrop(300, 690, layout, null, true)).toEqual({ region: 'bottom', placement: { region: 'bottom', newRowAt: 0 }, refused: false });
    expect(resolveBarDrop(300, 705, layout, null, true)).toMatchObject({ region: 'bottom', placement: { newRowAt: 0 } });
    expect(resolveBarDrop(300, 750, layout, null, true)).toMatchObject({ region: 'bottom', placement: { newRowAt: 1 } });
    // its middle: the row itself
    expect(resolveBarDrop(300, 728, layout, null, true)).toMatchObject({ region: 'bottom', placement: { row: 0, beforeBarId: null } });
  });

  it('a side dock refuses a bar with no vertical form; nothing measured (jsdom) falls back to the window\'s edges and the dock\'s last row', () => {
    const row = rect(0, 100, 1000, 500);
    expect(resolveBarDrop(980, 300, LAYOUT, row, false)).toEqual({ region: 'right', placement: { region: 'right', row: 0, beforeBarId: null }, refused: true });
    // no docks in the document at all: the top edge is the top dock's last row, the bottom edge an empty dock's first
    expect(resolveBarDrop(300, 10, LAYOUT, null, true)).toEqual({ region: 'top', placement: { region: 'top', row: 1, beforeBarId: null }, refused: false });
    expect(resolveBarDrop(300, window.innerHeight - 10, LAYOUT, null, true)).toEqual({ region: 'bottom', placement: { region: 'bottom', row: 0, beforeBarId: null }, refused: false });
  });

  it('an EMPTY top or bottom dock is 0px: its band along the editor row\'s edge, between the side bands, takes the drop (2026-11-10)', () => {
    const row = rect(0, 100, 1000, 600);
    const empty: ToolbarLayout = { top: [], bottom: [], left: [], right: [] };
    // the editor row's bottom strip, away from the sides
    expect(resolveBarDrop(500, 680, empty, row, true)).toEqual({ region: 'bottom', placement: { region: 'bottom', row: 0, beforeBarId: null }, refused: false });
    // its top strip
    expect(resolveBarDrop(500, 120, empty, row, true)).toEqual({ region: 'top', placement: { region: 'top', row: 0, beforeBarId: null }, refused: false });
    // the corners belong to the side bands
    expect(resolveBarDrop(40, 680, empty, row, true)).toMatchObject({ region: 'left' });
    // a dock that has bars is not reached by its band (it is a dock of its own, with its reach strip)
    expect(resolveBarDrop(500, 680, { ...empty, bottom: [[{ id: 's', tools: ['status-cue'] }]] }, row, true)).toBeNull();
  });
});
