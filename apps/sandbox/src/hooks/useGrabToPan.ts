import { useEffect, useRef, useState } from 'react';

/** Hold-H grab-to-pan, à la Photoshop's hand tool.
 *
 *  Spacebar is reserved exclusively for playback in this app, so the
 *  pan modifier is H instead. Hold H (outside any text field) and
 *  left-click-drag scrolls the canvas in both axes. Other canvas
 *  interactions (clip select, time selection, split, etc.) are
 *  intercepted in the capture phase so they don't fight the pan.
 *
 *  Returns flags the caller can use to set the cursor: `grab` while
 *  just holding, `grabbing` while actively dragging.
 */
export interface UseGrabToPanArgs {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export interface UseGrabToPanResult {
  /** True while H is held down. Cursor should show `grab`. */
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

  // H key press/release.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'h' && e.key !== 'H') return;
      // Don't capture H when modifiers are also held — leaves Cmd+H,
      // Alt+H, etc. available for other shortcuts the OS or app uses.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const isTextField =
          target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' &&
            ['text', 'search', 'url', 'email', 'tel', 'password', 'number'].includes(
              (target as HTMLInputElement).type,
            )) ||
          target.isContentEditable;
        if (isTextField) return;
      }
      e.preventDefault();
      if (e.repeat) return;
      setIsModifierHeld(true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'h' && e.key !== 'H') return;
      setIsModifierHeld(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
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
