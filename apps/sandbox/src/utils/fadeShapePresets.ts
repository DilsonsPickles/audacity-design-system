/**
 * The quick fade's shape presets — the "dive deeper" door beside the
 * direct gestures (user decision 2026-10-01, after a look at REAPER's
 * shape picker): a right-click on a fade's handle lists these, and the
 * one the fade is now wears the check. Each is just a value of the
 * shape the handle already stores, so a preset is a starting point, not
 * a mode — the handle can be dragged on from it.
 *
 * The vertical-only handle leaves one axis to name presets along: the
 * gain at the fade's middle. "Fast" and "Slow" sit at the handle's own
 * gain limits, so they are exactly as far as a drag can go.
 */
import { DEFAULT_CROSSFADE_SHAPE, DEFAULT_QUICK_FADE_SHAPE, FADE_HANDLE_LIMITS, isDefaultQuickFadeShape, isFadeHandle, type FadeShape } from '@audacity-ui/components';

export interface FadeShapePreset {
  id: 'default' | 'linear' | 'equal-power' | 'fast' | 'slow';
  label: string;
  /** What choosing it stores (the reducer clears a default) */
  shape: FadeShape;
}

export const FADE_SHAPE_PRESETS: readonly FadeShapePreset[] = [
  { id: 'default', label: 'S-curve', shape: DEFAULT_QUICK_FADE_SHAPE },
  { id: 'linear', label: 'Linear', shape: 'linear' },
  { id: 'equal-power', label: 'Equal power', shape: 1 },
  { id: 'fast', label: 'Fast', shape: { t: 0.5, g: FADE_HANDLE_LIMITS.gMax } },
  { id: 'slow', label: 'Slow', shape: { t: 0.5, g: FADE_HANDLE_LIMITS.gMin } },
];

/** The CROSSFADE's presets — exponents on the equal-power base, the
 *  same on both sides so the crossing stays in the middle; never a
 *  handle (a crossfade's shapes are exponents or 'linear'). Equal power
 *  is its default. */
export interface CrossfadeShapePreset {
  id: 'equal-power' | 'linear' | 's-curve';
  label: string;
  shape: number | 'linear';
}

export const CROSSFADE_SHAPE_PRESETS: readonly CrossfadeShapePreset[] = [
  { id: 'equal-power', label: 'Equal power', shape: DEFAULT_CROSSFADE_SHAPE },
  { id: 'linear', label: 'Linear', shape: 'linear' },
  { id: 's-curve', label: 'S-curve', shape: 2 },
];

/** Which preset a crossfade is — only when BOTH sides are that preset;
 *  a depth-dragged crossing (any other exponent) is none. */
export function crossfadeShapePresetOf(outShape: number | 'linear' | undefined, inShape: number | 'linear' | undefined): CrossfadeShapePreset['id'] | undefined {
  const one = (s: number | 'linear' | undefined): CrossfadeShapePreset['id'] | undefined => {
    if (s === undefined) return 'equal-power';
    if (s === 'linear') return 'linear';
    if (Math.abs(s - DEFAULT_CROSSFADE_SHAPE) < EPSILON) return 'equal-power';
    if (Math.abs(s - 2) < EPSILON) return 's-curve';
    return undefined;
  };
  const a = one(outShape);
  return a !== undefined && a === one(inShape) ? a : undefined;
}

const EPSILON = 1e-6;

/** Which preset a stored shape is, if it is one — undefined when the
 *  handle has been dragged somewhere between them. */
export function fadeShapePresetOf(shape: FadeShape | undefined): FadeShapePreset['id'] | undefined {
  if (shape === undefined || isDefaultQuickFadeShape(shape)) return 'default';
  if (shape === 'linear') return 'linear';
  if (typeof shape === 'number') return Math.abs(shape - 1) < EPSILON ? 'equal-power' : undefined;
  if (isFadeHandle(shape)) {
    if (Math.abs(shape.t - 0.5) > EPSILON) return undefined;
    if (Math.abs(shape.g - FADE_HANDLE_LIMITS.gMax) < EPSILON) return 'fast';
    if (Math.abs(shape.g - FADE_HANDLE_LIMITS.gMin) < EPSILON) return 'slow';
  }
  return undefined;
}
