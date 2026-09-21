import { describe, it, expect } from 'vitest';
import {
  computeClipGainSegments,
  applyGainSegmentsToChannel,
} from '@audacity-ui/audio';

const clip = (id: number, start: number, duration: number, trimStart = 0) => ({
  id,
  start,
  duration,
  trimStart,
});

describe('computeClipGainSegments — the audible mirror of the drawn X', () => {
  it('edge overlap: earlier clip fades out, later fades in, in SOURCE time', () => {
    // clip 1: 0..5, clip 2: 3..7 with 1s trimmed off its head
    const segs = computeClipGainSegments([clip(1, 0, 5), clip(2, 3, 4, 1)]);
    // clip 1: region 3..5 is clip-relative 3..5, no trim
    expect(segs.get('1')).toEqual([{ startSec: 3, endSec: 5, shape: 'fadeOut' }]);
    // clip 2: region 3..5 is clip-relative 0..2, +1s trimStart = source 1..3
    expect(segs.get('2')).toEqual([{ startSec: 1, endSec: 3, shape: 'fadeIn' }]);
  });

  it('crossfade orientation follows start times, not z-order', () => {
    const flipped = computeClipGainSegments([clip(2, 3, 4), clip(1, 0, 5)]);
    expect(flipped.get('1')![0].shape).toBe('fadeOut');
    expect(flipped.get('2')![0].shape).toBe('fadeIn');
  });

  it('containment mutes the BOTTOM clip across the shared region — no fades', () => {
    // top (later in array) contained inside bottom: bottom muted over 3..5
    const segs = computeClipGainSegments([clip(1, 0, 10), clip(2, 3, 2)]);
    expect(segs.get('1')).toEqual([{ startSec: 3, endSec: 5, shape: 'mute' }]);
    expect(segs.get('2')).toBeUndefined();
    // reversed z: the contained clip is on the bottom — IT gets muted
    const segs2 = computeClipGainSegments([clip(2, 3, 2), clip(1, 0, 10)]);
    expect(segs2.get('2')).toEqual([{ startSec: 0, endSec: 2, shape: 'mute' }]);
    expect(segs2.get('1')).toBeUndefined();
  });

  it('butt joints and gaps produce nothing', () => {
    expect(computeClipGainSegments([clip(1, 0, 5), clip(2, 5, 3)]).size).toBe(0);
  });

  it('user-set clip fades become segments in source time', () => {
    const faded = { ...clip(1, 2, 6, 1), fadeIn: 1.5, fadeOut: 2 };
    const segs = computeClipGainSegments([faded]).get('1')!;
    // fadeIn: clip-relative 0..1.5 → source 1..2.5
    expect(segs).toContainEqual({ startSec: 1, endSec: 2.5, shape: 'fadeIn' });
    // fadeOut: clip-relative 4..6 → source 5..7
    expect(segs).toContainEqual({ startSec: 5, endSec: 7, shape: 'fadeOut' });
  });

  it('a fade on the NON-overlapped edge coexists with the default crossfade ramp', () => {
    const a = { ...clip(1, 0, 5), fadeIn: 1 };
    const b = clip(2, 3, 4);
    const segs = computeClipGainSegments([a, b]);
    expect(segs.get('1')).toContainEqual({ startSec: 0, endSec: 1, shape: 'fadeIn' });
    expect(segs.get('1')).toContainEqual({ startSec: 3, endSec: 5, shape: 'fadeOut' });
  });

  it('an authored fade on the crossfaded edge is CONSUMED — the overlap ramp plays instead', () => {
    // clip 1 has a 3s authored fade-out, but its tail is crossfaded
    const a = { ...clip(1, 0, 5), fadeOut: 3 };
    const b = clip(2, 3, 4);
    const segs = computeClipGainSegments([a, b]);
    // ONLY the overlap ramp (source 3..5); the authored extent is
    // suppressed (stored value untouched — it returns on separation)
    expect(segs.get('1')).toEqual([{ startSec: 3, endSec: 5, shape: 'fadeOut' }]);
    expect(segs.get('2')).toEqual([{ startSec: 0, endSec: 2, shape: 'fadeIn' }]);
  });
});

describe('applyGainSegmentsToChannel', () => {
  const ones = (n: number) => new Float32Array(n).fill(1);

  it('bakes an equal-power fade-out across the segment and never mutates input', () => {
    const input = ones(100);
    const out = applyGainSegmentsToChannel(input, [{ startSec: 0, endSec: 1, shape: 'fadeOut' }], 100);
    expect(input[99]).toBe(1);
    expect(out[0]).toBeCloseTo(1);
    expect(out[50]).toBeCloseTo(Math.cos((0.5 * Math.PI) / 2), 5);
    expect(out[99]).toBeLessThan(0.05);
  });

  it('mute zeroes the segment and leaves the rest untouched', () => {
    const out = applyGainSegmentsToChannel(ones(100), [{ startSec: 0.25, endSec: 0.75, shape: 'mute' }], 100);
    expect(out[10]).toBe(1);
    expect(out[50]).toBe(0);
    expect(out[90]).toBe(1);
  });

  it('fade-in and fade-out over the same span keep constant power', () => {
    const a = applyGainSegmentsToChannel(ones(100), [{ startSec: 0, endSec: 1, shape: 'fadeOut' }], 100);
    const b = applyGainSegmentsToChannel(ones(100), [{ startSec: 0, endSec: 1, shape: 'fadeIn' }], 100);
    for (const i of [0, 25, 50, 75, 99]) {
      expect(a[i] ** 2 + b[i] ** 2).toBeCloseTo(1, 5);
    }
  });
});
