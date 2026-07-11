import React from 'react';
import { EffectsPanel } from '@dilsonspickles/components';
import { getAllEffects } from '@audacity-ui/core';
import { useTracksDispatch } from '../../contexts/TracksContext';
import type { Track, Effect } from '../../contexts/TracksContext';
import type { PurchasedEffect } from '../../contexts/MuseHubContext';
import type { EffectsPanelState, EffectDialogState } from '../../hooks/useContextMenuState';

/** Shape of EditorLayout's local `effectPicker` state. Kept here (rather
 *  than imported) since it's a plain inline `useState<>` shape in
 *  EditorLayout, not an exported type — structurally identical to it. */
export interface EffectPickerState {
  open: boolean;
  x: number;
  y: number;
  trackIndex?: number;
  anchorRect: DOMRect | null;
}

/** Shape of the lifted (App.tsx-owned) marketplace-modal state, passed
 *  through EditorLayoutProps. Kept here for the same reason as
 *  EffectPickerState above — structurally identical to it. */
export interface MarketplaceModalState {
  open: boolean;
  trackIndex?: number;
  anchorRect?: DOMRect | null;
  replaceIndex?: number;
}

/**
 * Builds the built-in / installed effect id sets `markMissing` uses to
 * decide whether an effect slot's underlying plugin still exists.
 */
export function buildEffectIdSets(installedEffects: Array<{ id: string }>): {
  builtInIds: Set<string>;
  installedIds: Set<string>;
} {
  return {
    builtInIds: new Set(getAllEffects().map((e) => e.id)),
    installedIds: new Set(installedEffects.map((e) => e.id)),
  };
}

/**
 * Marks effects whose underlying plugin is gone. We distinguish two
 * cases so the slot label tells the user *why* the effect isn't
 * playable — and what they can do about it:
 *   - Signed out of MuseHub → "(sign in to use)". Re-auth is the
 *     fix; there's no install action available to a signed-out user.
 *   - Signed in but plugin not installed → "(missing)". The user
 *     has a session, so the marketplace can offer a reinstall.
 * Only the rendered name is mutated — the underlying track state
 * keeps the clean name so signing back in restores the slot.
 *
 * Render-only annotation: never mutates `effect`. Returns the same
 * object reference when nothing is missing, and a new object (via
 * spread) when annotating — the input is never written to.
 */
export function markMissing<T extends { id: string; name: string }>(
  effect: T,
  builtInIds: Set<string>,
  installedIds: Set<string>,
  museHubSignedIn: boolean,
): T {
  if (builtInIds.has(effect.id) || installedIds.has(effect.id)) return effect;
  const suffix = museHubSignedIn ? '(missing)' : '(sign in to use)';
  return { ...effect, name: `⚠ ${effect.name} ${suffix}` };
}

export interface TrackEffectsPanelProps {
  /** Non-null: EditorLayout only renders this component when
   *  `activeMenuItem !== 'export' && effectsPanel?.isOpen` — the gating
   *  stays at the call site (SnapGuideline precedent), so this component
   *  always renders once mounted. */
  effectsPanel: EffectsPanelState;
  tracks: Track[];
  masterEffects: Effect[];
  masterEffectsEnabled: boolean;
  museHubSignedIn: boolean;
  installedEffects: PurchasedEffect[];
  disabledPluginIds: Set<string>;
  setEffectPicker: React.Dispatch<React.SetStateAction<EffectPickerState>>;
  setEffectDialog: React.Dispatch<React.SetStateAction<EffectDialogState | null>>;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  setMarketplaceModal: React.Dispatch<React.SetStateAction<MarketplaceModalState>>;
}

/** Sidebar panel showing the effects chain for the track whose effects
 *  button opened it, plus the master effects chain below. Verbatim
 *  extraction of EditorLayout's former inline "Effects Panel" block. */
export function TrackEffectsPanel({
  effectsPanel,
  tracks,
  masterEffects,
  masterEffectsEnabled,
  museHubSignedIn,
  installedEffects,
  disabledPluginIds,
  setEffectPicker,
  setEffectDialog,
  setEffectsPanel,
  setMarketplaceModal,
}: TrackEffectsPanelProps) {
  const dispatch = useTracksDispatch();

  const trackIndex = effectsPanel.trackIndex;
  const rawTrackEffects = tracks[trackIndex]?.effects || [];
  const trackEffectsEnabled = tracks[trackIndex]?.effectsEnabled ?? true;

  // Mark effects whose underlying plugin is gone. See markMissing above
  // for why the two suffix variants exist.
  const { builtInIds, installedIds } = buildEffectIdSets(installedEffects);
  const annotate = <T extends { id: string; name: string }>(e: T) =>
    markMissing(e, builtInIds, installedIds, museHubSignedIn);
  const currentTrackEffects = rawTrackEffects.map(annotate);
  const masterEffectsFlagged = masterEffects.map(annotate);

  return (
    <EffectsPanel
      isOpen={effectsPanel.isOpen}
      mode="sidebar"
      trackSection={{
        trackName: tracks[trackIndex]?.name || 'Track',
        effects: currentTrackEffects,
        allEnabled: trackEffectsEnabled,
        onToggleAll: (enabled) => {
          dispatch({ type: 'TOGGLE_ALL_TRACK_EFFECTS', payload: { trackIndex, enabled } });
        },
        onEffectToggle: (index, enabled) => {
          dispatch({
            type: 'UPDATE_TRACK_EFFECT',
            payload: { trackIndex, effectIndex: index, updates: { enabled } }
          });
        },
        onEffectChange: (index, _effectId) => {
          const effect = currentTrackEffects[index];
          setEffectDialog({
            isOpen: true,
            effectId: effect.id,
            effectName: effect.name,
            trackIndex,
            effectIndex: index,
            triggerElement: document.activeElement as HTMLElement,
          });
        },
        onEffectsReorder: (fromIndex, toIndex) => {
          dispatch({
            type: 'REORDER_TRACK_EFFECTS',
            payload: { trackIndex, fromIndex, toIndex }
          });
        },
        onAddEffect: (e) => {
          const target = e?.currentTarget as HTMLElement | undefined;
          const rect = target?.getBoundingClientRect();
          setEffectPicker({
            open: true,
            x: rect ? rect.right + 4 : 0,
            y: rect ? rect.top : 0,
            trackIndex,
            anchorRect: rect ?? null,
          });
        },
        onContextMenu: (_e) => {
        },
        onRemoveEffect: (index) => {
          dispatch({ type: 'REMOVE_TRACK_EFFECT', payload: { trackIndex, effectIndex: index } });
        },
        onReplaceEffect: (index, effectName) => {
          dispatch({
            type: 'UPDATE_TRACK_EFFECT',
            payload: { trackIndex, effectIndex: index, updates: { name: effectName } }
          });
        },
        onChangeEffect: (index, anchor) => {
          setMarketplaceModal({ open: true, trackIndex, anchorRect: anchor, replaceIndex: index });
        },
        purchasedEffects: installedEffects,
        disabledPluginIds,
      }}
      masterSection={{
        effects: masterEffectsFlagged,
        allEnabled: masterEffectsEnabled,
        onToggleAll: (enabled) => {
          dispatch({ type: 'TOGGLE_ALL_MASTER_EFFECTS', payload: enabled });
        },
        onEffectToggle: (index, enabled) => {
          dispatch({
            type: 'UPDATE_MASTER_EFFECT',
            payload: { effectIndex: index, updates: { enabled } }
          });
        },
        onEffectChange: (index, _effectId) => {
          const effect = masterEffects[index];
          setEffectDialog({
            isOpen: true,
            effectId: effect.id,
            effectName: effect.name,
            trackIndex: undefined,
            effectIndex: index,
            triggerElement: document.activeElement as HTMLElement,
          });
        },
        onEffectsReorder: (fromIndex, toIndex) => {
          dispatch({
            type: 'REORDER_MASTER_EFFECTS',
            payload: { fromIndex, toIndex }
          });
        },
        onAddEffect: (e) => {
          const target = e?.currentTarget as HTMLElement | undefined;
          const rect = target?.getBoundingClientRect();
          setEffectPicker({
            open: true,
            x: rect ? rect.right + 4 : 0,
            y: rect ? rect.top : 0,
            trackIndex: undefined,
            anchorRect: rect ?? null,
          });
        },
        onContextMenu: (_e) => {
        },
        onRemoveEffect: (index) => {
          dispatch({ type: 'REMOVE_MASTER_EFFECT', payload: index });
        },
        onReplaceEffect: (index, effectName) => {
          dispatch({
            type: 'UPDATE_MASTER_EFFECT',
            payload: { effectIndex: index, updates: { name: effectName } }
          });
        },
        onChangeEffect: (index, anchor) => {
          setMarketplaceModal({ open: true, trackIndex: undefined, anchorRect: anchor, replaceIndex: index });
        },
        purchasedEffects: installedEffects,
        disabledPluginIds,
      }}
      onClose={() => setEffectsPanel(null)}
    />
  );
}
