/**
 * Paste operations — the room-making half of the paste matrix
 * (2026-11-12 spec: paste either OVERLAPS — carves the landing span out
 * of the clips underneath — or PUSHES — splits at the paste point and
 * shifts later clips right to make room; push scoped to the destination
 * track(s) or every track).
 *
 * Carving reuses applySplitCut (the range cut's machinery: fades split
 * by the fade-belongs-to-its-edge rule, trims and envelopes remapped).
 * rippleInsert here is its inverse: a zero-width split at the anchor,
 * then everything from the anchor on shifts right.
 *
 * THE NO-AUTO-JOIN GUARD (the spec's noted bug): pushing never merges
 * the recipient clip with the clip to its right — a straddling clip
 * splits into two clips that STAY two clips, and clips that were
 * separate stay separate. Nothing in here ever concatenates clips.
 */

import type { Track } from '../contexts/TracksContext';
import { applySplitCut } from './cutOperations';

/** Clips starting exactly at the anchor (e.g. the right half a split
 *  just made) must shift; float drift must not exempt them. */
const EDGE_EPSILON = 1e-6;

/**
 * Make `delta` seconds of room at `anchorTime` on the given tracks:
 * any clip straddling the anchor is split there (a split edge grows no
 * fade — the ⌘I rule), then every clip starting at or after the anchor
 * moves right by `delta`. Tracks not listed are untouched.
 */
export function rippleInsert(
  tracks: Track[],
  trackIndices: number[],
  anchorTime: number,
  delta: number
): Track[] {
  if (delta <= 0 || trackIndices.length === 0) return tracks;

  // A zero-width split: applySplitCut's interior case divides a
  // straddling clip into [clipStart, anchor) + [anchor, clipEnd), and
  // leaves clips the anchor only touches at an edge alone.
  const split = applySplitCut(tracks, anchorTime, anchorTime, trackIndices);

  return split.map((track, trackIndex) => {
    if (!trackIndices.includes(trackIndex)) return track;
    return {
      ...track,
      clips: track.clips.map((clip) =>
        clip.start >= anchorTime - EDGE_EPSILON
          ? { ...clip, start: clip.start + delta }
          : clip
      ),
    };
  });
}

/**
 * Carve each landing interval out of the clips beneath it — the
 * OVERLAPS mode's destructive landing. Each interval is cut on its own
 * track only, so gaps between pasted clips delete nothing.
 */
export function carveIntervals(
  tracks: Track[],
  intervals: Array<{ trackIndex: number; start: number; end: number }>
): Track[] {
  let working = tracks;
  for (const { trackIndex, start, end } of intervals) {
    if (end - start <= EDGE_EPSILON) continue;
    working = applySplitCut(working, start, end, [trackIndex]);
  }
  return working;
}
