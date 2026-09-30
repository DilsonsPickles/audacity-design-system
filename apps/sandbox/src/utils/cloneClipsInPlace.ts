/**
 * Copies of clips, each sitting exactly where its source sits — the
 * first step of Cmd+drag-to-duplicate (user decision 2026-09-30): the
 * copies are what the drag then moves, and the sources stay put.
 *
 * Same copy rules as Cmd+D (hooks/handlers/duplicateHandlers.ts):
 * fresh ids allocated in one pass, waveform arrays shared by reference,
 * `sourceClipId` carried so playback resolves the original buffer, and
 * the group invariant — a fresh group iff a whole source group is
 * copied whole, ungrouped otherwise, never tethered to the originals.
 * The copies come out SELECTED (they are the drag's clips); the sources
 * are left as they are.
 */
import type { Track, Clip } from '../contexts/TracksContext';
import { computeWholeGroupIds, regroupCopiedClips } from './clipGroupCopy';
import { nextClipId } from './trackManagement';

export interface ClipRef {
  trackIndex: number;
  clipId: number;
}

export interface PlacedClip {
  trackIndex: number;
  clip: Clip;
  /** Which target this is the copy of (a target that does not exist
   *  gets no copy, so the list can be shorter than the targets) */
  from: ClipRef;
}

export function cloneClipsInPlace(tracks: readonly Track[], targets: readonly ClipRef[]): PlacedClip[] {
  const sources: Array<{ from: ClipRef; clip: Clip }> = [];
  for (const target of targets) {
    const clip = tracks[target.trackIndex]?.clips.find((c) => c.id === target.clipId);
    if (clip) sources.push({ from: target, clip });
  }
  if (sources.length === 0) return [];

  let id = nextClipId(tracks as Track[]);
  const copies = sources.map(({ from, clip }) => ({
    from,
    clip: {
      ...clip,
      id: id++,
      selected: true,
      sourceClipId: clip.sourceClipId ?? clip.id,
    },
  }));
  const wholeGroups = computeWholeGroupIds(sources.map((s) => s.clip), tracks as Track[]);
  const regrouped = regroupCopiedClips(copies.map((c) => c.clip), wholeGroups);
  return copies.map((c, i) => ({ trackIndex: c.from.trackIndex, clip: regrouped[i], from: c.from }));
}
