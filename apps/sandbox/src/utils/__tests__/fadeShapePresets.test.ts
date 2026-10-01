import { describe, it, expect } from 'vitest';
import { FADE_SHAPE_PRESETS, fadeShapePresetOf, CROSSFADE_SHAPE_PRESETS, crossfadeShapePresetOf } from '../fadeShapePresets';
import { DEFAULT_CROSSFADE_SHAPE, DEFAULT_QUICK_FADE_SHAPE, FADE_HANDLE_LIMITS, fadeInGain, isFadeHandle } from '@audacity-ui/components';

describe('fade shape presets — the right-click menu\'s choices', () => {
  it('each preset is recognised as itself, and nothing in between is a preset', () => {
    for (const p of FADE_SHAPE_PRESETS) expect(fadeShapePresetOf(p.shape)).toBe(p.id);
    expect(fadeShapePresetOf(undefined)).toBe('default'); // a fade with no stored shape IS the S-curve
    expect(fadeShapePresetOf({ t: 0.5, g: 0.6 })).toBeUndefined(); // the handle dragged part way
    expect(fadeShapePresetOf({ t: 0.3, g: FADE_HANDLE_LIMITS.gMax })).toBeUndefined(); // off the middle (a stored project)
    expect(fadeShapePresetOf(3)).toBeUndefined(); // some other exponent
  });

  it('Fast and Slow are the handle at its own gain limits, so a drag can reach exactly them', () => {
    const fast = FADE_SHAPE_PRESETS.find((p) => p.id === 'fast')!.shape;
    const slow = FADE_SHAPE_PRESETS.find((p) => p.id === 'slow')!.shape;
    expect(isFadeHandle(fast) && fast.g).toBe(FADE_HANDLE_LIMITS.gMax);
    expect(isFadeHandle(slow) && slow.g).toBe(FADE_HANDLE_LIMITS.gMin);
    // …and they mean what they say: at the fade's middle, Fast is louder than the S-curve, Slow quieter
    expect(fadeInGain(0.5, fast)).toBeGreaterThan(fadeInGain(0.5, DEFAULT_QUICK_FADE_SHAPE));
    expect(fadeInGain(0.5, slow)).toBeLessThan(fadeInGain(0.5, DEFAULT_QUICK_FADE_SHAPE));
  });

  it('the S-curve preset stores the quick fade default, which the reducer clears', () => {
    expect(FADE_SHAPE_PRESETS.find((p) => p.id === 'default')!.shape).toBe(DEFAULT_QUICK_FADE_SHAPE);
  });
});

describe('crossfade shape presets — the node\'s right-click menu', () => {
  it('each preset is itself, only when BOTH sides are; a depth-dragged crossing is none', () => {
    for (const p of CROSSFADE_SHAPE_PRESETS) expect(crossfadeShapePresetOf(p.shape, p.shape)).toBe(p.id);
    expect(crossfadeShapePresetOf(undefined, undefined)).toBe('equal-power'); // nothing stored = the default
    expect(crossfadeShapePresetOf(1, undefined)).toBe('equal-power');
    expect(crossfadeShapePresetOf('linear', 1)).toBeUndefined(); // sides disagree
    expect(crossfadeShapePresetOf(1.7, 1.7)).toBeUndefined(); // a depth drag's exponent
  });

  it('every preset is an exponent or linear — never a handle — and equal power is the default', () => {
    for (const p of CROSSFADE_SHAPE_PRESETS) expect(typeof p.shape === 'number' || p.shape === 'linear').toBe(true);
    expect(CROSSFADE_SHAPE_PRESETS.find((p) => p.id === 'equal-power')!.shape).toBe(DEFAULT_CROSSFADE_SHAPE);
  });
});
