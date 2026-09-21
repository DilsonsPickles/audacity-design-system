/**
 * Roll edit for a crossfade (2026-09-21): dragging the X's intersection
 * node slides BOTH clip edges by the same delta — the outgoing clip's
 * tail trims/extends while the incoming clip's head does the opposite —
 * so the seam moves along the timeline, the overlap length stays, and
 * no content moves in time. Pure math; the reducer applies the result.
 */
import type { Clip } from '../contexts/TracksContext';

const MIN_CLIP_DURATION = 0.1;
const EPSILON = 1e-6;

export interface CrossfadeRollResult {
  /** The delta actually applied after clamping */
  appliedDelta: number;
  outgoing: { duration: number; fadeOut?: number };
  incoming: { start: number; trimStart: number; duration: number; fadeIn?: number };
}

/** Clamped roll of `deltaSeconds` (positive = seam moves right).
 *  Returns null when the clamp leaves nothing to apply. Bounds:
 *  - right: outgoing can only extend into its hidden tail material;
 *    incoming can only shrink down to the minimum clip length
 *  - left: outgoing can only shrink to the minimum; incoming can only
 *    extend into its hidden head material (trimStart)
 *  (stretchFactor is deliberately ignored — envelope-bake parity) */
export function computeCrossfadeRoll(
  outgoing: Clip,
  incoming: Clip,
  deltaSeconds: number,
): CrossfadeRollResult | null {
  const outTrimStart = outgoing.trimStart ?? 0;
  const outFull = outgoing.fullDuration ?? (outTrimStart + outgoing.duration);
  const inTrimStart = incoming.trimStart ?? 0;

  const maxRight = Math.min(
    Math.max(0, (outFull - outTrimStart) - outgoing.duration),
    Math.max(0, incoming.duration - MIN_CLIP_DURATION),
  );
  const maxLeft = Math.min(
    Math.max(0, outgoing.duration - MIN_CLIP_DURATION),
    Math.max(0, inTrimStart),
  );

  const applied = Math.max(-maxLeft, Math.min(maxRight, deltaSeconds));
  if (Math.abs(applied) <= EPSILON) return null;

  const newOutDuration = outgoing.duration + applied;
  const newInDuration = incoming.duration - applied;
  return {
    appliedDelta: applied,
    outgoing: {
      duration: newOutDuration,
      // An authored fade never outgrows its clip
      fadeOut: outgoing.fadeOut !== undefined ? Math.min(outgoing.fadeOut, newOutDuration) : undefined,
    },
    incoming: {
      start: incoming.start + applied,
      trimStart: inTrimStart + applied,
      duration: newInDuration,
      fadeIn: incoming.fadeIn !== undefined ? Math.min(incoming.fadeIn, newInDuration) : undefined,
    },
  };
}
