import { describe, it, expect } from 'vitest';
import { createMeterBallistics, dbToMeterPercent, meterPercentToDb } from '../meterBallistics';

describe('meter ballistics — a 60 ms attack, a 120 ms hold, a 60 dB/s fall, a 3 s peak hold (2026-11-04)', () => {
  it('the first reading lands at once; a louder one is approached with a 60 ms time constant', () => {
    const m = createMeterBallistics();
    expect(m.next(-40, 0).level).toBe(-40);
    expect(m.next(-10, 60).level).toBeCloseTo(-40 + 30 * (1 - Math.exp(-1)), 3); // 63% of the way
    const m2 = createMeterBallistics();
    m2.next(-40, 0);
    expect(m2.next(-10, 240).level).toBeGreaterThan(-10.6); // 98% of the way by 4τ
  });

  it('the peak tick still takes a louder reading at once', () => {
    const m = createMeterBallistics();
    m.next(-40, 0);
    expect(m.next(-10, 16).peak).toBe(-10);
  });

  it('holds 120 ms after a rise, then falls at 60 dB a second, never below the reading', () => {
    const m = createMeterBallistics();
    m.next(-10, 0);
    expect(m.next(-60, 100).level).toBe(-10); // inside the hold
    expect(m.next(-60, 220).level).toBeCloseTo(-17.2); // the fall counts from the last reading: 120 ms → 7.2 dB
    expect(m.next(-60, 720).level).toBeCloseTo(-47.2);
    const up = m.next(-30, 820).level; // a louder reading: it climbs toward it, never past
    expect(up).toBeGreaterThan(-46);
    expect(up).toBeLessThanOrEqual(-30);
  });

  it('holds the peak for 3 s, then the tick rides down with the level', () => {
    const m = createMeterBallistics();
    m.next(-10, 0);
    expect(m.next(-60, 1000).peak).toBe(-10);
    expect(m.next(-60, 2900).peak).toBe(-10);
    const after = m.next(-60, 3100);
    expect(after.peak).toBe(after.level);
  });

  it('silence (−∞) reads as the floor', () => {
    const m = createMeterBallistics();
    expect(m.next(-Infinity, 0).level).toBe(-60);
  });

  it('the percent scale round-trips', () => {
    expect(dbToMeterPercent(-60)).toBe(0);
    expect(dbToMeterPercent(0)).toBe(100);
    expect(dbToMeterPercent(-30)).toBe(50);
    expect(meterPercentToDb(50)).toBe(-30);
  });
});
