/**
 * Cut operations utility
 *
 * Provides two cut modes:
 * - Split Cut: Deletes audio but leaves timeline intact (splits clips)
 * - Ripple Cut: Deletes audio and shifts everything left (ripple effect)
 */

import type { FadeShape } from '@audacity-ui/components';
import type { Label } from '../contexts/TracksContext';

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
  /** Visual time-stretch factor (canvas / source). Splits + trims need it
   *  so canvas-time deltas map to source-time updates correctly. */
  stretchFactor?: number;
  deletedRegions?: DeletedRegion[];
  fadeIn?: number;
  fadeOut?: number;
  fadeInShape?: FadeShape;
  fadeOutShape?: FadeShape;
  crossfadeInShape?: number | 'linear';
  crossfadeOutShape?: number | 'linear';
}

interface Track {
  id: number;
  name: string;
  height?: number;
  viewMode?: 'waveform' | 'spectrogram' | 'split';
  channelSplitRatio?: number;
  clips: Clip[];
  labels?: Label[];
}

/** A fade shorter than this is no fade (the reducers' MIN_FADE_SECONDS) */
const MIN_FADE_SECONDS = 0.02;

/**
 * A CUT THROUGH A FADE (user decision 2026-10-28, "what do we do when we
 * cut audio from the middle of a clip with a long fade?" — the split's
 * rule of 2026-10-27, which range cuts had never followed: they copied
 * both fades onto both halves, so each cut edge grew a fade and a half
 * could keep a fade longer than itself). A FADE BELONGS TO ITS EDGE,
 * SHORTENED TO FIT: a cut edge grows no fade; a fade whose edge
 * survives is stored at what still fits — a whole fade, squeezed — and
 * one under MIN_FADE_SECONDS is dropped with its shape.
 */
function withFades<C extends Clip>(clip: C, fadeIn: number, fadeOut: number): C {
  const keep = (n: number) => (n >= MIN_FADE_SECONDS ? n : undefined);
  const fi = keep(fadeIn);
  const fo = keep(fadeOut);
  return {
    ...clip,
    fadeIn: fi,
    fadeOut: fo,
    ...(fi === undefined ? { fadeInShape: undefined } : {}),
    ...(fo === undefined ? { fadeOutShape: undefined } : {}),
  };
}

/** An edge cut away from a clip now `duration` long: the fade at the
 *  edge that stays keeps its length (to the clip's), and the fade at the
 *  edge that moved gets the room that is left. */
function fadesAfterEdgeCut<C extends Clip>(clip: C, duration: number, movedEdge: 'start' | 'end'): C {
  const fadeIn = clip.fadeIn ?? 0;
  const fadeOut = clip.fadeOut ?? 0;
  if (movedEdge === 'start') {
    const out = Math.min(fadeOut, duration);
    return withFades(clip, Math.min(fadeIn, duration - out), out);
  }
  const inn = Math.min(fadeIn, duration);
  return withFades(clip, inn, Math.min(fadeOut, duration - inn));
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
      // Canvas-time → source-time conversion factor. All clip durations and
      // selection times are canvas time; trimStart + fullDuration are source
      // time. For non-stretched clips this is 1× so the math collapses.
      const stretch = clip.stretchFactor ?? 1;
      // Source-time fallback when fullDuration isn't recorded: canvas
      // duration ÷ stretch.
      const inferredFullDuration = clip.fullDuration || (clip.duration / stretch);

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
        const relativeStart = startTime - clipStart;       // canvas time
        const relativeEnd = endTime - clipStart;           // canvas time

        // First clip: from start to deletion start. The halves split the
        // fades as a point split does: the left keeps the fade-in, the
        // right the fade-out, each fitted to its half (withFades).
        const { fadeOut: _fo, fadeOutShape: _fos, crossfadeOutShape: _xos, ...leftBase } = clip;
        const { fadeIn: _fi, fadeInShape: _fis, crossfadeInShape: _xis, ...rightBase } = clip;
        const firstClip: Clip = withFades({
          ...leftBase,
          duration: relativeStart,
          trimStart: clip.trimStart, // Preserve existing trimStart (don't inherit from spread)
          fullDuration: inferredFullDuration,
          envelopePoints: clip.envelopePoints.filter(p => p.time < relativeStart),
        }, Math.min(clip.fadeIn ?? 0, relativeStart), 0);

        // Second clip: from deletion end to clip end. Both clips inherit the
        // parent's stretchFactor; trimStart advances by the canvas-time gap
        // mapped to source time.
        const secondClipDuration = clipEnd - endTime;
        const newTrimStart = (clip.trimStart || 0) + relativeEnd / stretch;

        const secondClip: Clip = withFades({
          ...rightBase,
          id: nextClipId++,
          name: `${clip.name} (split)`,
          start: endTime,
          duration: secondClipDuration,
          trimStart: newTrimStart,
          fullDuration: inferredFullDuration,
          envelopePoints: clip.envelopePoints
            .filter(p => p.time >= relativeEnd)
            .map(p => ({ ...p, time: p.time - relativeEnd })),
        }, 0, Math.min(clip.fadeOut ?? 0, secondClipDuration));

        return [firstClip, secondClip];
      }

      // Case 4: Deletion overlaps start of clip - trim the overlapping portion
      if (startTime <= clipStart && endTime > clipStart) {
        const overlapDuration = endTime - clipStart;       // canvas time
        const newDuration = clip.duration - overlapDuration;
        const newTrimStart = (clip.trimStart || 0) + overlapDuration / stretch;

        return [fadesAfterEdgeCut({
          ...clip,
          start: endTime,
          duration: newDuration,
          trimStart: newTrimStart,
          fullDuration: inferredFullDuration,
          envelopePoints: clip.envelopePoints
            .map(p => ({ ...p, time: p.time - overlapDuration }))
            .filter(p => p.time >= 0),
        }, newDuration, 'start')];
      }

      // Case 5: Deletion overlaps end of clip - trim end
      if (startTime < clipEnd && endTime >= clipEnd) {
        const relativeStart = startTime - clipStart;       // canvas time
        const newDuration = relativeStart;

        return [fadesAfterEdgeCut({
          ...clip,
          duration: newDuration,
          fullDuration: inferredFullDuration,
          envelopePoints: clip.envelopePoints.filter(p => p.time < relativeStart),
        }, newDuration, 'end')];
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

        // The clip stays one clip, so both edges and their fades stay;
        // a fade the hole cuts into loses the part taken out of it
        const relativeEnd = relativeStart + deletionDuration;
        const overlap = (a: number, b: number) => Math.max(0, Math.min(b, relativeEnd) - Math.max(a, relativeStart));
        const fadeIn = clip.fadeIn ?? 0;
        const fadeOut = clip.fadeOut ?? 0;
        const inLeft = fadeIn - overlap(0, fadeIn);
        const outLeft = fadeOut - overlap(clip.duration - fadeOut, clip.duration);

        return withFades({
          ...clip,
          duration: newDuration,
          deletedRegions: newDeletedRegions
        }, Math.min(inLeft, newDuration), Math.min(outLeft, Math.max(0, newDuration - inLeft)));
      }

      // Case 4: Deletion overlaps start of clip
      if (startTime <= clipStart && endTime > clipStart) {
        const overlapDuration = endTime - clipStart;       // canvas time
        const stretch = clip.stretchFactor ?? 1;
        const newDuration = clip.duration - overlapDuration;
        // trimStart is source time; canvas overlap → source via stretch.
        const newTrimStart = (clip.trimStart || 0) + overlapDuration / stretch;

        // Shift envelope points left by overlap duration
        const shiftedEnvelopePoints = clip.envelopePoints
          .map(point => ({ ...point, time: point.time - overlapDuration }))
          .filter(point => point.time >= 0);

        // Shift deleted regions left by overlap duration
        const shiftedDeletedRegions = (clip.deletedRegions || [])
          .map(region => ({ ...region, startTime: region.startTime - overlapDuration }))
          .filter(region => region.startTime >= 0);

        return fadesAfterEdgeCut({
          ...clip,
          start: startTime, // Clip starts where deletion started (shifted left)
          duration: newDuration,
          trimStart: newTrimStart,
          envelopePoints: shiftedEnvelopePoints,
          deletedRegions: shiftedDeletedRegions.length > 0 ? shiftedDeletedRegions : undefined
        }, newDuration, 'start');
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

        return fadesAfterEdgeCut({
          ...clip,
          duration: newDuration,
          envelopePoints: filteredEnvelopePoints,
          deletedRegions: filteredDeletedRegions.length > 0 ? filteredDeletedRegions : undefined
        }, newDuration, 'end');
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
