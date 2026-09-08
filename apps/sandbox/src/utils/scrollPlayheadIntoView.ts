import { scrollIntoViewIfNeeded } from '@audacity-ui/components';

/**
 * Scroll the canvas so the playhead cursor is visible. Double-rAF so the
 * SET_PLAYHEAD_POSITION dispatch that usually precedes this has rendered
 * before we measure. Moved verbatim from useKeyboardShortcuts so the
 * transport skip buttons can share it.
 */
export function scrollPlayheadIntoView(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const container = document.querySelector('.canvas-scroll-container') as HTMLElement;
      const playhead = container?.querySelector('.playhead-cursor') as HTMLElement;
      if (playhead) scrollIntoViewIfNeeded(playhead, container);
    });
  });
}
