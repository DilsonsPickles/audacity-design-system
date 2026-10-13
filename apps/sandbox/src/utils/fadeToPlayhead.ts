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

/**
 * ⌥F FROM A TRACK (user request 2026-10-13, "if I have a track focus and
 * a cursor, it means I have x,y coordinates — so can't I use alt + F to
 * fade in/out on any clip?"): with NO clip focused, the chord takes the
 * clip UNDER THE PLAYHEAD on the track you are on — the track of the
 * header or row with the DOM focus, else the focused track — the side
 * inferred as from a focused clip (first half = fade-in). The playhead
 * is x, the track is y; the clip is theirs. Overlapping clips: the top
 * one (last in the array, the z-order rule). A playhead on no clip of
 * that track is nothing to fade; the caller says so.
 */
export interface TrackLike {
  name: string;
  type?: 'audio' | 'label' | 'midi' | 'folder';
  clips: ReadonlyArray<{ id: number; start: number; duration: number }>;
}

/** The track you are on, as a document listener sees it: the header or
 *  row with the focus (data-track-panel-index / data-track-index), else
 *  the focused track */
export function trackImOnOf(active: Element | null, focusedTrackIndex: number | null | undefined, trackCount: number): number | null {
  const fromDom = active?.closest<HTMLElement>('[data-track-index]')?.getAttribute('data-track-index')
    ?? active?.closest<HTMLElement>('[data-track-panel-index]')?.getAttribute('data-track-panel-index');
  if (fromDom !== null && fromDom !== undefined && Number(fromDom) >= 0 && Number(fromDom) < trackCount) return Number(fromDom);
  if (focusedTrackIndex !== null && focusedTrackIndex !== undefined && focusedTrackIndex >= 0 && focusedTrackIndex < trackCount) return focusedTrackIndex;
  return null;
}

/** The top-most audio clip STRICTLY containing `time` on the track */
export function clipAtTime<C extends { start: number; duration: number }>(track: { type?: string; clips: ReadonlyArray<C> }, time: number): C | null {
  if (track.type && track.type !== 'audio') return null;
  for (let i = track.clips.length - 1; i >= 0; i--) {
    const c = track.clips[i];
    if (time > c.start && time < c.start + c.duration) return c;
  }
  return null;
}

export interface TrackFadeToPlayhead {
  trackIndex: number;
  clipId: number;
  /** The fade the playhead means (⌥F) */
  side: 'in' | 'out';
  /** The edge the playhead means (⌥T / ⌥S): the same halves */
  edge: 'left' | 'right';
}

/** What ⌥F from a track would fade: the clip under the playhead on the
 *  track you are on, and which side — or null (no track, no clip there) */
export function resolveTrackFadeToPlayhead(
  tracks: ReadonlyArray<TrackLike>,
  focusedTrackIndex: number | null | undefined,
  active: Element | null,
  time: number,
): TrackFadeToPlayhead | null {
  const trackIndex = trackImOnOf(active, focusedTrackIndex, tracks.length);
  if (trackIndex === null) return null;
  const clip = clipAtTime(tracks[trackIndex], time);
  if (!clip) return null;
  const side = fadeSideForTime(clip, time);
  return { trackIndex, clipId: clip.id, side, edge: side === 'in' ? 'left' : 'right' };
}
