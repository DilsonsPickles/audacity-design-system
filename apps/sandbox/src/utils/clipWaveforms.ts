import { generateRmsWaveform } from './rmsWaveform';

/**
 * Cap on stored waveform values per clip channel. The timeline canvas is
 * capped at 32,000 CSS px (useZoomControls MAX_CANVAS_WIDTH), and the zoom
 * ceiling scales with 1.5× project length — so a clip can never occupy more
 * than ~32,000 rendered pixels, and 32,768 min/max pairs (65,536 values)
 * always yields ≥1.5 stored values per rendered pixel at any reachable zoom.
 *
 * ClipBody detects the "sample rate" as array.length / fullDuration, so a
 * decimated array renders through the exact same min/max-per-pixel path as
 * full-rate data.
 */
export const MAX_WAVEFORM_VALUES = 65536;

export interface ClipWaveforms {
  /** Display samples — full-rate for short clips, min/max pairs otherwise */
  waveform: number[];
  /** RMS overlay values — always exactly the same length as `waveform`
   *  (ClipBody indexes both with geometry computed from `waveform`) */
  rms: number[];
}

/**
 * Build the display-waveform + RMS arrays for one audio channel.
 *
 * Short channels (≤ MAX_WAVEFORM_VALUES samples) are stored at full rate,
 * so e.g. spectrogram rendering of short clips keeps real signal data.
 * Longer channels are decimated in a single pass to interleaved
 * [max, min] pairs per bucket — preserving the exact peak envelope the
 * canvas would have drawn from the full data — with per-bucket RMS emitted
 * at matching indices. For a 5-minute stereo import this reduces the
 * retained arrays from ~424 MB to ~2 MB.
 *
 * Playback is unaffected: it reads the decoded AudioBuffer registered with
 * AudioPlaybackManager, never these arrays.
 */
export function buildClipWaveforms(channel: ArrayLike<number>): ClipWaveforms {
  const length = channel.length;

  if (length <= MAX_WAVEFORM_VALUES) {
    const waveform = Array.from(channel);
    return { waveform, rms: generateRmsWaveform(waveform) };
  }

  const buckets = MAX_WAVEFORM_VALUES / 2;
  const waveform = new Array<number>(MAX_WAVEFORM_VALUES);
  const rms = new Array<number>(MAX_WAVEFORM_VALUES);

  for (let b = 0; b < buckets; b++) {
    const start = Math.floor((b * length) / buckets);
    const end = Math.max(start + 1, Math.floor(((b + 1) * length) / buckets));
    let min = channel[start];
    let max = channel[start];
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      const v = channel[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sumSquares += v * v;
    }
    const bucketRms = Math.sqrt(sumSquares / (end - start));
    waveform[b * 2] = max;
    waveform[b * 2 + 1] = min;
    rms[b * 2] = bucketRms;
    rms[b * 2 + 1] = bucketRms;
  }

  return { waveform, rms };
}
