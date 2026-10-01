/**
 * In a crossfade you see what plays (user decision 2026-10-01): the clip
 * on top already draws its own waveform shrunk by its fade (ClipBody,
 * through fadeRegions), but the clip UNDERNEATH is painted over by the
 * top clip's opaque body. This ghost draws the under clip's waveform
 * over the overlap, scaled by that clip's own fade gain — dwindling as
 * the other grows — in its own clip colour at reduced opacity, above
 * the clips and below the fade curves. It replaces the white veils that
 * used to say "shared" here: two waveforms say it better.
 *
 * Same column→sample mapping and the same gain as ClipBody's own draw
 * (computeWaveformGeometry, fadeGainAt), so the ghost is the body's
 * waveform exactly, continued under the other clip. One channel: a
 * stereo clip ghosts its left channel.
 */
import React, { useEffect, useRef } from 'react';
import { computeWaveformGeometry } from '../ClipBody/waveformGeometry';
import { fadeGainAt, type LocalFadeRegion } from '../utils/clipCrossfades';

export interface CrossfadeGhostProps {
  clipId: string | number;
  /** The under clip's waveform samples (its full source) */
  data: readonly number[];
  /** Placement on the track, px */
  left: number;
  top: number;
  width: number;
  height: number;
  /** The `--clip-<color>-waveform` prefix */
  color: string;
  /** Clip-local time (seconds from the clip's start) at the ghost's left edge */
  offsetSeconds: number;
  pixelsPerSecond: number;
  clipTrimStart: number;
  clipDuration: number;
  clipFullDuration?: number;
  clipStretchFactor: number;
  fadeRegions: readonly LocalFadeRegion[];
}

export const GHOST_ALPHA = 0.5;

export const CrossfadeGhost: React.FC<CrossfadeGhostProps> = ({
  clipId, data, left, top, width, height, color, offsetSeconds, pixelsPerSecond,
  clipTrimStart, clipDuration, clipFullDuration, clipStretchFactor, fadeRegions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const waveColor = getComputedStyle(canvas).getPropertyValue(`--clip-${color}-waveform`).trim();
    ctx.fillStyle = waveColor || 'rgba(0, 0, 0, 0.6)';
    ctx.globalAlpha = GHOST_ALPHA;
    const { samplesPerPixel, trimStartSample } = computeWaveformGeometry({
      dataLength: data.length,
      clipFullDuration,
      clipTrimStart,
      clipDuration,
      pixelsPerSecond,
      clipStretchFactor,
    });
    // ClipBody's mono geometry: centred in the body, 2px of headroom
    const centerY = height / 2;
    const maxAmplitude = height / 2 - 2;
    const offsetPx = offsetSeconds * pixelsPerSecond;
    for (let px = 0; px < width; px++) {
      const sampleStart = trimStartSample + Math.floor((offsetPx + px) * samplesPerPixel);
      const sampleEnd = trimStartSample + Math.floor((offsetPx + px + 1) * samplesPerPixel);
      let min = data[sampleStart] || 0;
      let max = data[sampleStart] || 0;
      for (let i = sampleStart; i < sampleEnd && i < data.length; i++) {
        const sample = data[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      const gain = fadeGainAt(offsetSeconds + px / pixelsPerSecond, fadeRegions);
      min *= gain;
      max *= gain;
      const y1 = centerY - max * maxAmplitude;
      const y2 = centerY - min * maxAmplitude;
      ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
    }
  }, [data, width, height, color, offsetSeconds, pixelsPerSecond, clipTrimStart, clipDuration, clipFullDuration, clipStretchFactor, fadeRegions]);

  return (
    <canvas
      ref={canvasRef}
      data-crossfade-ghost={clipId}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        // Above every stacked clip (2+index band), below the curves (450)
        zIndex: 449,
      }}
    />
  );
};
