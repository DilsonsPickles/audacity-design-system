/**
 * Generate RMS waveform from raw samples
 * RMS (Root Mean Square) provides a smoother representation of the audio waveform
 * Uses a sliding window centered at each sample to calculate RMS values
 *
 * O(n): the window's sum-of-squares is maintained incrementally as the
 * window slides — one add and (at most) one subtract per output sample.
 * The previous implementation re-summed the whole 2048-sample window per
 * output value (O(n × windowSize)), which for a 5-minute 44.1 kHz import
 * meant ~27 billion multiply-adds per channel and froze the UI for minutes.
 *
 * @param samples - Array of normalized audio samples (-1 to 1)
 * @param windowSize - Size of the RMS calculation window in SAMPLES (default:
 *   2048, calibrated for ~46 ms at 44.1 kHz — callers passing decimated
 *   arrays must scale it, or use buildClipWaveforms which computes RMS
 *   per decimation bucket instead)
 * @returns Array of positive RMS values (same length as input, rendered symmetrically ±RMS from center)
 */
export function generateRmsWaveform(samples: ArrayLike<number>, windowSize: number = 2048): number[] {
  const length = samples.length;
  const rmsWaveform: number[] = new Array(length);
  const halfWindow = Math.floor(windowSize / 2);

  // Window for output i covers [max(0, i - halfWindow), min(length, i + halfWindow)),
  // matching the original nested-loop bounds exactly.
  let start = 0;
  let end = Math.min(length, halfWindow);
  let sumSquares = 0;
  for (let j = 0; j < end; j++) {
    sumSquares += samples[j] * samples[j];
  }

  for (let i = 0; i < length; i++) {
    if (i > 0) {
      // Window trailing edge: drop sample (i - 1 - halfWindow) once it exists
      const newStart = Math.max(0, i - halfWindow);
      if (newStart > start) {
        sumSquares -= samples[start] * samples[start];
        start = newStart;
      }
      // Window leading edge: admit sample (i + halfWindow - 1) if in range
      const newEnd = Math.min(length, i + halfWindow);
      if (newEnd > end) {
        sumSquares += samples[end] * samples[end];
        end = newEnd;
      }
    }
    // Guard against tiny negative drift from incremental float subtraction
    const mean = Math.max(0, sumSquares) / (end - start);
    rmsWaveform[i] = Math.sqrt(mean);
  }

  return rmsWaveform;
}
