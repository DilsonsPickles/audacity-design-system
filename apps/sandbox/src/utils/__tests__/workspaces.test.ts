import { describe, it, expect } from 'vitest';
import { defaultToolbarLayout, type CustomWorkspace } from '@audacity-ui/components';
import { workspaceResetState, sameWorkspaceState } from '../workspaces';

const DEFAULT_HIDDEN = ['bpm', 'time-signature'];

describe('workspaceResetState — RESETTING A WORKSPACE YOU MADE GOES BACK TO HOW YOU MADE IT (2026-11-19)', () => {
  it('a made workspace with a starting state resets to it: layout, hidden tools, tab orientation', () => {
    const layout = defaultToolbarLayout('music');
    const studio: CustomWorkspace = { id: 'custom-studio', name: 'Studio', base: 'classic', start: { layout, hidden: ['mixer-button'], tabsVertical: true } };
    const r = workspaceResetState({ customWorkspaces: [studio] }, 'custom-studio', DEFAULT_HIDDEN);
    expect(r.layout).toBe(layout);
    expect(r.hidden).toEqual(['mixer-button']);
    expect(r.tabsVertical).toBe(true);
  });

  it('a built-in resets to its seed (no layout to store) and the default hidden tools', () => {
    const r = workspaceResetState({ customWorkspaces: [] }, 'classic', DEFAULT_HIDDEN);
    expect(r).toEqual({ layout: null, hidden: DEFAULT_HIDDEN, tabsVertical: false });
  });

  it('a made workspace from before starting states were kept resets to its base seed, as it always did', () => {
    const old: CustomWorkspace = { id: 'custom-old', name: 'Old', base: 'classic' };
    const r = workspaceResetState({ customWorkspaces: [old] }, 'custom-old', DEFAULT_HIDDEN);
    expect(r.layout).toBeNull();
    expect(r.hidden).toEqual(DEFAULT_HIDDEN);
  });

  it('the hidden list handed back is a copy, never the stored one', () => {
    const hidden = ['mixer-button'];
    const ws: CustomWorkspace = { id: 'w', name: 'W', base: 'classic', start: { layout: defaultToolbarLayout('classic'), hidden } };
    expect(workspaceResetState({ customWorkspaces: [ws] }, 'w', DEFAULT_HIDDEN).hidden).not.toBe(hidden);
  });
});

describe('sameWorkspaceState — SAVE CHANGES TO WORKSPACE (2026-11-19)', () => {
  const layout = defaultToolbarLayout('classic');
  const base = { layout, hidden: ['a', 'b'], tabsVertical: false };

  it('equal states match, the hidden tools as a set and the layout whatever its key order', () => {
    const reordered = JSON.parse(JSON.stringify(layout, (_k, v) =>
      v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v));
    expect(sameWorkspaceState(base, { layout: reordered, hidden: ['b', 'a', 'a'], tabsVertical: false })).toBe(true);
  });

  it('a moved tool, a hidden tool or the tab orientation is a change', () => {
    const moved = { ...layout, top: layout.top.slice().reverse() };
    expect(sameWorkspaceState(base, { ...base, layout: moved })).toBe(layout.top.length < 2);
    expect(sameWorkspaceState(base, { ...base, hidden: ['a'] })).toBe(false);
    expect(sameWorkspaceState(base, { ...base, tabsVertical: true })).toBe(false);
  });
});
