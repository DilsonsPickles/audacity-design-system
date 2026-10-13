/**
 * ↑ / ↓ ON A FOCUSED CLIP MOVE THE CLIP FOCUS (user request 2026-10-13,
 * "when we have a clip focused, and we press up or down, can we move the
 * clip focus up and down to the nearest clip?"): to the NEAREST clip on
 * the nearest focusable track above / below that HAS a clip — tracks
 * with none (a label track, an empty lane) are stepped over, as folder
 * headers and hidden children are. "Nearest" is by time: the clip that
 * OVERLAPS the focused clip's span the most, else the one whose edge is
 * closest to it; a tie goes to the earlier clip. Audio and MIDI clips
 * alike. When no track in that direction has a clip, the caller falls
 * back to the track-row focus the arrows always gave.
 */
import { isFocusableTrack } from './trackFocus';
import type { FolderTrackLike } from './trackFolders';

export interface VerticalNavClipLike { id: number; start: number; duration: number }
export interface VerticalNavTrackLike extends FolderTrackLike {
  clips?: ReadonlyArray<VerticalNavClipLike>;
  midiClips?: ReadonlyArray<VerticalNavClipLike>;
}

export interface ClipFocusTarget { trackIndex: number; clipId: number }

const allClips = (t: VerticalNavTrackLike): VerticalNavClipLike[] => [...(t.clips ?? []), ...(t.midiClips ?? [])];

/** The clip on `track` nearest in time to the span [start, end] */
export function nearestClipTo(track: VerticalNavTrackLike, start: number, end: number): VerticalNavClipLike | null {
  let best: VerticalNavClipLike | null = null;
  let bestOverlap = 0;
  let bestGap = Infinity;
  for (const c of allClips(track)) {
    const cEnd = c.start + c.duration;
    const overlap = Math.min(end, cEnd) - Math.max(start, c.start);
    if (overlap > 0) {
      if (overlap > bestOverlap || (overlap === bestOverlap && best !== null && bestOverlap > 0 && c.start < best.start)) { best = c; bestOverlap = overlap; bestGap = 0; }
      continue;
    }
    if (bestOverlap > 0) continue;
    const gap = c.start >= end ? c.start - end : start - cEnd;
    if (gap < bestGap || (gap === bestGap && best !== null && c.start < best.start)) { best = c; bestGap = gap; }
  }
  return best;
}

/** Where ↑ / ↓ take the clip focus from `clipId` on `trackIndex`, or
 *  null when no track in that direction has a clip */
export function nearestClipOnNeighbourTrack(
  tracks: ReadonlyArray<VerticalNavTrackLike>,
  trackIndex: number,
  clipId: number,
  direction: 1 | -1,
): ClipFocusTarget | null {
  const from = tracks[trackIndex] && allClips(tracks[trackIndex]).find((c) => c.id === clipId);
  if (!from) return null;
  const start = from.start;
  const end = from.start + from.duration;
  for (let i = trackIndex + direction; i >= 0 && i < tracks.length; i += direction) {
    if (!isFocusableTrack(tracks, i)) continue;
    const hit = nearestClipTo(tracks[i], start, end);
    if (hit) return { trackIndex: i, clipId: hit.id };
  }
  return null;
}
