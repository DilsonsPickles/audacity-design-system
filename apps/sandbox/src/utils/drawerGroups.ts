import type { DrawerTabId } from '../components/editor/EditorBottomDrawer';

/**
 * THE BOTTOM DRAWER IS A ROW OF PANELS (2026-11-10, "let me put Mixer and
 * Effects side by side NOT in the same panel. Like in MuseScore"): the
 * drawer holds one or more GROUPS side by side, each a panel of its own —
 * its own tabs, its own active tab, its own width (`flex`, a share of the
 * drawer's width). Every drawer tab id lives in exactly one group, open or
 * not; a group none of whose tabs is open draws nothing, and a group that
 * loses its last tab is dropped. Groups are addressed by id, so a group
 * vanishing never shifts a target.
 */
export interface DrawerGroup {
  id: string;
  tabs: DrawerTabId[];
  /** Share of the drawer's width (a flex-grow weight) */
  flex: number;
}

/** Where a tab goes: into a group, or into a NEW group before a group (null = at the right end) */
export type DrawerTarget = { groupId: string } | { newGroupBefore: string | null };

export const DEFAULT_DRAWER_GROUPS: DrawerGroup[] = [
  { id: 'g1', tabs: ['mixer', 'piano-roll', 'effects', 'macros', 'clip-properties'], flex: 1 },
];

const nextGroupId = (groups: DrawerGroup[]): string => {
  const taken = new Set(groups.map((g) => g.id));
  let n = 1;
  while (taken.has(`g${n}`)) n++;
  return `g${n}`;
};

/** The groups that draw: those with an open tab, each with only its open tabs */
export function visibleDrawerGroups(groups: DrawerGroup[], open: ReadonlySet<DrawerTabId>): DrawerGroup[] {
  return groups
    .map((g) => ({ ...g, tabs: g.tabs.filter((t) => open.has(t)) }))
    .filter((g) => g.tabs.length > 0);
}

/** A group's active tab: its open tab activated most recently (else its first) */
export function activeDrawerTab(tabs: DrawerTabId[], stamps: Partial<Record<DrawerTabId, number>>): DrawerTabId {
  return tabs.reduce((best, t) => ((stamps[t] ?? 0) > (stamps[best] ?? 0) ? t : best), tabs[0]);
}

/** Move a tab into a group (at its end) or into a new group of its own.
 *  A tab alone in its group dropped beside itself changes nothing. The
 *  same array comes back when nothing would change. */
export function moveDrawerTab(groups: DrawerGroup[], tab: DrawerTabId, target: DrawerTarget): DrawerGroup[] {
  const from = groups.find((g) => g.tabs.includes(tab));
  if (!from) return groups;
  if ('groupId' in target) {
    if (target.groupId === from.id || !groups.some((g) => g.id === target.groupId)) return groups;
  } else if (from.tabs.length === 1 && (target.newGroupBefore === from.id || target.newGroupBefore === groups[groups.indexOf(from) + 1]?.id || (target.newGroupBefore === null && groups[groups.length - 1] === from))) {
    return groups;
  }
  const id = nextGroupId(groups);
  let next = groups.map((g) => (g.id === from.id ? { ...g, tabs: g.tabs.filter((t) => t !== tab) } : g));
  if ('groupId' in target) {
    next = next.map((g) => (g.id === target.groupId ? { ...g, tabs: [...g.tabs, tab] } : g));
  } else {
    const fresh: DrawerGroup = { id, tabs: [tab], flex: 1 };
    const at = target.newGroupBefore === null ? -1 : next.findIndex((g) => g.id === target.newGroupBefore);
    if (at < 0) next.push(fresh);
    else next.splice(at, 0, fresh);
  }
  return next.filter((g) => g.tabs.length > 0);
}

/** A group's tabs in the order its header shows them (the open ones); the
 *  closed ones keep their places after */
export function reorderDrawerGroup(groups: DrawerGroup[], groupId: string, visibleOrder: DrawerTabId[]): DrawerGroup[] {
  return groups.map((g) => (g.id === groupId
    ? { ...g, tabs: [...visibleOrder, ...g.tabs.filter((t) => !visibleOrder.includes(t))] }
    : g));
}

/** The menu's ways to move a tab between the drawer's panels: its own
 *  panel (when it shares one), or the panel on its left / right */
export function drawerMoveTargets(groups: DrawerGroup[], open: ReadonlySet<DrawerTabId>, tab: DrawerTabId): Array<{ label: string; target: DrawerTarget }> {
  const visible = visibleDrawerGroups(groups, open);
  const i = visible.findIndex((g) => g.tabs.includes(tab));
  if (i < 0) return [];
  const out: Array<{ label: string; target: DrawerTarget }> = [];
  if (visible[i].tabs.length > 1) {
    // Its own panel, just to the right of the one it leaves
    const after = groups[groups.findIndex((g) => g.id === visible[i].id) + 1];
    out.push({ label: 'Move to new panel', target: { newGroupBefore: after?.id ?? null } });
  }
  if (i > 0) out.push({ label: 'Move to left panel', target: { groupId: visible[i - 1].id } });
  if (i < visible.length - 1) out.push({ label: 'Move to right panel', target: { groupId: visible[i + 1].id } });
  return out;
}

/** Where a panel dropped on the bottom band lands among the drawer's
 *  panels: near a panel's left or right edge (a quarter of it, 96px at
 *  most) a NEW panel there, else INTO that panel; `preview` is the part
 *  of the drawer to light up. Null when no panel is under x (the drawer
 *  closed). `els` are the drawn panels, `[data-drawer-group]`, in order. */
export interface DrawerDrop { target: DrawerTarget; preview: { left: number; top: number; width: number; height: number } }
export function drawerDropAt(
  x: number,
  els: ReadonlyArray<Element> = typeof document === 'undefined' ? [] : Array.from(document.querySelectorAll('[data-drawer-group]')),
): DrawerDrop | null {
  for (let i = 0; i < els.length; i++) {
    const r = els[i].getBoundingClientRect();
    if (r.width <= 0 || x < r.left || x > r.right) continue;
    const id = els[i].getAttribute('data-drawer-group') ?? '';
    const edge = Math.min(96, r.width / 4);
    const half = { top: r.top, height: r.height, width: r.width / 2 };
    if (x < r.left + edge) return { target: { newGroupBefore: id }, preview: { ...half, left: r.left } };
    if (x > r.right - edge) return { target: { newGroupBefore: els[i + 1]?.getAttribute('data-drawer-group') ?? null }, preview: { ...half, left: r.left + r.width / 2 } };
    return { target: { groupId: id }, preview: { left: r.left, top: r.top, width: r.width, height: r.height } };
  }
  return null;
}
