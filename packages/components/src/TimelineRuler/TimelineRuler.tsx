import { useEffect, useRef } from 'react';
import { TimeSelection, SpectralSelection } from '@audacity-ui/core';
import './TimelineRuler.css';

export interface TimelineRulerProps {
  /**
   * Zoom level in pixels per second
   */
  pixelsPerSecond: number;
  /**
   * Horizontal scroll offset in pixels
   */
  scrollX?: number;
  /**
   * Total duration of the timeline in seconds
   */
  totalDuration: number;
  /**
   * Width of the ruler in pixels
   */
  width: number;
  /**
   * Height of the ruler in pixels
   */
  height?: number;
  /**
   * Left padding in pixels (for alignment with track content)
   */
  leftPadding?: number;
  /**
   * Time selection to display in bottom half
   */
  timeSelection?: TimeSelection | null;
  /**
   * Spectral selection to display as grey highlight (for partial-height marquee)
   */
  spectralSelection?: SpectralSelection | null;
  /**
   * Background color
   */
  backgroundColor?: string;
  /**
   * Text color for time labels
   */
  textColor?: string;
  /**
   * Line color for divider line
   */
  lineColor?: string;
  /**
   * Color for tick marks
   */
  tickColor?: string;
  /**
   * Color for time selection overlay in ruler
   */
  selectionColor?: string;
  /**
   * Color for spectral selection highlight in ruler
   */
  spectralHighlightColor?: string;
}

const DEFAULT_HEIGHT = 40;
const DEFAULT_LEFT_PADDING = 12;

export function TimelineRuler({
  pixelsPerSecond,
  scrollX = 0,
  totalDuration,
  width,
  height = DEFAULT_HEIGHT,
  leftPadding = DEFAULT_LEFT_PADDING,
  timeSelection = null,
  spectralSelection = null,
  backgroundColor = '#E3E3E8',
  textColor = '#14151A',
  lineColor = '#D4D5D9',
  tickColor = '#828387',
  selectionColor = 'rgba(255, 255, 255, 0.5)',
  spectralHighlightColor = 'rgba(130, 131, 135, 0.3)',
}: TimelineRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw time selection in bottom half (if present)
    const midHeight = Math.floor(height / 2);
    if (timeSelection) {
      // Don't add leftPadding - selection should align with canvas below which has leftPadding=0
      const startX = timeSelection.startTime * pixelsPerSecond - scrollX;
      const endX = timeSelection.endTime * pixelsPerSecond - scrollX;

      ctx.fillStyle = selectionColor;
      ctx.fillRect(startX, midHeight, endX - startX, height - midHeight);

      // Borders removed for cleaner look with blend mode
    }

    // Draw spectral selection as grey highlight in bottom half (for partial-height marquee)
    if (spectralSelection && !timeSelection) {
      const startX = spectralSelection.startTime * pixelsPerSecond - scrollX;
      const endX = spectralSelection.endTime * pixelsPerSecond - scrollX;

      ctx.fillStyle = spectralHighlightColor;
      ctx.fillRect(startX, midHeight, endX - startX, height - midHeight);
    }

    // Draw horizontal divider line at middle (skip the leftPadding area)
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPadding, midHeight + 0.5); // Start after the left padding box
    ctx.lineTo(width, midHeight + 0.5);
    ctx.stroke();

    // Draw time markers
    drawTimeMarkers(
      ctx,
      pixelsPerSecond,
      scrollX,
      totalDuration,
      width,
      height,
      leftPadding,
      textColor,
      lineColor,
      tickColor
    );
  }, [pixelsPerSecond, scrollX, totalDuration, width, height, leftPadding, timeSelection, spectralSelection, backgroundColor, textColor, lineColor, tickColor, selectionColor, spectralHighlightColor]);

  return (
    <canvas
      ref={canvasRef}
      className="timeline-ruler"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
      }}
    />
  );
}

function drawTimeMarkers(
  ctx: CanvasRenderingContext2D,
  pixelsPerSecond: number,
  scrollX: number,
  totalDuration: number,
  width: number,
  height: number,
  leftPadding: number,
  textColor: string,
  topTickColor: string,
  bottomTickColor: string
) {
  const midHeight = height / 2;

  // Determine major interval based on zoom level
  let majorInterval = 1; // seconds
  if (pixelsPerSecond < 20) {
    majorInterval = 10;
  } else if (pixelsPerSecond < 50) {
    majorInterval = 5;
  } else if (pixelsPerSecond < 100) {
    majorInterval = 2;
  } else if (pixelsPerSecond < 200) {
    majorInterval = 1;
  } else {
    majorInterval = 0.5;
  }

  // Minor interval is 1/5 of major interval
  const minorInterval = majorInterval / 5;

  const startTime = Math.floor(scrollX / pixelsPerSecond / minorInterval) * minorInterval;
  const endTime = Math.ceil((scrollX + width) / pixelsPerSecond / minorInterval) * minorInterval;

  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = textColor;
  ctx.lineWidth = 1;

  // Draw bottom section ticks (both major and minor)
  for (let time = startTime; time <= endTime; time += minorInterval) {
    // Avoid floating point precision issues
    const roundedTime = Math.round(time / minorInterval) * minorInterval;
    const x = roundedTime * pixelsPerSecond - scrollX + leftPadding;

    if (x < leftPadding || x > width) continue;

    // Check if this is a major tick
    const isMajor = Math.abs(roundedTime % majorInterval) < 0.001;
    const tickX = Math.floor(x) + 0.5; // Offset by 0.5 for crisp 1px line

    if (isMajor) {
      // Major tick - full height in bottom section, same color as top
      ctx.strokeStyle = topTickColor;
      ctx.beginPath();
      ctx.moveTo(tickX, midHeight);
      ctx.lineTo(tickX, height);
      ctx.stroke();
    } else {
      // Minor tick - shorter, in bottom section only
      ctx.strokeStyle = bottomTickColor;
      const minorTickHeight = (height - midHeight) * 0.4; // 40% of bottom section height
      ctx.beginPath();
      ctx.moveTo(tickX, height - minorTickHeight);
      ctx.lineTo(tickX, height);
      ctx.stroke();
    }
  }

  // Draw top section ticks (only for major intervals)
  ctx.strokeStyle = topTickColor;
  for (let time = startTime; time <= endTime; time += majorInterval) {
    const x = time * pixelsPerSecond - scrollX + leftPadding;

    if (x < leftPadding || x > width) continue;

    const tickX = Math.floor(x) + 0.5; // Offset by 0.5 for crisp 1px line

    // Draw tick in top section - full height from top to midline
    ctx.beginPath();
    ctx.moveTo(tickX, 0);
    ctx.lineTo(tickX, midHeight);
    ctx.stroke();
  }

  // Draw time labels for major ticks only
  for (let time = startTime; time <= endTime; time += majorInterval) {
    const x = time * pixelsPerSecond - scrollX + leftPadding;

    if (x < leftPadding || x > width) continue;

    const label = formatTime(time);
    // Position label in top section, left-aligned to tick mark
    const textY = midHeight / 2 + 4; // Center in top half
    ctx.fillText(label, x + 4, textY); // 4px offset from tick for spacing
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0) {
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  }
  return `${secs.toFixed(1)}s`;
}
