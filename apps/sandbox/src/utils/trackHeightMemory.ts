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
 *
 * EXPAND ONLY UNDOES A COLLAPSE — AUDACITY 3'S RULE (2026-10-29, "in
 * AU3, if you resize a track, you can collapse it, but expanding will
 * just put it back to where it was... so we've got that wrong"): a
 * collapsed track goes back to the height it remembers (the default
 * when it has none); an OPEN track is left alone, whatever its height.
 * The same day, first "funny how if the track is larger than the default
 * size, when you press expand, it gets smaller" (Expand took every open
 * track to the default), then RESET (`resetTracks`) took over "back to
 * the default size" — which is what the 2026-10-22 widening of Expand
 * was standing in for.
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

/** The updates that RESET `targets` to the default height, whatever
 *  they are — the one way back to normal now that Expand never shrinks
 *  (2026-10-29, "so perhaps we want a reset?"). A reset is a fresh
 *  start: any remembered collapse height goes with it. */
export function resetTracks(tracks: readonly HeightTrack[], targets: readonly number[], memory: HeightMemory): HeightUpdate[] {
  const updates: HeightUpdate[] = [];
  for (const index of targets) {
    const t = tracks[index];
    if (!t) continue;
    memory.delete(t.id);
    if (heightOf(t) !== DEFAULT_TRACK_HEIGHT) updates.push({ index, height: DEFAULT_TRACK_HEIGHT });
  }
  return updates;
}

/** The updates that EXPAND the collapsed targets: each back to its
 *  remembered height (the default when it has none). An open target is
 *  not touched — Reset is the way to the default. */
export function expandTracks(tracks: readonly HeightTrack[], targets: readonly number[], memory: HeightMemory): HeightUpdate[] {
  const updates: HeightUpdate[] = [];
  for (const index of targets) {
    const t = tracks[index];
    if (!t) continue;
    const current = heightOf(t);
    const remembered = memory.get(t.id);
    memory.delete(t.id); // used, or stale — a track that is open again has no collapse to undo
    if (!isCollapsedHeight(current)) continue;
    const height = remembered !== undefined && !isCollapsedHeight(remembered) ? remembered : DEFAULT_TRACK_HEIGHT;
    if (height !== current) updates.push({ index, height });
  }
  return updates;
}
