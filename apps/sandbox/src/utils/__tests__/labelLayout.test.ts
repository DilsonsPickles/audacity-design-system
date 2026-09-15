import { describe, it, expect } from 'vitest';
import {
  calculateLabelRows,
  calculatePointLabelWidth,
  getLabelYOffset,
  getLabelDimensions,
  isPointInLabel,
  LABEL_LAYOUT_CONSTANTS,
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

  it('returns correct offset for row 1', () => {
    const expected = LABEL_LAYOUT_CONSTANTS.LABEL_ROW_HEIGHT + LABEL_LAYOUT_CONSTANTS.LABEL_ROW_GAP;
    expect(getLabelYOffset(1)).toBe(expected);
  });
});

describe('getLabelDimensions', () => {
  it('returns EAR_HEIGHT as height', () => {
    const label: Label = { id: 1, startTime: 0, endTime: 2 };
    const dims = getLabelDimensions(label, 100);
    expect(dims.height).toBe(LABEL_LAYOUT_CONSTANTS.EAR_HEIGHT);
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
  it('at the default 12px the classic hand-tuned design is reproduced exactly', () => {
    const m = getLabelMetrics();
    expect(m.bannerHeight).toBe(14);
    expect(m.rowHeight).toBe(16);
    expect(m.earWidth).toBe(7);
    expect(m.padX).toBe(4);
    expect(m.pointFlagGap).toBe(3);
    expect(m.minPointWidth).toBe(50);
    expect(m.maxPointWidth).toBe(400);
  });

  it('48pt text (64px) scales every metric proportionally', () => {
    const m = getLabelMetrics(labelPtToPx(48));
    expect(m.fontSizePx).toBeCloseTo(64, 5);
    // Banner comfortably taller than the text it holds
    expect(m.bannerHeight).toBeGreaterThanOrEqual(Math.ceil(m.fontSizePx));
    expect(m.bannerHeight).toBe(Math.round(14 * (64 / 12)));
    expect(m.earWidth).toBe(Math.round(7 * (64 / 12)));
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
