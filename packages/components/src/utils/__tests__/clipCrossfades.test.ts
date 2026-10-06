import { describe, it, expect } from 'vitest';
import {
  computeCrossfades,
  computeFadeCurves,
  effectiveFades,
  fadeInGain,
  fadeOutGain,
  fadeCurvePath,
  fadeAreaAbovePath,
  fadeAreaBelowPath,
  fadeGainAt,
  localFadeRegionsByClip,
  DEFAULT_QUICK_FADE_SHAPE,
  DEFAULT_CROSSFADE_SHAPE,
  FADE_HANDLE_LIMITS,
  clampFadeHandle,
  fadeHandleOf,
  handleCurveGain,
  isDefaultQuickFadeShape,
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
      { clipId: 1, side: 'in', start: 2, end: 3, authored: true, shape: 2 },
      { clipId: 1, side: 'out', start: 6, end: 8, authored: true, shape: 2 },
    ]);
  });

  it('a fade on the NON-overlapped (free) edge coexists with the crossfade ramps', () => {
    const curves = computeFadeCurves([{ ...clip(1, 0, 5), fadeIn: 1 }, clip(2, 3, 4)]);
    expect(curves).toContainEqual({ clipId: 1, side: 'in', start: 0, end: 1, authored: true, shape: 2 });
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
    // asymmetric: 3 + 1 on a 2s clip — each clamps to the duration
    // first (2 + 1), then scales to fit: 4/3 + 2/3
    const eff = effectiveFades(3, 1, 2);
    expect(eff.fadeIn).toBeCloseTo(4 / 3, 6);
    expect(eff.fadeOut).toBeCloseTo(2 / 3, 6);
    expect(eff.fadeIn + eff.fadeOut).toBeCloseTo(2, 6);
  });

  it('computeFadeCurves emits the scaled regions — no overlap', () => {
    const curves = computeFadeCurves([{ ...clip(1, 0, 4), fadeIn: 4, fadeOut: 4 }]);
    expect(curves).toEqual([
      { clipId: 1, side: 'in', start: 0, end: 2, authored: true, shape: 2 },
      { clipId: 1, side: 'out', start: 2, end: 4, authored: true, shape: 2 },
    ]);
  });
});

describe('quick fades never overlap a crossfade', () => {
  it('a free-edge quick fade clamps to the crossfade boundary', () => {
    // A[0..5] × B[3..7]: B's head is crossfaded to 5; its 3s fade-out
    // may only span the free window [5, 7] → clamped to 2s
    const curves = computeFadeCurves([clip(1, 0, 5), { ...clip(2, 3, 4), fadeOut: 3 }]);
    expect(curves).toContainEqual({ clipId: 2, side: 'out', start: 5, end: 7, authored: true, shape: 2 });
  });

  it('the outgoing clip\'s head fade clamps against its tail crossfade', () => {
    // A[0..5] fades in over 4.5s but its tail from 3 is crossfaded →
    // free window [0, 3] → fade-in clamped to 3s
    const curves = computeFadeCurves([{ ...clip(1, 0, 5), fadeIn: 4.5 }, clip(2, 3, 4)]);
    expect(curves).toContainEqual({ clipId: 1, side: 'in', start: 0, end: 3, authored: true, shape: 2 });
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

describe("'linear' fade shape", () => {
  // No exponent can make a straight line (cos^k always starts flat),
  // so linear is its own value. Both sides linear = equal-GAIN.
  it('fade-out is 1 - t and fade-in is t', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(fadeOutGain(t, 'linear')).toBeCloseTo(1 - t, 10);
      expect(fadeInGain(t, 'linear')).toBeCloseTo(t, 10);
    }
  });

  it('two linear sides sum to constant amplitude (equal gain), unlike equal-power', () => {
    expect(fadeOutGain(0.5, 'linear') + fadeInGain(0.5, 'linear')).toBeCloseTo(1, 10);
    expect(fadeOutGain(0.5, 1) + fadeInGain(0.5, 1)).toBeCloseTo(Math.SQRT2, 10);
  });

  it('draws as a straight line through the midpoint', () => {
    expect(fadeCurvePath('out', 4, 'linear')).toBe('M 0.00,0.00 L 25.00,25.00 L 50.00,50.00 L 75.00,75.00 L 100.00,100.00');
    expect(fadeCurvePath('in', 2, 'linear')).toBe('M 0.00,100.00 L 50.00,50.00 L 100.00,0.00');
  });
});

describe('fadeGainAt — the gain the waveform is drawn with', () => {
  it('is 1 with no regions, and full outside a fade on its own side', () => {
    expect(fadeGainAt(3, undefined)).toBe(1);
    expect(fadeGainAt(3, [])).toBe(1);
    expect(fadeGainAt(3, [{ side: 'in', start: 0, end: 1, shape: 1 }])).toBe(1);
    expect(fadeGainAt(3, [{ side: 'out', start: 8, end: 10, shape: 1 }])).toBe(1);
  });

  it('follows the same curve the audio bake applies', () => {
    const out = [{ side: 'out' as const, start: 8, end: 10, shape: 1 }];
    expect(fadeGainAt(8, out)).toBeCloseTo(1, 10);
    expect(fadeGainAt(9, out)).toBeCloseTo(fadeOutGain(0.5, 1), 10);
    expect(fadeGainAt(10, out)).toBeCloseTo(0, 10);
    const lin = [{ side: 'in' as const, start: 0, end: 2, shape: 'linear' as const }];
    expect(fadeGainAt(0.5, lin)).toBeCloseTo(0.25, 10);
  });

  it('multiplies an in and an out that overlap', () => {
    const both = [
      { side: 'in' as const, start: 0, end: 4, shape: 'linear' as const },
      { side: 'out' as const, start: 2, end: 4, shape: 'linear' as const },
    ];
    expect(fadeGainAt(3, both)).toBeCloseTo(0.75 * 0.5, 10);
  });

  it('localFadeRegionsByClip moves timeline regions into each clip\'s own time', () => {
    const clips = [clip(1, 10, 5), clip(2, 13, 5)];
    const map = localFadeRegionsByClip(clips, [
      { clipId: 1, side: 'out', start: 13, end: 15, authored: false, shape: 1 },
      { clipId: 2, side: 'in', start: 13, end: 15, authored: false, shape: 2 },
    ]);
    expect(map.get(1)).toEqual([{ side: 'out', start: 3, end: 5, shape: 1 }]);
    expect(map.get(2)).toEqual([{ side: 'in', start: 0, end: 2, shape: 2 }]);
  });
});

describe('the default shape — an S-curve for quick fades, equal-power for crossfades', () => {
  const clip = (id: number, start: number, duration: number) => ({ id, start, duration });

  it('a quick fade with no stored shape is the raised cosine', () => {
    expect(DEFAULT_QUICK_FADE_SHAPE).toBe(2);
    const [region] = computeFadeCurves([{ ...clip(1, 0, 4), fadeIn: 1 }]);
    expect(region.shape).toBe(DEFAULT_QUICK_FADE_SHAPE);
    // Flat at both ends, half gain at the middle, symmetric about it
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const raisedCosine = (1 - Math.cos(Math.PI * t)) / 2;
      expect(fadeInGain(t, region.shape)).toBeCloseTo(raisedCosine, 10);
      expect(fadeOutGain(t, region.shape)).toBeCloseTo(1 - raisedCosine, 10);
    }
    expect(fadeInGain(0.5, region.shape)).toBeCloseTo(0.5, 10);
    // Gentle away from silence: far below the equal-power curve early on
    expect(fadeInGain(0.1, region.shape)).toBeLessThan(fadeInGain(0.1, 1) / 5);
  });

  it('a crossfade with no stored shape stays equal-power', () => {
    expect(DEFAULT_CROSSFADE_SHAPE).toBe(1);
    const curves = computeFadeCurves([clip(1, 0, 5), clip(2, 3, 4)]);
    expect(curves.map((r) => r.shape)).toEqual([1, 1]);
    // Constant power across the overlap — no dip in the middle
    for (const t of [0.25, 0.5, 0.75]) {
      expect(fadeOutGain(t, curves[0].shape) ** 2 + fadeInGain(t, curves[1].shape) ** 2).toBeCloseTo(1, 10);
    }
  });

  it('a STORED shape wins over either default — equal-power is a choice a quick fade can make', () => {
    const [quick] = computeFadeCurves([{ ...clip(1, 0, 4), fadeIn: 1, fadeInShape: 1 }]);
    expect(quick.shape).toBe(1);
    const [lin] = computeFadeCurves([{ ...clip(1, 0, 4), fadeOut: 1, fadeOutShape: 'linear' as const }]);
    expect(lin.shape).toBe('linear');
  });

  it('one edge, nothing stored: S-curve as a quick fade, equal-power once crossfaded', () => {
    const a = { ...clip(1, 0, 5), fadeOut: 1 };
    expect(computeFadeCurves([a])[0].shape).toBe(2);
    const crossed = computeFadeCurves([a, clip(2, 3, 4)]);
    expect(crossed.find((r) => r.clipId === 1 && r.side === 'out')!.shape).toBe(1);
  });
});

describe('the handle-shaped S-curve', () => {
  const { tMin, tMax, gMin, gMax } = FADE_HANDLE_LIMITS;
  const corners = [
    { t: tMin, g: gMax },
    { t: tMax, g: gMax },
    { t: tMax, g: gMin },
    { t: tMin, g: gMin },
  ];
  const handles = [...corners, { t: 0.5, g: 0.5 }, { t: 0.3, g: 0.6 }, { t: 0.7, g: 0.35 }, { t: 0.5, g: gMax }, { t: tMin, g: 0.5 }];

  it('the limits are the box: 25–75% along, 10–90% gain (2026-10-06; it was 15–85% and 27.5–72.5%)', () => {
    expect(FADE_HANDLE_LIMITS).toEqual({ tMin: 0.25, tMax: 0.75, gMin: 0.1, gMax: 0.9 });
    expect(clampFadeHandle({ t: -3, g: 9 })).toEqual({ t: 0.25, g: 0.9 });
    expect(clampFadeHandle({ t: 3, g: -9 })).toEqual({ t: 0.75, g: 0.1 });
    expect(clampFadeHandle({ t: 0.4, g: 0.6 })).toEqual({ t: 0.4, g: 0.6 });
  });

  it('at the centre it is exactly the default S-curve', () => {
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      expect(handleCurveGain(t, { t: 0.5, g: 0.5 })).toBeCloseTo(fadeInGain(t, DEFAULT_QUICK_FADE_SHAPE), 12);
      expect(fadeOutGain(t, { t: 0.5, g: 0.5 })).toBeCloseTo(fadeOutGain(t, DEFAULT_QUICK_FADE_SHAPE), 12);
    }
  });

  it('runs from silence to full, always rising, through the handle — everywhere in the box', () => {
    for (const h of handles) {
      expect(fadeInGain(0, h)).toBeCloseTo(0, 12);
      expect(fadeInGain(1, h)).toBeCloseTo(1, 12);
      expect(fadeInGain(h.t, h)).toBeCloseTo(h.g, 12);
      let prev = -1;
      for (let k = 0; k <= 200; k++) {
        const g = fadeInGain(k / 200, h);
        expect(Number.isFinite(g)).toBe(true);
        expect(g).toBeGreaterThanOrEqual(prev);
        expect(g).toBeLessThanOrEqual(1 + 1e-12);
        prev = g;
      }
    }
  });

  it('stays an S at the corners — it eases at both ends, never a hard corner', () => {
    for (const h of corners) {
      // At each end the curve is flatter than a straight line would
      // be: the first and last 0.5% of the fade move less than 0.5% of
      // the gain
      expect(fadeInGain(0.005, h)).toBeLessThan(0.005);
      expect(1 - fadeInGain(0.995, h)).toBeLessThan(0.005);
    }
  });

  it('matches the reference curves at the four corners', () => {
    // Positions along the fade where the reference curve crosses a
    // gain of 10%, 50% and 90%, measured off the reference images
    const reference: Array<[{ t: number; g: number }, number[]]> = [
      [{ t: 0.15, g: 0.725 }, [0.029, 0.102, 0.226]],
      [{ t: 0.85, g: 0.725 }, [0.618, 0.787, 0.907]],
      [{ t: 0.85, g: 0.275 }, [0.778, 0.902, 0.974]],
      [{ t: 0.15, g: 0.275 }, [0.096, 0.216, 0.385]],
    ];
    const crossing = (h: { t: number; g: number }, gain: number) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (fadeInGain(mid, h) < gain) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    for (const [h, ts] of reference) {
      [0.1, 0.5, 0.9].forEach((gain, i) => {
        // within 3% of the fade's length
        expect(Math.abs(crossing(h, gain) - ts[i])).toBeLessThan(0.03);
      });
    }
  });

  it('a fade out is the fade in played backwards', () => {
    for (const h of handles) {
      expect(fadeOutGain(0, h)).toBeCloseTo(1, 12);
      expect(fadeOutGain(1, h)).toBeCloseTo(0, 12);
      expect(fadeOutGain(h.t, h)).toBeCloseTo(h.g, 12);
      for (const t of [0.1, 0.4, 0.8]) {
        expect(fadeOutGain(t, h)).toBeCloseTo(fadeInGain(1 - t, { t: 1 - h.t, g: h.g }), 12);
      }
    }
  });

  it('fadeHandleOf: a handle shape is its own position; anything else sits at the middle of its curve', () => {
    expect(fadeHandleOf('in', { t: 0.3, g: 0.6 })).toEqual({ t: 0.3, g: expect.closeTo(0.6, 12) });
    expect(fadeHandleOf('in', 2)).toEqual({ t: 0.5, g: expect.closeTo(0.5, 12) });
    expect(fadeHandleOf('out', 1)).toEqual({ t: 0.5, g: expect.closeTo(Math.SQRT1_2, 12) });
    expect(fadeHandleOf('out', 'linear')).toEqual({ t: 0.5, g: 0.5 });
  });

  it('isDefaultQuickFadeShape: nothing stored, the exponent 2, or a handle at the centre', () => {
    expect(isDefaultQuickFadeShape(undefined)).toBe(true);
    expect(isDefaultQuickFadeShape(2.004)).toBe(true);
    expect(isDefaultQuickFadeShape({ t: 0.502, g: 0.498 })).toBe(true);
    expect(isDefaultQuickFadeShape(1)).toBe(false);
    expect(isDefaultQuickFadeShape('linear')).toBe(false);
    expect(isDefaultQuickFadeShape({ t: 0.5, g: 0.6 })).toBe(false);
  });

  it('computeFadeCurves carries a handle shape through to the drawn region', () => {
    const h = { t: 0.2, g: 0.7 };
    const [region] = computeFadeCurves([{ id: 1, start: 0, duration: 4, fadeIn: 1, fadeInShape: h }]);
    expect(region.shape).toEqual(h);
  });
});

describe('the areas either side of a fade curve', () => {
  it('both are the curve itself, closed through the corner on their own side', () => {
    for (const shape of [2, 'linear' as const, { t: 0.2, g: 0.7 }]) {
      for (const side of ['in', 'out'] as const) {
        const curve = fadeCurvePath(side, 8, shape);
        const above = fadeAreaAbovePath(side, 8, shape);
        const below = fadeAreaBelowPath(side, 8, shape);
        expect(above.startsWith(curve)).toBe(true);
        expect(below.startsWith(curve)).toBe(true);
        // A fade in runs bottom-left → top-right: top-left is above it,
        // bottom-right below. A fade out is the mirror image.
        expect(above.slice(curve.length)).toBe(side === 'in' ? ' L 0.00,0.00 Z' : ' L 100.00,0.00 Z');
        expect(below.slice(curve.length)).toBe(side === 'in' ? ' L 100.00,100.00 Z' : ' L 0.00,100.00 Z');
      }
    }
  });
});

describe('a crossfade has its own shapes (2026-10-01)', () => {
  it('a fresh overlap is symmetric equal-power whatever quick fades the clips had, and those shapes survive it', () => {
    const outgoing = { id: 1, start: 0, duration: 5, fadeOut: 1, fadeOutShape: { t: 0.5, g: 0.3 } };
    const incoming = { id: 2, start: 3, duration: 4, fadeIn: 1, fadeInShape: 'linear' as const };
    const regions = computeFadeCurves([outgoing, incoming]);
    const crossfade = regions.filter((r) => !r.authored);
    expect(crossfade).toHaveLength(2);
    for (const r of crossfade) expect(r.shape).toBe(DEFAULT_CROSSFADE_SHAPE);
    // The quick fades' shapes are not consumed — they are still on the clips
    expect(outgoing.fadeOutShape).toEqual({ t: 0.5, g: 0.3 });
    expect(incoming.fadeInShape).toBe('linear');
    // …and with the clips apart they draw as authored again
    const apart = computeFadeCurves([outgoing, { ...incoming, start: 6 }]);
    expect(apart.find((r) => r.clipId === 1 && r.side === 'out')!.shape).toEqual({ t: 0.5, g: 0.3 });
    expect(apart.find((r) => r.clipId === 2 && r.side === 'in')!.shape).toBe('linear');
  });

  it('the crossfade reads crossfade*Shape, the quick fade fade*Shape — never the other way round', () => {
    const regions = computeFadeCurves([
      { id: 1, start: 0, duration: 5, crossfadeOutShape: 'linear', fadeOutShape: 3 },
      { id: 2, start: 3, duration: 4, crossfadeInShape: 2, fadeInShape: 3 },
    ]);
    expect(regions.find((r) => r.clipId === 1 && !r.authored)!.shape).toBe('linear');
    expect(regions.find((r) => r.clipId === 2 && !r.authored)!.shape).toBe(2);
  });
});
