import { describe, it, expect } from 'vitest';
import {
  computeCrossfades,
  computeFadeCurves,
  effectiveFades,
  fadeInGain,
  fadeOutGain,
  fadeCurvePath,
} from '../clipCrossfades';

const clip = (id: number, start: number, duration: number) => ({ id, start, duration });

describe('computeCrossfades', () => {
  it('returns nothing for disjoint or butt-joined clips', () => {
    expect(computeCrossfades([clip(1, 0, 5), clip(2, 6, 3)])).toEqual([]);
    expect(computeCrossfades([clip(1, 0, 5), clip(2, 5, 3)])).toEqual([]);
  });

  it('a partial edge overlap crossfades: earlier clip out, later clip in', () => {
    // clip 1: 0..5, clip 2: 3..7 → shared region 3..5
    expect(computeCrossfades([clip(1, 0, 5), clip(2, 3, 4)])).toEqual([
      { start: 3, end: 5, outgoingClipId: 1, incomingClipId: 2 },
    ]);
  });

  it('orientation follows start times, not array (z) order', () => {
    // Same geometry, array order flipped (clip 2 is now BELOW in z) —
    // the earlier-starting clip still fades out
    expect(computeCrossfades([clip(2, 3, 4), clip(1, 0, 5)])).toEqual([
      { start: 3, end: 5, outgoingClipId: 1, incomingClipId: 2 },
    ]);
  });

  it('containment is occlusion, not a fade — including identical spans', () => {
    expect(computeCrossfades([clip(1, 0, 10), clip(2, 3, 2)])).toEqual([]);
    expect(computeCrossfades([clip(1, 2, 4), clip(2, 2, 4)])).toEqual([]);
  });

  it('reports each overlapping pair, sorted by region start', () => {
    // 1: 0..5, 2: 4..9, 3: 8..12 → regions 4..5 (1×2) and 8..9 (2×3)
    expect(computeCrossfades([clip(3, 8, 4), clip(1, 0, 5), clip(2, 4, 5)])).toEqual([
      { start: 4, end: 5, outgoingClipId: 1, incomingClipId: 2 },
      { start: 8, end: 9, outgoingClipId: 2, incomingClipId: 3 },
    ]);
  });
});

describe('computeFadeCurves — one fade per edge, the crossfade wins', () => {
  it('a plain edge overlap yields the two default ramps over the shared region', () => {
    expect(computeFadeCurves([clip(1, 0, 5), clip(2, 3, 4)])).toEqual([
      { clipId: 1, side: 'out', start: 3, end: 5, authored: false, shape: 1 },
      { clipId: 2, side: 'in', start: 3, end: 5, authored: false, shape: 1 },
    ]);
  });

  it('an authored fade on a crossfaded edge is CONSUMED: the overlap ramp draws instead', () => {
    const faded = { ...clip(1, 0, 5), fadeOut: 3 }; // authored, but the edge is crossfaded
    const curves = computeFadeCurves([faded, clip(2, 3, 4)]);
    expect(curves).toEqual([
      { clipId: 1, side: 'out', start: 3, end: 5, authored: false, shape: 1 },
      { clipId: 2, side: 'in', start: 3, end: 5, authored: false, shape: 1 },
    ]);
  });

  it('lone clip fades render at their own extents', () => {
    const curves = computeFadeCurves([{ ...clip(1, 2, 6), fadeIn: 1, fadeOut: 2 }]);
    expect(curves).toEqual([
      { clipId: 1, side: 'in', start: 2, end: 3, authored: true, shape: 1 },
      { clipId: 1, side: 'out', start: 6, end: 8, authored: true, shape: 1 },
    ]);
  });

  it('a fade on the NON-overlapped (free) edge coexists with the crossfade ramps', () => {
    const curves = computeFadeCurves([{ ...clip(1, 0, 5), fadeIn: 1 }, clip(2, 3, 4)]);
    expect(curves).toContainEqual({ clipId: 1, side: 'in', start: 0, end: 1, authored: true, shape: 1 });
    expect(curves).toContainEqual({ clipId: 1, side: 'out', start: 3, end: 5, authored: false, shape: 1 });
    expect(curves).toContainEqual({ clipId: 2, side: 'in', start: 3, end: 5, authored: false, shape: 1 });
  });
});

describe('effectiveFades — quick fades never cross on one clip', () => {
  it('fades that fit are untouched', () => {
    expect(effectiveFades(1, 2, 5)).toEqual({ fadeIn: 1, fadeOut: 2 });
  });

  it('a clip that shrank under its fades scales them proportionally', () => {
    // stored 4 + 4 on a 4s clip → 2 + 2
    expect(effectiveFades(4, 4, 4)).toEqual({ fadeIn: 2, fadeOut: 2 });
    // asymmetric: 3 + 1 on a 2s clip → 1.5 + 0.5
    expect(effectiveFades(3, 1, 2)).toEqual({ fadeIn: 1.5, fadeOut: 0.5 });
  });

  it('computeFadeCurves emits the scaled regions — no overlap', () => {
    const curves = computeFadeCurves([{ ...clip(1, 0, 4), fadeIn: 4, fadeOut: 4 }]);
    expect(curves).toEqual([
      { clipId: 1, side: 'in', start: 0, end: 2, authored: true, shape: 1 },
      { clipId: 1, side: 'out', start: 2, end: 4, authored: true, shape: 1 },
    ]);
  });
});

describe('equal-power gains', () => {
  it('sum of squares is 1 across the fade (constant power)', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(fadeOutGain(t) ** 2 + fadeInGain(t) ** 2).toBeCloseTo(1);
    }
  });

  it('endpoints: outgoing 1→0, incoming 0→1', () => {
    expect(fadeOutGain(0)).toBeCloseTo(1);
    expect(fadeOutGain(1)).toBeCloseTo(0);
    expect(fadeInGain(0)).toBeCloseTo(0);
    expect(fadeInGain(1)).toBeCloseTo(1);
  });
});

describe('fadeCurvePath', () => {
  it('spans the full 0..100 box: out starts top-left, in ends top-right', () => {
    expect(fadeCurvePath('out').startsWith('M 0.00,0.00')).toBe(true);
    expect(fadeCurvePath('out').endsWith('100.00,100.00')).toBe(true);
    expect(fadeCurvePath('in').startsWith('M 0.00,100.00')).toBe(true);
    expect(fadeCurvePath('in').endsWith('100.00,0.00')).toBe(true);
  });
});
