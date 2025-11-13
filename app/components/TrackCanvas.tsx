'use client';

import { useEffect, useRef } from 'react';
import { Track, Clip, EnvelopePoint, TimeSelection } from './types';

interface TrackCanvasProps {
  tracks: Track[];
  envelopeMode: boolean;
  trackHeight: number;
  pixelsPerSecond: number;
  canvasWidth: number;
  selectedTrackIndices: number[];
  timeSelection: TimeSelection | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

const CLIP_HEADER_HEIGHT = 20;

export default function TrackCanvas({
  tracks,
  envelopeMode,
  trackHeight,
  pixelsPerSecond,
  canvasWidth,
  selectedTrackIndices,
  timeSelection,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tracks.length === 0) return;

    canvas.width = canvasWidth;
    canvas.height = tracks.length * trackHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= dpr;
    canvas.height *= dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    render(ctx);
  }, [tracks, envelopeMode, trackHeight, pixelsPerSecond, canvasWidth, selectedTrackIndices, timeSelection]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    tracks.forEach((track, trackIndex) => {
      const y = trackIndex * trackHeight;
      const isSelected = selectedTrackIndices.includes(trackIndex);

      // Draw track background (highlight if selected)
      if (isSelected) {
        ctx.fillStyle = trackIndex % 2 === 0 ? '#2a2a2a' : '#2e2e2e';
      } else {
        ctx.fillStyle = trackIndex % 2 === 0 ? '#1e1e1e' : '#222222';
      }
      ctx.fillRect(0, y, canvasWidth, trackHeight);

      // Draw track separator
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      // Draw clips
      track.clips.forEach((clip) => {
        drawClip(ctx, clip, trackIndex);
      });

      // Draw time selection only on selected tracks
      if (timeSelection && isSelected) {
        const startX = timeSelection.startTime * pixelsPerSecond;
        const endX = timeSelection.endTime * pixelsPerSecond;
        const width = endX - startX;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(startX, y, width, trackHeight);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX, y + trackHeight);
        ctx.moveTo(endX, y);
        ctx.lineTo(endX, y + trackHeight);
        ctx.stroke();
      }
    });
  };

  const drawClip = (ctx: CanvasRenderingContext2D, clip: Clip, trackIndex: number) => {
    const x = clip.startTime * pixelsPerSecond;
    const y = trackIndex * trackHeight;
    const width = clip.duration * pixelsPerSecond;
    const height = trackHeight;

    // Clip background
    ctx.fillStyle = envelopeMode ? '#3a4a5a' : '#3a5a7a';
    ctx.fillRect(x, y, width, height);

    // Clip border
    ctx.strokeStyle = envelopeMode ? '#6a6a8a' : '#5a8aba';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw clip header with name
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(x, y, width, CLIP_HEADER_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, CLIP_HEADER_HEIGHT);
    ctx.clip();
    ctx.fillText(clip.name, x + 5, y + CLIP_HEADER_HEIGHT / 2);
    ctx.restore();

    // Draw waveform (adjusted to start below header)
    drawWaveform(ctx, clip, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT);

    // Draw envelope if it has points or if envelope mode is active
    if (envelopeMode || clip.envelopePoints.length > 0) {
      drawEnvelope(ctx, clip, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT, envelopeMode);
    }
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const waveform = clip.waveform;
    if (waveform.length === 0) return;

    const centerY = y + height / 2;
    const maxAmplitude = height / 2 - 10;

    // Helper function to get gain at a specific time
    const getGainAtTime = (time: number): number => {
      if (clip.envelopePoints.length === 0) {
        return 1.0; // No envelope, unity gain
      }

      const points = clip.envelopePoints;

      // Before first point
      if (time <= points[0].time) {
        return dbToLinear(points[0].db);
      }

      // After last point
      if (time >= points[points.length - 1].time) {
        return dbToLinear(points[points.length - 1].db);
      }

      // Find the two points we're between
      for (let i = 0; i < points.length - 1; i++) {
        if (time >= points[i].time && time <= points[i + 1].time) {
          // Linear interpolation between the two points
          const t = (time - points[i].time) / (points[i + 1].time - points[i].time);
          const db = points[i].db + t * (points[i + 1].db - points[i].db);
          return dbToLinear(db);
        }
      }

      return 1.0;
    };

    // Convert dB to linear gain
    const dbToLinear = (db: number): number => {
      return Math.pow(10, db / 20);
    };

    ctx.strokeStyle = '#8ac6ff';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < waveform.length; i++) {
      const px = x + (i / waveform.length) * width;
      const time = (i / waveform.length) * clip.duration;
      const gain = getGainAtTime(time);
      const amplitude = waveform[i] * gain;

      // Clamp amplitude to prevent overflow beyond clip boundaries
      const clampedAmplitude = Math.max(-1, Math.min(1, amplitude));
      const py = centerY + clampedAmplitude * maxAmplitude;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.stroke();
  };

  const drawEnvelope = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    x: number,
    y: number,
    width: number,
    height: number,
    showControlPoints: boolean
  ) => {
    const dbToY = (db: number) => {
      const minDb = -60;
      const maxDb = 12;
      const normalized = (db - minDb) / (maxDb - minDb);
      return y + height - normalized * height;
    };

    const zeroDB_Y = dbToY(0);
    const clipBottom = y + height;

    // First, draw the translucent fill below the envelope line
    // More opaque when not in envelope mode for better visibility
    const fillOpacity = showControlPoints ? 0.15 : 0.35;
    ctx.fillStyle = `rgba(255, 102, 0, ${fillOpacity})`;
    ctx.beginPath();

    if (clip.envelopePoints.length === 0) {
      // No control points - draw default fill at 0dB
      ctx.moveTo(x, zeroDB_Y);
      ctx.lineTo(x + width, zeroDB_Y);
      ctx.lineTo(x + width, clipBottom);
      ctx.lineTo(x, clipBottom);
      ctx.closePath();
    } else {
      // Draw fill through control points
      const startY =
        clip.envelopePoints[0].time === 0
          ? dbToY(clip.envelopePoints[0].db)
          : zeroDB_Y;
      ctx.moveTo(x, startY);

      clip.envelopePoints.forEach((point) => {
        const px = x + (point.time / clip.duration) * width;
        const py = dbToY(point.db);
        ctx.lineTo(px, py);
      });

      const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
      const endY = lastPoint.time < clip.duration ? dbToY(lastPoint.db) : dbToY(lastPoint.db);

      if (lastPoint.time < clip.duration) {
        ctx.lineTo(x + width, endY);
      }

      // Complete the fill shape by going down to the bottom
      ctx.lineTo(x + width, clipBottom);
      ctx.lineTo(x, clipBottom);
      ctx.closePath();
    }

    ctx.fill();

    // Draw the envelope line only when in envelope mode
    if (showControlPoints) {
      // Draw the hit zone (16px on each side of the line)
      ctx.strokeStyle = 'rgba(255, 102, 0, 0.15)';
      ctx.lineWidth = 32; // 16px on each side
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      if (clip.envelopePoints.length === 0) {
        // No control points - draw default hit zone at 0dB
        ctx.moveTo(x, zeroDB_Y);
        ctx.lineTo(x + width, zeroDB_Y);
      } else {
        // Draw hit zone through control points
        const startY =
          clip.envelopePoints[0].time === 0
            ? dbToY(clip.envelopePoints[0].db)
            : zeroDB_Y;
        ctx.moveTo(x, startY);

        clip.envelopePoints.forEach((point) => {
          const px = x + (point.time / clip.duration) * width;
          const py = dbToY(point.db);
          ctx.lineTo(px, py);
        });

        const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
        if (lastPoint.time < clip.duration) {
          ctx.lineTo(x + width, dbToY(lastPoint.db));
        }
      }

      ctx.stroke();

      // Draw the actual envelope line
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.beginPath();

      if (clip.envelopePoints.length === 0) {
        // No control points - draw default line at 0dB
        ctx.moveTo(x, zeroDB_Y);
        ctx.lineTo(x + width, zeroDB_Y);
      } else {
        // Draw envelope through control points
        const startY =
          clip.envelopePoints[0].time === 0
            ? dbToY(clip.envelopePoints[0].db)
            : zeroDB_Y;
        ctx.moveTo(x, startY);

        clip.envelopePoints.forEach((point) => {
          const px = x + (point.time / clip.duration) * width;
          const py = dbToY(point.db);
          ctx.lineTo(px, py);
        });

        const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
        if (lastPoint.time < clip.duration) {
          ctx.lineTo(x + width, dbToY(lastPoint.db));
        }
      }

      ctx.stroke();
    }

    // Draw control points when in envelope mode
    if (showControlPoints) {
      clip.envelopePoints.forEach((point) => {
        const px = x + (point.time / clip.duration) * width;
        const py = dbToY(point.db);

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="block bg-[#1e1e1e]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}
