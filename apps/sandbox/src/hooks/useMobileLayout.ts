import { useEffect, useState } from 'react';

/** The width at or under which the phone editor takes over (feat/mobile) */
export const MOBILE_MAX_WIDTH = 600;

function wantsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('mobile')) return true;
  return typeof window.matchMedia === 'function'
    && window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
}

/** Whether the window is phone-sized (or ?mobile forces it) — follows
 *  rotation and resizes */
export function useMobileLayout(): boolean {
  const [mobile, setMobile] = useState(wantsMobile);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setMobile(wantsMobile());
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}
