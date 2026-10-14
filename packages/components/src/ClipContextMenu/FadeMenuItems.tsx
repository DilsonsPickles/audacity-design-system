/**
 * FadeMenuItems — ONE fade's menu, for one side of a clip: the fade
 * handle's right-click menu (and Shift+F10 on a focused handle).
 *
 * TWO ITEMS (user decision 2026-10-14, "what if the fade menu just said
 * 'edit fade' and 'remove fade'?"): "Edit fade-in…" opens the Fades
 * dialog with that side's field focused — the dialog previews live and
 * holds the shape presets, so the preset list this menu carried since
 * 2026-10-06 (the current one checked, then length…, then remove) is
 * gone from here; the presets keep their other doors (the keys 1–5 / 0
 * on a focused handle, the properties panel's dropdown, the dialog) —
 * and "Remove fade-in" (length 0, dimmed while there is no fade). The
 * clip menu's "Edit fades" opens the same dialog.
 *
 * WORDS (user decision 2026-10-07): "Fade-in" and "Fade-out", hyphenated,
 * are the NOUNS — the thing on the clip's edge — and name the items
 * about it; the side is named so a screen-reader user hears which
 * handle's menu opened.
 */
import React from 'react';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';

export type FadeSide = 'in' | 'out';

export interface FadeMenuSideState {
  /** Whether the fade has any length — Remove is dimmed without one */
  hasFade: boolean;
}

export interface FadeMenuItemsProps {
  side: FadeSide;
  state: FadeMenuSideState;
  /** "Edit fade-in…" — the host opens the Fades dialog on this side */
  onEdit?: (side: FadeSide) => void;
  /** "Remove fade-in" — length 0 */
  onRemove?: (side: FadeSide) => void;
  onClose?: () => void;
}

/** The noun: the fade on that edge */
export const fadeSideLabel = (side: FadeSide) => (side === 'in' ? 'Fade-in' : 'Fade-out');

export function FadeMenuItems({ side, state, onEdit, onRemove, onClose }: FadeMenuItemsProps) {
  const noun = fadeSideLabel(side).toLowerCase();
  return (
    <>
      <ContextMenuItem label={`Edit ${noun}…`} onClick={() => { onEdit?.(side); onClose?.(); }} />
      <ContextMenuItem
        label={`Remove ${noun}`}
        disabled={!state.hasFade}
        onClick={() => { onRemove?.(side); onClose?.(); }}
      />
    </>
  );
}
