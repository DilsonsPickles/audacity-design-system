import { useEffect, useRef, useState } from 'react';

/** Hold-Cmd (or Ctrl on Windows/Linux) grab-to-pan.
 *
 *  Hold the platform modifier and left-click-drag the canvas scroll
 *  container to scroll it in both axes. Cmd is heavily used in
 *  combination shortcuts (Cmd+S, Cmd+Z, etc.) so the cursor only
 *  flips to "grab" while the modifier is held — it doesn't change
 *  app state. The actual pan only kicks in on a left-button mousedown
 *  inside the scroll container; everything else (Cmd+key combos, the
 *  browser's own shortcuts) continues to work normally.
 *
 *  Returns flags the caller can use to set the cursor: `grab` while
 *  just holding, `grabbing` while actively dragging.
 */
export interface UseGrabToPanArgs {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export interface UseGrabToPanResult {
  /** True while the pan modifier (Cmd/Ctrl) is held down. */
  isModifierHeld: boolean;
  /** True while the user is actively dragging in pan mode.
   *  Cursor should show `grabbing` and other canvas interactions
   *  should be suppressed. */
  isPanning: boolean;
}

export function useGrabToPan({
  scrollContainerRef,
}: UseGrabToPanArgs): UseGrabToPanResult {
  const [isModifierHeld, setIsModifierHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    scrollLeft: number;
    scrollTop: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Cmd / Ctrl press/release. We treat either as the modifier so
  // both macOS (Cmd) and Windows/Linux (Ctrl) work without any
  // platform sniffing.
  useEffect(() => {
    const isPanModifierKey = (e: KeyboardEvent) =>
      e.key === 'Meta' || e.key === 'Control';

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPanModifierKey(e)) return;
      if (e.repeat) return;
      setIsModifierHeld(true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isPanModifierKey(e)) return;
      setIsModifierHeld(false);
    };

    // Some OS/browser interactions (alt-tab, switching apps with the
    // modifier still down) can leave us thinking the key is held when
    // it isn't. Clearing on blur keeps the cursor sane.
    const onBlur = () => {
      setIsModifierHeld(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Mouse drag → scroll the container. Only active while H is held;
  // re-binding when it toggles attaches and detaches the capture-phase
  // listener cleanly.
  useEffect(() => {
    if (!isModifierHeld) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      panStartRef.current = {
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      setIsPanning(true);
      // Beat clip / selection / split handlers that listen on the same
      // mousedown event — pan mode owns this click.
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

    const onMouseUp = () => {
      if (panStartRef.current) {
        panStartRef.current = null;
        setIsPanning(false);
      }
    };

    container.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isModifierHeld, scrollContainerRef]);

  return { isModifierHeld, isPanning };
}
