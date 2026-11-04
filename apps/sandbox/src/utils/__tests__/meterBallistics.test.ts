import { describe, it, expect } from 'vitest';
import { createMeterBallistics, dbToMeterPercent, meterPercentToDb } from '../meterBallistics';

describe('meter ballistics — rise at once, fall at 60 dB/s, hold the peak 3 s (2026-11-04)', () => {
  it('rises to a louder reading at once', () => {
    const m = createMeterBallistics();
    expect(m.next(-40, 0).level).toBe(-40);
    expect(m.next(-10, 16).level).toBe(-10);
  });

  it('falls at 60 dB a second, never below the reading', () => {
    const m = createMeterBallistics();
    m.next(-10, 0);
    expect(m.next(-60, 100).level).toBeCloseTo(-16); // 100 ms → 6 dB
    expect(m.next(-60, 600).level).toBeCloseTo(-46);
    expect(m.next(-30, 700).level).toBe(-30); // the reading is above the fall: it holds there
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
