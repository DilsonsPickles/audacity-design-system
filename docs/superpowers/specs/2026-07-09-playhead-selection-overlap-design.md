# Design: Selection Drags Don't Move an Overlapped Playhead

**Date:** 2026-07-09
**Branch:** `feat/time-selection-scope` (small addition rider — lands with the time-selection-scope feature)
**Status:** Design approved by user (this doc = the review artifact).
**Kind:** DELIBERATE BEHAVIOR CHANGE — user-driven product decision, made during 0.8.0 smoke testing.

## The problem

Finalizing a selection drag always jumps the playhead to the selection's start (`onTimeSelectionFinalized` in `Canvas.tsx`, and its spectral twin). Drawing a selection *around* the current playhead position therefore moves the cursor the user had deliberately parked.

## The rule

> When a selection drag finalizes, if the playhead's current position lies inside the drawn range — inclusive of both edges — the playhead does not move. Otherwise it moves to the selection start, as today.

- Applies to BOTH finalize paths (user decision): time selection and spectral selection.
- Applies to drag-create and edge-resize alike (both fire the same finalize callbacks).
- Out of scope: plain canvas clicks (separate path in `useContainerClick`, still move the playhead) and keyboard selection gestures (Shift+Home/End deliberately move the playhead as navigation).

## Implementation shape

- **One pure helper** for testability (Canvas has no component harness): `apps/sandbox/src/utils/playheadAfterFinalize.ts` exporting
  `playheadAfterSelectionFinalize(playheadPosition: number, sel: { startTime: number; endTime: number }): number | null`
  → `null` when `startTime <= playheadPosition <= endTime` (don't move), else `sel.startTime`.
- Both Canvas finalize callbacks (`onTimeSelectionFinalized` ~line 542 and the spectral finalize ~line 602) call it and dispatch `SET_PLAYHEAD_POSITION` only on a non-null result. `playheadPosition` is already in scope in Canvas (the Shift+Click range site reads it).

## Testing

- Unit tests for the helper: inside (no move), exactly at start edge, exactly at end edge (both no move), before start (moves to start), after end (moves to start).
- No Canvas-level test (no harness; the wiring is two one-line guards). Manual smoke: park playhead, draw a selection over it → cursor stays; draw a selection elsewhere → cursor jumps to selection start as before.
- Gates: sandbox suite, tsc, guard:any.

## Docs

- One sentence in `docs/clip-interactions.md` under the time-selection section.
