/**
 * THE PLAYBACK METER'S LOOK (2026-11-04, the Figma "Playback meter" flyout,
 * 01 - Audacity Component library 5128:18161): what the toolbar's volume
 * button's flyout sets, beside its POSITION — STYLE (Default, RMS,
 * Gradient — Audacity 3's "Show RMS" and "Gradient" meter options), TYPE
 * (Logarithmic (dB), Linear (dB), Linear (amp) — AU3's dB / Linear) and
 * dB RANGE (AU3's 36…144). One rule for both meters (`MasterMeter`,
 * `MasterMeterVertical`): a level's PLACE on the bar is `meterPercent`,
 * the scale's labels are `meterTicks`, the slider's inverse is
 * `meterDbFromPercent`.
 *
 *   dB types: the bar is linear in dB from −range to 0.
 *   Linear (amp): the bar is linear in AMPLITUDE, 10^(dB/20), so 0 dB is
 *   full, −6 dB half, −20 dB a tenth — the floor is the range's amplitude.
 *   Linear (dB) draws as Logarithmic (dB) for now (the design's third
 *   type; what it should differ by is not yet decided).
 */

export type PlaybackMeterStyle = 'default' | 'rms' | 'gradient';
export type PlaybackMeterType = 'log-db' | 'linear-db' | 'linear-amp';
export type PlaybackMeterDbRange = 36 | 48 | 60 | 72 | 84 | 96 | 120 | 144;

export const PLAYBACK_METER_DB_RANGES: readonly PlaybackMeterDbRange[] = [36, 48, 60, 72, 84, 96, 120, 144];

export interface PlaybackMeterLook {
  style: PlaybackMeterStyle;
  type: PlaybackMeterType;
  dbRange: PlaybackMeterDbRange;
}

export const DEFAULT_PLAYBACK_METER_LOOK: PlaybackMeterLook = { style: 'default', type: 'log-db', dbRange: 60 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** A dB level's place on the bar, 0 (the floor) … 100 (0 dB) */
export function meterPercent(db: number, look: PlaybackMeterLook = DEFAULT_PLAYBACK_METER_LOOK): number {
  const floor = -look.dbRange;
  const clamped = clamp(Number.isFinite(db) ? db : floor, floor, 0);
  if (look.type === 'linear-amp') {
    const amp = Math.pow(10, clamped / 20);
    const ampFloor = Math.pow(10, floor / 20);
    return ((amp - ampFloor) / (1 - ampFloor)) * 100;
  }
  return ((clamped - floor) / -floor) * 100;
}

/** The inverse — a place on the bar back to dB (the slider's press) */
export function meterDbFromPercent(percent: number, look: PlaybackMeterLook = DEFAULT_PLAYBACK_METER_LOOK): number {
  const floor = -look.dbRange;
  const p = clamp(percent, 0, 100) / 100;
  if (look.type === 'linear-amp') {
    const ampFloor = Math.pow(10, floor / 20);
    const amp = ampFloor + p * (1 - ampFloor);
    return amp <= 0 ? floor : Math.max(floor, 20 * Math.log10(amp));
  }
  return floor + p * -floor;
}

export interface MeterTick {
  /** Where it sits — a dB value (the floor for "0" amplitude) */
  db: number;
  label: string;
}

/** The scale's labels — `density` 0 (three), 1 (about six), 2 (about a
 *  dozen); dB types label in dB, Linear (amp) in amplitude */
export function meterTicks(look: PlaybackMeterLook = DEFAULT_PLAYBACK_METER_LOOK, density: 0 | 1 | 2 = 1): MeterTick[] {
  const floor = -look.dbRange;
  if (look.type === 'linear-amp') {
    const step = density === 0 ? 0.5 : density === 1 ? 0.2 : 0.1;
    const ticks: MeterTick[] = [];
    for (let amp = 0; amp <= 1.0001; amp += step) {
      const a = Math.round(amp * 10) / 10;
      ticks.push({ db: a <= 0 ? floor : 20 * Math.log10(a), label: a === 0 ? '0' : a === 1 ? '1' : a.toFixed(1).replace(/^0/, '') });
    }
    return ticks;
  }
  if (density === 0) return [floor, floor / 2, 0].map((db) => ({ db, label: String(db) }));
  const maxCount = density === 1 ? 7 : 13;
  const step = [6, 12, 18, 24, 36, 48].find((s) => look.dbRange % s === 0 && look.dbRange / s + 1 <= maxCount) ?? 48;
  const ticks: MeterTick[] = [];
  for (let db = floor; db <= 0; db += step) ticks.push({ db, label: String(db) });
  return ticks;
}
