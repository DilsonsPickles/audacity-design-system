/**
 * Spectrogram rendering utilities for canvas
 * Contains canvas-specific rendering logic for spectrograms
 */

import { getFrequencyBandEnergy } from '@audacity-ui/core';

/**
 * Spectrogram rendering options
 */
export interface SpectrogramOptions {
  /** Number of frequency bands to display */
  frequencyBands?: number;
  /** FFT window size (should be power of 2) */
  fftWindowSize?: number;
  /** Color intensity multiplier */
  intensityMultiplier?: number;
  /** Skip every N pixel columns for performance (1 = render all, 2 = render every other, etc) */
  pixelSkip?: number;
}

/**
 * Get color for spectrogram intensity value
 * Uses blue -> green -> yellow/red gradient
 * @param intensity - Normalized intensity (0-1)
 * @returns RGBA color string
 */
export function getSpectrogramColor(intensity: number): string {
  let r, g, b;

  if (intensity < 0.5) {
    // Blue to Green
    r = 0;
    g = Math.floor(intensity * 2 * 255);
    b = Math.floor(255 - intensity * 2 * 255);
  } else {
    // Green to Yellow/Red
    r = Math.floor((intensity - 0.5) * 2 * 255);
    g = 255;
    b = 0;
  }

  const alpha = Math.max(0.3, intensity);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Render mono spectrogram to canvas
 * @param ctx - Canvas 2D context
 * @param waveformData - Audio waveform samples
 * @param x - X position to start rendering
 * @param y - Y position to start rendering
 * @param width - Width to render
 * @param height - Height to render
 * @param options - Rendering options
 */
export function renderMonoSpectrogram(
  ctx: CanvasRenderingContext2D,
  waveformData: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  options: SpectrogramOptions = {}
): void {
  const {
    frequencyBands = 64,
    fftWindowSize = 256,
    intensityMultiplier = 1.5,
    pixelSkip = 1,
  } = options;

  const samplesPerPixel = waveformData.length / width;

  for (let px = 0; px < width; px += pixelSkip) {
    const sampleIndex = Math.floor(px * samplesPerPixel);
    if (sampleIndex >= waveformData.length) break;

    // Get frequency band energies via FFT
    const bandEnergies = getFrequencyBandEnergy(
      waveformData,
      sampleIndex,
      fftWindowSize,
      frequencyBands
    );
    const maxEnergy = Math.max(...bandEnergies, 0.0001);

    // Draw each frequency band
    for (let band = 0; band < frequencyBands; band++) {
      const rawIntensity = bandEnergies[band] / maxEnergy;
      const intensity = Math.min(1, Math.sqrt(rawIntensity) * intensityMultiplier);

      ctx.fillStyle = getSpectrogramColor(intensity);
      const yPos = y + (1 - (band / frequencyBands)) * height;
      const bandHeight = Math.max(1, height / frequencyBands);
      ctx.fillRect(x + px, yPos, pixelSkip, bandHeight);
    }
  }
}

/**
 * Render stereo spectrogram to canvas (split into L and R channels)
 * @param ctx - Canvas 2D context
 * @param waveformLeft - Left channel waveform samples
 * @param waveformRight - Right channel waveform samples
 * @param x - X position to start rendering
 * @param y - Y position to start rendering
 * @param width - Width to render
 * @param height - Height to render
 * @param channelSplitRatio - Ratio of height for left channel (0-1, default 0.5)
 * @param options - Rendering options
 */
export function renderStereoSpectrogram(
  ctx: CanvasRenderingContext2D,
  waveformLeft: number[],
  waveformRight: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  channelSplitRatio: number = 0.5,
  options: SpectrogramOptions = {}
): void {
  const {
    frequencyBands = 64,
    fftWindowSize = 256,
    intensityMultiplier = 1.5,
    pixelSkip = 1,
  } = options;

  const lChannelHeight = height * channelSplitRatio;
  const rChannelHeight = height * (1 - channelSplitRatio);

  // Render L channel (top)
  const samplesPerPixelL = waveformLeft.length / width;
  for (let px = 0; px < width; px += pixelSkip) {
    const sampleIndex = Math.floor(px * samplesPerPixelL);
    if (sampleIndex >= waveformLeft.length) break;

    const bandEnergies = getFrequencyBandEnergy(
      waveformLeft,
      sampleIndex,
      fftWindowSize,
      frequencyBands
    );
    const maxEnergy = Math.max(...bandEnergies, 0.0001);

    for (let band = 0; band < frequencyBands; band++) {
      const rawIntensity = bandEnergies[band] / maxEnergy;
      const intensity = Math.min(1, Math.sqrt(rawIntensity) * intensityMultiplier);

      ctx.fillStyle = getSpectrogramColor(intensity);
      const yPos = y + (1 - (band / frequencyBands)) * lChannelHeight;
      const bandHeight = Math.max(1, lChannelHeight / frequencyBands);
      ctx.fillRect(x + px, yPos, pixelSkip, bandHeight);
    }
  }

  // Render R channel (bottom)
  const dividerY = y + lChannelHeight;
  const samplesPerPixelR = waveformRight.length / width;
  for (let px = 0; px < width; px += pixelSkip) {
    const sampleIndex = Math.floor(px * samplesPerPixelR);
    if (sampleIndex >= waveformRight.length) break;

    const bandEnergies = getFrequencyBandEnergy(
      waveformRight,
      sampleIndex,
      fftWindowSize,
      frequencyBands
    );
    const maxEnergy = Math.max(...bandEnergies, 0.0001);

    for (let band = 0; band < frequencyBands; band++) {
      const rawIntensity = bandEnergies[band] / maxEnergy;
      const intensity = Math.min(1, Math.sqrt(rawIntensity) * intensityMultiplier);

      ctx.fillStyle = getSpectrogramColor(intensity);
      const yPos = dividerY + (1 - (band / frequencyBands)) * rChannelHeight;
      const bandHeight = Math.max(1, rChannelHeight / frequencyBands);
      ctx.fillRect(x + px, yPos, pixelSkip, bandHeight);
    }
  }
}
