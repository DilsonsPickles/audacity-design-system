/**
 * FadeMenuItems — ONE fade's menu, for one side of a clip (2026-10-06,
 * "unify the fade options in the clip context menu and the right-click
 * handle menu"): the shape presets, the current one checked; a divider;
 * "Fade-in length…" (the duration dialog); "Remove fade-in" (dimmed
 * while there is no fade). The handle's right-click menu IS this list,
 * and the clip context menu's Fade-in ▸ / Fade-out ▸ parents hold the
 * same list — the handle menu is the shortcut to it.
 *
 * WORDS (user decision 2026-10-07): "Fade-in" and "Fade-out", hyphenated,
 * are the NOUNS — the thing on the clip's edge — and name the parents
 * and the items about it ("Fade-in length…", "Remove fade-in"); "fade
 * in" and "fade out", two words, are the VERBS, kept for an action that
 * performs one ("Fade in…" on a host with no presets).
 */
import React from 'react';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';

export type FadeSide = 'in' | 'out';

export interface FadeMenuPreset {
  id: string;
  label: string;
}

export interface FadeMenuSideState {
  /** The preset the fade's shape matches, if any (a dragged handle matches none) */
  presetId?: string;
  /** Whether the fade has any length — Remove is dimmed without one */
  hasFade: boolean;
}

export interface FadeMenuItemsProps {
  side: FadeSide;
  presets: ReadonlyArray<FadeMenuPreset>;
  state: FadeMenuSideState;
  onShape?: (side: FadeSide, presetId: string) => void;
  onLength?: (side: FadeSide) => void;
  onRemove?: (side: FadeSide) => void;
  onClose?: () => void;
}

/** The noun: the fade on that edge */
export const fadeSideLabel = (side: FadeSide) => (side === 'in' ? 'Fade-in' : 'Fade-out');

export function FadeMenuItems({ side, presets, state, onShape, onLength, onRemove, onClose }: FadeMenuItemsProps) {
  const label = fadeSideLabel(side);
  return (
    <>
      {presets.map((preset) => (
        <ContextMenuItem
          key={preset.id}
          label={preset.label}
          checked={state.presetId === preset.id}
          onClick={() => { onShape?.(side, preset.id); onClose?.(); }}
        />
      ))}
      <ContextMenuItem isDivider />
      <ContextMenuItem label={`${label} length…`} onClick={() => { onLength?.(side); onClose?.(); }} />
      <ContextMenuItem
        label={`Remove ${label.toLowerCase()}`}
        disabled={!state.hasFade}
        onClick={() => { onRemove?.(side); onClose?.(); }}
      />
    </>
  );
}
