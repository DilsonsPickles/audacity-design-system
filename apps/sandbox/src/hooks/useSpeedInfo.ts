import { useEffect, useRef, useState } from 'react';

/** How long slot two keeps the speed after a change */
export const SPEED_INFO_MS = 2000;

/**
 * WHEN THE STATUS BAR'S SECOND SLOT SAYS THE SPEED (2026-11-05, the
 * Figma "Status/Info bar" spec's slider pattern — hovering the volume
 * slider reads "Volume: +0.0 dB", dragging it "Volume: -8.0 dB"): while
 * the pointer is over the Play-at-Speed control, and for SPEED_INFO_MS
 * after the speed CHANGES by any means — the keys, the slider, a typed
 * value — so a shortcut press is answered where a slider drag is.
 * Nothing on mount: only a change flashes.
 */
export function useSpeedInfo(speed: number): boolean {
  const [hovered, setHovered] = useState(false);
  const [flash, setFlash] = useState(false);
  const lastSpeedRef = useRef(speed);

  useEffect(() => {
    if (lastSpeedRef.current === speed) return;
    lastSpeedRef.current = speed;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), SPEED_INFO_MS);
    return () => clearTimeout(timer);
  }, [speed]);

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      setHovered(!!target?.closest('[data-varispeed]'));
    };
    const onLeave = () => setHovered(false);
    document.addEventListener('mouseover', onOver);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return hovered || flash;
}
