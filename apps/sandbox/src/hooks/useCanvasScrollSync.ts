import React from 'react';

const MIN_ZOOM = 10; // Minimum pixels per second (matches useZoomControls)

export interface UseCanvasScrollSyncOptions {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  trackHeaderScrollRef: React.RefObject<HTMLDivElement>;
  lastWrittenScrollTopRef: React.MutableRefObject<{ canvas: number; header: number }>;
  pixelsPerSecond: number;
  maxPixelsPerSecond: number;
  setPixelsPerSecond: (v: number) => void; // the _setPixelsPerSecond from useZoomControls
  activeMenuItem: string;
  setScrollX: (v: number) => void;
  setScrollY: (v: number) => void;
}

export interface UseCanvasScrollSyncReturn {
  handleScroll: React.UIEventHandler<HTMLDivElement>;
  handleTrackHeaderScroll: React.UIEventHandler<HTMLDivElement>;
}

/** Wheel-zoom + two-pane (canvas / track-header) scroll sync.
 *
 *  Cmd/Ctrl + wheel zooms toward the cursor; plain wheel pans both axes
 *  (with Shift locking to horizontal). The canvas scroll container and
 *  the track-header side panel are kept in vertical scroll sync via an
 *  echo-absorb pattern: whichever side we just wrote to records the
 *  value it landed on, and the resulting scroll event is recognized as
 *  an echo (not a genuine user scroll) and swallowed instead of
 *  bouncing back, which avoids ping-pong drift between the two
 *  scrollers.
 */
export function useCanvasScrollSync({
  scrollContainerRef,
  trackHeaderScrollRef,
  lastWrittenScrollTopRef,
  pixelsPerSecond,
  maxPixelsPerSecond,
  setPixelsPerSecond,
  activeMenuItem,
  setScrollX,
  setScrollY,
}: UseCanvasScrollSyncOptions): UseCanvasScrollSyncReturn {
  const scrollRafRef = React.useRef<number | null>(null);
  const pendingScrollRef = React.useRef<{ x: number; y: number } | null>(null);

  // Wheel-to-zoom: Cmd/Ctrl + scroll zooms toward cursor (like piano roll)
  const ppsRef = React.useRef(pixelsPerSecond);
  const maxPpsRef = React.useRef(maxPixelsPerSecond);
  const setPixelsPerSecondRef = React.useRef(setPixelsPerSecond);
  ppsRef.current = pixelsPerSecond;
  maxPpsRef.current = maxPixelsPerSecond;
  setPixelsPerSecondRef.current = setPixelsPerSecond;

  const isZoomingRef = React.useRef(false);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const timeAtCursor = (cursorX + el.scrollLeft) / ppsRef.current;

        const zoomDelta = e.deltaY || e.deltaX;
        const zoomFactor = Math.pow(0.998, zoomDelta);
        const newPps = Math.max(MIN_ZOOM, Math.min(maxPpsRef.current, ppsRef.current * zoomFactor));

        // Update ref immediately so scroll correction uses new value
        ppsRef.current = newPps;

        // Suppress scroll state updates during zoom to avoid extra re-renders
        isZoomingRef.current = true;

        // Set scroll position before React re-render
        el.scrollLeft = Math.max(0, timeAtCursor * newPps - cursorX);

        // Trigger single React update for zoom level
        setPixelsPerSecondRef.current(newPps);

        // Clear zooming flag after React has processed the update
        requestAnimationFrame(() => {
          isZoomingRef.current = false;
        });
        return;
      }

      // Shift + wheel: lock scrolling to horizontal. Whichever axis
      // dominates (vertical swipe or wheel input — usually deltaY)
      // gets mapped to horizontal scroll. Trackpads emit small
      // perpendicular jitter so we can't gate on deltaX === 0; instead
      // we just take the larger-magnitude axis as the user's intent.
      if (e.shiftKey && (e.deltaY !== 0 || e.deltaX !== 0)) {
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        e.preventDefault();
        el.scrollLeft += delta;
        return;
      }

      // Plain trackpad / wheel — pan in both axes simultaneously so
      // diagonal two-finger swipes move the canvas freely. We do this
      // explicitly because Electron / some browsers axis-lock the
      // native scroll, which made diagonal panning feel sticky.
      if (e.deltaX !== 0 || e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaX;
        el.scrollTop += e.deltaY;
        // Sync the side panel on the SAME wheel event so the canvas
        // and side panel paint together. Without this, the canvas's
        // own scroll event handler does the sync but only after the
        // next paint, so the side panel visually trails by one frame.
        const header = trackHeaderScrollRef.current;
        if (header) {
          header.scrollTop = el.scrollTop;
          lastWrittenScrollTopRef.current.header = header.scrollTop;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeMenuItem]);

  // Mirror the canvas's wheel handler on the side panel: scroll both
  // scrollers together on the wheel event, eliminating the one-frame
  // visual lag that comes from relying solely on scroll events to
  // drive the cross-sync. Without this, trackpad scrolls in the side
  // panel make the canvas trail behind by a frame.
  React.useEffect(() => {
    const el = trackHeaderScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Defer to existing canvas-side behaviour (zoom / horizontal lock)
      // when modifiers are held — the user expects those gestures to
      // operate on the canvas, not the side panel.
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.deltaY === 0) return;

      e.preventDefault();
      el.scrollTop += e.deltaY;
      const canvas = scrollContainerRef.current;
      if (canvas) {
        canvas.scrollTop = el.scrollTop;
        lastWrittenScrollTopRef.current.canvas = canvas.scrollTop;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeMenuItem]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const scrollTop = e.currentTarget.scrollTop;

    // Throttle React state updates to once per animation frame
    pendingScrollRef.current = { x: scrollLeft, y: scrollTop };
    if (scrollRafRef.current === null) {
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const pending = pendingScrollRef.current;
        if (pending) {
          setScrollX(pending.x);
          setScrollY(pending.y);
        }
      });
    }

    // If this scroll event is the echo of a sync we just wrote to the
    // canvas, consume it without syncing back.
    if (Math.abs(scrollTop - lastWrittenScrollTopRef.current.canvas) < 0.5) {
      lastWrittenScrollTopRef.current.canvas = -1;
      return;
    }

    // Genuine canvas scroll — sync to header. Pass through the
    // sub-pixel value so trackpad scrolling stays glued together; if
    // we rounded here the header would lag the canvas by up to a
    // pixel during smooth scrolling.
    const header = trackHeaderScrollRef.current;
    if (header && Math.abs(header.scrollTop - scrollTop) > 0.5) {
      header.scrollTop = scrollTop;
      // Record what the browser ACTUALLY stored after the write —
      // it may have clamped or rounded the value. The echo scroll
      // event will fire with this stored value, so we need an exact
      // match for the absorb check to work.
      lastWrittenScrollTopRef.current.header = header.scrollTop;
    }
  };

  const handleTrackHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;

    if (Math.abs(scrollTop - lastWrittenScrollTopRef.current.header) < 0.5) {
      lastWrittenScrollTopRef.current.header = -1;
      return;
    }

    const canvas = scrollContainerRef.current;
    if (canvas && Math.abs(canvas.scrollTop - scrollTop) > 0.5) {
      canvas.scrollTop = scrollTop;
      lastWrittenScrollTopRef.current.canvas = canvas.scrollTop;
    }
  };

  return { handleScroll, handleTrackHeaderScroll };
}
