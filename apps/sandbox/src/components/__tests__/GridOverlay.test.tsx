import { describe, it, expect } from 'vitest';
import { computeGrid } from '../GridOverlay';

const CLIP_CONTENT_OFFSET = 8; // any positive offset; assertions are relative to it

describe('computeGrid', () => {
  it('beats-measures: emits lines classified by tier, first line on the measure boundary', () => {
    const { gridLines, measureBands } = computeGrid({
      bpm: 120, beatsPerMeasure: 4, timeFormat: 'beats-measures',
      pixelsPerSecond: 100, width: 2000, clipContentOffset: CLIP_CONTENT_OFFSET,
    });
    expect(gridLines.length).toBeGreaterThan(0);
    expect(gridLines[0]).toEqual({ x: CLIP_CONTENT_OFFSET, tier: 'measure' });
    for (const l of gridLines) {
      expect(['measure', 'beat', 'subdivision']).toContain(l.tier);
      expect(l.x).toBeLessThanOrEqual(2000);
    }
    // alternating bands exist and start at the content offset
    expect(measureBands.length).toBeGreaterThan(0);
    expect(measureBands[0].x).toBe(CLIP_CONTENT_OFFSET);
    expect(measureBands[0].w).toBeGreaterThan(0);
  });

  it('minutes-seconds: emits major/beat lines only (no bands)', () => {
    const { gridLines, measureBands } = computeGrid({
      bpm: 120, beatsPerMeasure: 4, timeFormat: 'minutes-seconds',
      pixelsPerSecond: 100, width: 1000, clipContentOffset: CLIP_CONTENT_OFFSET,
    });
    expect(gridLines.length).toBeGreaterThan(0);
    for (const l of gridLines) expect(['measure', 'beat']).toContain(l.tier);
    expect(measureBands).toEqual([]);
  });

  it('beats-measures: bands are one-measure-wide and start every OTHER measure (zebra)', () => {
    const { measureBands } = computeGrid({
      bpm: 120, beatsPerMeasure: 4, timeFormat: 'beats-measures',
      pixelsPerSecond: 100, width: 4000, clipContentOffset: CLIP_CONTENT_OFFSET,
    });
    // 120bpm, 4/4 → 2s per measure → 200px per measure at 100px/s.
    const measureWidthPx = 200;
    expect(measureBands.length).toBeGreaterThan(1);
    for (const b of measureBands) expect(b.w).toBeCloseTo(measureWidthPx, 5);
    // consecutive bands are two measures apart (every other measure shaded)
    const gap = measureBands[1].x - measureBands[0].x;
    expect(gap).toBeCloseTo(measureWidthPx * 2, 5);
    // GridOverlay renders these as <rect> behind the grid lines (verified visually;
    // component-render unit test is blocked by a react-dom/react version mismatch in
    // the sandbox test env — see branch notes).
  });
});
