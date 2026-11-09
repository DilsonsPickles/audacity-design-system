import { describe, it, expect } from 'vitest';
import { defaultToolbarLayout, findBar, moveBar, normaliseLayout, isToolbarLayout, TOOLBAR_REGIONS } from '../toolbarLayout';

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
});
