import { useRef } from 'react';
import { Track, useAudioSelection, TimeSelectionCanvasOverlay } from '@audacity-ui/components';
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
}: CanvasProps) {
  const { tracks, selectedTrackIndices, focusedTrackIndex, timeSelection } = useTracksState();
  const dispatch = useTracksDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Configuration constants
  const TOP_GAP = 2;
  const TRACK_GAP = 2;
  const LEFT_PADDING = 12;
  const DEFAULT_TRACK_HEIGHT = 114;

  // Calculate total height based on all tracks + 2px gaps (top + between tracks)
  const totalHeight = tracks.reduce((sum, track) => sum + (track.height || DEFAULT_TRACK_HEIGHT), 0) + TOP_GAP + (TRACK_GAP * (tracks.length - 1));

  // Setup audio selection (composite hook for time, track, and clip selection)
  const selection = useAudioSelection(
    {
      containerRef,
      currentTimeSelection: timeSelection,
      currentSelectedTracks: selectedTrackIndices,
      pixelsPerSecond,
      leftPadding: LEFT_PADDING,
      tracks,
      defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
      trackGap: TRACK_GAP,
      initialGap: TOP_GAP,
      enabled: true,
    },
    {
      onTimeSelectionChange: (sel) => dispatch({ type: 'SET_TIME_SELECTION', payload: sel }),
      onSelectedTracksChange: (trackIndices) => dispatch({ type: 'SET_SELECTED_TRACKS', payload: trackIndices }),
      onFocusedTrackChange: (trackIndex) => dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex }),
      onTrackSelect: (trackIndex) => dispatch({ type: 'SELECT_TRACK', payload: trackIndex }),
      onClipSelect: (trackIndex, clipId) => dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId } }),
    }
  );

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

  return (
    <div className="canvas-container" style={{ backgroundColor, minHeight: `${totalHeight}px`, overflow: 'visible' }}>
      <div {...selection.containerProps}>
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
                clips={track.clips}
                height={trackHeight}
                trackIndex={trackIndex}
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
          leftPadding={LEFT_PADDING}
          top={overlayBounds.top}
          height={overlayBounds.height}
          backgroundColor="rgba(112, 181, 255, 0.3)"
          borderColor="transparent"
        />
      </div>
    </div>
  );
}
