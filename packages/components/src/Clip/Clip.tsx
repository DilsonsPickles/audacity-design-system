import * as React from 'react';
import { useEffect, useRef } from 'react';
import type { Clip as ClipData, EnvelopePoint, TimeSelection, ClipTheme } from '@audacity-ui/core';
import './Clip.css';

export interface ClipProps {
  /** Clip data containing waveform, envelope points, etc. */
  clip: ClipData;

  /** X position in pixels */
  x: number;

  /** Y position in pixels */
  y: number;

  /** Width in pixels */
  width: number;

  /** Height in pixels */
  height: number;

  /** Pixels per second for time-to-pixel conversion */
  pixelsPerSecond: number;

  /** Whether clip is selected */
  selected?: boolean;

  /** Whether envelope mode is active */
  envelopeMode?: boolean;

  /** Whether the clip header is being hovered */
  headerHovered?: boolean;

  /** Time selection range (if any) */
  timeSelection?: TimeSelection | null;

  /** Theme colors for rendering */
  theme: ClipTheme;

  /** Index of hovered envelope segment (for segment dragging) */
  hoveredSegmentIndex?: number | null;

  /** Envelope point being dragged (for visual feedback) */
  draggedPointIndex?: number | null;

  /** Mouse event handlers */
  onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;

  /** Custom className */
  className?: string;
}

// Constants
const CLIP_HEADER_HEIGHT = 20;
const LEFT_PADDING = 12;
const INFINITY_ZONE_HEIGHT = 1; // Last 1px represents -infinity dB

// Non-linear dB scale conversion helpers
// Uses a power curve with 0dB positioned at about 2/3 down the clip
const dbToYNonLinear = (db: number, y: number, height: number): number => {
  const minDb = -60;
  const maxDb = 12;
  const usableHeight = height - INFINITY_ZONE_HEIGHT;

  // -Infinity maps to the bottom (y + height)
  if (db === -Infinity || db < minDb) {
    return y + height;
  }

  // Power curve mapping with 0dB at ~2/3 down
  // Using power of 3.0 to position 0dB lower in the clip
  const dbRange = maxDb - minDb; // 72 dB total range
  const linear = (db - minDb) / dbRange; // 0 to 1

  // Apply power curve: higher power pushes 0dB lower
  const normalized = Math.pow(linear, 3.0);

  return y + usableHeight - normalized * usableHeight;
};

// Helper to evaluate envelope curve at a given time
const evaluateEnvelope = (time: number, envelopePoints: EnvelopePoint[]): number => {
  if (envelopePoints.length === 0) return 0; // 0dB if no envelope

  // Find surrounding points
  let beforePoint: EnvelopePoint | null = null;
  let afterPoint: EnvelopePoint | null = null;

  for (let i = 0; i < envelopePoints.length; i++) {
    const point = envelopePoints[i];
    if (point.time <= time) {
      beforePoint = point;
    }
    if (point.time >= time && !afterPoint) {
      afterPoint = point;
    }
  }

  // Handle edge cases
  if (!beforePoint && afterPoint) return afterPoint.db;
  if (beforePoint && !afterPoint) return beforePoint.db;
  if (!beforePoint && !afterPoint) return 0;

  // Linear interpolation
  if (beforePoint && afterPoint && beforePoint.time !== afterPoint.time) {
    const t = (time - beforePoint.time) / (afterPoint.time - beforePoint.time);
    return beforePoint.db + t * (afterPoint.db - beforePoint.db);
  }

  return beforePoint?.db ?? 0;
};

export const Clip: React.FC<ClipProps> = ({
  clip,
  x,
  y,
  width,
  height,
  pixelsPerSecond,
  selected = false,
  envelopeMode = false,
  headerHovered = false,
  timeSelection = null,
  theme,
  hoveredSegmentIndex = null,
  draggedPointIndex = null,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw clip background
    ctx.fillStyle = theme.clipBackground;
    ctx.fillRect(0, 0, width, height);

    // Draw clip header with rounded top corners
    ctx.fillStyle = theme.clipHeaderBackground;
    ctx.beginPath();
    ctx.moveTo(4, 0); // Start after left radius
    ctx.lineTo(width - 4, 0); // Top edge
    ctx.arcTo(width, 0, width, 4, 4); // Top-right corner
    ctx.lineTo(width, CLIP_HEADER_HEIGHT); // Right edge of header
    ctx.lineTo(0, CLIP_HEADER_HEIGHT); // Bottom edge of header
    ctx.lineTo(0, 4); // Left edge
    ctx.arcTo(0, 0, 4, 0, 4); // Top-left corner
    ctx.closePath();
    ctx.fill();

    // Draw clip name in header
    ctx.fillStyle = theme.clipHeaderText;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(clip.name, LEFT_PADDING, CLIP_HEADER_HEIGHT / 2);

    // Draw 3-dot menu button in top-right corner
    const menuX = width - 16;
    const menuY = CLIP_HEADER_HEIGHT / 2;
    const dotRadius = 1.5;
    const dotSpacing = 4;

    ctx.fillStyle = theme.clipHeaderText;
    // Draw three dots horizontally
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(menuX + i * dotSpacing, menuY, dotRadius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Clip content area
    const contentY = CLIP_HEADER_HEIGHT;
    const contentHeight = height - CLIP_HEADER_HEIGHT;

    // Draw envelope fill (automation overlay)
    if (clip.envelopePoints.length > 0) {
      const fillColor = envelopeMode
        ? theme.automationOverlayActive
        : theme.automationOverlayIdle;

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(0, contentY);

      // Top edge following envelope curve
      for (let px = 0; px <= width; px += 2) {
        const time = clip.startTime + px / pixelsPerSecond;
        const db = evaluateEnvelope(time, clip.envelopePoints);
        const yPos = dbToYNonLinear(db, contentY, contentHeight);
        ctx.lineTo(px, yPos);
      }

      // Close path along bottom
      ctx.lineTo(width, contentY + contentHeight);
      ctx.lineTo(0, contentY + contentHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Draw time selection overlay
    if (timeSelection) {
      const selStart = Math.max(timeSelection.startTime, clip.startTime);
      const selEnd = Math.min(timeSelection.endTime, clip.startTime + clip.duration);

      if (selStart < selEnd) {
        const selStartX = (selStart - clip.startTime) * pixelsPerSecond;
        const selEndX = (selEnd - clip.startTime) * pixelsPerSecond;
        const selWidth = selEndX - selStartX;

        ctx.fillStyle = theme.timeSelectionOverlay;
        ctx.fillRect(selStartX, contentY, selWidth, contentHeight);
      }
    }

    // Draw waveform - compressed Audacity style with min/max bars
    if (clip.waveform.length > 0) {
      ctx.fillStyle = theme.waveformColor;
      ctx.strokeStyle = theme.waveformColor;
      ctx.lineWidth = 1;

      const centerY = contentY + contentHeight / 2;
      const maxAmplitude = contentHeight / 2;

      // Helper to get gain at time
      const getGainAtTime = (time: number): number => {
        if (clip.envelopePoints.length === 0) return 1.0;
        const db = evaluateEnvelope(time, clip.envelopePoints);
        return db === -Infinity ? 0 : Math.pow(10, db / 20);
      };

      // Draw waveform using min/max per pixel column
      const samplesPerPixel = clip.waveform.length / width;

      for (let px = 0; px < width; px++) {
        const sampleStart = Math.floor(px * samplesPerPixel);
        const sampleEnd = Math.floor((px + 1) * samplesPerPixel);

        // Initialize to first sample to handle bipolar waveforms
        let min = clip.waveform[sampleStart] || 0;
        let max = clip.waveform[sampleStart] || 0;

        // Find min/max in this pixel column
        for (let i = sampleStart; i < sampleEnd && i < clip.waveform.length; i++) {
          const sample = clip.waveform[i];
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        // Apply envelope gain
        const time = clip.startTime + (px / width) * clip.duration;
        const gain = getGainAtTime(time);

        min *= gain;
        max *= gain;

        // Draw vertical bar from min to max
        const y1 = centerY - max * maxAmplitude;
        const y2 = centerY - min * maxAmplitude;

        // Fill rect for solid appearance
        ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
      }
    }

    // Draw envelope line
    if (clip.envelopePoints.length > 0) {
      const lineColor =
        hoveredSegmentIndex !== null
          ? theme.envelopeLineColorHover
          : theme.envelopeLineColor;

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let isFirst = true;
      for (let px = 0; px <= width; px += 2) {
        const time = clip.startTime + px / pixelsPerSecond;
        const db = evaluateEnvelope(time, clip.envelopePoints);
        const yPos = dbToYNonLinear(db, contentY, contentHeight);

        if (isFirst) {
          ctx.moveTo(px, yPos);
          isFirst = false;
        } else {
          ctx.lineTo(px, yPos);
        }
      }
      ctx.stroke();

      // Draw envelope control points
      clip.envelopePoints.forEach((point, index) => {
        const pointX = (point.time - clip.startTime) * pixelsPerSecond;
        const pointY = dbToYNonLinear(point.db, contentY, contentHeight);

        const isHovered = draggedPointIndex === index;
        const pointColor = isHovered
          ? theme.envelopePointColorHover
          : theme.envelopePointColor;

        ctx.fillStyle = pointColor;
        ctx.strokeStyle = theme.envelopeLineColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(pointX, pointY, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw hovered segment overlay
    if (hoveredSegmentIndex !== null && clip.envelopePoints.length > 1) {
      const startPoint = clip.envelopePoints[hoveredSegmentIndex];
      const endPoint = clip.envelopePoints[hoveredSegmentIndex + 1];

      if (startPoint && endPoint) {
        const startX = (startPoint.time - clip.startTime) * pixelsPerSecond;
        const endX = (endPoint.time - clip.startTime) * pixelsPerSecond;

        ctx.fillStyle = theme.segmentHoverOverlay;
        ctx.fillRect(startX, contentY, endX - startX, contentHeight);

        // Redraw segment in hover color
        ctx.strokeStyle = theme.segmentHoverColor;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let px = startX; px <= endX; px += 2) {
          const time = clip.startTime + px / pixelsPerSecond;
          const db = evaluateEnvelope(time, clip.envelopePoints);
          const yPos = dbToYNonLinear(db, contentY, contentHeight);

          if (px === startX) {
            ctx.moveTo(px, yPos);
          } else {
            ctx.lineTo(px, yPos);
          }
        }
        ctx.stroke();
      }
    }

    // Draw clip border with rounded corners
    ctx.strokeStyle = theme.clipBorder;
    ctx.lineWidth = selected ? 2 : 1;
    const borderRadius = 4;
    const borderOffset = ctx.lineWidth / 2;

    ctx.beginPath();
    ctx.moveTo(borderRadius + borderOffset, borderOffset);
    ctx.lineTo(width - borderRadius - borderOffset, borderOffset);
    ctx.arcTo(width - borderOffset, borderOffset, width - borderOffset, borderRadius + borderOffset, borderRadius);
    ctx.lineTo(width - borderOffset, height - borderRadius - borderOffset);
    ctx.arcTo(width - borderOffset, height - borderOffset, width - borderRadius - borderOffset, height - borderOffset, borderRadius);
    ctx.lineTo(borderRadius + borderOffset, height - borderOffset);
    ctx.arcTo(borderOffset, height - borderOffset, borderOffset, height - borderRadius - borderOffset, borderRadius);
    ctx.lineTo(borderOffset, borderRadius + borderOffset);
    ctx.arcTo(borderOffset, borderOffset, borderRadius + borderOffset, borderOffset, borderRadius);
    ctx.closePath();
    ctx.stroke();
  }, [
    clip,
    width,
    height,
    pixelsPerSecond,
    selected,
    envelopeMode,
    headerHovered,
    timeSelection,
    theme,
    hoveredSegmentIndex,
    draggedPointIndex,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`clip ${selected ? 'clip--selected' : ''} ${className}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        cursor: 'default',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    />
  );
};

export default Clip;
