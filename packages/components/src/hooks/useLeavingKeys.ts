/**
 * A soft exit for the hover-dependent clip controls (user decision
 * 2026-10-01: "subtle fade out, less than 0.5s"). The trim and stretch
 * handles, the fade handles, the shape handles and the crossfade node
 * are MOUNTED only while they apply; to fade out they have to stay a
 * moment longer. These hooks keep a key "leaving" for HANDLE_LEAVE_MS
 * after it stops being active; the control renders for that long with
 * `data-leaving`, and the CSS (Clip.css / Track.css) fades it and takes
 * its pointer events. Appearance stays instant — the fade is on the
 * way out only.
 *
 * The leaving set is known IN THE RENDER where a key goes (from the
 * previous render's keys), not an effect later — otherwise the element
 * unmounts for a render and comes back marked leaving, and a remounted
 * element starts at opacity 0 with nothing to transition from.
 *
 * Where nothing can animate — no matchMedia (jsdom), or the user asks
 * for reduced motion — the delay is zero and nothing lingers.
 */
import { useEffect, useRef, useState } from 'react';

export const HANDLE_LEAVE_MS = 200;

export function handleLeaveMs(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 0;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : HANDLE_LEAVE_MS;
}

/** The keys that were active and stopped being so within `ms`. The
 *  caller renders active ∪ leaving, marking the leaving ones. A key
 *  that comes back while leaving is simply active again. */
export function useLeavingKeys(active: ReadonlyArray<string>, ms: number = handleLeaveMs()): ReadonlySet<string> {
  // Keys with a running exit timer
  const [timed, setTimed] = useState<ReadonlySet<string>>(() => new Set());
  const prevRef = useRef<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // By content, not identity: callers build the array each render
  const signature = active.join('\u0000');
  const now = new Set(signature === '' ? [] : signature.split('\u0000'));

  // This render's answer: the timed keys not active again, plus the
  // keys that were active LAST render and are not now (their timers
  // start in the effect below) — none of it when nothing can animate
  const leaving = new Set<string>();
  if (ms > 0) {
    for (const k of timed) if (!now.has(k)) leaving.add(k);
    for (const k of prevRef.current) if (!now.has(k)) leaving.add(k);
  }

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = now;
    const gone = [...prev].filter((k) => !now.has(k));
    const back = [...now].filter((k) => timers.current.has(k));
    if (gone.length === 0 && back.length === 0) return;
    for (const k of back) {
      clearTimeout(timers.current.get(k));
      timers.current.delete(k);
    }
    if (ms > 0) {
      for (const k of gone) {
        clearTimeout(timers.current.get(k));
        timers.current.set(k, setTimeout(() => {
          timers.current.delete(k);
          setTimed((s) => {
            if (!s.has(k)) return s;
            const n = new Set(s);
            n.delete(k);
            return n;
          });
        }, ms));
      }
    }
    setTimed((s) => {
      const n = new Set(s);
      for (const k of back) n.delete(k);
      if (ms > 0) for (const k of gone) n.add(k);
      return n.size === s.size && [...n].every((k) => s.has(k)) ? s : n;
    });
    // `now` is derived from `signature`; `ms` is read live
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ms]);

  useEffect(() => {
    const map = timers.current;
    return () => { for (const t of map.values()) clearTimeout(t); };
  }, []);

  return leaving;
}

/** One boolean's worth of the same: `mounted` while shown or leaving,
 *  `leaving` for the tail. */
export function useLeaveDelay(shown: boolean, ms: number = handleLeaveMs()): { mounted: boolean; leaving: boolean } {
  const leaving = useLeavingKeys(shown ? ONE : NONE, ms);
  const tail = !shown && leaving.has('x');
  return { mounted: shown || tail, leaving: tail };
}

const ONE: ReadonlyArray<string> = ['x'];
const NONE: ReadonlyArray<string> = [];
