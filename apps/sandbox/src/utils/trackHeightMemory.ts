/**
 * Collapse / expand with MEMORY (2026-10-22, "collapse remembers, expand
 * restores"): Collapse takes every target to the 44px floor and remembers
 * the height it left, by track id; Expand puts every COLLAPSED target
 * back to that height — the default when it has none — and leaves a
 * track that is not collapsed alone. Audacity 3's minimise model: a
 * collapsed track is a flag over a stored height, not a new height, so
 * someone who dragged a track tall, collapsed all to find something and
 * expanded again gets their layout back (Expand set every track to 114
 * until then, and a track dragged to a height since the collapse is not
 * collapsed, so Expand does not touch it). One rule for the all-tracks
 * and the selected-tracks forms.
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

/** The updates that expand the COLLAPSED tracks among `targets`. */
export function expandTracks(tracks: readonly HeightTrack[], targets: readonly number[], memory: HeightMemory): HeightUpdate[] {
  const updates: HeightUpdate[] = [];
  for (const index of targets) {
    const t = tracks[index];
    if (!t || !isCollapsedHeight(heightOf(t))) continue; // not collapsed: not ours
    const remembered = memory.get(t.id);
    memory.delete(t.id);
    const height = remembered !== undefined && !isCollapsedHeight(remembered) ? remembered : DEFAULT_TRACK_HEIGHT;
    updates.push({ index, height });
  }
  return updates;
}
