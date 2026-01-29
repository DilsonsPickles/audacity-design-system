/**
 * Generate RMS waveform from raw samples
 * RMS (Root Mean Square) provides a smoother representation of the audio waveform
 * Uses a sliding window centered at each sample to calculate RMS values
 *
 * @param samples - Array of normalized audio samples (-1 to 1)
 * @param windowSize - Size of the RMS calculation window (default: 2048 for smooth envelope)
 * @returns Array of positive RMS values (same length as input, rendered symmetrically ±RMS from center)
 */
export function generateRmsWaveform(samples: number[], windowSize: number = 2048): number[] {
  const rmsWaveform: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < samples.length; i++) {
    // Calculate RMS over a window centered at current sample
    let sumSquares = 0;
    let count = 0;

    const start = Math.max(0, i - halfWindow);
    const end = Math.min(samples.length, i + halfWindow);

    for (let j = start; j < end; j++) {
      sumSquares += samples[j] * samples[j];
      count++;
    }

    // RMS = sqrt(mean(squares)) - always positive
    const rms = Math.sqrt(sumSquares / count);
    rmsWaveform.push(rms);
  }

  return rmsWaveform;
}
