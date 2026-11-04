import { describe, it, expect } from 'vitest';
import { meterPercent, meterDbFromPercent, meterTicks, DEFAULT_PLAYBACK_METER_LOOK } from '../meterLook';

describe('the playback meter look (2026-11-04)', () => {
  it('a dB type is linear in dB over the range', () => {
    expect(meterPercent(0)).toBe(100);
    expect(meterPercent(-60)).toBe(0);
    expect(meterPercent(-30)).toBe(50);
    expect(meterPercent(-30, { ...DEFAULT_PLAYBACK_METER_LOOK, dbRange: 120 })).toBe(75);
    expect(meterPercent(-200)).toBe(0);
    expect(meterPercent(-Infinity)).toBe(0);
  });

  it('Linear (amp) is linear in amplitude: −6 dB is about half', () => {
    const look = { ...DEFAULT_PLAYBACK_METER_LOOK, type: 'linear-amp' as const };
    expect(meterPercent(0, look)).toBeCloseTo(100, 5);
    expect(meterPercent(-6.02, look)).toBeCloseTo(50, 0);
    expect(meterPercent(-20, look)).toBeCloseTo(10, 0);
    expect(meterPercent(-60, look)).toBe(0);
  });

  it('the inverse returns the dB a place on the bar stands for', () => {
    for (const type of ['log-db', 'linear-amp'] as const) {
      const look = { ...DEFAULT_PLAYBACK_METER_LOOK, type };
      for (const db of [-50, -30, -12, -3, 0]) {
        expect(meterDbFromPercent(meterPercent(db, look), look)).toBeCloseTo(db, 6);
      }
    }
  });

  it('labels: six-ish at the default, a dozen dense, amplitudes for Linear (amp)', () => {
    expect(meterTicks().map((t) => t.label)).toEqual(['-60', '-48', '-36', '-24', '-12', '0']);
    expect(meterTicks(DEFAULT_PLAYBACK_METER_LOOK, 2).map((t) => t.label)).toEqual(['-60', '-54', '-48', '-42', '-36', '-30', '-24', '-18', '-12', '-6', '0']);
    expect(meterTicks({ ...DEFAULT_PLAYBACK_METER_LOOK, dbRange: 144 }).map((t) => t.label)).toEqual(['-144', '-120', '-96', '-72', '-48', '-24', '0']);
    expect(meterTicks({ ...DEFAULT_PLAYBACK_METER_LOOK, type: 'linear-amp' }).map((t) => t.label)).toEqual(['0', '.2', '.4', '.6', '.8', '1']);
  });
});
