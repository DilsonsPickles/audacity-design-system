import { describe, it, expect } from 'vitest';
import {
  calculateLabelRows,
  calculatePointLabelWidth,
  getLabelYOffset,
  getLabelDimensions,
  isPointInLabel,
  getLabelMetrics,
  labelPtToPx,
} from '../labelLayout';

// The classic (scale-1) metrics — width clamps referenced throughout.
const CLASSIC = getLabelMetrics();
const POINT_LABEL_MIN_WIDTH = CLASSIC.minPointWidth;
const POINT_LABEL_MAX_WIDTH = CLASSIC.maxPointWidth;
import type { Label } from '../labelLayout';

describe('calculatePointLabelWidth', () => {
  it('returns min width for empty string', () => {
    expect(calculatePointLabelWidth('')).toBe(POINT_LABEL_MIN_WIDTH);
  });

  it('returns min width for undefined', () => {
    expect(calculatePointLabelWidth(undefined)).toBe(POINT_LABEL_MIN_WIDTH);
  });

  it('returns min width for whitespace-only string', () => {
    expect(calculatePointLabelWidth('   ')).toBe(POINT_LABEL_MIN_WIDTH);
  });

  it('returns at least min width for short text', () => {
    const result = calculatePointLabelWidth('Hi');
    expect(result).toBeGreaterThanOrEqual(POINT_LABEL_MIN_WIDTH);
  });

  it('returns at most max width for very long text', () => {
    const longText = 'A'.repeat(500);
    const result = calculatePointLabelWidth(longText);
    expect(result).toBeLessThanOrEqual(POINT_LABEL_MAX_WIDTH);
  });
});

describe('calculateLabelRows', () => {
  it('puts non-overlapping labels on row 0', () => {
    const labels: Label[] = [
      { id: 1, startTime: 0, endTime: 1 },
      { id: 2, startTime: 2, endTime: 3 },
    ];
    const rows = calculateLabelRows(labels, 100, 0);
    expect(rows.get(1)).toBe(0);
    expect(rows.get(2)).toBe(0);
  });

  it('bumps overlapping labels to row 1', () => {
    const labels: Label[] = [
      { id: 1, startTime: 0, endTime: 2 },
      { id: 2, startTime: 1, endTime: 3 },
    ];
    const rows = calculateLabelRows(labels, 100, 0);
    expect(rows.get(1)).toBe(0);
    expect(rows.get(2)).toBe(1);
  });

  it('handles empty label list', () => {
    const rows = calculateLabelRows([], 100, 0);
    expect(rows.size).toBe(0);
  });

  it('sorts by startTime (left-most gets row 0)', () => {
    // Pass labels out of order — the earlier one should still get row 0
    const labels: Label[] = [
      { id: 2, startTime: 5, endTime: 7 },
      { id: 1, startTime: 0, endTime: 2 },
    ];
    const rows = calculateLabelRows(labels, 100, 0);
    expect(rows.get(1)).toBe(0);
    expect(rows.get(2)).toBe(0);
  });
});

describe('getLabelYOffset', () => {
  it('returns 0 for row 0', () => {
    expect(getLabelYOffset(0)).toBe(0);
  });

  it('returns one row stride for row 1', () => {
    expect(getLabelYOffset(1)).toBe(CLASSIC.rowHeight);
  });
});

describe('getLabelDimensions', () => {
  it('returns the banner height as height', () => {
    const label: Label = { id: 1, startTime: 0, endTime: 2 };
    const dims = getLabelDimensions(label, 100);
    expect(dims.height).toBe(CLASSIC.bannerHeight);
  });

  it('calculates width from duration for region labels', () => {
    const label: Label = { id: 1, startTime: 0, endTime: 2 };
    const dims = getLabelDimensions(label, 100);
    // (2 - 0) * 100 = 200
    expect(dims.width).toBe(200);
  });
});

describe('isPointInLabel', () => {
  const label: Label = { id: 1, startTime: 1, endTime: 3 };
  const pps = 100;
  const clipOffset = 0;
  const trackY = 0;
  const row = 0;
  // Label spans x: 100..300, y: 0..14

  it('returns true for point inside label', () => {
    expect(isPointInLabel(150, 7, label, row, pps, clipOffset, trackY)).toBe(true);
  });

  it('returns false for point outside label (too far right)', () => {
    expect(isPointInLabel(350, 7, label, row, pps, clipOffset, trackY)).toBe(false);
  });

  it('returns false for point outside label (too far down)', () => {
    expect(isPointInLabel(150, 20, label, row, pps, clipOffset, trackY)).toBe(false);
  });

  it('returns true on label boundary (edge)', () => {
    // Exactly on left edge, top edge
    expect(isPointInLabel(100, 0, label, row, pps, clipOffset, trackY)).toBe(true);
  });
});

describe('getLabelMetrics (font-size-driven scaling)', () => {
  it('the banner is 1.5x the font size (mockup ratio) at every size', () => {
    const m12 = getLabelMetrics();
    expect(m12.bannerHeight).toBe(18);
    expect(m12.rowHeight).toBe(18 + m12.rowGap);
    expect(m12.padX).toBe(4);
    expect(m12.pointFlagGap).toBe(3);
    expect(m12.minPointWidth).toBe(50);
    expect(m12.maxPointWidth).toBe(400);
    // The mockup's stated case: 24px text in a 36px strap.
    expect(getLabelMetrics(24).bannerHeight).toBe(36);
  });

  it('48pt text (64px) scales every metric proportionally', () => {
    const m = getLabelMetrics(labelPtToPx(48));
    expect(m.fontSizePx).toBeCloseTo(64, 5);
    // Banner comfortably taller than the text it holds — 1.5x.
    expect(m.bannerHeight).toBe(Math.round(m.fontSizePx * 1.5));
    // Ears are constant 8x20 corner tabs — they never scale with the
    // text (capped at the strap so they can't overshoot a smaller one).
    expect(m.earWidth).toBe(8);
    expect(m.earHeight).toBe(20);
    expect(getLabelMetrics(12).earHeight).toBe(18); // 9pt strap caps it
    expect(getLabelMetrics(labelPtToPx(10)).earHeight).toBe(20); // flush
    expect(getLabelMetrics(labelPtToPx(48)).earHeight).toBe(20); // tab
    expect(m.rowHeight).toBe(m.bannerHeight + m.rowGap);
    expect(m.font).toContain('64px');
  });

  it('labelPtToPx converts at CSS 96dpi (9pt = classic 12px)', () => {
    expect(labelPtToPx(9)).toBe(12);
    expect(labelPtToPx(48)).toBeCloseTo(64, 5);
  });

  it('row stacking and hit-testing follow the scaled metrics', () => {
    const m = getLabelMetrics(labelPtToPx(48));
    expect(getLabelYOffset(2, m)).toBe(2 * m.rowHeight);
    const label: Label = { id: 1, startTime: 1, endTime: 2 };
    // Inside the scaled banner on row 1
    const y = 10 + m.rowHeight + m.bannerHeight / 2;
    expect(isPointInLabel(150, y, label, 1, 100, 0, 10, m)).toBe(true);
    // Same point misses under CLASSIC metrics (row 1 sits far higher)
    expect(isPointInLabel(150, y, label, 1, 100, 0, 10)).toBe(false);
  });
});
