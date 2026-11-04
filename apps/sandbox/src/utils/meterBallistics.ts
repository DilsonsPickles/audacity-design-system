/**
 * METER BALLISTICS — Audacity 3's (2026-11-04, "is there anything we can
 * do to make the metering less jumpy?"): the meters showed each analysis
 * frame's RMS as it came, sixty times a second, so a level that fell
 * between frames snapped down. A real meter FALLS AT A RATE —
 * `MeterPanel.cpp`'s 60 dB/s — and holds its RECENT PEAK for 3 s before
 * the tick rides down with the level. THE RISE IS INTEGRATED TOO (later
 * the same day, "it's SO jittery": with the bar following every frame's
 * reading up at once, speech and room noise flickered it at frame rate):
 * the level approaches a louder reading with a 60 ms time constant —
 * 63% of the way in 60 ms, 95% in 180 — AND HOLDS FOR 120 ms AFTER A RISE
 * before it starts to fall. The hold is what stills it: on a synthetic
 * speech-and-room-noise signal the bar reversed direction 15 times a
 * second with an instant attack, 20 with the attack alone (it zig-zagged
 * against the fall), and under 3 with the hold; a 20 dB rise shows in
 * 150 ms and falls in 450. The PEAK tick still takes the reading at once,
 * so nothing loud is hidden. One rule for the track
 * meters (playback and recording), the master meter and the microphone
 * flyout, so they all move alike.
 */
export const METER_FLOOR_DB = -60;
export const METER_DECAY_DB_PER_SECOND = 60;
export const METER_PEAK_HOLD_MS = 3000;
export const METER_ATTACK_MS = 60;
/** How long the level holds after a rise before it starts to fall */
export const METER_LEVEL_HOLD_MS = 120;

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

export interface MeterBallisticsOptions {
  attackMs?: number;
  holdMs?: number;
  decayDbPerSecond?: number;
  peakHoldMs?: number;
}

export function createMeterBallistics(options: MeterBallisticsOptions = {}): MeterBallistics {
  const attackMs = options.attackMs ?? METER_ATTACK_MS;
  const holdMs = options.holdMs ?? METER_LEVEL_HOLD_MS;
  const decay = options.decayDbPerSecond ?? METER_DECAY_DB_PER_SECOND;
  const peakHoldMs = options.peakHoldMs ?? METER_PEAK_HOLD_MS;
  let level = METER_FLOOR_DB;
  let peak = METER_FLOOR_DB;
  let peakAt = 0;
  let roseAt = 0;
  let lastAt: number | null = null;
  return {
    next(inputDb, now) {
      const input = Number.isFinite(inputDb) ? Math.max(METER_FLOOR_DB, inputDb) : METER_FLOOR_DB;
      const dt = lastAt === null ? 0 : Math.max(0, (now - lastAt) / 1000);
      lastAt = now;
      if (input >= level) {
        const k = dt <= 0 || attackMs <= 0 ? 1 : 1 - Math.exp(-(dt * 1000) / attackMs);
        level += (input - level) * k;
        roseAt = now;
      } else if (now - roseAt >= holdMs) {
        level = Math.max(input, level - decay * dt);
      }
      if (input >= peak) {
        peak = input;
        peakAt = now;
      } else if (now - peakAt > peakHoldMs) {
        peak = level;
      }
      return { level, peak };
    },
    reset() {
      level = METER_FLOOR_DB;
      peak = METER_FLOOR_DB;
      peakAt = 0;
      roseAt = 0;
      lastAt = null;
    },
  };
}
