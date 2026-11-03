/**
 * "The tracks I'm on" for the track-height commands — ⌥⌘↑ ↓ (step),
 * ⌥⌘C / ⌥⌘X (collapse / expand selected) and ⌥⌘0 (fit selected).
 *
 * The track with focus first: the clip or header holding the DOM focus,
 * else the focused track. A FOCUSED TRACK INSIDE THE SELECTION TAKES THE
 * WHOLE SELECTION (2026-11-04, "collapsing selected tracks only collapse
 * those that contain audio. Same goes for label tracks, if label tracks
 * have no labels"): a time selection dragged across three tracks leaves the
 * focus on one of them, and the focus used to win outright, so "Collapse
 * selected tracks" collapsed only that one — the selection's rule for
 * keyboard ranges and clip edits, where a scope that contains the focus is
 * kept. A focused track OUTSIDE the selection still acts alone (the
 * 2026-10-08 "it should be the focused track that gets resized"). With no
 * focus, the selection; with neither, every track.
 */
export function resolveTracksImOn(
  trackCount: number,
  focused: number | null | undefined,
  selected: readonly number[],
): number[] {
  const valid = (i: number | null | undefined): i is number =>
    i !== null && i !== undefined && i >= 0 && i < trackCount;
  const selection = selected.filter((i) => valid(i));
  if (valid(focused)) {
    return selection.includes(focused) ? [...selection].sort((a, b) => a - b) : [focused];
  }
  if (selection.length > 0) return [...selection].sort((a, b) => a - b);
  return Array.from({ length: trackCount }, (_, i) => i);
}
