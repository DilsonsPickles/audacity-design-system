/**
 * Pure rendering component for spectral selection marquee
 *
 * This component handles only the visual rendering of the selection.
 * All interaction logic is handled by parent components and hooks.
 *
 * IMPORTANT: Coordinate System
 * - Clips are positioned at `clip.start * pixelsPerSecond` WITHOUT leftPadding
 * - Mouse coordinates are relative to the canvas container (no leftPadding offset)
 * - Canvas clipping ensures the marquee never renders outside clip boundaries
 */

import React, { useRef, useEffect } from 'react';
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
    // NOTE: Clips are positioned WITHOUT leftPadding (see Track.tsx line 118)
    const clipStartX = clip.start * coordinateConfig.pixelsPerSecond;
    const clipEndX = clipStartX + clip.duration * coordinateConfig.pixelsPerSecond;
    const clipBodyY = trackY + coordinateConfig.clipHeaderHeight;
    const clipBodyHeight = trackHeight - coordinateConfig.clipHeaderHeight;

    // For split view, spectral selection is only in top half
    const isSplitView = (track as any).viewMode === 'split';
    const isSpectrogramMode = (track as any).viewMode === 'spectrogram';
    const isStereo = (clip as any).waveformLeft && (clip as any).waveformRight;

    const spectralAreaHeight = isSplitView ? clipBodyHeight / 2 : clipBodyHeight;

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
