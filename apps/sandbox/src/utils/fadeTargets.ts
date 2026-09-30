/**
 * Which clips a quick-fade edit applies to (user decision 2026-09-30):
 * a fade set on a SELECTED clip — its length, or its shape — is set on
 * EVERY selected audio clip; on an unselected clip it is that clip
 * alone. The same rule the trim handles follow.
 *
 * Lengths are clamped PER CLIP: each takes as much of the dragged
 * length as it has room for, next to its own opposite fade. (Where a
 * clip's edge is crossfaded the drawn and audible fade is suppressed
 * anyway — the crossfade wins — so no clamp is needed for that here.)
 */
import type { Track } from '../contexts/TracksContext';

export interface FadeTarget {
  trackIndex: number;
  clipId: number;
}

export function fadeTargets(tracks: readonly Track[], trackIndex: number, clipId: number): FadeTarget[] {
  const grabbed = tracks[trackIndex]?.clips.find((c) => c.id === clipId);
  if (!grabbed) return [];
  if (!grabbed.selected) return [{ trackIndex, clipId }];
  const out: FadeTarget[] = [];
  tracks.forEach((t, ti) => {
    if (t.type && t.type !== 'audio') return;
    t.clips.forEach((c) => {
      if (c.selected) out.push({ trackIndex: ti, clipId: c.id });
    });
  });
  return out;
}

/** The dragged length, held to what this clip has room for */
export function clampFadeSeconds(tracks: readonly Track[], target: FadeTarget, side: 'in' | 'out', seconds: number): number {
  const clip = tracks[target.trackIndex]?.clips.find((c) => c.id === target.clipId);
  if (!clip) return seconds;
  const other = (side === 'in' ? clip.fadeOut : clip.fadeIn) ?? 0;
  const room = Math.max(0, clip.duration - other);
  const clamped = Math.max(0, Math.min(room, seconds));
  return clamped < 0.02 ? 0 : clamped;
}
