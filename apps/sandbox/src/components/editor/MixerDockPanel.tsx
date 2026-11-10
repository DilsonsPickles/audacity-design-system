import React from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { MixerPanel, type MixerPanelChannel, type ThemeTokens } from '@audacity-ui/components';
import { type TracksState } from '../../contexts/TracksContext';
import { useTracksDispatch } from '../../contexts/useTracks';
import type { EffectSelectorMenuState } from '../../hooks/useContextMenuState';

export interface MixerDockPanelProps {
  state: TracksState;
  theme: ThemeTokens;
  trackMeterLevels: Map<number, number>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  setEffectSelectorMenu: React.Dispatch<React.SetStateAction<EffectSelectorMenuState | null>>;
  /** In a side dock (the VERTICAL layout): the strips fill the dock's
   *  height, the faders taking the extra, and the row labels go */
  vertical?: boolean;
}

/**
 * THE MIXER, wherever it is docked (2026-11-10, "let me put the mixer on
 * left or right"): one channel strip per audio track and the master —
 * moved VERBATIM out of EditorBottomDrawer, where it was the drawer's
 * inline Mixer tab, so the drawer, the side docks and its OS window all
 * draw the same panel.
 */
export function MixerDockPanel({ state, theme, trackMeterLevels, audioManagerRef, setEffectSelectorMenu, vertical = false }: MixerDockPanelProps) {
  const dispatch = useTracksDispatch();

  const audioTracks = state.tracks.filter((t) => t.type !== 'label' && t.type !== 'folder');
  const mixerChannels: MixerPanelChannel[] = audioTracks.map((track) => {
    const trackIndex = state.tracks.findIndex((t) => t.id === track.id);
    const trackGain = track.gain ?? -6;
    const meterLevel = trackMeterLevels.get(trackIndex) ?? 0;
    return {
      id: String(track.id),
      channelProps: {
        trackName: track.name,
        trackColor: track.color ? (theme.audio.clip as any)[track.color]?.header : undefined, // justified: dynamic string-index into theme tokens (no index signature)
        variant: track.channelSplitRatio !== undefined ? 'stereo' as const : 'mono' as const,
        volume: trackGain,
        pan: track.pan ?? 0,
        muted: track.muted ?? false,
        soloed: track.soloed ?? false,
        meterLeft: meterLevel,
        meterRight: meterLevel,
        onVolumeChange: (value: number) => {
          dispatch({ type: 'UPDATE_TRACK', payload: { index: trackIndex, track: { gain: value } } });
          audioManagerRef.current.setTrackGain(trackIndex, value);
        },
        onPanChange: (value: number) => {
          dispatch({ type: 'UPDATE_TRACK', payload: { index: trackIndex, track: { pan: value } } });
        },
        onMuteToggle: () => {
          const newMuted = !track.muted;
          dispatch({ type: 'UPDATE_TRACK', payload: { index: trackIndex, track: { muted: newMuted } } });
          if (newMuted) {
            audioManagerRef.current.setTrackMuted(trackIndex, true);
          } else {
            audioManagerRef.current.setTrackGain(trackIndex, trackGain);
          }
        },
        onSoloToggle: () => {
          dispatch({ type: 'UPDATE_TRACK', payload: { index: trackIndex, track: { soloed: !track.soloed } } });
        },
        effects: (track.effects || []).map((effect, effectIndex: number) => ({
          name: effect.name,
          enabled: effect.enabled,
          onToggle: () => {
            dispatch({ type: 'UPDATE_TRACK_EFFECT', payload: { trackIndex, effectIndex, updates: { enabled: !effect.enabled } } });
          },
          onRemoveEffect: () => {
            dispatch({ type: 'REMOVE_TRACK_EFFECT', payload: { trackIndex, effectIndex } });
          },
          onReplaceEffect: (effectName: string) => {
            dispatch({ type: 'UPDATE_TRACK_EFFECT', payload: { trackIndex, effectIndex, updates: { name: effectName } } });
          },
        })),
        onAddEffect: (e: React.MouseEvent<HTMLButtonElement>) => {
          const button = e.currentTarget as HTMLElement;
          const rect = button.getBoundingClientRect();
          setEffectSelectorMenu({
            isOpen: true,
            x: rect.left,
            y: rect.bottom + 4,
            trackIndex,
            triggerElement: button,
          });
        },
      },
    };
  });

  return (
    <MixerPanel
      hideHeader
      fillHeight={vertical}
      hideRowLabels={vertical}
      masterChannel={{
        trackName: 'Master',
        trackColor: theme.accent.secondary,
        variant: 'stereo',
        effects: (state.masterEffects || []).map((effect, effectIndex: number) => ({
          name: effect.name,
          enabled: effect.enabled,
          onToggle: () => {
            dispatch({ type: 'UPDATE_MASTER_EFFECT', payload: { effectIndex, updates: { enabled: !effect.enabled } } });
          },
          onRemoveEffect: () => {
            dispatch({ type: 'REMOVE_MASTER_EFFECT', payload: effectIndex });
          },
          onReplaceEffect: (effectName: string) => {
            dispatch({ type: 'UPDATE_MASTER_EFFECT', payload: { effectIndex, updates: { name: effectName } } });
          },
        })),
        onAddEffect: (e: React.MouseEvent<HTMLButtonElement>) => {
          const button = e.currentTarget as HTMLElement;
          const rect = button.getBoundingClientRect();
          setEffectSelectorMenu({
            isOpen: true,
            x: rect.left,
            y: rect.bottom + 4,
            trackIndex: undefined,
            triggerElement: button,
          });
        },
      }}
      channels={mixerChannels}
    />
  );
}
