/**
 * Collapse / expand with MEMORY (2026-10-22, "collapse remembers, expand
 * restores"): Collapse takes every target to the 44px floor and remembers
 * the height it left, by track id; EXPAND TAKES EVERY TARGET TO ITS OPEN
 * HEIGHT — a collapsed track back to what it was before the collapse,
 * every other track to the default. (A first cut the same day left a
 * track that was not collapsed alone, Audacity 3's "expand collapsed":
 * "I did fit and then expand, but they didn't expand" — after Fit nothing
 * is collapsed, so the button did nothing and read as broken; Expand
 * means "back to normal size", and only a collapsed track has a normal
 * size to remember.) The memory counts only while the track is STILL
 * collapsed: collapse, fit, expand gives the default, since Fit already
 * moved it. One rule for the all-tracks and the selected-tracks forms.
 */
import { DEFAULT_TRACK_HEIGHT } from '../constants/canvas';

export const COLLAPSED_TRACK_HEIGHT = 44;

/** Remembered heights by track id — session state, never saved. */
export type HeightMemory = Map<TrackId, number>;

export interface HeightUpdate {
  index: number;
  height: number;
}

type TrackId = string | number;

interface HeightTrack {
  id: TrackId;
  height?: number;
}

const heightOf = (t: HeightTrack) => t.height || DEFAULT_TRACK_HEIGHT;
export const isCollapsedHeight = (height: number) => height <= COLLAPSED_TRACK_HEIGHT;

/** The updates that collapse `targets`, remembering what they were. */
export function collapseTracks(tracks: readonly HeightTrack[], targets: readonly number[], memory: HeightMemory): HeightUpdate[] {
  const updates: HeightUpdate[] = [];
  for (const index of targets) {
    const t = tracks[index];
    if (!t) continue;
    const height = heightOf(t);
    if (isCollapsedHeight(height)) continue; // already collapsed: its memory stands
    memory.set(t.id, height);
    updates.push({ index, height: COLLAPSED_TRACK_HEIGHT });
  }
  return updates;
}

/** The updates that take every target to its open height: a collapsed
 *  track to its remembered height (the default when it has none), every
 *  other track to the default. A track already there gets no update. */
export function expandTracks(tracks: readonly HeightTrack[], targets: readonly number[], memory: HeightMemory): HeightUpdate[] {
  const updates: HeightUpdate[] = [];
  for (const index of targets) {
    const t = tracks[index];
    if (!t) continue;
    const current = heightOf(t);
    const remembered = isCollapsedHeight(current) ? memory.get(t.id) : undefined;
    memory.delete(t.id); // used, or stale — a track that is open again has no collapse to undo
    const height = remembered !== undefined && !isCollapsedHeight(remembered) ? remembered : DEFAULT_TRACK_HEIGHT;
    if (height !== current) updates.push({ index, height });
  }
  return updates;
}
