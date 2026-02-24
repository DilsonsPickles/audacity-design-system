// Generate noise waveform data with headroom
export function generateWaveform(durationSeconds: number, sampleRate: number = 48000): number[] {
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const waveform: number[] = [];

  // Create speech-like or bird song pattern with varying amplitude bursts
  const burstDuration = 0.1; // 100ms bursts
  const gapDuration = 0.05; // 50ms gaps
  const burstSamples = Math.floor(burstDuration * sampleRate);
  const gapSamples = Math.floor(gapDuration * sampleRate);
  const cycleLength = burstSamples + gapSamples;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cyclePos = i % cycleLength;
    const isInBurst = cyclePos < burstSamples;

    if (isInBurst) {
      // During burst: mix of frequencies with amplitude envelope
      const burstProgress = cyclePos / burstSamples;
      const envelope = Math.sin(burstProgress * Math.PI); // Attack-decay envelope

      // Mix fundamental and harmonics (simulating formants with more detail)
      const fundamental = Math.sin(2 * Math.PI * 200 * t); // 200 Hz base (fundamental)
      const harmonic2 = Math.sin(2 * Math.PI * 400 * t) * 0.4; // First harmonic
      const harmonic3 = Math.sin(2 * Math.PI * 800 * t) * 0.3; // Second harmonic
      const formant1 = Math.sin(2 * Math.PI * 1200 * t) * 0.5; // First formant
      const formant2 = Math.sin(2 * Math.PI * 2400 * t) * 0.4; // Second formant
      const formant3 = Math.sin(2 * Math.PI * 3600 * t) * 0.3; // Third formant
      const highFreq = Math.sin(2 * Math.PI * 5000 * t) * 0.2; // High frequency content
      const sibilant = Math.sin(2 * Math.PI * 8000 * t) * 0.15; // Sibilant-like
      const noise = (Math.random() * 2 - 1) * 0.15; // Broadband noise

      const sample = (fundamental + harmonic2 + harmonic3 + formant1 +
                     formant2 + formant3 + highFreq + sibilant + noise) * envelope * 0.35;
      waveform.push(sample);
    } else {
      // During gap: low amplitude noise (background)
      waveform.push((Math.random() * 2 - 1) * 0.03);
    }
  }

  return waveform;
}
