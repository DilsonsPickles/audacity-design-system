# Provisional Keyboard Track Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user presses Cmd+Down (creating a provisional track) and then Cmd+Up while still holding Cmd, any track that was created to house the clips and is now empty gets automatically deleted — matching mouse-drag provisional track behaviour.

**Architecture:** A module-scoped `Set<number>` ref (`provisionalKeyboardTrackIds`) tracks which track IDs were created by the current Cmd-hold gesture. Both keyboard call sites populate the set on overflow and run a pre-dispatch cleanup scan. A new `DELETE_PROVISIONAL_TRACK` action — registered in the `'clip-drag'` coalesce group — deletes orphan tracks atomically within the same undo entry as the moves.

**Tech Stack:** TypeScript, React 19, Vitest, pnpm monorepo.

## Global Constraints

- Every `any` needs `// justified: <reason>` or `check-any.mjs` fails.
- Gates before every commit: `pnpm --filter @audacity-ui/sandbox test`, `npx tsc --noEmit` (inside `apps/sandbox`), `node scripts/check-any.mjs` (repo root).
- `DELETE_PROVISIONAL_TRACK` must be in `UNDO_COALESCE_GROUP` under `'clip-drag'` — this is what makes the whole gesture one undo step.
- The cleanup scan runs **before** every clip-move dispatch (both overflow and non-overflow). It must not run after: we use the pre-dispatch `tracks` state to decide.
- Iterating a `Set` with `for...of` while calling `Set.prototype.delete` inside the loop is safe in JavaScript — deleted entries are not revisited.

---

### Task 1: Create the provisional set util, register the action, and implement the reducer case

**Files:**
- Create: `apps/sandbox/src/utils/provisionalKeyboardTrackIds.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (~lines 308–309, 397–398, 428–429)
- Modify: `apps/sandbox/src/contexts/reducers/domains.ts` (~line 17)
- Modify: `apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts` (after line 177, the closing brace of `DELETE_TRACK`)
- Test: `apps/sandbox/src/contexts/__tests__/deleteProvisionalTrack.reducer.test.ts` (new)

**Interfaces:**
- Produces:
  - `provisionalKeyboardTrackIds: { current: Set<number> }` — imported by Task 2 call sites
  - `{ type: 'DELETE_PROVISIONAL_TRACK'; payload: { trackId: number } }` — dispatched by Task 2 call sites

- [ ] **Step 1: Write the failing tests**

Create `apps/sandbox/src/contexts/__tests__/deleteProvisionalTrack.reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tracksDomainReducer } from '../reducers/tracksDomainReducer';
import { initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

function makeTrack(id: number, clipCount = 0): Track {
  return {
    id,
    name: `Track ${id}`,
    clips: Array.from({ length: clipCount }, (_, i) => ({
      id: i + 1,
      name: `Clip ${i + 1}`,
      start: i,
      duration: 1,
      trimStart: 0,
      fullDuration: 1,
      selected: false,
      envelopePoints: [],
    })),
  } as Track;
}

function makeState(tracks: Track[]): TracksState {
  return { ...initialState, tracks };
}

describe('DELETE_PROVISIONAL_TRACK', () => {
  it('removes the track with the matching id', () => {
    const state = makeState([makeTrack(1), makeTrack(99), makeTrack(2)]);
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 99 },
    });
    expect(next.tracks.map(t => t.id)).toEqual([1, 2]);
  });

  it('returns state unchanged when no track has the given id', () => {
    const state = makeState([makeTrack(1), makeTrack(2)]);
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 999 },
    });
    expect(next).toBe(state);
  });

  it('adjusts focusedTrackIndex when the deleted track is at or before focus', () => {
    const state = { ...makeState([makeTrack(1), makeTrack(99)]), focusedTrackIndex: 1 };
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 99 },
    });
    expect(next.focusedTrackIndex).toBe(0);
  });

  it('does not adjust focusedTrackIndex when the deleted track is after focus', () => {
    const state = { ...makeState([makeTrack(1), makeTrack(2), makeTrack(99)]), focusedTrackIndex: 0 };
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 99 },
    });
    expect(next.focusedTrackIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/sandbox && npx vitest run deleteProvisionalTrack
```
Expected: FAIL — `DELETE_PROVISIONAL_TRACK` not handled.

- [ ] **Step 3: Create the provisional set util**

Create `apps/sandbox/src/utils/provisionalKeyboardTrackIds.ts`:

```ts
// Module-scoped set shared across keyboard clip-move call sites.
// Tracks the IDs of tracks created by the current Cmd-hold gesture
// so they can be cleaned up if clips move back off them before Cmd
// is released. Follows the pendingClipMoveResolution pattern.
export const provisionalKeyboardTrackIds = { current: new Set<number>() };
```

- [ ] **Step 4: Register the action type in TracksContext.tsx**

In `apps/sandbox/src/contexts/TracksContext.tsx`, find line 308:
```ts
| { type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK'; payload: { newTrack: Track } }
```
Add immediately after:
```ts
| { type: 'DELETE_PROVISIONAL_TRACK'; payload: { trackId: number } }
```

Find line 397:
```ts
  'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
```
Add immediately after:
```ts
  'DELETE_PROVISIONAL_TRACK',
```

Find line 428:
```ts
  MOVE_SELECTED_CLIPS_TO_NEW_TRACK: 'clip-drag',
```
Add immediately after:
```ts
  DELETE_PROVISIONAL_TRACK: 'clip-drag',
```

- [ ] **Step 5: Register in domains.ts**

In `apps/sandbox/src/contexts/reducers/domains.ts`, find the `ADD_TRACK: 'tracks'` entry on line 17. Add after it:
```ts
  DELETE_PROVISIONAL_TRACK: 'tracks',
```

- [ ] **Step 6: Add the reducer case in tracksDomainReducer.ts**

In `apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts`, find the closing brace of `DELETE_TRACK` (after line 177). Add immediately after:

```ts
    case 'DELETE_PROVISIONAL_TRACK': {
      const idx = state.tracks.findIndex(t => t.id === action.payload.trackId);
      if (idx === -1) return state;
      const newTracks = state.tracks.filter(t => t.id !== action.payload.trackId);
      const newFocused = newTracks.length === 0
        ? null
        : state.focusedTrackIndex === null
        ? null
        : state.focusedTrackIndex >= idx
        ? Math.max(0, state.focusedTrackIndex - 1)
        : state.focusedTrackIndex;
      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
        focusedTrackIndex: newFocused,
        selectedTrackIndices: state.selectedTrackIndices
          .filter(i => i !== idx)
          .map(i => (i > idx ? i - 1 : i)),
        timeSelection: remapTimeSelectionTracks(state.timeSelection, i =>
          i === idx ? null : i > idx ? i - 1 : i
        ),
      };
    }
```

- [ ] **Step 7: Run tests — confirm they pass**

```bash
cd apps/sandbox && npx vitest run deleteProvisionalTrack
```
Expected: 4 PASS.

- [ ] **Step 8: Run full suite, tsc, and any-guard**

```bash
cd apps/sandbox && pnpm test && npx tsc --noEmit && cd ../.. && node scripts/check-any.mjs
```
Expected: all green, 0 violations.

- [ ] **Step 9: Commit**

```bash
git add \
  apps/sandbox/src/utils/provisionalKeyboardTrackIds.ts \
  apps/sandbox/src/contexts/TracksContext.tsx \
  apps/sandbox/src/contexts/reducers/domains.ts \
  apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts \
  apps/sandbox/src/contexts/__tests__/deleteProvisionalTrack.reducer.test.ts
git commit -m "feat(tracks): DELETE_PROVISIONAL_TRACK action for keyboard provisional track cleanup"
```

---

### Task 2: Wire call sites and clear on Cmd release

**Files:**
- Modify: `apps/sandbox/src/components/canvas/CanvasTrackList.tsx` (~lines 318–343)
- Modify: `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts` (~lines 185–219)
- Modify: `apps/sandbox/src/hooks/useCmdArrowMove.ts` (~lines 53–87)

**Interfaces:**
- Consumes: `provisionalKeyboardTrackIds` from Task 1, `DELETE_PROVISIONAL_TRACK` from Task 1.

The cleanup logic is identical in both call sites. It runs before every clip-move dispatch — both the overflow path (`MOVE_SELECTED_CLIPS_TO_NEW_TRACK`) and the non-overflow path (`MOVE_SELECTED_CLIPS_TO_TRACK`). Extract it as an inline helper inside each handler to avoid prop-threading (the function uses `dispatch` and `tracks`, which are already in scope).

- [ ] **Step 1: Add the import in CanvasTrackList.tsx**

In `apps/sandbox/src/components/canvas/CanvasTrackList.tsx`, add to the existing imports:
```ts
import { provisionalKeyboardTrackIds } from '../../utils/provisionalKeyboardTrackIds';
```

- [ ] **Step 2: Update the onClipMoveToTrack handler in CanvasTrackList.tsx**

Find the handler block starting at ~line 318:
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

// Before every clip-move dispatch: delete any provisional tracks that
// the moving clips are vacating (only selected clips remain → empty
// after the move). Runs for both overflow and non-overflow so repeated
// Cmd+Down presses also clean up the track they just left.
for (const trackId of provisionalKeyboardTrackIds.current) {
  const pt = tracks.find(t => t.id === trackId);
  if (!pt) { provisionalKeyboardTrackIds.current.delete(trackId); continue; }
  const hasUnselected = pt.clips.some(c => !c.selected) || (pt.midiClips || []).some(c => !c.selected);
  if (!hasUnselected) {
    dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
    provisionalKeyboardTrackIds.current.delete(trackId);
  }
}

if (wouldOverflow && buildTrackForDrop) {
  const template = buildTrackForDrop(0, trackIndex);
  dispatch({
    type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
    payload: { newTrack: template },
  });
  provisionalKeyboardTrackIds.current.add(template.id);
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

- [ ] **Step 3: Add the import in useTrackKeyboardHandlers.ts**

In `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts`, add to the existing imports:
```ts
import { provisionalKeyboardTrackIds } from '../utils/provisionalKeyboardTrackIds';
```

- [ ] **Step 4: Update the dispatch block in useTrackKeyboardHandlers.ts**

Find the block starting at ~line 185:
```ts
    if (focusedHasSelectedClip || promotedFromTimeSelection) {
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
```

Replace just the inner block (from `const maxSelectedTrackIndex` down through the closing of the if/else) with:

```ts
    if (focusedHasSelectedClip || promotedFromTimeSelection) {
      const maxSelectedTrackIndex = tracks.reduce((max, t, ti) => {
        const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
        return hasSelected ? Math.max(max, ti) : max;
      }, -1);
      const wouldOverflow = direction === 1 && maxSelectedTrackIndex + 1 >= tracks.length;

      // Before every clip-move dispatch: delete any provisional tracks that
      // the moving clips are vacating. Covers Cmd+Up AND repeated Cmd+Down.
      for (const trackId of provisionalKeyboardTrackIds.current) {
        const pt = tracks.find(t => t.id === trackId);
        if (!pt) { provisionalKeyboardTrackIds.current.delete(trackId); continue; }
        const hasUnselected = pt.clips.some(c => !c.selected) || (pt.midiClips || []).some(c => !c.selected);
        if (!hasUnselected) {
          dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
          provisionalKeyboardTrackIds.current.delete(trackId);
        }
      }

      if (wouldOverflow && buildTrackForDrop) {
        const anchorTrackIndex = focusedTrackIndex ?? trackIndex;
        const template = buildTrackForDrop(0, anchorTrackIndex);
        dispatch({
          type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
          payload: { newTrack: template },
        });
        provisionalKeyboardTrackIds.current.add(template.id);
        dispatch({ type: 'SET_FOCUSED_TRACK', payload: tracks.length });
      } else {
        dispatch({
          type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
          payload: { direction: direction as 1 | -1 },
        });
```

Leave everything after the inner `else` block (the `anchor`/`newTrackIndex` focus logic, `followIndex` setTimeout, `pendingClipMoveResolution`, `beginCmdMove`, `return`) unchanged.

- [ ] **Step 5: Add the import and clear in useCmdArrowMove.ts**

In `apps/sandbox/src/hooks/useCmdArrowMove.ts`, add to imports:
```ts
import { provisionalKeyboardTrackIds } from '../utils/provisionalKeyboardTrackIds';
```

In the `onKeyUp` handler (~line 53), find `pendingClipMoveResolution.current = false;` and add the clear immediately after it:
```ts
pendingClipMoveResolution.current = false;
provisionalKeyboardTrackIds.current.clear();
```

- [ ] **Step 6: Run full suite, tsc, and any-guard**

```bash
cd apps/sandbox && pnpm test && npx tsc --noEmit && cd ../.. && node scripts/check-any.mjs
```
Expected: all green, 0 violations.

- [ ] **Step 7: Manual smoke test**

Start the sandbox: `pnpm sandbox` from repo root, open `http://localhost:5173`.

Verify these scenarios:

a) **Cmd+Down → Cmd+Up → Cmd release**: clip returns to original track; the provisional track disappears immediately on Cmd+Up; Cmd+Z is a no-op (state is already the original).

b) **Cmd+Down × 2 → Cmd+Up × 2**: each Cmd+Up removes one provisional track in order; no orphans remain; one undo step restores fully.

c) **Cmd+Down → release**: clip stays on new track; track persists; Cmd+Z removes it.

d) **Non-overflow Cmd+Down (middle tracks)**: no track created, no provisional set involvement, behaviour identical to before this change.

- [ ] **Step 8: Commit**

```bash
git add \
  apps/sandbox/src/components/canvas/CanvasTrackList.tsx \
  apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts \
  apps/sandbox/src/hooks/useCmdArrowMove.ts
git commit -m "feat(canvas): clean up provisional keyboard tracks when clips move back"
```
