import { useEffect, useRef, useState } from 'react';

/**
 * useThrottledValue — a value that follows `value` at most once per
 * `intervalMs`, and always lands on the latest value once it rests.
 *
 * The clip body's expensive canvas redraw is keyed on this rather than
 * on React's `useDeferredValue` (2026-10-08): under a continuous
 * Cmd+wheel track resize React never found the idle moment to commit
 * the deferred height, so the bitmap stayed at the gesture's starting
 * height and was CSS-stretched to the live one — a 2× vertical stretch
 * that read as the waveform "zooming" about its centre line, then
 * snapping back when the redraw finally landed ("all the clips'
 * waveforms zoom and then reset when I stop"). A time throttle keeps
 * the redraw a few pixels behind the live height, so the stretch
 * between redraws is never visible, at a bounded cost: one redraw per
 * interval per clip, however fast the wheel.
 *
 * Leading edge: the first change after a rest commits at once.
 * Trailing edge: a change inside the interval is committed when the
 * interval ends, so the last value is never missed.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastCommitRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(value);
  latestRef.current = value;

  useEffect(() => {
    if (Object.is(value, throttled) && timerRef.current === null) return;
    const now = Date.now();
    const elapsed = now - lastCommitRef.current;
    if (elapsed >= intervalMs) {
      lastCommitRef.current = now;
      setThrottled(value);
      return;
    }
    if (timerRef.current !== null) return; // a trailing commit is already scheduled
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      lastCommitRef.current = Date.now();
      setThrottled(latestRef.current);
    }, intervalMs - elapsed);
    // Deliberately no cleanup of the trailing timer on value change —
    // it reads latestRef, so it commits whatever is current when it fires
  }, [value, intervalMs, throttled]);

  useEffect(() => () => { if (timerRef.current !== null) clearTimeout(timerRef.current); }, []);

  return throttled;
}
