# Cmd+Down Creates New Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a focused/selected clip is on the last track and the user presses Cmd+Down, a new track is appended and the clip(s) move to it — matching the existing mouse-drag-below-last-track behaviour.

**Architecture:** A new reducer action `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` atomically appends a track template and moves all selected clips down to it, giving single-step undo. Call sites detect the out-of-bounds case and dispatch the new action instead of the existing `MOVE_SELECTED_CLIPS_TO_TRACK`. The `buildTrackForDrop` factory (already wired in Canvas.tsx for mouse drag) is threaded to both keyboard call sites.

**Tech Stack:** TypeScript, React 19, Vitest, pnpm monorepo.

## Global Constraints

- Every `any` needs a `// justified: <reason>` comment or the `check-any.mjs` guard fails.
- Run gates before each commit: `pnpm --filter @audacity-ui/sandbox test`, `npx tsc --noEmit` (in `apps/sandbox`), `node scripts/check-any.mjs` (from repo root).
- Behaviour-preserving: the non-overflow path (Cmd+Down on any track except the last) must remain unchanged.
- `buildTrackForDrop` signature: `(indexAmongNew: number, sourceTrackIndex: number) => Track` — pass `0` for `indexAmongNew` (keyboard move never needs multiple tracks in one go).

---

### Task 1: Register the new action type and undo metadata

**Files:**
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx:307,374-395,422-437`
- Modify: `apps/sandbox/src/contexts/reducers/domains.ts:27`

**Interfaces:**
- Produces: `{ type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK'; payload: { newTrack: Track } }` — used by Tasks 3, 4, 5.

- [ ] **Step 1: Add the action type to `TracksAction`**

In `apps/sandbox/src/contexts/TracksContext.tsx`, find line 307:
```ts
| { type: 'MOVE_SELECTED_CLIPS_TO_TRACK'; payload: { direction: 1 | -1 } }
```
Add immediately after it:
```ts
| { type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK'; payload: { newTrack: Track } }
```

- [ ] **Step 2: Register in `UNDOABLE_ACTIONS`**

In the same file, find line 395:
```ts
  'MOVE_SELECTED_CLIPS_TO_TRACK',
```
Add immediately after:
```ts
  'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
```

- [ ] **Step 3: Register in `UNDO_COALESCE_GROUP`**

Find line 425:
```ts
  MOVE_SELECTED_CLIPS_TO_TRACK: 'clip-drag',
```
Add immediately after:
```ts
  MOVE_SELECTED_CLIPS_TO_NEW_TRACK: 'clip-drag',
```

- [ ] **Step 4: Register the action domain**

In `apps/sandbox/src/contexts/reducers/domains.ts`, find line 27:
```ts
  MOVE_SELECTED_CLIPS: 'clips', MOVE_SELECTED_CLIPS_TO_TRACK: 'clips',
```
Extend it:
```ts
  MOVE_SELECTED_CLIPS: 'clips', MOVE_SELECTED_CLIPS_TO_TRACK: 'clips',
  MOVE_SELECTED_CLIPS_TO_NEW_TRACK: 'clips',
```

- [ ] **Step 5: Run the domain routing test**

```bash
cd apps/sandbox && npx vitest run reducerRouting
```
Expected: PASS (the routing table test validates every action has a known domain).

- [ ] **Step 6: Run tsc**

```bash
cd apps/sandbox && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/reducers/domains.ts
git commit -m "feat(tracks): register MOVE_SELECTED_CLIPS_TO_NEW_TRACK action type"
```

---

### Task 2: Implement the reducer case

**Files:**
- Modify: `apps/sandbox/src/contexts/reducers/clipsReducer.ts` (after line 506, the closing brace of `MOVE_SELECTED_CLIPS_TO_TRACK`)
- Create: `apps/sandbox/src/contexts/__tests__/moveClipsToNewTrack.reducer.test.ts`

**Interfaces:**
- Consumes: `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` action type from Task 1.
- Produces: reducer case that appends `newTrack` and moves selected clips to it.

- [ ] **Step 1: Write the failing tests**

Create `apps/sandbox/src/contexts/__tests__/moveClipsToNewTrack.reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clipsReducer } from '../reducers/clipsReducer';
import { initialState } from '../TracksContext';
import type { TracksState, Track, Clip } from '../TracksContext';

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 1, name: 'Clip 1', start: 0, duration: 1,
    trimStart: 0, fullDuration: 1, selected: false,
    color: '#fff', waveformData: [],
    ...overrides,
  };
}

function makeTrack(id: number, clips: Clip[]): Track {
  return { id, name: `Track ${id}`, clips };
}

function makeState(tracks: Track[]): TracksState {
  return { ...initialState, tracks };
}

const newTrackTemplate: Track = { id: 99, name: 'Track 99', clips: [] };

describe('MOVE_SELECTED_CLIPS_TO_NEW_TRACK', () => {
  it('appends the new track and moves the selected clip to it', () => {
    const clip = makeClip({ id: 1, selected: true });
    const state = makeState([makeTrack(1, [clip])]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    expect(next.tracks).toHaveLength(2);
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(1);
    expect(next.tracks[1].clips[0].id).toBe(1);
    expect(next.tracks[1].id).toBe(99);
  });

  it('moves all selected clips, leaves unselected clips in place', () => {
    const selected = makeClip({ id: 1, selected: true });
    const unselected = makeClip({ id: 2, selected: false, start: 2 });
    const state = makeState([makeTrack(1, [selected, unselected])]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    expect(next.tracks[0].clips.map(c => c.id)).toEqual([2]);
    expect(next.tracks[1].clips.map(c => c.id)).toEqual([1]);
  });

  it('handles a multi-track group: moves selected clips from multiple source tracks', () => {
    const clip1 = makeClip({ id: 1, selected: true });
    const clip2 = makeClip({ id: 2, selected: true });
    const state = makeState([
      makeTrack(1, [clip1]),
      makeTrack(2, [clip2]),
    ]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    // Three tracks after: original two (now empty) + new one with both clips
    expect(next.tracks).toHaveLength(3);
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(0);
    expect(next.tracks[2].clips.map(c => c.id).sort()).toEqual([1, 2]);
  });

  it('returns state unchanged when no clips are selected', () => {
    const clip = makeClip({ id: 1, selected: false });
    const state = makeState([makeTrack(1, [clip])]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/sandbox && npx vitest run moveClipsToNewTrack
```
Expected: FAIL — "MOVE_SELECTED_CLIPS_TO_NEW_TRACK" not a handled case.

- [ ] **Step 3: Add the reducer case**

In `apps/sandbox/src/contexts/reducers/clipsReducer.ts`, find the closing brace of the `MOVE_SELECTED_CLIPS_TO_TRACK` case (after line 506) and add immediately after it:

```ts
    case 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK': {
      const { newTrack } = action.payload;

      const selectedEntries: Array<{ trackIndex: number; clip: Clip; isMidi: boolean }> = [];
      state.tracks.forEach((track, trackIndex) => {
        track.clips.forEach(clip => {
          if (clip.selected) selectedEntries.push({ trackIndex, clip, isMidi: false });
        });
        track.midiClips?.forEach(clip => {
          if (clip.selected) {
            selectedEntries.push({ trackIndex, clip: clip as unknown as Clip, isMidi: true }); // justified: MidiClip treated as Clip for uniform cross-track move (common id/start/duration fields used)
          }
        });
      });

      if (selectedEntries.length === 0) return state;

      const newTrackIndex = state.tracks.length;
      const newTracks = [...state.tracks.map(track => ({
        ...track,
        clips: [...track.clips],
        midiClips: track.midiClips ? [...track.midiClips] : undefined,
      })), { ...newTrack, clips: [], midiClips: newTrack.midiClips ? [] : undefined }];

      // First pass: remove selected clips from their source tracks
      for (const entry of selectedEntries) {
        if (entry.isMidi) {
          newTracks[entry.trackIndex] = {
            ...newTracks[entry.trackIndex],
            midiClips: newTracks[entry.trackIndex].midiClips?.filter(c => c.id !== entry.clip.id),
          };
        } else {
          newTracks[entry.trackIndex] = {
            ...newTracks[entry.trackIndex],
            clips: newTracks[entry.trackIndex].clips.filter(c => c.id !== entry.clip.id),
          };
        }
      }

      // Second pass: add selected clips to the new track
      for (const entry of selectedEntries) {
        if (entry.isMidi) {
          newTracks[newTrackIndex] = {
            ...newTracks[newTrackIndex],
            midiClips: [...(newTracks[newTrackIndex].midiClips || []), { ...(entry.clip as unknown as import('@audacity-ui/core').MidiClip), color: newTracks[newTrackIndex].color }], // justified: entry.clip is already a MidiClip stored as Clip for uniform handling
          };
        } else {
          newTracks[newTrackIndex] = {
            ...newTracks[newTrackIndex],
            clips: [...newTracks[newTrackIndex].clips, { ...entry.clip, color: newTracks[newTrackIndex].color }],
          };
        }
      }

      return { ...state, tracks: newTracks };
    }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/sandbox && npx vitest run moveClipsToNewTrack
```
Expected: 4 PASS.

- [ ] **Step 5: Run full test suite and tsc**

```bash
cd apps/sandbox && pnpm test && npx tsc --noEmit
```
Expected: all green, 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/clipsReducer.ts \
        apps/sandbox/src/contexts/__tests__/moveClipsToNewTrack.reducer.test.ts
git commit -m "feat(clips): MOVE_SELECTED_CLIPS_TO_NEW_TRACK reducer case"
```

---

### Task 3: Wire the clip-focus keyboard path (`CanvasTrackList` + `Canvas`)

**Files:**
- Modify: `apps/sandbox/src/components/canvas/CanvasTrackList.tsx:19-78` (props interface + `onClipMoveToTrack` handler ~line 304)
- Modify: `apps/sandbox/src/components/Canvas.tsx:701-746` (`<CanvasTrackList>` JSX)

**Interfaces:**
- Consumes: `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` from Task 1. `buildTrackForDrop` factory already exists in Canvas.tsx (line 303).
- Produces: When Cmd+Down fires on a clip on the last track, the new action is dispatched.

- [ ] **Step 1: Add `buildTrackForDrop` to `CanvasTrackListProps`**

In `apps/sandbox/src/components/canvas/CanvasTrackList.tsx`, find the closing brace of `CanvasTrackListProps` (after `beginCmdMove: () => void;` on line 77). Add before the closing brace:

```ts
  /** Factory that builds a new track template for keyboard drop-below.
   *  Signature matches useClipDragging's buildTrackForDrop. */
  buildTrackForDrop?: (indexAmongNew: number, sourceTrackIndex: number) => Track;
```

- [ ] **Step 2: Destructure the new prop in the function signature**

In the same file, find the destructured props in `export function CanvasTrackList({` (line 89–134). Add `buildTrackForDrop,` to the destructuring list alongside `beginCmdMove`.

- [ ] **Step 3: Update the `onClipMoveToTrack` handler**

Find the `onClipMoveToTrack` handler body (around line 304). Replace the dispatch block:

```ts
// BEFORE:
dispatch({
  type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
  payload: { direction: direction as 1 | -1 },
});
// ... beginCmdMove, SET_FOCUSED_TRACK, rAF focus ...
const newTrackIndex = trackIndex + direction;
if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
  dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
}
```

Replace with:

```ts
// Detect whether the move would push the bottommost selected clip
// past the last track. If so, and we have the factory, dispatch the
// combined create-and-move action for single-step undo.
const maxSelectedTrackIndex = tracks.reduce((max, t, ti) => {
  const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
  return hasSelected ? Math.max(max, ti) : max;
}, -1);
const wouldOverflow = direction === 1 && maxSelectedTrackIndex + 1 >= tracks.length;

if (wouldOverflow && buildTrackForDrop) {
  const template = buildTrackForDrop(0, trackIndex);
  dispatch({
    type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
    payload: { newTrack: template },
  });
  dispatch({ type: 'SET_FOCUSED_TRACK', payload: tracks.length });
} else {
  dispatch({
    type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
    payload: { direction: direction as 1 | -1 },
  });
  const newTrackIndex = trackIndex + direction;
  if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
  }
}
```

Leave `pendingClipMoveResolution`, `beginCmdMove`, and the `rAF` DOM focus follow-up untouched — they live after this block and apply to both branches.

- [ ] **Step 4: Pass `buildTrackForDrop` from Canvas.tsx**

In `apps/sandbox/src/components/Canvas.tsx`, find the `<CanvasTrackList` JSX (line 701). Add `buildTrackForDrop={buildTrackForDrop}` alongside `beginCmdMove={beginCmdMove}`. `buildTrackForDrop` is already in scope — it's the function defined at line 303 and passed to `useClipDragging`.

- [ ] **Step 5: Run tsc and full tests**

```bash
cd apps/sandbox && npx tsc --noEmit && pnpm test
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/components/canvas/CanvasTrackList.tsx \
        apps/sandbox/src/components/Canvas.tsx
git commit -m "feat(canvas): Cmd+Down on last track creates new track (clip-focus path)"
```

---

### Task 4: Wire the track-focus keyboard path (`useTrackKeyboardHandlers`)

**Files:**
- Modify: `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts:5-17` (options interface) and the `MOVE_SELECTED_CLIPS_TO_TRACK` dispatch site (~line 182)
- Modify: `apps/sandbox/src/components/Canvas.tsx` (pass `buildTrackForDrop` to the hook)

**Interfaces:**
- Consumes: `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` from Task 1. `buildTrackForDrop` factory from Canvas.
- Produces: When Cmd+Down fires on a track container with selected clips and the bottommost selected clip is on the last track, the new action is dispatched.

- [ ] **Step 1: Add `buildTrackForDrop` to `UseTrackKeyboardHandlersOptions`**

In `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts`, find `UseTrackKeyboardHandlersOptions` (line 5). Add after `beginCmdMove`:

```ts
  /** Factory that builds a new track template when Cmd+Down overflows the
   *  last track. Same signature as useClipDragging's buildTrackForDrop. */
  buildTrackForDrop?: (indexAmongNew: number, sourceTrackIndex: number) => Track;
```

Also add `Track` to the import from TracksContext at line 1:
```ts
import { useTracksDispatch, type Track, type TimeSelection } from '../contexts/TracksContext';
```
(`Track` may already be imported — if so, skip this.)

- [ ] **Step 2: Destructure the new option**

In the `useTrackKeyboardHandlers` function body (~line 48), add `buildTrackForDrop` to the destructuring:

```ts
const {
  tracks,
  selectedTrackIndices,
  focusedTrackIndex,
  timeSelection,
  selectionAnchor,
  setSelectionAnchor,
  trackSelectionMode,
  onTrackContainerFocusChange,
  beginCmdMove,
  buildTrackForDrop,
} = options;
```

- [ ] **Step 3: Replace the `MOVE_SELECTED_CLIPS_TO_TRACK` dispatch**

Find the dispatch at ~line 182:
```ts
dispatch({
  type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
  payload: { direction: direction as 1 | -1 },
});
```

Replace with:

```ts
const maxSelectedTrackIndex = tracks.reduce((max, t, ti) => {
  const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
  return hasSelected ? Math.max(max, ti) : max;
}, -1);
const wouldOverflow = direction === 1 && maxSelectedTrackIndex + 1 >= tracks.length;

if (wouldOverflow && buildTrackForDrop) {
  const anchorTrackIndex = focusedTrackIndex ?? trackIndex;
  const template = buildTrackForDrop(0, anchorTrackIndex);
  dispatch({
    type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
    payload: { newTrack: template },
  });
  dispatch({ type: 'SET_FOCUSED_TRACK', payload: tracks.length });
} else {
  dispatch({
    type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
    payload: { direction: direction as 1 | -1 },
  });
  const anchor = focusedTrackIndex ?? trackIndex;
  const newTrackIndex = anchor + direction;
  if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
  }
}
```

Leave the `setTimeout` DOM focus block (which sets focus on `.track-wrapper[data-track-index="${newTrackIndex}"] .track`) immediately after — it should use `tracks.length` when overflowing. Update it:

```ts
// Follow-up: move DOM focus to the new track container
const followIndex = wouldOverflow && buildTrackForDrop ? tracks.length : (focusedTrackIndex ?? trackIndex) + direction;
if (followIndex >= 0 && (wouldOverflow || followIndex < tracks.length)) {
  setTimeout(() => {
    const target = document.querySelector<HTMLElement>(
      `.track-wrapper[data-track-index="${followIndex}"] .track`,
    );
    if (target && document.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
  }, 0);
}
```

- [ ] **Step 4: Extract `buildTrackForDrop` to a named const in Canvas.tsx, then pass it to `useTrackKeyboardHandlers`**

`buildTrackForDrop` is currently an inline function literal passed directly to `useClipDragging` (line ~303). `useTrackKeyboardHandlers` is called earlier (line ~254), so we can't reference it by name yet. Extract it first.

In `apps/sandbox/src/components/Canvas.tsx`, before the `useTrackKeyboardHandlers(` call (~line 254), add:

```ts
const buildTrackForDrop = (indexAmongNew: number, sourceTrackIndex: number): Track => {
  const source = tracks[sourceTrackIndex];
  const sourceIsMidi = source?.type === 'midi'
    || (source?.midiClips?.length ?? 0) > 0;
  const type = sourceIsMidi ? 'midi' : 'audio';
  const prefix = sourceIsMidi ? 'MIDI' : 'Track';
  const namePattern = new RegExp(`^${prefix} (\\d+)$`);
  const usedNumbers = tracks
    .map((t) => {
      const m = namePattern.exec(t.name ?? '');
      return m ? parseInt(m[1], 10) : NaN;
    })
    .filter((n: number) => !isNaN(n));
  const nextNameNumber = (usedNumbers.length === 0 ? 0 : Math.max(...usedNumbers)) + 1 + indexAmongNew;
  const nextId = Math.max(...tracks.map((t) => t.id), 0) + 1 + indexAmongNew;
  return {
    id: nextId,
    name: `${prefix} ${nextNameNumber}`,
    type,
    height: source?.height ?? 114,
    ...(source?.viewMode ? { viewMode: source.viewMode } : {}),
    ...(source?.channelSplitRatio !== undefined ? { channelSplitRatio: source.channelSplitRatio } : {}),
    clips: [],
    ...(type === 'midi' ? { midiClips: [] } : {}),
  };
};
```

Then:
1. Add `buildTrackForDrop` to the `useTrackKeyboardHandlers({...})` options object.
2. Replace the inline `buildTrackForDrop: (indexAmongNew, sourceTrackIndex) => { ... }` inside `useClipDragging({...})` with `buildTrackForDrop`.

This is a pure extraction — same logic, same behaviour, just named so both hooks can reference it.

- [ ] **Step 5: Run tsc and full tests**

```bash
cd apps/sandbox && npx tsc --noEmit && pnpm test
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 6: Run any-guard**

```bash
node scripts/check-any.mjs
```
Expected: 0 violations (the two `as unknown as` casts in the reducer have `// justified:` comments from Task 2).

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts \
        apps/sandbox/src/components/Canvas.tsx
git commit -m "feat(canvas): Cmd+Down on last track creates new track (track-focus path)"
```

---

### Task 5: Manual smoke test

No automated test covers the full interaction (it requires a running browser), so verify by hand.

- [ ] **Step 1: Start the sandbox**

```bash
cd apps/sandbox && pnpm dev
```
Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Test clip-focus path**

1. Click a clip to select it. Tab to focus the clip element (or click the clip header so it has DOM focus).
2. Press Cmd+Down. The clip should move to a newly created track appended at the bottom.
3. Press Cmd+Z. The clip returns to its original track and the new empty track disappears — **single undo step**.

- [ ] **Step 3: Test track-focus path**

1. Select a clip. Tab so the track container (not the clip) has focus.
2. Press Cmd+Down. Same result as above.
3. Press Cmd+Z — single undo.

- [ ] **Step 4: Verify non-overflow path is unchanged**

1. With two or more tracks, move a clip on a non-last track downward with Cmd+Down.
2. Confirm it moves to the next track without creating a new one.

- [ ] **Step 5: Test multi-clip group**

1. Select clips on the last two tracks of a three-track project.
2. Press Cmd+Down. All selected clips should land on a single new track (the new last track).
3. Cmd+Z reverts in one step.

- [ ] **Step 6: Run final gate**

```bash
pnpm --filter @audacity-ui/sandbox test
pnpm --filter @dilsonspickles/components test
cd apps/sandbox && npx tsc --noEmit
node scripts/check-any.mjs
```
Expected: all green.
