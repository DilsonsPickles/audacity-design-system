# Time-Selection Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Time-selection drags stop changing track selection; the drag's vertical scope lives on `TimeSelection.tracks` and every time-selection operation resolves scope through one shared helper.

**Spec:** `docs/superpowers/specs/2026-07-09-time-selection-scope-design.md` (read before starting any task). Prototype reference: commit `ecc33b5` on `explore/track-selection` — behavior source of truth, but code drifted; always anchor edits on CURRENT file contents, never prototype line numbers.

**Architecture:** New pure helper `resolveTimeSelectionScope` (scope → selectedTracks → caller fallback). `TimeSelection.tracks?: number[]` added to both the sandbox and `@audacity-ui/core` types. Gestures stamp the field (drag: rows crossed; keyboard: focused track); edits preserve it; track delete/move remap it; all consumers resolve through the helper; TrackNew renders three scope states.

**Tech Stack:** TypeScript, React 19, Vitest 4 (per-package: `pnpm --filter @audacity-ui/sandbox test`, `pnpm --filter @audacity-ui/components test`).

## Global Constraints

- Branch: `feat/time-selection-scope` (already checked out; spec committed).
- This is a DELIBERATE BEHAVIOR CHANGE. New tests assert the new spec; update any test locking "drag sets track selection".
- No `any` types (`pnpm guard:any` clean). The prototype's `(timeSelection as any)` casts must NOT be reproduced — extend the prop/interface types instead. Task 6 removes one existing justified cast in TrackNew.
- **Stale dist warning:** sandbox tsc reads `packages/*/dist`. After changing `packages/core` or `packages/components` source, rebuild that package (`pnpm --filter @audacity-ui/core build`, `pnpm --filter @audacity-ui/components build`) before running sandbox tsc or tests that import built output. When tsc reports a type error naming `dist/index`, rebuild before debugging.
- Known pre-existing failures (do NOT try to fix): root `pnpm test` runs without jsdom (Vitest 4 workspace issue); 5 TrackNew.test.tsx failures in packages/components. Gate = sandbox suite fully green + components suite showing ONLY those 5.
- Commit only the files each task names; never `git add -A`. Messages: concise conventional style + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Scope resolution chain, verbatim everywhere: `timeSelection.tracks` (non-empty) → `selectedTrackIndices` (non-empty) → caller-supplied fallback.

---

### Task 1: Types + `resolveTimeSelectionScope` helper

**Files:**
- Modify: `packages/core/src/types/index.ts` (TimeSelection interface, ~line 58)
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (TimeSelection interface — find `interface TimeSelection {` with `renderOnCanvas?:`)
- Create: `apps/sandbox/src/utils/timeSelectionScope.ts`
- Test: `apps/sandbox/src/utils/__tests__/timeSelectionScope.test.ts`

**Interfaces:**
- Produces: `resolveTimeSelectionScope(timeSelection: { tracks?: number[] } | null | undefined, selectedTrackIndices: number[], fallback: number[]): number[]` — consumed by Tasks 3, 4 (indirectly), 5, 7, 8. Also `TimeSelection.tracks?: number[]` on both types (consumed by every later task).

- [ ] **Step 1: Write the failing tests**

Create `apps/sandbox/src/utils/__tests__/timeSelectionScope.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTimeSelectionScope } from '../timeSelectionScope';

describe('resolveTimeSelectionScope', () => {
  it('tier 1: returns the time-selection scope when non-empty', () => {
    expect(
      resolveTimeSelectionScope({ tracks: [2, 3] }, [0, 1], [9]),
    ).toEqual([2, 3]);
  });

  it('tier 2: falls back to selectedTrackIndices when scope is empty or absent', () => {
    expect(resolveTimeSelectionScope({ tracks: [] }, [0, 1], [9])).toEqual([0, 1]);
    expect(resolveTimeSelectionScope({}, [0, 1], [9])).toEqual([0, 1]);
    expect(resolveTimeSelectionScope(null, [0, 1], [9])).toEqual([0, 1]);
  });

  it('tier 3: falls back to the caller fallback when both are empty', () => {
    expect(resolveTimeSelectionScope(null, [], [0, 1, 2])).toEqual([0, 1, 2]);
    expect(resolveTimeSelectionScope(undefined, [], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- timeSelectionScope`
Expected: FAIL — cannot resolve `../timeSelectionScope`.

- [ ] **Step 3: Implement**

Create `apps/sandbox/src/utils/timeSelectionScope.ts`:

```ts
// Scope resolution for time-selection operations.
// Spec: docs/superpowers/specs/2026-07-09-time-selection-scope-design.md
// Time selection and track selection are independent axes; the drag's
// vertical scope lives on the TimeSelection itself. Every consumer
// (delete, copy/cut, Cmd+Arrow promote, drag-clip-in) resolves the
// rows to act on through this one chain.

/**
 * 1. `timeSelection.tracks` — populated by the gesture that made the
 *    selection (drag rows / focused track), when non-empty.
 * 2. `selectedTrackIndices` — legacy fallback, when non-empty.
 * 3. `fallback` — caller-specific (all tracks for delete/copy/cut,
 *    focused-track-or-empty for the Cmd+Arrow promote).
 */
export function resolveTimeSelectionScope(
  timeSelection: { tracks?: number[] } | null | undefined,
  selectedTrackIndices: number[],
  fallback: number[],
): number[] {
  if (timeSelection?.tracks?.length) return timeSelection.tracks;
  if (selectedTrackIndices.length > 0) return selectedTrackIndices;
  return fallback;
}
```

In `packages/core/src/types/index.ts`, extend `TimeSelection` (currently `{ startTime: number; endTime: number; }` at ~line 58):

```ts
export interface TimeSelection {
  startTime: number;
  endTime: number;
  /** Optional list of track indices the selection spans. Populated by
   *  the gesture that created the selection (drag: rows crossed;
   *  keyboard: focused track) so operations and rendering can scope to
   *  those rows independently of the broader track selection. Empty /
   *  undefined = consumers fall back to selectedTrackIndices, then to
   *  their own default scope. */
  tracks?: number[];
}
```

In `apps/sandbox/src/contexts/TracksContext.tsx`, add the same field to the local `TimeSelection` interface (it has `startTime`, `endTime`, `renderOnCanvas?`):

```ts
  /** Tracks the selection spans. Populated by the creating gesture
   *  (drag rows / focused track). Operations resolve scope via
   *  utils/timeSelectionScope.ts: this list → selectedTrackIndices →
   *  operation default. */
  tracks?: number[];
```

- [ ] **Step 4: Rebuild core and run tests**

Run: `pnpm --filter @audacity-ui/core build` (sandbox tsc reads core's dist).
Run: `pnpm --filter @audacity-ui/sandbox test -- timeSelectionScope`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types/index.ts apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/utils/timeSelectionScope.ts apps/sandbox/src/utils/__tests__/timeSelectionScope.test.ts
git commit -m "feat(selection): TimeSelection.tracks scope field + resolution helper"
```

---

### Task 2: Drag gesture stamps scope; Canvas stops selecting tracks

**Files:**
- Modify: `packages/components/src/hooks/useTimeSelection.ts` (5 `onTimeSelectionChange` object sites: 4 resize at ~lines 211-232, 1 create at ~line 303)
- Modify: `apps/sandbox/src/components/Canvas.tsx` (`onSelectedTracksChange` at ~line 569)

**Interfaces:**
- Consumes: `TimeSelection.tracks` (Task 1; core rebuilt).
- Produces: every drag-created selection carries `tracks` (rows crossed); edge-resizes preserve the existing `tracks`; `SET_SELECTED_TRACKS` is never dispatched by canvas drag gestures.

(No new unit tests: this is a mouse-interaction hook with no existing test harness; the behavior is prototype-validated (ecc33b5), consumers are unit-tested in Tasks 3-8, and the change is type-checked. Manual smoke covers the gesture itself.)

- [ ] **Step 1: Stamp scope in `useTimeSelection`**

In the `'create'` branch (~line 303), the current code is:

```ts
        // Normal time selection behavior
        onTimeSelectionChange({
          startTime: Math.min(startTime, endTime),
          endTime: Math.max(startTime, endTime),
        });
        onSelectedTracksChange(selectedIndices);
```

Replace with:

```ts
        // Normal time selection behavior. `tracks` carries the drag's
        // vertical scope so rendering and operations can act on only
        // the rows the drag crossed — selectedTrackIndices is no
        // longer touched by drags (the Canvas consumer is a no-op).
        onTimeSelectionChange({
          startTime: Math.min(startTime, endTime),
          endTime: Math.max(startTime, endTime),
          tracks: selectedIndices,
        });
        onSelectedTracksChange(selectedIndices);
```

(Keep the `onSelectedTracksChange` call — the hook is a shared package API; the sandbox consumer becomes a no-op in Step 2. Do not remove the plain-click restore at ~line 329 either.)

In the FOUR resize sites (`mode === 'resize-start'` ~lines 211/216, `mode === 'resize-end'` ~lines 227/232), each object currently has only `startTime`/`endTime` built from `initialSelection`. Add scope preservation to each, e.g. the first becomes:

```ts
          onTimeSelectionChange({
            startTime: initialSelection.endTime,
            endTime: newStartTime,
            tracks: initialSelection.tracks,
          });
```

Apply `tracks: initialSelection.tracks,` to all four (edge-resizing an existing scoped selection must not drop its scope).

- [ ] **Step 2: No-op the Canvas consumer**

In `apps/sandbox/src/components/Canvas.tsx` (~line 560-569) replace:

```ts
      // Time-selection drags DO update track selection so the user's
      // scope (which tracks the range covers, which tracks a Delete
      // or Cmd+Arrow will act on) follows the drag naturally. A plain
      // click (< 5px) is not a drag — useTimeSelection snapshots
      // `initialSelectedTracks` on startDrag and restores it on
      // mouseup when didActuallyDrag is false, so canvas clicks still
      // leave the pre-existing selection intact.
      onSelectedTracksChange: (trackIndices) => dispatch({ type: 'SET_SELECTED_TRACKS', payload: trackIndices }),
```

with:

```ts
      // Time-selection drags no longer touch `selectedTrackIndices`.
      // The drag's vertical scope is carried on the timeSelection
      // object itself (`tracks`), so operations and rendering can act
      // on the rows the drag crossed while leaving the track
      // selection alone. Track selection stays an explicit gesture.
      onSelectedTracksChange: () => {},
```

- [ ] **Step 3: Rebuild components, type-check, run suites**

Run: `pnpm --filter @audacity-ui/components build`
Run: `cd apps/sandbox && npx tsc --noEmit && cd ../..` — expected clean.
Run: `pnpm --filter @audacity-ui/sandbox test` — all pass.
Run: `pnpm --filter @audacity-ui/components test` — only the 5 known TrackNew failures.

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/hooks/useTimeSelection.ts apps/sandbox/src/components/Canvas.tsx
git commit -m "feat(selection): drags stamp TimeSelection.tracks; canvas drag no longer sets track selection"
```

---

### Task 3: Scoped `DELETE_TIME_RANGE` + `SELECT_CLIPS` stops moving focus

**Files:**
- Modify: `apps/sandbox/src/contexts/reducers/clipsReducer.ts` (`DELETE_TIME_RANGE`, ~line 506)
- Modify: `apps/sandbox/src/contexts/reducers/selectionReducer.ts` (`SELECT_CLIPS`, ~line 53-75)
- Test: Create `apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts`

**Interfaces:**
- Consumes: `resolveTimeSelectionScope` from `'../../utils/timeSelectionScope'` (Task 1).
- Produces: no new API — reducer behavior changes.

- [ ] **Step 1: Write the failing tests**

Create `apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState, type Track, type TracksState, type Clip } from '../TracksContext';

const track = (id: number, clips: Array<Partial<Clip> & { id: number }>): Track => ({
  id,
  name: `t${id}`,
  clips: clips.map((c) => ({
    name: '',
    start: 0,
    duration: 1,
    envelopePoints: [],
    ...c,
  } as Clip)),
} as Track);

const stateWith = (o: Partial<TracksState>): TracksState =>
  ({ ...initialState, ...o } as TracksState);

describe('DELETE_TIME_RANGE scope resolution', () => {
  const twoTracks = () => [
    track(1, [{ id: 10, start: 0, duration: 2 }]),
    track(2, [{ id: 20, start: 0, duration: 2 }]),
  ];

  it('prefers timeSelection.tracks over selectedTrackIndices', () => {
    const state = stateWith({
      tracks: twoTracks(),
      selectedTrackIndices: [0],
      cutMode: 'split',
      timeSelection: { startTime: 0, endTime: 3, tracks: [1] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 0, endTime: 3 } });
    expect(next.tracks[0].clips).toHaveLength(1); // out of scope — untouched
    expect(next.tracks[1].clips).toHaveLength(0); // in scope — cut
  });

  it('falls back to selectedTrackIndices when no scope', () => {
    const state = stateWith({
      tracks: twoTracks(),
      selectedTrackIndices: [0],
      cutMode: 'split',
      timeSelection: { startTime: 0, endTime: 3 },
    });
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 0, endTime: 3 } });
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(1);
  });

  it('falls back to all tracks when neither scope nor selection', () => {
    const state = stateWith({
      tracks: twoTracks(),
      selectedTrackIndices: [],
      cutMode: 'split',
      timeSelection: null,
    });
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 0, endTime: 3 } });
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(0);
  });
});

describe('SELECT_CLIPS focus behavior', () => {
  it('no longer moves focusedTrackIndex to the last selected clip', () => {
    const state = stateWith({
      tracks: [track(1, [{ id: 10 }]), track(2, [{ id: 20 }])],
      focusedTrackIndex: 0,
    });
    const next = tracksReducer(state, {
      type: 'SELECT_CLIPS',
      payload: [{ trackIndex: 1, clipId: 20 }],
    });
    expect(next.tracks[1].clips[0].selected).toBe(true);
    expect(next.focusedTrackIndex).toBe(0); // unmoved
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- timeSelectionScope.reducer`
Expected: FAIL — first test cuts track 0 (selectedTrackIndices wins today); SELECT_CLIPS test sees `focusedTrackIndex === 1`.

- [ ] **Step 3: Implement**

`clipsReducer.ts` — add import:

```ts
import { resolveTimeSelectionScope } from '../../utils/timeSelectionScope';
```

In `DELETE_TIME_RANGE`, replace:

```ts
      // If no tracks are selected, apply cut to all tracks
      const trackIndicesToCut = state.selectedTrackIndices.length > 0
        ? state.selectedTrackIndices
        : state.tracks.map((_, idx) => idx);
```

with:

```ts
      // Scope: the selection's own tracks (drag/keyboard gesture) →
      // selectedTrackIndices → all tracks.
      const trackIndicesToCut = resolveTimeSelectionScope(
        state.timeSelection,
        state.selectedTrackIndices,
        state.tracks.map((_, idx) => idx),
      );
```

`selectionReducer.ts` — in `SELECT_CLIPS` (~line 70-75), replace:

```ts
      const last = action.payload[action.payload.length - 1];
      // Track selection intentionally left untouched — clip
      // selection no longer implies track selection.
      return {
        ...state,
        tracks: expandedTracks,
        focusedTrackIndex: last ? last.trackIndex : state.focusedTrackIndex,
```

with:

```ts
      // Track selection and focus are intentionally left untouched.
      // Clip selection no longer implies track selection, and moving
      // focus to the last clip's track was silently dragging the
      // user's focus during automatic promotes (e.g. Cmd+Arrow on a
      // time selection spanning many rows). Callers that want focus
      // to follow dispatch SET_FOCUSED_TRACK themselves.
      return {
        ...state,
        tracks: expandedTracks,
```

(Delete the `const last = ...` line if it becomes unused; keep everything else in the return object.)

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @audacity-ui/sandbox test -- timeSelectionScope.reducer`
Expected: PASS.
Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: all pass — if any existing test asserted the old focus-nudge or selectedTracks-scoped delete, update it to the new spec and note it in your report.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/clipsReducer.ts apps/sandbox/src/contexts/reducers/selectionReducer.ts apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts
git commit -m "feat(selection): DELETE_TIME_RANGE resolves scope; SELECT_CLIPS keeps focus"
```

---

### Task 4: Scope integrity — track delete/move remap `timeSelection.tracks`

**Files:**
- Modify: `apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts` (`DELETE_TRACK` ~line 126, `DELETE_TRACKS` ~line 143, `MOVE_TRACK` ~line 162)
- Test: `apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts` (append)

**Interfaces:**
- Consumes: `TimeSelection.tracks` (Task 1).
- Produces: a module-local pure helper in `tracksDomainReducer.ts`: `remapTimeSelectionTracks(timeSelection, remap: (i: number) => number | null)` returning the updated `timeSelection` (or `null` when the remap empties a previously non-empty scope — the rows the selection was scoped to are gone, so the selection goes away rather than silently rescoping).

- [ ] **Step 1: Write the failing tests**

Append to `timeSelectionScope.reducer.test.ts`:

```ts
describe('scope integrity under track delete/move', () => {
  const threeTracks = () => [
    track(1, [{ id: 10 }]),
    track(2, [{ id: 20 }]),
    track(3, [{ id: 30 }]),
  ];

  it('DELETE_TRACK shifts scope indices above the deleted track', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [1, 2] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 0 });
    expect(next.timeSelection?.tracks).toEqual([0, 1]);
  });

  it('DELETE_TRACK drops the deleted track from the scope', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [1, 2] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 1 });
    expect(next.timeSelection?.tracks).toEqual([1]);
  });

  it('DELETE_TRACK clears the whole time selection when the scope empties', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [1] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 1 });
    expect(next.timeSelection).toBeNull();
  });

  it('DELETE_TRACKS drops and shifts scope indices', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [0, 2] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACKS', payload: [1] });
    expect(next.timeSelection?.tracks).toEqual([0, 1]);
  });

  it('MOVE_TRACK remaps scope indices to follow the reorder', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [0] },
    });
    const next = tracksReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 2 } });
    expect(next.timeSelection?.tracks).toEqual([2]);
  });

  it('leaves a scopeless time selection untouched', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1 },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 0 });
    expect(next.timeSelection).toEqual({ startTime: 0, endTime: 1 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- timeSelectionScope.reducer`
Expected: FAIL — scope indices unchanged (stale) in every new test.

- [ ] **Step 3: Implement**

Add to `tracksDomainReducer.ts` (top of file, after imports):

```ts
/** Remap a time-selection's scope after tracks are removed or
 *  reordered. `remap` returns the new index for an old index, or null
 *  to drop it. If the remap empties a previously non-empty scope the
 *  whole selection is cleared — the rows it was scoped to are gone. */
function remapTimeSelectionTracks(
  timeSelection: TracksState['timeSelection'],
  remap: (index: number) => number | null,
): TracksState['timeSelection'] {
  if (!timeSelection?.tracks?.length) return timeSelection;
  const remapped = timeSelection.tracks
    .map(remap)
    .filter((i): i is number => i !== null)
    .sort((a, b) => a - b);
  if (remapped.length === 0) return null;
  return { ...timeSelection, tracks: remapped };
}
```

(`TracksState` is already imported as a type in this file; verify and add to the type import if not.)

Wire it into the three cases, mirroring how each already remaps `selectedTrackIndices`:

`DELETE_TRACK` — add to the return object:

```ts
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) =>
          i === action.payload ? null : i > action.payload ? i - 1 : i,
        ),
```

`DELETE_TRACKS` — with the existing `indicesToDelete` set in scope, add:

```ts
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) =>
          indicesToDelete.has(i)
            ? null
            : i - [...indicesToDelete].filter((d) => d < i).length,
        ),
```

`MOVE_TRACK` — anchor on the existing `newSelected = state.selectedTrackIndices.map(...)` remap logic and apply the SAME from/to index arithmetic through `remapTimeSelectionTracks` on the return object. The standard move remap:

```ts
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) => {
          if (i === fromIndex) return toIndex;
          if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
          if (fromIndex > toIndex && i >= toIndex && i < fromIndex) return i + 1;
          return i;
        }),
```

(Before using this block verbatim, read the existing `selectedTrackIndices` remap in `MOVE_TRACK` — if its arithmetic differs, mirror THAT exactly and note it in your report.)

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @audacity-ui/sandbox test -- timeSelectionScope.reducer` — PASS.
Run: `pnpm --filter @audacity-ui/sandbox test` — all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts
git commit -m "feat(selection): track delete/move remap timeSelection scope indices"
```

---

### Task 5: Keyboard selections stamp scope; edits preserve it

**Files:**
- Modify: `apps/sandbox/src/hooks/handlers/navigationHandlers.ts` (Shift+Home/End branches, `SET_TIME_SELECTION` at ~lines 31/58)
- Modify: `apps/sandbox/src/hooks/handlers/playheadSelectionHandlers.ts` (`SET_TIME_SELECTION` at ~line 93 and any creation site in the same handler)
- Test: Create `apps/sandbox/src/hooks/handlers/__tests__/navigationHandlers.test.ts`

**Interfaces:**
- Consumes: `TimeSelection.tracks` (Task 1).
- Produces: the stamp rule used by every keyboard dispatch of a non-null `SET_TIME_SELECTION`: `tracks: state.timeSelection?.tracks ?? (state.focusedTrackIndex != null ? [state.focusedTrackIndex] : undefined)` — an existing scope is preserved, a fresh selection is scoped to the focused track.

- [ ] **Step 1: Sweep for creation sites**

Run: `grep -rn "SET_TIME_SELECTION" apps/sandbox/src/hooks apps/sandbox/src/components --include="*.ts*" | grep -v "payload: null"`
Expected known sites: `navigationHandlers.ts` (2), `playheadSelectionHandlers.ts` (1), plus Canvas pass-throughs that forward a hook-produced selection object unchanged (leave those alone — the hook already stamps). If the sweep finds additional handler-built payloads, apply the same stamp rule and list them in your report.

- [ ] **Step 2: Write the failing tests**

Create `apps/sandbox/src/hooks/handlers/__tests__/navigationHandlers.test.ts` (conventions per `duplicateHandlers.test.ts`: `makeState` on `initialState`, `keyEvent` factory, `vi.fn()` dispatch):

```ts
import { describe, it, expect, vi } from 'vitest';
import { handleHomeEnd } from '../navigationHandlers';
import { initialState, type TracksState } from '../../../contexts/TracksContext';

const makeState = (o: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, ...o } as TracksState);

const keyEvent = (over: Record<string, unknown> = {}) =>
  ({ key: 'Home', shiftKey: true, preventDefault: () => {}, ...over } as unknown as KeyboardEvent);

const makeDeps = (state: TracksState) => ({
  state,
  dispatch: vi.fn(),
  selectionAnchorRef: { current: null as number | null },
  selectionEdgesRef: { current: null },
  scrollPlayheadIntoView: () => {},
});

const tsPayloads = (dispatch: ReturnType<typeof vi.fn>) =>
  dispatch.mock.calls.filter((c) => c[0].type === 'SET_TIME_SELECTION').map((c) => c[0].payload);

describe('handleHomeEnd — scope stamping', () => {
  it('Shift+Home stamps the focused track as scope and does not touch track selection', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [] },
        { id: 2, name: 't2', clips: [] },
      ] as TracksState['tracks'],
      focusedTrackIndex: 1,
      playheadPosition: 5,
      selectedTrackIndices: [],
    });
    const deps = makeDeps(state);
    handleHomeEnd(keyEvent(), deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([1]);
    const types = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('SET_SELECTED_TRACKS');
  });

  it('Shift+Home preserves an existing scope instead of restamping', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [] },
        { id: 2, name: 't2', clips: [] },
      ] as TracksState['tracks'],
      focusedTrackIndex: 0,
      playheadPosition: 5,
      timeSelection: { startTime: 2, endTime: 5, tracks: [1] },
    });
    const deps = makeDeps(state);
    deps.selectionAnchorRef.current = 5;
    handleHomeEnd(keyEvent(), deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([1]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- navigationHandlers`
Expected: FAIL — `payload.tracks` undefined, and today's code DOES dispatch `SET_SELECTED_TRACKS` (all tracks) in the first test.

- [ ] **Step 4: Implement**

In `navigationHandlers.ts` `handleHomeEnd`, BOTH shift branches (Home and End) currently contain this block — DELETE it from both:

```ts
        if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
          const allTrackIndices = state.tracks.map((_, idx) => idx);
          dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
        }
```

and extend both `SET_TIME_SELECTION` payloads with the stamp rule. Home branch:

```ts
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: {
          startTime: 0,
          endTime: selectionAnchorRef.current,
          // Preserve an existing scope; a fresh keyboard selection is
          // scoped to the focused track (spec: the gesture defines
          // the scope). No scope when nothing is focused — consumers
          // fall back to selectedTrackIndices, then all tracks.
          tracks: state.timeSelection?.tracks
            ?? (state.focusedTrackIndex != null ? [state.focusedTrackIndex] : undefined),
        },
      });
```

End branch: same `tracks:` expression with its existing `startTime: selectionAnchorRef.current, endTime: projectEnd`.

In `playheadSelectionHandlers.ts`, the `SET_TIME_SELECTION` dispatch (~line 92-98) rebuilds the payload from `selectionEdgesRef` — add the same `tracks:` expression to that payload object (it serves both creation and per-keypress edits, and the expression handles both: existing scope wins, otherwise focused track). If the handler has a separate initialization site that first materializes the selection, stamp it there too with the same expression.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @audacity-ui/sandbox test -- navigationHandlers` — PASS.
Run: `pnpm --filter @audacity-ui/sandbox test` — all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/navigationHandlers.ts apps/sandbox/src/hooks/handlers/playheadSelectionHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/navigationHandlers.test.ts
git commit -m "feat(selection): keyboard selections stamp focused-track scope, edits preserve it"
```

---

### Task 6: Scoped promote paths + TrackNew scope rendering

**Files:**
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (Cmd+Arrow horizontal promote, `scopedTrackIndices` at ~line 663)
- Modify: `apps/sandbox/src/components/Canvas.tsx` (Cmd+Arrow vertical promote, `scopedTrackIndices` at ~line 1139)
- Modify: `apps/sandbox/src/hooks/useClipMouseDown.ts` (`scopedTrackIndices` at ~line 146)
- Modify: `packages/components/src/Track/TrackNew.tsx` (prop type ~line 193, `inTimeSelection` ~line 877, overlay ~line 1084)

**Interfaces:**
- Consumes: `resolveTimeSelectionScope` (Task 1) in the three sandbox files; `TimeSelection.tracks` in TrackNew via its own inline prop type.
- Produces: TrackNew prop type becomes `timeSelection?: { startTime: number; endTime: number; tracks?: number[]; renderOnCanvas?: boolean } | null;` — Canvas already passes the full object; no caller changes.

(No new unit tests in this task: the three promote paths live inline in large interaction hooks with no existing harness; the scope chain itself is unit-tested (Task 1) and the reducer/handler consumers are covered in Tasks 3-5, 7. TrackNew rendering changes land where the 5 pre-existing test failures live — adding tests there is blocked on chip task_42f3bea7. Manual smoke covers visuals.)

- [ ] **Step 1: useKeyboardShortcuts promote scope**

Add import (the file already imports from `../utils/...`):

```ts
import { resolveTimeSelectionScope } from '../utils/timeSelectionScope';
```

Replace (~line 663):

```ts
          const scopedTrackIndices = state.selectedTrackIndices?.length
            ? state.selectedTrackIndices
            : state.focusedTrackIndex !== null && state.focusedTrackIndex !== undefined
              ? [state.focusedTrackIndex]
              : [];
```

with:

```ts
          // Scope chain matches DELETE_TIME_RANGE: the selection's own
          // tracks (the rows the user drew across) → legacy
          // selectedTrackIndices → focused track.
          const scopedTrackIndices = resolveTimeSelectionScope(
            state.timeSelection,
            state.selectedTrackIndices ?? [],
            state.focusedTrackIndex !== null && state.focusedTrackIndex !== undefined
              ? [state.focusedTrackIndex]
              : [],
          );
```

- [ ] **Step 2: Canvas vertical promote scope**

Add the same import to `Canvas.tsx` (`from '../utils/timeSelectionScope'`). Replace (~line 1139):

```ts
                      const scopedTrackIndices = selectedTrackIndices.length > 0
                        ? selectedTrackIndices
                        : [trackIndex];
```

with:

```ts
                      const scopedTrackIndices = resolveTimeSelectionScope(
                        timeSelection,
                        selectedTrackIndices,
                        [trackIndex],
                      );
```

- [ ] **Step 3: useClipMouseDown scope**

Add the same import (`from '../utils/timeSelectionScope'`). Replace (~line 146):

```ts
              const scopedTrackIndices = (selectedTrackIndices && selectedTrackIndices.length > 0)
                ? selectedTrackIndices
                : tracks.map((_, idx) => idx);
```

with:

```ts
              // Same chain as delete/copy: the drag's own rows first,
              // so drag-into-time-selection sweeps what the user drew.
              const scopedTrackIndices = resolveTimeSelectionScope(
                timeSelection,
                selectedTrackIndices ?? [],
                tracks.map((_, idx) => idx),
              );
```

(If `timeSelection`'s local type in this hook lacks `tracks`, extend that local type with `tracks?: number[]` rather than casting.)

- [ ] **Step 4: TrackNew three-state rendering**

Prop type (~line 193): replace

```ts
  timeSelection?: { startTime: number; endTime: number } | null;
```

with

```ts
  timeSelection?: { startTime: number; endTime: number; tracks?: number[]; renderOnCanvas?: boolean } | null;
```

Near the top of the component body (after `trackColor`, ~line 397), add:

```ts
  // Scope for the time-selection band. When the selection carries its
  // own tracks list (populated by the creating gesture), highlight
  // only those rows — independent of the broader track selection.
  // Falls back to the legacy isSelected-driven look for scopeless
  // selections.
  const inTimeSelectionScope = timeSelection?.tracks
    ? timeSelection.tracks.includes(trackIndex)
    : isSelected;
```

`inTimeSelection` prop (~line 877): replace

```ts
            inTimeSelection={timeSelection && isSelected && (timeSelection as any).renderOnCanvas !== false ? ( // justified: renderOnCanvas is a non-standard extension on TimeSelection — pending components sweep
              clip.start < timeSelection.endTime && (clip.start + clip.duration) > timeSelection.startTime
            ) : false}
```

with (the cast dies — `renderOnCanvas` is now on the prop type):

```ts
            inTimeSelection={timeSelection && inTimeSelectionScope && timeSelection.renderOnCanvas !== false ? (
              clip.start < timeSelection.endTime && (clip.start + clip.duration) > timeSelection.startTime
            ) : false}
```

Overlay color in `renderTimeSelectionOverlay` (~line 1090): replace

```ts
    // Selected tracks: #647F8F when dragging, #627788 when finalized
    // Unselected tracks: #313846
    // Use rgba so grid lines remain visible through the selection
    const overlayColor = isSelected
      ? (isTimeSelectionDragging ? 'rgba(100, 127, 143, 0.55)' : 'rgba(98, 119, 136, 0.55)')
      : 'rgba(49, 56, 70, 0.55)';
```

with:

```ts
    // Three states (spec: time-selection scope rendering):
    //   in scope                → bright band (drag color)
    //   selected, out of scope  → subtle white wash so the selected
    //                             fill reads through — no muddy dulling
    //   unselected, out of scope→ original dim band
    // rgba keeps grid lines visible through the selection.
    let overlayColor: string;
    if (inTimeSelectionScope) {
      overlayColor = isTimeSelectionDragging
        ? 'rgba(100, 127, 143, 0.55)'
        : 'rgba(98, 119, 136, 0.55)';
    } else if (isSelected) {
      overlayColor = 'rgba(255, 255, 255, 0.08)';
    } else {
      overlayColor = 'rgba(49, 56, 70, 0.55)';
    }
```

- [ ] **Step 5: Rebuild, type-check, run suites**

Run: `pnpm --filter @audacity-ui/components build`
Run: `cd apps/sandbox && npx tsc --noEmit && cd ../..` — clean.
Run: `pnpm --filter @audacity-ui/sandbox test` — all pass.
Run: `pnpm --filter @audacity-ui/components test` — only the 5 known TrackNew failures (your change must not add a 6th).

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/hooks/useKeyboardShortcuts.ts apps/sandbox/src/components/Canvas.tsx apps/sandbox/src/hooks/useClipMouseDown.ts packages/components/src/Track/TrackNew.tsx
git commit -m "feat(selection): promote paths resolve scope; TrackNew renders three scope states"
```

---

### Task 7: Clipboard copy/cut resolve scope (incl. wholeGroupIds)

**Files:**
- Modify: `apps/sandbox/src/hooks/handlers/clipboardHandlers.ts` (`handleCopy` time-selection branch ~line 20-44, `handleCut` time-selection branch ~line 65-99)
- Test: `apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts` (append)

**Interfaces:**
- Consumes: `resolveTimeSelectionScope` (Task 1); existing `computeWholeGroupIds` and `dissolveDegenerateGroups` wiring stays.
- Produces: no new API. Copy/cut of a time selection collect clips from, cut from, and compute group entirety against the SAME resolved scope.

- [ ] **Step 1: Write the failing tests**

Append to `clipboardHandlers.test.ts` (reuse the existing `clip`, `makeDeps`, `stateWith` helpers):

```ts
describe('time-selection copy/cut — scope resolution', () => {
  const scopedState = () => stateWith(
    [
      { id: 1, name: 't1', clips: [clip({ id: 10 })] },
      { id: 2, name: 't2', clips: [clip({ id: 20 })] },
    ],
    {
      selectedTrackIndices: [0],
      timeSelection: { startTime: 0, endTime: 2, tracks: [1] },
      cutMode: 'split',
    },
  );

  it('copy collects clips from the selection scope, not selectedTrackIndices', () => {
    const { deps, getClipboard } = makeDeps(scopedState());
    handleCopy(deps);
    expect(getClipboard()?.clips.map((c) => c.id)).toEqual([20]);
  });

  it('cut removes clips only from the selection scope', () => {
    const { deps } = makeDeps(scopedState());
    handleCut(deps);
    const replace = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls
      .find((c) => c[0].type === 'REPLACE_TRACKS_EDIT')![0];
    expect(replace.payload[0].clips).toHaveLength(1); // out of scope — kept
    expect(replace.payload[1].clips).toHaveLength(0); // in scope — cut
  });

  it('wholeGroupIds respects the scope: a group member outside the scope makes the capture partial', () => {
    const state = stateWith(
      [
        { id: 1, name: 't1', clips: [clip({ id: 10, groupId: 'g1' })] },
        { id: 2, name: 't2', clips: [clip({ id: 20, groupId: 'g1' })] },
      ],
      {
        selectedTrackIndices: [],
        timeSelection: { startTime: 0, endTime: 2, tracks: [1] },
      },
    );
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.clips.map((c) => c.id)).toEqual([20]);
    expect(getClipboard()?.wholeGroupIds).toEqual([]); // member 10 not captured
  });
});
```

NOTE: `stateWith` in this file takes `(tracks, extra)` — match its existing signature; if it differs from the above, adapt the calls, not the helper.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipboardHandlers`
Expected: FAIL — copy collects clip 10 (selectedTrackIndices wins today).

- [ ] **Step 3: Implement**

Extend the existing util import in `clipboardHandlers.ts`:

```ts
import { resolveTimeSelectionScope } from '../../utils/timeSelectionScope';
```

In `handleCopy`'s time-selection branch, replace:

```ts
    // Collect clips that intersect with the time selection on selected tracks
    const selectedTracks = state.selectedTrackIndices;
    const clipsInSelection: (Clip & { trackIndex: number })[] = [];
    state.tracks.forEach((track, trackIndex) => {
      if (selectedTracks.length > 0 && !selectedTracks.includes(trackIndex)) return;
```

with:

```ts
    // Collect clips that intersect the time selection on the tracks in
    // the selection's scope (drag rows → selectedTracks → all).
    const scopedTracks = resolveTimeSelectionScope(
      state.timeSelection,
      state.selectedTrackIndices,
      state.tracks.map((_, idx) => idx),
    );
    const clipsInSelection: (Clip & { trackIndex: number })[] = [];
    state.tracks.forEach((track, trackIndex) => {
      if (!scopedTracks.includes(trackIndex)) return;
```

`handleCut`'s time-selection branch: apply the SAME replacement to its identical collection block, and replace its `applySplitCut` scope argument:

```ts
      const tracksAfterCut = applySplitCut(
        state.tracks,
        startTime,
        endTime,
        selectedTracks.length > 0 ? selectedTracks : state.tracks.map((_, i) => i)
      );
```

with:

```ts
      const tracksAfterCut = applySplitCut(
        state.tracks,
        startTime,
        endTime,
        scopedTracks
      );
```

(The `computeWholeGroupIds(clipsInSelection, state.tracks, { startTime, endTime })` calls need no change — scope filtering happens in the collection step, and entirety is judged against ALL tracks by design: a member on an out-of-scope track is simply absent from `clipsInSelection`, which is exactly what makes the capture partial. The `dissolveDegenerateGroups` wrapping from the clip-group feature stays untouched.)

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @audacity-ui/sandbox test -- clipboardHandlers` — PASS (all, including the clip-group tests).
Run: `pnpm --filter @audacity-ui/sandbox test` — all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/clipboardHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/clipboardHandlers.test.ts
git commit -m "feat(selection): time-selection copy/cut resolve scope; group capture follows scope"
```

---

### Task 8: Cmd+Click / Cmd+Enter scope editing in EditorLayout

**Files:**
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (`onToggleSelection` ~line 867; keyboard Cmd+Enter `toggleTrackSelection` call ~line 1311)

**Interfaces:**
- Consumes: `TimeSelection.tracks` (Task 1); existing `toggleTrackSelection` util.
- Produces: local helper inside `EditorLayout`: `toggleScopeOrTrackSelection(index: number): void`.

(No new unit tests: EditorLayout has no component harness — same rationale as the clip-group feature's Task 8. The dispatch payload logic is trivial and type-checked; manual smoke covers it.)

- [ ] **Step 1: Add the local helper**

Inside `EditorLayout` (near the other track-selection handlers, before the JSX return), add:

```ts
  // Cmd+Click / Cmd+Enter on a track panel row. With a scoped time
  // selection active, the gesture edits the SELECTION SCOPE — which
  // rows the time selection covers — and leaves the track selection
  // alone (the two axes are independent). Without one, it falls back
  // to the classic track-selection toggle.
  const toggleScopeOrTrackSelection = (index: number) => {
    const ts = state.timeSelection;
    if (ts?.tracks?.length) {
      const nextTracks = ts.tracks.includes(index)
        ? ts.tracks.filter((i) => i !== index)
        : [...ts.tracks, index].sort((a, b) => a - b);
      // Toggling the last row out clears the selection — an empty
      // scope has nothing left to act on (same rule as track-delete
      // remapping).
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: nextTracks.length > 0 ? { ...ts, tracks: nextTracks } : null,
      });
      // Plant the anchor at the toggled row so a subsequent
      // Shift+Enter extends the track selection from here.
      setSelectionAnchor(index);
      return;
    }
    toggleTrackSelection(index, state.selectedTrackIndices, dispatch);
    setSelectionAnchor(index);
  };
```

- [ ] **Step 2: Wire both call sites**

Mouse site (~line 867) — replace:

```ts
                onToggleSelection={() => {
                  toggleTrackSelection(index, state.selectedTrackIndices, dispatch);
                  // Cmd+Click also plants the anchor so subsequent
                  // Shift+Enter extends from the just-toggled row.
                  setSelectionAnchor(index);
                }}
```

with:

```ts
                onToggleSelection={() => toggleScopeOrTrackSelection(index)}
```

Keyboard site (~line 1311) — replace:

```ts
                      } else if (modifiers.metaKey || modifiers.ctrlKey) {
                        toggleTrackSelection(trackIndex, state.selectedTrackIndices, dispatch);
                      } else {
```

with:

```ts
                      } else if (modifiers.metaKey || modifiers.ctrlKey) {
                        toggleScopeOrTrackSelection(trackIndex);
                      } else {
```

NOTE: the keyboard site previously did NOT plant the selection anchor; the helper does. This is a deliberate unification (mouse and keyboard Cmd+toggle now behave identically) — call it out in your report so the reviewer sees it was intentional.

- [ ] **Step 3: Type-check and run the suite**

Run: `cd apps/sandbox && npx tsc --noEmit && cd ../..` — clean.
Run: `pnpm --filter @audacity-ui/sandbox test` — all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/sandbox/src/components/EditorLayout.tsx
git commit -m "feat(selection): Cmd+Click/Cmd+Enter toggle rows in an active selection scope"
```

---

### Task 9: Characterization audit, docs, version, full gates

**Files:**
- Modify: `docs/clip-interactions.md` (append section)
- Modify: `apps/desktop/package.json` (version)
- Possibly modify: tests found locking the old coupled behavior

- [ ] **Step 1: Characterization audit**

Run: `grep -rln "SET_SELECTED_TRACKS\|selectedTrackIndices" --include="*.test.ts" --include="*.test.tsx" apps/sandbox/src packages/`
Review hits for assertions that (a) a time-selection drag or Shift+Home/End sets track selection, or (b) `DELETE_TIME_RANGE`/copy/cut scope by selected tracks in the presence of a scoped selection. Update any to the new spec; report findings either way.

- [ ] **Step 2: Docs**

Append to `docs/clip-interactions.md`:

```markdown
## Time-selection scope

Time selection and track selection are independent axes. Dragging a time
selection never changes the track selection; the drag's vertical scope is
carried on the selection itself (`TimeSelection.tracks`). Keyboard-created
selections are scoped to the focused track; edits (edge drags, Shift+Arrow
nudges) preserve the existing scope.

**Scope resolution** (`apps/sandbox/src/utils/timeSelectionScope.ts`), used
by delete-time-range, time-selection copy/cut (including clip-group
whole-capture), Cmd+Arrow promotes, and drag-clip-into-selection:
`timeSelection.tracks` → `selectedTrackIndices` → operation default
(all tracks, or the focused track for promotes).

**Scope editing:** Cmd+Click or Cmd+Enter on a track panel row toggles that
row in/out of an active scope (track selection untouched); with no active
scope they toggle track selection as before. Deleting or reordering tracks
remaps the scope; a scope emptied by track deletion clears the selection.

Rendering (`TrackNew`): in-scope rows get the bright band; selected
out-of-scope rows a subtle white wash; unselected out-of-scope rows the dim
band.

Design doc: `docs/superpowers/specs/2026-07-09-time-selection-scope-design.md`.
```

- [ ] **Step 3: Desktop version bump**

In `apps/desktop/package.json`: `"version": "0.7.0"` → `"version": "0.8.0"`.

- [ ] **Step 4: Full gates**

```bash
pnpm guard:any                                   # clean
pnpm --filter @audacity-ui/core build && pnpm --filter @audacity-ui/components build
cd apps/sandbox && npx tsc --noEmit && cd ../..  # clean
pnpm --filter @audacity-ui/sandbox test          # all green
pnpm --filter @audacity-ui/components test    # only the 5 known TrackNew failures
pnpm build                                       # exit 0 (retry once if a tsup step flakes)
```

- [ ] **Step 5: Commit**

```bash
git add docs/clip-interactions.md apps/desktop/package.json <any updated test files>
git commit -m "feat(desktop): 0.8.0 — time-selection scope decoupled from track selection"
```

- [ ] **Step 6: Manual smoke handoff**

Report to the user (designer) with these checks:
1. Drag a selection across tracks 2-3 while track 1 is selected → track 1 stays selected; rows 2-3 get the bright band; Delete cuts only rows 2-3.
2. Shift+Home with track 2 focused → selection scoped to track 2 only; no track gets selected.
3. Cmd+Click a track panel row while a scoped selection is active → row joins/leaves the bright band; track selection unchanged.
4. Edge-drag a scoped selection → scope (bright rows) survives the resize.
5. Cut a scoped selection covering one member of a two-member cross-track clip group → paste comes out ungrouped (scope made the capture partial).

---

## Self-review notes (spec → task mapping)

- Data model + helper: Task 1. Gestures (drag stamp, no-op consumer): Task 2. Keyboard stamp/preserve: Task 5. Cmd+Click/Cmd+Enter scope editing: Task 8.
- Scoped operations: DELETE_TIME_RANGE + SELECT_CLIPS focus (Task 3), copy/cut + wholeGroupIds (Task 7), Cmd+Arrow horizontal/vertical + drag-clip-in (Task 6).
- Scope integrity (delete/move remap, clear-on-empty): Task 4; the same clear-on-empty rule in scope editing: Task 8.
- Rendering three states: Task 6. Docs + 0.8.0 + audit + gates: Task 9.
- Tasks 2, 6 (promote paths), and 8 carry no new unit tests — interaction code without harnesses; rationale stated inline, behavior prototype-validated, manual smoke listed. Reviewers may challenge; that's the intended checkpoint.
