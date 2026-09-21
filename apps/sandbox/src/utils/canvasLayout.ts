import { effectiveTrackStride } from './trackFolders';
/**
 * Canvas height calculation utilities
 */

export interface CanvasHeightTrack {
  height?: number;
}

export interface CanvasHeightOptions {
  topGap: number;
  trackGap: number;
  defaultTrackHeight: number;
  bottomBuffer: number;
}

export interface CanvasHeights {
  tracksHeight: number;
  totalHeight: number;
  containerHeight: number;
}

/**
 * Calculate total canvas height based on all tracks + gaps.
 *
 * Mirrors Canvas.tsx's inline height math verbatim:
 * - `tracksHeight`: sum of each track's height (falling back to
 *   `defaultTrackHeight`), plus `topGap`, plus `trackGap` between every
 *   pair of tracks.
 * - `totalHeight`: currently always equal to `tracksHeight`.
 * - `containerHeight`: `totalHeight` plus the empty bottom-buffer area so
 *   gridlines extend through the scroll-buffer region below the last track.
 */
export function computeCanvasHeights(
  tracks: ReadonlyArray<CanvasHeightTrack>,
  opts: CanvasHeightOptions
): CanvasHeights {
  const { topGap, trackGap, defaultTrackHeight, bottomBuffer } = opts;
  // Folder-aware: hidden children contribute nothing (height OR gap);
  // the trailing gap of the last visible row is trimmed back off.
  const trackList = tracks as unknown as import('./trackFolders').FolderTrackLike[]; // justified: CanvasHeightTrack is a structural subset — folder fields flow through at runtime
  const stacked = trackList.reduce(
    (sum, _t, i) => sum + effectiveTrackStride(trackList, i, defaultTrackHeight, trackGap),
    0,
  );
  // (topGap + stacked - trackGap) preserves the source formula's
  // characterized empty-array quirk: 0 tracks → topGap - trackGap
  const tracksHeight = topGap + stacked - trackGap;
  const totalHeight = tracksHeight;
  const containerHeight = totalHeight + bottomBuffer;

  return { tracksHeight, totalHeight, containerHeight };
}
