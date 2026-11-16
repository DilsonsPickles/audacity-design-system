import { describe, it, expect } from 'vitest';
import { computeSpectrum, spectrumDbAt, noteName, formatPlotTime, spectrumCsv, fft } from '../spectrum';

// Plot spectrum's maths (2026-11-16)
const sine = (hz: number, amp: number, rate: number, n: number) =>
  Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

describe('spectrum', () => {
  it('the FFT of an impulse is flat', () => {
    const re = new Float64Array(8); const im = new Float64Array(8);
    re[0] = 1;
    fft(re, im);
    expect([...re]).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('a full-scale sine peaks at its frequency, at about 0 dB, whatever the window', () => {
    for (const fn of ['hann', 'rectangular', 'blackman'] as const) {
      const rate = 48000;
      const s = computeSpectrum(sine(1500, 1, rate, rate), rate, 2048, fn);
      let peak = 1;
      for (let k = 1; k < s.db.length; k++) if (s.db[k] > s.db[peak]) peak = k;
      expect(Math.abs(peak * s.binHz - 1500)).toBeLessThan(s.binHz);
      expect(s.db[peak]).toBeGreaterThan(-2);
      expect(s.db[peak]).toBeLessThan(0.5);
    }
  });

  it('half amplitude reads 6 dB down; far from the tone it is far down', () => {
    const rate = 44100;
    const s = computeSpectrum(sine(1000, 0.5, rate, rate), rate, 4096, 'hann');
    expect(spectrumDbAt(s, 1000)).toBeGreaterThan(-9);
    expect(spectrumDbAt(s, 10000)).toBeLessThan(-80);
  });

  it('a selection shorter than the size is padded into one window', () => {
    const s = computeSpectrum(sine(440, 1, 44100, 300), 44100, 2048, 'hann');
    expect(s.db.length).toBe(1025);
  });

  it('notes and times read as the design shows them', () => {
    expect(noteName(440)).toBe('A4');
    expect(noteName(261.63)).toBe('C4');
    expect(formatPlotTime(300)).toBe('0:05:00.00');
    expect(formatPlotTime(3661.5)).toBe('1:01:01.50');
  });

  it('the CSV has one frequency column and one dB column per curve', () => {
    const rate = 8000;
    const a = computeSpectrum(sine(500, 1, rate, 1024), rate, 256, 'hann');
    const csv = spectrumCsv([{ name: 'Plot 1', spectrum: a }, { name: 'Plot 2', spectrum: a }]).split('\n');
    expect(csv[0]).toBe('Frequency (Hz),Plot 1 (dB),Plot 2 (dB)');
    expect(csv.length).toBe(129);
    expect(csv[1].split(',').length).toBe(3);
  });
});
