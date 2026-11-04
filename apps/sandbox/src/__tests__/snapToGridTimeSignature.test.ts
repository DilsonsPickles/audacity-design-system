import { describe, it, expect } from 'vitest';
import { snapToGrid } from '../utils/snapToGrid';

const opts = (beatsPerMeasure: number, noteValue: number, subdivision: 1 | 4 | 8) => ({
  timeFormat: 'beats-measures' as const, bpm: 120, beatsPerMeasure, noteValue, snap: { subdivision }, pixelsPerSecond: 100,
});

describe('snapping follows the time signature (2026-11-04)', () => {
  it('3/4: "1/4" snaps to quarter notes, not thirds of the bar', () => {
    // a quarter at 120 is 0.5 s; a third of a 3/4 bar (1.5 s) would also be 0.5 — use 1/8 to tell them apart
    expect(snapToGrid(0.26, opts(3, 4, 8))).toBe(0.25);
    expect(snapToGrid(0.6, opts(3, 4, 4))).toBe(0.5);
  });

  it('"Bar" snaps to whole bars of the signature: 6/8 at 120 is 1.5 s', () => {
    expect(snapToGrid(1.4, opts(6, 8, 1))).toBe(1.5);
    expect(snapToGrid(2.4, opts(6, 8, 1))).toBe(3);
  });

  it('4/4 is unchanged', () => {
    expect(snapToGrid(1.1, opts(4, 4, 1))).toBe(2 * Math.round(1.1 / 2));
    expect(snapToGrid(0.6, opts(4, 4, 4))).toBe(0.5);
  });
});
