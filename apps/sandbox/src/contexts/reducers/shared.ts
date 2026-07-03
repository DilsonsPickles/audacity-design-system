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
