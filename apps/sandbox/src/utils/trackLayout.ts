/**
 * Track layout utilities
 */

export interface Track {
  height?: number;
}

/**
 * Calculate the Y-offset for a track based on its position in the track list
 * @param trackIndex - Index of the track
 * @param tracks - Array of all tracks
 * @param topGap - Gap at the top of the canvas
 * @param trackGap - Gap between tracks
 * @param defaultHeight - Default track height if not specified
 * @returns Y-offset in pixels
 */
export function calculateTrackYOffset(
  trackIndex: number,
  tracks: Track[],
  topGap: number,
  trackGap: number,
  defaultHeight: number = 114
): number {
  let yOffset = topGap;
  for (let i = 0; i < trackIndex; i++) {
    yOffset += (tracks[i].height || defaultHeight) + trackGap;
  }
  return yOffset;
}
