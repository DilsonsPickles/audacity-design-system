/**
 * Which clips a quick-fade edit applies to (user decision 2026-09-30):
 * a fade set on a SELECTED clip — its length, or its shape — is set on
 * EVERY selected audio clip; on an unselected clip it is that clip
 * alone. The same rule the trim handles follow.
 *
 * Lengths are clamped PER CLIP to the clip's own length: each takes as
 * much of the dragged length as it has — and where that reaches into
 * its opposite fade, the reducer makes that fade give way (SET_CLIP_FADE,
 * 2026-10-06: the fade being set wins the room). (Where a clip's edge
 * is crossfaded the drawn and audible fade is suppressed anyway — the
 * crossfade wins — so no clamp is needed for that here.)
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

/** The dragged length, held to the clip's own length (the opposite
 *  fade gives way to it — the reducer's rule) */
export function clampFadeSeconds(tracks: readonly Track[], target: FadeTarget, side: 'in' | 'out', seconds: number): number {
  const clip = tracks[target.trackIndex]?.clips.find((c) => c.id === target.clipId);
  if (!clip) return seconds;
  void side;
  const clamped = Math.max(0, Math.min(clip.duration, seconds));
  return clamped < 0.02 ? 0 : clamped;
}
