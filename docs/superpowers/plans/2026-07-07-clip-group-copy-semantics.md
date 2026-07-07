# Clip-Group Copy Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved invariant — copies never share a group with their originals; copies form a fresh group iff every member of the original group was copied whole — plus the source-side corollary (dissolve surviving groups that drop below 2 members).

**Spec:** `docs/superpowers/specs/2026-07-07-clip-group-copy-semantics-design.md` (read it before starting any task).

**Architecture:** One new pure util module (`apps/sandbox/src/utils/clipGroupCopy.ts`) computes group-entirety at copy time and re-groups copies at materialization time. Every clone path (Ctrl+D clip/track, context-menu track duplicate, clipboard paste) calls it. A second pure helper (`dissolveDegenerateGroups` in `contexts/reducers/shared.ts`) clears `groupId` from groups with <2 members and is applied in every path that removes clips from the timeline.

**Tech Stack:** TypeScript, React 19, Vitest 4 (tests in adjacent `__tests__/` dirs).

## Global Constraints

- Branch: `feat/clip-group-copy-semantics` (already checked out). Base branch for PR: `master`.
- **DIRTY-FILE GUARD:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` and `apps/sandbox/src/components/EditorLayout.tsx` carry unrelated uncommitted WIP (keyboard-focus guards, `keyboardFocusedTrack` removal). That WIP must be committed or stashed BEFORE Tasks 6 and 8 touch those files. If `git status` still shows the other unrelated dirty files (`Canvas.tsx`, `useContainerClick.ts`, `TrackControlSidePanel.tsx`, `TransportToolbar.tsx`), never `git add` them.
- Commit only the files each task names. Never `git add -A` / `git add .`.
- No `any` types — `pnpm guard:any` (root) must stay clean.
- This is a DELIBERATE BEHAVIOR CHANGE (first since the design freeze). New tests assert the NEW spec; do not preserve tether-to-original behavior anywhere.
- Gates for the final task: `pnpm guard:any`, `pnpm test`, `npx tsc --noEmit` in `apps/sandbox`, `pnpm build` (all from repo root unless stated).
- Commit messages: concise conventional style, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Verified current behavior (for reference)

- No delete/cut path dissolves groups today: `DELETE_CLIP` (clipsReducer.ts:33), `DELETE_TIME_RANGE` (clipsReducer.ts:506), `DELETE_TRACK`/`DELETE_TRACKS` (tracksDomainReducer.ts:126/143), and `handleCut` (clipboardHandlers.ts) all leave 1-member groups behind. The only existing dissolution is inside `GROUP_SELECTED_CLIPS` (clipsReducer.ts:556-570).
- Fresh groupId minting pattern to mirror (clipsReducer.ts:544-546):
  ```ts
  const newGroupId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  ```
- No existing test locks the tether-to-original copy behavior (verified by grep: no `groupId` references in `hooks/handlers/__tests__/` or `utils/__tests__/`). `contexts/__tests__/clipGrouping.test.ts` covers grouping/ungrouping/selection only.
- Clip ids are globally unique across tracks (all id allocators scan every track).

---

### Task 1: `dissolveDegenerateGroups` helper

**Files:**
- Modify: `apps/sandbox/src/contexts/reducers/shared.ts` (append)
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx:14-17` (re-export)
- Test: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts` (append)

**Interfaces:**
- Produces: `dissolveDegenerateGroups(tracks: Track[]): Track[]` — pure; clears `groupId` on every clip whose group has <2 members across all tracks; returns the input array unchanged (same reference) when nothing dissolves. Re-exported from `TracksContext`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts` (it already imports `expandSelectionToGroups, tracksReducer, initialState` and defines the `track()` factory at line 4 — extend the import line with `dissolveDegenerateGroups`):

```ts
describe('dissolveDegenerateGroups', () => {
  it('clears groupId on a group left with one member', () => {
    const tracks: Track[] = [
      track([{ id: 1, groupId: 'g1' }, { id: 2 }]),
    ];
    const result = dissolveDegenerateGroups(tracks);
    expect(result[0].clips.find(c => c.id === 1)?.groupId).toBeUndefined();
  });

  it('leaves groups with 2+ members intact (counted across tracks)', () => {
    const tracks: Track[] = [
      track([{ id: 1, groupId: 'g1' }]),
      track([{ id: 2, groupId: 'g1' }]),
    ];
    const result = dissolveDegenerateGroups(tracks);
    expect(result[0].clips[0].groupId).toBe('g1');
    expect(result[1].clips[0].groupId).toBe('g1');
  });

  it('dissolves only the degenerate group when several groups exist', () => {
    const tracks: Track[] = [
      track([
        { id: 1, groupId: 'lone' },
        { id: 2, groupId: 'pair' },
        { id: 3, groupId: 'pair' },
      ]),
    ];
    const result = dissolveDegenerateGroups(tracks);
    expect(result[0].clips.find(c => c.id === 1)?.groupId).toBeUndefined();
    expect(result[0].clips.find(c => c.id === 2)?.groupId).toBe('pair');
    expect(result[0].clips.find(c => c.id === 3)?.groupId).toBe('pair');
  });

  it('returns the same reference when nothing dissolves', () => {
    const tracks: Track[] = [
      track([{ id: 1, groupId: 'g1' }, { id: 2, groupId: 'g1' }]),
    ];
    expect(dissolveDegenerateGroups(tracks)).toBe(tracks);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipGrouping`
Expected: FAIL — `dissolveDegenerateGroups` is not exported.

- [ ] **Step 3: Implement**

Append to `apps/sandbox/src/contexts/reducers/shared.ts`:

```ts
/**
 * Pure helper: clear `groupId` on every clip belonging to a group with
 * fewer than 2 members (counted across all tracks). Mirrors the
 * dissolve-below-two pass inside GROUP_SELECTED_CLIPS, applied after
 * operations that remove clips from the timeline. Returns the input
 * unchanged when no group is degenerate.
 */
export function dissolveDegenerateGroups(tracks: Track[]): Track[] {
  const counts = new Map<string, number>();
  for (const t of tracks) {
    for (const c of t.clips) {
      if (c.groupId) counts.set(c.groupId, (counts.get(c.groupId) ?? 0) + 1);
    }
  }
  const degenerate = new Set<string>();
  for (const [gid, n] of counts) {
    if (n < 2) degenerate.add(gid);
  }
  if (degenerate.size === 0) return tracks;
  return tracks.map(t => ({
    ...t,
    clips: t.clips.map(c =>
      c.groupId && degenerate.has(c.groupId) ? { ...c, groupId: undefined } : c
    ),
  }));
}
```

Note: `shared.ts` imports `type { Track }` from `../TracksContext` already (line 7); `Track.clips` elements have `groupId?: string` — no new imports needed.

In `apps/sandbox/src/contexts/TracksContext.tsx`, extend the existing re-export (lines 14 and 17):

```ts
import { TRACK_COLOR_PALETTE, expandSelectionToGroups, dissolveDegenerateGroups } from './reducers/shared';
// ...
export { TRACK_COLOR_PALETTE, expandSelectionToGroups, dissolveDegenerateGroups };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipGrouping`
Expected: PASS (all — including the pre-existing tests in the file).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/shared.ts apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "feat(groups): dissolveDegenerateGroups helper (dissolve-below-two)"
```

---

### Task 2: Source-side dissolution in delete/cut paths

**Files:**
- Modify: `apps/sandbox/src/contexts/reducers/clipsReducer.ts` (`DELETE_CLIP` ~line 33-73, `DELETE_TIME_RANGE` ~line 506-526)
- Modify: `apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts` (`DELETE_TRACK` ~line 126-141, `DELETE_TRACKS` ~line 143-160)
- Modify: `apps/sandbox/src/hooks/handlers/clipboardHandlers.ts` (`handleCut`, both `REPLACE_TRACKS_EDIT` dispatches at ~line 95 and ~line 122)
- Test: `apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts` (append)

**Interfaces:**
- Consumes: `dissolveDegenerateGroups` from Task 1 (reducers import from `'./shared'`; the handler imports from `'../../contexts/TracksContext'`).
- Produces: no new API — behavior change only.

- [ ] **Step 1: Write the failing tests**

Append to `clipGrouping.test.ts` (uses the existing `baseState()` factory at line 73 — note it puts all clips on one track; clips get `start: 0, duration: 1` unless overridden):

```ts
describe('group dissolution on delete (source-side corollary)', () => {
  it('DELETE_CLIP dissolves a group that drops to 1 member', () => {
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3 },
    ]);
    const next = tracksReducer(state, { type: 'DELETE_CLIP', payload: { trackIndex: 0, clipId: 2 } });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.groupId).toBeUndefined();
  });

  it('DELETE_CLIP keeps a group that still has 2 members', () => {
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3, groupId: 'g1' },
    ]);
    const next = tracksReducer(state, { type: 'DELETE_CLIP', payload: { trackIndex: 0, clipId: 3 } });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.groupId).toBe('g1');
    expect(next.tracks[0].clips.find(c => c.id === 2)?.groupId).toBe('g1');
  });

  it('DELETE_TIME_RANGE dissolves a group whose member was fully removed', () => {
    // clip 2 occupies [5,6); range [4,7) removes it entirely (split cut mode).
    const state = {
      ...baseState([
        { id: 1, groupId: 'g1', start: 0, duration: 1 },
        { id: 2, groupId: 'g1', start: 5, duration: 1 },
      ]),
      selectedTrackIndices: [0],
      cutMode: 'split' as const,
    };
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 4, endTime: 7 } });
    expect(next.tracks[0].clips.find(c => c.id === 2)).toBeUndefined();
    expect(next.tracks[0].clips.find(c => c.id === 1)?.groupId).toBeUndefined();
  });

  it('DELETE_TRACK dissolves cross-track groups orphaned by the removal', () => {
    const state = {
      ...initialState,
      tracks: [
        track([{ id: 1, groupId: 'g1' }]),
        track([{ id: 2, groupId: 'g1' }]),
      ],
    } as unknown as TracksState;
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 1 });
    expect(next.tracks[0].clips[0].groupId).toBeUndefined();
  });

  it('DELETE_TRACKS dissolves cross-track groups orphaned by the removal', () => {
    const state = {
      ...initialState,
      tracks: [
        track([{ id: 1, groupId: 'g1' }]),
        track([{ id: 2, groupId: 'g1' }]),
        track([{ id: 3, groupId: 'g1' }]),
      ],
    } as unknown as TracksState;
    const next = tracksReducer(state, { type: 'DELETE_TRACKS', payload: [1, 2] });
    expect(next.tracks[0].clips[0].groupId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipGrouping`
Expected: FAIL — the 4 dissolution assertions (`groupId` still `'g1'`).

- [ ] **Step 3: Wire dissolution into the reducers**

`clipsReducer.ts` — add to the imports at the top of the file:

```ts
import { dissolveDegenerateGroups } from './shared';
```

In `DELETE_CLIP` (return statement at ~line 67-72), wrap `newTracks`:

```ts
      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
        clipDurationIndicator: newClipDurationIndicator,
        pianoRollClipIndex: newPianoRollClipIndex,
      };
```

In `DELETE_TIME_RANGE` (return at ~line 522-525), wrap `newTracks`:

```ts
      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
      };
```

`tracksDomainReducer.ts` — add the same import from `'./shared'`. In `DELETE_TRACK` change `tracks: newTracks,` to `tracks: dissolveDegenerateGroups(newTracks),`; in `DELETE_TRACKS` change `tracks: remainingTracks,` to `tracks: dissolveDegenerateGroups(remainingTracks),`.

`clipboardHandlers.ts` — add to imports:

```ts
import { dissolveDegenerateGroups } from '../../contexts/TracksContext';
```

In `handleCut`, wrap both payloads:
- Time-selection path (~line 95): `dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: dissolveDegenerateGroups(tracksAfterCut) });`
- Selected-clips path (~line 122): `dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: dissolveDegenerateGroups(tracksAfterCut) });`

(Both variables are already named `tracksAfterCut`.)

Note: `deleteHandlers.ts` and `AppContextMenus.tsx` `onCut` dispatch `DELETE_CLIP` / `DELETE_TIME_RANGE` / `DELETE_TRACKS`, so they are covered via the reducer changes — no edits there.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipGrouping`
Expected: PASS.

Then run the whole sandbox suite to catch regressions in other reducer tests:
Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/clipsReducer.ts apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts apps/sandbox/src/hooks/handlers/clipboardHandlers.ts apps/sandbox/src/contexts/__tests__/clipGrouping.test.ts
git commit -m "feat(groups): dissolve groups dropping below 2 members on delete/cut"
```

---

### Task 3: `clipGroupCopy` util — entirety + regroup

**Files:**
- Create: `apps/sandbox/src/utils/clipGroupCopy.ts`
- Test: `apps/sandbox/src/utils/__tests__/clipGroupCopy.test.ts`

**Interfaces:**
- Produces (all consumed by Tasks 4-8):
  - `mintGroupId(): string`
  - `computeWholeGroupIds(copiedClips: Pick<Clip, 'id' | 'groupId'>[], sourceTracks: Track[], timeRange?: { startTime: number; endTime: number }): Set<string>` — the source `groupId`s captured whole by this copy: every member of the group is in `copiedClips` (by id) AND, when `timeRange` is given, every member lies entirely inside it (`start >= startTime && start + duration <= endTime` — a member that would be sliced disqualifies the whole group, spec rule 4).
  - `regroupCopiedClips<T extends { groupId?: string }>(copies: T[], wholeGroupIds: ReadonlySet<string>): T[]` — returns new clip objects: members of whole-copied groups get ONE fresh `groupId` per source group (rule 2); everything else gets `groupId: undefined` (rules 1/3/4); a fresh group that would have <2 members in `copies` is dissolved to undefined instead (rule 5).

- [ ] **Step 1: Write the failing tests**

Create `apps/sandbox/src/utils/__tests__/clipGroupCopy.test.ts`. Every behavior-matrix row from the spec is exercised here at the unit level (the handler tasks add integration coverage):

```ts
import { describe, it, expect } from 'vitest';
import { computeWholeGroupIds, regroupCopiedClips, mintGroupId } from '../clipGroupCopy';
import type { Clip, Track } from '../../contexts/TracksContext';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: '',
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const trackOf = (...clips: Clip[]): Track => ({ id: 1, name: 't', clips } as Track);

describe('mintGroupId', () => {
  it('returns distinct non-empty ids', () => {
    const a = mintGroupId();
    const b = mintGroupId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('computeWholeGroupIds', () => {
  const g1a = clip({ id: 1, groupId: 'g1', start: 0 });
  const g1b = clip({ id: 2, groupId: 'g1', start: 2 });
  const loner = clip({ id: 3 });

  it('reports a group whole when every member is in the copied set', () => {
    const tracks = [trackOf(g1a, g1b, loner)];
    expect(computeWholeGroupIds([g1a, g1b], tracks)).toEqual(new Set(['g1']));
  });

  it('reports nothing when only some members are copied (partial -> ungrouped)', () => {
    const tracks = [trackOf(g1a, g1b)];
    expect(computeWholeGroupIds([g1a], tracks).size).toBe(0);
  });

  it('counts members across tracks (cross-track group, one track copied -> partial)', () => {
    const tracks = [trackOf(g1a), trackOf(g1b)];
    expect(computeWholeGroupIds([g1a], tracks).size).toBe(0);
    expect(computeWholeGroupIds([g1a, g1b], tracks)).toEqual(new Set(['g1']));
  });

  it('ungrouped copied clips contribute nothing', () => {
    const tracks = [trackOf(g1a, g1b, loner)];
    expect(computeWholeGroupIds([loner], tracks).size).toBe(0);
  });

  it('time range: whole only when every member is covered untrimmed (rule 4)', () => {
    // g1a spans [0,1), g1b spans [2,3)
    const tracks = [trackOf(g1a, g1b)];
    // Range covers both entirely -> whole
    expect(
      computeWholeGroupIds([g1a, g1b], tracks, { startTime: 0, endTime: 3 })
    ).toEqual(new Set(['g1']));
    // Range slices g1b (ends mid-clip) -> the fragment is not the member -> not whole
    expect(
      computeWholeGroupIds([g1a, g1b], tracks, { startTime: 0, endTime: 2.5 }).size
    ).toBe(0);
  });

  it('handles multiple groups independently', () => {
    const g2a = clip({ id: 4, groupId: 'g2' });
    const g2b = clip({ id: 5, groupId: 'g2' });
    const tracks = [trackOf(g1a, g1b, g2a, g2b)];
    expect(computeWholeGroupIds([g1a, g1b, g2a], tracks)).toEqual(new Set(['g1']));
  });
});

describe('regroupCopiedClips', () => {
  it('whole group -> one fresh shared groupId, never the original (rules 1+2)', () => {
    const copies = [clip({ id: 10, groupId: 'g1' }), clip({ id: 11, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set(['g1']));
    expect(out[0].groupId).toBeDefined();
    expect(out[0].groupId).toBe(out[1].groupId);
    expect(out[0].groupId).not.toBe('g1');
  });

  it('partial group -> ungrouped (rule 3)', () => {
    const copies = [clip({ id: 10, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set());
    expect(out[0].groupId).toBeUndefined();
  });

  it('two whole groups get two distinct fresh ids', () => {
    const copies = [
      clip({ id: 10, groupId: 'g1' }), clip({ id: 11, groupId: 'g1' }),
      clip({ id: 12, groupId: 'g2' }), clip({ id: 13, groupId: 'g2' }),
    ];
    const out = regroupCopiedClips(copies, new Set(['g1', 'g2']));
    expect(out[0].groupId).toBe(out[1].groupId);
    expect(out[2].groupId).toBe(out[3].groupId);
    expect(out[0].groupId).not.toBe(out[2].groupId);
  });

  it('whole group whose copies dwindled below 2 -> ungrouped (rule 5)', () => {
    // e.g. paste dropped sibling copies (out-of-range destination track)
    const copies = [clip({ id: 10, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set(['g1']));
    expect(out[0].groupId).toBeUndefined();
  });

  it('ungrouped copies stay ungrouped; original order preserved', () => {
    const copies = [clip({ id: 10 }), clip({ id: 11, groupId: 'g1' }), clip({ id: 12, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set(['g1']));
    expect(out.map(c => c.id)).toEqual([10, 11, 12]);
    expect(out[0].groupId).toBeUndefined();
  });

  it('successive calls mint different fresh ids (paste twice != one group)', () => {
    const copies = [clip({ id: 10, groupId: 'g1' }), clip({ id: 11, groupId: 'g1' })];
    const first = regroupCopiedClips(copies, new Set(['g1']));
    const second = regroupCopiedClips(copies, new Set(['g1']));
    expect(first[0].groupId).not.toBe(second[0].groupId);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipGroupCopy`
Expected: FAIL — cannot resolve `../clipGroupCopy`.

- [ ] **Step 3: Implement**

Create `apps/sandbox/src/utils/clipGroupCopy.ts`:

```ts
// Clip-group semantics for copied clips.
// Invariant (docs/superpowers/specs/2026-07-07-clip-group-copy-semantics-design.md):
// copies never share a group with their originals; copies form a fresh
// group of their own iff every member of the original group was copied
// whole — otherwise they are ungrouped.
import type { Clip, Track } from '../contexts/TracksContext';

/** Same minting scheme as GROUP_SELECTED_CLIPS in clipsReducer. */
export function mintGroupId(): string {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Which source groupIds does this copy operation capture whole?
 * A group counts iff every member (across all sourceTracks) is present in
 * copiedClips by id AND — when a timeRange bounds the copy — every member
 * lies entirely inside it. A member that would be sliced is a fragment,
 * not the member, so it disqualifies the group (strict entirety).
 */
export function computeWholeGroupIds(
  copiedClips: Pick<Clip, 'id' | 'groupId'>[],
  sourceTracks: Track[],
  timeRange?: { startTime: number; endTime: number },
): Set<string> {
  const copiedIds = new Set(copiedClips.map(c => c.id));
  const candidateGroups = new Set<string>();
  for (const c of copiedClips) {
    if (c.groupId) candidateGroups.add(c.groupId);
  }

  const whole = new Set<string>();
  for (const gid of candidateGroups) {
    let isWhole = true;
    for (const t of sourceTracks) {
      for (const m of t.clips) {
        if (m.groupId !== gid) continue;
        if (!copiedIds.has(m.id)) { isWhole = false; break; }
        if (timeRange && (m.start < timeRange.startTime || m.start + m.duration > timeRange.endTime)) {
          isWhole = false;
          break;
        }
      }
      if (!isWhole) break;
    }
    if (isWhole) whole.add(gid);
  }
  return whole;
}

/**
 * Re-group a set of copies about to be materialized. Members of
 * whole-copied groups share one fresh groupId per source group; all other
 * copies come out ungrouped. A fresh group that would end up with <2
 * members in `copies` is dissolved instead (mirrors dissolve-below-two).
 */
export function regroupCopiedClips<T extends { groupId?: string }>(
  copies: T[],
  wholeGroupIds: ReadonlySet<string>,
): T[] {
  const memberCounts = new Map<string, number>();
  for (const c of copies) {
    if (c.groupId && wholeGroupIds.has(c.groupId)) {
      memberCounts.set(c.groupId, (memberCounts.get(c.groupId) ?? 0) + 1);
    }
  }
  const freshIds = new Map<string, string>();
  for (const [gid, count] of memberCounts) {
    if (count >= 2) freshIds.set(gid, mintGroupId());
  }
  return copies.map(c => ({
    ...c,
    groupId: c.groupId ? freshIds.get(c.groupId) : undefined,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipGroupCopy`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/clipGroupCopy.ts apps/sandbox/src/utils/__tests__/clipGroupCopy.test.ts
git commit -m "feat(groups): clipGroupCopy util — whole-group entirety + copy regrouping"
```

---

### Task 4: Ctrl+D clip duplication path

**Files:**
- Modify: `apps/sandbox/src/hooks/handlers/duplicateHandlers.ts:57-72` (clip path)
- Test: `apps/sandbox/src/hooks/handlers/__tests__/duplicateHandlers.test.ts` (append)

**Interfaces:**
- Consumes: `computeWholeGroupIds`, `regroupCopiedClips` from `'../../utils/clipGroupCopy'` (Task 3).
- Produces: no new API — `handleDuplicate` behavior change (matrix rows: "Ctrl+D whole group → fresh group"; focused-out-of-selection grouped clip → partial → ungrouped).

- [ ] **Step 1: Write the failing tests**

Append to `duplicateHandlers.test.ts` inside `describe('handleDuplicate')`. Test conventions in this file: `makeState`, `keyEvent`, focused DOM element carrying `data-clip-id` + `data-track-index` (see lines 20-29), `afterEach` clears `document.body`.

```ts
  it('duplicating a whole group yields a FRESH group (not the original id)', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], selected: true, groupId: 'g1' },
        { id: 11, name: 'b', start: 2, duration: 1, envelopePoints: [], selected: true, groupId: 'g1' },
      ] }],
    });
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('data-track-index', '0');
    el.setAttribute('tabindex', '-1');
    document.body.appendChild(el);
    el.focus();

    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const dups = dispatch.mock.calls
      .filter(c => c[0].type === 'ADD_CLIP')
      .map(c => c[0].payload.clip);
    expect(dups).toHaveLength(2);
    expect(dups[0].groupId).toBeDefined();
    expect(dups[0].groupId).toBe(dups[1].groupId);
    expect(dups[0].groupId).not.toBe('g1');
  });

  it('duplicating a focused-out-of-selection grouped clip yields an UNGROUPED copy', () => {
    // Focused clip 10 is NOT selected -> only it is duplicated -> partial group.
    const state = makeState({
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        { id: 11, name: 'b', start: 2, duration: 1, envelopePoints: [], groupId: 'g1' },
      ] }],
    });
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('data-track-index', '0');
    el.setAttribute('tabindex', '-1');
    document.body.appendChild(el);
    el.focus();

    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const dups = dispatch.mock.calls
      .filter(c => c[0].type === 'ADD_CLIP')
      .map(c => c[0].payload.clip);
    expect(dups).toHaveLength(1);
    expect(dups[0].groupId).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- duplicateHandlers`
Expected: FAIL — dup `groupId` equals `'g1'` in both new tests (today's tethering bug).

- [ ] **Step 3: Rewire the clip path**

In `duplicateHandlers.ts`, add the import:

```ts
import { computeWholeGroupIds, regroupCopiedClips } from '../../utils/clipGroupCopy';
```

Replace the dispatch loop (currently lines 57-72, `const newSelectionIds ... targets.forEach(...)`) with a build-then-regroup-then-dispatch sequence:

```ts
      // Build all duplicates first, then re-group them per the copy
      // invariant: fresh group iff the whole source group was duplicated,
      // ungrouped otherwise — never tethered to the originals.
      const dupTargets = targets.map(({ trackIndex, clip }) => ({
        trackIndex,
        clip: {
          ...clip,
          id: nextClipId++,
          start: clip.start + clip.duration,
          selected: true,
          sourceClipId: clip.sourceClipId ?? clip.id,
        },
      }));
      const wholeGroups = computeWholeGroupIds(targets.map(t => t.clip), state.tracks);
      const regrouped = regroupCopiedClips(dupTargets.map(d => d.clip), wholeGroups);

      const newSelectionIds: Array<{ trackIndex: number; clipId: number }> = [];
      dupTargets.forEach(({ trackIndex }, i) => {
        const dup = regrouped[i];
        dispatch({
          type: 'ADD_CLIP',
          payload: { trackIndex, clip: dup },
        });
        newSelectionIds.push({ trackIndex, clipId: dup.id });
      });
```

(The `announce(...)` and `SELECT_CLIPS` dispatch after the loop stay as they are.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- duplicateHandlers`
Expected: PASS (3 tests — including the pre-existing placement test).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/duplicateHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/duplicateHandlers.test.ts
git commit -m "feat(groups): Ctrl+D duplicates regroup per copy invariant"
```

---

### Task 5: Track duplication path (keyboard, Ctrl+D on track)

**Files:**
- Modify: `apps/sandbox/src/hooks/handlers/duplicateHandlers.ts:110-128` (track path)
- Test: `apps/sandbox/src/hooks/handlers/__tests__/duplicateHandlers.test.ts` (append)

**Interfaces:**
- Consumes: `computeWholeGroupIds`, `regroupCopiedClips` (import added in Task 4).
- Produces: no new API. Matrix rows: group entirely on duplicated track(s) → fresh group; group spanning a non-duplicated track → ungrouped copies. Entirety is judged on the union of ALL tracks duplicated in one operation.

- [ ] **Step 1: Write the failing tests**

Append to `duplicateHandlers.test.ts`. The track path runs when no clip wrapper has DOM focus — so do NOT create/focus a `[data-clip-id]` element (the `afterEach` at line 9 already resets `document.body`, and `document.activeElement` falls back to `<body>`):

```ts
  it('duplicating a track regroups a same-track group fresh', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      selectedTrackIndices: [],
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        { id: 11, name: 'b', start: 2, duration: 1, envelopePoints: [], groupId: 'g1' },
      ] }],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const added = dispatch.mock.calls.find(c => c[0].type === 'ADD_TRACK')![0].payload;
    expect(added.clips[0].groupId).toBeDefined();
    expect(added.clips[0].groupId).toBe(added.clips[1].groupId);
    expect(added.clips[0].groupId).not.toBe('g1');
  });

  it('duplicating one track of a cross-track group ungroups the copies', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      selectedTrackIndices: [],
      tracks: [
        { id: 1, name: 't1', clips: [
          { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
        { id: 2, name: 't2', clips: [
          { id: 11, name: 'b', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
      ],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const added = dispatch.mock.calls.find(c => c[0].type === 'ADD_TRACK')![0].payload;
    expect(added.clips[0].groupId).toBeUndefined();
  });

  it('duplicating BOTH tracks of a cross-track group keeps the copies grouped (fresh id, spanning both new tracks)', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      selectedTrackIndices: [0, 1],
      tracks: [
        { id: 1, name: 't1', clips: [
          { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
        { id: 2, name: 't2', clips: [
          { id: 11, name: 'b', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
      ],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const addedTracks = dispatch.mock.calls
      .filter(c => c[0].type === 'ADD_TRACK')
      .map(c => c[0].payload);
    expect(addedTracks).toHaveLength(2);
    const [gidA, gidB] = [addedTracks[0].clips[0].groupId, addedTracks[1].clips[0].groupId];
    expect(gidA).toBeDefined();
    expect(gidA).toBe(gidB);
    expect(gidA).not.toBe('g1');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- duplicateHandlers`
Expected: FAIL — cloned clips carry `groupId: 'g1'`.

- [ ] **Step 3: Rewire the track path**

Replace the per-track dispatch loop (currently lines 110-128, `for (const ti of trackIndices) { ... }`) with clone-all-then-regroup-then-dispatch:

```ts
  // Clone every duplicated track's clips first, so group entirety is
  // judged on the union of everything this one operation copies — a
  // group spanning two tracks that are BOTH being duplicated is copied
  // whole and must come out as one fresh group across the new tracks.
  const perTrack: Array<{ ti: number; src: Track; clones: Clip[] }> = [];
  for (const ti of trackIndices) {
    const src = state.tracks[ti];
    if (!src) continue;
    perTrack.push({
      ti,
      src,
      clones: (src.clips ?? []).map((c) => ({
        ...c,
        id: nextClipId++,
        sourceClipId: c.sourceClipId ?? c.id,
      })),
    });
  }
  const sourceClips = perTrack.flatMap((p) => p.src.clips ?? []);
  const wholeGroups = computeWholeGroupIds(sourceClips, state.tracks);
  const regrouped = regroupCopiedClips(perTrack.flatMap((p) => p.clones), wholeGroups);

  let cloneIdx = 0;
  for (const p of perTrack) {
    const clonedClips = p.clones.map(() => regrouped[cloneIdx++]);
    dispatch({
      type: 'ADD_TRACK',
      payload: {
        ...p.src,
        id: nextTrackId++,
        name: `${p.src.name} copy`,
        clips: clonedClips,
        insertAt: p.ti + 1,
      },
    });
  }
```

(`Track` and `Clip` types are already imported at the top of the file. `trackIndices` stays sorted descending — order of `perTrack` doesn't affect regrouping.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- duplicateHandlers`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/duplicateHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/duplicateHandlers.test.ts
git commit -m "feat(groups): track duplication regroups clip copies per copy invariant"
```

---

### Task 6: Clipboard copy/cut capture group entirety

**PRECONDITION:** `useKeyboardShortcuts.ts` must be clean of unrelated WIP (see Global Constraints). Run `git status --short apps/sandbox/src/hooks/useKeyboardShortcuts.ts` — if modified, STOP and resolve before editing.

**Files:**
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:19-23` (`ClipboardState`)
- Modify: `apps/sandbox/src/hooks/handlers/clipboardHandlers.ts` (`handleCopy`, `handleCut`)
- Modify: `apps/sandbox/src/components/AppContextMenus.tsx:159,181` (context-menu cut/copy)
- Test: Create `apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts`

**Interfaces:**
- Consumes: `computeWholeGroupIds` from `'../../utils/clipGroupCopy'`.
- Produces: `ClipboardState.wholeGroupIds?: string[]` — source groupIds captured whole at copy/cut time. Computed against the state AT COPY TIME so paste stays deterministic even if originals change afterwards (spec's chosen approach). Task 7's paste consumes it; absent/undefined means "strip all groupIds".

- [ ] **Step 1: Write the failing tests**

Create `apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { SetStateAction } from 'react';
import { handleCopy, handleCut } from '../clipboardHandlers';
import { initialState, type TracksState, type Clip } from '../../../contexts/TracksContext';
import type { ClipboardState } from '../../useKeyboardShortcuts';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: '',
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const makeDeps = (state: TracksState) => {
  let clipboard: ClipboardState | null = null;
  const setClipboard = vi.fn((v: SetStateAction<ClipboardState | null>) => {
    clipboard = typeof v === 'function' ? v(clipboard) : v;
  });
  return {
    deps: {
      state,
      dispatch: vi.fn(),
      clipboard,
      setClipboard,
      audioManagerRef: { current: null as unknown as AudioPlaybackManager },
    },
    getClipboard: () => clipboard,
  };
};

const stateWith = (tracks: TracksState['tracks'], extra: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, tracks, ...extra } as TracksState);

describe('handleCopy — wholeGroupIds capture', () => {
  it('copying every member of a group records it whole', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, selected: true, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual(['g1']);
  });

  it('copying part of a group records nothing (partial -> ungrouped on paste)', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual([]);
  });

  it('time-selection copy: group whole only when all members covered untrimmed', () => {
    // Members at [0,1) and [2,3). Selection [0,2.5) slices the second -> not whole.
    const state = stateWith(
      [
        { id: 1, name: 't', clips: [
          clip({ id: 10, groupId: 'g1' }),
          clip({ id: 11, groupId: 'g1', start: 2 }),
        ] },
      ],
      { timeSelection: { startTime: 0, endTime: 2.5 }, selectedTrackIndices: [0] },
    );
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.timeSelection).toBeDefined();
    expect(getClipboard()?.wholeGroupIds).toEqual([]);
  });

  it('time-selection copy covering all members whole records the group', () => {
    const state = stateWith(
      [
        { id: 1, name: 't', clips: [
          clip({ id: 10, groupId: 'g1' }),
          clip({ id: 11, groupId: 'g1', start: 2 }),
        ] },
      ],
      { timeSelection: { startTime: 0, endTime: 3 }, selectedTrackIndices: [0] },
    );
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual(['g1']);
  });
});

describe('handleCut — wholeGroupIds capture + source dissolution', () => {
  it('cutting whole group records it whole and removes the clips', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, selected: true, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps, getClipboard } = makeDeps(state);
    handleCut(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual(['g1']);
    expect(deps.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REPLACE_TRACKS_EDIT' })
    );
  });

  it('cutting one member dissolves the survivors below 2 (source-side corollary)', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps } = makeDeps(state);
    handleCut(deps);
    const replace = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls
      .find(c => c[0].type === 'REPLACE_TRACKS_EDIT')![0];
    const survivor = replace.payload[0].clips.find((c: Clip) => c.id === 11);
    expect(survivor.groupId).toBeUndefined();
  });
});
```

Note: the second `handleCut` test also locks in Task 2's dissolution wiring at the handler level.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipboardHandlers`
Expected: FAIL — `wholeGroupIds` is `undefined` (property doesn't exist yet). The dissolution test passes already (Task 2) — that's fine.

- [ ] **Step 3: Implement**

`useKeyboardShortcuts.ts` — extend `ClipboardState` (line 19):

```ts
export interface ClipboardState {
  clips: ((Clip | MidiClip) & { trackIndex: number })[];
  operation: 'copy' | 'cut';
  timeSelection?: { startTime: number; endTime: number };
  /**
   * Source groupIds captured whole (every member, untrimmed) at copy/cut
   * time. Paste mints one fresh groupId per entry; clips from groups not
   * listed here paste ungrouped. Computed at copy time so paste stays
   * deterministic even if the originals change afterwards.
   */
  wholeGroupIds?: string[];
}
```

`clipboardHandlers.ts` — add to imports:

```ts
import { computeWholeGroupIds } from '../../utils/clipGroupCopy';
```

In `handleCopy`, time-selection path (~line 37-41):

```ts
      setClipboard({
        clips: clipsInSelection,
        operation: 'copy',
        timeSelection: { startTime, endTime },
        wholeGroupIds: Array.from(
          computeWholeGroupIds(clipsInSelection, state.tracks, { startTime, endTime })
        ),
      });
```

In `handleCopy`, selected-clips path (~line 57):

```ts
    setClipboard({
      clips: selectedClips,
      operation: 'copy',
      wholeGroupIds: Array.from(computeWholeGroupIds(selectedClips, state.tracks)),
    });
```

In `handleCut`, time-selection path (~line 81-85):

```ts
      setClipboard({
        clips: clipsInSelection,
        operation: 'cut',
        timeSelection: { startTime, endTime },
        wholeGroupIds: Array.from(
          computeWholeGroupIds(clipsInSelection, state.tracks, { startTime, endTime })
        ),
      });
```

In `handleCut`, selected-clips path (~line 112):

```ts
    setClipboard({
      clips: selectedClips,
      operation: 'cut',
      wholeGroupIds: Array.from(computeWholeGroupIds(selectedClips, state.tracks)),
    });
```

IMPORTANT (cut ordering): entirety must be computed against `state.tracks` BEFORE the cut is applied — both cut paths already call `setClipboard` before dispatching `REPLACE_TRACKS_EDIT`, so inserting the computation inside those `setClipboard` calls is correct as-is.

`AppContextMenus.tsx` — the context-menu cut/copy put a SINGLE clip in the clipboard (lines 159 and 181). One clip can never capture a ≥2-member group whole, so record the literal empty list rather than importing the computer. Change both `onClipboardSet` calls:

```ts
// onCut (line ~159):
onClipboardSet({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'cut', wholeGroupIds: [] });
// onCopy (line ~181):
onClipboardSet({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'copy', wholeGroupIds: [] });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipboardHandlers`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/hooks/useKeyboardShortcuts.ts apps/sandbox/src/hooks/handlers/clipboardHandlers.ts apps/sandbox/src/components/AppContextMenus.tsx apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts
git commit -m "feat(groups): clipboard records whole-group capture at copy/cut time"
```

---

### Task 7: Paste regroups the pasted set

**Files:**
- Modify: `apps/sandbox/src/hooks/handlers/clipboardHandlers.ts` (`handlePaste`, after the `clipsByTrack` map is built, ~line 217-229)
- Test: `apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts` (append)

**Interfaces:**
- Consumes: `regroupCopiedClips` from `'../../utils/clipGroupCopy'`; `ClipboardState.wholeGroupIds` from Task 6.
- Produces: no new API. Matrix rows: whole group in clipboard → fresh group per paste (two pastes = two independent groups); partial → ungrouped; clipboard without `wholeGroupIds` → everything ungrouped.

- [ ] **Step 1: Write the failing tests**

Append to `clipboardHandlers.test.ts` (add `handlePaste` to the existing import from `'../clipboardHandlers'`):

```ts
describe('handlePaste — regrouping', () => {
  const groupedClipboardState = () => stateWith(
    [
      { id: 1, name: 't', clips: [
        clip({ id: 10, groupId: 'g1' }),
        clip({ id: 11, groupId: 'g1', start: 2 }),
      ] },
    ],
    { focusedTrackIndex: 0, playheadPosition: 10 },
  );

  const clipboardWith = (wholeGroupIds?: string[]): ClipboardState => ({
    clips: [
      { ...clip({ id: 10, groupId: 'g1' }), trackIndex: 0 },
      { ...clip({ id: 11, groupId: 'g1', start: 2 }), trackIndex: 0 },
    ],
    operation: 'copy',
    ...(wholeGroupIds !== undefined ? { wholeGroupIds } : {}),
  });

  const pastedClips = (dispatch: ReturnType<typeof vi.fn>): Clip[] => {
    const replace = dispatch.mock.calls.find(c => c[0].type === 'REPLACE_TRACKS_EDIT')![0];
    // Pasted copies are the clips whose ids did not exist before (ids 10/11 are the originals).
    return replace.payload[0].clips.filter((c: Clip) => c.id > 11);
  };

  it('whole group in clipboard -> pasted copies share a fresh group', () => {
    const state = groupedClipboardState();
    const { deps } = makeDeps(state);
    handlePaste({ ...deps, clipboard: clipboardWith(['g1']) });
    const pasted = pastedClips(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(pasted).toHaveLength(2);
    expect(pasted[0].groupId).toBeDefined();
    expect(pasted[0].groupId).toBe(pasted[1].groupId);
    expect(pasted[0].groupId).not.toBe('g1');
  });

  it('partial group in clipboard -> pasted copies ungrouped', () => {
    const state = groupedClipboardState();
    const { deps } = makeDeps(state);
    const partial: ClipboardState = {
      clips: [{ ...clip({ id: 10, groupId: 'g1' }), trackIndex: 0 }],
      operation: 'copy',
      wholeGroupIds: [],
    };
    handlePaste({ ...deps, clipboard: partial });
    const pasted = pastedClips(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(pasted).toHaveLength(1);
    expect(pasted[0].groupId).toBeUndefined();
  });

  it('clipboard without wholeGroupIds (legacy/context-menu) -> ungrouped', () => {
    const state = groupedClipboardState();
    const { deps } = makeDeps(state);
    handlePaste({ ...deps, clipboard: clipboardWith(undefined) });
    const pasted = pastedClips(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(pasted.every(c => c.groupId === undefined)).toBe(true);
  });

  it('pasting twice mints two independent fresh groups', () => {
    const state = groupedClipboardState();
    const first = makeDeps(state);
    handlePaste({ ...first.deps, clipboard: clipboardWith(['g1']) });
    const second = makeDeps(state);
    handlePaste({ ...second.deps, clipboard: clipboardWith(['g1']) });
    const a = pastedClips(first.deps.dispatch as ReturnType<typeof vi.fn>)[0].groupId;
    const b = pastedClips(second.deps.dispatch as ReturnType<typeof vi.fn>)[0].groupId;
    expect(a).toBeDefined();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipboardHandlers`
Expected: FAIL — pasted clips carry `groupId: 'g1'` (tethering bug) in all four tests.

- [ ] **Step 3: Implement**

In `clipboardHandlers.ts`, extend the util import:

```ts
import { computeWholeGroupIds, regroupCopiedClips } from '../../utils/clipGroupCopy';
```

In `handlePaste`, immediately AFTER the `clipsByTrack` map is fully built and the MIDI skip announce (after line ~229, before `// Add clips to their respective tracks`), insert:

```ts
  // Re-group the pasted set per the copy invariant: one fresh groupId per
  // source group captured whole at copy time; everything else ungrouped.
  // Runs on the post-drop set (out-of-range/MIDI clips excluded) so a
  // whole group whose siblings were dropped dissolves below two.
  const pastedFlat = Array.from(clipsByTrack.values()).flat();
  const regrouped = regroupCopiedClips(
    pastedFlat,
    new Set(clipboard.wholeGroupIds ?? [])
  );
  let regroupIdx = 0;
  for (const [destIndex, trackClips] of clipsByTrack) {
    clipsByTrack.set(destIndex, trackClips.map(() => regrouped[regroupIdx++]));
  }
```

(Flatten order and per-track order both come from the same map iteration, so the zip-back by index is exact.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipboardHandlers`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/clipboardHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts
git commit -m "feat(groups): paste regroups copies — fresh group per whole-copied source group"
```

---

### Task 8: Context-menu track duplicate path + docs

**PRECONDITION:** `EditorLayout.tsx` must be clean of unrelated WIP (see Global Constraints). Run `git status --short apps/sandbox/src/components/EditorLayout.tsx` — if modified, STOP and resolve before editing.

**Files:**
- Modify: `apps/sandbox/src/components/EditorLayout.tsx:517-552` (`onDuplicateTrack`)
- Modify: `docs/clip-interactions.md` (append section)

**Interfaces:**
- Consumes: `computeWholeGroupIds`, `regroupCopiedClips` from `'../utils/clipGroupCopy'`.
- Produces: no new API. This is the third clone path (track context menu → Duplicate); same union semantics as Task 5. NOTE: this path names copies `` `${name} (copy)` `` while the keyboard path uses `` `${name} copy` `` — that difference is pre-existing and intentional; do NOT unify.

- [ ] **Step 1: Rewire `onDuplicateTrack`**

(No component-level test exists for EditorLayout and standing one up is out of scope; the regroup logic itself is unit-tested in Task 3 and the identical union pattern is handler-tested in Task 5. Type-check + full suite gate this task.)

Add to EditorLayout imports:

```ts
import { computeWholeGroupIds, regroupCopiedClips } from '../utils/clipGroupCopy';
```

Replace the body of `onDuplicateTrack` (lines 517-552) with:

```tsx
          onDuplicateTrack={(trackIndex) => {
            const trackIndices = state.selectedTrackIndices.includes(trackIndex)
              ? [...state.selectedTrackIndices]
              : [trackIndex];

            // Descending so each splice in the reducer doesn't shift
            // the indices we haven't processed yet.
            trackIndices.sort((a, b) => b - a);

            let nextClipId = Math.max(...state.tracks.flatMap((t) => t.clips.map((c) => c.id)), 0) + 1;
            let nextTrackId = Math.max(...state.tracks.map((t) => t.id), 0) + 1;

            // Clone all clips first so group entirety is judged on the
            // union of every track duplicated in this one operation
            // (spec: copies regroup fresh iff the whole group was copied).
            const perTrack = trackIndices.flatMap((idx: number) => {
              const originalTrack = state.tracks[idx];
              if (!originalTrack) return [];
              return [{
                idx,
                originalTrack,
                clones: originalTrack.clips.map((clip) => ({
                  ...clip,
                  id: nextClipId++,
                })),
              }];
            });
            const wholeGroups = computeWholeGroupIds(
              perTrack.flatMap((p) => p.originalTrack.clips),
              state.tracks,
            );
            const regrouped = regroupCopiedClips(
              perTrack.flatMap((p) => p.clones),
              wholeGroups,
            );

            let cloneIdx = 0;
            perTrack.forEach(({ idx, originalTrack, clones }) => {
              const duplicatedTrack = {
                ...originalTrack,
                id: nextTrackId++,
                name: `${originalTrack.name} (copy)`,
                clips: clones.map(() => regrouped[cloneIdx++]),
                // Drop the copy directly after its source so it's
                // adjacent in the side panel rather than floating
                // at the bottom of the track stack.
                insertAt: idx + 1,
              };

              dispatch({
                type: 'ADD_TRACK',
                payload: duplicatedTrack,
              });
            });
          }}
```

- [ ] **Step 2: Type-check and run the suite**

Run: `cd apps/sandbox && npx tsc --noEmit && cd ../..`
Expected: clean.
Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: PASS.

- [ ] **Step 3: Document the invariant**

Append to `docs/clip-interactions.md`:

```markdown
## Clip-group copy semantics

**Invariant:** copies never share a group with their originals. Copies form a
fresh group of their own iff every member of the original group was copied
whole (untrimmed) — otherwise they are ungrouped. A fresh group that would
have fewer than 2 members dissolves to ungrouped.

| Operation | Group situation | Copies come out |
|---|---|---|
| Ctrl+D clip(s) | whole group (selection auto-expands) | fresh group |
| Duplicate track | group entirely on duplicated track(s) | fresh group |
| Duplicate track | group spans a non-duplicated track | ungrouped |
| Copy/cut → paste | whole group in clipboard | fresh group (per paste) |
| Copy/cut → paste | partial members in clipboard | ungrouped |
| Time-selection copy/cut → paste | all members covered whole + untrimmed | fresh group |
| Time-selection copy/cut → paste | any member sliced or omitted | ungrouped |
| Any | fresh group would have <2 members | ungrouped |

**Source-side corollary:** cut, delete-clip, delete-time-range, and
delete-track dissolve any surviving group that drops below 2 members.

Implementation: `apps/sandbox/src/utils/clipGroupCopy.ts` (entirety +
regrouping), `dissolveDegenerateGroups` in `contexts/reducers/shared.ts`.
Design doc: `docs/superpowers/specs/2026-07-07-clip-group-copy-semantics-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add apps/sandbox/src/components/EditorLayout.tsx docs/clip-interactions.md
git commit -m "feat(groups): context-menu track duplicate regroups copies; document invariant"
```

---

### Task 9: Characterization audit + full gates

**Files:**
- Possibly modify: any test found locking old tethering behavior (expected: none — see "Verified current behavior")

- [ ] **Step 1: Audit for tests locking the old behavior**

Run: `grep -rn "groupId" --include="*.test.ts" --include="*.test.tsx" apps/sandbox/src packages/`

Review every hit: any assertion that a COPY (duplicate/paste/clone) carries the ORIGINAL groupId contradicts the new spec and must be updated to assert the new behavior. Expected outcome: only `clipGrouping.test.ts`, `clipGroupCopy.test.ts`, `duplicateHandlers.test.ts`, `clipboardHandlers.test.ts` hits, all already spec-aligned. Report what was found either way.

- [ ] **Step 2: Full gates**

From repo root:

```bash
pnpm guard:any        # any-elimination guard — must stay clean
pnpm test             # full monorepo suite
cd apps/sandbox && npx tsc --noEmit && cd ../..
pnpm build            # all packages + sandbox (tsc && vite build)
```

Expected: all clean/green. Fix anything that fails before proceeding (and re-run all four).

- [ ] **Step 3: Commit (only if audit changed files)**

```bash
git add <changed test files>
git commit -m "test(groups): align characterization tests with copy-semantics spec"
```

- [ ] **Step 4: Manual smoke handoff**

Report completion to the user with the two designer smoke checks from the spec:
1. Duplicate a track holding part of a cross-track group → copies come out ungrouped.
2. Ctrl+D a grouped clip → the duplicate group drags independently of the original group.

---

## Self-review notes (spec → task mapping)

- Rule 1 (no tethering): Tasks 3-8 (every clone path passes through `regroupCopiedClips`, which never emits a source groupId).
- Rule 2 (entirety → fresh group): Task 3 unit rows; Tasks 4 (Ctrl+D), 5 + 8 (track dup union), 7 (paste).
- Rule 3 (partial → ungrouped): Task 3; Tasks 4 (focused-out-of-selection), 5/8 (cross-track partial), 6+7 (clipboard partial).
- Rule 4 (strict entirety under time range): Task 3 (`computeWholeGroupIds` timeRange test), Task 6 (time-selection copy tests).
- Rule 5 (dissolve-below-two on copies): Task 3 (`regroupCopiedClips` count check), exercised end-to-end by paste drop-handling (Task 7 placement after the drop filters).
- Source-side corollary: Tasks 1-2 (+ handler-level lock in Task 6). Current behavior reported: NO delete path dissolves today.
- Copy-time entirety computation (paste determinism): Task 6 (`wholeGroupIds` captured at copy/cut; paste never re-reads source state for entirety).
- MIDI: untouched — `regroupCopiedClips` only runs on audio clips (paste's MIDI skip happens before the regroup insert point); `MidiClip` has no `groupId`.
- Docs: Task 8 (clip-interactions.md); the spec doc itself already references the 2026-05-07 lineage.
