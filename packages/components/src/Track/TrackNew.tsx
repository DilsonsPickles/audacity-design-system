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
  waveformLeft?: number[];
  waveformRight?: number[];
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
  onClipClick?: (clipId: string | number) => void;

  /**
   * Callback when track background is clicked
   */
  onTrackClick?: () => void;

  /**
   * Callback when envelope points change
   */
  onEnvelopePointsChange?: (clipId: string | number, points: Array<{ time: number; db: number }>) => void;
}

// Map track index to color
const TRACK_COLORS = ['blue', 'violet', 'magenta'] as const;
function getTrackColor(trackIndex: number) {
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
  pixelsPerSecond = 100,
  width,
  backgroundColor = '#212433',
  onClipClick,
  onTrackClick,
  onEnvelopePointsChange,
}) => {
  const trackColor = getTrackColor(trackIndex);
  const [clipHiddenPoints, setClipHiddenPoints] = React.useState<Map<string | number, number[]>>(new Map());
  const [clipHoveredPoints, setClipHoveredPoints] = React.useState<Map<string | number, number | null>>(new Map());

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
    return clips.map((clip) => {
      const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;

      // Generate waveform if not provided
      let waveformData = clip.waveform;
      let waveformLeft = clip.waveformLeft;
      let waveformRight = clip.waveformRight;

      const isStereo = Boolean(clip.waveformLeft || clip.waveformRight);

      if (!waveformData && !isStereo) {
        // Generate mono waveform
        waveformData = generateSpeechWaveform(clip.duration, 1800);
      }

      if (isStereo && (!waveformLeft || !waveformRight)) {
        // Generate stereo waveforms
        waveformLeft = generateSpeechWaveform(clip.duration, 1800);
        waveformRight = generateSpeechWaveform(clip.duration, 1800);
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

      return (
        <div
          key={clip.id}
          style={{
            position: 'absolute',
            left: `${clipX}px`,
            top: 0,
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClipClick?.(clip.id);
          }}
        >
          <ClipDisplay
            color={trackColor}
            name={clip.name}
            width={clipWidth}
            height={height}
            selected={clip.selected || false}
            variant={variant}
            channelMode={channelMode}
            waveformData={waveformData}
            waveformLeft={waveformLeft}
            waveformRight={waveformRight}
            envelope={clip.envelopePoints}
            showEnvelope={envelopeMode}
            clipDuration={clip.duration}
            hiddenPointIndices={clipHiddenPoints.get(clip.id) || []}
            hoveredPointIndex={clipHoveredPoints.get(clip.id) ?? null}
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

  return (
    <div className={`track-wrapper ${isFocused ? 'track-wrapper--focused' : ''}`}>
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
      >
        {renderClips()}
        {renderEnvelopeInteractionLayers()}
      </div>
    </div>
  );
};

export default TrackNew;
