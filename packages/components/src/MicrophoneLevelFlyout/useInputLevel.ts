/**
 * The microphone's level, READ not passed (2026-11-04): `getLevelDb` is
 * polled once a frame while `active`, so a live meter re-renders the
 * component that holds it alone — the flyout, or the docked recording
 * meter — never the toolbar. The tick is the recent peak, held 3 s
 * (Audacity 3's MeterPanel.cpp, the track meters' hold).
 */
import React from 'react';

export const INPUT_PEAK_HOLD_MS = 3000;
export const INPUT_DB_FLOOR = -60;

export function useInputLevel(getLevelDb: (() => number | null) | undefined, active: boolean): { level: number; peak: number | undefined } {
  const [level, setLevel] = React.useState(INPUT_DB_FLOOR);
  const [peak, setPeak] = React.useState<number | undefined>(undefined);
  const getLevelRef = React.useRef(getLevelDb);
  getLevelRef.current = getLevelDb;

  React.useEffect(() => {
    if (!active || typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    let held = INPUT_DB_FLOOR;
    let heldAt = 0;
    const tick = (now: number) => {
      const db = getLevelRef.current?.() ?? null;
      const current = db === null ? INPUT_DB_FLOOR : Math.max(INPUT_DB_FLOOR, db);
      if (current >= held || now - heldAt > INPUT_PEAK_HOLD_MS) { held = current; heldAt = now; }
      setLevel(current);
      setPeak(held > INPUT_DB_FLOOR ? held : undefined);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return { level, peak };
}
