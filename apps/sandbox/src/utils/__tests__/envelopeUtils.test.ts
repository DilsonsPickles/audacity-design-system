import { describe, it, expect } from 'vitest';
import { dbToYNonLinear, yToDbNonLinear, distanceToLineSegment } from '../envelopeUtils';

describe('dbToYNonLinear', () => {
  const y = 0;
  const height = 100;

  it('maps -Infinity to bottom of clip', () => {
    expect(dbToYNonLinear(-Infinity, y, height)).toBe(y + height);
  });

  it('maps values below -60dB to bottom of clip', () => {
    expect(dbToYNonLinear(-80, y, height)).toBe(y + height);
  });

  it('maps +12dB to top of clip', () => {
    expect(dbToYNonLinear(12, y, height)).toBeCloseTo(0);
  });

  it('maps -60dB to bottom of usable area', () => {
    // usableHeight = 100 - 1 (INFINITY_ZONE) = 99
    // normalized = ((−60 − (−60)) / 72)^3 = 0
    // result = 0 + 99 − 0 = 99
    expect(dbToYNonLinear(-60, y, height)).toBeCloseTo(99);
  });

  it('accounts for y offset', () => {
    const yOffset = 50;
    const result = dbToYNonLinear(0, yOffset, height);
    expect(result).toBeGreaterThan(yOffset);
  });
});

describe('yToDbNonLinear', () => {
  const y = 0;
  const height = 100;

  it('roundtrips with dbToYNonLinear', () => {
    const testDbs = [-50, -30, -10, 0, 6, 12];
    for (const db of testDbs) {
      const yPos = dbToYNonLinear(db, y, height);
      const recovered = yToDbNonLinear(yPos, y, height);
      expect(recovered).toBeCloseTo(db, 1);
    }
  });

  it('returns -Infinity at bottom of usable area', () => {
    // usableHeight = 99, so y + 99 triggers -Infinity
    expect(yToDbNonLinear(99, y, height)).toBe(-Infinity);
  });

  it('returns +12dB at top', () => {
    expect(yToDbNonLinear(0, y, height)).toBeCloseTo(12);
  });
});

describe('distanceToLineSegment', () => {
  it('returns 0 when point is on the segment', () => {
    // Point (5,5) on line from (0,0) to (10,10)
    expect(distanceToLineSegment(5, 5, 0, 0, 10, 10)).toBeCloseTo(0);
  });

  it('returns perpendicular distance to horizontal line', () => {
    // Point (5,3) to horizontal line from (0,0) to (10,0)
    expect(distanceToLineSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it('returns perpendicular distance to vertical line', () => {
    // Point (4,5) to vertical line from (0,0) to (0,10)
    expect(distanceToLineSegment(4, 5, 0, 0, 0, 10)).toBeCloseTo(4);
  });

  it('returns distance to nearest endpoint when past segment', () => {
    // Point (15,0) past end of segment (0,0)→(10,0)
    expect(distanceToLineSegment(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('returns distance to start when before segment', () => {
    // Point (-3,0) before start of segment (0,0)→(10,0)
    expect(distanceToLineSegment(-3, 0, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it('handles zero-length segment (point)', () => {
    // Distance from (3,4) to point (0,0)
    expect(distanceToLineSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });
});
