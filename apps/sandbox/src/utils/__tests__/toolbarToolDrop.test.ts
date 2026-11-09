import { describe, it, expect, afterEach } from 'vitest';
import type { ToolbarLayout } from '@audacity-ui/components';
import { resolveToolDrop } from '../toolbarToolDrop';

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() { return {}; } }) as DOMRect;

let host: HTMLElement | null = null;
afterEach(() => { host?.remove(); host = null; });

/** A dock whose elements report the rects given (jsdom measures nothing) */
function dock(region: string, rows: Array<Array<{ id: string; rect: DOMRect; tools: Array<{ id: string; rect: DOMRect }> }>>, rowRects: DOMRect[]): void {
  host = host ?? document.body.appendChild(document.createElement('div'));
  const dockEl = document.createElement('div');
  dockEl.setAttribute('data-toolbar-dock', region);
  rows.forEach((bars, i) => {
    const row = document.createElement('div');
    row.className = 'toolbar-dock__row';
    row.getBoundingClientRect = () => rowRects[i];
    for (const bar of bars) {
      const barEl = document.createElement('div');
      barEl.setAttribute('data-toolbar-bar', bar.id);
      barEl.getBoundingClientRect = () => bar.rect;
      for (const tool of bar.tools) {
        const toolEl = document.createElement('div');
        toolEl.setAttribute('data-toolbar-tool', tool.id);
        toolEl.getBoundingClientRect = () => tool.rect;
        barEl.appendChild(toolEl);
      }
      row.appendChild(barEl);
    }
    dockEl.appendChild(row);
  });
  host.appendChild(dockEl);
}

// Two rows on top: [a: one two][b: three] / [c: four]
const LAYOUT: ToolbarLayout = {
  top: [{ id: 'a', tools: ['one', 'two'] }, { id: 'b', tools: ['three'] }, { id: 'c', tools: ['four'] }],
  bottom: [], left: [{ id: 'v', tools: ['five', 'six'] }], right: [],
};
function topDock() {
  dock('top', [
    [
      { id: 'a', rect: rect(0, 14, 100, 28), tools: [{ id: 'one', rect: rect(32, 14, 28, 28) }, { id: 'two', rect: rect(68, 14, 28, 28) }] },
      { id: 'b', rect: rect(117, 14, 60, 28), tools: [{ id: 'three', rect: rect(149, 14, 28, 28) }] },
    ],
    [{ id: 'c', rect: rect(0, 71, 60, 28), tools: [{ id: 'four', rect: rect(32, 71, 28, 28) }] }],
  ], [rect(0, 0, 800, 56), rect(0, 57, 800, 56)]);
}

describe('resolveToolDrop — join a bar, or a new container beside one (2026-11-10)', () => {
  it('over a bar\'s tools the tool JOINS it, before the first tool whose middle is past the pointer', () => {
    topDock();
    expect(resolveToolDrop(40, 28, LAYOUT, null, true)).toEqual({ kind: 'into', region: 'top', barId: 'a', beforeToolId: 'one', refused: false });
    expect(resolveToolDrop(60, 28, LAYOUT, null, true)).toEqual({ kind: 'into', region: 'top', barId: 'a', beforeToolId: 'two', refused: false });
    // past the last tool's middle, to the bar's end (and 4px of slack): the end of that bar
    expect(resolveToolDrop(98, 28, LAYOUT, null, true)).toEqual({ kind: 'into', region: 'top', barId: 'a', beforeToolId: null, refused: false });
    expect(resolveToolDrop(104, 28, LAYOUT, null, true)).toMatchObject({ kind: 'into', barId: 'a', beforeToolId: null });
  });

  it('BESIDE a bar — on its grip, or in the gap before it — the tool gets a NEW bar there', () => {
    topDock();
    // the gap between a and b, and b's grip (117..141)
    expect(resolveToolDrop(110, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', beforeBarId: 'b', refused: false });
    expect(resolveToolDrop(130, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', beforeBarId: 'b', refused: false });
    // past the grip, b's own tools
    expect(resolveToolDrop(145, 28, LAYOUT, null, true)).toMatchObject({ kind: 'into', barId: 'b', beforeToolId: 'three' });
    // the first bar's grip: a new bar at the row's start
    expect(resolveToolDrop(10, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', beforeBarId: 'a', refused: false });
  });

  it('past a row\'s last bar the new bar goes after it — before whatever starts the next row, or at the dock\'s end', () => {
    topDock();
    expect(resolveToolDrop(400, 28, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', beforeBarId: 'c', refused: false });
    // the second row (the window's top edge stands in for the dock under the pointer up to 72px)
    expect(resolveToolDrop(400, 70, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', beforeBarId: null, refused: false });
    expect(resolveToolDrop(10, 70, LAYOUT, null, true)).toEqual({ kind: 'new', region: 'top', beforeBarId: 'c', refused: false });
  });

  it('a side dock: its band along the editor row stands in when it is empty; bars stack, so the same rule runs down the column; a tool with no vertical form is refused', () => {
    dock('left', [[{ id: 'v', rect: rect(0, 100, 48, 90), tools: [{ id: 'five', rect: rect(10, 124, 28, 28) }, { id: 'six', rect: rect(10, 160, 28, 28) }] }]], [rect(0, 100, 48, 500)]);
    dock('right', [], []);
    const row = rect(0, 100, 1000, 500);
    // left: on the bar's grip (its top 18px) → a new bar above; among its tools → joins
    expect(resolveToolDrop(20, 110, LAYOUT, row, true)).toEqual({ kind: 'new', region: 'left', beforeBarId: 'v', refused: false });
    expect(resolveToolDrop(20, 150, LAYOUT, row, true)).toEqual({ kind: 'into', region: 'left', barId: 'v', beforeToolId: 'six', refused: false });
    expect(resolveToolDrop(20, 400, LAYOUT, row, true)).toEqual({ kind: 'new', region: 'left', beforeBarId: null, refused: false });
    // right: empty, reached by its band
    expect(resolveToolDrop(980, 300, LAYOUT, row, true)).toEqual({ kind: 'new', region: 'right', beforeBarId: null, refused: false });
    expect(resolveToolDrop(980, 300, LAYOUT, row, false)).toMatchObject({ region: 'right', refused: true });
    // the middle of the editor is nowhere
    expect(resolveToolDrop(500, 300, LAYOUT, row, true)).toBeNull();
  });
});
