import { describe, it, expect } from 'vitest';
import { defaultToolbarLayout, findBar, findTool, moveBar, moveTool, moveToolToNewBar, nextBarId, normaliseLayout, isToolbarLayout, TOOLBAR_REGIONS } from '../toolbarLayout';

describe('toolbarLayout — the custom toolbars model (2026-11-09)', () => {
  it('every workspace seeds a transport bar first on top, and the status bar as the bottom dock', () => {
    for (const ws of ['classic', 'spectral-editing', 'modern', 'music'] as const) {
      const layout = defaultToolbarLayout(ws);
      expect(layout.top[0].id).toBe('transport');
      expect(layout.top[0].tools).toEqual(['play', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
      expect(layout.bottom.map((b) => b.id)).toEqual(['status', 'selection']);
      expect(layout.left).toEqual([]);
      expect(layout.right).toEqual([]);
      expect(isToolbarLayout(layout)).toBe(true);
    }
    // the classic workspace has the full edit set; music has no spectral view
    expect(defaultToolbarLayout('classic').top.map((b) => b.id)).toContain('edit');
    expect(defaultToolbarLayout('music').top.find((b) => b.id === 'tools')?.tools).toEqual(['automation', 'split']);
  });

  it('moveBar moves a bar between docks and along a row, counting the slot before the bar is taken out', () => {
    const layout = defaultToolbarLayout('classic');
    const ids = (l: typeof layout, r: (typeof TOOLBAR_REGIONS)[number]) => l[r].map((b) => b.id);
    // to the left dock
    const left = moveBar(layout, 'zoom', 'left', 0);
    expect(ids(left, 'left')).toEqual(['zoom']);
    expect(ids(left, 'top')).not.toContain('zoom');
    expect(findBar(left, 'zoom')).toMatchObject({ region: 'left', index: 0 });
    // along the top row: slot 0 puts it first
    const first = moveBar(layout, 'zoom', 'top', 0);
    expect(ids(first, 'top')[0]).toBe('zoom');
    // a slot after itself lands where the pointer said (after 'edit')
    const editIndex = layout.top.findIndex((b) => b.id === 'edit');
    const after = moveBar(layout, 'transport', 'top', editIndex + 1);
    expect(ids(after, 'top')[editIndex]).toBe('transport');
    // the same slot is no change
    expect(moveBar(layout, 'zoom', 'top', 2)).toBe(layout);
    // an unknown bar is no change; the input is never mutated
    expect(moveBar(layout, 'nope', 'top', 0)).toBe(layout);
    expect(ids(layout, 'left')).toEqual([]);
  });

  it('normaliseLayout drops bars with no tools; isToolbarLayout refuses the wrong shape', () => {
    const layout = defaultToolbarLayout('classic');
    layout.top.push({ id: 'empty', tools: [] });
    expect(normaliseLayout(layout).top.find((b) => b.id === 'empty')).toBeUndefined();
    expect(isToolbarLayout({ top: [], bottom: [] })).toBe(false);
    expect(isToolbarLayout({ top: [{ id: 1 }], bottom: [], left: [], right: [] })).toBe(false);
    expect(isToolbarLayout(null)).toBe(false);
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

  it('moveToolToNewBar pulls one tool into a new bar of its own, before a bar or at the dock\'s end', () => {
    const layout = defaultToolbarLayout('classic');
    const ids = (l: typeof layout, r: (typeof TOOLBAR_REGIONS)[number]) => l[r].map((b) => b.id);
    expect(nextBarId(layout)).toBe('bar-1');
    // Record into its own bar, before the tools bar
    const a = moveToolToNewBar(layout, 'record', 'top', 'tools');
    expect(ids(a, 'top').slice(0, 3)).toEqual(['transport', 'bar-1', 'tools']);
    expect(findBar(a, 'bar-1')!.bar.tools).toEqual(['record']);
    expect(findBar(a, 'transport')!.bar.tools).not.toContain('record');
    // a second one gets the next id
    const b = moveToolToNewBar(a, 'loop', 'top', null);
    expect(ids(b, 'top').slice(-1)).toEqual(['bar-2']);
    // into an empty side dock
    const c = moveToolToNewBar(layout, 'zoom-in', 'left', null);
    expect(c.left).toEqual([{ id: 'bar-1', tools: ['zoom-in'] }]);
    // a tool already alone keeps its bar: beside itself is no change, elsewhere it is a move of that bar
    expect(moveToolToNewBar(layout, 'varispeed', 'top', 'speed')).toBe(layout);
    expect(moveToolToNewBar(layout, 'varispeed', 'top', 'time')).toBe(layout);
    const d = moveToolToNewBar(layout, 'varispeed', 'top', 'transport');
    expect(ids(d, 'top')[0]).toBe('speed');
    expect(moveToolToNewBar(layout, 'nope', 'top', null)).toBe(layout);
  });
});
