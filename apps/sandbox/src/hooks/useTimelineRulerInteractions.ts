import { useCallback } from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import type { SnapGrid } from '@audacity-ui/core';
import { CLIP_CONTENT_OFFSET } from '@dilsonspickles/components';
import { snapToGrid } from '../utils/snapToGrid';
import type { Track, TracksAction } from '../contexts/TracksContext';
import type { TimelineRulerContextMenuState } from './useContextMenuState';

export interface UseTimelineRulerInteractionsDeps {
  /**
   * Ref to the ruler wrapper DOM node. Owned by EditorLayout (also read by
   * `useMeasuredWidth` and Canvas's `onShiftTabFromTrack` per the cross-block
   * ref rule) — this hook only reads `.current`, never creates the ref.
   */
  timelineRulerRef: React.RefObject<HTMLDivElement | null>;
  playheadPosition: number;
  canvasSnap: SnapGrid;
  snapEnabled: boolean | undefined;
  timelineFormat: 'minutes-seconds' | 'beats-measures';
  bpm: number;
  beatsPerMeasure: number;
  pixelsPerSecond: number;
  scrollX: number;
  clickRulerToStartPlayback: boolean;
  tracks: Track[];
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setMouseCursorPosition: React.Dispatch<React.SetStateAction<number | undefined>>;
  setTimelineRulerContextMenu: React.Dispatch<React.SetStateAction<TimelineRulerContextMenuState | null>>;
  dispatch: React.Dispatch<TracksAction>;
}

export interface UseTimelineRulerInteractionsResult {
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => Promise<void>;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Handler bundle for the timeline-ruler wrapper (`aria-label="Timeline
 * ruler"`, tabIndex from `useTabOrder('timeline-ruler')`): Escape / Shift+F10
 * context menu / arrow-key playhead nudge with snap math, mouse-cursor time
 * tracking, click-to-play, and right-click context menu.
 *
 * All handlers are plain React props on the wrapper div — no document
 * listeners are attached here, so no ref-mirror pattern is needed.
 */
export function useTimelineRulerInteractions(
  deps: UseTimelineRulerInteractionsDeps
): UseTimelineRulerInteractionsResult {
  const {
    timelineRulerRef, playheadPosition, canvasSnap, snapEnabled, timelineFormat, bpm, beatsPerMeasure,
    pixelsPerSecond, scrollX, clickRulerToStartPlayback, tracks, audioManagerRef, setIsPlaying,
    setMouseCursorPosition, setTimelineRulerContextMenu, dispatch,
  } = deps;

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === 'F10' && e.shiftKey) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setTimelineRulerContextMenu({
        isOpen: true,
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      });
    }
    // ArrowUp/Down: swallow while the ruler is focused so
    // the global "single-item region → jump into track
    // list" handler doesn't steal focus. The ruler is a
    // matrix-X-only surface — Up / Down have no meaning
    // here, so we consume the event and leave focus put.
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Arrow keys nudge the playhead while the timeline
    // ruler is focused. With snap on, each press lands on
    // the next/previous grid division; with snap off, step
    // is 0.1s (Shift accelerates to 1s).
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      let next: number;
      if (snapEnabled) {
        // Snap the *current* playhead to its nearest grid
        // line, then step one grid unit in the requested
        // direction. Falls through to the unsnapped step
        // if snap math degenerates.
        const snapBase = snapToGrid(playheadPosition, {
          timeFormat: timelineFormat,
          bpm,
          beatsPerMeasure,
          snap: canvasSnap,
          pixelsPerSecond,
        });
        const stepCandidate = snapToGrid(snapBase + direction * 0.001, {
          timeFormat: timelineFormat,
          bpm,
          beatsPerMeasure,
          snap: canvasSnap,
          pixelsPerSecond,
        });
        const gridStep = Math.abs(stepCandidate - snapBase) || 0.1;
        next = Math.max(0, snapBase + direction * gridStep);
      } else {
        const step = e.shiftKey ? 1 : 0.1;
        next = Math.max(0, playheadPosition + direction * step);
      }
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: next });
    }
  }, [snapEnabled, playheadPosition, timelineFormat, bpm, beatsPerMeasure, canvasSnap, pixelsPerSecond, dispatch, setTimelineRulerContextMenu]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRulerRef.current) {
      const rect = timelineRulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const timePosition = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;
      setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
    }
  }, [timelineRulerRef, scrollX, pixelsPerSecond, setMouseCursorPosition]);

  const onMouseLeave = useCallback(() => {
    setMouseCursorPosition(undefined);
  }, [setMouseCursorPosition]);

  const onClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickRulerToStartPlayback || !timelineRulerRef.current) return;

    const rect = timelineRulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    let clickedTime = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;

    if (snapEnabled) {
      clickedTime = snapToGrid(clickedTime, {
        timeFormat: timelineFormat,
        bpm,
        beatsPerMeasure,
        snap: canvasSnap,
        pixelsPerSecond,
      });
    }

    if (clickedTime >= 0) {
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: clickedTime });

      const audioManager = audioManagerRef.current;

      if (audioManager.getIsPlaying()) {
        audioManager.stop();
        setIsPlaying(false);
      }

      audioManager.loadClips(tracks, clickedTime);
      await audioManager.play(clickedTime);
      setIsPlaying(true);
    }
  }, [
    clickRulerToStartPlayback, timelineRulerRef, scrollX, pixelsPerSecond, snapEnabled, timelineFormat,
    bpm, beatsPerMeasure, canvasSnap, dispatch, audioManagerRef, setIsPlaying, tracks,
  ]);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setTimelineRulerContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, [setTimelineRulerContextMenu]);

  return { onKeyDown, onMouseMove, onMouseLeave, onClick, onContextMenu };
}
