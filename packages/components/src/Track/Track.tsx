import React, { useRef, useEffect, useState } from 'react';
import './Track.css';

export interface TrackClip {
  id: string | number;
  name: string;
  start: number;
  duration: number;
  selected?: boolean;
  waveform?: number[];
  waveformLeft?: number[]; // Left channel waveform for stereo tracks
  waveformRight?: number[]; // Right channel waveform for stereo tracks
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
   * Whether to display spectrogram view
   */
  spectrogramMode?: boolean;

  /**
   * Whether to display split view (waveform + spectrogram)
   */
  splitView?: boolean;

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
  spectrogramMode = false,
  splitView = false,
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
  const [cursorStyle, setCursorStyle] = useState<string>('default');

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

      // Clip background (dark for spectrogram, colored for waveform)
      const clipBgColor = spectrogramMode
        ? '#1a1d2e'
        : getClipBackgroundColor(trackIndex, clip.selected || false);
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

      // Draw waveform or spectrogram if available
      const hasWaveform = (clip.waveform && clip.waveform.length > 0) ||
                          (clip.waveformLeft && clip.waveformLeft.length > 0 && clip.waveformRight && clip.waveformRight.length > 0);

      if (hasWaveform) {
        const waveformAreaTop = clipHeaderHeight;
        const waveformAreaHeight = height - clipHeaderHeight;

        if (splitView) {
          // Draw split view: spectrogram on top, waveform on bottom
          const splitY = waveformAreaTop + waveformAreaHeight / 2;
          const halfHeight = waveformAreaHeight / 2;
          const isStereo = clip.waveformLeft && clip.waveformRight;

          // Draw dark background for spectrogram section
          ctx.fillStyle = '#1a1d2e';
          ctx.fillRect(clipX, waveformAreaTop, clipWidth, halfHeight);

          // Draw spectrogram in top half
          const frequencyBands = 32; // Fewer bands for split view

          if (isStereo) {
            // Stereo: L spectral channel on top quarter, R spectral channel on second quarter
            const quarterHeight = halfHeight / 2;

            // Draw L channel spectrogram (top quarter)
            const samplesPerPixelL = clip.waveformLeft!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelL);
              if (sampleIndex >= clip.waveformLeft!.length) break;

              for (let band = 0; band < frequencyBands; band++) {
                const frequency = band / frequencyBands;
                const sample = clip.waveformLeft![sampleIndex];
                const phase = (sampleIndex + band * 10) * 0.1;
                const bandEnergy = Math.abs(sample) * (1 - frequency * 0.5) * (0.5 + 0.5 * Math.sin(phase));
                const intensity = Math.min(1, bandEnergy * 2);

                let r, g, b;
                if (intensity < 0.5) {
                  r = 0;
                  g = Math.floor(intensity * 2 * 255);
                  b = Math.floor(255 - intensity * 2 * 255);
                } else {
                  r = Math.floor((intensity - 0.5) * 2 * 255);
                  g = 255;
                  b = 0;
                }

                const alpha = Math.max(0.3, intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                const y = waveformAreaTop + (1 - frequency) * quarterHeight;
                const bandHeight = Math.max(1, quarterHeight / frequencyBands);
                ctx.fillRect(clipX + px, y, 1, bandHeight);
              }
            }

            // Draw separator line between L and R spectral
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clipX, waveformAreaTop + quarterHeight);
            ctx.lineTo(clipX + clipWidth, waveformAreaTop + quarterHeight);
            ctx.stroke();

            // Draw R channel spectrogram (second quarter)
            const samplesPerPixelR = clip.waveformRight!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelR);
              if (sampleIndex >= clip.waveformRight!.length) break;

              for (let band = 0; band < frequencyBands; band++) {
                const frequency = band / frequencyBands;
                const sample = clip.waveformRight![sampleIndex];
                const phase = (sampleIndex + band * 10) * 0.1;
                const bandEnergy = Math.abs(sample) * (1 - frequency * 0.5) * (0.5 + 0.5 * Math.sin(phase));
                const intensity = Math.min(1, bandEnergy * 2);

                let r, g, b;
                if (intensity < 0.5) {
                  r = 0;
                  g = Math.floor(intensity * 2 * 255);
                  b = Math.floor(255 - intensity * 2 * 255);
                } else {
                  r = Math.floor((intensity - 0.5) * 2 * 255);
                  g = 255;
                  b = 0;
                }

                const alpha = Math.max(0.3, intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                const y = waveformAreaTop + quarterHeight + (1 - frequency) * quarterHeight;
                const bandHeight = Math.max(1, quarterHeight / frequencyBands);
                ctx.fillRect(clipX + px, y, 1, bandHeight);
              }
            }
          } else {
            // Mono: single spectral channel in top half
            const waveformDataForSpectrogram = clip.waveform || [];
            const samplesPerPixel = waveformDataForSpectrogram.length / clipWidth;

            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixel);
              if (sampleIndex >= waveformDataForSpectrogram.length) break;

              for (let band = 0; band < frequencyBands; band++) {
                const frequency = band / frequencyBands;
                const sample = waveformDataForSpectrogram[sampleIndex];
                const phase = (sampleIndex + band * 10) * 0.1;
                const bandEnergy = Math.abs(sample) * (1 - frequency * 0.5) * (0.5 + 0.5 * Math.sin(phase));
                const intensity = Math.min(1, bandEnergy * 2);

                let r, g, b;
                if (intensity < 0.5) {
                  r = 0;
                  g = Math.floor(intensity * 2 * 255);
                  b = Math.floor(255 - intensity * 2 * 255);
                } else {
                  r = Math.floor((intensity - 0.5) * 2 * 255);
                  g = 255;
                  b = 0;
                }

                const alpha = Math.max(0.3, intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                const y = waveformAreaTop + (1 - frequency) * halfHeight;
                const bandHeight = Math.max(1, halfHeight / frequencyBands);
                ctx.fillRect(clipX + px, y, 1, bandHeight);
              }
            }
          }

          // Draw separator line between spectrogram and waveform
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(clipX, splitY);
          ctx.lineTo(clipX + clipWidth, splitY);
          ctx.stroke();

          // Draw waveform in bottom half
          if (isStereo) {
            // Stereo: split bottom half into L (top) and R (bottom)
            const stereoHeight = halfHeight / 2;
            const lChannelY = splitY + stereoHeight / 2;
            const rChannelY = splitY + stereoHeight + stereoHeight / 2;

            // Draw L channel (top of waveform area)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const samplesPerPixelL = clip.waveformLeft!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelL);
              if (sampleIndex >= clip.waveformLeft!.length) break;

              const sample = clip.waveformLeft![sampleIndex];
              const amplitude = Math.abs(sample);
              const waveformHeight = amplitude * (stereoHeight / 2) * 0.9;

              const x = clipX + px;
              const yTop = lChannelY - waveformHeight;
              const yBottom = lChannelY + waveformHeight;

              ctx.moveTo(x, yTop);
              ctx.lineTo(x, yBottom);
            }
            ctx.stroke();

            // Draw separator line between L and R
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clipX, splitY + stereoHeight);
            ctx.lineTo(clipX + clipWidth, splitY + stereoHeight);
            ctx.stroke();

            // Draw R channel (bottom of waveform area)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const samplesPerPixelR = clip.waveformRight!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelR);
              if (sampleIndex >= clip.waveformRight!.length) break;

              const sample = clip.waveformRight![sampleIndex];
              const amplitude = Math.abs(sample);
              const waveformHeight = amplitude * (stereoHeight / 2) * 0.9;

              const x = clipX + px;
              const yTop = rChannelY - waveformHeight;
              const yBottom = rChannelY + waveformHeight;

              ctx.moveTo(x, yTop);
              ctx.lineTo(x, yBottom);
            }
            ctx.stroke();
          } else {
            // Mono: single waveform centered in bottom half
            const waveformCenterY = splitY + halfHeight / 2;
            const monoWaveform = clip.waveform || [];
            const samplesPerPixelMono = monoWaveform.length / clipWidth;

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelMono);
              if (sampleIndex >= monoWaveform.length) break;

              const sample = monoWaveform[sampleIndex];
              const amplitude = Math.abs(sample);
              const waveformHeight = amplitude * (halfHeight / 2) * 0.9;

              const x = clipX + px;
              const yTop = waveformCenterY - waveformHeight;
              const yBottom = waveformCenterY + waveformHeight;

              ctx.moveTo(x, yTop);
              ctx.lineTo(x, yBottom);
            }
            ctx.stroke();
          }

        } else if (spectrogramMode) {
          // Draw spectrogram view
          const isStereo = clip.waveformLeft && clip.waveformRight;

          if (isStereo) {
            // Stereo spectrogram: L channel on top, R channel on bottom
            const halfHeight = waveformAreaHeight / 2;
            const frequencyBands = 64;

            // Draw L channel spectrogram (top half)
            const samplesPerPixelL = clip.waveformLeft!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelL);
              if (sampleIndex >= clip.waveformLeft!.length) break;

              for (let band = 0; band < frequencyBands; band++) {
                const frequency = band / frequencyBands;
                const sample = clip.waveformLeft![sampleIndex];
                const phase = (sampleIndex + band * 10) * 0.1;
                const bandEnergy = Math.abs(sample) * (1 - frequency * 0.5) * (0.5 + 0.5 * Math.sin(phase));
                const intensity = Math.min(1, bandEnergy * 2);

                let r, g, b;
                if (intensity < 0.5) {
                  r = 0;
                  g = Math.floor(intensity * 2 * 255);
                  b = Math.floor(255 - intensity * 2 * 255);
                } else {
                  r = Math.floor((intensity - 0.5) * 2 * 255);
                  g = 255;
                  b = 0;
                }

                const alpha = Math.max(0.3, intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                const y = waveformAreaTop + (1 - frequency) * halfHeight;
                const bandHeight = Math.max(1, halfHeight / frequencyBands);
                ctx.fillRect(clipX + px, y, 1, bandHeight);
              }
            }

            // Draw separator line between L and R
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clipX, waveformAreaTop + halfHeight);
            ctx.lineTo(clipX + clipWidth, waveformAreaTop + halfHeight);
            ctx.stroke();

            // Draw R channel spectrogram (bottom half)
            const samplesPerPixelR = clip.waveformRight!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelR);
              if (sampleIndex >= clip.waveformRight!.length) break;

              for (let band = 0; band < frequencyBands; band++) {
                const frequency = band / frequencyBands;
                const sample = clip.waveformRight![sampleIndex];
                const phase = (sampleIndex + band * 10) * 0.1;
                const bandEnergy = Math.abs(sample) * (1 - frequency * 0.5) * (0.5 + 0.5 * Math.sin(phase));
                const intensity = Math.min(1, bandEnergy * 2);

                let r, g, b;
                if (intensity < 0.5) {
                  r = 0;
                  g = Math.floor(intensity * 2 * 255);
                  b = Math.floor(255 - intensity * 2 * 255);
                } else {
                  r = Math.floor((intensity - 0.5) * 2 * 255);
                  g = 255;
                  b = 0;
                }

                const alpha = Math.max(0.3, intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                const y = waveformAreaTop + halfHeight + (1 - frequency) * halfHeight;
                const bandHeight = Math.max(1, halfHeight / frequencyBands);
                ctx.fillRect(clipX + px, y, 1, bandHeight);
              }
            }
          } else {
            // Mono spectrogram
            const waveformData = clip.waveform || [];
            const samplesPerPixel = waveformData.length / clipWidth;
            const frequencyBands = 64;

            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixel);
              if (sampleIndex >= waveformData.length) break;

              for (let band = 0; band < frequencyBands; band++) {
                const frequency = band / frequencyBands;
                const sample = waveformData[sampleIndex];
                const phase = (sampleIndex + band * 10) * 0.1;
                const bandEnergy = Math.abs(sample) * (1 - frequency * 0.5) * (0.5 + 0.5 * Math.sin(phase));
                const intensity = Math.min(1, bandEnergy * 2);

                let r, g, b;
                if (intensity < 0.5) {
                  r = 0;
                  g = Math.floor(intensity * 2 * 255);
                  b = Math.floor(255 - intensity * 2 * 255);
                } else {
                  r = Math.floor((intensity - 0.5) * 2 * 255);
                  g = 255;
                  b = 0;
                }

                const alpha = Math.max(0.3, intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                const y = waveformAreaTop + (1 - frequency) * waveformAreaHeight;
                const bandHeight = Math.max(1, waveformAreaHeight / frequencyBands);
                ctx.fillRect(clipX + px, y, 1, bandHeight);
              }
            }
          }
        } else {
          // Draw traditional waveform
          // Check if stereo waveforms are available
          const isStereo = clip.waveformLeft && clip.waveformRight;

          if (isStereo) {
            // Stereo: L channel on top half, R channel on bottom half
            const halfHeight = waveformAreaHeight / 2;
            const lChannelCenterY = waveformAreaTop + halfHeight / 2;
            const rChannelCenterY = waveformAreaTop + halfHeight + halfHeight / 2;

            // Draw L channel
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const samplesPerPixelL = clip.waveformLeft!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelL);
              if (sampleIndex >= clip.waveformLeft!.length) break;

              const sample = clip.waveformLeft![sampleIndex];
              const amplitude = Math.abs(sample);
              const waveformHeight = amplitude * (halfHeight / 2) * 0.9;

              const x = clipX + px;
              const yTop = lChannelCenterY - waveformHeight;
              const yBottom = lChannelCenterY + waveformHeight;

              ctx.moveTo(x, yTop);
              ctx.lineTo(x, yBottom);
            }
            ctx.stroke();

            // Draw 1px black separator line
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clipX, waveformAreaTop + halfHeight);
            ctx.lineTo(clipX + clipWidth, waveformAreaTop + halfHeight);
            ctx.stroke();

            // Draw R channel
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const samplesPerPixelR = clip.waveformRight!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixelR);
              if (sampleIndex >= clip.waveformRight!.length) break;

              const sample = clip.waveformRight![sampleIndex];
              const amplitude = Math.abs(sample);
              const waveformHeight = amplitude * (halfHeight / 2) * 0.9;

              const x = clipX + px;
              const yTop = rChannelCenterY - waveformHeight;
              const yBottom = rChannelCenterY + waveformHeight;

              ctx.moveTo(x, yTop);
              ctx.lineTo(x, yBottom);
            }
            ctx.stroke();
          } else {
            // Mono: single waveform centered
            const waveformCenterY = waveformAreaTop + waveformAreaHeight / 2;

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const samplesPerPixel = clip.waveform!.length / clipWidth;
            for (let px = 0; px < clipWidth; px++) {
              const sampleIndex = Math.floor(px * samplesPerPixel);
              if (sampleIndex >= clip.waveform!.length) break;

              const sample = clip.waveform![sampleIndex];
              const amplitude = Math.abs(sample);
              const waveformHeight = amplitude * (waveformAreaHeight / 2) * 0.9;

              const x = clipX + px;
              const yTop = waveformCenterY - waveformHeight;
              const yBottom = waveformCenterY + waveformHeight;

              ctx.moveTo(x, yTop);
              ctx.lineTo(x, yBottom);
            }
            ctx.stroke();
          }
        }
      }
    });
  }, [clips, height, trackIndex, spectrogramMode, splitView, isSelected, isFocused, pixelsPerSecond, width, backgroundColor]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Clip header height (should match the value used in rendering)
    const CLIP_HEADER_HEIGHT = 20;

    // Check if hovering over a clip header
    let overClipHeader = false;
    for (const clip of clips) {
      const clipX = clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;

      if (x >= clipX && x < clipX + clipWidth && y <= CLIP_HEADER_HEIGHT) {
        overClipHeader = true;
        break;
      }
    }

    // Update cursor style
    setCursorStyle(overClipHeader ? 'pointer' : 'default');
  };

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
        onMouseMove={handleMouseMove}
        className="track-canvas"
        style={{ cursor: cursorStyle }}
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
