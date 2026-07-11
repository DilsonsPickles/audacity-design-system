import { useLayoutEffect, useState } from 'react';

/**
 * Tracks an element's `clientWidth` via ResizeObserver.
 *
 * Deliberately a `useLayoutEffect` (not `useEffect`): callers that feed the
 * measured width into a canvas-based child (e.g. TimelineRuler's
 * `viewportWidth`) need it settled before first paint, or the child renders
 * once at width 0 and visibly snaps to size.
 */
export function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState<number>(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
