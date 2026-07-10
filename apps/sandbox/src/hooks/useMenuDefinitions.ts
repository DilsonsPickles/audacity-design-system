import React from 'react';
import type { MenuItem } from '@dilsonspickles/components';
import { createMenuDefinitions } from '../data/menuDefinitions';
import { useTracksDispatch } from '../contexts/TracksContext';
import type { Track, TracksState } from '../contexts/TracksContext';
import type { EffectsPanelState } from './useContextMenuState';

export interface UseMenuDefinitionsOptions {
  isCloudProject: boolean;
  dontShowSaveModalAgain: boolean;
  handleImportAudio: () => void;
  handleSaveCloudProject: () => Promise<void>;
  setIsSaveProjectModalOpen: (open: boolean) => void;
  handleSaveToComputer: () => Promise<void>;
  setIsLabelEditorOpen: (open: boolean) => void;
  setIsPreferencesModalOpen: (open: boolean) => void;
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  showRmsInWaveform: boolean;
  setShowRmsInWaveform: React.Dispatch<React.SetStateAction<boolean>>;
  showVerticalRulers: boolean;
  setShowVerticalRulers: React.Dispatch<React.SetStateAction<boolean>>;
  state: TracksState;
  rollInTimeEnabled: boolean;
  setRollInTimeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPluginManagerOpen: (open: boolean) => void;
  handleGenerateTone: () => Promise<void>;
  setIsMacroManagerOpen: (open: boolean) => void;
}

/**
 * Assembles the in-app menu definitions (File/Edit/View/Effect/Generate/
 * Record/Tools) via `createMenuDefinitions`. Extracted verbatim from
 * App.tsx — see docs/codebase-map.md for the extraction history.
 */
export function useMenuDefinitions(options: UseMenuDefinitionsOptions): Record<string, MenuItem[]> {
  const {
    isCloudProject,
    dontShowSaveModalAgain,
    handleImportAudio,
    handleSaveCloudProject,
    setIsSaveProjectModalOpen,
    handleSaveToComputer,
    setIsLabelEditorOpen,
    setIsPreferencesModalOpen,
    effectsPanel,
    setEffectsPanel,
    showRmsInWaveform,
    setShowRmsInWaveform,
    showVerticalRulers,
    setShowVerticalRulers,
    state,
    rollInTimeEnabled,
    setRollInTimeEnabled,
    setIsPluginManagerOpen,
    handleGenerateTone,
    setIsMacroManagerOpen,
  } = options;

  const dispatch = useTracksDispatch();

  const handleToggleEffectsPanel = () => {
    if (effectsPanel?.isOpen) {
      setEffectsPanel(null);
    } else {
      const trackIndex = state.selectedTrackIndices.length > 0
        ? state.selectedTrackIndices[0]
        : 0;
      setEffectsPanel({
        isOpen: true,
        trackIndex,
        left: 0,
        top: 0,
        height: 600,
        width: 240,
      });
    }
  };

  const handleTogglePianoRoll = () => {
    if (state.pianoRollOpen) {
      dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: false } });
    } else {
      // Find first MIDI track to open piano roll for
      const midiTrackIndex = state.tracks.findIndex((t) => t.type === 'midi');
      if (midiTrackIndex >= 0) {
        const clipIndex = state.tracks[midiTrackIndex].midiClips?.length ? 0 : null;
        dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex: midiTrackIndex, clipIndex } });
      } else {
        // Auto-create an empty MIDI track and open piano roll on it.
        // Use max(id)+1 so the id doesn't collide after a middle track was deleted.
        const newTrackIndex = state.tracks.length;
        const nextTrackId = Math.max(...state.tracks.map((t) => t.id), 0) + 1;
        const midiNamePattern = /^MIDI (\d+)$/;
        const usedMidiNumbers = state.tracks
          .map((t) => {
            const m = midiNamePattern.exec(t.name ?? '');
            return m ? parseInt(m[1], 10) : NaN;
          })
          .filter((n: number) => !isNaN(n));
        const nextMidiNumber = usedMidiNumbers.length === 0 ? 1 : Math.max(...usedMidiNumbers) + 1;
        const newTrack: Track = {
          id: nextTrackId,
          name: `MIDI ${nextMidiNumber}`,
          type: 'midi',
          height: 114,
          clips: [],
          midiClips: [],
        };
        dispatch({ type: 'ADD_TRACK', payload: newTrack });
        dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex: newTrackIndex, clipIndex: null } });
      }
    }
  };

  const menuDefinitions = createMenuDefinitions({
    isCloudProject,
    dontShowSaveModalAgain,
    onImportAudio: handleImportAudio,
    onSyncToast: handleSaveCloudProject,
    onShowSaveProjectModal: () => setIsSaveProjectModalOpen(true),
    onSaveToComputer: handleSaveToComputer,
    onOpenLabelEditor: () => setIsLabelEditorOpen(true),
    onOpenPreferences: () => setIsPreferencesModalOpen(true),
    effectsPanelOpen: effectsPanel?.isOpen ?? false,
    showRmsInWaveform,
    showVerticalRulers,
    selectedTrackIndices: state.selectedTrackIndices,
    onToggleEffectsPanel: handleToggleEffectsPanel,
    onToggleRmsInWaveform: () => setShowRmsInWaveform(!showRmsInWaveform),
    onToggleVerticalRulers: () => setShowVerticalRulers(!showVerticalRulers),
    pianoRollOpen: state.pianoRollOpen,
    onTogglePianoRoll: handleTogglePianoRoll,
    rollInTimeEnabled,
    onToggleRollInTime: () => setRollInTimeEnabled(!rollInTimeEnabled),
    onOpenPluginManager: () => setIsPluginManagerOpen(true),
    onGenerateTone: handleGenerateTone,
    onOpenMacroManager: () => setIsMacroManagerOpen(true),
  });

  return menuDefinitions;
}
