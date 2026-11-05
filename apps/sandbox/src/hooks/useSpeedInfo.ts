import { useEffect, useRef, useState } from 'react';

/** How long the info line keeps the speed after a change */
export const SPEED_INFO_MS = 2000;

/**
 * THE INFO LINE ANSWERS A SPEED CHANGE (2026-11-05): for SPEED_INFO_MS
 * after the speed CHANGES by any means — the keys, the slider, a typed
 * value — the status bar's second slot reads "Playback speed: 110%", so
 * a shortcut press is answered where a slider drag is. Nothing on
 * mount: only a change flashes. (Hovering the control names its value
 * through the pointer's own rule table, `utils/statusInfo.ts`.)
 */
export function useSpeedInfo(speed: number): boolean {
  const [flash, setFlash] = useState(false);
  const lastSpeedRef = useRef(speed);

  useEffect(() => {
    if (lastSpeedRef.current === speed) return;
    lastSpeedRef.current = speed;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), SPEED_INFO_MS);
    return () => clearTimeout(timer);
  }, [speed]);

  return flash;
}
