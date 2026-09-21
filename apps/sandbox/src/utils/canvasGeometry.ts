import type { Track } from '../contexts/TracksContext';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT } from '../constants/canvas';

/** Resolve which track index a Y pixel falls in; null when outside any row. */
export function resolveTrackIndexFromY(y: number, tracks: Track[]): number | null {
  let cursor = TOP_GAP;
  for (let i = 0; i < tracks.length; i++) {
    const h = tracks[i].height || DEFAULT_TRACK_HEIGHT;
    if (y >= cursor && y < cursor + h) return i;
    cursor += h + TRACK_GAP;
  }
  return null;
}

/** Build a split mutation for a clip on `trackIndex` strictly containing `time`. */
export function buildSplitForTrack(trackIndex: number, time: number, tracks: Track[]) {
  const track = tracks[trackIndex];
  if (!track) return null;
  // Clips may overlap: array position is the z-order, so findLast —
  // the split tool cuts the clip the user SEES at that x (topmost).
  const hit = [...track.clips].reverse().find((c) => {
    const start = c.start;
    const end = c.start + c.duration;
    return time > start + 0.0001 && time < end - 0.0001;
  });
  if (!hit) return null;
  return { type: 'split' as const, clipId: hit.id, trackIndex, leftEnd: time, rightStart: time };
}
