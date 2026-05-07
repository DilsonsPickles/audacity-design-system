# Clip Grouping — Design Spec

**Date:** 2026-05-07
**Scope:** Persistent grouping of clips so that selecting any member auto-selects the rest.
**Status:** Approved by user, ready for implementation plan.

## Context

The sandbox already supports multi-clip selection (shift-click) and multi-clip drag. Multi-select is *transient* — it survives only until the user clicks elsewhere. Clip grouping makes that selection *persistent*: once clips are grouped, clicking any one selects all of them, every time, until they are explicitly ungrouped.

After auto-expansion, all downstream behavior — drag, trim, delete, overlap eating — is identical to manual multi-select. No new behaviors, just a new way to enter the multi-select state.

This spec is the second of three connected pieces planned in the overlapping-clips brainstorm:

1. Overlapping clips — done (merged 2026-05-07).
2. **Clip grouping** — this spec.
3. Marketing demo — later spec, packages 1+2 into the embedded "What's new in Audacity 4?" Astro island.

## Behavior

### Single principle

> A `groupId` is a persistent multi-select. Any operation that selects one member selects all members. Any operation that operates on a selection operates on the entire group.

### Creating a group

User selects ≥2 clips (any tracks) and chooses **"Group clips"** from the clip context menu. All selected clips are assigned the same fresh `groupId`. If any selected clip was already in another group, it leaves that group:

- The old group's remaining members keep their `groupId`.
- If the old group ends up with 0 or 1 members, the lone member's `groupId` is cleared (no orphaned 1-member groups).

This rule lets users "regroup" by selecting and grouping again — you don't need to ungroup first.

### Ungrouping

User right-clicks a clip in a group and chooses **"Ungroup clips"**. Every clip with that `groupId` has its `groupId` cleared.

### Context menu states

Both items render unconditionally in the clip context menu, but their enabled states differ:

- **Group clips** — enabled when 2+ clips are currently selected.
- **Ungroup clips** — enabled when the right-click target clip has a `groupId`.

### Selection auto-expansion

Whenever the reducer marks any clip as `selected`, it expands the selection to include every clip with a matching `groupId`. Cross-track expansion is supported. After expansion, the existing multi-select machinery (`selectedClipsInitialPositions`, drag, trim, delete) treats the expanded selection identically to a manual multi-select.

### No visual indicator

Grouped clips render identically to ungrouped clips. The user discovers a group by clicking and observing the auto-expand. (Out of scope for this spec; could be added later if discoverability is a problem.)

### Cross-track grouping

A group may span any number of tracks. Auto-expansion walks every track. (Selecting one clip on track 1 auto-selects its groupmates on tracks 2 and 3.)

### Group lifecycle

- A clip's `groupId` is set when it joins a group, cleared when it leaves (via "Ungroup clips" or via the auto-dissolve rule).
- Deleting a grouped clip via the existing `DELETE_SELECTED_CLIPS` action deletes the entire group (since selection auto-expanded). The `groupId` itself is not "deleted" — there's no group registry, just the field on each clip.
- The auto-dissolve rule (clear `groupId` when a group has 0 or 1 members) keeps the data clean as clips are added/removed via grouping operations. It does *not* run on every reducer action — only after `GROUP_SELECTED_CLIPS` reshuffles memberships.

### Out of scope

- Visual indicator on grouped clips.
- Naming a group, or any group-level UI.
- Keyboard shortcut for group/ungroup.
- Nested groups, hierarchical groups, group-of-groups.
- Operating on a group as a single unit in any way other than "expand selection then proceed."

## Architecture

### Data model

`Clip` (defined locally in `apps/sandbox/src/contexts/TracksContext.tsx`) gains one optional field:

```ts
interface Clip {
  // ...existing fields
  groupId?: string;
}
```

Two clips are in the same group iff they share the same `groupId`. There is no separate group registry. This keeps the model trivially serializable, undo-friendly, and avoids cross-cutting state.

### Pure helper: `expandSelectionToGroups`

A small pure function on the `tracks` array:

```ts
function expandSelectionToGroups(tracks: Track[]): Track[] {
  const selectedGroupIds = new Set<string>();
  for (const t of tracks) for (const c of t.clips) {
    if (c.selected && c.groupId) selectedGroupIds.add(c.groupId);
  }
  if (selectedGroupIds.size === 0) return tracks;
  return tracks.map(t => ({
    ...t,
    clips: t.clips.map(c =>
      c.groupId && selectedGroupIds.has(c.groupId) && !c.selected
        ? { ...c, selected: true }
        : c
    ),
  }));
}
```

Pure, deterministic, easy to unit-test.

### Reducer changes

The auto-expand helper runs at the end of every reducer case that mutates `clip.selected`. The simplest pattern is to apply it to `newTracks` just before returning state. Cases to update (audit during implementation):

- `SELECT_CLIP`
- `TOGGLE_CLIP_SELECTION` (or whatever the toggle case is named)
- Any range-selection or shift-select cases
- `SELECT_ALL_CLIPS` if such an action exists

The helper is idempotent — running it on already-expanded selections changes nothing — so over-applying is safe.

### Two new reducer actions

```ts
| { type: 'GROUP_SELECTED_CLIPS' }
| { type: 'UNGROUP_CLIPS'; payload: { groupId: string } }
```

**`GROUP_SELECTED_CLIPS`:**

1. Generate a fresh `groupId` via `crypto.randomUUID()`.
2. Collect the set of `oldGroupIds` from the currently-selected clips.
3. Walk every clip; if `selected`, set `groupId` to the new id.
4. For each `oldGroupId`, count remaining clips that still carry it. If count ≤ 1, clear `groupId` on those leftovers.

**`UNGROUP_CLIPS`:**

1. Walk every clip; if `groupId === payload.groupId`, clear `groupId`.

### Context menu wiring

`packages/components/src/ClipContextMenu/ClipContextMenu.tsx` gains four new props:

- `canGroup: boolean`
- `canUngroup: boolean`
- `onGroup: () => void`
- `onUngroup: () => void`

It renders two new `ContextMenuItem`s — "Group clips" and "Ungroup clips" — placed sensibly within the existing menu (e.g., near the cut/copy section). Each item is `disabled` based on its respective `can*` flag.

`apps/sandbox/src/components/AppContextMenus.tsx` computes the flags from the current tracks state and the right-click target, and dispatches the new reducer actions:

- `canGroup` = number of currently-selected clips ≥ 2.
- `canUngroup` = the right-click target clip has a `groupId`.
- `onGroup` = `() => dispatch({ type: 'GROUP_SELECTED_CLIPS' })`.
- `onUngroup` = `() => { const gid = targetClip.groupId; if (gid) dispatch({ type: 'UNGROUP_CLIPS', payload: { groupId: gid } }); }`.

### Code surface estimate

- `apps/sandbox/src/contexts/TracksContext.tsx` — `groupId` field on `Clip`, `expandSelectionToGroups` helper, two new actions, hook the helper into existing selection cases. ~80 line delta.
- `packages/components/src/ClipContextMenu/ClipContextMenu.tsx` — new props + 2 menu items. ~30 line delta.
- `apps/sandbox/src/components/AppContextMenus.tsx` — flag computation + dispatch wiring. ~20 line delta.

## Testing

### Unit tests — `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`

- `expandSelectionToGroups` (pure helper):
  - Returns input unchanged when no clips are selected.
  - Returns input unchanged when selected clips have no `groupId`.
  - Expands selection to all clips with a matching `groupId` on the same track.
  - Expands selection across tracks.
- `GROUP_SELECTED_CLIPS` reducer action:
  - Selecting 2 clips and dispatching → both have the same fresh `groupId`.
  - Selecting clips across tracks → all share the new `groupId`.
  - Selecting clips already in different groups → all join the new group; old groups dissolve correctly (auto-clear when ≤1 member remains).
- `UNGROUP_CLIPS` reducer action:
  - All clips matching the payload `groupId` have it cleared; other groups untouched.
- Selection auto-expansion:
  - `SELECT_CLIP` on one member of a group → all members `selected = true` (single track).
  - Same, across tracks.
  - Toggling selection (deselect one) → toggles all members.

### Manual verification

- Select 2 clips, right-click → "Group clips" → click any one → both highlight.
- Select 3 clips across 2 tracks → group → click any one → all 3 highlight.
- Drag a grouped clip → all members move; existing overlap-eating still works for the group's footprint.
- Delete a grouped clip → all members delete.
- Group A (4 clips). Select 2 of them + 1 ungrouped clip → group → new group of 3, group A reduced to 2 (still grouped, since 2 ≥ 2).
- Group A (3 clips). Select 2 → group → new group of 2, group A reduced to 1 → A's lone clip's `groupId` is cleared.
- Right-click a grouped clip → "Ungroup clips" → all members lose `groupId`; clicking one no longer expands.

### TDD ordering

1. `expandSelectionToGroups` helper tests + implementation (pure, fastest feedback).
2. `GROUP_SELECTED_CLIPS` action + reducer case.
3. `UNGROUP_CLIPS` action + reducer case.
4. Hook the helper into existing selection cases; verify auto-expand triggers via tests on `SELECT_CLIP` and toggle.
5. Context menu wiring last (UI integration).
