/**
 * Cut operations utility
 *
 * Provides two cut modes:
 * - Split Cut: Deletes audio but leaves timeline intact (splits clips)
 * - Ripple Cut: Deletes audio and shifts everything left (ripple effect)
 */

export type CutMode = 'split' | 'ripple';

interface EnvelopePoint {
  time: number;
  db: number;
}

interface DeletedRegion {
  startTime: number;
  duration: number;
}

interface Clip {
  id: number;
  name: string;
  start: number;
  duration: number;
  waveform?: number[];
  waveformLeft?: number[];
  waveformRight?: number[];
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
  trimStart?: number;
  fullDuration?: number;
  deletedRegions?: DeletedRegion[];
}

interface Track {
  id: number;
  name: string;
  height?: number;
  viewMode?: 'waveform' | 'spectrogram' | 'split';
  channelSplitRatio?: number;
  clips: Clip[];
  labels?: any[];
}

/**
 * Apply split cut to tracks
 * Deletes audio within time range but keeps timeline intact
 * Clips are split where necessary
 * Only affects selected tracks
 */
export function applySplitCut(
  tracks: Track[],
  startTime: number,
  endTime: number,
  selectedTrackIndices: number[]
): Track[] {
  const deletionDuration = endTime - startTime;
  let nextClipId = Math.max(...tracks.flatMap(t => t.clips.map(c => c.id))) + 1;

  return tracks.map((track, trackIndex) => {
    // Only apply cut to selected tracks
    if (!selectedTrackIndices.includes(trackIndex)) {
      return track;
    }

    return {
      ...track,
      clips: track.clips.flatMap(clip => {
      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;

      // Case 1: No overlap - keep clip unchanged
      if (endTime <= clipStart || startTime >= clipEnd) {
        return [clip];
      }

      // Case 2: Deletion completely contains clip - delete it
      if (startTime <= clipStart && endTime >= clipEnd) {
        return [];
      }

      // Case 3: Deletion completely within clip - split into 2 clips
      if (startTime > clipStart && endTime < clipEnd) {
        const relativeStart = startTime - clipStart;
        const relativeEnd = endTime - clipStart;

        // First clip: from start to deletion start
        const firstClip: Clip = {
          ...clip,
          duration: relativeStart,
          envelopePoints: clip.envelopePoints.filter(p => p.time < relativeStart),
        };

        // Second clip: from deletion end to clip end
        const secondClipDuration = clipEnd - endTime;
        const newTrimStart = (clip.trimStart || 0) + relativeEnd;

        const secondClip: Clip = {
          ...clip,
          id: nextClipId++,
          name: `${clip.name} (split)`,
          start: endTime,
          duration: secondClipDuration,
          trimStart: newTrimStart,
          // Shift envelope points left by the amount cut + the first clip duration
          envelopePoints: clip.envelopePoints
            .filter(p => p.time >= relativeEnd)
            .map(p => ({ ...p, time: p.time - relativeEnd })),
        };

        return [firstClip, secondClip];
      }

      // Case 4: Deletion overlaps start of clip - trim the overlapping portion
      // In split cut, we don't shift the clip - we just trim from the beginning
      if (startTime < clipStart && endTime > clipStart) {
        const overlapDuration = endTime - clipStart;
        const newDuration = clip.duration - overlapDuration;
        const newTrimStart = (clip.trimStart || 0) + overlapDuration;

        return [{
          ...clip,
          start: endTime, // Clip now starts where the deletion ends
          duration: newDuration,
          trimStart: newTrimStart,
          envelopePoints: clip.envelopePoints
            .map(p => ({ ...p, time: p.time - overlapDuration }))
            .filter(p => p.time >= 0),
        }];
      }

      // Case 5: Deletion overlaps end of clip - trim end
      if (startTime < clipEnd && endTime >= clipEnd) {
        const relativeStart = startTime - clipStart;
        const newDuration = relativeStart;

        return [{
          ...clip,
          duration: newDuration,
          envelopePoints: clip.envelopePoints.filter(p => p.time < relativeStart),
        }];
      }

      return [clip];
    })
    };
  });
}

/**
 * Apply ripple cut to tracks
 * Deletes audio and shifts everything after the deletion left
 * Clips may be split, deleted, or have deletedRegions added
 * Only affects selected tracks
 */
export function applyRippleCut(
  tracks: Track[],
  startTime: number,
  endTime: number,
  selectedTrackIndices: number[]
): Track[] {
  const deletionDuration = endTime - startTime;

  return tracks.map((track, trackIndex) => {
    // Only apply cut to selected tracks
    if (!selectedTrackIndices.includes(trackIndex)) {
      return track;
    }

    return {
      ...track,
      clips: track.clips.map(clip => {
      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;

      // Case 1: Deletion range doesn't overlap with clip - shift if after deletion
      if (endTime <= clipStart) {
        // Clip is after deletion - shift left
        return {
          ...clip,
          start: clip.start - deletionDuration,
        };
      }

      if (startTime >= clipEnd) {
        // Clip is before deletion - no change
        return clip;
      }

      // Case 2: Deletion range completely contains the clip - mark for deletion
      if (startTime <= clipStart && endTime >= clipEnd) {
        return null; // Will be filtered out
      }

      // Case 3: Deletion range is completely within the clip - add to deletedRegions
      if (startTime >= clipStart && endTime <= clipEnd) {
        const relativeStart = startTime - clipStart;
        const existingDeleted = clip.deletedRegions || [];

        // Add new deleted region and ensure they're sorted
        const newDeletedRegions = [...existingDeleted, { startTime: relativeStart, duration: deletionDuration }]
          .sort((a, b) => a.startTime - b.startTime);

        // Update duration (reduced by deletion)
        const newDuration = clip.duration - deletionDuration;

        return {
          ...clip,
          duration: newDuration,
          deletedRegions: newDeletedRegions
        };
      }

      // Case 4: Deletion overlaps start of clip
      if (startTime < clipStart && endTime > clipStart) {
        const overlapDuration = endTime - clipStart;
        const newDuration = clip.duration - overlapDuration;
        const newTrimStart = (clip.trimStart || 0) + overlapDuration;

        // Shift envelope points left by overlap duration
        const shiftedEnvelopePoints = clip.envelopePoints
          .map(point => ({ ...point, time: point.time - overlapDuration }))
          .filter(point => point.time >= 0);

        // Shift deleted regions left by overlap duration
        const shiftedDeletedRegions = (clip.deletedRegions || [])
          .map(region => ({ ...region, startTime: region.startTime - overlapDuration }))
          .filter(region => region.startTime >= 0);

        return {
          ...clip,
          start: startTime, // Clip starts where deletion started (shifted left)
          duration: newDuration,
          trimStart: newTrimStart,
          envelopePoints: shiftedEnvelopePoints,
          deletedRegions: shiftedDeletedRegions.length > 0 ? shiftedDeletedRegions : undefined
        };
      }

      // Case 5: Deletion overlaps end of clip
      if (startTime < clipEnd && endTime >= clipEnd) {
        const overlapDuration = clipEnd - startTime;
        const newDuration = clip.duration - overlapDuration;
        const relativeStart = startTime - clipStart;

        // Filter envelope points that are in the deleted range
        const filteredEnvelopePoints = clip.envelopePoints
          .filter(point => point.time < relativeStart);

        // Filter deleted regions that are in the deletion range
        const filteredDeletedRegions = (clip.deletedRegions || [])
          .filter(region => region.startTime < relativeStart);

        return {
          ...clip,
          duration: newDuration,
          envelopePoints: filteredEnvelopePoints,
          deletedRegions: filteredDeletedRegions.length > 0 ? filteredDeletedRegions : undefined
        };
      }

      return clip;
    }).filter((clip): clip is Clip => clip !== null) // Remove null clips (fully deleted)
    };
  });
}

/**
 * Apply cut operation based on mode
 * Only affects selected tracks
 */
export function applyCut(
  tracks: Track[],
  startTime: number,
  endTime: number,
  mode: CutMode,
  selectedTrackIndices: number[]
): Track[] {
  if (mode === 'split') {
    return applySplitCut(tracks, startTime, endTime, selectedTrackIndices);
  } else {
    return applyRippleCut(tracks, startTime, endTime, selectedTrackIndices);
  }
}
