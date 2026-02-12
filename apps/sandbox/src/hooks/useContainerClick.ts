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
  selectedTrackIndices: number[];
  selectionAnchor: number | null;
  setSelectionAnchor: (anchor: number | null) => void;
  keyboardFocusedTrack?: number | null;
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
  keyboardFocusedTrack,
}: ContainerClickConfig) {

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
      // Clicked in empty space below tracks - maintain focus and selection
      console.log('[useContainerClick] Clicked in EMPTY SPACE below tracks');
      console.log('[useContainerClick] keyboardFocusedTrack:', keyboardFocusedTrack);
      console.log('[useContainerClick] selectedTrackIndices:', selectedTrackIndices);

      // DON'T call containerPropsOnClick here - it would clear track selection
      // Prevent default to avoid blurring the currently focused element
      e.preventDefault();

      // Determine which track to focus - use keyboardFocusedTrack if available,
      // otherwise use the first selected track as fallback
      const trackToFocus = keyboardFocusedTrack ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : null);
      console.log('[useContainerClick] Track to focus:', trackToFocus);

      if (trackToFocus !== null && trackToFocus !== undefined) {
        // Keep the focused track focused
        dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackToFocus });
        onTrackFocusChange?.(trackToFocus, true);
        // Also maintain track selection - re-select the currently selected tracks
        if (selectedTrackIndices.length > 0) {
          dispatch({ type: 'SET_SELECTED_TRACKS', payload: selectedTrackIndices });
        }

        // Re-focus the track element to maintain keyboard focus
        // Find the track element by data attribute and focus it
        const trackElement = document.querySelector(`[data-track-index="${trackToFocus}"] .track`);
        console.log('[useContainerClick] Found track element:', trackElement);
        if (trackElement && trackElement instanceof HTMLElement) {
          trackElement.focus();
          console.log('[useContainerClick] Re-focused track element');
        }
      }
    } else if (clickedTrackIndex !== null) {
      // Call containerProps onClick handler for track clicks (but skip if Shift is held)
      // (it would change selection before our Shift+Click logic runs)
      if (containerPropsOnClick && !e.shiftKey) {
        containerPropsOnClick(e);
      }
      console.log('[useContainerClick] Clicked track:', clickedTrackIndex, 'Shift:', e.shiftKey);
      console.log('[useContainerClick] Current selection:', selectedTrackIndices);
      console.log('[useContainerClick] Current anchor:', selectionAnchor);

      // Clicked on a track - handle selection based on Shift key
      if (e.shiftKey) {
        // Shift+Click: Range selection
        const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : clickedTrackIndex);
        console.log('[useContainerClick] Using anchor:', anchor);
        if (selectionAnchor === null) {
          setSelectionAnchor(anchor);
        }

        // Calculate range selection from anchor to clicked track
        const start = Math.min(anchor, clickedTrackIndex);
        const end = Math.max(anchor, clickedTrackIndex);
        const newSelection: number[] = [];
        for (let i = start; i <= end; i++) {
          newSelection.push(i);
        }
        console.log('[useContainerClick] New selection:', newSelection);
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
      } else {
        // Normal click - select only clicked track
        console.log('[useContainerClick] Normal click - selecting only:', clickedTrackIndex);
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: [clickedTrackIndex] });
        // Clear anchor
        setSelectionAnchor(null);
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
