import React, { MutableRefObject } from 'react';
import { CLIP_CONTENT_OFFSET } from '@dilsonspickles/components';
import type { Track, TracksAction } from '../contexts/TracksContext';

interface ContainerClickConfig {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  tracks: Track[];
  containerPropsOnClick: ((e: React.MouseEvent<HTMLDivElement>) => void) | undefined;
  selectionWasJustDragging: () => boolean;
  pixelsPerSecond: number;
  dispatch: React.Dispatch<TracksAction>;
  onTrackFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  TOP_GAP: number;
  TRACK_GAP: number;
  DEFAULT_TRACK_HEIGHT: number;
  selectedTrackIndices: number[];
  selectionAnchor: number | null;
  setSelectionAnchor: (anchor: number | null) => void;
}

/**
 * Custom hook for handling canvas container clicks
 * Handles:
 * - Playhead positioning
 * - Track selection and focus
 * - Empty space click handling (deselect all)
 * - Track hit detection
 */
export function useContainerClick({
  containerRef,
  tracks,
  containerPropsOnClick,
  selectionWasJustDragging,
  pixelsPerSecond,
  dispatch,
  onTrackFocusChange,
  TOP_GAP,
  TRACK_GAP,
  DEFAULT_TRACK_HEIGHT,
  selectedTrackIndices,
  selectionAnchor,
  setSelectionAnchor,
}: ContainerClickConfig) {

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Cmd / Ctrl is the grab-to-pan modifier — clicks with it held
    // shouldn't move the playhead or change track focus.
    if (e.metaKey || e.ctrlKey) return;

    // Only update playhead and track focus if we're not dragging
    const wasJustDragging = selectionWasJustDragging();
    if (wasJustDragging && !e.shiftKey) {
      return; // Skip everything - focus was already set during the drag (unless Shift is held)
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate time from click position, accounting for CLIP_CONTENT_OFFSET
    const time = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;

    // Calculate which track was clicked (if any)
    let clickedTrackIndex: number | null = null;
    let currentY = TOP_GAP;
    for (let i = 0; i < tracks.length; i++) {
      const trackHeight = tracks[i].height || DEFAULT_TRACK_HEIGHT;
      if (y >= currentY && y < currentY + trackHeight) {
        clickedTrackIndex = i;
        break;
      }
      currentY += trackHeight + TRACK_GAP;
    }

    // Check if click was below all tracks (in empty space)
    const totalTracksHeight = tracks.reduce((sum, track) => sum + (track.height || DEFAULT_TRACK_HEIGHT), 0) + TOP_GAP + (TRACK_GAP * (tracks.length - 1));

    if (y > totalTracksHeight) {
      // Clicked in empty space below all tracks — deselect all
      // tracks but leave focus (both the focusedTrackIndex state
      // and DOM focus) untouched. preventDefault keeps whatever
      // element was focused from being blurred.
      e.preventDefault();
      if (selectedTrackIndices.length > 0) {
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: [] });
      }
    } else if (clickedTrackIndex !== null) {
      // Call containerProps onClick handler for track clicks (but skip if Shift is held)
      // (it would change selection before our Shift+Click logic runs)
      if (containerPropsOnClick && !e.shiftKey) {
        containerPropsOnClick(e);
      }

      // Track selection on canvas clicks is now an explicit gesture
      // only: Shift+Click extends a range; plain clicks just move
      // focus / playhead and leave the selection where the user last
      // put it (side panel, Cmd+click, keyboard, etc.). Matches the
      // clip-vs-track decoupling — the canvas is for clip / time
      // work, not for reshuffling the track selection.
      if (e.shiftKey) {
        const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : clickedTrackIndex);
        if (selectionAnchor === null) {
          setSelectionAnchor(anchor);
        }

        const start = Math.min(anchor, clickedTrackIndex);
        const end = Math.max(anchor, clickedTrackIndex);
        const newSelection: number[] = [];
        for (let i = start; i <= end; i++) {
          newSelection.push(i);
        }
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
      }

      dispatch({ type: 'SET_FOCUSED_TRACK', payload: clickedTrackIndex });
      onTrackFocusChange?.(clickedTrackIndex, true);
    }
    // If clickedTrackIndex is null but y is within track bounds, do nothing - maintain current state

    // Always move playhead on click (allow it to go to 0 - stalk can touch the gap)
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: Math.max(0, time) });
  };

  return handleContainerClick;
}
