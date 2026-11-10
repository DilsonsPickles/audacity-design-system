import { describe, it, expect } from 'vitest';
import { activeDrawerTab, drawerDropAt, DEFAULT_DRAWER_GROUPS, drawerMoveTargets, moveDrawerTab, reorderDrawerGroup, visibleDrawerGroups, type DrawerGroup } from '../drawerGroups';
import type { DrawerTabId } from '../../components/editor/EditorBottomDrawer';

const ids = (gs: DrawerGroup[]) => gs.map((g) => g.tabs);
const open = (...t: DrawerTabId[]) => new Set<DrawerTabId>(t);

describe('drawerGroups — the bottom drawer as a row of panels (2026-11-10)', () => {
  it('one group to start; the visible groups are those with an open tab, with only their open tabs', () => {
    expect(ids(visibleDrawerGroups(DEFAULT_DRAWER_GROUPS, open('mixer', 'effects')))).toEqual([['mixer', 'effects']]);
    expect(visibleDrawerGroups(DEFAULT_DRAWER_GROUPS, open())).toEqual([]);
  });

  it('a group\'s active tab is its most recently activated open tab, else its first', () => {
    expect(activeDrawerTab(['mixer', 'effects'], {})).toBe('mixer');
    expect(activeDrawerTab(['mixer', 'effects'], { mixer: 1, effects: 2 })).toBe('effects');
    expect(activeDrawerTab(['mixer'], { effects: 9 })).toBe('mixer');
  });

  it('moveDrawerTab: into a new group beside, into another group, and the emptied group goes', () => {
    // Effects to a panel of its own at the right
    const a = moveDrawerTab(DEFAULT_DRAWER_GROUPS, 'effects', { newGroupBefore: null });
    expect(ids(a)).toEqual([['mixer', 'piano-roll', 'macros', 'clip-properties'], ['effects']]);
    expect(a[1].id).toBe('g2');
    // …and the mixer to the left of it, its own panel
    const b = moveDrawerTab(a, 'mixer', { newGroupBefore: 'g2' });
    expect(ids(b)).toEqual([['piano-roll', 'macros', 'clip-properties'], ['mixer'], ['effects']]);
    // the mixer joins the effects panel: its own panel empties and goes
    const c = moveDrawerTab(b, 'mixer', { groupId: 'g2' });
    expect(ids(c)).toEqual([['piano-roll', 'macros', 'clip-properties'], ['effects', 'mixer']]);
    // nothing to do: into its own group, beside itself when alone, an unknown target
    expect(moveDrawerTab(a, 'mixer', { groupId: 'g1' })).toBe(a);
    expect(moveDrawerTab(a, 'effects', { newGroupBefore: null })).toBe(a);
    expect(moveDrawerTab(a, 'effects', { newGroupBefore: 'g2' })).toBe(a);
    expect(moveDrawerTab(a, 'mixer', { groupId: 'nope' })).toBe(a);
  });

  it('reorderDrawerGroup keeps the closed tabs after the shown order', () => {
    expect(ids(reorderDrawerGroup(DEFAULT_DRAWER_GROUPS, 'g1', ['effects', 'mixer']))).toEqual([['effects', 'mixer', 'piano-roll', 'macros', 'clip-properties']]);
  });

  it('drawerMoveTargets: its own panel when it shares one, the panels either side when there are', () => {
    const o = open('mixer', 'effects', 'macros');
    expect(drawerMoveTargets(DEFAULT_DRAWER_GROUPS, o, 'effects').map((t) => t.label)).toEqual(['Move to new panel']);
    const split = moveDrawerTab(DEFAULT_DRAWER_GROUPS, 'effects', { newGroupBefore: null });
    expect(drawerMoveTargets(split, o, 'effects')).toEqual([{ label: 'Move to left panel', target: { groupId: 'g1' } }]);
    expect(drawerMoveTargets(split, o, 'mixer').map((t) => t.label)).toEqual(['Move to new panel', 'Move to right panel']);
    // a panel whose tabs are all closed is not a neighbour
    expect(drawerMoveTargets(split, open('effects'), 'effects')).toEqual([]);
  });

  it('drawerDropAt: near a panel\'s edge a new panel there, over its middle into it, nothing outside', () => {
    const el = (id: string, left: number, width: number) => {
      const e = document.createElement('div');
      e.setAttribute('data-drawer-group', id);
      e.getBoundingClientRect = () => ({ left, top: 600, width, height: 300, right: left + width, bottom: 900, x: left, y: 600, toJSON() { return {}; } }) as DOMRect;
      return e;
    };
    const els = [el('g1', 0, 800), el('g2', 800, 400)];
    expect(drawerDropAt(40, els)).toMatchObject({ target: { newGroupBefore: 'g1' }, preview: { left: 0, width: 400 } });
    expect(drawerDropAt(400, els)).toMatchObject({ target: { groupId: 'g1' }, preview: { left: 0, width: 800 } });
    expect(drawerDropAt(760, els)).toMatchObject({ target: { newGroupBefore: 'g2' }, preview: { left: 400, width: 400 } });
    expect(drawerDropAt(1000, els)).toMatchObject({ target: { groupId: 'g2' } });
    expect(drawerDropAt(1180, els)).toMatchObject({ target: { newGroupBefore: null } });
    expect(drawerDropAt(1300, els)).toBeNull();
  });
});
