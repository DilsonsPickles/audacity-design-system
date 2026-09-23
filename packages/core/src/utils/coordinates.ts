/**
 * Coordinate conversion utilities for time selection and track positioning
 */

import { TrackLike } from '../types';

/** Rendered height of a track folder's own slim row. */
export const FOLDER_ROW_HEIGHT = 28;

/** Extra space below the LAST visible row of a track group, on top of
 *  the normal row gap — it gives the family a floor so the group reads
 *  as containing its children rather than just preceding them.
 *
 *  This is layout, not decoration: it must be added by every y-walk in
 *  the app (both columns and every hit test) or the panel and the
 *  canvas drift apart by this many pixels for every group above the
 *  row you click. Hence `rowGapAfter` below — one rule, like
 *  `effectiveRowHeight`. */
export const GROUP_END_PAD = 6;

/** Only the fields the row-height rule reads — so every layer
 *  (core, components, sandbox) can call it with its own track shape. */
export interface RowHeightTrackLike {
  id?: number | string;
  type?: string;
  folderId?: number;
  collapsed?: boolean;
  height?: number;
}

/**
 * CANONICAL row-height rule (track folders v1, 2026-09-21). Every
 * y↔track computation in the app — canvas layout, hit tests, drags,
 * rulers, scroll math — must agree with this or clicks resolve to the
 * wrong row:
 *  - a `type: 'folder'` row is slim (FOLDER_ROW_HEIGHT)
 *  - a child of a COLLAPSED folder contributes NOTHING (0 — and no
 *    gap either; callers must skip the gap when this returns 0)
 *  - everything else is its own height, else the default
 */
export function effectiveRowHeight(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  defaultHeight: number
): number {
  const track = tracks[index];
  if (!track) return 0;
  if (track.type === 'folder') return FOLDER_ROW_HEIGHT;
  if (track.folderId !== undefined) {
    const folder = tracks.find((t) => t.type === 'folder' && t.id === track.folderId);
    if (folder?.collapsed) return 0;
  }
  // `||` not `??`: a falsy/absent height means "unset" everywhere else
  // in the app (canvasLayout, trackLayout, the panel column), and a
  // characterization test pins that. Zero height is expressed by the
  // collapse rule above, never by `height: 0`.
  return track.height || defaultHeight;
}

/**
 * True when this row is the last VISIBLE row of a track group — the
 * last member of a folder, or a collapsed folder's own header (its
 * members render nothing, so the header closes the family itself).
 */
export function endsGroup(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  defaultHeight: number
): boolean {
  const track = tracks[index];
  if (!track) return false;
  if (track.type === 'folder') return track.collapsed === true;
  if (track.folderId === undefined) return false;
  if (effectiveRowHeight(tracks, index, defaultHeight) === 0) return false;
  // Last member = no later row still belongs to the same folder.
  for (let i = index + 1; i < tracks.length; i++) {
    if (tracks[i]?.folderId === track.folderId) return false;
    break;
  }
  return true;
}

/**
 * CANONICAL gap rule: the space a row contributes BELOW itself.
 * Hidden rows contribute nothing at all (no height, no gap); the row
 * that closes a group contributes the normal gap plus GROUP_END_PAD.
 */
export function rowGapAfter(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  trackGap: number,
  defaultHeight: number
): number {
  if (effectiveRowHeight(tracks, index, defaultHeight) === 0) return 0;
  return trackGap + (endsGroup(tracks, index, defaultHeight) ? GROUP_END_PAD : 0);
}

/**
 * Convert pixel X position to time in seconds
 * @param x - Pixel position on canvas
 * @param pixelsPerSecond - Zoom level (pixels per second)
 * @param leftPadding - Left padding before timeline starts (DEPRECATED - pass 0)
 * @returns Time in seconds
 */
export function pixelsToTime(x: number, pixelsPerSecond: number, leftPadding: number = 0): number {
  return (x - leftPadding) / pixelsPerSecond;
}

/**
 * Convert time in seconds to pixel X position
 * @param time - Time in seconds
 * @param pixelsPerSecond - Zoom level (pixels per second)
 * @param leftPadding - Left padding before timeline starts (DEPRECATED - pass 0)
 * @returns Pixel X position
 */
export function timeToPixels(time: number, pixelsPerSecond: number, leftPadding: number = 0): number {
  return time * pixelsPerSecond + leftPadding;
}

/**
 * Convert pixel Y position to track index
 * @param y - Pixel Y position
 * @param tracks - Array of tracks with height information
 * @param initialGap - Gap above first track
 * @param trackGap - Gap between tracks
 * @param defaultTrackHeight - Default height when track.height is undefined
 * @returns Track index (may be out of bounds if y is beyond tracks)
 */
export function yToTrackIndex(
  y: number,
  tracks: TrackLike[],
  initialGap: number,
  trackGap: number,
  defaultTrackHeight: number
): number {
  let currentY = initialGap;

  for (let i = 0; i < tracks.length; i++) {
    const trackHeight = effectiveRowHeight(tracks, i, defaultTrackHeight);
    // Hidden row (collapsed-folder child): no band, no gap
    if (trackHeight === 0) continue;

    // Check if y is within this track
    if (y >= currentY && y < currentY + trackHeight) {
      return i;
    }

    // Move to next track position (a group's last row pays the
    // group-end pad as well — see rowGapAfter)
    currentY += trackHeight + rowGapAfter(tracks, i, trackGap, defaultTrackHeight);
  }

  // Return index based on position (may be beyond last track)
  return Math.floor((y - initialGap) / (defaultTrackHeight + trackGap));
}

/**
 * Convert track index to pixel Y position (top of track)
 * @param trackIndex - Track index
 * @param tracks - Array of tracks with height information
 * @param initialGap - Gap above first track
 * @param trackGap - Gap between tracks
 * @param defaultTrackHeight - Default height when track.height is undefined
 * @returns Pixel Y position of track top
 */
export function trackIndexToY(
  trackIndex: number,
  tracks: TrackLike[],
  initialGap: number,
  trackGap: number,
  defaultTrackHeight: number
): number {
  let y = initialGap;

  for (let i = 0; i < trackIndex && i < tracks.length; i++) {
    const trackHeight = effectiveRowHeight(tracks, i, defaultTrackHeight);
    if (trackHeight === 0) continue; // hidden row: no height, no gap
    y += trackHeight + rowGapAfter(tracks, i, trackGap, defaultTrackHeight);
  }

  return y;
}

/**
 * Get the height of a specific track
 * @param track - Track object
 * @param defaultTrackHeight - Default height when track.height is undefined
 * @returns Track height in pixels
 */
export function getTrackHeight(track: TrackLike, defaultTrackHeight: number): number {
  return track.height ?? defaultTrackHeight;
}

/**
 * Clamp a track index to valid range [0, tracks.length - 1]
 * @param trackIndex - Track index to clamp
 * @param tracks - Array of tracks
 * @returns Clamped track index
 */
export function clampTrackIndex(trackIndex: number, tracks: TrackLike[]): number {
  return Math.max(0, Math.min(tracks.length - 1, trackIndex));
}

/**
 * Get range of track indices between two indices (inclusive)
 * @param startIndex - Start track index
 * @param endIndex - End track index
 * @returns Array of track indices in range
 */
export function getTrackRange(startIndex: number, endIndex: number): number[] {
  const min = Math.min(startIndex, endIndex);
  const max = Math.max(startIndex, endIndex);
  const range: number[] = [];

  for (let i = min; i <= max; i++) {
    range.push(i);
  }

  return range;
}
