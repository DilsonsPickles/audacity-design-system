import { useEffect } from 'react';
import type { TracksState } from '../contexts/TracksContext';

export interface UseTimeSelectionTabHandlerDeps {
  state: TracksState;
  showVerticalRulers: boolean;
}

/**
 * Installs a capture-phase global `keydown` listener that intercepts Tab
 * when a time selection is active and focus is "ambient" (body, canvas scroll
 * container, a track wrapper, or a tabindex=-1 element).  On Tab it jumps
 * focus to the first clip on the focused track that overlaps the selection,
 * the track container, or — for empty tracks — the track's vertical ruler or
 * the next track's panel controls.
 *
 * Extracted verbatim from EditorLayout.tsx; no behavior change.
 */
export function useTimeSelectionTabHandler(
  deps: UseTimeSelectionTabHandlerDeps,
): void {
  const { state, showVerticalRulers } = deps;

  // "Enter the time selection" Tab handler. When the user has just
  // drawn a time selection (typically via mouse drag) and presses
  // Tab from an ambient focus point (body / canvas scroll container),
  // jump focus into the first clip on the focused track that overlaps
  // the selection. If the focused track has no overlapping clip, fall
  // back to the track wrapper so the user is at least on the track
  // that owns the selection. Runs before any sibling tab interceptors
  // via the capture phase.
  useEffect(() => {
    const handleSelectionTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (!state.timeSelection) return;
      // Intercept when focus is somewhere "neutral" w.r.t. the
      // selection — body, the canvas scroll container, anything
      // with tabindex=-1, OR a track wrapper (which is where a
      // mouse-drag to make a time selection often parks focus).
      // We deliberately do NOT intercept when focus is on a clip
      // or a panel control — those want their own Tab order.
      const isAmbient =
        !active
        || active === document.body
        || active.classList.contains('canvas-scroll-container')
        || active.classList.contains('track')
        || (active.tabIndex ?? -1) === -1;
      if (!isAmbient) return;
      // Also bail if the user happens to be on a clip — let the
      // normal clip-to-clip Tab order handle it.
      if (active?.closest('[data-clip-id]')) return;
      const fti = state.focusedTrackIndex;
      if (fti === null || fti === undefined) return;
      const track = state.tracks[fti];
      if (!track) return;

      const { startTime, endTime } = state.timeSelection;
      const overlapping = (track.clips || [])
        .filter((c) => c.start < endTime && c.start + c.duration > startTime)
        .sort((a, b) => a.start - b.start);

      const trackEl = document.querySelector<HTMLElement>(
        `.track-wrapper[data-track-index="${fti}"] .track`,
      );
      let targetEl: HTMLElement | null = null;
      if (overlapping.length > 0) {
        targetEl = document.querySelector<HTMLElement>(
          `[data-clip-id="${overlapping[0].id}"][data-track-index="${fti}"]`,
        );
      } else if (trackEl && document.activeElement !== trackEl) {
        // Focus the track container so subsequent Tab presses hit
        // TrackNew's own routing (which advances to ruler / next
        // track). We ONLY do this when focus isn't already there —
        // otherwise we'd re-focus the same element and create a
        // Tab dead-end.
        targetEl = trackEl;
      } else {
        // Focus is already on the empty track's .track (typical after
        // a mouse-drawn selection). Advance the same way we do from
        // the last clip of a populated track: prefer this track's
        // ruler, else the next track's panel.
        const rulerEl = showVerticalRulers
          && state.tracks[fti]?.type !== 'label'
          && state.tracks[fti]?.type !== 'midi'
          ? document.querySelector<HTMLElement>(`[data-track-ruler-index="${fti}"]`)
          : null;
        if (rulerEl) {
          targetEl = rulerEl;
        } else {
          const nextIndex = fti + 1;
          if (nextIndex < state.tracks.length) {
            const panels = document.querySelectorAll('[aria-label*="track controls"]');
            const nextPanel = panels[nextIndex];
            const firstButton = nextPanel?.querySelector('button') as HTMLElement | null;
            if (firstButton) targetEl = firstButton;
          }
        }
      }
      if (!targetEl) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      setTimeout(() => {
        // If focus is already on the target (mouse drag parked it
        // there), blur first so the re-focus actually fires the
        // onFocus handler and lights up the container-focused
        // (keyboard-mode) outline.
        if (document.activeElement === targetEl) {
          targetEl.blur();
        }
        if (targetEl && targetEl === trackEl) {
          // Mark this as keyboard-driven focus so TrackNew shows the
          // container-focused outline rather than the ambient mouse
          // outline left over from the drag.
          targetEl.setAttribute('data-focus-from-nav', '1');
        }
        targetEl?.focus();
      }, 0);
    };

    document.addEventListener('keydown', handleSelectionTab, true);
    return () => document.removeEventListener('keydown', handleSelectionTab, true);
  }, [state.timeSelection, state.focusedTrackIndex, state.tracks, showVerticalRulers]);
}
