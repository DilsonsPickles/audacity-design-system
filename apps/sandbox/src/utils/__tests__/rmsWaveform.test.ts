import { describe, it, expect } from 'vitest';
import { generateRmsWaveform } from '../rmsWaveform';

describe('generateRmsWaveform', () => {
  it('returns same length as input', () => {
    const samples = [0.1, 0.2, -0.3, 0.4, -0.5];
    const rms = generateRmsWaveform(samples, 2);
    expect(rms.length).toBe(samples.length);
  });

  it('returns all non-negative values', () => {
    const samples = [-0.5, -0.3, 0.2, 0.8, -0.1];
    const rms = generateRmsWaveform(samples, 2);
    for (const v of rms) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns 0 for silent input', () => {
    const samples = [0, 0, 0, 0];
    const rms = generateRmsWaveform(samples, 2);
    for (const v of rms) {
      expect(v).toBe(0);
    }
  });

  it('returns RMS of 1 for constant signal of 1', () => {
    const samples = new Array(100).fill(1);
    const rms = generateRmsWaveform(samples, 4);
    // RMS of constant 1 = 1
    for (const v of rms) {
      expect(v).toBeCloseTo(1, 5);
    }
  });

  it('computes correct RMS for known values', () => {
    // For a window containing [1, -1]: RMS = sqrt((1+1)/2) = 1
    const samples = [1, -1];
    const rms = generateRmsWaveform(samples, 4); // window larger than array
    expect(rms[0]).toBeCloseTo(1);
    expect(rms[1]).toBeCloseTo(1);
  });

  it('uses default window size of 2048', () => {
    // Just verify it doesn't throw with default
    const samples = new Array(100).fill(0.5);
    const rms = generateRmsWaveform(samples);
    expect(rms.length).toBe(100);
  });
});
