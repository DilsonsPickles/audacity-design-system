/**
 * Which clip the Clip properties panel shows (2026-10-02): the ONE
 * selected audio clip when the selection is a single clip — so selecting
 * another clip switches the panel to it ("when I select a different
 * clip, change the panel") — otherwise the clip it last showed (its
 * target: the one it was opened on, or the last single selection the
 * dock panel recorded), while that clip still exists; otherwise none.
 * It never guesses between several selected clips.
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
): ResolvedClip<C> | null {
  const single = singleSelectedClip(tracks);
  if (single) return single;
  if (target) {
    const clip = tracks[target.trackIndex]?.clips.find((c) => c.id === target.clipId);
    if (clip) return { trackIndex: target.trackIndex, clip };
  }
  return null;
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
