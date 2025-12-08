/**
 * Coordinate conversion utilities for spectral selection
 */

export interface CoordinateConfig {
  pixelsPerSecond: number;
  leftPadding: number;
  trackHeights: number[];
  trackGap: number;
  initialGap: number;
  clipHeaderHeight: number;
  tracks?: any[]; // Optional tracks array for split view detection
}

/**
 * Convert time to X pixel position
 */
export function timeToX(time: number, config: CoordinateConfig): number {
  return config.leftPadding + time * config.pixelsPerSecond;
}

/**
 * Convert normalized frequency (0-1) to Y pixel position
 * For split view, only uses the top half (spectrogram area)
 */
export function frequencyToY(
  frequency: number,
  trackIndex: number,
  config: CoordinateConfig
): number {
  let trackY = config.initialGap;
  for (let i = 0; i < trackIndex; i++) {
    trackY += config.trackHeights[i] + config.trackGap;
  }

  const trackHeight = config.trackHeights[trackIndex];
  const clipBodyY = trackY + config.clipHeaderHeight;
  const clipBodyHeight = trackHeight - config.clipHeaderHeight;

  // For split view, spectral area is only the top half
  const track = config.tracks?.[trackIndex];
  const isSplitView = track?.viewMode === 'split';
  const spectralAreaHeight = isSplitView ? clipBodyHeight / 2 : clipBodyHeight;

  // Invert: 1 = top, 0 = bottom
  const yInSpectralArea = (1 - frequency) * spectralAreaHeight;

  return clipBodyY + yInSpectralArea;
}

/**
 * Calculate selection bounds in pixels
 */
export interface SelectionBounds {
  leftX: number;
  rightX: number;
  topY: number;
  bottomY: number;
  centerY: number;
  width: number;
  height: number;
}

export function getSelectionBounds(
  startTime: number,
  endTime: number,
  minFrequency: number,
  maxFrequency: number,
  trackIndex: number,
  config: CoordinateConfig
): SelectionBounds {
  const leftX = timeToX(startTime, config);
  const rightX = timeToX(endTime, config);
  const topY = frequencyToY(maxFrequency, trackIndex, config);
  const bottomY = frequencyToY(minFrequency, trackIndex, config);

  return {
    leftX,
    rightX,
    topY,
    bottomY,
    centerY: (topY + bottomY) / 2,
    width: rightX - leftX,
    height: bottomY - topY,
  };
}
