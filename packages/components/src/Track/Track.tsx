import React, { useRef, useEffect } from 'react';
import './Track.css';

export interface TrackClip {
  id: string | number;
  name: string;
  start: number;
  duration: number;
  selected?: boolean;
  waveform?: number[];
  envelopePoints?: Array<{ time: number; value: number }>;
}

export interface TrackProps {
  /**
   * Array of clips on this track
   */
  clips: TrackClip[];

  /**
   * Track height in pixels
   * @default 114
   */
  height?: number;

  /**
   * Track index (used for color theming)
   */
  trackIndex: number;

  /**
   * Whether the track is selected
   */
  isSelected?: boolean;

  /**
   * Whether the track has focus (shows focus border)
   */
  isFocused?: boolean;

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
   * Y offset for rendering (used when part of a track list)
   */
  yOffset?: number;

  /**
   * Background color for canvas
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
}

/**
 * Track component - renders a single audio track with clips on a canvas
 */
export const Track: React.FC<TrackProps> = ({
  clips,
  height = 114,
  trackIndex,
  isSelected = false,
  isFocused = false,
  pixelsPerSecond = 100,
  width,
  yOffset = 0,
  backgroundColor = '#212433',
  onClipClick,
  onTrackClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track background
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, canvas.width, height);

    // Note: Focus borders are rendered via CSS wrapper, not on canvas

    // Draw clips
    clips.forEach(clip => {
      const clipX = clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;
      const clipHeaderHeight = 20;

      // Clip background
      const clipBgColor = getClipBackgroundColor(trackIndex, clip.selected || false);
      ctx.fillStyle = clipBgColor;
      ctx.fillRect(clipX, clipHeaderHeight, clipWidth, height - clipHeaderHeight);

      // Clip header
      const clipHeaderColor = getClipHeaderColor(trackIndex, clip.selected || false);
      ctx.fillStyle = clipHeaderColor;
      ctx.fillRect(clipX, 0, clipWidth, clipHeaderHeight);

      // Clip border
      ctx.strokeStyle = clip.selected ? '#ffffff' : '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(clipX, 0, clipWidth, height);

      // Clip name
      ctx.fillStyle = clip.selected ? '#14151A' : '#14151A';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(clip.name, clipX + 8, 14);
    });
  }, [clips, height, trackIndex, isSelected, isFocused, pixelsPerSecond, width, backgroundColor]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Clip header height (should match the value used in rendering)
    const CLIP_HEADER_HEIGHT = 20;

    // Check if a clip header was clicked
    let clipClicked = false;
    for (const clip of clips) {
      const clipX = clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;

      // Only select clip if click is within the header area (top 20px of the clip)
      if (x >= clipX && x < clipX + clipWidth && y <= CLIP_HEADER_HEIGHT) {
        onClipClick?.(clip.id);
        clipClicked = true;
        break;
      }
    }

    // If no clip header was clicked, select the track
    if (!clipClicked) {
      onTrackClick?.();
    }
  };

  return (
    <div className={`track-wrapper ${isFocused ? 'track-wrapper--focused' : ''}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        className="track-canvas"
      />
    </div>
  );
};

// Helper functions for clip colors (matching Figma design tokens)
function getClipBackgroundColor(trackIndex: number, selected: boolean): string {
  const colors = {
    track1: { normal: '#6DB9FF', selected: '#C0D9FF' },
    track2: { normal: '#C1BFFE', selected: '#D5D3FE' },
    track3: { normal: '#ECA0D9', selected: '#EFD1EA' },
  };

  const trackKey = `track${(trackIndex % 3) + 1}` as keyof typeof colors;
  return selected ? colors[trackKey].selected : colors[trackKey].normal;
}

function getClipHeaderColor(trackIndex: number, selected: boolean): string {
  const colors = {
    track1: { normal: '#3FA8FF', selected: '#DEEBFF' },
    track2: { normal: '#ADABFC', selected: '#E9E8FF' },
    track3: { normal: '#E787D0', selected: '#F6E8F4' },
  };

  const trackKey = `track${(trackIndex % 3) + 1}` as keyof typeof colors;
  return selected ? colors[trackKey].selected : colors[trackKey].normal;
}

export default Track;
