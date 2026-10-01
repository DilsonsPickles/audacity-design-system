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
import { DEFAULT_QUICK_FADE_SHAPE, FADE_HANDLE_LIMITS, isDefaultQuickFadeShape, isFadeHandle, type FadeShape } from '@audacity-ui/components';

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
