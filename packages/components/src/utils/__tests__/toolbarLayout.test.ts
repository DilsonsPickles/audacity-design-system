import { describe, it, expect } from 'vitest';
import {
  coerceToolbarLayout, defaultToolbarLayout, dockBars, findBar, findTool, moveBar, moveTool, moveToolToNewBar, nextBarId,
  normaliseLayout, isToolbarLayout, setBarSize, withCustomiseTool, type ToolbarLayout, type ToolbarRegion,
} from '../toolbarLayout';

/** A dock's rows as lists of bar ids */
const rows = (l: ToolbarLayout, r: ToolbarRegion) => (l[r] ?? []).map((row) => row.map((b) => b.id));

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
    // FEWER, BIGGER BARS (2026-11-10): six on the classic workspace
    expect(dockBars(defaultToolbarLayout('classic'), 'top').map((b) => b.id)).toEqual(['transport', 'tools', 'edit', 'view', 'time', 'meters', 'customise']);
    expect(findBar(defaultToolbarLayout('classic'), 'edit')?.bar.tools).toEqual(['cut', 'copy', 'paste', 'trim', 'silence']);
    expect(findBar(defaultToolbarLayout('classic'), 'time')?.bar.tools).toEqual(['varispeed', 'timecode', 'bpm', 'time-signature', 'snapping']);
    // music has no spectral view
    expect(findBar(defaultToolbarLayout('music'), 'tools')?.bar.tools).toEqual(['automation', 'split']);
  });

  it('moveBar moves a bar within its row, between docks, and before itself is no change', () => {
    const layout = defaultToolbarLayout('classic');
    // to the left dock (no rows yet: a row is made)
    const left = moveBar(layout, 'view', { region: 'left', row: 0, beforeBarId: null });
    expect(rows(left, 'left')).toEqual([['view']]);
    expect(dockBars(left, 'top').map((b) => b.id)).not.toContain('view');
    expect(findBar(left, 'view')).toMatchObject({ region: 'left', row: 0, index: 0 });
    // along the top row: before the transport bar puts it first
    expect(rows(moveBar(layout, 'view', { region: 'top', row: 0, beforeBarId: 'transport' }), 'top')[0][0]).toBe('view');
    // to the row's end
    expect(rows(moveBar(layout, 'transport', { region: 'top', row: 0, beforeBarId: null }), 'top')[0].slice(-1)).toEqual(['transport']);
    // nothing to do: before itself, before the bar that already follows it, an unknown bar
    expect(moveBar(layout, 'view', { region: 'top', row: 0, beforeBarId: 'view' })).toBe(layout);
    expect(moveBar(layout, 'view', { region: 'top', row: 0, beforeBarId: 'time' })).toBe(layout);
    expect(moveBar(layout, 'nope', { region: 'top', row: 0, beforeBarId: null })).toBe(layout);
    // the input is never mutated
    expect(layout.left).toEqual([]);
  });

  it('A NEW ROW: a bar dropped on the line between rows gets a row of its own, and a row lives while it holds a bar', () => {
    const layout = defaultToolbarLayout('classic');
    // a new row at the top dock's end
    const a = moveBar(layout, 'view', { region: 'top', newRowAt: 1 });
    expect(rows(a, 'top')).toHaveLength(2);
    expect(rows(a, 'top')[1]).toEqual(['view']);
    expect(rows(a, 'top')[0]).not.toContain('view');
    // another above everything
    const b = moveBar(a, 'edit', { region: 'top', newRowAt: 0 });
    expect(rows(b, 'top').map((r) => r[0])).toEqual(['edit', 'transport', 'view']);
    // a second bar joins the zoom row
    const c = moveBar(b, 'tools', { region: 'top', row: 2, beforeBarId: null });
    expect(rows(c, 'top')[2]).toEqual(['view', 'tools']);
    // the edit row loses its only bar: the row goes with it
    const d = moveBar(c, 'edit', { region: 'top', row: 1, beforeBarId: null });
    expect(rows(d, 'top')).toHaveLength(2);
    expect(rows(d, 'top')[0].slice(-1)).toEqual(['edit']);
    // a bar alone in its row, dropped on the line above or below that row: no change
    expect(moveBar(a, 'view', { region: 'top', newRowAt: 1 })).toBe(a);
    expect(moveBar(a, 'view', { region: 'top', newRowAt: 2 })).toBe(a);
    // a new row in the bottom dock, above the status bar
    expect(rows(moveBar(layout, 'view', { region: 'bottom', newRowAt: 0 }), 'bottom')).toEqual([['view'], ['status', 'selection']]);
  });

  it('moveTool moves one tool into a bar before another tool or at its end, and drops a bar it empties', () => {
    const layout = defaultToolbarLayout('classic');
    // zoom-in into the transport bar, before Stop
    const a = moveTool(layout, 'zoom-in', 'transport', 'stop');
    expect(findBar(a, 'transport')!.bar.tools).toEqual(['play', 'zoom-in', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
    expect(findBar(a, 'view')!.bar.tools).not.toContain('zoom-in');
    // …at the end
    expect(findBar(moveTool(layout, 'zoom-in', 'transport', null), 'transport')!.bar.tools.slice(-1)).toEqual(['zoom-in']);
    // within its own bar: reorder
    expect(findBar(moveTool(layout, 'loop', 'transport', 'play'), 'transport')!.bar.tools[0]).toBe('loop');
    // a bar that holds one tool: moving it out drops the bar
    const lone = moveTool(layout, 'microphone-levels', 'time', null);
    expect(findBar(lone, 'meters')!.bar.tools).toEqual(['playback-meter']);
    const b = moveTool(lone, 'playback-meter', 'time', null);
    expect(findBar(b, 'meters')).toBeNull();
    expect(findBar(b, 'time')!.bar.tools.slice(-2)).toEqual(['microphone-levels', 'playback-meter']);
    // across docks: the status bar takes a tool
    expect(findTool(moveTool(layout, 'zoom-in', 'status', null), 'zoom-in')!.region).toBe('bottom');
    // nothing to do: before itself, where it already is, an unknown tool or bar
    expect(moveTool(layout, 'play', 'transport', 'play')).toBe(layout);
    expect(moveTool(layout, 'play', 'transport', 'stop')).toBe(layout);
    expect(moveTool(layout, 'nope', 'transport', null)).toBe(layout);
    expect(moveTool(layout, 'play', 'nope', null)).toBe(layout);
    // the input is never mutated
    expect(findBar(layout, 'view')!.bar.tools).toContain('zoom-in');
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
    expect(moveToolToNewBar(a, 'record', { region: 'top', row: 0, beforeBarId: 'bar-1' })).toBe(a);
    expect(moveToolToNewBar(a, 'record', { region: 'top', row: 0, beforeBarId: 'tools' })).toBe(a);
    expect(rows(moveToolToNewBar(a, 'record', { region: 'top', row: 0, beforeBarId: 'transport' }), 'top')[0][0]).toBe('bar-1');
    expect(rows(moveToolToNewBar(a, 'record', { region: 'top', newRowAt: 1 }), 'top')[1]).toEqual(['bar-1']);
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

  it('setBarSize keeps a width for horizontal docks and a height for vertical ones; null clears; a move keeps both (2026-11-10)', () => {
    const layout = defaultToolbarLayout('classic');
    const a = setBarSize(layout, 'edit', 'width', 120.4);
    expect(findBar(a, 'edit')!.bar.width).toBe(120);
    const b = setBarSize(a, 'edit', 'height', 90);
    expect(findBar(b, 'edit')!.bar).toMatchObject({ width: 120, height: 90 });
    // moving it keeps both
    const moved = moveBar(b, 'edit', { region: 'left', row: 0, beforeBarId: null });
    expect(findBar(moved, 'edit')!.bar).toMatchObject({ width: 120, height: 90 });
    // null clears that axis alone
    expect(findBar(setBarSize(b, 'edit', 'width', null), 'edit')!.bar).toEqual({ id: 'edit', tools: ['cut', 'copy', 'paste', 'trim', 'silence'], height: 90 });
    // nothing to do: the same size, clearing what is not set, an unknown bar
    expect(setBarSize(a, 'edit', 'width', 120)).toBe(a);
    expect(setBarSize(layout, 'edit', 'width', null)).toBe(layout);
    expect(setBarSize(layout, 'nope', 'width', 50)).toBe(layout);
    expect(findBar(layout, 'edit')!.bar.width).toBeUndefined();
  });

  it('THE COG IS A TOOL: every seed ends the top row with it as a toolbar of its own; a layout without it gets it back at the top dock\'s end (2026-11-10)', () => {
    for (const ws of ['classic', 'spectral-editing', 'modern', 'music'] as const) {
      expect(defaultToolbarLayout(ws).top[0].slice(-1)).toEqual([{ id: 'customise', tools: ['customise'] }]);
    }
    const layout = defaultToolbarLayout('classic');
    expect(withCustomiseTool(layout)).toBe(layout);
    // moved elsewhere, it stays where it is
    const moved = moveBar(layout, 'customise', { region: 'left', row: 0, beforeBarId: null });
    expect(withCustomiseTool(moved)).toBe(moved);
    // a layout saved before the cog was a tool: appended to the top dock's last row
    const old: ToolbarLayout = { top: [[{ id: 'a', tools: ['play'] }], [{ id: 'b', tools: ['stop'] }]], bottom: [], left: [], right: [] };
    expect(withCustomiseTool(old).top).toEqual([[{ id: 'a', tools: ['play'] }], [{ id: 'b', tools: ['stop'] }, { id: 'customise', tools: ['customise'] }]]);
    // an empty top dock: a row of its own; a bar already named 'customise' (without the tool): a fresh id
    expect(withCustomiseTool({ top: [], bottom: [], left: [], right: [] }).top).toEqual([[{ id: 'customise', tools: ['customise'] }]]);
    const clash: ToolbarLayout = { top: [[{ id: 'customise', tools: ['play'] }]], bottom: [], left: [], right: [] };
    expect(withCustomiseTool(clash).top[0][1]).toEqual({ id: 'bar-1', tools: ['customise'] });
    expect(old.top).toHaveLength(2);
    expect(old.top[1]).toHaveLength(1); // not mutated
  });

  it('THE INNER DOCKS (2026-11-10): optional — a layout saved without them is still a layout and reads them as empty; bars move into them like any dock', () => {
    const saved: ToolbarLayout = { top: [[{ id: 'a', tools: ['play'] }]], bottom: [], left: [], right: [] };
    expect(isToolbarLayout(saved)).toBe(true);
    expect(coerceToolbarLayout(saved)).toBe(saved);
    expect(dockBars(saved, 'right-inner')).toEqual([]);
    const moved = moveBar(saved, 'a', { region: 'right-inner', row: 0, beforeBarId: null });
    expect(moved['right-inner']).toEqual([[{ id: 'a', tools: ['play'] }]]);
    expect(findBar(moved, 'a')).toMatchObject({ region: 'right-inner', row: 0 });
    expect(isToolbarLayout(moved)).toBe(true);
    // a bad inner dock still fails
    expect(isToolbarLayout({ ...saved, 'left-inner': 'x' })).toBe(false);
  });
});
