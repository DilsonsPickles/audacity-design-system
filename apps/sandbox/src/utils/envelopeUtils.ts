/**
 * Envelope editing utilities
 * Non-linear dB scale conversion helpers
 * Uses a power curve with 0dB positioned at about 2/3 down the clip
 */

const INFINITY_ZONE_HEIGHT = 1; // Last 1px represents -infinity dB

/**
 * Convert dB value to Y pixel position using non-linear power curve
 */
export const dbToYNonLinear = (db: number, y: number, height: number): number => {
  const minDb = -60;
  const maxDb = 12;
  const usableHeight = height - INFINITY_ZONE_HEIGHT;

  // -Infinity maps to the bottom (y + height)
  if (db === -Infinity || db < minDb) {
    return y + height;
  }

  // Power curve mapping with 0dB at ~2/3 down
  // Using power of 3.0 to position 0dB lower in the clip
  const dbRange = maxDb - minDb; // 72 dB total range
  const linear = (db - minDb) / dbRange; // 0 to 1

  // Apply power curve: higher power pushes 0dB lower
  const normalized = Math.pow(linear, 3.0);

  return y + usableHeight - normalized * usableHeight;
};

/**
 * Convert Y pixel position to dB value using inverse power curve
 */
export const yToDbNonLinear = (yPos: number, y: number, height: number): number => {
  const minDb = -60;
  const maxDb = 12;
  const usableHeight = height - INFINITY_ZONE_HEIGHT;

  // Last 1px at the bottom represents -infinity
  if (yPos >= y + usableHeight) {
    return -Infinity;
  }

  // Inverse power curve mapping
  const dbRange = maxDb - minDb; // 72 dB
  const normalizedY = (y + usableHeight - yPos) / usableHeight;

  // Inverse of power curve: x = y^(1/3)
  const linear = Math.pow(normalizedY, 1.0 / 3.0);
  const db = minDb + linear * dbRange;

  return Math.max(minDb, Math.min(maxDb, db));
};

/**
 * Calculate distance from a point to a line segment
 */
export const distanceToLineSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

export const ENVELOPE_POINT_CLICK_THRESHOLD = 15; // Distance to click existing point
export const ENVELOPE_LINE_CLOSE_THRESHOLD = 4; // 0-4px: add point or drag segment
export const ENVELOPE_LINE_FAR_THRESHOLD = 16; // 4-16px: drag segment only
export const ENVELOPE_MOVE_THRESHOLD = 3; // Pixels to move before triggering drag

export const SNAP_THRESHOLD_DB = 6; // Snap within 6dB of other points
export const SNAP_THRESHOLD_TIME = 0.05; // Snap within 0.05 seconds horizontally
