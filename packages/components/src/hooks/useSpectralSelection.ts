/**
 * useSpectralSelection Hook
 *
 * Manages spectral (frequency-range) selection interactions within clips
 * in spectrogram mode. Handles creating and resizing spectral selections.
 *
 * Coordinate System:
 * - Clips are positioned at `clip.start * pixelsPerSecond` (NO leftPadding)
 * - Mouse X/Y are relative to canvas container (matches clip positioning)
 * - All boundary checks must use the same coordinate system
 * - See Track.tsx:118 for clip rendering reference
 */

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

export interface SpectralSelection {
  trackIndex: number;
  clipId: number;
  startTime: number;
  endTime: number;
  minFrequency: number; // 0-1 (normalized)
  maxFrequency: number; // 0-1 (normalized)
}

interface SpectralTrack {
  id: number;
  clips: SpectralClip[];
  height?: number;
  viewMode?: 'waveform' | 'spectrogram' | 'split';
}

interface SpectralClip {
  id: number;
  start: number;
  duration: number;
}

export interface UseSpectralSelectionConfig {
  /** Ref to the container element */
  containerRef: RefObject<HTMLElement>;
  /** Current spectral selection */
  currentSpectralSelection: SpectralSelection | null;
  /** Tracks data */
  tracks: SpectralTrack[];
  /** Pixels per second - zoom level */
  pixelsPerSecond: number;
  /** Left padding in pixels */
  leftPadding: number;
  /** Default track height */
  defaultTrackHeight: number;
  /** Track gap in pixels */
  trackGap: number;
  /** Initial gap at top */
  initialGap: number;
  /** Clip header height */
  clipHeaderHeight: number;
  /** Whether spectral selection is enabled (should be spectrogramMode) */
  enabled: boolean;
}

export interface UseSpectralSelectionCallbacks {
  /** Called when spectral selection changes */
  onSpectralSelectionChange: (selection: SpectralSelection | null) => void;
  /** Called when spectral selection is finalized (on mouse up) */
  onSpectralSelectionFinalized?: (selection: SpectralSelection | null) => void;
  /** Callback to clear time selection when spectral selection starts */
  onClearTimeSelection?: () => void;
  /** Callback to convert spectral selection to time selection when dragged out of bounds */
  onConvertToTimeSelection?: (startTime: number, endTime: number, trackIndices: number[], currentX: number, currentY: number, dragStartX: number, dragStartY: number) => void;
}

type ResizeMode =
  | 'create'
  | 'move'
  | 'resize-left'
  | 'resize-right'
  | 'resize-top'
  | 'resize-bottom'
  | 'resize-tl'
  | 'resize-tr'
  | 'resize-bl'
  | 'resize-br';

interface DragState {
  isDragging: boolean;
  mode: ResizeMode;
  trackIndex: number;
  clipId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  initialSelection: SpectralSelection | null;
}

/**
 * Hook for managing spectral selection interactions
 */
export function useSpectralSelection(
  config: UseSpectralSelectionConfig,
  callbacks: UseSpectralSelectionCallbacks
) {
  const {
    containerRef,
    currentSpectralSelection,
    tracks,
    pixelsPerSecond,
    leftPadding,
    defaultTrackHeight,
    trackGap,
    initialGap,
    clipHeaderHeight,
    enabled,
  } = config;

  const { onSpectralSelectionChange, onSpectralSelectionFinalized, onClearTimeSelection, onConvertToTimeSelection } = callbacks;

  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorStyle, setCursorStyle] = useState('default');

  /**
   * Check if a position is within a clip that supports spectral selection
   * Returns true if position is on a clip with spectrogram or split view
   */
  const isPositionOnSpectralClip = useCallback((x: number, y: number): boolean => {
    let currentY = initialGap;

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackHeight = track.height || defaultTrackHeight;
      const clipBodyY = currentY + clipHeaderHeight;
      const clipBodyHeight = trackHeight - clipHeaderHeight;

      // Check if Y is within this track's clip body area
      if (y >= clipBodyY && y < clipBodyY + clipBodyHeight) {
        console.log(`[isPositionOnSpectralClip] Track ${trackIndex} viewMode:`, track.viewMode, 'y:', y, 'clipBodyY:', clipBodyY);

        // Check if track has spectral view enabled
        if (track.viewMode !== 'spectrogram' && track.viewMode !== 'split') {
          console.log(`[isPositionOnSpectralClip] Track ${trackIndex} is waveform, returning false`);
          return false; // Track doesn't support spectral selection
        }

        // For split view, check if click is in spectral area (top half)
        if (track.viewMode === 'split') {
          const splitY = clipBodyY + clipBodyHeight / 2;
          if (y > splitY) {
            console.log(`[isPositionOnSpectralClip] Click in waveform area of split view, returning false`);
            return false; // Click in waveform area of split view
          }
        }

        // Check if X is within any clip in this track
        for (const clip of track.clips) {
          // NOTE: leftPadding is NOT used here because clips are positioned without it
          // (see coordinate system note at top of file)
          const clipStartX = clip.start * pixelsPerSecond;
          const clipEndX = clipStartX + clip.duration * pixelsPerSecond;

          if (x >= clipStartX && x <= clipEndX) {
            console.log(`[isPositionOnSpectralClip] Found spectral clip, returning true`);
            return true; // Position is on a spectral-enabled clip
          }
        }

        console.log(`[isPositionOnSpectralClip] In track but not on clip, returning false`);
        return false; // Position is in track but not on a clip
      }

      currentY += trackHeight + trackGap;
    }

    console.log(`[isPositionOnSpectralClip] Not in any track, returning false`);
    return false; // Position not in any track
  }, [tracks, pixelsPerSecond, defaultTrackHeight, trackGap, initialGap, clipHeaderHeight]);

  const EDGE_THRESHOLD = 6; // pixels from edge to detect resize
  const CORNER_SIZE = 6; // size of corner handle areas

  /**
   * Find which clip (if any) is at the given position
   * For split view, only returns clip if position is in spectral area (top half)
   */
  const findClipAtPosition = useCallback((x: number, y: number): { trackIndex: number; clip: SpectralClip } | null => {
    let currentY = initialGap;

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackHeight = track.height || defaultTrackHeight;

      // Check if y is within this track
      if (y >= currentY && y < currentY + trackHeight) {
        // Check each clip in this track
        for (const clip of track.clips) {
          // NOTE: Clips are rendered WITHOUT leftPadding (see Track.tsx line 118)
          const clipStartX = clip.start * pixelsPerSecond;
          const clipEndX = clipStartX + clip.duration * pixelsPerSecond;
          const clipBodyY = currentY + clipHeaderHeight;
          const clipBodyHeight = trackHeight - clipHeaderHeight;

          // Check if position is within clip body (not header)
          if (
            x >= clipStartX &&
            x <= clipEndX &&
            y >= clipBodyY &&
            y < clipBodyY + clipBodyHeight
          ) {
            // Only create spectral selection if track has spectral view enabled
            // (either 'spectrogram' or 'split' view mode)
            if (track.viewMode !== 'spectrogram' && track.viewMode !== 'split') {
              // Track is in waveform mode - don't create spectral selection
              return null;
            }

            // For split view, only allow spectral selection in top half (spectrogram area)
            if (track.viewMode === 'split') {
              const splitY = clipBodyY + clipBodyHeight / 2;
              if (y > splitY) {
                // Click was in bottom half (waveform area) - don't create spectral selection
                return null;
              }
            }
            return { trackIndex, clip };
          }
        }
      }

      currentY += trackHeight + trackGap;
    }

    return null;
  }, [tracks, pixelsPerSecond, defaultTrackHeight, trackGap, initialGap, clipHeaderHeight]);

  /**
   * Check if Y position is outside the clip body bounds (in pixel space)
   * For split view, only the top half (spectrogram area) is valid
   */
  const isYOutsideClipBounds = useCallback((y: number, trackIndex: number): boolean => {
    let trackY = initialGap;
    for (let i = 0; i < trackIndex; i++) {
      trackY += (tracks[i].height || defaultTrackHeight) + trackGap;
    }

    const track = tracks[trackIndex];
    const trackHeight = track.height || defaultTrackHeight;
    const clipBodyY = trackY + clipHeaderHeight;
    const clipBodyHeight = trackHeight - clipHeaderHeight;

    // Check if Y is above or below the clip body
    if (y < clipBodyY || y > clipBodyY + clipBodyHeight) {
      return true;
    }

    // In split view, spectral selection is only valid in top half (spectrogram area)
    if (track.viewMode === 'split') {
      const splitY = clipBodyY + clipBodyHeight / 2;
      return y > splitY; // Below the split line = outside spectral area
    }

    return false;
  }, [tracks, defaultTrackHeight, trackGap, initialGap, clipHeaderHeight]);

  /**
   * Check if X position is outside the clip bounds (in pixel space)
   * This matches the Y boundary check - no hysteresis, immediate detection
   */
  const isXOutsideClipBounds = useCallback((x: number, trackIndex: number, clipId: number): boolean => {
    const track = tracks[trackIndex];
    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return true;

    // NOTE: Clips are rendered WITHOUT leftPadding (see Track.tsx line 118)
    // Mouse X is relative to the canvas container, same coordinate system
    const clipStartX = clip.start * pixelsPerSecond;
    const clipEndX = clipStartX + clip.duration * pixelsPerSecond;

    // Check if X is left or right of the clip (exact pixel match, no buffer)
    return x < clipStartX || x > clipEndX;
  }, [tracks, pixelsPerSecond]);

  /**
   * Convert Y position within clip body to normalized frequency (0-1)
   * In split view, only uses the top half (spectrogram area)
   */
  const yToFrequency = useCallback((y: number, trackIndex: number): number => {
    let trackY = initialGap;
    for (let i = 0; i < trackIndex; i++) {
      trackY += (tracks[i].height || defaultTrackHeight) + trackGap;
    }

    const track = tracks[trackIndex];
    const trackHeight = track.height || defaultTrackHeight;
    const clipBodyY = trackY + clipHeaderHeight;
    const clipBodyHeight = trackHeight - clipHeaderHeight;

    // In split view, only use top half for frequency calculation
    const spectralAreaHeight = track.viewMode === 'split' ? clipBodyHeight / 2 : clipBodyHeight;
    const spectralAreaTop = clipBodyY;

    // Y position within spectral area (0 = top, spectralAreaHeight = bottom)
    const yInSpectralArea = y - spectralAreaTop;

    // Normalize to 0-1, then invert (0 = bottom/low freq, 1 = top/high freq)
    const frequency = 1 - (yInSpectralArea / spectralAreaHeight);

    return Math.max(0, Math.min(1, frequency));
  }, [tracks, defaultTrackHeight, trackGap, initialGap, clipHeaderHeight]);

  /**
   * Convert X position to time
   */
  const xToTime = useCallback((x: number): number => {
    return (x - leftPadding) / pixelsPerSecond;
  }, [leftPadding, pixelsPerSecond]);

  /**
   * Convert time to X position
   */
  const timeToX = useCallback((time: number): number => {
    return leftPadding + time * pixelsPerSecond;
  }, [leftPadding, pixelsPerSecond]);

  /**
   * Convert normalized frequency to Y position
   * In split view, only uses the top half (spectrogram area)
   */
  const frequencyToY = useCallback((frequency: number, trackIndex: number): number => {
    let trackY = initialGap;
    for (let i = 0; i < trackIndex; i++) {
      trackY += (tracks[i].height || defaultTrackHeight) + trackGap;
    }

    const track = tracks[trackIndex];
    const trackHeight = track.height || defaultTrackHeight;
    const clipBodyY = trackY + clipHeaderHeight;
    const clipBodyHeight = trackHeight - clipHeaderHeight;

    // In split view, only use top half for frequency positioning
    const spectralAreaHeight = track.viewMode === 'split' ? clipBodyHeight / 2 : clipBodyHeight;
    const spectralAreaTop = clipBodyY;

    // Invert: 1 = top, 0 = bottom
    const yInSpectralArea = (1 - frequency) * spectralAreaHeight;

    return spectralAreaTop + yInSpectralArea;
  }, [tracks, defaultTrackHeight, trackGap, initialGap, clipHeaderHeight]);

  /**
   * Detect resize mode based on position relative to current selection
   */
  const detectResizeMode = useCallback((x: number, y: number): ResizeMode | null => {
    if (!currentSpectralSelection) return null;

    const { trackIndex, startTime, endTime, minFrequency, maxFrequency } = currentSpectralSelection;

    // Convert selection bounds to pixel coordinates
    const leftX = timeToX(startTime);
    const rightX = timeToX(endTime);
    const topY = frequencyToY(maxFrequency, trackIndex);
    const bottomY = frequencyToY(minFrequency, trackIndex);

    // Check if position is within selection bounds (with some tolerance)
    const withinX = x >= leftX - EDGE_THRESHOLD && x <= rightX + EDGE_THRESHOLD;
    const withinY = y >= topY - EDGE_THRESHOLD && y <= bottomY + EDGE_THRESHOLD;

    if (!withinX || !withinY) return null;

    // Check corners first (priority over edges)
    const onLeft = Math.abs(x - leftX) <= CORNER_SIZE;
    const onRight = Math.abs(x - rightX) <= CORNER_SIZE;
    const onTop = Math.abs(y - topY) <= CORNER_SIZE;
    const onBottom = Math.abs(y - bottomY) <= CORNER_SIZE;

    if (onLeft && onTop) return 'resize-tl';
    if (onRight && onTop) return 'resize-tr';
    if (onLeft && onBottom) return 'resize-bl';
    if (onRight && onBottom) return 'resize-br';

    // Check center line (horizontal line at middle of selection)
    const centerY = (topY + bottomY) / 2;
    const nearCenterLine = Math.abs(y - centerY) <= EDGE_THRESHOLD;
    const insideX = x >= leftX + EDGE_THRESHOLD && x <= rightX - EDGE_THRESHOLD;

    if (nearCenterLine && insideX) return 'move';

    // Check edges
    const nearLeft = Math.abs(x - leftX) <= EDGE_THRESHOLD;
    const nearRight = Math.abs(x - rightX) <= EDGE_THRESHOLD;
    const nearTop = Math.abs(y - topY) <= EDGE_THRESHOLD;
    const nearBottom = Math.abs(y - bottomY) <= EDGE_THRESHOLD;

    if (nearLeft) return 'resize-left';
    if (nearRight) return 'resize-right';
    if (nearTop) return 'resize-top';
    if (nearBottom) return 'resize-bottom';

    return null;
  }, [currentSpectralSelection, timeToX, frequencyToY, EDGE_THRESHOLD, CORNER_SIZE]);

  /**
   * Get cursor style based on resize mode
   */
  const getCursorForMode = useCallback((mode: ResizeMode | null): string => {
    if (!mode) return 'default';

    switch (mode) {
      case 'move':
        return 'move';
      case 'resize-left':
      case 'resize-right':
        return 'ew-resize';
      case 'resize-top':
      case 'resize-bottom':
        return 'ns-resize';
      case 'resize-tl':
      case 'resize-br':
        return 'nwse-resize';
      case 'resize-tr':
      case 'resize-bl':
        return 'nesw-resize';
      default:
        return 'default';
    }
  }, []);

  /**
   * Start spectral selection drag
   * @returns true if drag started, false otherwise
   */
  const startDrag = useCallback((x: number, y: number): boolean => {
    if (!enabled) return false;

    // First check if we're resizing an existing selection
    const resizeMode = detectResizeMode(x, y);
    if (resizeMode && currentSpectralSelection) {
      dragStateRef.current = {
        isDragging: true,
        mode: resizeMode,
        trackIndex: currentSpectralSelection.trackIndex,
        clipId: currentSpectralSelection.clipId,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        initialSelection: { ...currentSpectralSelection },
      };
      setIsDragging(true);
      return true;
    }

    // Otherwise, start creating a new selection
    const clipAtPosition = findClipAtPosition(x, y);
    if (!clipAtPosition) return false;

    const { trackIndex, clip } = clipAtPosition;

    dragStateRef.current = {
      isDragging: true,
      mode: 'create',
      trackIndex,
      clipId: clip.id,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      initialSelection: null,
    };

    // Clear any existing time selection when creating new spectral selection
    if (onClearTimeSelection) {
      onClearTimeSelection();
    }

    setIsDragging(true);
    return true;
  }, [enabled, detectResizeMode, currentSpectralSelection, findClipAtPosition, onClearTimeSelection]);

  /**
   * Update spectral selection during drag
   */
  const handleMouseMove = useCallback((x: number, y: number) => {
    if (!dragStateRef.current?.isDragging) return;

    dragStateRef.current.currentX = x;
    dragStateRef.current.currentY = y;

    const { trackIndex, clipId, startX, startY, mode, initialSelection } = dragStateRef.current;

    if (mode === 'create') {
      // Creating new selection
      // Check if mouse is outside clip bounds (pixel-space check)
      const currentYOutside = isYOutsideClipBounds(y, trackIndex);
      const currentXOutside = isXOutsideClipBounds(x, trackIndex, clipId);

      // Calculate raw times (preserve direction for anchor calculation)
      const rawStartTime = xToTime(startX);
      const rawEndTime = xToTime(x);

      // Convert to time selection if mouse cursor leaves the clip boundary
      if (onConvertToTimeSelection && (currentYOutside || currentXOutside)) {
        // Clear spectral selection FIRST to prevent visual artifact
        onSpectralSelectionChange(null);
        // Clear drag state immediately
        dragStateRef.current = null;
        setIsDragging(false);
        // Pass RAW times (not normalized) so the time selection hook can determine anchor edge correctly
        onConvertToTimeSelection(rawStartTime, rawEndTime, [trackIndex], x, y, startX, startY);
        return;
      }

      // Normalized times for rendering the selection (only used when inside clip)
      const startTime = Math.min(rawStartTime, rawEndTime);
      const endTime = Math.max(rawStartTime, rawEndTime);

      // Convert Y positions to frequencies (automatically clamped to clip bounds)
      const freq1 = yToFrequency(startY, trackIndex);
      const freq2 = yToFrequency(y, trackIndex);
      const minFrequency = Math.min(freq1, freq2);
      const maxFrequency = Math.max(freq1, freq2);

      onSpectralSelectionChange({
        trackIndex,
        clipId,
        startTime,
        endTime,
        minFrequency,
        maxFrequency,
      });
    } else if (initialSelection) {
      // Resizing existing selection
      let startTime = initialSelection.startTime;
      let endTime = initialSelection.endTime;
      let minFrequency = initialSelection.minFrequency;
      let maxFrequency = initialSelection.maxFrequency;

      const currentTime = xToTime(x);

      // Check if Y is outside clip bounds (pixel-space check) BEFORE converting to frequency
      const yOutsideBounds = isYOutsideClipBounds(y, trackIndex);

      // Check if X is outside clip bounds (pixel-space check)
      const xOutsideBounds = isXOutsideClipBounds(x, trackIndex, clipId);

      const currentFreq = yToFrequency(y, trackIndex);

      // Calculate center frequency for inverse resizing
      const centerFreq = (initialSelection.minFrequency + initialSelection.maxFrequency) / 2;

      // Update based on resize mode
      switch (mode) {
        case 'move':
          // Move entire selection both horizontally and vertically
          const deltaTime = currentTime - xToTime(startX);
          startTime = initialSelection.startTime + deltaTime;
          endTime = initialSelection.endTime + deltaTime;

          const startYFreq = yToFrequency(startY, trackIndex);
          const deltaFreq = currentFreq - startYFreq;
          minFrequency = initialSelection.minFrequency + deltaFreq;
          maxFrequency = initialSelection.maxFrequency + deltaFreq;

          // Clamp frequencies to allow user to select full range
          minFrequency = Math.max(0, Math.min(1, minFrequency));
          maxFrequency = Math.max(0, Math.min(1, maxFrequency));

          // Check if moved beyond clip bounds (vertical or horizontal)
          if (onConvertToTimeSelection && (yOutsideBounds || xOutsideBounds)) {
            onConvertToTimeSelection(startTime, endTime, [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-left':
          startTime = currentTime;

          // Check if dragged beyond bounds (pixel-space check)
          if (onConvertToTimeSelection && xOutsideBounds) {
            onConvertToTimeSelection(Math.min(startTime, initialSelection.endTime), Math.max(startTime, initialSelection.endTime), [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-right':
          endTime = currentTime;

          // Check if dragged beyond bounds (pixel-space check)
          if (onConvertToTimeSelection && xOutsideBounds) {
            onConvertToTimeSelection(Math.min(endTime, initialSelection.startTime), Math.max(endTime, initialSelection.startTime), [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-top':
          // Move top edge and bottom edge inversely around center
          const topDelta = currentFreq - initialSelection.maxFrequency;
          maxFrequency = currentFreq;
          minFrequency = initialSelection.minFrequency - topDelta;

          // Convert if mouse leaves clip bounds vertically
          if (onConvertToTimeSelection && yOutsideBounds) {
            onConvertToTimeSelection(startTime, endTime, [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-bottom':
          // Move bottom edge and top edge inversely around center
          const bottomDelta = currentFreq - initialSelection.minFrequency;
          minFrequency = currentFreq;
          maxFrequency = initialSelection.maxFrequency - bottomDelta;

          // Convert if mouse leaves clip bounds vertically
          if (onConvertToTimeSelection && yOutsideBounds) {
            onConvertToTimeSelection(startTime, endTime, [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-tl':
          // Corner resize - only resize the edges being dragged
          startTime = currentTime;
          maxFrequency = currentFreq;

          // Check if dragged beyond clip bounds (vertical or horizontal)
          if (onConvertToTimeSelection && (yOutsideBounds || xOutsideBounds)) {
            onConvertToTimeSelection(Math.min(startTime, initialSelection.endTime), Math.max(startTime, initialSelection.endTime), [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-tr':
          // Corner resize - only resize the edges being dragged
          endTime = currentTime;
          maxFrequency = currentFreq;

          // Check if dragged beyond clip bounds (vertical or horizontal)
          if (onConvertToTimeSelection && (yOutsideBounds || xOutsideBounds)) {
            onConvertToTimeSelection(Math.min(endTime, initialSelection.startTime), Math.max(endTime, initialSelection.startTime), [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-bl':
          // Corner resize - only resize the edges being dragged
          startTime = currentTime;
          minFrequency = currentFreq;

          // Check if dragged beyond clip bounds (vertical or horizontal)
          if (onConvertToTimeSelection && (yOutsideBounds || xOutsideBounds)) {
            onConvertToTimeSelection(Math.min(startTime, initialSelection.endTime), Math.max(startTime, initialSelection.endTime), [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
        case 'resize-br':
          // Corner resize - only resize the edges being dragged
          endTime = currentTime;
          minFrequency = currentFreq;

          // Check if dragged beyond clip bounds (vertical or horizontal)
          if (onConvertToTimeSelection && (yOutsideBounds || xOutsideBounds)) {
            onConvertToTimeSelection(Math.min(endTime, initialSelection.startTime), Math.max(endTime, initialSelection.startTime), [trackIndex], x, y, startX, startY);
            onSpectralSelectionChange(null);
            dragStateRef.current = null;
            setIsDragging(false);
            return;
          }
          break;
      }

      // Clamp frequencies to 0-1 range
      minFrequency = Math.max(0, Math.min(1, minFrequency));
      maxFrequency = Math.max(0, Math.min(1, maxFrequency));

      // Ensure proper ordering
      if (startTime > endTime) {
        [startTime, endTime] = [endTime, startTime];
      }
      if (minFrequency > maxFrequency) {
        [minFrequency, maxFrequency] = [maxFrequency, minFrequency];
      }

      onSpectralSelectionChange({
        trackIndex,
        clipId,
        startTime,
        endTime,
        minFrequency,
        maxFrequency,
      });
    }
  }, [xToTime, yToFrequency, isYOutsideClipBounds, isXOutsideClipBounds, onSpectralSelectionChange, onConvertToTimeSelection]);

  /**
   * Update cursor based on hover position (for when not dragging)
   */
  const updateCursor = useCallback((x: number, y: number) => {
    if (isDragging) return;

    const resizeMode = detectResizeMode(x, y);
    const cursor = getCursorForMode(resizeMode);
    setCursorStyle(cursor);
  }, [isDragging, detectResizeMode, getCursorForMode]);

  /**
   * End spectral selection drag
   */
  const endDrag = useCallback(() => {
    if (dragStateRef.current?.isDragging) {
      dragStateRef.current = null;
      setIsDragging(false);

      // Notify that selection is finalized
      if (onSpectralSelectionFinalized) {
        onSpectralSelectionFinalized(currentSpectralSelection);
      }
    }
  }, [currentSpectralSelection, onSpectralSelectionFinalized]);

  // Add global mouse up listener to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      endDrag();
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, endDrag]);

  return {
    startDrag,
    handleMouseMove,
    updateCursor,
    endDrag,
    isDragging,
    cursorStyle,
    isPositionOnSpectralClip,
  };
}
