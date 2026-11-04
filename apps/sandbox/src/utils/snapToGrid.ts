import type { SnapGrid } from '@audacity-ui/core';
import { barSeconds, noteSeconds } from '@audacity-ui/components';

export interface SnapOptions {
  timeFormat: 'minutes-seconds' | 'beats-measures';
  bpm: number;
  beatsPerMeasure: number;
  /** The time signature's lower number — the beat's note (default a quarter) */
  noteValue?: number;
  snap: SnapGrid;
  pixelsPerSecond: number;
}

/**
 * Snaps a time value to the nearest grid division.
 * Supports both beats-measures and minutes-seconds time formats.
 */
export function snapToGrid(time: number, options: SnapOptions): number {
  const { timeFormat, bpm, beatsPerMeasure, noteValue = 4, snap, pixelsPerSecond } = options;

  if (timeFormat === 'beats-measures') {
    // A SNAP VALUE IS A NOTE (2026-11-04, the real build's rule —
    // utils/musicalTime.ts in components): 1 = the bar, otherwise a
    // 1/subdivision note, a whole note divided, whatever the time signature.
    // It divided the BAR until then, so 3/4's "1/4" landed on thirds of it.
    const base = snap.subdivision === 1
      ? barSeconds(bpm, beatsPerMeasure, noteValue)
      : noteSeconds(bpm, snap.subdivision);
    const gridStep = base / (snap.triplet ? 1.5 : 1);
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
