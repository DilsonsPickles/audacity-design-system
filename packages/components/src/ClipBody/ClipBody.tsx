import React, { useEffect, useRef } from 'react';
import type { ClipColor } from '../types/clip';
import type { TimeSelection } from '@audacity-ui/core';
import { renderMonoSpectrogram, renderStereoSpectrogram } from '../utils/spectrogram';
import { renderEnvelopeLine, renderEnvelopePoints, type EnvelopePointData } from '../utils/envelope';
import './ClipBody.css';

export type ClipBodyVariant = 'waveform' | 'spectrogram';
export type ClipBodyChannelMode = 'mono' | 'stereo' | 'split-mono' | 'split-stereo';

// Color shade 500 for stereo divider lines
const DIVIDER_COLORS: Record<ClipColor, string> = {
  cyan: '#6CCBD8',
  blue: '#84B5FF',
  violet: '#ADABFC',
  magenta: '#E1A3D6',
  red: '#F39999',
  orange: '#FFB183',
  yellow: '#ECCC73',
  green: '#8FCB7A',
  teal: '#5CC3A9',
  classic: '#CDD2F5',
};

export interface ClipBodyProps {
  /** Clip color from the 9-color palette */
  color?: ClipColor;
  /** Whether the clip is selected */
  selected?: boolean;
  /** Visualization type */
  variant?: ClipBodyVariant;
  /** Channel display mode */
  channelMode?: ClipBodyChannelMode;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Waveform image URL (for static display) */
  waveformSrc?: string;
  /** Waveform data array (normalized -1 to 1) - for mono */
  waveformData?: number[];
  /** Left channel waveform data (for stereo) */
  waveformLeft?: number[];
  /** Right channel waveform data (for stereo) */
  waveformRight?: number[];
  /** Envelope points for automation curve */
  envelope?: EnvelopePointData[];
  /** Whether to show the envelope overlay */
  showEnvelope?: boolean;
  /** Split ratio for stereo channels (0-1, default 0.5 for 50/50) */
  channelSplitRatio?: number;
  /** Time selection range (for marquee selection overlay) */
  timeSelection?: TimeSelection | null;
  /** Clip start time in seconds (needed for time selection positioning) */
  clipStartTime?: number;
  /** Clip duration in seconds (needed for time selection and envelope positioning) */
  clipDuration?: number;
  /** Trim start offset in seconds (for rendering only visible portion of waveform) */
  clipTrimStart?: number;
  /** Full duration of original audio before trimming (for waveform sample rate detection) */
  clipFullDuration?: number;
  /** Pixels per second (timeline zoom level) - for maintaining constant waveform scale */
  pixelsPerSecond?: number;
  /** Time selection overlay color (default: 'rgba(255, 255, 255, 0.3)') */
  timeSelectionColor?: string;
  /** Points to hide during drag (eating behavior) */
  hiddenPointIndices?: number[];
  /** Index of point being hovered (for hover visual feedback) */
  hoveredPointIndex?: number | null;
  /** Whether clip is within a time selection (for vibrant color rendering) */
  inTimeSelection?: boolean;
  /** Time selection range (for calculating overlay position) */
  timeSelectionRange?: { startTime: number; endTime: number } | null;
}

/**
 * ClipBody - The body/content area of an audio clip
 *
 * Supports multiple visualization modes:
 * - Waveform (mono/stereo/split)
 * - Spectrogram (mono/stereo)
 * - Envelope overlay for automation
 */
const ClipBodyComponent: React.FC<ClipBodyProps> = ({
  color = 'blue',
  selected = false,
  variant = 'waveform',
  channelMode = 'mono',
  width,
  height = 84,
  waveformSrc,
  waveformData,
  waveformLeft,
  waveformRight,
  envelope,
  showEnvelope = false,
  channelSplitRatio = 0.5,
  timeSelection = null,
  clipStartTime = 0,
  clipDuration = 1.0,
  clipTrimStart = 0,
  clipFullDuration,
  pixelsPerSecond = 100,
  timeSelectionColor = 'rgba(255, 255, 255, 0.3)',
  hiddenPointIndices = [],
  hoveredPointIndex = null,
  inTimeSelection = false,
  timeSelectionRange = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw waveform or spectrogram on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if we have any waveform data
    const isStereo = waveformLeft && waveformRight;
    const hasMono = waveformData && waveformData.length > 0;
    if (!isStereo && !hasMono) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = width || canvas.offsetWidth;
    const canvasHeight = height;

    // Set canvas dimensions for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Render time selection background overlay FIRST (vibrant background colors - drawn underneath waveform)
    if (inTimeSelection && timeSelectionRange) {
      const clipEndTime = clipStartTime + clipDuration;
      const overlapStart = Math.max(clipStartTime, timeSelectionRange.startTime);
      const overlapEnd = Math.min(clipEndTime, timeSelectionRange.endTime);

      if (overlapStart < overlapEnd) {
        // Calculate selection bounds in pixels
        const selStartX = (overlapStart - clipStartTime) * pixelsPerSecond;
        const selWidth = (overlapEnd - overlapStart) * pixelsPerSecond;

        // Background color map for selected regions
        const bgColorMap: Record<string, string> = {
          red: '#FFDEE6',     // Vibrant pink background for red clips
          cyan: '#9FFFFF',    // Light cyan background for cyan clips
          blue: '#B7FAFF',    // Light blue background for blue clips
          violet: '#E0F0FF',  // Light violet background for violet clips
          magenta: '#FFE8FF', // Light magenta background for magenta clips
          orange: '#FFF6D0',  // Light orange background for orange clips
          yellow: '#FFFFC0',  // Light yellow background for yellow clips
          green: '#C2FFC7',   // Light green background for green clips
          teal: '#8FFFF6',    // Light teal background for teal clips
        };

        ctx.fillStyle = bgColorMap[color] || '#FFFFFF';
        ctx.fillRect(selStartX, 0, selWidth, canvasHeight);
      }
    }

    // Render based on channel mode and variant
    if (channelMode === 'split-mono' || channelMode === 'split-stereo') {
      // Split view: spectrogram on top half, waveform on bottom half
      const splitY = canvasHeight / 2;
      const halfHeight = canvasHeight / 2;

      // Top half: spectrogram
      ctx.fillStyle = '#1a1d2e'; // Dark background for spectrogram
      ctx.fillRect(0, 0, canvasWidth, halfHeight);

      // Clip spectrogram rendering to top half only (prevents pixel blocks from extending below split line)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvasWidth, halfHeight);
      ctx.clip();

      if (channelMode === 'split-stereo' && isStereo) {
        // Stereo split: L and R spectrograms in top half (quarters)
        const quarterHeight = halfHeight / 2;

        // PERFORMANCE: Use reduced settings for real-time interaction
        const spectrogramOptions = {
          frequencyBands: 16,
          fftWindowSize: 64,
          intensityMultiplier: 1.5,
          pixelSkip: 4,
        };

        // Render L channel spectrogram (top quarter)
        renderMonoSpectrogram(ctx, waveformLeft, 0, 0, canvasWidth, quarterHeight, spectrogramOptions);

        // Separator between L and R spectral (using color-specific 700 shade)
        ctx.strokeStyle = DIVIDER_COLORS[color];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, quarterHeight);
        ctx.lineTo(canvasWidth, quarterHeight);
        ctx.stroke();

        // Render R channel spectrogram (second quarter)
        renderMonoSpectrogram(ctx, waveformRight, 0, quarterHeight, canvasWidth, quarterHeight, spectrogramOptions);
      } else if (hasMono) {
        // Mono split: single spectrogram in top half
        renderMonoSpectrogram(ctx, waveformData!, 0, 0, canvasWidth, halfHeight, {
          frequencyBands: 16,
          fftWindowSize: 64,
          intensityMultiplier: 1.5,
          pixelSkip: 4,
        });
      }

      ctx.restore(); // Remove clipping region

      // Separator line between spectrogram and waveform - solid black for clarity
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, splitY);
      ctx.lineTo(canvasWidth, splitY);
      ctx.stroke();

      // Bottom half: waveform
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1;

      if (channelMode === 'split-stereo' && isStereo) {
        // Stereo: L and R waveforms in bottom half (quarters)
        const stereoHeight = halfHeight / 2;
        const lChannelY = splitY + stereoHeight / 2;
        const rChannelY = splitY + stereoHeight + stereoHeight / 2;
        const maxAmplitude = (stereoHeight / 2) * 0.9;

        // Draw L channel waveform
        // Calculate sample offset based on trim start
        // Detect the actual sample rate from the waveform array length
        const fullDuration = clipFullDuration || (clipTrimStart + clipDuration);
        const detectedSampleRate = waveformLeft.length / fullDuration;

        // IMPORTANT: Use fixed pixelsPerSecond to maintain constant waveform scale
        // This prevents waveform stretching when trimming
        const secondsPerPixel = 1 / pixelsPerSecond;
        const samplesPerPixelL = secondsPerPixel * detectedSampleRate;
        const trimStartSample = Math.floor(clipTrimStart * detectedSampleRate);

        for (let px = 0; px < canvasWidth; px++) {
          const sampleStart = trimStartSample + Math.floor(px * samplesPerPixelL);
          const sampleEnd = trimStartSample + Math.floor((px + 1) * samplesPerPixelL);

          let min = waveformLeft[sampleStart] || 0;
          let max = waveformLeft[sampleStart] || 0;

          for (let i = sampleStart; i < sampleEnd && i < waveformLeft.length; i++) {
            const sample = waveformLeft[i];
            min = Math.min(min, sample);
            max = Math.max(max, sample);
          }

          const y1 = lChannelY - max * maxAmplitude;
          const y2 = lChannelY - min * maxAmplitude;
          ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
        }

        // Separator between L and R waveforms (using color-specific 700 shade)
        ctx.strokeStyle = DIVIDER_COLORS[color];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, splitY + stereoHeight);
        ctx.lineTo(canvasWidth, splitY + stereoHeight);
        ctx.stroke();

        // Draw R channel waveform
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        // Use same samples per pixel as L channel for consistency
        for (let px = 0; px < canvasWidth; px++) {
          const sampleStart = trimStartSample + Math.floor(px * samplesPerPixelL);
          const sampleEnd = trimStartSample + Math.floor((px + 1) * samplesPerPixelL);

          let min = waveformRight[sampleStart] || 0;
          let max = waveformRight[sampleStart] || 0;

          for (let i = sampleStart; i < sampleEnd && i < waveformRight.length; i++) {
            const sample = waveformRight[i];
            min = Math.min(min, sample);
            max = Math.max(max, sample);
          }

          const y1 = rChannelY - max * maxAmplitude;
          const y2 = rChannelY - min * maxAmplitude;
          ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
        }
      } else if (hasMono) {
        // Mono: single waveform centered in bottom half
        const waveformCenterY = splitY + halfHeight / 2;
        const maxAmplitude = (halfHeight / 2) * 0.9;

        // Calculate sample offset based on trim start
        // Detect the actual sample rate from the waveform array length
        const fullDuration = clipFullDuration || (clipTrimStart + clipDuration);
        const detectedSampleRate = waveformData!.length / fullDuration;

        // IMPORTANT: Use fixed pixelsPerSecond to maintain constant waveform scale
        // This prevents waveform stretching when trimming
        const secondsPerPixel = 1 / pixelsPerSecond;
        const samplesPerPixel = secondsPerPixel * detectedSampleRate;
        const trimStartSample = Math.floor(clipTrimStart * detectedSampleRate);

        for (let px = 0; px < canvasWidth; px++) {
          const sampleStart = trimStartSample + Math.floor(px * samplesPerPixel);
          const sampleEnd = trimStartSample + Math.floor((px + 1) * samplesPerPixel);

          let min = waveformData![sampleStart] || 0;
          let max = waveformData![sampleStart] || 0;

          for (let i = sampleStart; i < sampleEnd && i < waveformData!.length; i++) {
            const sample = waveformData![i];
            min = Math.min(min, sample);
            max = Math.max(max, sample);
          }

          const y1 = waveformCenterY - max * maxAmplitude;
          const y2 = waveformCenterY - min * maxAmplitude;
          ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
        }
      }
    } else if (variant === 'spectrogram') {
      // Pure spectrogram rendering (no split view)
      // PERFORMANCE: Use reduced settings for real-time interaction
      const spectrogramOptions = {
        frequencyBands: 16, // Reduced from 64 for performance
        fftWindowSize: 64, // Reduced from 256 for performance
        intensityMultiplier: 1.5,
        pixelSkip: 4, // Render every 4th pixel column
      };

      if (isStereo) {
        renderStereoSpectrogram(
          ctx,
          waveformLeft,
          waveformRight,
          0,
          0,
          canvasWidth,
          canvasHeight,
          channelSplitRatio,
          spectrogramOptions
        );

        // Draw channel divider line using color shade 700
        const lChannelHeight = canvasHeight * channelSplitRatio;
        ctx.strokeStyle = DIVIDER_COLORS[color];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, lChannelHeight);
        ctx.lineTo(canvasWidth, lChannelHeight);
        ctx.stroke();
      } else if (hasMono) {
        renderMonoSpectrogram(
          ctx,
          waveformData!,
          0,
          0,
          canvasWidth,
          canvasHeight,
          spectrogramOptions
        );
      }
    } else {
      // Pure waveform rendering (no split view)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1;

      if (isStereo) {
      // Stereo: L channel on top, R channel on bottom
      const lChannelHeight = canvasHeight * channelSplitRatio;
      const rChannelHeight = canvasHeight * (1 - channelSplitRatio);
      const lChannelCenterY = lChannelHeight / 2;
      const rChannelCenterY = lChannelHeight + rChannelHeight / 2;
      const lMaxAmplitude = lChannelHeight / 2 - 2;
      const rMaxAmplitude = rChannelHeight / 2 - 2;

      // Calculate sample offset based on trim start
      // Detect the actual sample rate from the waveform array length
      const fullDuration = clipFullDuration || (clipTrimStart + clipDuration);
      const detectedSampleRate = waveformLeft.length / fullDuration;

      // IMPORTANT: Use fixed pixelsPerSecond to maintain constant waveform scale
      // This prevents waveform stretching when trimming
      const secondsPerPixel = 1 / pixelsPerSecond;
      const samplesPerPixel = secondsPerPixel * detectedSampleRate;
      const trimStartSample = Math.floor(clipTrimStart * detectedSampleRate);

      // Calculate time selection bounds in pixels (if applicable)
      let selStartPx = -1;
      let selEndPx = -1;
      if (inTimeSelection && timeSelectionRange) {
        const clipEndTime = clipStartTime + clipDuration;
        const overlapStart = Math.max(clipStartTime, timeSelectionRange.startTime);
        const overlapEnd = Math.min(clipEndTime, timeSelectionRange.endTime);
        if (overlapStart < overlapEnd) {
          selStartPx = (overlapStart - clipStartTime) * pixelsPerSecond;
          selEndPx = (overlapEnd - clipStartTime) * pixelsPerSecond;
        }
      }

      // Waveform colors for selected regions
      const waveformColorMap: Record<string, string> = {
        red: '#3C2323',
        cyan: '#163134',
        blue: '#1D2B3F',
        violet: '#28283F',
        magenta: '#372534',
        orange: '#3F291D',
        yellow: '#3A3118',
        green: '#20311A',
        teal: '#122E27',
      };

      // Draw L channel
      for (let px = 0; px < canvasWidth; px++) {
        const sampleStart = trimStartSample + Math.floor(px * samplesPerPixel);
        const sampleEnd = trimStartSample + Math.floor((px + 1) * samplesPerPixel);

        let min = waveformLeft[sampleStart] || 0;
        let max = waveformLeft[sampleStart] || 0;

        for (let i = sampleStart; i < sampleEnd && i < waveformLeft.length; i++) {
          const sample = waveformLeft[i];
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        // Check if this pixel is within time selection
        const isInSelection = px >= selStartPx && px < selEndPx;
        ctx.fillStyle = isInSelection ? waveformColorMap[color] : 'rgba(0, 0, 0, 0.8)';

        const y1 = lChannelCenterY - max * lMaxAmplitude;
        const y2 = lChannelCenterY - min * lMaxAmplitude;
        ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
      }

      // Draw channel divider line using color shade 700
      ctx.strokeStyle = DIVIDER_COLORS[color];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, lChannelHeight);
      ctx.lineTo(canvasWidth, lChannelHeight);
      ctx.stroke();

      // Draw R channel
      // Use same samples per pixel as L channel for consistency
      for (let px = 0; px < canvasWidth; px++) {
        const sampleStart = trimStartSample + Math.floor(px * samplesPerPixel);
        const sampleEnd = trimStartSample + Math.floor((px + 1) * samplesPerPixel);

        let min = waveformRight[sampleStart] || 0;
        let max = waveformRight[sampleStart] || 0;

        for (let i = sampleStart; i < sampleEnd && i < waveformRight.length; i++) {
          const sample = waveformRight[i];
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        // Check if this pixel is within time selection
        const isInSelection = px >= selStartPx && px < selEndPx;
        ctx.fillStyle = isInSelection ? waveformColorMap[color] : 'rgba(0, 0, 0, 0.8)';

        const y1 = rChannelCenterY - max * rMaxAmplitude;
        const y2 = rChannelCenterY - min * rMaxAmplitude;
        ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
      }
    } else if (hasMono) {
      // Mono: single waveform centered
      const centerY = canvasHeight / 2;
      const maxAmplitude = canvasHeight / 2 - 2;

      // Calculate sample offset based on trim start
      // Detect the actual sample rate from the waveform array length
      const fullDuration = clipFullDuration || (clipTrimStart + clipDuration);
      const detectedSampleRate = waveformData!.length / fullDuration;

      // IMPORTANT: Use fixed pixelsPerSecond to maintain constant waveform scale
      // This prevents waveform stretching when trimming
      const secondsPerPixel = 1 / pixelsPerSecond;
      const samplesPerPixel = secondsPerPixel * detectedSampleRate;
      const trimStartSample = Math.floor(clipTrimStart * detectedSampleRate);

      // Calculate time selection bounds in pixels (if applicable)
      let selStartPx = -1;
      let selEndPx = -1;
      if (inTimeSelection && timeSelectionRange) {
        const clipEndTime = clipStartTime + clipDuration;
        const overlapStart = Math.max(clipStartTime, timeSelectionRange.startTime);
        const overlapEnd = Math.min(clipEndTime, timeSelectionRange.endTime);
        if (overlapStart < overlapEnd) {
          selStartPx = (overlapStart - clipStartTime) * pixelsPerSecond;
          selEndPx = (overlapEnd - clipStartTime) * pixelsPerSecond;
        }
      }

      // Waveform colors for selected regions
      const waveformColorMap: Record<string, string> = {
        red: '#3C2323',
        cyan: '#163134',
        blue: '#1D2B3F',
        violet: '#28283F',
        magenta: '#372534',
        orange: '#3F291D',
        yellow: '#3A3118',
        green: '#20311A',
        teal: '#122E27',
      };

      for (let px = 0; px < canvasWidth; px++) {
        const sampleStart = trimStartSample + Math.floor(px * samplesPerPixel);
        const sampleEnd = trimStartSample + Math.floor((px + 1) * samplesPerPixel);

        let min = waveformData![sampleStart] || 0;
        let max = waveformData![sampleStart] || 0;

        for (let i = sampleStart; i < sampleEnd && i < waveformData!.length; i++) {
          const sample = waveformData![i];
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        // Check if this pixel is within time selection
        const isInSelection = px >= selStartPx && px < selEndPx;
        ctx.fillStyle = isInSelection ? waveformColorMap[color] : 'rgba(0, 0, 0, 0.8)';

        const y1 = centerY - max * maxAmplitude;
        const y2 = centerY - min * maxAmplitude;
        ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
      }
      }
    }

    // Render envelope if showEnvelope is true (always show line, even with 0 points)
    if (showEnvelope) {
      // For split view, envelope only renders on the waveform portion (bottom half)
      let envelopeY = 0;
      let envelopeHeight = canvasHeight;

      if (channelMode === 'split-mono' || channelMode === 'split-stereo') {
        // Split view: waveform is in bottom half, so envelope should only render there
        envelopeY = canvasHeight / 2;
        envelopeHeight = canvasHeight / 2;
      }

      // Filter out hidden points for both line and control points
      const visiblePoints = envelope ? envelope.filter((_, index) => !hiddenPointIndices.includes(index)) : [];

      // Render envelope line (with hidden points filtered out)
      // Always render line even with 0 points (defaults to 0dB horizontal line)
      renderEnvelopeLine({
        ctx,
        points: visiblePoints,
        duration: clipDuration,
        x: 0,
        y: envelopeY,
        width: canvasWidth,
        height: envelopeHeight,
        color: 'white'
      });

      // Render envelope control points (only if there are real points, not just boundary points)
      // Don't render points if we only have 2 boundary points (at time=0 and time=duration)
      const hasBoundaryPoints = visiblePoints.length === 2 &&
                                visiblePoints[0].time === 0 &&
                                Math.abs(visiblePoints[1].time - clipDuration) < 0.001;

      if (visiblePoints.length > 0 && !hasBoundaryPoints) {
        renderEnvelopePoints({
          ctx,
          points: visiblePoints,
          duration: clipDuration,
          x: 0,
          y: envelopeY,
          width: canvasWidth,
          height: envelopeHeight,
          color: 'white',
          hoveredPointIndex
        });
      }
    }
  }, [waveformData, waveformLeft, waveformRight, width, height, variant, channelSplitRatio, color, envelope, showEnvelope, channelMode, clipDuration, clipTrimStart, clipFullDuration, pixelsPerSecond, inTimeSelection, timeSelectionRange, clipStartTime, hiddenPointIndices, hoveredPointIndex]);

  const className = [
    'clip-body',
    `clip-body--${color}`,
    `clip-body--${variant}`,
    `clip-body--${channelMode}`,
    selected && 'clip-body--selected',
    showEnvelope && envelope && 'clip-body--has-envelope',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    height: `${height}px`,
    ...(width && { width: `${width}px` }),
  };

  return (
    <div
      className={className}
      style={style}
      data-color={color}
      data-variant={variant}
      data-channel-mode={channelMode}
      data-selected={selected}
    >
      {/* Canvas-based rendering (waveform or spectrogram) */}
      {(waveformData || (waveformLeft && waveformRight)) && (
        <canvas
          ref={canvasRef}
          className="clip-body__waveform"
          style={{ display: 'block' }}
        />
      )}

      {/* Image-based waveform/spectrogram display */}
      {!waveformData && !waveformLeft && !waveformRight && waveformSrc && (
        <img
          src={waveformSrc}
          alt=""
          className="clip-body__waveform"
        />
      )}
    </div>
  );
};

// Memoize ClipBody to prevent expensive spectrogram re-renders during mouse interactions
export const ClipBody = React.memo(ClipBodyComponent);

export default ClipBody;
