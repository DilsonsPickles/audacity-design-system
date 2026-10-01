/**
 * Clip-edge alignment for a quick fade's boundary (user decision
 * 2026-10-01): with snapping off, a fade length drag's boundary
 * magnetically meets the nearest clip edge on ANOTHER track within
 * reach — the rule a clip drag's and a trim's edges already follow
 * (`useClipDragging` / `useClipTrimming`, 6px). The fade's own track is
 * left out: a same-track neighbour's edge is either inside an overlap
 * (a crossfade, which consumes the fade) or beyond the clip's own edge,
 * where the fade cannot reach — and the clip's own edges are the fade's
 * zero and its limit, not targets.
 */

/** The clip drag's threshold, in pixels — keep in step with the hooks */
export const FADE_ALIGN_THRESHOLD_PX = 6;

export interface AlignableClip {
  start: number;
  duration: number;
}

export interface AlignableTrack {
  clips?: ReadonlyArray<AlignableClip>;
  midiClips?: ReadonlyArray<AlignableClip>;
}

/** The nearest clip start or end on a track OTHER than `trackIndex`
 *  within `thresholdSec` of `time`, or null. Ties go to the first found. */
export function nearestClipEdgeOnOtherTracks(
  tracks: ReadonlyArray<AlignableTrack>,
  trackIndex: number,
  time: number,
  thresholdSec: number,
): number | null {
  let best: number | null = null;
  let bestDist = thresholdSec;
  for (let ti = 0; ti < tracks.length; ti++) {
    if (ti === trackIndex) continue;
    const t = tracks[ti];
    for (const c of [...(t.clips ?? []), ...(t.midiClips ?? [])]) {
      for (const edge of [c.start, c.start + c.duration]) {
        const d = Math.abs(edge - time);
        if (d < bestDist) {
          bestDist = d;
          best = edge;
        }
      }
    }
  }
  return best;
}
