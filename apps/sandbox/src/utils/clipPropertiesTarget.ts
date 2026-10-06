/**
 * Which clip the Clip properties panel shows: the FOCUSED clip first
 * (2026-10-06, "can it be the focused clip?" — the clip with DOM focus,
 * from useFocusedClip; arrowing or tabbing between clips moves the
 * panel with it), else the clip it last showed (its target: the one it
 * was opened on, or the last clip that had focus or was the single
 * selection, as the dock panel records them), else the ONE selected
 * audio clip when the selection is a single clip — while that clip
 * still exists; otherwise none. It never guesses between several
 * selected clips.
 */
export interface PropertiesClipLike {
  id: number;
  selected?: boolean;
}

export interface ResolvedClip<C> {
  trackIndex: number;
  clip: C;
}

export function resolveClipPropertiesClip<C extends PropertiesClipLike>(
  tracks: ReadonlyArray<{ clips: ReadonlyArray<C> }>,
  target: { trackIndex: number; clipId: number } | null,
  focused: { trackIndex: number; clipId: number } | null = null,
): ResolvedClip<C> | null {
  const find = (ref: { trackIndex: number; clipId: number } | null): ResolvedClip<C> | null => {
    if (!ref) return null;
    const clip = tracks[ref.trackIndex]?.clips.find((c) => c.id === ref.clipId);
    return clip ? { trackIndex: ref.trackIndex, clip } : null;
  };
  return find(focused) ?? find(target) ?? singleSelectedClip(tracks);
}

/** The one selected clip, when exactly one is */
export function singleSelectedClip<C extends PropertiesClipLike>(
  tracks: ReadonlyArray<{ clips: ReadonlyArray<C> }>,
): ResolvedClip<C> | null {
  let found: ResolvedClip<C> | null = null;
  let count = 0;
  tracks.forEach((t, trackIndex) => {
    for (const clip of t.clips) {
      if (!clip.selected) continue;
      count++;
      if (!found) found = { trackIndex, clip };
    }
  });
  return count === 1 ? found : null;
}
