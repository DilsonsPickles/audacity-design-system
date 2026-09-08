import { describe, it, expect } from 'vitest';
import { generateRmsWaveform } from '../rmsWaveform';
import { buildClipWaveforms, MAX_WAVEFORM_VALUES } from '../clipWaveforms';

/** The original O(n × windowSize) implementation, kept as the reference. */
function naiveRms(samples: number[], windowSize = 2048): number[] {
  const out: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  for (let i = 0; i < samples.length; i++) {
    let sumSquares = 0;
    let count = 0;
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(samples.length, i + halfWindow);
    for (let j = start; j < end; j++) {
      sumSquares += samples[j] * samples[j];
      count++;
    }
    out.push(Math.sqrt(sumSquares / count));
  }
  return out;
}

function pseudoRandomSamples(length: number, seed = 1): number[] {
  const samples: number[] = new Array(length);
  let x = seed;
  for (let i = 0; i < length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    samples[i] = (x / 0x7fffffff) * 2 - 1;
  }
  return samples;
}

describe('generateRmsWaveform', () => {
  it('matches the naive reference implementation', () => {
    for (const windowSize of [4, 16, 2048]) {
      const samples = pseudoRandomSamples(500, windowSize);
      const fast = generateRmsWaveform(samples, windowSize);
      const slow = naiveRms(samples, windowSize);
      expect(fast).toHaveLength(slow.length);
      for (let i = 0; i < fast.length; i++) {
        expect(fast[i]).toBeCloseTo(slow[i], 10);
      }
    }
  });

  it('handles empty and shorter-than-window input', () => {
    expect(generateRmsWaveform([])).toEqual([]);
    const short = pseudoRandomSamples(10);
    expect(generateRmsWaveform(short, 2048)).toHaveLength(10);
  });
});

describe('buildClipWaveforms', () => {
  it('keeps short channels at full rate', () => {
    const samples = pseudoRandomSamples(1000);
    const { waveform, rms } = buildClipWaveforms(samples);
    expect(waveform).toEqual(samples);
    expect(rms).toHaveLength(samples.length);
  });

  it('caps long channels at MAX_WAVEFORM_VALUES with matching RMS length', () => {
    const samples = pseudoRandomSamples(MAX_WAVEFORM_VALUES * 4);
    const { waveform, rms } = buildClipWaveforms(samples);
    expect(waveform).toHaveLength(MAX_WAVEFORM_VALUES);
    expect(rms).toHaveLength(MAX_WAVEFORM_VALUES);
  });

  it('preserves the global peak envelope exactly', () => {
    // Background noise at ±0.5 so the planted extremes are the true peaks
    const samples = pseudoRandomSamples(MAX_WAVEFORM_VALUES * 3).map((v) => v * 0.5);
    // Plant extremes at awkward positions
    samples[123456] = 0.987;
    samples[150000] = -0.999;
    const { waveform } = buildClipWaveforms(samples);
    expect(Math.max(...waveform)).toBeCloseTo(0.987, 12);
    expect(Math.min(...waveform)).toBeCloseTo(-0.999, 12);
  });

  it('emits per-bucket [max, min] pairs covering every source sample', () => {
    // A DC ramp: bucket maxima must be non-decreasing, and each pair ordered
    const length = MAX_WAVEFORM_VALUES * 2;
    const samples = Array.from({ length }, (_, i) => i / length);
    const { waveform, rms } = buildClipWaveforms(samples);
    for (let b = 0; b < waveform.length / 2; b++) {
      const max = waveform[b * 2];
      const min = waveform[b * 2 + 1];
      expect(max).toBeGreaterThanOrEqual(min);
      expect(rms[b * 2]).toBe(rms[b * 2 + 1]);
      // RMS of an all-positive window sits between its min and max
      expect(rms[b * 2]).toBeGreaterThanOrEqual(min - 1e-12);
      expect(rms[b * 2]).toBeLessThanOrEqual(max + 1e-12);
    }
    // Last bucket reaches the ramp's top
    expect(waveform[waveform.length - 2]).toBeCloseTo((length - 1) / length, 6);
  });

  it('accepts Float32Array input', () => {
    const samples = new Float32Array(pseudoRandomSamples(100));
    const { waveform } = buildClipWaveforms(samples);
    expect(waveform).toHaveLength(100);
  });
});
