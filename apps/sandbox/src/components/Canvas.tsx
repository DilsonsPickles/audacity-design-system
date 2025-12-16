import { useRef, useEffect, useState } from 'react';
import { Track, useAudioSelection, TimeSelectionCanvasOverlay, SpectralSelectionOverlay, CLIP_CONTENT_OFFSET } from '@audacity-ui/components';
import { useTracksState, useTracksDispatch, EnvelopeDragState, EnvelopeSegmentDragState, ClipDragState } from '../contexts/TracksContext';
import { handleEnvelopeClick } from '../utils/envelopeInteraction';
import { yToDbNonLinear, ENVELOPE_MOVE_THRESHOLD } from '../utils/envelopeUtils';
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
}: CanvasProps) {
  const { tracks, selectedTrackIndices, focusedTrackIndex, timeSelection, spectralSelection, spectrogramMode, envelopeMode, envelopeAltMode } = useTracksState();
  const dispatch = useTracksDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Envelope editing state
  const envelopeDragStateRef = useRef<EnvelopeDragState | null>(null);
  const envelopeSegmentDragStateRef = useRef<EnvelopeSegmentDragState | null>(null);
  const envelopeInteractionOccurredRef = useRef<boolean>(false);

  // Clip dragging state
  const clipDragStateRef = useRef<ClipDragState | null>(null);

  // Track which envelope points are currently hidden (for eating behavior)
  const [envelopeHiddenPoints, setEnvelopeHiddenPoints] = useState<{
    trackIndex: number;
    clipId: number;
    hiddenIndices: number[];
  } | null>(null);

  // Track if channel resize is active
  const [isChannelResizing, setIsChannelResizing] = useState(false);

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
    // Skip if envelope interaction occurred
    if (envelopeInteractionOccurredRef.current) {
      envelopeInteractionOccurredRef.current = false;
      return;
    }

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

  // Main mouse down handler - handles clip dragging and envelope interaction
  const handleEnvelopeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      containerProps.onMouseDown?.(e);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If there's a spectral selection at this position, prioritize it over everything
    // This prevents envelope/clip handles from interfering with spectral marquee center line
    if (spectralSelection && hasSpectralView && selection.selection.isPositionOnSpectralClip) {
      const isOnSpectralClip = selection.selection.isPositionOnSpectralClip(x, y);
      if (isOnSpectralClip) {
        // Let spectral selection handle it
        containerProps.onMouseDown?.(e);
        return;
      }
    }

    // Check for clip header dragging (always check, regardless of envelope mode)
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

            envelopeInteractionOccurredRef.current = true;
            e.stopPropagation();
            return;
          }
        }
      }

      currentY += trackHeight + TRACK_GAP;
    }

    // Check for envelope interaction (only if envelope mode is active)
    if (envelopeMode || envelopeAltMode) {
      const result = handleEnvelopeClick(
        x,
        y,
        tracks as any,
        envelopeMode,
        true, // Always use alt mode behavior: click = add point, drag = move segment
        pixelsPerSecond,
        CLIP_CONTENT_OFFSET,
        TRACK_GAP,
        TOP_GAP
      );

      if (result.type === 'point-drag') {
        envelopeDragStateRef.current = result.dragState as EnvelopeDragState;
        envelopeInteractionOccurredRef.current = true;
        e.stopPropagation(); // Prevent click event from firing
        return; // Don't pass through to audio selection
      } else if (result.type === 'segment-drag') {
        envelopeSegmentDragStateRef.current = result.dragState as EnvelopeSegmentDragState;
        envelopeInteractionOccurredRef.current = true;
        e.stopPropagation(); // Prevent click event from firing
        return; // Don't pass through to audio selection
      } else if (result.type === 'add-point' && result.newPoint) {
      // Add point immediately
      const { trackIndex, clipId, point } = result.newPoint;
      const currentClip = tracks[trackIndex].clips.find(c => c.id === clipId);
      if (currentClip) {
        // Only prevent adding points at clip origin (time = 0)
        const TIME_EPSILON = 0.001;
        const isAtClipOrigin = point.time < TIME_EPSILON;
        const hasPointAtOrigin = currentClip.envelopePoints.some(p => p.time < TIME_EPSILON);

        // Don't add a point at time = 0 if one already exists there
        if (!isAtClipOrigin || !hasPointAtOrigin) {
          const newPoints = [...currentClip.envelopePoints, point].sort((a, b) => a.time - b.time);
          dispatch({
            type: 'UPDATE_CLIP_ENVELOPE_POINTS',
            payload: { trackIndex, clipId, envelopePoints: newPoints },
          });
        }
      }
      envelopeInteractionOccurredRef.current = true;
      e.stopPropagation(); // Prevent click event from firing
      return; // Don't pass through to audio selection
      }
    }

    // No clip or envelope interaction, pass through to audio selection
    containerProps.onMouseDown?.(e);
  };

  // Document-level mouse move and up for envelope dragging
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

        return;
      }

      // Handle envelope segment dragging
      if (envelopeSegmentDragStateRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dragState = envelopeSegmentDragStateRef.current;

        // Check if mouse has moved enough to trigger drag (for alt mode)
        if (dragState.isAltMode && !dragState.hasMoved && dragState.clickX !== undefined && dragState.clickY !== undefined) {
          const distance = Math.sqrt((x - dragState.clickX) ** 2 + (y - dragState.clickY) ** 2);
          if (distance > ENVELOPE_MOVE_THRESHOLD) {
            dragState.hasMoved = true;
          } else {
            return; // Not moved enough yet
          }
        }

        // Drag the segment
        const deltaDb = yToDbNonLinear(y, dragState.clipY, dragState.clipHeight) -
                        yToDbNonLinear(dragState.startY, dragState.clipY, dragState.clipHeight);

        const newDb1 = Math.max(-60, Math.min(12, dragState.startDb1 + deltaDb));
        const newDb2 = Math.max(-60, Math.min(12, dragState.startDb2 + deltaDb));

        const newPoints = [...dragState.clip.envelopePoints];
        newPoints[dragState.segmentStartIndex] = { ...newPoints[dragState.segmentStartIndex], db: newDb1 };
        if (dragState.segmentStartIndex !== dragState.segmentEndIndex) {
          newPoints[dragState.segmentEndIndex] = { ...newPoints[dragState.segmentEndIndex], db: newDb2 };
        }

        dispatch({
          type: 'UPDATE_CLIP_ENVELOPE_POINTS',
          payload: {
            trackIndex: dragState.trackIndex,
            clipId: dragState.clip.id,
            envelopePoints: newPoints,
          },
        });
      }

      // Handle envelope point dragging
      if (envelopeDragStateRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dragState = envelopeDragStateRef.current;

        // Check if moved beyond threshold (3 pixels)
        const dx = Math.abs(x - dragState.startX);
        const dy = Math.abs(y - dragState.startY);
        if (dx > 3 || dy > 3) {
          dragState.hasMoved = true;
        }

        let relativeTime = Math.max(0, Math.min(dragState.clip.duration, ((x - dragState.clipX) / dragState.clipWidth) * dragState.clip.duration));
        const db = yToDbNonLinear(y, dragState.clipY, dragState.clipHeight);

        const currentClip = tracks[dragState.trackIndex].clips.find(c => c.id === dragState.clip.id);
        if (!currentClip) return;

        // Gentle horizontal snapping to help align points at the same time position
        const SNAP_THRESHOLD_TIME = 0.05; // Snap within 0.05 seconds
        for (let i = 0; i < currentClip.envelopePoints.length; i++) {
          if (i === dragState.pointIndex) continue;

          const otherPoint = currentClip.envelopePoints[i];
          const timeDistance = Math.abs(relativeTime - otherPoint.time);

          if (timeDistance < SNAP_THRESHOLD_TIME) {
            relativeTime = otherPoint.time; // Snap to the other point's time value
            break;
          }
        }

        // Determine which points should be hidden
        const TIME_EPSILON = 0.001;
        const hiddenIndices: number[] = [];

        // Special case: if dragged to clip origin (time = 0), hide ALL other points
        if (relativeTime < TIME_EPSILON) {
          for (let i = 0; i < currentClip.envelopePoints.length; i++) {
            if (i === dragState.pointIndex) continue;
            hiddenIndices.push(i);
          }
        } else {
          // Normal eating behavior: hide points between original and current time
          const minTime = Math.min(dragState.originalTime, relativeTime);
          const maxTime = Math.max(dragState.originalTime, relativeTime);

          for (let i = 0; i < currentClip.envelopePoints.length; i++) {
            if (i === dragState.pointIndex) continue;

            const otherPoint = currentClip.envelopePoints[i];
            // Hide points that are strictly between the original and current time positions
            if (otherPoint.time > minTime && otherPoint.time < maxTime) {
              hiddenIndices.push(i);
            }
          }
        }

        // Update hidden indices in drag state
        dragState.hiddenPointIndices = hiddenIndices;

        // Update visual state for rendering
        setEnvelopeHiddenPoints({
          trackIndex: dragState.trackIndex,
          clipId: dragState.clip.id,
          hiddenIndices,
        });

        // Update the point position
        const newPoints = [...currentClip.envelopePoints];
        newPoints[dragState.pointIndex] = {
          time: relativeTime,
          db: Math.max(-60, Math.min(12, db)),
        };

        // Sort the points
        newPoints.sort((a, b) => a.time - b.time);

        // Find the new index of the point we're dragging
        const newPointIndex = newPoints.findIndex(
          (p) => p.time === relativeTime && Math.abs(p.db - Math.max(-60, Math.min(12, db))) < 0.001
        );

        if (newPointIndex !== -1) {
          dragState.pointIndex = newPointIndex;
        }

        dispatch({
          type: 'UPDATE_CLIP_ENVELOPE_POINTS',
          payload: {
            trackIndex: dragState.trackIndex,
            clipId: dragState.clip.id,
            envelopePoints: newPoints,
          },
        });
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
        return;
      }

      // Handle envelope segment drag end - check for click vs drag in alt mode
      if (envelopeSegmentDragStateRef.current) {
        const dragState = envelopeSegmentDragStateRef.current;

        // Alt mode: if didn't move, add a point at click location
        if (dragState.isAltMode && !dragState.hasMoved && dragState.clickX !== undefined && dragState.clickY !== undefined) {
          const relativeTime = ((dragState.clickX - dragState.clipX) / dragState.clipWidth) * dragState.clip.duration;
          const db = yToDbNonLinear(dragState.clickY, dragState.clipY, dragState.clipHeight);
          const newPoint = { time: relativeTime, db };

          const newPoints = [...dragState.clip.envelopePoints, newPoint].sort((a, b) => a.time - b.time);
          dispatch({
            type: 'UPDATE_CLIP_ENVELOPE_POINTS',
            payload: {
              trackIndex: dragState.trackIndex,
              clipId: dragState.clip.id,
              envelopePoints: newPoints,
            },
          });
        }

        envelopeSegmentDragStateRef.current = null;
      }

      // Handle envelope point drag end
      if (envelopeDragStateRef.current) {
        const dragState = envelopeDragStateRef.current;
        const currentClip = tracks[dragState.trackIndex].clips.find(c => c.id === dragState.clip.id);

        if (currentClip) {
          // If the point didn't move, remove it (click to delete)
          if (!dragState.hasMoved) {
            const newPoints = [...currentClip.envelopePoints];
            newPoints.splice(dragState.pointIndex, 1);

            dispatch({
              type: 'UPDATE_CLIP_ENVELOPE_POINTS',
              payload: {
                trackIndex: dragState.trackIndex,
                clipId: dragState.clip.id,
                envelopePoints: newPoints,
              },
            });
          }
          // If there are hidden points (points that were passed over), delete them permanently
          else if (dragState.hiddenPointIndices.length > 0) {
            // Remove points in reverse order to maintain indices
            const newPoints = [...currentClip.envelopePoints];
            dragState.hiddenPointIndices.sort((a, b) => b - a).forEach(i => {
              newPoints.splice(i, 1);
            });

            dispatch({
              type: 'UPDATE_CLIP_ENVELOPE_POINTS',
              payload: {
                trackIndex: dragState.trackIndex,
                clipId: dragState.clip.id,
                envelopePoints: newPoints,
              },
            });
          }
        }

        // Clear hidden points state
        setEnvelopeHiddenPoints(null);
        envelopeDragStateRef.current = null;
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
    <div className="canvas-container" style={{ backgroundColor, minHeight: `${totalHeight}px`, height: '100%', overflow: 'visible' }}>
      <div
        ref={containerRef}
        onMouseDown={handleEnvelopeMouseDown}
        onMouseMove={containerProps.onMouseMove}
        onClick={composedOnClick}
        onDragStart={(e: React.DragEvent) => e.preventDefault()}
        style={{ ...containerProps.style, minHeight: `${totalHeight}px`, height: '100%', userSelect: 'none' } as React.CSSProperties}
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
              <Track
                clips={track.clips as any}
                height={trackHeight}
                trackIndex={trackIndex}
                spectrogramMode={track.viewMode === 'spectrogram'}
                splitView={track.viewMode === 'split'}
                envelopeMode={envelopeMode}
                envelopeHiddenPointIndices={
                  envelopeHiddenPoints && trackIndex === envelopeHiddenPoints.trackIndex
                    ? new Map([[envelopeHiddenPoints.clipId, envelopeHiddenPoints.hiddenIndices]])
                    : undefined
                }
                isSelected={isSelected}
                isFocused={isFocused}
                pixelsPerSecond={pixelsPerSecond}
                width={width}
                backgroundColor={backgroundColor}
                channelSplitRatio={track.channelSplitRatio}
                {...selection.getClipProps(trackIndex)}
                {...selection.getTrackProps(trackIndex)}
                onClipHeaderClick={(_clipId, clipStartTime) => {
                  dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: clipStartTime });
                }}
                onChannelSplitChange={(newSplitRatio) => {
                  dispatch({
                    type: 'UPDATE_CHANNEL_SPLIT_RATIO',
                    payload: { index: trackIndex, ratio: newSplitRatio }
                  });
                }}
                onChannelResizeStart={() => setIsChannelResizing(true)}
                onChannelResizeEnd={() => setIsChannelResizing(false)}
              />
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
