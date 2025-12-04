/**
 * useAudioSelection Hook
 *
 * Composite hook that combines time selection, track selection, and clip selection
 * into a single, easy-to-use interface for audio editing applications.
 */

import { RefObject, useCallback } from 'react';
import { TimeSelection, TimeSelectionConfig } from '@audacity-ui/core';
import { useTimeSelection } from './useTimeSelection';
import { useTrackSelection } from './useTrackSelection';
import { useClipSelection } from './useClipSelection';

export interface UseAudioSelectionConfig extends TimeSelectionConfig {
  /** Ref to the container element */
  containerRef: RefObject<HTMLElement>;
  /** Current time selection (for edge detection and resizing) */
  currentTimeSelection: TimeSelection | null;
  /** Currently selected track indices (for preserving during resize) */
  currentSelectedTracks: number[];
  /** Whether selection is enabled */
  enabled?: boolean;
  /** Edge detection threshold in pixels for resize handles */
  edgeThreshold?: number;
}

export interface UseAudioSelectionCallbacks {
  /** Called when time selection changes */
  onTimeSelectionChange: (selection: TimeSelection | null) => void;
  /** Called when selected tracks change */
  onSelectedTracksChange: (trackIndices: number[]) => void;
  /** Called when focused track changes */
  onFocusedTrackChange: (trackIndex: number | null) => void;
  /** Called when a track is selected (single track) */
  onTrackSelect?: (trackIndex: number) => void;
  /** Called when a clip is selected */
  onClipSelect?: (trackIndex: number, clipId: string | number) => void;
}

export interface UseAudioSelectionReturn {
  /** Props to spread on the container element */
  containerProps: {
    ref: RefObject<HTMLElement>;
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
    onClick: (e: React.MouseEvent<HTMLElement>) => void;
    style: {
      cursor: string;
    };
  };
  /** Get props for a track component */
  getTrackProps: (trackIndex: number) => {
    onTrackClick: () => void;
  };
  /** Get props for clip interactions within a track */
  getClipProps: (trackIndex: number) => {
    onClipClick: (clipId: string | number) => void;
  };
  /** Selection state and utilities */
  selection: {
    /** Whether currently dragging */
    isDragging: boolean;
    /** Current cursor style */
    cursorStyle: string;
    /** Check if we just finished dragging (for custom logic) */
    wasJustDragging: () => boolean;
  };
}

/**
 * Composite hook for managing all audio selection behaviors
 *
 * @example
 * ```tsx
 * const selection = useAudioSelection(
 *   {
 *     containerRef,
 *     tracks,
 *     pixelsPerSecond: 100,
 *     leftPadding: 12,
 *     defaultTrackHeight: 114,
 *     trackGap: 2,
 *     initialGap: 2,
 *     currentTimeSelection: timeSelection,
 *     currentSelectedTracks: selectedTrackIndices,
 *   },
 *   {
 *     onTimeSelectionChange: (sel) => setTimeSelection(sel),
 *     onSelectedTracksChange: (tracks) => setSelectedTracks(tracks),
 *     onFocusedTrackChange: (track) => setFocusedTrack(track),
 *     onTrackSelect: (idx) => selectTrack(idx),
 *     onClipSelect: (idx, id) => selectClip(idx, id),
 *   }
 * );
 *
 * return (
 *   <div {...selection.containerProps}>
 *     {tracks.map((track, idx) => (
 *       <Track
 *         key={track.id}
 *         {...selection.getTrackProps(idx)}
 *         {...selection.getClipProps(idx)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useAudioSelection(
  config: UseAudioSelectionConfig,
  callbacks: UseAudioSelectionCallbacks
): UseAudioSelectionReturn {
  const {
    containerRef,
    currentTimeSelection,
    currentSelectedTracks,
    enabled = true,
    edgeThreshold = 6,
    ...timeSelectionConfig
  } = config;

  const {
    onTimeSelectionChange,
    onSelectedTracksChange,
    onFocusedTrackChange,
    onTrackSelect,
    onClipSelect,
  } = callbacks;

  // Time selection hook (handles dragging and resizing)
  const timeSelection = useTimeSelection({
    containerRef,
    currentTimeSelection,
    currentSelectedTracks,
    ...timeSelectionConfig,
    onTimeSelectionChange,
    onSelectedTracksChange,
    onFocusedTrackChange,
    enabled,
    edgeThreshold,
  });

  // Track selection hook (handles track clicks with drag prevention)
  const trackSelection = useTrackSelection({
    wasJustDragging: timeSelection.wasJustDragging,
    onTrackSelect,
  });

  // Clip selection hook (handles clip clicks with drag prevention)
  const clipSelection = useClipSelection({
    wasJustDragging: timeSelection.wasJustDragging,
    onClipSelect,
  });

  // Mouse event handlers for the container
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    timeSelection.startDrag(x, y);
  }, [containerRef, timeSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    timeSelection.handleMouseMove(x, y);
  }, [containerRef, timeSelection]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Prevent click events from propagating if we just finished dragging
    if (timeSelection.wasJustDragging()) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, [timeSelection]);

  // Factory functions for track and clip props
  const getTrackProps = useCallback((trackIndex: number) => ({
    onTrackClick: () => trackSelection.handleTrackClick(trackIndex),
  }), [trackSelection]);

  const getClipProps = useCallback((trackIndex: number) => ({
    onClipClick: (clipId: string | number) => clipSelection.handleClipClick(trackIndex, clipId),
  }), [clipSelection]);

  return {
    containerProps: {
      ref: containerRef,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onClick: handleClick,
      style: {
        cursor: timeSelection.cursorStyle,
      },
    },
    getTrackProps,
    getClipProps,
    selection: {
      isDragging: timeSelection.isDragging,
      cursorStyle: timeSelection.cursorStyle,
      wasJustDragging: timeSelection.wasJustDragging,
    },
  };
}
