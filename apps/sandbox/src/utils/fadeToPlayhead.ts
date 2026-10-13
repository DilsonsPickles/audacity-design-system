/**
 * A FADE TO THE PLAYHEAD (user decision 2026-10-13, "a shortcut for moving
 * the fade in or fade out to the cursor pos"): Option+Shift+[ takes the
 * focused clip's FADE-IN boundary to the playhead, Option+Shift+] its
 * FADE-OUT boundary — the fade's keyboard form of the trim-to-playhead
 * brackets (Option+[ / ]). The targets are the fade rule's (fadeTargets:
 * the clip, or every selected audio clip when it is selected), EACH to
 * the SAME playhead by its own length. A playhead OUTSIDE a clip — at or
 * before its start, at or past its end — is refused for that clip, not
 * clamped (the trim-to-playhead rule: a fade from nowhere is not a fade);
 * the reducer's SET_CLIP_FADE then clamps to the clip and shrinks the
 * opposite fade where the two would meet (2026-10-06, "the fade being
 * set wins the room").
 */
export interface FadeToTimeTarget {
  trackIndex: number;
  clipId: number;
  start: number;
  duration: number;
}

export interface FadeToTimeUpdate {
  trackIndex: number;
  clipId: number;
  seconds: number;
}

export function computeFadeToTime(
  targets: ReadonlyArray<FadeToTimeTarget>,
  side: 'in' | 'out',
  time: number,
): FadeToTimeUpdate[] {
  const updates: FadeToTimeUpdate[] = [];
  for (const t of targets) {
    const end = t.start + t.duration;
    if (!(time > t.start && time < end)) continue;
    const seconds = side === 'in' ? time - t.start : end - time;
    updates.push({ trackIndex: t.trackIndex, clipId: t.clipId, seconds });
  }
  return updates;
}
