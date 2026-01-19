import { useEffect, useRef } from 'react';
import { TimeSelection, SpectralSelection } from '@audacity-ui/core';
import { useTheme } from '../ThemeProvider';
import { CLIP_CONTENT_OFFSET } from '../constants';
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
  /**
   * Current cursor/playback position in seconds
   */
  cursorPosition?: number;
  /**
   * Time format to display
   */
  timeFormat?: 'minutes-seconds' | 'beats-measures';
  /**
   * Beats per minute (for beats-measures format)
   */
  bpm?: number;
  /**
   * Time signature numerator (beats per measure)
   */
  beatsPerMeasure?: number;
  /**
   * Whether loop region is enabled
   */
  loopRegionEnabled?: boolean;
  /**
   * Loop region start time in seconds
   */
  loopRegionStart?: number | null;
  /**
   * Loop region end time in seconds
   */
  loopRegionEnd?: number | null;
}

const DEFAULT_HEIGHT = 40;

export function TimelineRuler({
  pixelsPerSecond,
  scrollX = 0,
  totalDuration,
  width,
  height = DEFAULT_HEIGHT,
  timeSelection = null,
  spectralSelection = null,
  backgroundColor,
  textColor,
  lineColor,
  tickColor,
  selectionColor,
  spectralHighlightColor,
  cursorPosition,
  timeFormat = 'minutes-seconds',
  bpm = 120,
  beatsPerMeasure = 4,
  loopRegionEnabled = false,
  loopRegionStart = null,
  loopRegionEnd = null,
}: TimelineRulerProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use theme tokens as defaults if not provided
  const bgColor = backgroundColor ?? theme.background.surface.elevated;
  const txtColor = textColor ?? theme.foreground.text.primary;
  const lnColor = lineColor ?? theme.border.onElevated;
  const tckColor = tickColor ?? theme.audio.timeline.tickMajor;
  const selColor = selectionColor ?? 'rgba(255, 255, 255, 0.5)';
  const specColor = spectralHighlightColor ?? 'rgba(130, 131, 135, 0.3)';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate DPR but constrain to prevent exceeding canvas max size (~32,767px)
    const MAX_CANVAS_DIMENSION = 32000;
    const baseDpr = window.devicePixelRatio || 1;
    const maxDprForWidth = MAX_CANVAS_DIMENSION / width;
    const maxDprForHeight = MAX_CANVAS_DIMENSION / height;
    const dpr = Math.min(baseDpr, maxDprForWidth, maxDprForHeight);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw time selection in bottom half (if present)
    const midHeight = Math.floor(height / 2);
    if (timeSelection) {
      const startX = CLIP_CONTENT_OFFSET + timeSelection.startTime * pixelsPerSecond - scrollX;
      const endX = CLIP_CONTENT_OFFSET + timeSelection.endTime * pixelsPerSecond - scrollX;

      ctx.fillStyle = selColor;
      ctx.fillRect(startX, midHeight, endX - startX, height - midHeight);

      // Borders removed for cleaner look with blend mode
    }

    // Draw spectral selection as grey highlight in bottom half (for partial-height marquee)
    if (spectralSelection && !timeSelection) {
      const startX = CLIP_CONTENT_OFFSET + spectralSelection.startTime * pixelsPerSecond - scrollX;
      const endX = CLIP_CONTENT_OFFSET + spectralSelection.endTime * pixelsPerSecond - scrollX;

      ctx.fillStyle = specColor;
      ctx.fillRect(startX, midHeight, endX - startX, height - midHeight);
    }

    // Draw loop region in bottom half (if enabled and defined)
    if (loopRegionEnabled && loopRegionStart !== null && loopRegionEnd !== null) {
      const startX = CLIP_CONTENT_OFFSET + loopRegionStart * pixelsPerSecond - scrollX;
      const endX = CLIP_CONTENT_OFFSET + loopRegionEnd * pixelsPerSecond - scrollX;

      // Draw filled rectangle with semi-transparent green
      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
      ctx.fillRect(startX, midHeight, endX - startX, height - midHeight);

      // Draw border with solid green
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, midHeight, endX - startX, height - midHeight);
    }

    // Draw horizontal divider line at middle (skip the CLIP_CONTENT_OFFSET area)
    ctx.strokeStyle = lnColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CLIP_CONTENT_OFFSET, midHeight + 0.5); // Start after the left padding box
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
      txtColor,
      lnColor,
      tckColor,
      timeFormat,
      bpm,
      beatsPerMeasure
    );

    // Draw cursor position line (using text color)
    if (cursorPosition !== undefined && cursorPosition >= 0) {
      const cursorX = CLIP_CONTENT_OFFSET + cursorPosition * pixelsPerSecond - scrollX;

      // Only draw if cursor is visible in viewport
      if (cursorX >= CLIP_CONTENT_OFFSET && cursorX <= width) {
        ctx.strokeStyle = txtColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.floor(cursorX) + 0.5, 0);
        ctx.lineTo(Math.floor(cursorX) + 0.5, height);
        ctx.stroke();
      }
    }
  }, [pixelsPerSecond, scrollX, totalDuration, width, height, timeSelection, spectralSelection, bgColor, txtColor, lnColor, tckColor, selColor, specColor, cursorPosition, timeFormat, bpm, beatsPerMeasure, loopRegionEnabled, loopRegionStart, loopRegionEnd]);

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
  textColor: string,
  topTickColor: string,
  bottomTickColor: string,
  timeFormat: 'minutes-seconds' | 'beats-measures',
  bpm: number,
  beatsPerMeasure: number
) {
  if (timeFormat === 'beats-measures') {
    drawBeatsAndMeasures(ctx, pixelsPerSecond, scrollX, totalDuration, width, height, textColor, topTickColor, bottomTickColor, bpm, beatsPerMeasure);
  } else {
    drawMinutesAndSeconds(ctx, pixelsPerSecond, scrollX, totalDuration, width, height, textColor, topTickColor, bottomTickColor);
  }
}

function drawMinutesAndSeconds(
  ctx: CanvasRenderingContext2D,
  pixelsPerSecond: number,
  scrollX: number,
  totalDuration: number,
  width: number,
  height: number,
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
    const x = CLIP_CONTENT_OFFSET + roundedTime * pixelsPerSecond - scrollX;

    if (x < CLIP_CONTENT_OFFSET || x > width) continue;

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
    const x = CLIP_CONTENT_OFFSET + time * pixelsPerSecond - scrollX;

    if (x < CLIP_CONTENT_OFFSET || x > width) continue;

    const tickX = Math.floor(x) + 0.5; // Offset by 0.5 for crisp 1px line

    // Draw tick in top section - full height from top to midline
    ctx.beginPath();
    ctx.moveTo(tickX, 0);
    ctx.lineTo(tickX, midHeight);
    ctx.stroke();
  }

  // Draw time labels for major ticks only
  for (let time = startTime; time <= endTime; time += majorInterval) {
    const x = CLIP_CONTENT_OFFSET + time * pixelsPerSecond - scrollX;

    if (x < CLIP_CONTENT_OFFSET || x > width) continue;

    const label = formatTime(time);
    // Position label in top section, left-aligned to tick mark
    const textY = midHeight / 2 + 4; // Center in top half
    ctx.fillText(label, x + 4, textY); // 4px offset from tick for spacing
  }
}

function drawBeatsAndMeasures(
  ctx: CanvasRenderingContext2D,
  pixelsPerSecond: number,
  scrollX: number,
  totalDuration: number,
  width: number,
  height: number,
  textColor: string,
  topTickColor: string,
  bottomTickColor: string,
  bpm: number,
  beatsPerMeasure: number
) {
  const midHeight = height / 2;

  // Calculate seconds per beat and seconds per measure
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

  // Calculate visible range in measures and beats
  const startMeasure = Math.floor((scrollX / pixelsPerSecond) / secondsPerMeasure);
  const endMeasure = Math.ceil(((scrollX + width) / pixelsPerSecond) / secondsPerMeasure);

  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = textColor;
  ctx.lineWidth = 1;

  // Draw measures (major ticks) and beats (minor ticks)
  for (let measure = startMeasure; measure <= endMeasure; measure++) {
    for (let beat = 0; beat < beatsPerMeasure; beat++) {
      const timeInSeconds = measure * secondsPerMeasure + beat * secondsPerBeat;
      const x = CLIP_CONTENT_OFFSET + timeInSeconds * pixelsPerSecond - scrollX;

      if (x < CLIP_CONTENT_OFFSET || x > width) continue;

      const tickX = Math.floor(x) + 0.5;
      const isMeasureBoundary = beat === 0;

      if (isMeasureBoundary) {
        // Major tick (measure boundary) - full height in both sections
        ctx.strokeStyle = topTickColor;

        // Top section
        ctx.beginPath();
        ctx.moveTo(tickX, 0);
        ctx.lineTo(tickX, midHeight);
        ctx.stroke();

        // Bottom section
        ctx.beginPath();
        ctx.moveTo(tickX, midHeight);
        ctx.lineTo(tickX, height);
        ctx.stroke();

        // Draw measure label
        const measureLabel = `${measure + 1}`;
        const textY = midHeight / 2 + 4;
        ctx.fillText(measureLabel, x + 4, textY);
      } else {
        // Minor tick (beat) - shorter, in bottom section only
        ctx.strokeStyle = bottomTickColor;
        const minorTickHeight = (height - midHeight) * 0.4;
        ctx.beginPath();
        ctx.moveTo(tickX, height - minorTickHeight);
        ctx.lineTo(tickX, height);
        ctx.stroke();
      }
    }
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
