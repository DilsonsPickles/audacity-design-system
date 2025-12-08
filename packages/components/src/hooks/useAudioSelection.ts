/**
 * useAudioSelection Hook
 *
 * Composite hook that combines time selection, track selection, and clip selection
 * into a single, easy-to-use interface for audio editing applications.
 */

import { RefObject, useCallback, useRef } from 'react';
import { TimeSelection, TimeSelectionConfig } from '@audacity-ui/core';
import { useTimeSelection } from './useTimeSelection';
import { useTrackSelection } from './useTrackSelection';
import { useClipSelection } from './useClipSelection';
import { useSpectralSelection, SpectralSelection } from './useSpectralSelection';

export interface UseAudioSelectionConfig extends TimeSelectionConfig {
  /** Ref to the container element */
  containerRef: RefObject<HTMLElement>;
  /** Current time selection (for edge detection and resizing) */
  currentTimeSelection: TimeSelection | null;
  /** Currently selected track indices (for preserving during resize) */
  currentSelectedTracks: number[];
  /** Current spectral selection */
  currentSpectralSelection?: SpectralSelection | null;
  /** Whether spectral selection is enabled (spectrogram mode) */
  spectrogramMode?: boolean;
  /** Clip header height for spectral selection */
  clipHeaderHeight?: number;
  /** Whether selection is enabled */
  enabled?: boolean;
  /** Edge detection threshold in pixels for resize handles */
  edgeThreshold?: number;
}

export interface UseAudioSelectionCallbacks {
  /** Called when time selection changes */
  onTimeSelectionChange: (selection: TimeSelection | null) => void;
  /** Called when time selection is finalized (on mouse up) */
  onTimeSelectionFinalized?: (selection: TimeSelection | null) => void;
  /** Called when selected tracks change */
  onSelectedTracksChange: (trackIndices: number[]) => void;
  /** Called when focused track changes */
  onFocusedTrackChange: (trackIndex: number | null) => void;
  /** Called when spectral selection changes */
  onSpectralSelectionChange?: (selection: SpectralSelection | null) => void;
  /** Called when spectral selection is finalized (on mouse up) */
  onSpectralSelectionFinalized?: (selection: SpectralSelection | null) => void;
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
    currentSpectralSelection = null,
    spectrogramMode = false,
    clipHeaderHeight = 20,
    enabled = true,
    edgeThreshold = 6,
    ...timeSelectionConfig
  } = config;

  // Extract these for the conversion callback
  const { pixelsPerSecond, leftPadding } = timeSelectionConfig;

  const {
    onTimeSelectionChange,
    onTimeSelectionFinalized,
    onSelectedTracksChange,
    onFocusedTrackChange,
    onSpectralSelectionChange,
    onSpectralSelectionFinalized,
    onTrackSelect,
    onClipSelect,
  } = callbacks;

  // Store the spectral selection and drag start position before converting to time selection
  // so we can restore it when converting back
  const preConversionSpectralSelectionRef = useRef<SpectralSelection | null>(null);
  const preConversionDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Track whether the current time selection came from leaving clip bounds
  // If true, prevent converting back to spectral when entering another clip
  const timeSelectionFromLeavingClipBoundsRef = useRef<boolean>(false);

  // Time selection hook (handles dragging and resizing)
  const timeSelection = useTimeSelection({
    containerRef,
    currentTimeSelection,
    currentSelectedTracks,
    ...timeSelectionConfig,
    onTimeSelectionChange,
    onTimeSelectionFinalized,
    onSelectedTracksChange,
    onFocusedTrackChange,
    onClearSpectralSelection: () => {
      if (onSpectralSelectionChange) {
        onSpectralSelectionChange(null);
      }
    },
    onConvertToSpectralSelection: (startTime: number, endTime: number, trackIndex: number, clipId: number, currentX: number, currentY: number): boolean => {
      // Check if we should allow conversion back to spectral
      // Only allow if:
      // 1. There's a pre-conversion spectral selection (dragging back into origin clip), OR
      // 2. Time selection was NOT created by leaving clip bounds (fresh time selection)
      const hasPreConversionState = preConversionSpectralSelectionRef.current && preConversionDragStartRef.current;
      const canConvertBack = hasPreConversionState || !timeSelectionFromLeavingClipBoundsRef.current;

      if (!canConvertBack) {
        // Time selection came from leaving clip bounds - don't convert when entering another clip
        return false;
      }

      // Restore the pre-conversion spectral selection if it exists
      if (hasPreConversionState) {
        // Check if we're re-entering the ORIGINAL clip
        const originalClipId = preConversionSpectralSelectionRef.current!.clipId;
        const originalTrackIndex = preConversionSpectralSelectionRef.current!.trackIndex;

        // Only restore if we're back in the original clip
        if (clipId === originalClipId && trackIndex === originalTrackIndex) {
          // Restore the spectral selection exactly as it was before conversion
          if (onSpectralSelectionChange) {
            onSpectralSelectionChange(preConversionSpectralSelectionRef.current);
          }

          // Clear the time selection
          onTimeSelectionChange(null);

          // Start dragging the spectral selection from the ORIGINAL drag start position
          // This ensures the anchor point stays fixed
          spectralSelection.startDrag(preConversionDragStartRef.current!.x, preConversionDragStartRef.current!.y);

          // Clear the stored references and flag
          preConversionSpectralSelectionRef.current = null;
          preConversionDragStartRef.current = null;
          timeSelectionFromLeavingClipBoundsRef.current = false;

          return true; // Conversion happened
        }
        // If entering a different clip, do nothing (stay as time selection)
        return false;
      } else {
        // Fresh time selection being converted - but only if track has spectral view enabled
        const track = timeSelectionConfig.tracks[trackIndex] as any;
        const hasSpectralView = track.viewMode === 'spectrogram' || track.viewMode === 'split';

        if (!hasSpectralView) {
          // Track doesn't support spectral selection - stay as time selection
          return false;
        }

        // Create new spectral selection with full frequency range
        if (onSpectralSelectionChange) {
          onSpectralSelectionChange({
            trackIndex,
            clipId,
            startTime,
            endTime,
            minFrequency: 0,
            maxFrequency: 1,
          });
        }

        // Clear the time selection
        onTimeSelectionChange(null);

        // Calculate which edge to anchor based on current position vs time bounds
        const startPixel = leftPadding + startTime * pixelsPerSecond;
        const endPixel = leftPadding + endTime * pixelsPerSecond;
        const distToStart = Math.abs(currentX - startPixel);
        const distToEnd = Math.abs(currentX - endPixel);

        // Start drag from the edge closest to current position
        // This allows the other edge to continue moving
        const dragStartX = distToStart < distToEnd ? startPixel : endPixel;

        // Start spectral selection drag from the anchored edge
        spectralSelection.startDrag(dragStartX, currentY);

        return true; // Conversion happened
      }
    },
    enabled,
    edgeThreshold,
    clipHeaderHeight,
    spectrogramMode,
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

  // Spectral selection hook (handles spectral selection in spectrogram mode)
  const spectralSelection = useSpectralSelection(
    {
      containerRef,
      currentSpectralSelection,
      tracks: timeSelectionConfig.tracks as any, // Track types are compatible at runtime
      pixelsPerSecond: timeSelectionConfig.pixelsPerSecond,
      leftPadding: timeSelectionConfig.leftPadding,
      defaultTrackHeight: timeSelectionConfig.defaultTrackHeight,
      trackGap: timeSelectionConfig.trackGap,
      initialGap: timeSelectionConfig.initialGap,
      clipHeaderHeight,
      enabled: spectrogramMode && enabled,
    },
    {
      onSpectralSelectionChange: onSpectralSelectionChange || (() => {}),
      onSpectralSelectionFinalized,
      onClearTimeSelection: () => {
        onTimeSelectionChange(null);
      },
      onConvertToTimeSelection: (startTime: number, endTime: number, trackIndices: number[], currentX: number, currentY: number, dragStartX: number, dragStartY: number) => {
        // Store the current spectral selection and drag start position before converting
        // so we can restore it if the user drags back into the clip
        preConversionSpectralSelectionRef.current = currentSpectralSelection;
        preConversionDragStartRef.current = { x: dragStartX, y: dragStartY };

        // Mark that this time selection came from leaving clip bounds
        // This prevents it from converting back to spectral when entering a different clip
        timeSelectionFromLeavingClipBoundsRef.current = true;

        // Normalize the times (startTime might be > endTime if dragging left)
        const normalizedStartTime = Math.min(startTime, endTime);
        const normalizedEndTime = Math.max(startTime, endTime);

        // Create a time selection from the spectral selection bounds
        onTimeSelectionChange({ startTime: normalizedStartTime, endTime: normalizedEndTime });
        // Update selected tracks
        onSelectedTracksChange(trackIndices);
        // Clear the spectral selection (this will make spectralSelection.isDragging become false)
        if (onSpectralSelectionChange) {
          onSpectralSelectionChange(null);
        }

        // Determine which edge to anchor based on the DRAG START position (not normalized times)
        // The drag start position tells us which edge the user originally clicked
        const dragStartPixel = dragStartX;

        // If startTime < endTime, user dragged right, so anchor at startTime (dragStartX position)
        // If startTime > endTime, user dragged left, so anchor at endTime (dragStartX position)
        // In both cases, we anchor at dragStartX because that's where they started
        const anchorEdgeX = dragStartPixel;

        // Start a time selection resize drag from the anchored edge
        // This will make the time selection resize from the correct edge
        // Pass true to allow conversion back to spectral (since this came from spectral)
        timeSelection.startDrag(anchorEdgeX, dragStartY, true);
      },
    }
  );

  // Mouse event handlers for the container
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    console.log('[handleMouseDown] spectrogramMode:', spectrogramMode);

    // If in spectrogram mode, check if position is on a spectral-enabled clip
    // before attempting spectral selection
    if (spectrogramMode) {
      const isOnSpectralClip = spectralSelection.isPositionOnSpectralClip(x, y);
      console.log('[handleMouseDown] isOnSpectralClip:', isOnSpectralClip);

      if (isOnSpectralClip) {
        const didStart = spectralSelection.startDrag(x, y);
        console.log('[handleMouseDown] spectral didStart:', didStart);
        if (didStart) return; // If spectral selection started, don't start time selection
      }
    }

    // Otherwise, use time selection
    console.log('[handleMouseDown] starting time selection');
    timeSelection.startDrag(x, y);
  }, [containerRef, spectrogramMode, spectralSelection, timeSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If spectral selection is active, update it
    if (spectralSelection.isDragging) {
      spectralSelection.handleMouseMove(x, y);
      return;
    }

    // If in spectrogram mode and not dragging, update cursor for spectral selection
    // but only if the cursor is over a spectral-enabled clip
    if (spectrogramMode && !spectralSelection.isDragging && !timeSelection.isDragging && spectralSelection.isPositionOnSpectralClip(x, y)) {
      spectralSelection.updateCursor(x, y);
    }

    // Otherwise, update time selection
    timeSelection.handleMouseMove(x, y);
  }, [containerRef, spectrogramMode, spectralSelection, timeSelection]);

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

  // Determine cursor style based on mode
  const currentCursor = spectrogramMode && spectralSelection.cursorStyle !== 'default'
    ? spectralSelection.cursorStyle
    : timeSelection.cursorStyle;

  return {
    containerProps: {
      ref: containerRef,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onClick: handleClick,
      style: {
        cursor: currentCursor,
      },
    },
    getTrackProps,
    getClipProps,
    selection: {
      isDragging: timeSelection.isDragging || spectralSelection.isDragging,
      cursorStyle: currentCursor,
      wasJustDragging: timeSelection.wasJustDragging,
    },
  };
}
