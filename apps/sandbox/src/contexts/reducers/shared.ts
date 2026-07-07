// Dependency-free helpers/constants shared between TracksContext and the
// domain sub-reducers. Kept here (rather than in TracksContext) so the
// sub-reducers can import them without importing values back from
// TracksContext — which would create a runtime import cycle. The only
// dependency on TracksContext is the `Track` *type*, which is erased at
// compile time and so introduces no runtime cycle.
import type { Track } from '../TracksContext';

/** Expanded color palette for tracks — each new track cycles through these */
export const TRACK_COLOR_PALETTE = [
  'blue', 'violet', 'magenta', 'teal', 'cyan', 'green', 'orange', 'red', 'yellow',
] as const;

/**
 * Pure helper: expand the `selected` flag to include every clip whose `groupId`
 * matches a currently-selected clip. Idempotent.
 */
export function expandSelectionToGroups(tracks: Track[]): Track[] {
  const selectedGroupIds = new Set<string>();
  for (const t of tracks) {
    for (const c of t.clips) {
      if (c.selected && c.groupId) selectedGroupIds.add(c.groupId);
    }
  }
  if (selectedGroupIds.size === 0) return tracks;
  return tracks.map(t => ({
    ...t,
    clips: t.clips.map(c =>
      c.groupId && selectedGroupIds.has(c.groupId) && !c.selected
        ? { ...c, selected: true }
        : c
    ),
  }));
}

/**
 * Pure helper: clear `groupId` on every clip belonging to a group with
 * fewer than 2 members (counted across all tracks). Mirrors the
 * dissolve-below-two pass inside GROUP_SELECTED_CLIPS, applied after
 * operations that remove clips from the timeline. Returns the input
 * unchanged when no group is degenerate.
 */
export function dissolveDegenerateGroups(tracks: Track[]): Track[] {
  const counts = new Map<string, number>();
  for (const t of tracks) {
    for (const c of t.clips) {
      if (c.groupId) counts.set(c.groupId, (counts.get(c.groupId) ?? 0) + 1);
    }
  }
  const degenerate = new Set<string>();
  for (const [gid, n] of counts) {
    if (n < 2) degenerate.add(gid);
  }
  if (degenerate.size === 0) return tracks;
  return tracks.map(t => ({
    ...t,
    clips: t.clips.map(c =>
      c.groupId && degenerate.has(c.groupId) ? { ...c, groupId: undefined } : c
    ),
  }));
}
