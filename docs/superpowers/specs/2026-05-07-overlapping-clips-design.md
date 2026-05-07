# Overlapping Clips — Design Spec

**Date:** 2026-05-07
**Scope:** Behavior and architecture for clip-on-clip overlap in the sandbox app.
**Status:** Approved by user, ready for implementation plan.

## Context

The sandbox already supports clip dragging, multi-clip selection, cross-track moves, and edge-trimming. It does **not** define what happens when one clip's timeline range overlaps another's. This spec defines that behavior and the code shape needed to implement it.

This work is the first of three connected pieces:

1. **Overlapping clips** (this spec)
2. **Clip grouping** (later spec)
3. **Marketing demo** ("What's new in Audacity 4?" — later spec, packages 1 + 2 into an embedded Astro island)

## Behavior

### Single principle

> The clip whose boundary is moving wins. Wherever it overlaps another clip, that other clip is non-destructively trimmed at the overlap boundary. Audio source data is never touched.

### Triggering operations

- Dragging a whole clip and releasing (single or multi-clip selection).
- Dragging a clip's left or right edge (trim) and releasing.
- Cross-track moves are not a special case — the same eating logic applies wherever the clip lands.

### Per-clip resolution

For each underlying clip the moving clip overlaps on the destination track, exactly one of:

Let `M = [Mstart, Mend]` be the moving clip's range and `U = [Ustart, Uend]` the underlying clip's range. Classify by the relationship:

| Geometry | Outcome |
|---|---|
| `Mstart > Ustart` and `Mend ≥ Uend` (moving overlaps the right portion of underlying) | Underlying clip's right edge trims back to `Mstart`. `startTime` and `trimStart` unchanged; `duration` reduced. |
| `Mstart ≤ Ustart` and `Mend < Uend` (moving overlaps the left portion of underlying) | Underlying clip's left edge trims forward to `Mend`. `startTime` shifts forward by `(Mend − Ustart)`; `trimStart` increases by the same amount; `duration` reduced. |
| `Mstart > Ustart` and `Mend < Uend` (moving fully inside underlying) | Underlying clip splits into two trimmed clips: a left segment (`Ustart` → `Mstart`) and a right segment (`Mend` → `Uend`). Both share the same `waveform` reference; the right segment's `trimStart` becomes `original.trimStart + (Mend − Ustart)`. |
| `Mstart ≤ Ustart` and `Mend ≥ Uend` (underlying fully obscured) | Underlying clip is deleted. Recovery is via Undo. |

### Multi-clip drag

`N` selected clips drop together. Resolution evaluates each dropped clip independently against the *non-selected* clips on its destination track. Selected clips do not eat each other.

### Non-destructive trim

Eaten boundaries are clip-trim adjustments using the existing `trimStart`/`duration`/`startTime` fields on the sandbox `Clip`. The underlying `waveform` array is untouched. If the eating clip is later moved away, the trimmed clip stays trimmed (audio does not auto-restore), but the user can drag its edge back to reveal the formerly-eaten audio.

### Snapping

When a *moving boundary* is within ~6px of another clip's edge on the same destination track, it snaps to flush (zero gap, zero overlap). Continued cursor movement past the snap threshold (with a small hysteresis) releases the snap and allows the user to deliberately overlap.

A "moving boundary" is:
- **Whole-clip drag (single):** both edges of the dragged clip.
- **Whole-clip drag (multi-select):** the leftmost edge of the leftmost selected clip and the rightmost edge of the rightmost selected clip. Inner edges within the selection don't snap.
- **Edge trim:** the edge being dragged.

Snap only considers edges of *non-selected* clips on the destination track. Edges on other tracks do not attract.

### Commit timing

Drop / trim-release commits the change in one step. During drag, the moving clip is rendered ghosted (semi-transparent, elevated z-index). Underlying clips are **not** visually carved during drag — the carve happens on release.

### Undo

A single undo step reverts the entire resolution (all trims, splits, deletes from one drop) by restoring the prior `tracks` snapshot.

## Architecture

The interesting logic — overlap resolution — is extracted into a pure function with its own home. Hooks shrink to "compute intent, dispatch."

### New module: `apps/sandbox/src/utils/resolveOverlap.ts`

```ts
type ClipPlacement = {
  clipId: number;
  trackIndex: number;
  start: number;     // final start time on the destination track
  duration: number;  // final visible duration
};

type ClipMutation =
  | { type: 'trim';  clipId: number; trackIndex: number;
      newStart: number; newDuration: number; newTrimStart: number }
  | { type: 'split'; clipId: number; trackIndex: number;
      leftEnd: number; rightStart: number }
  | { type: 'delete'; clipId: number; trackIndex: number };

type OverlapResolution = {
  placements: ClipPlacement[];   // moving clips at their final positions
  mutations: ClipMutation[];     // changes applied to non-selected clips
};

function resolveOverlap(
  tracks: Track[],
  intent: ClipPlacement[],
  movingClipIds: Set<number>,
): OverlapResolution
```

For each placement, the resolver walks every clip on the destination track that is not in `movingClipIds`, classifies the geometry, and emits one of {no mutation, trim, split, delete}.

`split` emits a logical instruction; the reducer materializes it into two clip records sharing the original's `waveform`, with `trimStart` adjusted on the right segment so the audio source reference remains correct.

### New reducer action: `APPLY_CLIP_PLACEMENT`

`apps/sandbox/src/contexts/TracksContext.tsx` gains a single new action:

```ts
{ type: 'APPLY_CLIP_PLACEMENT', payload: OverlapResolution }
```

The reducer applies all mutations + placements atomically. Undo restores the prior snapshot in one step.

### Hook integration

Both `useClipDragging` and `useClipTrimming` follow the same release-time pattern:

1. On `mouseup`, compute the final `ClipPlacement[]` for the moving clip(s) (existing position math).
2. Call `resolveOverlap(state.tracks, intent, movingClipIds)`.
3. Dispatch one `APPLY_CLIP_PLACEMENT` action.

No resolver call during the drag itself.

### Snap

Snap logic lives in the hooks (during drag), not in the resolver (which receives committed intent). On every `mousemove`:

- Compute pixel distance from each moving boundary to every non-selected clip's edges on the destination track.
- If within 6px, snap that boundary to flush.
- Track cumulative cursor delta since the snap engaged; release the snap once delta exceeds threshold (e.g., 10px) so the user can deliberately overlap.

By the time the resolver runs on release, snap has already adjusted the intent.

### Visual feedback during drag

- Moving clip(s): `opacity: 0.7`, elevated z-index so they sit above non-moving clips.
- Non-moving clips: rendered normally. **No carve preview.**
- Snap engaged: optional 1px highlight at the alignment edge (decide during implementation).
- Cursor: existing drag cursor (`move` / `e-resize` / `w-resize`).

### Code surface estimate

- `apps/sandbox/src/utils/resolveOverlap.ts` — new, ~150 lines.
- `apps/sandbox/src/utils/snapToClipEdges.ts` — new, ~60 lines.
- `apps/sandbox/src/hooks/useClipDragging.ts` — modified release handler (~30 line delta).
- `apps/sandbox/src/hooks/useClipTrimming.ts` — modified release handler (~30 line delta).
- `apps/sandbox/src/contexts/TracksContext.tsx` — one new action type + reducer case (~50 lines).

## Testing

### Resolver unit tests (`apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`)

Pure function — fixtures in, resolution out. No providers needed.

- No overlap: zero mutations.
- Partial right-side overlap: underlying clip trimmed; `trimStart` unchanged, `duration` reduced.
- Partial left-side overlap: underlying clip trimmed; `trimStart` increased by overlap, `duration` reduced, `startTime` shifted.
- Fully inside: split into two; right segment's `trimStart` math correct.
- Fully obscured: single delete.
- Exact-boundary touch (no overlap): no mutation.
- Multi-clip intent: each moving clip eats independently; selected clips don't eat each other.
- Cross-track intent: mutations target the destination track only.

### Reducer integration tests (`apps/sandbox/src/contexts/__tests__/TracksContext.test.tsx`)

- `APPLY_CLIP_PLACEMENT` with mixed trim + split + delete applies atomically.
- Single-step undo restores prior tracks state.

### Hook integration tests (`apps/sandbox/src/hooks/__tests__/useClipDragging.test.tsx`, `useClipTrimming.test.tsx`)

- Drop on right side → underlying clip trimmed.
- Drop fully inside → underlying clip split.
- Multi-clip drop across multiple landing zones → each landing resolves correctly.
- Snap engages within 6px; releases past hysteresis threshold.

### Manual verification

- Full geometry matrix (right / left / inside / obscured) with 1, 2, 3-clip selections.
- Trim into adjacent clips on both edges.
- Cross-track drops eat correctly.
- Undo reverses each operation in one step.
- Snap feels right at 6px (tune during implementation).

### TDD ordering

Resolver tests first (fastest feedback, zero setup). Reducer tests next. Hook tests last — heavier (jsdom + providers) and most logic is already covered upstream.

## Out of scope

- **Crossfades on overlap** — the v4 model in this spec is "eat," not "blend." If crossfade-on-overlap is desired, that's a separate feature.
- **`@audacity-ui/core` `Clip` type extension** — the published core type lacks `trimStart`. The sandbox's local extended type is what the resolver targets. Reconciling the published type is a separate cleanup.
- **Clip grouping** — covered in the next spec. Group-aware overlap (e.g., grouped clips eating as a unit) is not part of this spec, but the resolver's `movingClipIds` parameter leaves room for it: a future caller can pass all members of a group as moving clips.
- **Paste-with-overlap, import-with-overlap** — the resolver is reusable for these, but wiring them is out of scope here.
