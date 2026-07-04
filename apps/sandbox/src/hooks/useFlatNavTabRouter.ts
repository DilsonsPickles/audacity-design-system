import { useEffect } from 'react';

export interface UseFlatNavTabRouterDeps {
  isFlatNavigation: boolean;
}

/**
 * Intercepts Tab / Shift+Tab in flat-navigation mode and routes focus through
 * a per-track interleaved order: track wrapper → header controls → clips →
 * ruler, then the next track. Without this, the browser's natural Tab order
 * walks all headers, then all clips, then all rulers (separate DOM sub-trees).
 *
 * Verbatim extraction from EditorLayout.tsx — behavior-preserving only.
 */
export function useFlatNavTabRouter(deps: UseFlatNavTabRouterDeps): void {
  const { isFlatNavigation } = deps;

  // Flat-nav Tab interceptor — the side panel (all headers), canvas
  // (all clips) and ruler panel (all rulers) sit in separate DOM
  // sub-trees, so the browser's natural Tab order walks every header,
  // then every clip, then every ruler. The user wants per-track
  // interleaving: track 0 header → clips → ruler, then track 1, etc.
  // We compute that order at Tab time by querying the rendered DOM.
  useEffect(() => {
    if (!isFlatNavigation) return;

    const buildOrderedList = (): HTMLElement[] => {
      const list: HTMLElement[] = [];
      const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
      const isFocusable = (el: HTMLElement) => {
        if (el.tabIndex < 0) return false;
        if (el.hasAttribute('disabled')) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
      };

      // Panels are rendered in track-index order inside the side panel.
      const panels = Array.from(
        document.querySelectorAll<HTMLElement>('.track-control-panel'),
      );

      for (let i = 0; i < panels.length; i++) {
        // Track wrapper (.track div) is the "whole-track" focus stop
        // — Enter on it selects the track. We put it FIRST per track
        // so the natural flow is: enter the track → tab through
        // header → clips → ruler → next track.
        const trackEl = document.querySelector<HTMLElement>(
          `.track-wrapper[data-track-index="${i}"] .track`,
        );
        if (trackEl && isFocusable(trackEl)) {
          list.push(trackEl);
        }

        // Header controls
        const headers = Array.from(panels[i].querySelectorAll<HTMLElement>(FOCUSABLE))
          .filter(isFocusable);
        list.push(...headers);

        // Clips for track i
        const wrapper = document.querySelector<HTMLElement>(
          `.track-wrapper[data-track-index="${i}"]`,
        );
        if (wrapper) {
          const clips = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-clip-id]'))
            .filter(isFocusable);
          list.push(...clips);
        }

        // Ruler for track i (one per audio track)
        const ruler = document.querySelector<HTMLElement>(
          `[data-track-ruler-index="${i}"]`,
        );
        if (ruler && isFocusable(ruler)) {
          list.push(ruler);
        }
      }

      return list;
    };

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;

      const list = buildOrderedList();
      const currentIndex = list.indexOf(active);
      if (currentIndex === -1) return; // Focus is outside the track area

      const direction = e.shiftKey ? -1 : 1;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= list.length) {
        // Boundary — let the browser walk to the next/previous element
        // outside the track area (e.g. selection toolbar, side panel
        // header, etc.) via natural DOM order.
        return;
      }

      // stopImmediatePropagation prevents downstream React onKeyDown
      // handlers (e.g. the vertical ruler's redirect-to-track-wrapper
      // logic) from running and stomping the focus we set below.
      e.preventDefault();
      e.stopImmediatePropagation();
      // preventScroll lets the focus-target's own scroll-into-view
      // logic run instead of the browser's default focus scroll —
      // matches the non-flat container-tab-group behaviour and avoids
      // a double-jump when both fire at once.
      list[nextIndex].focus({ preventScroll: true });
    };

    document.addEventListener('keydown', handleTab, true);
    return () => document.removeEventListener('keydown', handleTab, true);
  }, [isFlatNavigation]);
}
