import React, { useRef, useEffect, useState } from 'react';
import { TrackNew, useAudioSelection, SpectralSelectionOverlay, CLIP_CONTENT_OFFSET, useAccessibilityProfile, useTheme } from '@audacity-ui/components';
import { ENVELOPE_POINT_STYLES, type EnvelopePointStyleKey } from '@audacity-ui/core';
import { useTracksState, useTracksDispatch } from '../contexts/TracksContext';
import { useSpectralSelection } from '../contexts/SpectralSelectionContext';
import { usePreferences } from '@audacity-ui/components';
import { useClipDragging } from '../hooks/useClipDragging';
import { useClipTrimming } from '../hooks/useClipTrimming';
import { useLabelDragging } from '../hooks/useLabelDragging';
import { useClipMouseDown } from '../hooks/useClipMouseDown';
import { useContainerClick } from '../hooks/useContainerClick';
import { LabelRenderer } from './LabelRenderer';
import { calculateTrackYOffset } from '../utils/trackLayout';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT, CLIP_HEADER_HEIGHT } from '../constants/canvas';
import './Canvas.css';

export interface CanvasProps {
  /**
   * Width of the canvas in pixels
   */
  width?: number;
  /**
   * Pixels per second - zoom level
   * @default 100
   */
  pixelsPerSecond?: number;
  /**
   * Background color of the canvas
   * @default theme.background.surface.default
   */
  backgroundColor?: string;
  /**
   * Left padding in pixels (for alignment with ruler)
   * @default 0
   */
  leftPadding?: number;
  /**
   * Callback when clip menu button is clicked
   */
  onClipMenuClick?: (clipId: number, trackIndex: number, x: number, y: number, openedViaKeyboard?: boolean) => void;
  /**
   * Callback when time selection context menu is requested
   */
  onTimeSelectionMenuClick?: (x: number, y: number) => void;
  /**
   * Callback when track keyboard focus changes
   */
  onTrackFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  /**
   * Index of track that currently has keyboard focus (for showing focus borders)
   */
  keyboardFocusedTrack?: number | null;
  /**
   * Callback when canvas height changes
   */
  onHeightChange?: (height: number) => void;
  /**
   * Whether to show RMS waveform overlay
   * @default true
   */
  showRmsInWaveform?: boolean;
  /**
   * Control point style for envelope points
   * @default 'default'
   */
  controlPointStyle?: EnvelopePointStyleKey;
  /**
   * Viewport height for calculating buffer space below last track
   * @default 0
   */
  viewportHeight?: number;
  /**
   * ID of the clip currently being recorded (shows recording state)
   */
  recordingClipId?: number | null;
  /**
   * Selection anchor for Shift+Click/Arrow range selection
   */
  selectionAnchor?: number | null;
  /**
   * Setter for selection anchor
   */
  setSelectionAnchor?: (anchor: number | null) => void;
  /**
   * Beats per minute for beat/measure grid lines
   * @default 120
   */
  bpm?: number;
  /**
   * Beats per measure for grid lines
   * @default 4
   */
  beatsPerMeasure?: number;
  /**
   * Time format — controls whether grid lines use beats/measures or minutes/seconds
   * @default 'beats-measures'
   */
  timeFormat?: 'minutes-seconds' | 'beats-measures';
}

/**
 * Canvas component for rendering audio tracks and clips
 * - Displays tracks with their clips using Track components
 * - Handles track and clip selection
 * - Supports scrolling and zooming
 */
export function Canvas({
  width = 5000,
  pixelsPerSecond = 100,
  backgroundColor,
  leftPadding = 0,
  onHeightChange,
  onClipMenuClick,
  onTimeSelectionMenuClick,
  onTrackFocusChange,
  keyboardFocusedTrack = null,
  showRmsInWaveform = true,
  controlPointStyle = 'default',
  viewportHeight = 0,
  recordingClipId = null,
  selectionAnchor = null,
  setSelectionAnchor,
  bpm = 120,
  beatsPerMeasure = 4,
  timeFormat = 'beats-measures',
}: CanvasProps) {
  const { theme } = useTheme();
  const { preferences } = usePreferences();
  const { tracks, selectedTrackIndices, selectedLabelIds, timeSelection, spectrogramMode, envelopeMode, focusedTrackIndex } = useTracksState();
  const { spectralSelection, setSpectralSelection } = useSpectralSelection();
  const dispatch = useTracksDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouseButtonRef = useRef<number>(0);
  const { activeProfile } = useAccessibilityProfile();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';

  // Use theme token as default if not provided
  const bgColor = backgroundColor ?? theme.background.canvas.default;

  // Get envelope control point sizes from the selected profile
  const envelopePointSizes = React.useMemo(() => {
    const profile = ENVELOPE_POINT_STYLES[controlPointStyle];
    return {
      outerRadius: profile.outerRadius,
      innerRadius: profile.innerRadius,
      outerRadiusHover: profile.outerRadiusHover,
      innerRadiusHover: profile.innerRadiusHover,
      lineWidth: profile.lineWidth,
      dualRingHover: profile.dualRingHover,
      solidCircle: profile.solidCircle,
      hoverRingColor: profile.hoverRingColor,
      hoverRingStrokeColor: profile.hoverRingStrokeColor,
      showWhiteOutlineOnHover: profile.showWhiteOutlineOnHover ?? false,
      showBlackOutlineOnHover: profile.showBlackOutlineOnHover ?? false,
      showBlackCenterOnHover: profile.showBlackCenterOnHover ?? false,
      showGreenCenterFillOnHover: profile.showGreenCenterFillOnHover,
      whiteCenterOnHover: profile.whiteCenterOnHover,
      whiteCenter: profile.whiteCenter,
      dualStrokeLine: profile.dualStrokeLine,
      lineColor: profile.lineColor,
    };
  }, [controlPointStyle]);


  // Track hovered ear for hover effects
  const [hoveredEar, setHoveredEar] = useState<string | null>(null);

  // Track hovered label banner for hover effects
  const [hoveredBanner, setHoveredBanner] = useState<string | null>(null);

  // RAF batching for spectral selection updates (performance optimization)
  const spectralSelectionRAFRef = useRef<number | null>(null);
  const pendingSpectralSelectionRef = useRef<typeof spectralSelection>(null);

  // Track if we just selected a clip on mouse down to prevent immediate deselection on click
  const justSelectedOnMouseDownRef = useRef(false);

  // Clip dragging - extracted to custom hook
  const {
    clipDragStateRef,
    didDragRef,
  } = useClipDragging({
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
    topGap: TOP_GAP,
    trackGap: TRACK_GAP,
    defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
  });

  // Clip trimming - extracted to custom hook
  const {
    clipTrimStateRef,
  } = useClipTrimming({
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
  });

  // Label dragging - extracted to custom hook (handles mouseup internally)
  useLabelDragging({
    containerRef,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
  });

  // Calculate total height based on all tracks + 2px gaps (top + between tracks) + buffer space below
  const tracksHeight = tracks.reduce((sum, track) => sum + (track.height || DEFAULT_TRACK_HEIGHT), 0) + TOP_GAP + (TRACK_GAP * (tracks.length - 1));
  const bufferSpace = viewportHeight * 0.5; // 50% of viewport height for buffer below last track
  const totalHeight = tracksHeight + bufferSpace;

  // Notify parent when height changes
  useEffect(() => {
    onHeightChange?.(totalHeight);
  }, [totalHeight, onHeightChange]);

  // Check if any track has spectrogram or split view enabled
  const hasSpectralView = spectrogramMode || tracks.some(track =>
    track.viewMode === 'spectrogram' || track.viewMode === 'split'
  );

  // Setup audio selection (composite hook for time, track, clip, and spectral selection)
  const selection = useAudioSelection(
    {
      containerRef,
      currentTimeSelection: timeSelection,
      currentSelectedTracks: selectedTrackIndices,
      currentSpectralSelection: spectralSelection,
      spectrogramMode: hasSpectralView,
      clipHeaderHeight: 20,
      pixelsPerSecond,
      leftPadding,  // Use leftPadding for alignment with playhead
      tracks: tracks as any, // Type cast to handle local vs core type mismatch
      defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
      trackGap: TRACK_GAP,
      initialGap: TOP_GAP,
    },
    {
      onTimeSelectionChange: (sel) => {
        dispatch({ type: 'SET_TIME_SELECTION', payload: sel });
        // Deselect all clips when making a time selection
        if (sel) {
          dispatch({ type: 'DESELECT_ALL_CLIPS' });
        }
      },
      onTimeSelectionFinalized: (sel) => {
        if (sel) {
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
        }
      },
      onSelectedTracksChange: (trackIndices) => dispatch({ type: 'SET_SELECTED_TRACKS', payload: trackIndices }),
      onFocusedTrackChange: (trackIndex) => {
        // Don't clear focus when clicking empty space - maintain current focus
        if (trackIndex !== null) {
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
          onTrackFocusChange?.(trackIndex, true); // Update keyboard focus state in App.tsx
        }
        // If trackIndex is null (clicked empty space), do nothing - keep current focus
      },
      onSpectralSelectionChange: (sel) => {
        // Batch updates using requestAnimationFrame to reduce re-renders during drag
        pendingSpectralSelectionRef.current = sel;

        if (spectralSelectionRAFRef.current === null) {
          spectralSelectionRAFRef.current = requestAnimationFrame(() => {
            setSpectralSelection(pendingSpectralSelectionRef.current);
            spectralSelectionRAFRef.current = null;
          });
        }
      },
      onSpectralSelectionFinalized: (sel) => {
        // Cancel any pending RAF and immediately flush the final state
        if (spectralSelectionRAFRef.current !== null) {
          cancelAnimationFrame(spectralSelectionRAFRef.current);
          spectralSelectionRAFRef.current = null;
        }
        setSpectralSelection(pendingSpectralSelectionRef.current ?? sel);
        pendingSpectralSelectionRef.current = null;

        if (sel) {
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
        }
      },
      onTrackSelect: (trackIndex) => dispatch({ type: 'SELECT_TRACK', payload: trackIndex }),
      onClipSelect: (trackIndex, clipId) => dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: clipId as number } }),
    }
  );

  const containerProps = selection.containerProps as any;

  // Container click handler - extracted to custom hook
  const handleContainerClick = useContainerClick({
    containerRef,
    tracks,
    containerPropsOnClick: containerProps.onClick,
    selectionWasJustDragging: selection.selection.wasJustDragging,
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
  });

  // Clip and label mouse down handler - extracted to custom hook
  const handleClipMouseDown = useClipMouseDown({
    containerRef,
    tracks,
    selectedLabelIds,
    spectralSelection,
    hasSpectralView,
    selectionIsPositionOnSpectralClip: selection.selection.isPositionOnSpectralClip,
    containerPropsOnMouseDown: containerProps.onMouseDown,
    clipDragStateRef,
    didDragRef,
    justSelectedOnMouseDownRef,
    pixelsPerSecond,
    dispatch,
    setSpectralSelection,
    TOP_GAP,
    TRACK_GAP,
    DEFAULT_TRACK_HEIGHT,
    CLIP_HEADER_HEIGHT,
  });

  // Calculate grid line positions — major (bar/measure or major interval) + minor (beat or minor interval)
  const { gridLines, measureBands } = React.useMemo(() => {
    const lines: Array<{ x: number; isMajor: boolean }> = [];
    const bands: Array<{ x: number; w: number }> = [];
    const totalSeconds = width / pixelsPerSecond;

    if (timeFormat === 'beats-measures') {
      const secondsPerBeat = 60 / bpm;
      const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
      const totalBeats = Math.ceil(totalSeconds / secondsPerBeat) + beatsPerMeasure;
      for (let beat = 0; beat <= totalBeats; beat++) {
        const x = CLIP_CONTENT_OFFSET + beat * secondsPerBeat * pixelsPerSecond;
        if (x > width) break;
        lines.push({ x, isMajor: beat % beatsPerMeasure === 0 });
      }
      // Alternating measure bands — every other measure gets a darker background
      const measureWidth = secondsPerMeasure * pixelsPerSecond;
      const totalMeasures = Math.ceil(totalSeconds / secondsPerMeasure) + 1;
      for (let m = 0; m < totalMeasures; m++) {
        if (m % 2 !== 0) continue; // even indices only (0-indexed), so measures 1,3,5,7… in 1-indexed
        const x = CLIP_CONTENT_OFFSET + m * measureWidth;
        if (x > width) break;
        bands.push({ x, w: measureWidth });
      }
    } else {
      // minutes-seconds: use the exact same thresholds as TimelineRuler
      let majorInterval: number;
      if (pixelsPerSecond < 20) {
        majorInterval = 10;
      } else if (pixelsPerSecond < 50) {
        majorInterval = 5;
      } else if (pixelsPerSecond < 100) {
        majorInterval = 2;
      } else if (pixelsPerSecond < 200) {
        majorInterval = 1;
      } else {
        majorInterval = 0.5;
      }
      const minorInterval = majorInterval / 5;
      let t = 0;
      while (t <= totalSeconds + minorInterval) {
        const roundedT = Math.round(t / minorInterval) * minorInterval;
        const x = CLIP_CONTENT_OFFSET + roundedT * pixelsPerSecond;
        if (x > width) break;
        const isMajor = Math.abs(roundedT % majorInterval) < 0.001;
        lines.push({ x, isMajor });
        t = Math.round((t + minorInterval) * 1000) / 1000;
      }
    }
    return { gridLines: lines, measureBands: bands };
  }, [bpm, beatsPerMeasure, timeFormat, pixelsPerSecond, width]);

  return (
    <div className="canvas-container" style={{ backgroundColor: bgColor, minHeight: `${totalHeight}px`, height: '100%', overflow: 'visible', cursor: 'text' }}>
      {/* Beat/measure grid — rendered first so tracks appear on top */}
      {(gridLines.length > 0 || measureBands.length > 0) && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${width}px`,
            height: `${tracksHeight + viewportHeight}px`,
            pointerEvents: 'none',
          }}
        >
          {measureBands.map(({ x, w }) => (
            <rect
              key={x}
              x={x}
              y={0}
              width={w}
              height={tracksHeight + viewportHeight}
              fill="#252837"
            />
          ))}
          {gridLines.map(({ x, isMajor }) => (
            <line
              key={x}
              x1={x}
              y1={0}
              x2={x}
              y2={tracksHeight + viewportHeight}
              stroke={isMajor ? theme.stroke.grid.major : theme.stroke.grid.minor}
              strokeWidth={1}
            />
          ))}
        </svg>
      )}
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          lastMouseButtonRef.current = e.button;
          handleClipMouseDown(e);
        }}
        onMouseMove={containerProps.onMouseMove}
        onClick={handleContainerClick}
        onContextMenu={(e) => {
          // Always prevent default browser context menu
          e.preventDefault();

          // Only show OUR context menu if:
          // 1. The last mouse button pressed was right-click (button 2)
          // 2. There's an existing time selection
          // 3. We're not currently dragging or creating a selection
          if (lastMouseButtonRef.current === 2 && timeSelection && !selection.selection.isDragging && !selection.selection.isCreating) {
            onTimeSelectionMenuClick?.(e.clientX, e.clientY);
          }

          // Reset the button ref after handling
          lastMouseButtonRef.current = 0;
        }}
        onDragStart={(e: React.DragEvent) => e.preventDefault()}
        style={{ ...containerProps.style, minHeight: `${totalHeight}px`, height: '100%', userSelect: 'none', cursor: 'text' } as React.CSSProperties}
      >
        {tracks.map((track, trackIndex) => {
          const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;
          const isSelected = selectedTrackIndices.includes(trackIndex);
          const isFocused = focusedTrackIndex === trackIndex;

          // Calculate y position for this track
          const yOffset = calculateTrackYOffset(trackIndex, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT);

          return (
            <div
              key={track.id}
              style={{
                position: 'absolute',
                top: `${yOffset}px`,
                left: 0,
                width: `${width}px`,
                height: `${trackHeight}px`,
                overflow: 'visible', // Allow focus outline to show
              }}
              onClick={(e) => {
                // Only handle clicks on empty space (not on clips or labels)
                // Check if click was on TrackNew background or wrapper
                const target = e.target as HTMLElement;
                const isTrackBackground = target.classList?.contains('track') || e.target === e.currentTarget;

                if (isTrackBackground) {
                  // Handle Shift+Click for range selection FIRST (before drag check)
                  // This allows Shift+Click to work even after setting playhead
                  if (e.shiftKey) {
                    // Deselect all clips
                    dispatch({ type: 'DESELECT_ALL_CLIPS' });

                    // Use the first selected track as anchor if no anchor is set
                    const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : trackIndex);
                    if (selectionAnchor === null && setSelectionAnchor) {
                      setSelectionAnchor(anchor);
                    }

                    // Calculate range selection from anchor to clicked track
                    const start = Math.min(anchor, trackIndex);
                    const end = Math.max(anchor, trackIndex);
                    const newSelection: number[] = [];
                    for (let i = start; i <= end; i++) {
                      newSelection.push(i);
                    }
                    dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });

                    // Set this track as focused
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                    // Clear label selections
                    dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
                    return; // Done with Shift+Click handling
                  }

                  // Don't handle regular clicks if we just finished dragging (creating time selection)
                  if (selection.selection.wasJustDragging()) {
                    return;
                  }

                  // Regular click handling
                  // Deselect all clips
                  dispatch({ type: 'DESELECT_ALL_CLIPS' });

                  // Normal click - select only this track
                  dispatch({ type: 'SET_SELECTED_TRACKS', payload: [trackIndex] });
                  // Clear anchor
                  if (setSelectionAnchor) {
                    setSelectionAnchor(null);
                  }

                  // Set this track as focused
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                  // Clear label selections
                  dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
                }
              }}
            >
              <TrackNew
                clips={showRmsInWaveform ? track.clips as any : (track.clips as any).map((clip: any) => ({
                  ...clip,
                  waveformRms: undefined,
                  waveformLeftRms: undefined,
                  waveformRightRms: undefined,
                }))}
                height={trackHeight}
                trackIndex={trackIndex}
                spectrogramMode={track.viewMode === 'spectrogram'}
                splitView={track.viewMode === 'split'}
                envelopeMode={envelopeMode}
                isSelected={isSelected}
                isFocused={isFocused}
                isLabelTrack={track.type === 'label'}
                pixelsPerSecond={pixelsPerSecond}
                width={width}
                tabIndex={isFlatNavigation ? 0 : (101 + trackIndex * 2)}

                timeSelection={timeSelection && (timeSelection.renderOnCanvas !== false) ? timeSelection : null}
                isTimeSelectionDragging={selection.selection.isDragging}
                clipStyle={preferences.clipStyle}
                recordingClipId={recordingClipId}
                onFocusChange={(hasFocus) => onTrackFocusChange?.(trackIndex, hasFocus)}
                onClipMove={(clipId, deltaSeconds) => {
                  // Find the clip to get its current position
                  const clip = track.clips.find(c => c.id === clipId);
                  if (clip) {
                    const newStartTime = Math.max(0, clip.start + deltaSeconds);
                    dispatch({
                      type: 'MOVE_CLIP',
                      payload: {
                        clipId: clipId as number,
                        fromTrackIndex: trackIndex,
                        toTrackIndex: trackIndex,
                        newStartTime,
                      },
                    });
                  }
                }}
                onClipMoveToTrack={(clipId, direction) => {
                  // Find the clip to get its current position
                  const clip = track.clips.find(c => c.id === clipId);
                  if (!clip) return;

                  // Calculate target track index
                  const targetTrackIndex = trackIndex + direction;

                  // Check if target track exists
                  if (targetTrackIndex < 0 || targetTrackIndex >= tracks.length) return;

                  // Move the clip to the target track
                  dispatch({
                    type: 'MOVE_CLIP',
                    payload: {
                      clipId: clipId as number,
                      fromTrackIndex: trackIndex,
                      toTrackIndex: targetTrackIndex,
                      newStartTime: clip.start,
                    },
                  });

                  // Focus the clip on the new track after a brief delay
                  setTimeout(() => {
                    const targetTrack = document.querySelector(`[data-track-index="${targetTrackIndex}"]`);
                    if (targetTrack) {
                      const movedClip = targetTrack.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement;
                      if (movedClip) {
                        movedClip.focus();
                      }
                    }
                  }, 0);
                }}
                onClipNavigateVertical={(_clipId, direction) => {
                  // Calculate target track index
                  const targetTrackIndex = trackIndex + direction;

                  // Check if target track exists
                  if (targetTrackIndex < 0 || targetTrackIndex >= tracks.length) return;

                  // Focus the first clip on the target track and scroll into view
                  setTimeout(() => {
                    const targetTrack = document.querySelector(`[data-track-index="${targetTrackIndex}"]`);
                    if (targetTrack) {
                      const firstClip = targetTrack.querySelector('[role="button"]') as HTMLElement;
                      if (firstClip) {
                        firstClip.focus();
                        // Scroll the track into view
                        targetTrack.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        });
                      }
                    }
                  }, 0);
                }}
                onClipTrim={(clipId, edge, deltaSeconds) => {
                  // Find the clip to get its current state
                  const clip = track.clips.find(c => c.id === clipId);
                  if (!clip) return;

                  const currentTrimStart = clip.trimStart || 0;
                  const currentDuration = clip.duration;
                  const currentStart = clip.start;
                  const fullDuration = (clip as any).fullDuration || (currentTrimStart + currentDuration);
                  const currentMaxDuration = fullDuration - currentTrimStart;
                  const isAtMaxDuration = Math.abs(currentDuration - currentMaxDuration) < 0.001;

                  let newTrimStart = currentTrimStart;
                  let newDuration = currentDuration;
                  let newStart = currentStart;

                  if (edge === 'left') {
                    // Left edge: positive delta = trim (increase trimStart), negative = expand (decrease trimStart)
                    // When expanding left (negative delta), check if we're already at max duration
                    if (deltaSeconds < 0 && isAtMaxDuration) {
                      // Already at max duration, don't allow any expansion left
                      return;
                    }

                    newTrimStart = currentTrimStart + deltaSeconds;
                    newDuration = Math.max(0.1, currentDuration - deltaSeconds); // Minimum 0.1s duration
                    newStart = currentStart + deltaSeconds;

                    // Don't allow expanding beyond the full duration
                    const maxDuration = fullDuration - newTrimStart;
                    if (newDuration > maxDuration) {
                      // Clamp to max duration and adjust trimStart/start accordingly
                      newDuration = maxDuration;
                      newTrimStart = fullDuration - newDuration;
                      newStart = currentStart + (newTrimStart - currentTrimStart);
                    }
                  } else {
                    // Right edge: positive delta = trim (decrease duration), negative = expand (increase duration)
                    // When expanding right (negative delta), check if we're already at max duration
                    if (deltaSeconds < 0 && isAtMaxDuration) {
                      // Already at max duration, don't allow any expansion right
                      return;
                    }

                    newDuration = Math.max(0.1, currentDuration - deltaSeconds); // Minimum 0.1s duration
                    // Don't allow expanding beyond the full duration
                    const maxDuration = fullDuration - currentTrimStart;
                    newDuration = Math.min(newDuration, maxDuration);
                  }

                  // Ensure trimStart doesn't go negative
                  newTrimStart = Math.max(0, newTrimStart);

                  dispatch({
                    type: 'TRIM_CLIP',
                    payload: {
                      trackIndex,
                      clipId: clipId as number,
                      newTrimStart,
                      newDuration,
                      newStart: edge === 'left' ? newStart : undefined,
                    },
                  });
                }}
                onEnvelopePointsChange={(clipId, points) => {
                  dispatch({
                    type: 'UPDATE_CLIP_ENVELOPE_POINTS',
                    payload: { trackIndex, clipId: clipId as number, envelopePoints: points },
                  });
                }}
                onClipMenuClick={(clipId, x, y, openedViaKeyboard) => {
                  onClipMenuClick?.(clipId as number, trackIndex, x, y, openedViaKeyboard);
                }}
                onClipClick={(clipId, shiftKey, metaKey) => {
                  // Don't change selection if we just finished dragging
                  if (didDragRef.current) {
                    didDragRef.current = false; // Reset immediately after blocking one click
                    return;
                  }

                  // Don't deselect if we just selected this clip on mouse down
                  if (justSelectedOnMouseDownRef.current) {
                    justSelectedOnMouseDownRef.current = false; // Reset immediately after blocking one click
                    return;
                  }

                  if (shiftKey) {
                    // Shift+click: range selection (select all clips between last selected and this one)
                    dispatch({
                      type: 'SELECT_CLIP_RANGE',
                      payload: { trackIndex, clipId: clipId as number },
                    });
                  } else if (metaKey) {
                    // Cmd/Ctrl+click: toggle selection (add/remove from multi-selection)
                    dispatch({
                      type: 'TOGGLE_CLIP_SELECTION',
                      payload: { trackIndex, clipId: clipId as number },
                    });
                  } else {
                    // Regular click/Enter: check if clip is already selected
                    const clip = track.clips.find(c => c.id === clipId);
                    const isSelected = clip?.selected || false;

                    // Count total selected clips
                    let totalSelectedClips = 0;
                    tracks.forEach(t => {
                      t.clips.forEach(c => {
                        if (c.selected) totalSelectedClips++;
                      });
                    });

                    // If this clip is the only selected clip, deselect it
                    // Otherwise, exclusively select it
                    if (isSelected && totalSelectedClips === 1) {
                      dispatch({ type: 'DESELECT_ALL_CLIPS' });
                    } else {
                      dispatch({
                        type: 'SELECT_CLIP',
                        payload: { trackIndex, clipId: clipId as number },
                      });
                    }
                  }
                }}
                onClipTrimEdge={(clipId, edge) => {
                  // Find the clip being trimmed
                  const clip = track.clips.find(c => c.id === clipId);
                  if (!clip) return;

                  // Initialize trim state on first call
                  if (!clipTrimStateRef.current) {
                    // Select the clip if it's not already selected
                    if (!clip.selected) {
                      dispatch({
                        type: 'SELECT_CLIP',
                        payload: { trackIndex, clipId: clipId as number },
                      });
                    }

                    // Store initial state for all selected clips (including the one we just selected)
                    const allClipsInitialState = new Map<string, { trimStart: number; duration: number; start: number; fullDuration: number }>();
                    tracks.forEach((t, tIndex) => {
                      t.clips.forEach(c => {
                        // Include this clip even if it wasn't selected before (we just selected it)
                        if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                          const trimStart = (c as any).trimStart || 0;
                          const fullDuration = (c as any).fullDuration || (trimStart + c.duration);
                          const key = `${tIndex}-${c.id}`;
                          allClipsInitialState.set(key, {
                            trimStart,
                            duration: c.duration,
                            start: c.start,
                            fullDuration,
                          });
                        }
                      });
                    });

                    clipTrimStateRef.current = {
                      trackIndex,
                      clipId: clipId as number,
                      edge,
                      initialTrimStart: (clip as any).trimStart || 0,
                      initialDuration: clip.duration,
                      initialClipStart: clip.start,
                      allClipsInitialState,
                    };
                  }

                  // The actual trimming happens in the mousemove handler
                }}
                envelopePointSizes={envelopePointSizes}
                channelSplitRatio={track.channelSplitRatio}
                onChannelSplitRatioChange={(ratio) => {
                  dispatch({
                    type: 'UPDATE_CHANNEL_SPLIT_RATIO',
                    payload: { index: trackIndex, ratio },
                  });
                }}
                onTrackClick={(e) => {
                  // When track background is clicked, set it as focused
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });

                  // If Shift is held, extend/contract selection (range selection)
                  if (e.shiftKey) {
                    // Use the first selected track as anchor if no anchor is set
                    const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : trackIndex);
                    if (selectionAnchor === null) {
                      setSelectionAnchor(anchor);
                    }

                    // Calculate range selection from anchor to clicked track
                    const start = Math.min(anchor, trackIndex);
                    const end = Math.max(anchor, trackIndex);
                    const newSelection: number[] = [];
                    for (let i = start; i <= end; i++) {
                      newSelection.push(i);
                    }
                    dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                  } else {
                    // Clear anchor when Shift is not held
                    setSelectionAnchor(null);
                  }
                }}
              />

              {/* Render labels for label tracks */}
              {track.labels && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    pointerEvents: 'none', // Allow clicks to pass through to children
                  }}
                >
                  <div style={{ pointerEvents: 'auto' }}>
                    <LabelRenderer
                      labels={track.labels}
                      trackIndex={trackIndex}
                      trackHeight={track.height || 114}
                      pixelsPerSecond={pixelsPerSecond}
                      clipContentOffset={CLIP_CONTENT_OFFSET}
                      selectedLabelIds={selectedLabelIds}
                      hoveredEar={hoveredEar}
                      hoveredBanner={hoveredBanner}
                      tracks={tracks}
                      selectedTrackIndices={selectedTrackIndices}
                      setHoveredEar={setHoveredEar}
                      setHoveredBanner={setHoveredBanner}
                      dispatch={dispatch}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Spectral Selection Overlay */}
        <SpectralSelectionOverlay
          spectralSelection={spectralSelection}
          pixelsPerSecond={pixelsPerSecond}
          trackHeights={tracks.map(t => t.height || DEFAULT_TRACK_HEIGHT)}
          trackGap={TRACK_GAP}
          initialGap={TOP_GAP}
          clipHeaderHeight={20}
          tracks={tracks}
          isDragging={selection.selection.isDragging}
          isCreating={selection.selection.isCreating}
        />
      </div>

    </div>
  );
}
