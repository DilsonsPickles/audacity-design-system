/**
 * Which clip the Clip properties panel shows: the FOCUSED clip first
 * (2026-10-06, "can it be the focused clip?" — the clip with DOM focus,
 * from useFocusedClip; arrowing or tabbing between clips moves the
 * panel with it), else the ONE selected audio clip when the selection
 * is a single clip (selection by menu or macro still switches the
 * panel) — and otherwise NOTHING: the empty state (2026-10-07, "if no
 * clip is selected, or focused, show empty state"; until then the
 * panel kept showing the last clip it had shown). It never guesses
 * between several selected clips — the dock panel shows their merge.
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
  focused: { trackIndex: number; clipId: number } | null = null,
): ResolvedClip<C> | null {
  if (focused) {
    const clip = tracks[focused.trackIndex]?.clips.find((c) => c.id === focused.clipId);
    if (clip) return { trackIndex: focused.trackIndex, clip };
  }
  return singleSelectedClip(tracks);
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
