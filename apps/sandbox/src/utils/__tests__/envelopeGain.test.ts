import { describe, it, expect } from 'vitest';
import { applyEnvelopeToChannel, envelopeGainAtTime } from '@audacity-ui/audio';
// The renderer's implementation is deliberately not barrel-exported
// (see packages/components/src/index.ts note) — reach into the source
// directly so this test pins REAL cross-package equivalence, not a copy.
// eslint-disable-next-line import/no-relative-packages
import { getEnvelopeGainAtTime } from '../../../../../packages/components/src/utils/envelope';

describe('envelopeGainAtTime (playback bake)', () => {
  const points = [
    { time: 0, db: 0 },
    { time: 2, db: -12 },
    { time: 4, db: 6 },
  ];

  it('matches the renderer implementation exactly across the range', () => {
    for (let t = -0.5; t <= 5; t += 0.13) {
      expect(envelopeGainAtTime(t, points, 4)).toBeCloseTo(
        getEnvelopeGainAtTime(t, points, 4),
        12,
      );
    }
  });

  it('is unity with no points and flat beyond the outer points', () => {
    expect(envelopeGainAtTime(1, [], 4)).toBe(1);
    expect(envelopeGainAtTime(0, points, 4)).toBeCloseTo(1, 12); // 0 dB
    expect(envelopeGainAtTime(2, points, 4)).toBeCloseTo(Math.pow(10, -12 / 20), 12);
  });

  it('interpolates linearly in dB space', () => {
    // Midway between 0 dB and -12 dB → -6 dB
    expect(envelopeGainAtTime(1, points, 4)).toBeCloseTo(Math.pow(10, -6 / 20), 12);
  });
});

describe('applyEnvelopeToChannel', () => {
  it('scales samples by the envelope at their source time and never mutates the input', () => {
    const sampleRate = 4; // 4 samples per second → sample i at t = i/4
    const channel = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1]); // 2 s
    const points = [
      { time: 0, db: 0 },
      { time: 2, db: -12 },
    ];
    const out = applyEnvelopeToChannel(channel, points, sampleRate, 2);

    expect(out).not.toBe(channel);
    expect(channel[4]).toBe(1); // input untouched
    for (let i = 0; i < out.length; i++) {
      expect(out[i]).toBeCloseTo(envelopeGainAtTime(i / sampleRate, points, 2), 6);
    }
  });
});
