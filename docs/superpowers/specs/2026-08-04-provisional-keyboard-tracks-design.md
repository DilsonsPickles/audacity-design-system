# Provisional Keyboard Track Cleanup

**Date:** 2026-08-04  
**Status:** Approved

## Problem

When the user presses Cmd+Down to move clips to a newly created track, then presses Cmd+Up (while still holding Cmd) to move the clips back to a pre-existing track, the track that was created to house the clips remains as an empty orphan. The expected behaviour — matching mouse-drag provisional tracks — is that the empty track disappears when clips leave it.

## Scope

- Only tracks created by the current Cmd-hold keyboard gesture are eligible for cleanup.
- Cleanup fires on any move that empties a provisional track (Cmd+Up, or a subsequent Cmd+Down that pushes clips further down while leaving the earlier provisional track empty).
- Multiple provisional tracks within one gesture are handled (e.g. Cmd+Down × 2 → Cmd+Up × 2).
- Undo: the entire gesture (create + move + cleanup) coalesces into a single undo entry.

## New Action

```ts
{ type: 'DELETE_PROVISIONAL_TRACK'; payload: { trackId: number } }
```

Added to:
- `UNDOABLE_ACTIONS`
- `UNDO_COALESCE_GROUP` under `'clip-drag'` — coalesces with the surrounding moves so the whole gesture is one undo step
- `ACTION_DOMAIN` under `'tracks'`

## Reducer (`tracksDomainReducer.ts`)

New case `DELETE_PROVISIONAL_TRACK`: filters out the track whose `id` matches `payload.trackId`. Identical logic to `DELETE_TRACK` but coalesces with clip-drag gestures.

## Provisional Set (`provisionalKeyboardTrackIds.ts`)

New file `apps/sandbox/src/utils/provisionalKeyboardTrackIds.ts`:

```ts
export const provisionalKeyboardTrackIds = { current: new Set<number>() };
```

Follows the `pendingClipMoveResolution` pattern — module-scoped ref, imported by both call sites and by `useCmdArrowMove`.

## Call Site Changes

Both `onClipMoveToTrack` (CanvasTrackList) and `useTrackKeyboardHandlers` are updated in two places:

**On Cmd+Down overflow (creating a new track):**
After dispatching `MOVE_SELECTED_CLIPS_TO_NEW_TRACK`, add `newTrack.id` to `provisionalKeyboardTrackIds.current`.

**Before any clip-move dispatch (both overflow and non-overflow):**
Before dispatching either `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` or `MOVE_SELECTED_CLIPS_TO_TRACK`, run the cleanup scan: for each track ID in `provisionalKeyboardTrackIds.current`:
- Find the track in the current `tracks` array.
- If it exists and has **no unselected clips** (audio or MIDI) — meaning all its clips are selected and about to move away — dispatch `DELETE_PROVISIONAL_TRACK` for that ID and remove it from the set.

This covers both Cmd+Up (non-overflow) and repeated Cmd+Down (overflow) — e.g. three Cmd+Down presses leave the second provisional track empty when the third fires; the scan catches it.

The check is pre-dispatch using the live `tracks` value, which is deterministic.

## `useCmdArrowMove` change

In the `keyup` handler (fires when Cmd/Ctrl is released), after the overlap resolution step, clear the provisional set:

```ts
provisionalKeyboardTrackIds.current.clear();
```

This is a safety net — the set should already be empty if clips returned to pre-existing tracks, but covers edge cases (e.g. user releases Cmd while clips are still on a provisional track, which is the intended permanent state).

## Undo Behaviour

| Gesture | Net state | Cmd+Z result |
|---|---|---|
| Cmd+Down → release | Clips on new track | One step: clips back, track gone |
| Cmd+Down → Cmd+Up → release | Clips on original track, no orphan | One step: clips back to original (same — no-op restore) |
| Cmd+Down × 2 → Cmd+Up × 2 → release | Clips on original track, no orphans | One step: restore to before gesture |

## Files to Change

| File | Change |
|---|---|
| `apps/sandbox/src/utils/provisionalKeyboardTrackIds.ts` | Create — module-scoped provisional set |
| `apps/sandbox/src/contexts/TracksContext.tsx` | Add `DELETE_PROVISIONAL_TRACK` action type, `UNDOABLE_ACTIONS`, `UNDO_COALESCE_GROUP` |
| `apps/sandbox/src/contexts/reducers/domains.ts` | Register `DELETE_PROVISIONAL_TRACK` in `ACTION_DOMAIN` |
| `apps/sandbox/src/contexts/reducers/tracksDomainReducer.ts` | Add reducer case |
| `apps/sandbox/src/components/canvas/CanvasTrackList.tsx` | Populate set on overflow; cleanup scan before every `MOVE_SELECTED_CLIPS_TO_TRACK` dispatch |
| `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts` | Same as CanvasTrackList |
| `apps/sandbox/src/hooks/useCmdArrowMove.ts` | Clear set on Cmd release |
