/**
 * The canvas's Cmd/Ctrl+Option+wheel resizes the track UNDER THE POINTER
 * (2026-10-08, "implement the cmd + option scroll on the canvas space as
 * well, feels weird not having it" — plain Cmd+wheel there is the
 * horizontal zoom). As on the headers, the target is LOCKED for the
 * gesture: a track that shrinks under a still pointer must keep the
 * wheel, not hand it to the track that slid underneath. The pointer
 * MOVING (a different y) or the wheel RESTING for `restMs` releases it.
 */
export interface WheelTargetLock {
  /** The index to act on for a wheel event at content `y`; `resolve`
   *  is consulted only when no lock is live */
  target(y: number, resolve: () => number): number;
  release(): void;
}

export function createWheelTargetLock(restMs = 300, now: () => number = Date.now): WheelTargetLock {
  let locked: { index: number; y: number; at: number } | null = null;
  return {
    target(y, resolve) {
      const t = now();
      if (locked && Math.abs(locked.y - y) < 1 && t - locked.at <= restMs) {
        locked = { ...locked, at: t };
        return locked.index;
      }
      const index = resolve();
      locked = { index, y, at: t };
      return index;
    },
    release() { locked = null; },
  };
}
