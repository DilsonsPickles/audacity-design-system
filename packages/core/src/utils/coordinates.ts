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
export const GROUP_END_PAD = 4;

/** Collapse/expand tween. Here, beside the layout constants, for the
 *  same reason they are: the panel, the canvas and the ruler column
 *  each animate their own rows, and they only stay aligned frame to
 *  frame if all three use one duration and one curve. */
export const GROUP_COLLAPSE_MS = 180;
export const GROUP_COLLAPSE_EASING = 'cubic-bezier(0.2, 0, 0, 1)'; // = the panel's side strip (12px gutter − 8px group inset), so the floor matches the sides

/** Only the fields the row-height rule reads — so every layer
 *  (core, components, sandbox) can call it with its own track shape. */
export interface RowHeightTrackLike {
  id?: number | string;
  type?: string;
  /** The folder this row belongs to. Folder rows may carry one too:
   *  groups NEST (2026-09-28), to any depth. */
  folderId?: number;
  collapsed?: boolean;
  height?: number;
}

/**
 * Indices of the folders containing row `index`, NEAREST first. Walks
 * `folderId` upward; a malformed project (a folder inside itself, a
 * loop, a dangling id) ends the walk rather than hanging the layout.
 */
export function ancestorFolderIndices(
  tracks: readonly RowHeightTrackLike[],
  index: number
): number[] {
  const out: number[] = [];
  let folderId = tracks[index]?.folderId;
  while (folderId !== undefined && out.length < tracks.length) {
    const wanted = folderId;
    const fi = tracks.findIndex((t) => t.type === 'folder' && t.id === wanted);
    if (fi < 0 || fi === index || out.includes(fi)) break;
    out.push(fi);
    folderId = tracks[fi].folderId;
  }
  return out;
}

/**
 * CANONICAL row-height rule (track folders, 2026-09-21; nesting
 * 2026-09-28). Every y↔track computation in the app — canvas layout,
 * hit tests, drags, rulers, scroll math — must agree with this or
 * clicks resolve to the wrong row:
 *  - a row inside a COLLAPSED folder, at any depth, contributes NOTHING
 *    (0 — and no gap either; callers must skip the gap when this
 *    returns 0). That includes nested folder HEADERS.
 *  - a visible `type: 'folder'` row is slim (FOLDER_ROW_HEIGHT)
 *  - everything else is its own height, else the default
 */
export function effectiveRowHeight(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  defaultHeight: number
): number {
  const track = tracks[index];
  if (!track) return 0;
  for (const a of ancestorFolderIndices(tracks, index)) {
    if (tracks[a].collapsed) return 0;
  }
  if (track.type === 'folder') return FOLDER_ROW_HEIGHT;
  // `||` not `??`: a falsy/absent height means "unset" everywhere else
  // in the app (canvasLayout, trackLayout, the panel column), and a
  // characterization test pins that. Zero height is expressed by the
  // collapse rule above, never by `height: 0`.
  return track.height || defaultHeight;
}

/**
 * How many groups END under this row — the number of floors hanging
 * below it. A group ends under its last VISIBLE row: usually its last
 * member, but a collapsed nested header closes its ANCESTORS too (its
 * own members render nothing). A group never floors itself shut: a
 * collapsed group has no visible children to wrap, so its own header
 * adds no floor for it. Nested groups that end on the same row each
 * add one, innermost first.
 */
export function groupsClosingAt(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  defaultHeight: number
): number {
  if (effectiveRowHeight(tracks, index, defaultHeight) === 0) return 0;
  const mine = ancestorFolderIndices(tracks, index);
  if (mine.length === 0) return 0;
  for (let i = index + 1; i < tracks.length; i++) {
    if (effectiveRowHeight(tracks, i, defaultHeight) === 0) continue;
    // The next visible row: every group of mine it is NOT in ends here.
    const theirs = ancestorFolderIndices(tracks, i);
    return mine.filter((a) => !theirs.includes(a)).length;
  }
  return mine.length; // last visible row: everything it is in ends here
}

/** True when at least one group ends under this row. */
export function endsGroup(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  defaultHeight: number
): boolean {
  return groupsClosingAt(tracks, index, defaultHeight) > 0;
}

/**
 * CANONICAL gap rule: the space a row contributes BELOW itself.
 * Hidden rows contribute nothing at all (no height, no gap); a row
 * that closes groups contributes the normal gap plus one
 * GROUP_END_PAD per group closing there.
 */
export function rowGapAfter(
  tracks: readonly RowHeightTrackLike[],
  index: number,
  trackGap: number,
  defaultHeight: number
): number {
  if (effectiveRowHeight(tracks, index, defaultHeight) === 0) return 0;
  return trackGap + groupsClosingAt(tracks, index, defaultHeight) * GROUP_END_PAD;
}

/** Everything a column needs to draw one row's place in its groups. */
export interface GroupRowLayout {
  /** Folders containing this row, as indices, OUTERMOST first */
  ancestors: number[];
  /** How many groups contain this row (`ancestors.length`) */
  depth: number;
  /** A folder's own header row */
  isHeader: boolean;
  /** A header whose group is collapsed */
  collapsed: boolean;
  /** Inside a collapsed group at some depth: renders nowhere */
  hidden: boolean;
  /** Effective height — 0 when hidden */
  height: number;
  /** Floors under this row: how many of its INNERMOST groups end here */
  closing: number;
  /** A header with visible rows of its own group below it */
  opensBelow: boolean;
}

/**
 * The whole list's group layout in ONE pass — the same answers as
 * `effectiveRowHeight` / `groupsClosingAt`, row by row, for callers
 * that lay out every row on every render (the canvas does, on every
 * playhead tick). Asking the per-row functions n times re-walks the
 * list each time.
 */
export function computeGroupLayout(
  tracks: readonly RowHeightTrackLike[],
  defaultHeight: number
): GroupRowLayout[] {
  const folderIndex = new Map<number | string, number>();
  tracks.forEach((t, i) => {
    if (t.type === 'folder' && t.id !== undefined && !folderIndex.has(t.id)) folderIndex.set(t.id, i);
  });
  const rows: GroupRowLayout[] = tracks.map((track, index) => {
    const nearestFirst: number[] = [];
    let folderId = track.folderId;
    while (folderId !== undefined && nearestFirst.length < tracks.length) {
      const fi = folderIndex.get(folderId);
      if (fi === undefined || fi === index || nearestFirst.includes(fi)) break;
      nearestFirst.push(fi);
      folderId = tracks[fi].folderId;
    }
    const hidden = nearestFirst.some((a) => tracks[a].collapsed === true);
    const isHeader = track.type === 'folder';
    return {
      ancestors: nearestFirst.reverse(),
      depth: nearestFirst.length,
      isHeader,
      collapsed: isHeader && track.collapsed === true,
      hidden,
      height: hidden ? 0 : isHeader ? FOLDER_ROW_HEIGHT : track.height || defaultHeight,
      closing: 0,
      opensBelow: false,
    };
  });
  let previous = -1; // the last visible row seen
  rows.forEach((row, index) => {
    if (row.hidden) return;
    if (previous >= 0) {
      const above = rows[previous];
      above.closing = above.ancestors.filter((a) => !row.ancestors.includes(a)).length;
      above.opensBelow = above.isHeader && row.ancestors.includes(previous);
    }
    previous = index;
  });
  if (previous >= 0) rows[previous].closing = rows[previous].ancestors.length;
  return rows;
}

/** The y of every row's top, from a layout: hidden rows take no space
 *  (their y is where they would appear). Matches `trackIndexToY`. */
export function rowOffsets(
  layout: readonly GroupRowLayout[],
  initialGap: number,
  trackGap: number
): number[] {
  let y = initialGap;
  return layout.map((row) => {
    const top = y;
    if (row.height > 0) y += row.height + trackGap + row.closing * GROUP_END_PAD;
    return top;
  });
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
