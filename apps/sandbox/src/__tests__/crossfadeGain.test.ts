import { describe, it, expect } from 'vitest';
import {
  computeClipGainSegments,
  applyGainSegmentsToChannel,
  DEFAULT_QUICK_FADE_SHAPE as AUDIO_QUICK,
  DEFAULT_CROSSFADE_SHAPE as AUDIO_CROSSFADE,
  handleCurveGain as audioHandleCurveGain,
} from '@audacity-ui/audio';
import {
  computeFadeCurves,
  fadeInGain,
  fadeOutGain,
  DEFAULT_QUICK_FADE_SHAPE,
  DEFAULT_CROSSFADE_SHAPE,
  FADE_HANDLE_LIMITS,
  handleCurveGain,
} from '@audacity-ui/components';

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
    // No shape stored: a quick fade is the S-curve
    expect(segs).toContainEqual({ startSec: 1, endSec: 2.5, shape: 'fadeIn', curve: 2 });
    // fadeOut: clip-relative 4..6 → source 5..7
    expect(segs).toContainEqual({ startSec: 5, endSec: 7, shape: 'fadeOut', curve: 2 });
  });

  it('a fade on the NON-overlapped edge coexists with the default crossfade ramp', () => {
    const a = { ...clip(1, 0, 5), fadeIn: 1 };
    const b = clip(2, 3, 4);
    const segs = computeClipGainSegments([a, b]);
    // The free edge's quick fade is an S-curve; the crossfaded edge
    // stays equal-power (no `curve`)
    expect(segs.get('1')).toContainEqual({ startSec: 0, endSec: 1, shape: 'fadeIn', curve: 2 });
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

describe('quick fades never cross on one clip (audio mirror)', () => {
  it('a shrunk clip plays proportionally scaled fades', () => {
    const segs = computeClipGainSegments([{ ...clip(1, 0, 4, 1), fadeIn: 4, fadeOut: 4 }]).get('1')!;
    // scaled to 2 + 2, in SOURCE time (trimStart 1)
    expect(segs).toEqual([
      { startSec: 1, endSec: 3, shape: 'fadeIn', curve: 2 },
      { startSec: 3, endSec: 5, shape: 'fadeOut', curve: 2 },
    ]);
  });
});

describe('quick fades never overlap a crossfade (audio mirror)', () => {
  it('a free-edge quick fade clamps to the crossfade boundary', () => {
    // B[3..7] head crossfaded to 5; fadeOut 3 → clamped to the free
    // window [5, 7] = 2s → source time 2..4 (trimStart 0)
    const segs = computeClipGainSegments([clip(1, 0, 5), { ...clip(2, 3, 4), fadeOut: 3 }]);
    expect(segs.get('2')).toEqual([
      { startSec: 0, endSec: 2, shape: 'fadeIn' },  // crossfade ramp
      { startSec: 2, endSec: 4, shape: 'fadeOut', curve: 2 }, // clamped quick fade
    ]);
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

describe('default fade shapes — what is drawn is what is baked', () => {
  const ones = (n: number) => new Float32Array(n).fill(1);

  it('the audio package and the components package agree on both defaults', () => {
    // The audio package cannot import components, so each carries its
    // own copy of these. This is what keeps them the same number.
    expect(AUDIO_QUICK).toBe(DEFAULT_QUICK_FADE_SHAPE);
    expect(AUDIO_CROSSFADE).toBe(DEFAULT_CROSSFADE_SHAPE);
  });

  it('a default quick fade sounds like the S-curve it is drawn as', () => {
    const faded = { ...clip(1, 0, 4), fadeIn: 1, fadeOut: 1 };
    const drawn = computeFadeCurves([faded]);
    const baked = applyGainSegmentsToChannel(ones(400), computeClipGainSegments([faded]).get('1')!, 100);
    const drawnIn = drawn.find((r) => r.side === 'in')!;
    const drawnOut = drawn.find((r) => r.side === 'out')!;
    for (const i of [0, 10, 25, 50, 75, 90]) {
      expect(baked[i]).toBeCloseTo(fadeInGain(i / 100, drawnIn.shape), 5);
      expect(baked[300 + i]).toBeCloseTo(fadeOutGain(i / 100, drawnOut.shape), 5);
    }
    expect(baked[50]).toBeCloseTo(0.5, 5); // half gain at the middle
    expect(baked[200]).toBe(1); // untouched between the fades
  });

  it('a quick fade stored as equal-power (1) bakes equal-power, not the default', () => {
    const faded = { ...clip(1, 0, 4), fadeIn: 1, fadeInShape: 1 };
    const segs = computeClipGainSegments([faded]).get('1')!;
    expect(segs).toEqual([{ startSec: 0, endSec: 1, shape: 'fadeIn' }]);
    const baked = applyGainSegmentsToChannel(ones(400), segs, 100);
    expect(baked[50]).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('a default crossfade still holds constant power', () => {
    const segs = computeClipGainSegments([clip(1, 0, 5), clip(2, 3, 4)]);
    const a = applyGainSegmentsToChannel(ones(500), segs.get('1')!, 100);
    const b = applyGainSegmentsToChannel(ones(400), segs.get('2')!, 100);
    // Project time 3..5 = clip 1 samples 300..500, clip 2 samples 0..200
    for (const i of [0, 50, 100, 150, 199]) {
      expect(a[300 + i] ** 2 + b[i] ** 2).toBeCloseTo(1, 5);
    }
  });
});

describe('handle-shaped fades — what is drawn is what is baked', () => {
  const ones = (n: number) => new Float32Array(n).fill(1);
  const { tMin, tMax, gMin, gMax } = FADE_HANDLE_LIMITS;
  const handles = [
    { t: tMin, g: gMax }, { t: tMax, g: gMax }, { t: tMax, g: gMin }, { t: tMin, g: gMin },
    { t: 0.5, g: 0.5 }, { t: 0.3, g: 0.6 },
  ];

  it('the two copies of the curve are the same function', () => {
    for (const h of handles) {
      for (let k = 0; k <= 50; k++) {
        expect(audioHandleCurveGain(k / 50, h)).toBe(handleCurveGain(k / 50, h));
      }
    }
  });

  it('a fade in and a fade out with handles bake to the curves they are drawn as', () => {
    for (const h of handles) {
      const faded = { ...clip(1, 0, 4), fadeIn: 1, fadeOut: 1, fadeInShape: h, fadeOutShape: h };
      const segs = computeClipGainSegments([faded]).get('1')!;
      expect(segs).toContainEqual({ startSec: 0, endSec: 1, shape: 'fadeIn', curve: h });
      const drawn = computeFadeCurves([faded]);
      const baked = applyGainSegmentsToChannel(ones(400), segs, 100);
      const drawnIn = drawn.find((r) => r.side === 'in')!;
      const drawnOut = drawn.find((r) => r.side === 'out')!;
      for (const i of [0, 5, 15, 30, 50, 70, 85, 95]) {
        expect(baked[i]).toBeCloseTo(fadeInGain(i / 100, drawnIn.shape), 5);
        expect(baked[300 + i]).toBeCloseTo(fadeOutGain(i / 100, drawnOut.shape), 5);
      }
      // Through the handle, on both sides
      expect(baked[Math.round(h.t * 100)]).toBeCloseTo(h.g, 5);
      expect(baked[300 + Math.round(h.t * 100)]).toBeCloseTo(h.g, 5);
      expect(baked[200]).toBe(1);
    }
  });
});
