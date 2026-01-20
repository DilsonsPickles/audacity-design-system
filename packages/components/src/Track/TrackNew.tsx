import React from 'react';
import { ClipDisplay } from '../ClipDisplay/ClipDisplay';
import { EnvelopeInteractionLayer } from '../EnvelopeInteractionLayer/EnvelopeInteractionLayer';
import { generateSpeechWaveform } from '../utils/waveform';
import { CLIP_CONTENT_OFFSET } from '../constants';
import './Track.css';

export interface TrackClip {
  id: string | number;
  name: string;
  start: number;
  duration: number;
  selected?: boolean;
  waveform?: number[];
  waveformRms?: number[];
  waveformLeft?: number[];
  waveformRight?: number[];
  waveformLeftRms?: number[];
  waveformRightRms?: number[];
  envelopePoints?: Array<{ time: number; db: number }>;
}

export interface TrackProps {
  /**
   * Array of clips to display on this track
   */
  clips: TrackClip[];

  /**
   * Height of the track in pixels
   * @default 114
   */
  height?: number;

  /**
   * Track index (0-based, determines color scheme)
   * - 0 = Blue
   * - 1 = Violet
   * - 2 = Magenta
   * - Cycles through colors for higher indices
   */
  trackIndex: number;

  /**
   * Whether to show spectrogram view
   * @default false
   */
  spectrogramMode?: boolean;

  /**
   * Whether to show split view (spectrogram + waveform)
   * @default false
   */
  splitView?: boolean;

  /**
   * Whether envelope mode is active
   * @default false
   */
  envelopeMode?: boolean;

  /**
   * Whether the track is selected
   */
  isSelected?: boolean;

  /**
   * Whether the track has focus
   */
  isFocused?: boolean;

  /**
   * Whether the track is muted
   */
  isMuted?: boolean;

  /**
   * Whether this is a label track (hides clip header recess)
   * @default false
   */
  isLabelTrack?: boolean;

  /**
   * Pixels per second (zoom level)
   * @default 100
   */
  pixelsPerSecond?: number;

  /**
   * Width of the track in pixels
   */
  width: number;

  /**
   * Background color for track
   * @default '#212433'
   */
  backgroundColor?: string;

  /**
   * Callback when a clip is clicked
   */
  onClipClick?: (clipId: string | number, shiftKey?: boolean) => void;

  /**
   * Callback when track background is clicked
   */
  onTrackClick?: () => void;

  /**
   * Callback when envelope points change
   */
  onEnvelopePointsChange?: (clipId: string | number, points: Array<{ time: number; db: number }>) => void;

  /**
   * Callback when a clip header is clicked
   */
  onClipHeaderClick?: (clipId: string | number, clipStartTime: number) => void;

  /**
   * Callback when a clip menu button is clicked
   */
  onClipMenuClick?: (clipId: string | number, x: number, y: number, openedViaKeyboard?: boolean) => void;

  /**
   * Callback when a clip edge is being trimmed
   */
  onClipTrimEdge?: (clipId: string | number, edge: 'left' | 'right', clientX: number) => void;

  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;

  /**
   * Callback when keyboard focus changes
   */
  onFocusChange?: (hasFocus: boolean) => void;

  /**
   * Callback when a clip should be moved (Cmd+Arrow keys)
   */
  onClipMove?: (clipId: string | number, deltaSeconds: number) => void;

  /**
   * Callback when a clip should be trimmed (Shift+Arrow keys)
   */
  onClipTrim?: (clipId: string | number, edge: 'left' | 'right', deltaSeconds: number) => void;

  /**
   * Callback when a clip should be moved to a different track (Cmd+Arrow Up/Down)
   */
  onClipMoveToTrack?: (clipId: string | number, direction: 1 | -1) => void;

  /**
   * Callback when navigating vertically between tracks (Arrow Up/Down without modifiers)
   */
  onClipNavigateVertical?: (clipId: string | number, direction: 1 | -1) => void;

  /**
   * Time selection range (for rendering vibrant clip colors within selection)
   */
  timeSelection?: { startTime: number; endTime: number } | null;

  /**
   * Whether time selection is currently being dragged
   */
  isTimeSelectionDragging?: boolean;

  /**
   * Clip style preference ('classic' or 'colourful')
   */
  clipStyle?: 'classic' | 'colourful';

  /**
   * Envelope control point sizes (for MuseScore vs AU4 style)
   */
  envelopePointSizes?: {
    outerRadius: number;
    innerRadius: number;
    outerRadiusHover: number;
    innerRadiusHover: number;
  };
}

// Map track index to color
const TRACK_COLORS = ['blue', 'violet', 'magenta'] as const;
function getTrackColor(trackIndex: number, clipStyle: 'classic' | 'colourful' = 'colourful') {
  if (clipStyle === 'classic') {
    return 'classic' as const;
  }
  return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
}

/**
 * Track component - renders a single audio track with clips using ClipDisplay components
 */
export const TrackNew: React.FC<TrackProps> = ({
  clips,
  height = 114,
  trackIndex,
  spectrogramMode = false,
  splitView = false,
  envelopeMode = false,
  isSelected = false,
  isFocused = false,
  isMuted = false,
  isLabelTrack = false,
  pixelsPerSecond = 100,
  width,
  backgroundColor = '#212433',
  onClipClick,
  onTrackClick,
  onEnvelopePointsChange,
  onClipHeaderClick,
  onClipMenuClick,
  onClipTrimEdge,
  tabIndex,
  onFocusChange,
  onClipMove,
  onClipTrim,
  onClipMoveToTrack,
  onClipNavigateVertical,
  timeSelection,
  isTimeSelectionDragging = false,
  clipStyle = 'colourful',
  envelopePointSizes,
}) => {
  const trackColor = getTrackColor(trackIndex, clipStyle);
  const [clipHiddenPoints, setClipHiddenPoints] = React.useState<Map<string | number, number[]>>(new Map());
  const [clipHoveredPoints, setClipHoveredPoints] = React.useState<Map<string | number, number | null>>(new Map());
  const [hasKeyboardFocus, setHasKeyboardFocus] = React.useState(false);

  // Calculate background color with white overlay based on selection state
  // Idle (not selected, not focused): 8% white
  // Focused only (not selected): 8% white
  // Selected: 16% white
  const getTrackBackgroundColor = () => {
    const baseColor = backgroundColor;
    if (isSelected) {
      // 16% white overlay
      return `color-mix(in srgb, ${baseColor} 84%, white 16%)`;
    } else {
      // 8% white overlay (applies to both idle and focused-only states)
      return `color-mix(in srgb, ${baseColor} 92%, white 8%)`;
    }
  };

  // Calculate clip dimensions and positions
  const renderClips = () => {
    return clips.map((clip, clipIndex) => {
      const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;
      const isFirstClip = clipIndex === 0;

      // Generate waveform if not provided
      // IMPORTANT: For trimmed clips, calculate full duration from trimStart + duration
      let waveformData = clip.waveform;
      let waveformLeft = clip.waveformLeft;
      let waveformRight = clip.waveformRight;

      const isStereo = Boolean(clip.waveformLeft || clip.waveformRight);

      // Calculate full duration: trimStart + current duration gives us the full audio length
      const trimStart = (clip as any).trimStart || 0;
      const fullDuration = trimStart + clip.duration;

      if (!waveformData && !isStereo) {
        // Generate mono waveform using FULL duration
        waveformData = generateSpeechWaveform(fullDuration, 1800);
      }

      if (isStereo && (!waveformLeft || !waveformRight)) {
        // Generate stereo waveforms using FULL duration
        waveformLeft = generateSpeechWaveform(fullDuration, 1800);
        waveformRight = generateSpeechWaveform(fullDuration, 1800);
      }

      // Determine variant and channel mode
      let variant: 'waveform' | 'spectrogram' = 'waveform';
      let channelMode: 'mono' | 'stereo' | 'split-mono' | 'split-stereo' = 'mono';

      if (splitView) {
        channelMode = isStereo ? 'split-stereo' : 'split-mono';
        variant = 'spectrogram';
      } else if (spectrogramMode) {
        channelMode = isStereo ? 'stereo' : 'mono';
        variant = 'spectrogram';
      } else {
        channelMode = isStereo ? 'stereo' : 'mono';
        variant = 'waveform';
      }

      const clipSelected = (clip as any).selected || false;

      return (
        <div
          key={clip.id}
          data-clip-id={clip.id}
          data-track-index={trackIndex}
          data-first-clip={isFirstClip}
          style={{
            position: 'absolute',
            left: `${clipX}px`,
            top: 0,
          }}
          tabIndex={isFirstClip && tabIndex !== undefined ? tabIndex : -1}
          role="button"
          aria-label={`${clip.name} clip`}
          onKeyDown={(e) => {
            // Delete key: let it bubble to App.tsx handler, but DON'T stop propagation
            // The App.tsx handler will read data-clip-id and data-track-index from this element
            if (e.key === 'Delete' || e.key === 'Backspace') {
              // Don't preventDefault or stopPropagation - let it reach App.tsx
              return;
            }

            // Toggle selection with Enter key
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onClipClick?.(clip.id, e.shiftKey);
              return;
            }

            // Open context menu with Shift+F10 or ContextMenu key (standard keyboard shortcuts)
            if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
              e.preventDefault();
              e.stopPropagation();
              // Calculate position of clip header for menu placement
              const clipElement = e.currentTarget as HTMLElement;
              const rect = clipElement.getBoundingClientRect();
              // Open menu at top-right corner of clip (where menu button is)
              onClipMenuClick?.(clip.id, rect.right - 20, rect.top + 10, true);
              return;
            }

            // Move clip horizontally with Cmd+Arrow Left/Right
            if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey) {
              e.preventDefault();
              const moveAmount = 0.1; // Move by 0.1 seconds
              const delta = e.key === 'ArrowRight' ? moveAmount : -moveAmount;
              onClipMove?.(clip.id, delta);
              return;
            }

            // Move clip to different track with Cmd+Arrow Up/Down
            if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) {
              e.preventDefault();
              const direction = e.key === 'ArrowDown' ? 1 : -1;
              onClipMoveToTrack?.(clip.id, direction);
              return;
            }

            // Expand clip with Shift+Arrow keys (trim with Cmd+Shift+Arrow)
            if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
              e.preventDefault();
              const trimAmount = 0.1; // Trim by 0.1 seconds
              const isTrimming = e.metaKey || e.ctrlKey;
              // For expand (Shift only): ArrowLeft → left, ArrowRight → right
              // For trim (Cmd+Shift): ArrowLeft → right, ArrowRight → left
              const edge = isTrimming
                ? (e.key === 'ArrowLeft' ? 'right' : 'left')
                : (e.key === 'ArrowLeft' ? 'left' : 'right');
              const delta = isTrimming ? trimAmount : -trimAmount; // Negative delta = expand
              onClipTrim?.(clip.id, edge, delta);
              return;
            }

            // Navigate vertically between tracks with arrow up/down (without Cmd or Shift)
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              const direction = e.key === 'ArrowDown' ? 1 : -1;
              onClipNavigateVertical?.(clip.id, direction);
              return;
            }

            // Navigate between clips with arrow left/right (without Cmd or Shift) - cycles through all clips
            if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              // Cycle to next clip, wrapping to first if at end
              const nextIndex = (clipIndex + 1) % clips.length;
              const clipElements = e.currentTarget.parentElement?.querySelectorAll('[role="button"]');
              if (clipElements) {
                const nextClip = clipElements[nextIndex] as HTMLElement;
                if (nextClip) {
                  nextClip.tabIndex = tabIndex !== undefined ? tabIndex : 0;
                  nextClip.focus({ preventScroll: true });
                  // Reset current clip tabIndex
                  (e.currentTarget as HTMLElement).tabIndex = -1;
                }
              }
            } else if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              // Cycle to previous clip, wrapping to last if at beginning
              const prevIndex = (clipIndex - 1 + clips.length) % clips.length;
              const clipElements = e.currentTarget.parentElement?.querySelectorAll('[role="button"]');
              if (clipElements) {
                const prevClip = clipElements[prevIndex] as HTMLElement;
                if (prevClip) {
                  prevClip.tabIndex = tabIndex !== undefined ? tabIndex : 0;
                  prevClip.focus({ preventScroll: true });
                  // Reset current clip tabIndex
                  (e.currentTarget as HTMLElement).tabIndex = -1;
                }
              }
            }
          }}
        >
          <ClipDisplay
            color={clipStyle === 'classic' ? 'classic' : ((clip as any).color || trackColor)}
            name={clip.name}
            width={clipWidth}
            height={height}
            selected={clipSelected}
            inTimeSelection={timeSelection && isSelected && (timeSelection as any).renderOnCanvas !== false ? (
              clip.start < timeSelection.endTime && (clip.start + clip.duration) > timeSelection.startTime
            ) : false}
            clipStartTime={clip.start}
            timeSelectionRange={timeSelection}
            variant={variant}
            channelMode={channelMode}
            waveformData={waveformData}
            waveformDataRms={clip.waveformRms}
            waveformLeft={waveformLeft}
            waveformRight={waveformRight}
            waveformLeftRms={clip.waveformLeftRms}
            waveformRightRms={clip.waveformRightRms}
            envelope={clip.envelopePoints}
            showEnvelope={envelopeMode}
            clipDuration={clip.duration}
            clipTrimStart={(clip as any).trimStart || 0}
            clipFullDuration={(clip as any).fullDuration}
            pixelsPerSecond={pixelsPerSecond}
            hiddenPointIndices={clipHiddenPoints.get(clip.id) || []}
            hoveredPointIndex={clipHoveredPoints.get(clip.id) ?? null}
            envelopePointSizes={envelopePointSizes}
            onHeaderClick={(shiftKey) => onClipClick?.(clip.id, shiftKey)}
            onMenuClick={(x, y) => onClipMenuClick?.(clip.id, x, y)}
            onTrimEdge={
              onClipTrimEdge
                ? ({ edge, clientX }) => onClipTrimEdge(clip.id, edge, clientX)
                : undefined
            }
          />
        </div>
      );
    });
  };

  // Render envelope interaction layers for all clips at track level
  const renderEnvelopeInteractionLayers = () => {
    if (!envelopeMode || !onEnvelopePointsChange) return null;

    const CLIP_HEADER_HEIGHT = 20;

    return clips.map((clip) => {
      const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;

      return (
        <EnvelopeInteractionLayer
          key={`envelope-${clip.id}`}
          envelopePoints={clip.envelopePoints || []}
          onEnvelopePointsChange={(newPoints) => onEnvelopePointsChange(clip.id, newPoints)}
          onHiddenPointsChange={(hiddenIndices) => {
            setClipHiddenPoints((prev) => {
              const next = new Map(prev);
              if (hiddenIndices.length > 0) {
                next.set(clip.id, hiddenIndices);
              } else {
                next.delete(clip.id);
              }
              return next;
            });
          }}
          onHoveredPointChange={(hoveredIndex) => {
            setClipHoveredPoints((prev) => {
              const next = new Map(prev);
              if (hoveredIndex !== null) {
                next.set(clip.id, hoveredIndex);
              } else {
                next.delete(clip.id);
              }
              return next;
            });
          }}
          enabled={envelopeMode}
          width={clipWidth}
          height={height - CLIP_HEADER_HEIGHT}
          duration={clip.duration}
          x={clipX}
          y={CLIP_HEADER_HEIGHT}
        />
      );
    });
  };

  // Handle focus entering the track
  const handleTrackFocus = (e: React.FocusEvent) => {
    // Focus entered somewhere within the track (could be a clip or label)
    setHasKeyboardFocus(true);
    onFocusChange?.(true);
  };

  // Reset tabIndex to first clip when focus leaves the track
  const handleTrackBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const trackElement = e.currentTarget;

    // Only notify blur if focus is moving completely outside the track
    if (!relatedTarget || !trackElement.contains(relatedTarget)) {
      // Reset tabIndex: first clip gets tabIndex, all others get -1
      const clipElements = trackElement.querySelectorAll('[role="button"]');
      clipElements.forEach((clipEl, index) => {
        (clipEl as HTMLElement).tabIndex = (index === 0 && tabIndex !== undefined) ? tabIndex : -1;
      });
      // Remove keyboard focus indicator
      setHasKeyboardFocus(false);
      onFocusChange?.(false);
    }
  };

  const className = `track-wrapper ${isFocused ? 'track-wrapper--focused' : ''}`;

  // Render time selection overlay (only for the selected time range on track background)
  const renderTimeSelectionOverlay = () => {
    if (!timeSelection) return null;

    const startX = CLIP_CONTENT_OFFSET + timeSelection.startTime * pixelsPerSecond;
    const endX = CLIP_CONTENT_OFFSET + timeSelection.endTime * pixelsPerSecond;
    const selectionWidth = endX - startX;

    // Selected tracks: #647F8F when dragging, #627788 when finalized
    // Unselected tracks: #313846
    const overlayColor = isSelected
      ? (isTimeSelectionDragging ? '#647F8F' : '#627788')
      : '#313846';

    return (
      <div
        style={{
          position: 'absolute',
          left: `${startX}px`,
          top: 0,
          width: `${selectionWidth}px`,
          height: `${height}px`,
          backgroundColor: overlayColor,
          pointerEvents: 'none',
          zIndex: 0, // Behind clips (clips have higher z-index)
        }}
      />
    );
  };

  return (
    <div className={className} data-track-index={trackIndex}>
      <div
        className={`track ${isSelected ? 'track--selected' : ''} ${isMuted ? 'track--muted' : ''}`}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: getTrackBackgroundColor(),
          opacity: isMuted ? 0.5 : 1,
        }}
        onClick={onTrackClick}
        onFocus={handleTrackFocus}
        onBlur={handleTrackBlur}
      >
        {/* Clip header recess - 20px darkened area at top of track (hidden for label tracks) */}
        {!isLabelTrack && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {renderTimeSelectionOverlay()}
        {renderClips()}
        {renderEnvelopeInteractionLayers()}
      </div>
    </div>
  );
};

export default TrackNew;
