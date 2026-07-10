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
  const tracksHeight =
    tracks.reduce((sum, track) => sum + (track.height || defaultTrackHeight), 0) +
    topGap +
    trackGap * (tracks.length - 1);
  const totalHeight = tracksHeight;
  const containerHeight = totalHeight + bottomBuffer;

  return { tracksHeight, totalHeight, containerHeight };
}
