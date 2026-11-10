import { describe, it, expect } from 'vitest';
import {
  coerceToolbarLayout, defaultToolbarLayout, dockBars, findBar, findTool, moveBar, moveTool, moveToolToNewBar, nextBarId,
  normaliseLayout, isToolbarLayout, type ToolbarLayout, type ToolbarRegion,
} from '../toolbarLayout';

/** A dock's rows as lists of bar ids */
const rows = (l: ToolbarLayout, r: ToolbarRegion) => l[r].map((row) => row.map((b) => b.id));

describe('toolbarLayout — the custom toolbars model (2026-11-09; rows 2026-11-10)', () => {
  it('every workspace seeds ONE row on top, transport first, and the status bar as the bottom dock\'s row', () => {
    for (const ws of ['classic', 'spectral-editing', 'modern', 'music'] as const) {
      const layout = defaultToolbarLayout(ws);
      expect(layout.top).toHaveLength(1);
      expect(layout.top[0][0].id).toBe('transport');
      expect(layout.top[0][0].tools).toEqual(['play', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
      expect(rows(layout, 'bottom')).toEqual([['status', 'selection']]);
      expect(layout.left).toEqual([]);
      expect(layout.right).toEqual([]);
      expect(isToolbarLayout(layout)).toBe(true);
    }
    // the classic workspace has the full edit set; music has no spectral view
    expect(dockBars(defaultToolbarLayout('classic'), 'top').map((b) => b.id)).toContain('edit');
    expect(findBar(defaultToolbarLayout('music'), 'tools')?.bar.tools).toEqual(['automation', 'split']);
  });

  it('moveBar moves a bar within its row, between docks, and before itself is no change', () => {
    const layout = defaultToolbarLayout('classic');
    // to the left dock (no rows yet: a row is made)
    const left = moveBar(layout, 'zoom', { region: 'left', row: 0, beforeBarId: null });
    expect(rows(left, 'left')).toEqual([['zoom']]);
    expect(dockBars(left, 'top').map((b) => b.id)).not.toContain('zoom');
    expect(findBar(left, 'zoom')).toMatchObject({ region: 'left', row: 0, index: 0 });
    // along the top row: before the transport bar puts it first
    expect(rows(moveBar(layout, 'zoom', { region: 'top', row: 0, beforeBarId: 'transport' }), 'top')[0][0]).toBe('zoom');
    // to the row's end
    expect(rows(moveBar(layout, 'transport', { region: 'top', row: 0, beforeBarId: null }), 'top')[0].slice(-1)).toEqual(['transport']);
    // nothing to do: before itself, before the bar that already follows it, an unknown bar
    expect(moveBar(layout, 'zoom', { region: 'top', row: 0, beforeBarId: 'zoom' })).toBe(layout);
    expect(moveBar(layout, 'zoom', { region: 'top', row: 0, beforeBarId: 'track-height' })).toBe(layout);
    expect(moveBar(layout, 'nope', { region: 'top', row: 0, beforeBarId: null })).toBe(layout);
    // the input is never mutated
    expect(layout.left).toEqual([]);
  });

  it('A NEW ROW: a bar dropped on the line between rows gets a row of its own, and a row lives while it holds a bar', () => {
    const layout = defaultToolbarLayout('classic');
    // a new row at the top dock's end
    const a = moveBar(layout, 'zoom', { region: 'top', newRowAt: 1 });
    expect(rows(a, 'top')).toHaveLength(2);
    expect(rows(a, 'top')[1]).toEqual(['zoom']);
    expect(rows(a, 'top')[0]).not.toContain('zoom');
    // another above everything
    const b = moveBar(a, 'edit', { region: 'top', newRowAt: 0 });
    expect(rows(b, 'top').map((r) => r[0])).toEqual(['edit', 'transport', 'zoom']);
    // a second bar joins the zoom row
    const c = moveBar(b, 'tools', { region: 'top', row: 2, beforeBarId: null });
    expect(rows(c, 'top')[2]).toEqual(['zoom', 'tools']);
    // the edit row loses its only bar: the row goes with it
    const d = moveBar(c, 'edit', { region: 'top', row: 1, beforeBarId: null });
    expect(rows(d, 'top')).toHaveLength(2);
    expect(rows(d, 'top')[0].slice(-1)).toEqual(['edit']);
    // a bar alone in its row, dropped on the line above or below that row: no change
    expect(moveBar(a, 'zoom', { region: 'top', newRowAt: 1 })).toBe(a);
    expect(moveBar(a, 'zoom', { region: 'top', newRowAt: 2 })).toBe(a);
    // a new row in the bottom dock, above the status bar
    expect(rows(moveBar(layout, 'zoom', { region: 'bottom', newRowAt: 0 }), 'bottom')).toEqual([['zoom'], ['status', 'selection']]);
  });

  it('moveTool moves one tool into a bar before another tool or at its end, and drops a bar it empties', () => {
    const layout = defaultToolbarLayout('classic');
    // zoom-in into the transport bar, before Stop
    const a = moveTool(layout, 'zoom-in', 'transport', 'stop');
    expect(findBar(a, 'transport')!.bar.tools).toEqual(['play', 'zoom-in', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
    expect(findBar(a, 'zoom')!.bar.tools).not.toContain('zoom-in');
    // …at the end
    expect(findBar(moveTool(layout, 'zoom-in', 'transport', null), 'transport')!.bar.tools.slice(-1)).toEqual(['zoom-in']);
    // within its own bar: reorder
    expect(findBar(moveTool(layout, 'loop', 'transport', 'play'), 'transport')!.bar.tools[0]).toBe('loop');
    // the speed bar holds one tool: moving it out drops the bar
    const b = moveTool(layout, 'varispeed', 'time', null);
    expect(findBar(b, 'speed')).toBeNull();
    expect(findBar(b, 'time')!.bar.tools).toContain('varispeed');
    // across docks: the status bar takes a tool
    expect(findTool(moveTool(layout, 'zoom-in', 'status', null), 'zoom-in')!.region).toBe('bottom');
    // nothing to do: before itself, where it already is, an unknown tool or bar
    expect(moveTool(layout, 'play', 'transport', 'play')).toBe(layout);
    expect(moveTool(layout, 'play', 'transport', 'stop')).toBe(layout);
    expect(moveTool(layout, 'nope', 'transport', null)).toBe(layout);
    expect(moveTool(layout, 'play', 'nope', null)).toBe(layout);
    // the input is never mutated
    expect(findBar(layout, 'zoom')!.bar.tools).toContain('zoom-in');
  });

  it('moveToolToNewBar pulls one tool into a new bar of its own — beside a bar, or on a NEW ROW', () => {
    const layout = defaultToolbarLayout('classic');
    expect(nextBarId(layout)).toBe('bar-1');
    // Record into its own bar, before the tools bar
    const a = moveToolToNewBar(layout, 'record', { region: 'top', row: 0, beforeBarId: 'tools' });
    expect(rows(a, 'top')[0].slice(0, 3)).toEqual(['transport', 'bar-1', 'tools']);
    expect(findBar(a, 'bar-1')!.bar.tools).toEqual(['record']);
    expect(findBar(a, 'transport')!.bar.tools).not.toContain('record');
    // a second one, on a row of its own under the first
    const b = moveToolToNewBar(a, 'loop', { region: 'top', newRowAt: 1 });
    expect(rows(b, 'top')[1]).toEqual(['bar-2']);
    expect(findBar(b, 'bar-2')!.bar.tools).toEqual(['loop']);
    // into an empty side dock
    const c = moveToolToNewBar(layout, 'zoom-in', { region: 'left', row: 0, beforeBarId: null });
    expect(c.left).toEqual([[{ id: 'bar-1', tools: ['zoom-in'] }]]);
    // a tool already alone keeps its bar: beside itself is no change, elsewhere it is a move of that bar
    expect(moveToolToNewBar(layout, 'varispeed', { region: 'top', row: 0, beforeBarId: 'speed' })).toBe(layout);
    expect(moveToolToNewBar(layout, 'varispeed', { region: 'top', row: 0, beforeBarId: 'time' })).toBe(layout);
    expect(rows(moveToolToNewBar(layout, 'varispeed', { region: 'top', row: 0, beforeBarId: 'transport' }), 'top')[0][0]).toBe('speed');
    expect(rows(moveToolToNewBar(layout, 'varispeed', { region: 'top', newRowAt: 1 }), 'top')[1]).toEqual(['speed']);
    expect(moveToolToNewBar(layout, 'nope', { region: 'top', row: 0, beforeBarId: null })).toBe(layout);
  });

  it('normaliseLayout drops bars with no tools and rows with no bars; a flat stored layout becomes one row; the wrong shape is refused', () => {
    const layout = defaultToolbarLayout('classic');
    layout.top[0].push({ id: 'empty', tools: [] });
    layout.top.push([{ id: 'empty-2', tools: [] }]);
    const clean = normaliseLayout(layout);
    expect(findBar(clean, 'empty')).toBeNull();
    expect(clean.top).toHaveLength(1);
    // the first cut stored each dock as a flat list of bars
    const flat = { top: [{ id: 'a', tools: ['play'] }, { id: 'b', tools: ['stop'] }], bottom: [], left: [], right: [{ id: 'c', tools: ['loop'] }] };
    expect(isToolbarLayout(flat)).toBe(false);
    expect(coerceToolbarLayout(flat)).toEqual({ top: [[{ id: 'a', tools: ['play'] }, { id: 'b', tools: ['stop'] }]], bottom: [], left: [], right: [[{ id: 'c', tools: ['loop'] }]] });
    expect(coerceToolbarLayout(clean)).toBe(clean);
    expect(coerceToolbarLayout({ top: [], bottom: [] })).toBeNull();
    expect(coerceToolbarLayout({ top: [{ id: 1 }], bottom: [], left: [], right: [] })).toBeNull();
    expect(coerceToolbarLayout(null)).toBeNull();
  });
});
