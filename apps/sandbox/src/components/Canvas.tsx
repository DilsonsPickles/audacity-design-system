import { useRef } from 'react';
import { Track, useAudioSelection, TimeSelectionCanvasOverlay, SpectralSelectionOverlay } from '@audacity-ui/components';
import { useTracksState, useTracksDispatch } from '../contexts/TracksContext';
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
  const { tracks, selectedTrackIndices, focusedTrackIndex, timeSelection, spectralSelection, spectrogramMode } = useTracksState();
  const dispatch = useTracksDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Configuration constants
  const TOP_GAP = 2;
  const TRACK_GAP = 2;
  const DEFAULT_TRACK_HEIGHT = 114;

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
      leftPadding: 0,  // No leftPadding - unified coordinate system
      tracks: tracks as any, // Type cast to handle local vs core type mismatch
      defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
      trackGap: TRACK_GAP,
      initialGap: TOP_GAP,
      enabled: true,
    },
    {
      onTimeSelectionChange: (sel) => {
        console.log('onTimeSelectionChange called:', sel, 'spectrogramMode:', spectrogramMode);
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
        console.log('onSpectralSelectionChange called:', sel);
        dispatch({ type: 'SET_SPECTRAL_SELECTION', payload: sel });
      },
      onSpectralSelectionFinalized: (sel) => {
        if (sel) {
          console.log('[onSpectralSelectionFinalized] Selection:', sel);
          console.log('[onSpectralSelectionFinalized] startTime:', sel.startTime, 'endTime:', sel.endTime);
          console.log('[onSpectralSelectionFinalized] Setting playhead to startTime (should be left edge):', sel.startTime);
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
        }
      },
      onTrackSelect: (trackIndex) => dispatch({ type: 'SELECT_TRACK', payload: trackIndex }),
      onClipSelect: (trackIndex, clipId) => dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: clipId as number } }),
    }
  );

  // Handle click to move playhead and select track
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('[handleContainerClick] Called');

    // First, call the containerProps onClick handler to preserve drag prevention logic
    if (containerProps.onClick) {
      containerProps.onClick(e);
    }

    // Only update playhead if we're not dragging
    const wasJustDragging = selection.selection.wasJustDragging();
    console.log('[handleContainerClick] wasJustDragging:', wasJustDragging);
    if (wasJustDragging) {
      console.log('[handleContainerClick] Skipping playhead update - was dragging');
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Canvas uses NO leftPadding - clips are positioned at clip.start * pixelsPerSecond
    const time = x / pixelsPerSecond;
    console.log('[handleContainerClick] Moving playhead to click position:', time);

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
      console.log('[handleContainerClick] Selecting track:', clickedTrackIndex);
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [clickedTrackIndex] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: clickedTrackIndex });
    }

    // Always move playhead on click
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

  // Compose the onClick handlers to preserve both drag prevention and playhead movement
  const composedOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleContainerClick(e);
  };

  return (
    <div className="canvas-container" style={{ backgroundColor, minHeight: `${totalHeight}px`, height: '100%', overflow: 'visible' }}>
      <div
        ref={containerRef}
        onMouseDown={containerProps.onMouseDown}
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
                left: `${leftPadding}px`,
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
                isSelected={isSelected}
                isFocused={isFocused}
                pixelsPerSecond={pixelsPerSecond}
                width={width}
                backgroundColor={backgroundColor}
                {...selection.getClipProps(trackIndex)}
                {...selection.getTrackProps(trackIndex)}
              />
            </div>
          );
        })}

        {/* Time Selection Overlay */}
        <TimeSelectionCanvasOverlay
          timeSelection={timeSelection}
          pixelsPerSecond={pixelsPerSecond}
          leftPadding={0}
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
        />
      </div>
    </div>
  );
}
