/**
 * FadeMenuItems — ONE fade's menu, for one side of a clip: the fade
 * handle's right-click menu (and Shift+F10 on a focused handle).
 *
 * THE CURVE TYPES COME FIRST (user decision 2026-10-28, "on the right
 * click menu, can we show the curve types so it's quick and easy to
 * change?"): the shape presets, each with a small drawing of its curve
 * on THIS side, the fade's current one checked (a handle dragged
 * between them checks none), and the 1–5 a focused handle takes shown
 * as their keys; then "Edit fade-in…" (the Fades dialog with that
 * side's field focused) and "Remove fade-in" (length 0, dimmed while
 * there is no fade). From 2026-10-14 the menu was those two items alone
 * ("what if the fade menu just said 'edit fade' and 'remove fade'?"),
 * the presets left to the dialog, the keys and the properties panel —
 * a dialog to change a curve was a long way round. The clip menu's
 * "Edit fades" opens the same dialog.
 *
 * WORDS (user decision 2026-10-07): "Fade-in" and "Fade-out", hyphenated,
 * are the NOUNS — the thing on the clip's edge — and name the items
 * about it; the side is named so a screen-reader user hears which
 * handle's menu opened.
 */
import React from 'react';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';
import { fadeCurvePath, type FadeShape } from '../utils/clipCrossfades';

export type FadeSide = 'in' | 'out';

export interface FadeMenuPreset {
  id: string;
  label: string;
  /** What choosing it stores — drawn as the row's curve */
  shape: FadeShape;
}

export interface FadeMenuSideState {
  /** The preset the fade's shape matches, if any (a dragged handle matches none) */
  presetId?: string;
  /** Whether the fade has any length — Remove is dimmed without one */
  hasFade: boolean;
}

export interface FadeMenuItemsProps {
  side: FadeSide;
  state: FadeMenuSideState;
  /** The curve types, in the order the 1–5 keys pick them; none = no list */
  presets?: ReadonlyArray<FadeMenuPreset>;
  onShape?: (side: FadeSide, presetId: string) => void;
  /** "Edit fade-in…" — the host opens the Fades dialog on this side */
  onEdit?: (side: FadeSide) => void;
  /** "Remove fade-in" — length 0 */
  onRemove?: (side: FadeSide) => void;
  onClose?: () => void;
  /** The OS whose key name Remove shows — ⌫ / Delete, the key a focused
   *  handle takes for the same (2026-10-29) */
  os?: 'macos' | 'windows';
}

/** The noun: the fade on that edge */
export const fadeSideLabel = (side: FadeSide) => (side === 'in' ? 'Fade-in' : 'Fade-out');

/** A preset's curve, drawn small in the row's 16px icon slot — the
 *  canvas's own path, so the row looks like the fade it will make */
function FadeCurveGlyph({ side, shape }: { side: FadeSide; shape: FadeShape }) {
  const line = fadeCurvePath(side, 32, shape);
  return (
    <svg width={16} height={16} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-fade-preset-glyph={side}>
      <path d={`${line} L ${side === 'in' ? '100,100' : '0,100'} Z`} fill="currentColor" opacity={0.2} stroke="none" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function FadeMenuItems({ side, state, presets, onShape, onEdit, onRemove, onClose, os = 'macos' }: FadeMenuItemsProps) {
  const noun = fadeSideLabel(side).toLowerCase();
  return (
    <>
      {presets && presets.length > 0 && (
        <>
          {presets.map((preset, i) => (
            <ContextMenuItem
              key={preset.id}
              label={preset.label}
              icon={<FadeCurveGlyph side={side} shape={preset.shape} />}
              checked={state.presetId === preset.id}
              shortcut={i < 9 ? String(i + 1) : undefined}
              onClick={() => { onShape?.(side, preset.id); onClose?.(); }}
            />
          ))}
          <ContextMenuItem isDivider />
        </>
      )}
      <ContextMenuItem label={`Edit ${noun}…`} onClick={() => { onEdit?.(side); onClose?.(); }} />
      <ContextMenuItem
        label={`Remove ${noun}`}
        shortcut={os === 'macos' ? '⌫' : 'Delete'}
        disabled={!state.hasFade}
        onClick={() => { onRemove?.(side); onClose?.(); }}
      />
    </>
  );
}
