/**
 * Which clip the Clip properties panel shows (2026-10-02): the clip it
 * was opened on while that clip still exists; otherwise the ONE selected
 * audio clip, if the selection is a single clip; otherwise none. So the
 * panel follows a click on "Clip properties…" first, and the selection
 * once that clip is gone — and never guesses between several.
 */
export interface PropertiesClipLike {
  id: number;
  selected?: boolean;
}

export interface PropertiesTrackLike {
  clips: ReadonlyArray<PropertiesClipLike>;
}

export interface ResolvedClip<C> {
  trackIndex: number;
  clip: C;
}

export function resolveClipPropertiesClip<C extends PropertiesClipLike>(
  tracks: ReadonlyArray<{ clips: ReadonlyArray<C> }>,
  target: { trackIndex: number; clipId: number } | null,
): ResolvedClip<C> | null {
  if (target) {
    const clip = tracks[target.trackIndex]?.clips.find((c) => c.id === target.clipId);
    if (clip) return { trackIndex: target.trackIndex, clip };
  }
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
