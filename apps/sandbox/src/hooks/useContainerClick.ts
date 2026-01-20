import { MutableRefObject } from 'react';
import { CLIP_CONTENT_OFFSET } from '@audacity-ui/components';
import type { Track } from '../contexts/TracksContext';

interface ContainerClickConfig {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  tracks: Track[];
  containerPropsOnClick: ((e: React.MouseEvent<HTMLDivElement>) => void) | undefined;
  selectionWasJustDragging: () => boolean;
  pixelsPerSecond: number;
  dispatch: (action: any) => void;
  onTrackFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  TOP_GAP: number;
  TRACK_GAP: number;
  DEFAULT_TRACK_HEIGHT: number;
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
}: ContainerClickConfig) {

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // First, call the containerProps onClick handler to preserve drag prevention logic
    if (containerPropsOnClick) {
      containerPropsOnClick(e);
    }

    // Only update playhead and track focus if we're not dragging
    const wasJustDragging = selectionWasJustDragging();
    if (wasJustDragging) {
      return; // Skip everything - focus was already set during the drag
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
      // Clicked in empty space below tracks - deselect everything
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: null });
      dispatch({ type: 'SET_TIME_SELECTION', payload: null });
      onTrackFocusChange?.(0, false); // Clear keyboard focus
    } else if (clickedTrackIndex !== null) {
      // Clicked on a track - select it and set focus
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [clickedTrackIndex] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: clickedTrackIndex });
      onTrackFocusChange?.(clickedTrackIndex, true);
    }

    // Always move playhead on click (allow it to go to 0 - stalk can touch the gap)
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: Math.max(0, time) });
  };

  return handleContainerClick;
}
