/**
 * useTimeSelection Hook
 *
 * Provides time selection dragging functionality for audio track editors.
 * Handles mouse events to create time selections by clicking and dragging across the canvas.
 * Supports resizing selection by dragging edges.
 */

import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import {
  TimeSelection,
  TimeSelectionDragState,
  TimeSelectionConfig,
  pixelsToTime,
  timeToPixels,
  yToTrackIndex,
  clampTrackIndex,
  getTrackRange
} from '@audacity-ui/core';

type DragMode = 'create' | 'resize-start' | 'resize-end' | null;

interface ExtendedDragState extends TimeSelectionDragState {
  mode: DragMode;
  initialSelection?: TimeSelection | null;
  initialSelectedTracks?: number[];
}

export interface UseTimeSelectionOptions extends TimeSelectionConfig {
  /** Ref to the container element that receives mouse events */
  containerRef: RefObject<HTMLElement>;
  /** Current time selection (for edge detection) */
  currentTimeSelection: TimeSelection | null;
  /** Currently selected track indices (for preserving during resize) */
  currentSelectedTracks: number[];
  /** Callback when time selection changes */
  onTimeSelectionChange: (selection: TimeSelection | null) => void;
  /** Callback when selected track indices change */
  onSelectedTracksChange: (trackIndices: number[]) => void;
  /** Callback when focused track changes */
  onFocusedTrackChange: (trackIndex: number | null) => void;
  /** Whether time selection is enabled */
  enabled?: boolean;
  /** Edge detection threshold in pixels */
  edgeThreshold?: number;
}

export interface UseTimeSelectionReturn {
  /** Whether a time selection drag is in progress */
  isDragging: boolean;
  /** Cursor style to apply to the container */
  cursorStyle: string;
  /** Function to start a time selection drag - call from container's onMouseDown */
  startDrag: (x: number, y: number) => void;
  /** Function to handle mouse move for cursor updates - call from container's onMouseMove */
  handleMouseMove: (x: number, y: number) => void;
  /** Function to check if we just finished dragging (to prevent click events) */
  wasJustDragging: () => boolean;
}

/**
 * Hook for handling time selection dragging and resizing
 */
export function useTimeSelection({
  containerRef,
  currentTimeSelection,
  currentSelectedTracks,
  pixelsPerSecond,
  leftPadding,
  tracks,
  defaultTrackHeight,
  trackGap,
  initialGap,
  onTimeSelectionChange,
  onSelectedTracksChange,
  onFocusedTrackChange,
  enabled = true,
  edgeThreshold = 6,
}: UseTimeSelectionOptions): UseTimeSelectionReturn {
  const dragStateRef = useRef<ExtendedDragState | null>(null);
  const wasDraggingRef = useRef<boolean>(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');

  /**
   * Check if mouse is near an edge of the time selection
   */
  const getEdgeProximity = useCallback((x: number): 'start' | 'end' | null => {
    if (!currentTimeSelection) return null;

    const startX = timeToPixels(currentTimeSelection.startTime, pixelsPerSecond, leftPadding);
    const endX = timeToPixels(currentTimeSelection.endTime, pixelsPerSecond, leftPadding);

    if (Math.abs(x - startX) <= edgeThreshold) {
      return 'start';
    }
    if (Math.abs(x - endX) <= edgeThreshold) {
      return 'end';
    }
    return null;
  }, [currentTimeSelection, pixelsPerSecond, leftPadding, edgeThreshold]);

  /**
   * Handle mouse move for cursor updates and dragging
   */
  const handleMouseMove = useCallback((x: number, y: number) => {
    if (!enabled) return;

    // If dragging, don't update cursor
    if (dragStateRef.current) return;

    // Check edge proximity for cursor style
    const edge = getEdgeProximity(x);
    if (edge) {
      setCursorStyle('ew-resize');
    } else {
      setCursorStyle('default');
    }
  }, [enabled, getEdgeProximity]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // Handle mouse move during drag
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current || !container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const { mode, initialSelection, initialSelectedTracks } = dragStateRef.current;

      if (mode === 'resize-start' && initialSelection) {
        // Resizing start edge - allow inverting by dragging past end edge
        const newStartTime = Math.max(0, pixelsToTime(x, pixelsPerSecond, leftPadding));

        // If dragged past the end, swap start and end
        if (newStartTime > initialSelection.endTime) {
          onTimeSelectionChange({
            startTime: initialSelection.endTime,
            endTime: newStartTime,
          });
        } else {
          onTimeSelectionChange({
            startTime: newStartTime,
            endTime: initialSelection.endTime,
          });
        }
      } else if (mode === 'resize-end' && initialSelection) {
        // Resizing end edge - allow inverting by dragging past start edge
        const newEndTime = Math.max(0, pixelsToTime(x, pixelsPerSecond, leftPadding));

        // If dragged past the start, swap start and end
        if (newEndTime < initialSelection.startTime) {
          onTimeSelectionChange({
            startTime: newEndTime,
            endTime: initialSelection.startTime,
          });
        } else {
          onTimeSelectionChange({
            startTime: initialSelection.startTime,
            endTime: newEndTime,
          });
        }
      } else if (mode === 'create') {
        // Creating new selection
        dragStateRef.current.currentX = x;

        const startTime = pixelsToTime(dragStateRef.current.startX, pixelsPerSecond, leftPadding);
        const endTime = pixelsToTime(x, pixelsPerSecond, leftPadding);

        onTimeSelectionChange({
          startTime: Math.min(startTime, endTime),
          endTime: Math.max(startTime, endTime),
        });

        // Update selected tracks based on drag range
        const currentTrackIndex = yToTrackIndex(y, tracks, initialGap, trackGap, defaultTrackHeight);
        const startTrackIndex = dragStateRef.current.startTrackIndex;

        // Clamp indices to valid track range
        const clampedStartTrack = clampTrackIndex(startTrackIndex, tracks);
        const clampedCurrentTrack = clampTrackIndex(currentTrackIndex, tracks);

        // Get all tracks in the range
        const selectedIndices = getTrackRange(clampedStartTrack, clampedCurrentTrack);
        onSelectedTracksChange(selectedIndices);
      }
    };

    // Handle mouse up - end drag
    const handleDocumentMouseUp = (e: MouseEvent) => {
      if (!dragStateRef.current || !container) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      const { mode } = dragStateRef.current;

      // Set flag to prevent click handlers from firing immediately after drag
      wasDraggingRef.current = true;

      // Clear the flag after a short delay (longer than click event propagation)
      setTimeout(() => {
        wasDraggingRef.current = false;
      }, 50);

      if (mode === 'create') {
        // Determine focused track (where mouse was released)
        const releasedTrackIndex = yToTrackIndex(y, tracks, initialGap, trackGap, defaultTrackHeight);

        // If released beyond last track, focus the last track
        if (releasedTrackIndex >= tracks.length) {
          onFocusedTrackChange(tracks.length - 1);
        } else if (releasedTrackIndex >= 0 && releasedTrackIndex < tracks.length) {
          onFocusedTrackChange(releasedTrackIndex);
        }
      }
      // For resize modes, don't change selected tracks or focused track
      // They are preserved from when the resize started

      // Clear drag state
      dragStateRef.current = null;

      // Update cursor based on mouse position
      const x = e.clientX - rect.left;
      handleMouseMove(x, y);
    };

    // Add document-level event listeners for dragging beyond container bounds
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [
    enabled,
    containerRef,
    currentTimeSelection,
    currentSelectedTracks,
    pixelsPerSecond,
    leftPadding,
    tracks,
    defaultTrackHeight,
    trackGap,
    initialGap,
    onTimeSelectionChange,
    onSelectedTracksChange,
    onFocusedTrackChange,
    handleMouseMove,
  ]);

  /**
   * Start a time selection drag or edge resize
   * Call this from the container's onMouseDown handler
   */
  const startDrag = (x: number, y: number) => {
    if (!enabled) return;

    // Check if clicking on an edge
    const edge = getEdgeProximity(x);

    if (edge === 'start') {
      // Start resizing from start edge - preserve selected tracks
      dragStateRef.current = {
        startX: x,
        currentX: x,
        startTrackIndex: 0,
        mode: 'resize-start',
        initialSelection: currentTimeSelection,
        initialSelectedTracks: currentSelectedTracks,
      };
      setCursorStyle('ew-resize');
    } else if (edge === 'end') {
      // Start resizing from end edge - preserve selected tracks
      dragStateRef.current = {
        startX: x,
        currentX: x,
        startTrackIndex: 0,
        mode: 'resize-end',
        initialSelection: currentTimeSelection,
        initialSelectedTracks: currentSelectedTracks,
      };
      setCursorStyle('ew-resize');
    } else {
      // Start creating new selection
      const trackIndex = yToTrackIndex(y, tracks, initialGap, trackGap, defaultTrackHeight);

      dragStateRef.current = {
        startX: x,
        currentX: x,
        startTrackIndex: trackIndex,
        mode: 'create',
      };

      // Clear any existing time selection
      onTimeSelectionChange(null);
      setCursorStyle('text');
    }
  };

  return {
    isDragging: dragStateRef.current !== null,
    cursorStyle,
    startDrag,
    handleMouseMove,
    wasJustDragging: () => wasDraggingRef.current,
  };
}
