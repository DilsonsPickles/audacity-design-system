import { useRef, useEffect } from 'react';
import { TrackNew, useAudioSelection, TimeSelectionCanvasOverlay, SpectralSelectionOverlay, CLIP_CONTENT_OFFSET, LabelMarker } from '@audacity-ui/components';
import { useTracksState, useTracksDispatch, ClipDragState } from '../contexts/TracksContext';
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
   * @default '#212433'
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
  onClipMenuClick?: (clipId: number, trackIndex: number, x: number, y: number) => void;
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
  backgroundColor = '#212433',
  leftPadding = 0,
  onClipMenuClick,
}: CanvasProps) {
  const { tracks, selectedTrackIndices, focusedTrackIndex, timeSelection, spectralSelection, spectrogramMode, envelopeMode } = useTracksState();
  const dispatch = useTracksDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Clip dragging state
  const clipDragStateRef = useRef<ClipDragState | null>(null);

  // Clip trim state
  const clipTrimStateRef = useRef<{
    trackIndex: number;
    clipId: number;
    edge: 'left' | 'right';
    initialTrimStart: number;
    initialDuration: number;
    initialClipStart: number;
  } | null>(null);

  // Label dragging state
  const labelDragStateRef = useRef<{ trackIndex: number; labelId: number; initialTime: number; initialEndTime?: number } | null>(null);

  // Track if channel resize is active
  const isChannelResizing = false;

  // Configuration constants
  const TOP_GAP = 2;
  const TRACK_GAP = 2;
  const DEFAULT_TRACK_HEIGHT = 114;
  const CLIP_HEADER_HEIGHT = 20;

  // Calculate total height based on all tracks + 2px gaps (top + between tracks)
  const totalHeight = tracks.reduce((sum, track) => sum + (track.height || DEFAULT_TRACK_HEIGHT), 0) + TOP_GAP + (TRACK_GAP * (tracks.length - 1));

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
      enabled: !isChannelResizing, // Disable selection when channel resizing
    },
    {
      onTimeSelectionChange: (sel) => {
        dispatch({ type: 'SET_TIME_SELECTION', payload: sel });
      },
      onTimeSelectionFinalized: (sel) => {
        if (sel) {
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
        }
      },
      onSelectedTracksChange: (trackIndices) => dispatch({ type: 'SET_SELECTED_TRACKS', payload: trackIndices }),
      onFocusedTrackChange: (trackIndex) => dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex }),
      onSpectralSelectionChange: (sel) => {
        dispatch({ type: 'SET_SPECTRAL_SELECTION', payload: sel });
      },
      onSpectralSelectionFinalized: (sel) => {
        if (sel) {
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
        }
      },
      onTrackSelect: (trackIndex) => dispatch({ type: 'SELECT_TRACK', payload: trackIndex }),
      onClipSelect: (trackIndex, clipId) => dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: clipId as number } }),
    }
  );

  // Handle click to move playhead and select track
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // First, call the containerProps onClick handler to preserve drag prevention logic
    if (containerProps.onClick) {
      containerProps.onClick(e);
    }

    // Only update playhead if we're not dragging
    const wasJustDragging = selection.selection.wasJustDragging();
    if (wasJustDragging) {
      return;
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
    } else if (clickedTrackIndex !== null) {
      // Clicked on a track - select it
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [clickedTrackIndex] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: clickedTrackIndex });
    }

    // Always move playhead on click (allow it to go to 0 - stalk can touch the gap)
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: Math.max(0, time) });
  };

  // Calculate time selection overlay position and height
  const getTimeSelectionOverlayBounds = () => {
    if (!timeSelection || selectedTrackIndices.length === 0) {
      return { top: 0, height: 0 };
    }

    const minTrackIndex = Math.min(...selectedTrackIndices);
    const maxTrackIndex = Math.max(...selectedTrackIndices);

    // Calculate top position (Y of first selected track)
    let top = TOP_GAP;
    for (let i = 0; i < minTrackIndex; i++) {
      top += (tracks[i].height || DEFAULT_TRACK_HEIGHT) + TRACK_GAP;
    }

    // Calculate height (sum of selected tracks + gaps between them)
    let height = 0;
    for (let i = minTrackIndex; i <= maxTrackIndex; i++) {
      if (i < tracks.length) {
        height += (tracks[i].height || DEFAULT_TRACK_HEIGHT);
        if (i < maxTrackIndex) {
          height += TRACK_GAP;
        }
      }
    }

    return { top, height };
  };

  const overlayBounds = getTimeSelectionOverlayBounds();

  const containerProps = selection.containerProps as any;

  // Main mouse down handler - handles clip dragging
  const handleClipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      containerProps.onMouseDown?.(e);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If there's a spectral selection at this position, prioritize it
    if (spectralSelection && hasSpectralView && selection.selection.isPositionOnSpectralClip) {
      const isOnSpectralClip = selection.selection.isPositionOnSpectralClip(x, y);
      if (isOnSpectralClip) {
        containerProps.onMouseDown?.(e);
        return;
      }
    }

    // Check for clip header dragging
    let currentY = TOP_GAP;
    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;

      if (y >= currentY && y < currentY + trackHeight) {
        for (const clip of track.clips) {
          const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
          const clipWidth = clip.duration * pixelsPerSecond;
          const clipHeaderY = currentY;

          // Check if click is on clip header
          if (x >= clipX && x <= clipX + clipWidth &&
              y >= clipHeaderY && y <= clipHeaderY + CLIP_HEADER_HEIGHT) {
            // Select the clip
            dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: clip.id } });

            // Clear time selection and spectral selection when starting clip drag
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            dispatch({ type: 'SET_SPECTRAL_SELECTION', payload: null });

            // Start clip drag
            clipDragStateRef.current = {
              clip,
              trackIndex,
              offsetX: x - clipX,
              initialX: x,
              initialTrackIndex: trackIndex,
            };

            e.stopPropagation();
            return;
          }
        }
      }

      currentY += trackHeight + TRACK_GAP;
    }

    // No clip interaction, pass through to audio selection
    containerProps.onMouseDown?.(e);
  };

  // Document-level mouse move and up for clip dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Handle clip dragging
      if (clipDragStateRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dragState = clipDragStateRef.current;

        // Calculate new start time
        const newStartTime = Math.max(0, (x - dragState.offsetX - CLIP_CONTENT_OFFSET) / pixelsPerSecond);

        // Find which track the cursor is over
        let currentY = TOP_GAP;
        let newTrackIndex = dragState.trackIndex;
        for (let i = 0; i < tracks.length; i++) {
          const trackHeight = tracks[i].height || DEFAULT_TRACK_HEIGHT;
          if (y >= currentY && y < currentY + trackHeight) {
            newTrackIndex = i;
            break;
          }
          currentY += trackHeight + TRACK_GAP;
        }

        // Update cursor style
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grabbing';
        }

        // Move the clip
        dispatch({
          type: 'MOVE_CLIP',
          payload: {
            clipId: dragState.clip.id,
            fromTrackIndex: dragState.trackIndex,
            toTrackIndex: newTrackIndex,
            newStartTime,
          },
        });

        // Update drag state if track changed
        if (newTrackIndex !== dragState.trackIndex) {
          dragState.trackIndex = newTrackIndex;
          // Update selected track when clip moves to a different track
          dispatch({ type: 'SET_SELECTED_TRACKS', payload: [newTrackIndex] });
        }
      }

      // Handle clip trimming
      if (clipTrimStateRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const trimState = clipTrimStateRef.current;

        // Find the clip to get its current start position
        const clip = tracks[trimState.trackIndex]?.clips.find(c => c.id === trimState.clipId);
        if (!clip) return;

        // Calculate mouse position in timeline
        const mouseTime = Math.max(0, (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond);

        // Get the full clip duration (total audio available)
        // Use stored fullDuration if available, otherwise calculate from current state
        const currentTrimStart = (clip as any).trimStart || 0;
        const fullDuration = (clip as any).fullDuration || (currentTrimStart + clip.duration);

        if (trimState.edge === 'left') {
          // Trimming left edge (non-destructive)
          // Calculate new trim start based on absolute mouse position
          const newTrimStart = Math.max(0, mouseTime - trimState.initialClipStart + trimState.initialTrimStart);

          // Calculate the right edge position (end of visible audio)
          const rightEdgeInFullAudio = trimState.initialTrimStart + trimState.initialDuration;

          // Don't allow trimming past the right edge (minimum 0.01s visible)
          const maxTrimStart = rightEdgeInFullAudio - 0.01;
          const clampedTrimStart = Math.max(0, Math.min(newTrimStart, maxTrimStart));

          // Calculate new duration: from new trim start to the right edge
          const newDuration = rightEdgeInFullAudio - clampedTrimStart;
          const newStart = trimState.initialClipStart + (clampedTrimStart - trimState.initialTrimStart);

          dispatch({
            type: 'TRIM_CLIP',
            payload: {
              trackIndex: trimState.trackIndex,
              clipId: trimState.clipId,
              newTrimStart: clampedTrimStart,
              newDuration,
              newStart,
            },
          });
        } else {
          // Trimming right edge (non-destructive)
          // Calculate new duration based on absolute mouse position
          const newDuration = Math.max(0.01, mouseTime - clip.start);

          // Don't allow duration to exceed available audio from trim start
          const maxDuration = fullDuration - currentTrimStart;
          const clampedDuration = Math.min(newDuration, maxDuration);

          dispatch({
            type: 'TRIM_CLIP',
            payload: {
              trackIndex: trimState.trackIndex,
              clipId: trimState.clipId,
              newTrimStart: currentTrimStart,
              newDuration: clampedDuration,
            },
          });
        }
      }
    };

    const handleMouseUp = () => {
      // Handle clip drag end
      if (clipDragStateRef.current) {
        // Reset cursor
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
        clipDragStateRef.current = null;
      }

      // Handle clip trim end
      if (clipTrimStateRef.current) {
        clipTrimStateRef.current = null;
      }

      // Handle label drag end
      if (labelDragStateRef.current) {
        labelDragStateRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tracks, dispatch, pixelsPerSecond, CLIP_CONTENT_OFFSET, TOP_GAP, TRACK_GAP]);

  // Compose the onClick handlers to preserve both drag prevention and playhead movement
  const composedOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleContainerClick(e);
  };

  return (
    <div className="canvas-container" style={{ backgroundColor, minHeight: `${totalHeight}px`, height: '100%', overflow: 'visible', cursor: 'text' }}>
      <div
        ref={containerRef}
        onMouseDown={handleClipMouseDown}
        onMouseMove={containerProps.onMouseMove}
        onClick={composedOnClick}
        onDragStart={(e: React.DragEvent) => e.preventDefault()}
        style={{ ...containerProps.style, minHeight: `${totalHeight}px`, height: '100%', userSelect: 'none', cursor: 'text' } as React.CSSProperties}
      >
        {tracks.map((track, trackIndex) => {
          const trackHeight = track.height || 114;
          const isSelected = selectedTrackIndices.includes(trackIndex);
          const isFocused = focusedTrackIndex === trackIndex;

          // Calculate y position for this track
          let yOffset = TOP_GAP;
          for (let i = 0; i < trackIndex; i++) {
            yOffset += (tracks[i].height || 114) + TRACK_GAP;
          }

          return (
            <div
              key={track.id}
              style={{
                position: 'absolute',
                top: `${yOffset}px`,
                left: 0,
                width: `${width}px`,
                height: `${trackHeight}px`,
              }}
            >
              <TrackNew
                clips={track.clips as any}
                height={trackHeight}
                trackIndex={trackIndex}
                spectrogramMode={track.viewMode === 'spectrogram'}
                splitView={track.viewMode === 'split'}
                envelopeMode={envelopeMode}
                isSelected={isSelected}
                isFocused={isFocused}
                pixelsPerSecond={pixelsPerSecond}
                width={width}
                backgroundColor={backgroundColor}
                onEnvelopePointsChange={(clipId, points) => {
                  dispatch({
                    type: 'UPDATE_CLIP_ENVELOPE_POINTS',
                    payload: { trackIndex, clipId: clipId as number, envelopePoints: points },
                  });
                }}
                onClipMenuClick={(clipId, x, y) => {
                  onClipMenuClick?.(clipId as number, trackIndex, x, y);
                }}
                onClipTrimEdge={(clipId, edge) => {
                  // Find the clip being trimmed
                  const clip = track.clips.find(c => c.id === clipId);
                  if (!clip) return;

                  // Initialize trim state on first call
                  if (!clipTrimStateRef.current) {
                    clipTrimStateRef.current = {
                      trackIndex,
                      clipId: clipId as number,
                      edge,
                      initialTrimStart: (clip as any).trimStart || 0,
                      initialDuration: clip.duration,
                      initialClipStart: clip.start,
                    };
                  }

                  // The actual trimming happens in the mousemove handler
                }}
              />

              {/* Render labels for label tracks */}
              {track.labels && (() => {
                const EAR_HEIGHT = 14;
                const LABEL_BOX_GAP = 2; // Gap between label boxes
                const LABEL_ROW_HEIGHT = EAR_HEIGHT + LABEL_BOX_GAP; // 14px ears + 2px gap = 16px total
                const LABEL_ROW_GAP = 0; // No additional gap needed

                // Pre-calculate row assignments for all labels
                const labelRows: number[] = [];

                track.labels.forEach((label, labelIndex) => {
                  const x = CLIP_CONTENT_OFFSET + label.time * pixelsPerSecond;
                  // For overlap detection, use smaller width for point labels (just the label box)
                  const width = label.endTime !== undefined
                    ? (label.endTime - label.time) * pixelsPerSecond
                    : 60; // Point labels: just account for small label box, not full 225px render width

                  // Find the first row where this label fits without overlapping
                  let row = 0;
                  let foundRow = false;

                  while (!foundRow) {
                    let canFitInRow = true;

                    // Check if any previous label in this row overlaps
                    for (let i = 0; i < labelIndex; i++) {
                      if (labelRows[i] === row) {
                        const prevLabel = track.labels![i];
                        const prevX = CLIP_CONTENT_OFFSET + prevLabel.time * pixelsPerSecond;
                        const prevWidth = prevLabel.endTime !== undefined
                          ? (prevLabel.endTime - prevLabel.time) * pixelsPerSecond
                          : 60; // Point labels: use same small width for overlap detection

                        const overlap = !(x >= prevX + prevWidth || x + width <= prevX);
                        if (overlap) {
                          canFitInRow = false;
                          break;
                        }
                      }
                    }

                    if (canFitInRow) {
                      foundRow = true;
                    } else {
                      row++;
                    }
                  }

                  labelRows.push(row);
                });

                return track.labels.map((label, labelIndex) => {
                  const x = CLIP_CONTENT_OFFSET + label.time * pixelsPerSecond;
                  const type = label.endTime !== undefined ? 'region' : 'point';
                  const width = label.endTime !== undefined
                    ? (label.endTime - label.time) * pixelsPerSecond
                    : 225;

                  const yOffset = labelRows[labelIndex] * (LABEL_ROW_HEIGHT + LABEL_ROW_GAP);
                  // Stalk should only extend from this label's position to the bottom of the track
                  const stalkHeight = trackHeight - yOffset;

                return (
                  <div
                    key={label.id}
                    style={{
                      position: 'absolute',
                      left: `${x}px`,
                      top: `${yOffset}px`, // Offset for overlapping labels
                      pointerEvents: 'auto',
                    }}
                  >
                    <LabelMarker
                      text={label.text}
                      type={type}
                      state="idle"
                      width={width}
                      stalkHeight={stalkHeight} // Stalk extends from current position to track bottom
                      onLabelMove={(deltaX) => {
                        // Initialize drag state on first call
                        if (!labelDragStateRef.current) {
                          labelDragStateRef.current = {
                            trackIndex,
                            labelId: label.id,
                            initialTime: label.time,
                            initialEndTime: label.endTime,
                          };
                        }

                        // Calculate new time based on deltaX from initial position
                        const deltaTime = deltaX / pixelsPerSecond;
                        const newTime = Math.max(0, labelDragStateRef.current.initialTime + deltaTime);

                        if (labelDragStateRef.current.initialEndTime !== undefined) {
                          // Region label: maintain duration while moving
                          const duration = labelDragStateRef.current.initialEndTime - labelDragStateRef.current.initialTime;
                          dispatch({
                            type: 'UPDATE_LABEL',
                            payload: {
                              trackIndex,
                              labelId: label.id,
                              label: { time: newTime, endTime: newTime + duration },
                            },
                          });
                        } else {
                          // Point label: just update time
                          dispatch({
                            type: 'UPDATE_LABEL',
                            payload: {
                              trackIndex,
                              labelId: label.id,
                              label: { time: newTime },
                            },
                          });
                        }
                      }}
                      onRegionResize={(params) => {
                        // Convert clientX to time position
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        if (!containerRect) return;

                        const localX = params.clientX - containerRect.left;
                        const time = Math.max(0, (localX - CLIP_CONTENT_OFFSET) / pixelsPerSecond);

                        if (params.side === 'right') {
                          // Right side resize: update endTime to cursor position
                          dispatch({
                            type: 'UPDATE_LABEL',
                            payload: {
                              trackIndex,
                              labelId: label.id,
                              label: { endTime: Math.max(label.time + 0.1, time) }, // Min 0.1s duration
                            },
                          });
                        } else {
                          // Left side resize
                          if (label.endTime === undefined) {
                            // Point label: converting to region by dragging left
                            // Keep original time, set endTime to cursor (must be >= original time)
                            dispatch({
                              type: 'UPDATE_LABEL',
                              payload: {
                                trackIndex,
                                labelId: label.id,
                                label: { endTime: label.time, time: Math.min(time, label.time - 0.1) }, // Drag left from original position
                              },
                            });
                          } else {
                            // Region label: update time to cursor position, keep endTime
                            dispatch({
                              type: 'UPDATE_LABEL',
                              payload: {
                                trackIndex,
                                labelId: label.id,
                                label: { time: Math.min(time, label.endTime - 0.1) }, // Min 0.1s duration
                              },
                            });
                          }
                        }
                      }}
                    />
                  </div>
                );
              });
              })()}
            </div>
          );
        })}

        {/* Time Selection Overlay */}
        <TimeSelectionCanvasOverlay
          timeSelection={timeSelection}
          pixelsPerSecond={pixelsPerSecond}
          leftPadding={leftPadding}
          top={overlayBounds.top}
          height={overlayBounds.height}
          backgroundColor="rgba(112, 181, 255, 0.3)"
          borderColor="transparent"
        />

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
