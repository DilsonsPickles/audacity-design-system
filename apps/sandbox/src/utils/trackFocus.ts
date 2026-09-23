/**
 * Which rows can hold track FOCUS (track folders v1, user decision
 * 2026-09-23): a folder's own header never can — it is chrome that
 * names a family, not a lane you edit in — and neither can a child
 * hidden inside a collapsed folder. Keyboard navigation steps over
 * both, and `tracksReducer` redirects any action that would land focus
 * on one, so every path (arrow keys, canvas clicks, grouping, delete)
 * obeys the same rule without each having to know it.
 */
import { type FolderTrackLike, isFolderTrack, isHiddenByCollapse } from './trackFolders';

export function isFocusableTrack(tracks: readonly FolderTrackLike[], index: number): boolean {
  const track = tracks[index];
  if (!track) return false;
  return !isFolderTrack(track) && !isHiddenByCollapse(tracks, index);
}

/** The nearest focusable row strictly beyond `from` in `direction`, or
 *  null when there is none — arrow navigation's stepping rule. */
export function nearestFocusableTrack(
  tracks: readonly FolderTrackLike[],
  from: number,
  direction: 1 | -1,
): number | null {
  for (let i = from + direction; i >= 0 && i < tracks.length; i += direction) {
    if (isFocusableTrack(tracks, i)) return i;
  }
  return null;
}

/**
 * Where focus actually lands when something asks for `wanted`:
 *  - a focusable row: itself
 *  - a folder header (or a hidden child): the first focusable row
 *    BELOW it — for a folder that is its first visible child, which is
 *    what "focus this group" most usefully means (GROUP_SELECTED_TRACKS
 *    and a click on the folder's canvas band both arrive here)
 *  - failing that (collapsed or empty family at the bottom of the
 *    list): the previous focus if it is still focusable, else the
 *    nearest focusable row above, else nothing
 */
export function resolveFocusedTrack(
  tracks: readonly FolderTrackLike[],
  wanted: number | null,
  previous: number | null,
): number | null {
  if (wanted === null) return null;
  if (isFocusableTrack(tracks, wanted)) return wanted;
  const below = nearestFocusableTrack(tracks, wanted, 1);
  if (below !== null) return below;
  if (previous !== null && isFocusableTrack(tracks, previous)) return previous;
  return nearestFocusableTrack(tracks, wanted, -1);
}
