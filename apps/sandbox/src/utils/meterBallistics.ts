/**
 * METER BALLISTICS — Audacity 3's (2026-11-04, "is there anything we can
 * do to make the metering less jumpy?"): the meters showed each analysis
 * frame's RMS as it came, sixty times a second, so a level that fell
 * between frames snapped down. A real meter RISES AT ONCE and FALLS AT A
 * RATE — `MeterPanel.cpp`'s 60 dB/s — and holds its RECENT PEAK for 3 s
 * before the tick rides down with the level. One rule for the track
 * meters (playback and recording), the master meter and the microphone
 * flyout, so they all move alike.
 */
export const METER_FLOOR_DB = -60;
export const METER_DECAY_DB_PER_SECOND = 60;
export const METER_PEAK_HOLD_MS = 3000;

/** The meters' 0–100 scale: −60 dB and under = 0, 0 dB = 100 */
export const dbToMeterPercent = (db: number): number =>
  Math.max(0, Math.min(100, ((db - METER_FLOOR_DB) / -METER_FLOOR_DB) * 100));
export const meterPercentToDb = (percent: number): number =>
  (percent / 100) * -METER_FLOOR_DB + METER_FLOOR_DB;

export interface MeterReading {
  /** The level to draw, dB */
  level: number;
  /** The recent peak, dB — held, then following the level */
  peak: number;
}

export interface MeterBallistics {
  /** Feed one reading (dB, −∞ for silence) at a time in ms; get what to draw */
  next(inputDb: number, now: number): MeterReading;
  reset(): void;
}

export function createMeterBallistics(): MeterBallistics {
  let level = METER_FLOOR_DB;
  let peak = METER_FLOOR_DB;
  let peakAt = 0;
  let lastAt: number | null = null;
  return {
    next(inputDb, now) {
      const input = Number.isFinite(inputDb) ? Math.max(METER_FLOOR_DB, inputDb) : METER_FLOOR_DB;
      const dt = lastAt === null ? 0 : Math.max(0, (now - lastAt) / 1000);
      lastAt = now;
      level = input >= level ? input : Math.max(input, level - METER_DECAY_DB_PER_SECOND * dt);
      if (input >= peak) {
        peak = input;
        peakAt = now;
      } else if (now - peakAt > METER_PEAK_HOLD_MS) {
        peak = level;
      }
      return { level, peak };
    },
    reset() {
      level = METER_FLOOR_DB;
      peak = METER_FLOOR_DB;
      peakAt = 0;
      lastAt = null;
    },
  };
}
