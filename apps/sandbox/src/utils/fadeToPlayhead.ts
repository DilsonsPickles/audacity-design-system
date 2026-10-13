/**
 * A FADE TO THE PLAYHEAD (user decision 2026-10-13, "a shortcut for moving
 * the fade in or fade out to the cursor pos"): ⌥F on the focused clip
 * takes a fade's boundary to the playhead — WHICH fade the clip infers
 * from where the playhead sits (fadeSideForTime: in the clip's first
 * half the fade-in, in its second the fade-out), so the chord carries no
 * side and there is nothing to remember ("I don't want to force the
 * user to line up the cursor, press F to select the correct handle and
 * then press the shortcut"); on a focused fade HANDLE the same chord
 * takes THAT fade, the side explicit (the screen reader has said which).
 * The targets are the fade rule's (fadeTargets: the clip, or every
 * selected audio clip when it is selected), EACH to the SAME playhead by
 * its own length, the side inferred from the FOCUSED clip for all. A playhead OUTSIDE a clip — at or
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

/** The fade the playhead means on a clip: in the first half the fade-in's
 *  boundary, in the second the fade-out's (a fade past half the clip is
 *  the rare case, left to the handle and the dialog). */
export function fadeSideForTime(clip: { start: number; duration: number }, time: number): 'in' | 'out' {
  return time < clip.start + clip.duration / 2 ? 'in' : 'out';
}
