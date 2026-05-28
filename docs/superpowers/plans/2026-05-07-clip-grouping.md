# Clip Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistent grouping of clips so that selecting any group member auto-selects all members; downstream behaviors (drag, trim, delete, overlap eating) inherit from existing multi-select.

**Architecture:** A pure `expandSelectionToGroups` helper runs at the end of every reducer case that mutates `clip.selected`. Two new reducer actions (`GROUP_SELECTED_CLIPS`, `UNGROUP_CLIPS`) manage `groupId` assignment. Two new context menu items (Group / Ungroup) wire through `ClipContextMenu` and `AppContextMenus`.

**Tech Stack:** TypeScript, React, Vitest 4, @testing-library/react, jsdom. Sandbox app at `apps/sandbox/`. Component package at `packages/components/`.

**Spec:** `docs/superpowers/specs/2026-05-07-clip-grouping-design.md`

**Codebase notes:**
- Sandbox `Clip` type is locally defined in `apps/sandbox/src/contexts/TracksContext.tsx` (lines 21-38). Has `id`, `name`, `start`, `duration`, `trimStart?`, `selected?`, etc. We add `groupId?: string`.
- Selection-mutating reducer cases live in `TracksContext.tsx`: `SELECT_CLIP` (line 503), `SELECT_CLIP_RANGE` (line 542), `TOGGLE_CLIP_SELECTION` (line 864). Each builds `newTracks` then returns state. The auto-expand helper hooks in just before return.
- `ClipContextMenu` lives at `packages/components/src/ClipContextMenu/ClipContextMenu.tsx`. Props are listed at lines 7-92. Existing items: Rename, Color, Cut, Copy, Duplicate, Delete, Split, Spectral.
- `AppContextMenus` at `apps/sandbox/src/components/AppContextMenus.tsx` mounts the clip menu (line 75-152) and provides callbacks like `onCut`. The menu state object `clipContextMenu` carries `{ isOpen, x, y, trackIndex, clipId, openedViaKeyboard }`.

---

## File Plan

### Modified files

- `apps/sandbox/src/contexts/TracksContext.tsx` — add `groupId` to `Clip`, `expandSelectionToGroups` helper, two new actions, hook helper into 3 selection cases. ~80 line delta.
- `packages/components/src/ClipContextMenu/ClipContextMenu.tsx` — 4 new props, 2 new menu items. ~30 line delta.
- `apps/sandbox/src/components/AppContextMenus.tsx` — flag computation + dispatch wiring. ~20 line delta.

### New test files

- `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts` — covers helper + both new actions + auto-expand integration. Single file.

---

## Task 1: Add `groupId` field to the Clip type

**Files:**
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (around lines 21-38, the `interface Clip`)

- [ ] **Step 1: Add the `groupId?: string` field to the Clip interface**

Find the interface (currently ending around line 38 with `color?: ...`). Add the new field at the end:

```ts
interface Clip {
  id: number;
  name: string;
  start: number;
  duration: number;
  waveform?: number[];
  waveformLeft?: number[];
  waveformRight?: number[];
  waveformRms?: number[];
  waveformLeftRms?: number[];
  waveformRightRms?: number[];
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
  trimStart?: number;
  fullDuration?: number;
  deletedRegions?: DeletedRegion[];
  color?: 'cyan' | 'blue' | 'violet' | 'magenta' | 'red' | 'orange' | 'yellow' | 'green' | 'teal';
  groupId?: string;
}
```

(Only the `groupId?: string;` line is new. Don't change the others.)

- [ ] **Step 2: Verify type-check**

Run: `cd apps/sandbox && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx
git commit -m "Add groupId field to Clip type"
```

---

## Task 2: Pure helper `expandSelectionToGroups` (TDD)

**Files:**
- Create: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (add the helper near the other pure helpers — top of file, after type definitions)

- [ ] **Step 1: Write failing tests**

Create `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { expandSelectionToGroups, type Track } from '../TracksContext';

const track = (clips: Array<Partial<{ id: number; selected: boolean; groupId: string }>>): Track => ({
  id: 1,
  name: 't',
  clips: clips.map((c, i) => ({
    id: c.id ?? i + 1,
    name: '',
    start: 0,
    duration: 1,
    envelopePoints: [],
    selected: c.selected,
    groupId: c.groupId,
  } as any)),
} as Track);

describe('expandSelectionToGroups', () => {
  it('returns input unchanged when no clip is selected', () => {
    const tracks: Track[] = [
      track([{ id: 1, groupId: 'g1' }, { id: 2, groupId: 'g1' }]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result).toEqual(tracks);
  });

  it('returns input unchanged when selected clips have no groupId', () => {
    const tracks: Track[] = [
      track([{ id: 1, selected: true }, { id: 2 }]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result[0].clips[0].selected).toBe(true);
    expect(result[0].clips[1].selected).toBeFalsy();
  });

  it('expands selection to all clips in the same group on the same track', () => {
    const tracks: Track[] = [
      track([
        { id: 1, selected: true, groupId: 'g1' },
        { id: 2, groupId: 'g1' },
        { id: 3, groupId: 'g2' },
      ]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(result[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(result[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });

  it('expands selection across tracks', () => {
    const tracks: Track[] = [
      track([{ id: 1, selected: true, groupId: 'g1' }]),
      track([{ id: 2, groupId: 'g1' }, { id: 3 }]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result[1].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(result[1].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });

  it('is idempotent (running on already-expanded selection changes nothing)', () => {
    const tracks: Track[] = [
      track([
        { id: 1, selected: true, groupId: 'g1' },
        { id: 2, selected: true, groupId: 'g1' },
      ]),
    ];
    const once = expandSelectionToGroups(tracks);
    const twice = expandSelectionToGroups(once);
    expect(twice).toEqual(once);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `cd apps/sandbox && pnpm test clipGrouping`
Expected: FAIL — `expandSelectionToGroups` is not exported (or not defined).

- [ ] **Step 3: Add the helper to TracksContext.tsx**

Find a place near the top of `TracksContext.tsx`, after the type definitions (around line 80, before the reducer). Add:

```ts
/**
 * Pure helper: expand the `selected` flag to include every clip whose `groupId`
 * matches a currently-selected clip. Idempotent.
 */
export function expandSelectionToGroups(tracks: Track[]): Track[] {
  const selectedGroupIds = new Set<string>();
  for (const t of tracks) {
    for (const c of t.clips) {
      if (c.selected && c.groupId) selectedGroupIds.add(c.groupId);
    }
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

The test imports `Track` from `TracksContext` — if `Track` is not currently exported, prepend `export` to its interface declaration (around line 47).

- [ ] **Step 4: Run the test — confirm it passes**

Run: `cd apps/sandbox && pnpm test clipGrouping`
Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "Add expandSelectionToGroups helper for group-aware selection"
```

---

## Task 3: `GROUP_SELECTED_CLIPS` action + reducer (TDD)

**Files:**
- Modify: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx`

- [ ] **Step 1: Add failing tests**

Append to the existing test file, inside a new `describe` block at the bottom:

```ts
import { tracksReducer, type TracksState, type Clip } from '../TracksContext';

const baseState = (clips: Partial<Clip>[]): TracksState => ({
  tracks: [{
    id: 1,
    name: 't',
    clips: clips.map((c, i) => ({
      id: i + 1,
      name: '',
      start: 0,
      duration: 1,
      envelopePoints: [],
      ...c,
    } as Clip)),
  }],
} as unknown as TracksState);

describe('GROUP_SELECTED_CLIPS', () => {
  it('assigns a fresh groupId to all selected clips', () => {
    const state = baseState([
      { id: 1, selected: true },
      { id: 2, selected: true },
      { id: 3 },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const clip1 = next.tracks[0].clips.find(c => c.id === 1)!;
    const clip2 = next.tracks[0].clips.find(c => c.id === 2)!;
    const clip3 = next.tracks[0].clips.find(c => c.id === 3)!;
    expect(clip1.groupId).toBeDefined();
    expect(clip1.groupId).toBe(clip2.groupId);
    expect(clip3.groupId).toBeUndefined();
  });

  it('shrinks an old group when some of its members are pulled into a new group', () => {
    const state = baseState([
      { id: 1, selected: true, groupId: 'old' },
      { id: 2, selected: true, groupId: 'old' },
      { id: 3, groupId: 'old' },
      { id: 4, groupId: 'old' },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const c1 = next.tracks[0].clips.find(c => c.id === 1)!;
    const c2 = next.tracks[0].clips.find(c => c.id === 2)!;
    const c3 = next.tracks[0].clips.find(c => c.id === 3)!;
    const c4 = next.tracks[0].clips.find(c => c.id === 4)!;
    expect(c1.groupId).toBe(c2.groupId);
    expect(c1.groupId).not.toBe('old');
    expect(c3.groupId).toBe('old');
    expect(c4.groupId).toBe('old');
  });

  it('dissolves an old group when only 1 member would remain (clears that lone member)', () => {
    const state = baseState([
      { id: 1, selected: true, groupId: 'old' },
      { id: 2, selected: true, groupId: 'old' },
      { id: 3, groupId: 'old' },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const c3 = next.tracks[0].clips.find(c => c.id === 3)!;
    expect(c3.groupId).toBeUndefined();
  });

  it('handles selected clips from multiple existing groups (each old group dissolves or shrinks)', () => {
    const state = baseState([
      { id: 1, selected: true, groupId: 'A' },
      { id: 2, selected: true, groupId: 'B' },
      { id: 3, groupId: 'A' },        // A leftover, will become solo → cleared
      { id: 4, groupId: 'B' },        // B leftover (only 1 left) → cleared
      { id: 5, groupId: 'A' },        // another A leftover; A had 3 members, now 2 → keep
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const c1 = next.tracks[0].clips.find(c => c.id === 1)!;
    const c2 = next.tracks[0].clips.find(c => c.id === 2)!;
    const c3 = next.tracks[0].clips.find(c => c.id === 3)!;
    const c4 = next.tracks[0].clips.find(c => c.id === 4)!;
    const c5 = next.tracks[0].clips.find(c => c.id === 5)!;
    expect(c1.groupId).toBe(c2.groupId); // both in new group
    expect(c1.groupId).not.toBe('A');
    expect(c1.groupId).not.toBe('B');
    expect(c3.groupId).toBe('A'); // A still has 2 leftovers (3 + 5)
    expect(c5.groupId).toBe('A');
    expect(c4.groupId).toBeUndefined(); // B dissolved
  });

  it('does nothing if fewer than 2 clips are selected', () => {
    const state = baseState([
      { id: 1, selected: true },
      { id: 2 },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    expect(next.tracks[0].clips[0].groupId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — confirm 5 fail**

Run: `cd apps/sandbox && pnpm test clipGrouping`
Expected: 5 new tests fail (action type unknown).

- [ ] **Step 3: Add the action variant and reducer case**

In `TracksContext.tsx`, find the `TracksAction` union (around line 200-215). After `MOVE_CLIP` or any other appropriate location, add:

```ts
  | { type: 'GROUP_SELECTED_CLIPS' }
```

Then find a sensible place to add the reducer case (after `TOGGLE_CLIP_SELECTION` is reasonable, or alongside the `APPLY_CLIP_PLACEMENT` case). Add:

```ts
    case 'GROUP_SELECTED_CLIPS': {
      // Collect selected clips
      let selectedCount = 0;
      const oldGroupIds = new Set<string>();
      for (const t of state.tracks) {
        for (const c of t.clips) {
          if (c.selected) {
            selectedCount++;
            if (c.groupId) oldGroupIds.add(c.groupId);
          }
        }
      }

      // Need at least 2 selected clips to form a group
      if (selectedCount < 2) return state;

      const newGroupId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Pass 1: assign new groupId to every selected clip
      let newTracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.selected ? { ...c, groupId: newGroupId } : c
        ),
      }));

      // Pass 2: for each oldGroupId, count remaining members and dissolve if ≤ 1
      for (const oldId of oldGroupIds) {
        const remaining: Array<{ trackIndex: number; clipId: number }> = [];
        newTracks.forEach((t, ti) => {
          t.clips.forEach(c => {
            if (c.groupId === oldId) remaining.push({ trackIndex: ti, clipId: c.id });
          });
        });
        if (remaining.length <= 1) {
          newTracks = newTracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.groupId === oldId ? { ...c, groupId: undefined } : c),
          }));
        }
      }

      return { ...state, tracks: newTracks };
    }
```

- [ ] **Step 4: Run — confirm passes**

Run: `cd apps/sandbox && pnpm test clipGrouping`
Expected: PASS — all 10 tests now pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "Add GROUP_SELECTED_CLIPS reducer with old-group dissolution"
```

---

## Task 4: `UNGROUP_CLIPS` action + reducer (TDD)

**Files:**
- Modify: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx`

- [ ] **Step 1: Add failing tests at the end of the test file**

```ts
describe('UNGROUP_CLIPS', () => {
  it('clears groupId on every clip with the matching groupId', () => {
    const state = baseState([
      { id: 1, groupId: 'A' },
      { id: 2, groupId: 'A' },
      { id: 3, groupId: 'A' },
    ]);
    const next = tracksReducer(state, { type: 'UNGROUP_CLIPS', payload: { groupId: 'A' } });
    expect(next.tracks[0].clips.every(c => c.groupId === undefined)).toBe(true);
  });

  it('leaves clips in other groups untouched', () => {
    const state = baseState([
      { id: 1, groupId: 'A' },
      { id: 2, groupId: 'A' },
      { id: 3, groupId: 'B' },
      { id: 4, groupId: 'B' },
    ]);
    const next = tracksReducer(state, { type: 'UNGROUP_CLIPS', payload: { groupId: 'A' } });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.groupId).toBeUndefined();
    expect(next.tracks[0].clips.find(c => c.id === 3)?.groupId).toBe('B');
    expect(next.tracks[0].clips.find(c => c.id === 4)?.groupId).toBe('B');
  });

  it('is a no-op when no clip has the target groupId', () => {
    const state = baseState([
      { id: 1, groupId: 'A' },
    ]);
    const next = tracksReducer(state, { type: 'UNGROUP_CLIPS', payload: { groupId: 'nonexistent' } });
    expect(next.tracks[0].clips[0].groupId).toBe('A');
  });
});
```

- [ ] **Step 2: Run — confirm 3 fail**

Run: `cd apps/sandbox && pnpm test clipGrouping`

- [ ] **Step 3: Add the action variant and reducer case**

In `TracksContext.tsx`, add to the action union (right after `GROUP_SELECTED_CLIPS`):

```ts
  | { type: 'UNGROUP_CLIPS'; payload: { groupId: string } }
```

Add the reducer case (right after `GROUP_SELECTED_CLIPS`):

```ts
    case 'UNGROUP_CLIPS': {
      const targetGroupId = action.payload.groupId;
      const newTracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.groupId === targetGroupId ? { ...c, groupId: undefined } : c
        ),
      }));
      return { ...state, tracks: newTracks };
    }
```

- [ ] **Step 4: Run — confirm passes**

Run: `cd apps/sandbox && pnpm test clipGrouping`
Expected: PASS — all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "Add UNGROUP_CLIPS reducer to clear groupId on group members"
```

---

## Task 5: Hook `expandSelectionToGroups` into `SELECT_CLIP` (TDD)

`SELECT_CLIP` currently sets selection to exactly one clip. After this task, single-click on a grouped clip auto-selects all groupmates.

`SELECT_CLIP` also sets `selectedTrackIndices: [trackIndex]`. After group expansion that may have selected clips on other tracks, we must derive `selectedTrackIndices` from the expanded state instead of the single clicked track.

**Files:**
- Modify: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx`

- [ ] **Step 1: Add failing test**

Append to the test file:

```ts
describe('SELECT_CLIP auto-expansion', () => {
  it('selecting a grouped clip selects all members in the same group on the same track', () => {
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3 },
    ]);
    const next = tracksReducer(state, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });

  it('selecting a grouped clip expands selection across tracks', () => {
    // Need 2 tracks for this. Construct manually.
    const state: TracksState = {
      tracks: [
        { id: 1, name: 't1', clips: [
          { id: 1, name: '', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' } as any,
        ] },
        { id: 2, name: 't2', clips: [
          { id: 2, name: '', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' } as any,
        ] },
      ],
    } as unknown as TracksState;

    const next = tracksReducer(state, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips[0].selected).toBe(true);
    expect(next.tracks[1].clips[0].selected).toBe(true);
    expect(next.selectedTrackIndices).toEqual(expect.arrayContaining([0, 1]));
  });

  it('selecting an ungrouped clip behaves as before (single selection)', () => {
    const state = baseState([
      { id: 1 },
      { id: 2, groupId: 'g1' },
      { id: 3, groupId: 'g1' },
    ]);
    const next = tracksReducer(state, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBeFalsy();
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run — confirm 3 fail**

Run: `cd apps/sandbox && pnpm test clipGrouping`

- [ ] **Step 3: Modify `SELECT_CLIP` reducer case**

Find `case 'SELECT_CLIP': {` (around line 503). Locate the `return { ... }` block. Replace the body so that:

1. After computing `newTracks`, run it through `expandSelectionToGroups`.
2. Derive `selectedTrackIndices` from the expanded tracks (not just `[trackIndex]`).

Replace the existing `return { ... };` (and the lines computing `newTracks` and metadata above it) with:

```ts
      const expandedTracks = expandSelectionToGroups(newTracks);

      // Derive selectedTrackIndices from the expanded selection (groups may span tracks).
      const selectedTrackIndices: number[] = [];
      expandedTracks.forEach((t, idx) => {
        if (t.clips.some(c => c.selected) || t.midiClips?.some(c => c.selected)) {
          selectedTrackIndices.push(idx);
        }
      });

      return {
        ...state,
        tracks: expandedTracks,
        selectedTrackIndices: selectedTrackIndices.length > 0 ? selectedTrackIndices : [trackIndex],
        focusedTrackIndex: trackIndex,
        selectedLabelIds: [],
        timeSelection: newTimeSelection,
        clipDurationIndicator: newClipDurationIndicator,
        lastSelectedClip: { trackIndex, clipId },
      };
```

(The lines computing `newTimeSelection` and `newClipDurationIndicator` above `return { ... }` stay unchanged.)

- [ ] **Step 4: Run — confirm all clipGrouping tests pass and existing tests unaffected**

Run: `cd apps/sandbox && pnpm test`
Expected: All pre-existing tests still pass; the 3 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "SELECT_CLIP: auto-expand selection to group members"
```

---

## Task 6: Hook `expandSelectionToGroups` into `TOGGLE_CLIP_SELECTION` and `SELECT_CLIP_RANGE`

Same pattern as Task 5 applied to two more cases. `TOGGLE_CLIP_SELECTION` already derives `selectedTrackIndices` from the post-toggle state — we just feed it the expanded tracks.

**Files:**
- Modify: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx`

- [ ] **Step 1: Add failing tests for TOGGLE_CLIP_SELECTION**

Append to the test file:

```ts
describe('TOGGLE_CLIP_SELECTION auto-expansion', () => {
  it('toggling a grouped clip into selected expands to all group members', () => {
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3 },
    ]);
    const next = tracksReducer(state, {
      type: 'TOGGLE_CLIP_SELECTION',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run — confirm 1 fails**

Run: `cd apps/sandbox && pnpm test clipGrouping`

- [ ] **Step 3: Modify `TOGGLE_CLIP_SELECTION`**

Find `case 'TOGGLE_CLIP_SELECTION': {` (around line 864). The case currently builds `newTracks`, then computes `tracksWithSelection` and other metadata.

Just before `const tracksWithSelection = newTracks` (around line 883), insert:

```ts
      const expandedTracks = expandSelectionToGroups(newTracks);
```

Then replace every subsequent reference to `newTracks` (lines ~883 to the end of the case) with `expandedTracks`. That includes:

- `newTracks.map((track, idx) => ({ idx, hasSelection: ... }))` → uses `expandedTracks`
- `newTracks.reduce((count, track) => ...)` → uses `expandedTracks`
- The `selectedClip` lookup via `newTracks.flatMap(...)` → uses `expandedTracks`
- The `wasClipSelected` lookup `newTracks[trackIndex]?.clips.find(...)` → uses `expandedTracks`
- The final `return { ...state, tracks: newTracks, ... }` → returns `tracks: expandedTracks`

(There are roughly 5 references to swap. Use search-and-replace within the case body, but be careful not to change references in other cases.)

- [ ] **Step 4: Run — confirm passes**

Run: `cd apps/sandbox && pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Add failing test for SELECT_CLIP_RANGE**

Append:

```ts
describe('SELECT_CLIP_RANGE auto-expansion', () => {
  it('range selection that includes a grouped clip expands to its group members', () => {
    // SELECT_CLIP_RANGE selects from lastSelectedClip to (trackIndex, clipId).
    // Seed with lastSelectedClip then dispatch range.
    const seeded: TracksState = {
      ...baseState([
        { id: 1, groupId: 'g1' },
        { id: 2 },
        { id: 3, groupId: 'g1' },
      ]),
      lastSelectedClip: { trackIndex: 0, clipId: 1 },
    } as TracksState;

    const next = tracksReducer(seeded, {
      type: 'SELECT_CLIP_RANGE',
      payload: { trackIndex: 0, clipId: 2 },
    });
    // Range covers clips 1..2 → both selected. Group expansion brings in clip 3 too.
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBe(true);
  });
});
```

- [ ] **Step 6: Run — confirm fails**

Run: `cd apps/sandbox && pnpm test clipGrouping`

- [ ] **Step 7: Modify `SELECT_CLIP_RANGE`**

Find `case 'SELECT_CLIP_RANGE': {` (around line 542). The case has multiple internal branches that build `newTracks`. At each `return { ..., tracks: newTracks, ... }`, swap to `tracks: expandSelectionToGroups(newTracks)`.

The simplest patch: at the very end of the case body (just before each `return` statement that returns tracks), wrap with the helper:

```ts
return {
  ...state,
  tracks: expandSelectionToGroups(newTracks),
  // ...other fields unchanged
};
```

There may be multiple return points in this case — wrap each one's `tracks: newTracks` to `tracks: expandSelectionToGroups(newTracks)`. Audit the case body and update them all.

If the case also computes `selectedTrackIndices: [trackIndex]` style at any return, derive it from the expanded tracks instead, the same way Task 5 does:

```ts
const expandedTracks = expandSelectionToGroups(newTracks);
const sti: number[] = [];
expandedTracks.forEach((t, idx) => {
  if (t.clips.some(c => c.selected) || t.midiClips?.some(c => c.selected)) {
    sti.push(idx);
  }
});
return { ...state, tracks: expandedTracks, selectedTrackIndices: sti.length > 0 ? sti : [trackIndex], /* other fields */ };
```

- [ ] **Step 8: Run — confirm passes**

Run: `cd apps/sandbox && pnpm test`
Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "TOGGLE_CLIP_SELECTION and SELECT_CLIP_RANGE: auto-expand to groups"
```

---

## Task 7: Add Group/Ungroup items to ClipContextMenu component

**Files:**
- Modify: `packages/components/src/ClipContextMenu/ClipContextMenu.tsx`

- [ ] **Step 1: Add new props to the interface**

Find `export interface ClipContextMenuProps` (around line 7). Add four new props near the end (before `autoFocus`):

```ts
  /**
   * Whether the "Group clips" item is enabled (≥2 clips selected).
   */
  canGroup?: boolean;

  /**
   * Whether the "Ungroup clips" item is enabled (right-click target is in a group).
   */
  canUngroup?: boolean;

  /**
   * Callback for grouping the currently-selected clips.
   */
  onGroup?: () => void;

  /**
   * Callback for ungrouping the right-clicked clip's group.
   */
  onUngroup?: () => void;
```

- [ ] **Step 2: Destructure the new props in the component**

Around line 98-110 the component destructures props. Add `canGroup`, `canUngroup`, `onGroup`, `onUngroup` to the list.

- [ ] **Step 3: Add the menu items**

Locate where the existing items render (around lines 159-189: Cut, Copy, Duplicate, Delete clip, divider, Split). Add the two new items inside their own divider section (after Delete clip, before the divider, OR in their own group right after the Cut/Copy/Duplicate group). Use this pattern:

```tsx
      <div className="clip-context-menu-divider" />

      <ContextMenuItem
        label="Group clips"
        onClick={() => { onGroup?.(); onClose(); }}
        disabled={!canGroup}
      />

      <ContextMenuItem
        label="Ungroup clips"
        onClick={() => { onUngroup?.(); onClose(); }}
        disabled={!canUngroup}
      />
```

(Place this group sensibly — before the Split / Spectral divider is fine.)

If `ContextMenuItem` doesn't currently accept a `disabled` prop, check its source at `packages/components/src/ContextMenuItem/ContextMenuItem.tsx`. If it does, use it. If not, add a `disabled?: boolean` prop and apply it (set `aria-disabled`, prevent the onClick when disabled, and apply a CSS class for styling). For this task you may safely assume `disabled` exists on `ContextMenuItem` — verify by reading the file; if it doesn't, defer that to a follow-up and use `if (canGroup) onGroup?.();` inside the click handler as a stopgap.

- [ ] **Step 4: Type-check**

```bash
cd packages/components && pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/ClipContextMenu/ClipContextMenu.tsx
git commit -m "ClipContextMenu: add Group/Ungroup items with enable flags"
```

---

## Task 8: Wire AppContextMenus to dispatch group actions

**Files:**
- Modify: `apps/sandbox/src/components/AppContextMenus.tsx`

- [ ] **Step 1: Locate the ClipContextMenu mounting point**

Find the JSX where `<ClipContextMenu ... />` is rendered (around lines 75-152). Locate the `tracks` and `dispatch` props/values available in scope.

- [ ] **Step 2: Compute `canGroup`, `canUngroup`, and the right-click target's groupId**

Just inside the `{clipContextMenu && ( ... )}` conditional block (above `<ClipContextMenu ... />`), compute helper values:

```tsx
        const targetTrack = tracks[clipContextMenu.trackIndex];
        const targetClip = targetTrack?.clips.find((c: any) => c.id === clipContextMenu.clipId);
        const targetGroupId = targetClip?.groupId;
        const selectedClipsCount = tracks.reduce(
          (sum: number, t: any) => sum + (t.clips || []).filter((c: any) => c.selected).length,
          0
        );
        const canGroup = selectedClipsCount >= 2;
        const canUngroup = !!targetGroupId;
```

(The exact accessor pattern matches existing handlers like `onCut` in the same file, around lines 88-108.)

- [ ] **Step 3: Pass new props to `<ClipContextMenu>`**

In the `<ClipContextMenu .../>` element, add:

```tsx
          canGroup={canGroup}
          canUngroup={canUngroup}
          onGroup={() => {
            if (canGroup) {
              dispatch({ type: 'GROUP_SELECTED_CLIPS' });
            }
            setClipContextMenu(null);
          }}
          onUngroup={() => {
            if (targetGroupId) {
              dispatch({ type: 'UNGROUP_CLIPS', payload: { groupId: targetGroupId } });
            }
            setClipContextMenu(null);
          }}
```

- [ ] **Step 4: Type-check + tests**

```bash
cd apps/sandbox && pnpm tsc --noEmit && pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/components/AppContextMenus.tsx
git commit -m "Wire AppContextMenus to dispatch GROUP/UNGROUP actions"
```

---

## Task 9: Manual verification matrix

Run the sandbox and walk through the spec's manual verification list.

- [ ] **Step 1: Start the sandbox**

```bash
cd apps/sandbox && pnpm dev
```

Open http://localhost:3000.

- [ ] **Step 2: Verify the matrix**

- [ ] Select 2 clips, right-click → "Group clips" → click any one → both highlight together.
- [ ] Select 3 clips across 2 tracks → "Group clips" → click any → all 3 highlight (across tracks).
- [ ] Drag a grouped clip → all members move together.
- [ ] Delete a grouped clip → all members delete.
- [ ] Group A (4 clips). Select 2 of them + 1 ungrouped clip → "Group clips" → new group of 3, group A reduced to 2 (still a group).
- [ ] Group A (3 clips). Select 2 of them → "Group clips" → new group of 2, group A reduced to 1 → A's lone clip clicks behave as ungrouped (no expansion).
- [ ] Right-click a grouped clip → "Ungroup clips" → click any member → no expansion.
- [ ] Right-click an ungrouped clip → "Group clips" disabled if <2 clips selected; "Ungroup clips" disabled.

- [ ] **Step 3: Final empty commit (or tuning commit)**

If everything works:
```bash
git commit --allow-empty -m "Manual verification of clip grouping passed"
```

If tuning is needed (e.g., spec ambiguity surfaces in real use), apply the fix in a small commit and rerun the matrix.

---

## Done

All spec requirements covered:

- ✅ `groupId` field on Clip (Task 1)
- ✅ Pure expansion helper (Task 2)
- ✅ `GROUP_SELECTED_CLIPS` with old-group dissolution (Task 3)
- ✅ `UNGROUP_CLIPS` (Task 4)
- ✅ Auto-expansion on `SELECT_CLIP` with cross-track support (Task 5)
- ✅ Auto-expansion on `TOGGLE_CLIP_SELECTION` and `SELECT_CLIP_RANGE` (Task 6)
- ✅ Context menu UI items (Task 7)
- ✅ Sandbox wiring (Task 8)
- ✅ Manual verification (Task 9)
