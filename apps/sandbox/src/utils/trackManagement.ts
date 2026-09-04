// Pure id/name allocation + track-duplication math for EditorLayout's
// onAddTrackType and onDuplicateTrack handlers. Kept side-effect free and
// framework-agnostic so it can be unit tested without mounting the reducer.
import type { TrackType } from '@audacity-ui/components';
import type { Track } from '../contexts/TracksContext';
import { computeWholeGroupIds, regroupCopiedClips } from './clipGroupCopy';

/** A track payload with an `insertAt` slot, matching the ADD_TRACK action's
 *  optional-insertAt payload shape (see TracksContext.tsx). */
export type DuplicatedTrack = Track & { insertAt: number };

/** Next non-colliding track id. Uses max(id)+1 rather than length+1 so ids
 *  allocated after a middle track was deleted never collide with a
 *  surviving one. `Math.max(..., 0)` guard makes this 1 for an empty list. */
export function nextTrackId(tracks: Pick<Track, 'id'>[]): number {
  return Math.max(...tracks.map((t) => t.id), 0) + 1;
}

/** Next non-colliding clip id across every clip in every given track. Same
 *  max+1 scheme as nextTrackId, scoped to clips; `Math.max(..., 0)` guard
 *  makes this 1 when there are no clips anywhere. */
export function nextClipId(tracks: Pick<Track, 'clips'>[]): number {
  return Math.max(...tracks.flatMap((t) => t.clips.map((c) => c.id)), 0) + 1;
}

/** Display-name prefix for a track type, as shown in the AddTrackFlyout. */
export function trackTypePrefix(type: TrackType): string {
  switch (type) {
    case 'label':
      return 'Label';
    case 'stereo':
      return 'Stereo';
    case 'mono':
      return 'Mono';
    case 'midi':
      return 'MIDI';
    default:
      return 'Track';
  }
}

/** Next free numeric suffix for `${prefix} N` names, derived from existing
 *  track names (not track count) so it's immune to gaps left by deletes. */
export function nextTrackNameNumber(tracks: Pick<Track, 'name'>[], prefix: string): number {
  const namePattern = new RegExp(`^${prefix} (\\d+)$`);
  const usedNumbers = tracks
    .map((t) => {
      const m = namePattern.exec(t.name ?? '');
      return m ? parseInt(m[1], 10) : NaN;
    })
    .filter((n: number) => !isNaN(n));
  return usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
}

/** Builds a new track for onAddTrackType: allocates a non-colliding id and
 *  a "Prefix N" name (both immune to gaps left by deletes), and fills in
 *  the type-specific defaults (height, channelSplitRatio, midiClips). */
export function buildNewTrack(type: TrackType, tracks: Track[]): Track {
  const prefix = trackTypePrefix(type);
  const id = nextTrackId(tracks);
  const nameNumber = nextTrackNameNumber(tracks, prefix);
  const trackType: 'audio' | 'label' | 'midi' =
    type === 'label' ? 'label' : type === 'midi' ? 'midi' : 'audio';

  return {
    id,
    name: `${prefix} ${nameNumber}`,
    type: trackType,
    height: type === 'label' ? 76 : 114,
    ...(type === 'stereo' ? { channelSplitRatio: 0.5 } : {}),
    clips: [],
    ...(type === 'midi' ? { midiClips: [] } : {}),
  };
}

/**
 * Builds duplicated tracks for onDuplicateTrack: clones each selected
 * track's clips with fresh ids, applies the clip-group copy invariant
 * (docs/superpowers/specs/2026-07-07-clip-group-copy-semantics-design.md —
 * copies never tether to their originals; they form a fresh group iff the
 * whole source group was copied, else they're ungrouped) across the union
 * of every track duplicated in this one operation, and stamps `insertAt`
 * so each duplicate lands directly after its source in the track stack.
 *
 * `trackIndices` need not be sorted or unique-checked by the caller — out
 * of range indices are skipped, and processing is internally ordered
 * descending so id allocation matches the original inline handler.
 */
export function buildDuplicatedTracks(
  trackIndices: number[],
  tracks: Track[],
): DuplicatedTrack[] {
  // Descending so, when a caller dispatches these ADD_TRACKs in order, each
  // splice into the reducer's track array doesn't shift indices belonging
  // to duplicates not yet processed.
  const sortedIndices = [...trackIndices].sort((a, b) => b - a);

  let cloneClipId = nextClipId(tracks);
  let cloneTrackId = nextTrackId(tracks);

  // Clone all clips first so group entirety is judged on the union of
  // every track duplicated in this operation (spec: copies regroup fresh
  // iff the whole group was copied whole).
  const perTrack = sortedIndices.flatMap((idx) => {
    const originalTrack = tracks[idx];
    if (!originalTrack) return [];
    return [{
      idx,
      originalTrack,
      clones: originalTrack.clips.map((clip) => ({
        ...clip,
        id: cloneClipId++,
      })),
    }];
  });

  const wholeGroups = computeWholeGroupIds(
    perTrack.flatMap((p) => p.originalTrack.clips),
    tracks,
  );
  const regrouped = regroupCopiedClips(
    perTrack.flatMap((p) => p.clones),
    wholeGroups,
  );

  let cloneIdx = 0;
  return perTrack.map(({ idx, originalTrack, clones }) => ({
    ...originalTrack,
    id: cloneTrackId++,
    name: `${originalTrack.name} (copy)`,
    clips: clones.map(() => regrouped[cloneIdx++]),
    // Drop the copy directly after its source so it's adjacent in the
    // side panel rather than floating at the bottom of the track stack.
    insertAt: idx + 1,
  }));
}
