import type { SnapGrid } from '@audacity-ui/core';

export interface SnapOptions {
  timeFormat: 'minutes-seconds' | 'beats-measures';
  bpm: number;
  beatsPerMeasure: number;
  snap: SnapGrid;
  pixelsPerSecond: number;
}

/**
 * Snaps a time value to the nearest grid division.
 * Supports both beats-measures and minutes-seconds time formats.
 */
export function snapToGrid(time: number, options: SnapOptions): number {
  const { timeFormat, bpm, beatsPerMeasure, snap, pixelsPerSecond } = options;

  if (timeFormat === 'beats-measures') {
    const secondsPerBeat = 60 / bpm;
    const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
    // Subdivisions divide the measure: 1 = bar, 2 = half note, 4 = quarter note, etc.
    const gridStep = secondsPerMeasure / (snap.subdivision * (snap.triplet ? 1.5 : 1));
    return Math.round(time / gridStep) * gridStep;
  } else {
    // minutes-seconds: use the same interval logic as the ruler grid
    let majorInterval: number;
    if (pixelsPerSecond < 20) {
      majorInterval = 10;
    } else if (pixelsPerSecond < 50) {
      majorInterval = 5;
    } else if (pixelsPerSecond < 100) {
      majorInterval = 2;
    } else if (pixelsPerSecond < 200) {
      majorInterval = 1;
    } else {
      majorInterval = 0.5;
    }
    const minorInterval = majorInterval / 5;
    return Math.round(time / minorInterval) * minorInterval;
  }
}
