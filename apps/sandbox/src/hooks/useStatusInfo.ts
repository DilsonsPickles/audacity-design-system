import { useEffect, useRef, useState } from 'react';
import { resolveStatusInfo, type StatusInfoContext } from '../utils/statusInfo';

export interface StatusInfo {
  /** The info line for what the pointer is over, or null */
  text: string | null;
  /** The app's window is in the background (the spec's dimmed bar) */
  backgrounded: boolean;
}

/**
 * Follows the pointer for the status bar's info line (2026-11-05, the
 * Figma Status/Info bar spec). Document listeners, bound once:
 *  - mouseover resolves at once (the pointer entered something);
 *  - mousemove re-resolves once a frame, because a line can change
 *    with nothing entered: a slider's value under a drag, the track's
 *    resize edge, an envelope point;
 *  - a PRESS holds its element until the release, so a slider dragged
 *    off its own box goes on reading its value;
 *  - leaving the window clears the line; the window losing focus dims
 *    the bar.
 */
export function useStatusInfo(os: StatusInfoContext['os']): StatusInfo {
  const [text, setText] = useState<string | null>(null);
  const [backgrounded, setBackgrounded] = useState(false);
  const osRef = useRef(os);
  useEffect(() => { osRef.current = os; }, [os]);

  useEffect(() => {
    let held: Element | null = null;
    let last: Element | null = null;
    let frame = 0;
    const resolve = () => {
      const el = held ?? last;
      setText(el && el.isConnected ? resolveStatusInfo(el, { os: osRef.current }) : null);
    };
    const targetOf = (e: Event) => (e.target instanceof Element ? e.target : null);
    const onOver = (e: MouseEvent) => { last = targetOf(e); resolve(); };
    const onMove = (e: MouseEvent) => {
      last = targetOf(e);
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; resolve(); });
    };
    const onDown = (e: MouseEvent) => { held = targetOf(e); resolve(); };
    const onUp = () => { held = null; resolve(); };
    const onLeave = () => { last = null; if (!held) setText(null); };
    const onBlur = () => setBackgrounded(true);
    const onFocus = () => setBackgrounded(false);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('mouseup', onUp, true);
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('mouseup', onUp, true);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { text, backgrounded };
}
