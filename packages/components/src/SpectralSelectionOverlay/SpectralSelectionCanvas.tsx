/**
 * Pure rendering component for spectral selection marquee
 *
 * This component handles only the visual rendering of the selection.
 * All interaction logic is handled by parent components and hooks.
 *
 * IMPORTANT: Coordinate System
 * - Clips are positioned at `CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond`
 * - Mouse coordinates are relative to the canvas container (no leftPadding offset)
 * - Canvas clipping ensures the marquee never renders outside clip boundaries
 */

import React, { useRef, useEffect } from 'react';
import { CLIP_CONTENT_OFFSET } from '../constants';
import {
  getSelectionBounds,
  drawMarqueeBorder,
  drawCenterLine,
  drawCornerHandles,
  drawDarkenedOverlays,
  CoordinateConfig,
} from './utils';
import { SpectralSelection, Track } from './types';

export interface SpectralSelectionCanvasProps {
  /** The spectral selection to render */
  selection: SpectralSelection;
  /** Track data to find clip positions */
  tracks: Track[];
  /** Coordinate configuration */
  coordinateConfig: CoordinateConfig;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Whether mouse is hovering over center line */
  isHoveringCenterLine?: boolean;
}

/**
 * Pure rendering component for spectral selection
 */
export function SpectralSelectionCanvas({
  selection,
  tracks,
  coordinateConfig,
  width,
  height,
  isHoveringCenterLine = false,
}: SpectralSelectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { trackIndex, clipId, startTime, endTime, minFrequency, maxFrequency } = selection;

    // Find the clip
    if (trackIndex >= tracks.length) return;
    const track = tracks[trackIndex];
    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return;

    // Calculate track Y position
    let trackY = coordinateConfig.initialGap;
    for (let i = 0; i < trackIndex; i++) {
      trackY += coordinateConfig.trackHeights[i] + coordinateConfig.trackGap;
    }

    const trackHeight = coordinateConfig.trackHeights[trackIndex];

    // Calculate clip boundaries in pixels
    // Clips are positioned WITH CLIP_CONTENT_OFFSET for visual alignment
    const clipStartX = CLIP_CONTENT_OFFSET + clip.start * coordinateConfig.pixelsPerSecond;
    const clipEndX = clipStartX + clip.duration * coordinateConfig.pixelsPerSecond;
    const clipBodyY = trackY + coordinateConfig.clipHeaderHeight;
    const clipBodyHeight = trackHeight - coordinateConfig.clipHeaderHeight;

    // For split view, spectral selection is only in top half
    const isSplitView = (track as any).viewMode === 'split';
    const isSpectrogramMode = (track as any).viewMode === 'spectrogram';
    const isStereo = (clip as any).waveformLeft && (clip as any).waveformRight;

    const spectralAreaHeight = isSplitView ? clipBodyHeight / 2 : clipBodyHeight;

    // Check if selection spans full frequency range for time-selection-style overlay
    // For mono/split: full range is 0-1
    // For stereo spectrogram: also consider full L channel (0.5-1) or full R channel (0-0.5)
    const isFullHeight = (minFrequency === 0 && maxFrequency === 1) ||
                         (isSpectrogramMode && isStereo && minFrequency === 0.5 && maxFrequency === 1.0) ||
                         (isSpectrogramMode && isStereo && minFrequency === 0.0 && maxFrequency === 0.5);

    // For stereo spectrogram, render on both L and R channels
    if (isSpectrogramMode && isStereo) {
      // Stereo spectrogram: L channel on top half, R channel on bottom half
      const halfHeight = clipBodyHeight / 2;

      // Render on L channel (top half)
      const boundsL = getSelectionBounds(
        startTime,
        endTime,
        minFrequency,
        maxFrequency,
        trackIndex,
        coordinateConfig
      );

      // Draw full-height overlay BEFORE clipping (so it covers the header too)
      if (isFullHeight) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Use same blend mode as time selection
        ctx.fillStyle = 'rgba(112, 181, 255, 0.6)'; // Increased opacity to match time selection brightness
        ctx.fillRect(boundsL.leftX, trackY, boundsL.width, trackHeight);
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipStartX, clipBodyY, clipEndX - clipStartX, halfHeight);
      ctx.clip();

      drawDarkenedOverlays(
        ctx,
        boundsL,
        minFrequency,
        maxFrequency,
        trackY,
        trackHeight,
        coordinateConfig.clipHeaderHeight
      );

      drawMarqueeBorder(ctx, boundsL);
      drawCenterLine(ctx, boundsL, isHoveringCenterLine);
      drawCornerHandles(ctx, boundsL);

      ctx.restore();

      // Render on R channel (bottom half)
      // Adjust the bounds to render in the bottom half
      const boundsR = {
        leftX: boundsL.leftX,
        rightX: boundsL.rightX,
        topY: boundsL.topY + halfHeight,
        bottomY: boundsL.bottomY + halfHeight,
        centerY: boundsL.centerY + halfHeight,
        width: boundsL.width,
        height: boundsL.height,
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipStartX, clipBodyY + halfHeight, clipEndX - clipStartX, halfHeight);
      ctx.clip();

      drawDarkenedOverlays(
        ctx,
        boundsR,
        minFrequency,
        maxFrequency,
        trackY,
        trackHeight,
        coordinateConfig.clipHeaderHeight
      );

      drawMarqueeBorder(ctx, boundsR);
      drawCenterLine(ctx, boundsR, isHoveringCenterLine);
      drawCornerHandles(ctx, boundsR);

      ctx.restore();
    } else {
      // Mono or split view: single selection
      const bounds = getSelectionBounds(
        startTime,
        endTime,
        minFrequency,
        maxFrequency,
        trackIndex,
        coordinateConfig
      );

      // Draw full-height overlay BEFORE clipping (so it covers the header too)
      if (isFullHeight) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Use same blend mode as time selection
        ctx.fillStyle = 'rgba(112, 181, 255, 0.6)'; // Increased opacity to match time selection brightness
        ctx.fillRect(bounds.leftX, trackY, bounds.width, trackHeight);
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipStartX, clipBodyY, clipEndX - clipStartX, spectralAreaHeight);
      ctx.clip();

      drawDarkenedOverlays(
        ctx,
        bounds,
        minFrequency,
        maxFrequency,
        trackY,
        trackHeight,
        coordinateConfig.clipHeaderHeight
      );

      drawMarqueeBorder(ctx, bounds);
      drawCenterLine(ctx, bounds, isHoveringCenterLine);
      drawCornerHandles(ctx, bounds);

      ctx.restore();
    }
  }, [selection, tracks, coordinateConfig, isHoveringCenterLine]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
