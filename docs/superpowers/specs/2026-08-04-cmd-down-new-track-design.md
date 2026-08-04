# Cmd+Down Creates New Track for Focused Clips

**Date:** 2026-08-04  
**Status:** Approved

## Problem

Pressing Cmd+Down when a focused/selected clip is on the last track is a silent no-op. The mouse-drag equivalent already creates new tracks when dragging below the last row. Keyboard and mouse behaviour should be consistent.

## Scope

- Cmd+Down only (Cmd+Up at track 0 is out of scope).
- Applies to both keyboard paths: clip-element focus (`onClipMoveToTrack`) and track-container focus (`useTrackKeyboardHandlers`).
- Multi-clip groups that span multiple tracks: if the bottommost clip is on the last track, exactly one new track is appended and the whole group shifts down by 1.

## Approach: New combined reducer action

A new action `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` handles track creation and clip move atomically, giving single-step undo.

## Data Model

New action added to `TracksContext.tsx`:

```ts
{ type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK'; payload: { newTrack: Track } }
```

- Added to `UNDOABLE_ACTIONS`.
- Added to `UNDO_COALESCE_GROUP` under `'clip-drag'` — same group as `MOVE_SELECTED_CLIPS_TO_TRACK`.
- Single Cmd+Z reverses both track creation and clip move atomically.

## Reducer (`clipsReducer.ts`)

New case `MOVE_SELECTED_CLIPS_TO_NEW_TRACK`:

1. Captures `newTrackIndex = state.tracks.length` (the index the appended track will occupy).
2. Appends `payload.newTrack` to the tracks array.
3. Moves all selected clips (audio + MIDI) from their current track to `newTrackIndex` using the same two-pass remove/add logic as `MOVE_SELECTED_CLIPS_TO_TRACK`.

No overlap resolution needed — clips land on an empty new track, so temporal overlap is impossible.

## Call Sites

### `CanvasTrackList.tsx` — `onClipMoveToTrack` handler

- New prop `buildTrackForDrop` threaded down from `Canvas.tsx` (already constructed there for mouse drag).
- Overflow detection: collect all selected clips' track indices, take the max; if `max + 1 >= tracks.length` and `direction === 1`:
  - Call `buildTrackForDrop(0, sourceTrackIndex)` to get the track template.
  - Dispatch `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` instead of `MOVE_SELECTED_CLIPS_TO_TRACK`.
- `SET_FOCUSED_TRACK` dispatched with `tracks.length` (the new last index).
- DOM focus follow-up (`requestAnimationFrame` double-tick) targets the moved clip element on the new track.

### `useTrackKeyboardHandlers.ts`

- New option `buildTrackForDrop` added to the hook's options object.
- Same overflow detection (max selected clip track index + 1 >= tracks.length) and dispatch logic as above.
- `SET_FOCUSED_TRACK` dispatched with `tracks.length`; DOM focus moves to the new track container.

## Focus & Undo

| Scenario | Behaviour |
|---|---|
| Cmd+Down from last track (clip focus) | New track created, clip moves down, DOM focus follows the clip |
| Cmd+Down from last track (track focus) | New track created, clips move down, track container focus follows |
| Cmd+Z after either | Clips return to original track, new empty track deleted — single undo step |
| Cmd+Down from non-last track | Unchanged — dispatches existing `MOVE_SELECTED_CLIPS_TO_TRACK` |

## Files to Change

| File | Change |
|---|---|
| `apps/sandbox/src/contexts/TracksContext.tsx` | Add `MOVE_SELECTED_CLIPS_TO_NEW_TRACK` action type, register in `UNDOABLE_ACTIONS` and `UNDO_COALESCE_GROUP` |
| `apps/sandbox/src/contexts/reducers/clipsReducer.ts` | Add reducer case |
| `apps/sandbox/src/components/canvas/CanvasTrackList.tsx` | Accept `buildTrackForDrop` prop; dispatch new action on overflow |
| `apps/sandbox/src/components/Canvas.tsx` | Thread `buildTrackForDrop` to `CanvasTrackList` |
| `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts` | Accept `buildTrackForDrop` option; dispatch new action on overflow |
