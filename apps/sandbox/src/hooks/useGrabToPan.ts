import { useEffect, useRef, useState } from 'react';

/** Middle-button grab-to-pan (user decision 2026-09-30 — it was
 *  Cmd/Ctrl + left drag, and Cmd+drag is now the marquee).
 *
 *  Press the middle button (the scroll wheel) anywhere in the canvas
 *  scroll container and drag to scroll it in both axes. No modifier,
 *  no mode: the middle button has no other job on the canvas. The
 *  browser's own middle-button behaviour (autoscroll on Windows and
 *  Linux, paste on X11) is suppressed for the press.
 *
 *  Returns a flag the caller can use for the cursor: `grabbing` while
 *  actively dragging (the app-wide class is toggled here too).
 */
export interface UseGrabToPanArgs {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export interface UseGrabToPanResult {
  /** True while the user is actively dragging in pan mode.
   *  Cursor should show `grabbing` and other canvas interactions
   *  should be suppressed. */
  isPanning: boolean;
}

export function useGrabToPan({
  scrollContainerRef,
}: UseGrabToPanArgs): UseGrabToPanResult {
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    scrollLeft: number;
    scrollTop: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Force the closed-hand cursor app-wide while panning. Setting it on
  // a single element gets overridden by every child that has its own
  // cursor (clips, resize handles, etc.), so we toggle a class on
  // <html> and let a !important rule win.
  useEffect(() => {
    const root = document.documentElement;
    if (isPanning) root.classList.add('pan-active');
    else root.classList.remove('pan-active');
    return () => {
      root.classList.remove('pan-active');
    };
  }, [isPanning]);

  // Mouse drag → scroll the container.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      panStartRef.current = {
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      setIsPanning(true);
      // Beat clip / selection / split handlers that listen on the same
      // mousedown event, and the browser's own middle-button behaviour
      // — pan mode owns this press.
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e: MouseEvent) => {
      const start = panStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.clientX;
      const dy = e.clientY - start.clientY;
      container.scrollLeft = start.scrollLeft - dx;
      container.scrollTop = start.scrollTop - dy;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 1) return;
      if (panStartRef.current) {
        panStartRef.current = null;
        setIsPanning(false);
      }
    };
    // The middle button's click (auxclick) would otherwise paste on X11
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    container.addEventListener('mousedown', onMouseDown, true);
    container.addEventListener('auxclick', onAuxClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown, true);
      container.removeEventListener('auxclick', onAuxClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [scrollContainerRef]);

  return { isPanning };
}
