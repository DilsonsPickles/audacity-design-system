import React from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { MixerPanel, PianoRollPanel, PanelHeader, type MixerPanelChannel, type PanelHeaderTab, type ThemeTokens } from '@audacity-ui/components';
import { useTracksDispatch, type TracksState } from '../../contexts/TracksContext';
import { MIDI_INSTRUMENTS } from '../../contexts/AudioEngineContext';
import type { EffectSelectorMenuState } from '../../hooks/useContextMenuState';

export interface EditorBottomDrawerProps {
  /** Same TracksState object EditorLayout reads today — passed through
   *  verbatim (not re-derived) so mixer/piano-roll reads never drift from
   *  what the rest of EditorLayout sees in the same render. */
  state: TracksState;
  theme: ThemeTokens;
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';
  showMixer?: boolean;
  trackMeterLevels: Map<number, number>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  setEffectSelectorMenu: React.Dispatch<React.SetStateAction<EffectSelectorMenuState | null>>;
  bpm: number;
  beatsPerMeasure: number;
  playMidiNote: (pitch: number, duration?: number, instrumentId?: string) => void;
  midiInstrument: string;
  /** Written by this drawer's onAddNote when a note creates a brand-new MIDI
   *  clip, so usePianoRollSmoothScroll (owner of the ref) skips its next
   *  smooth-scroll — the clip is already positioned where the user drew. */
  skipPianoRollScrollRef: React.MutableRefObject<boolean>;
  hoveredMidiClipId: number | null;
  setHoveredMidiClipId: React.Dispatch<React.SetStateAction<number | null>>;
  drawerHeight: number;
  setDrawerHeight: React.Dispatch<React.SetStateAction<number>>;
  drawerActiveTab: 'mixer' | 'piano-roll';
  setDrawerActiveTab: React.Dispatch<React.SetStateAction<'mixer' | 'piano-roll'>>;
  drawerTabOrder: Array<'mixer' | 'piano-roll'>;
  setDrawerTabOrder: React.Dispatch<React.SetStateAction<Array<'mixer' | 'piano-roll'>>>;
}

/** Unified tabbed panel for Mixer and Piano Roll, docked to the bottom of
 *  the editor. Owns tab defs/order/close, the PanelHeader resize drag,
 *  mixer channel building, and piano-roll MIDI handler wiring. Returns null
 *  when neither panel is open. */
export function EditorBottomDrawer({
  state,
  theme,
  activeMenuItem,
  showMixer,
  trackMeterLevels,
  audioManagerRef,
  setEffectSelectorMenu,
  bpm,
  beatsPerMeasure,
  playMidiNote,
  midiInstrument,
  skipPianoRollScrollRef,
  hoveredMidiClipId,
  setHoveredMidiClipId,
  drawerHeight,
  setDrawerHeight,
  drawerActiveTab,
  setDrawerActiveTab,
  drawerTabOrder,
  setDrawerTabOrder,
}: EditorBottomDrawerProps) {
  const dispatch = useTracksDispatch();

  const mixerOpen = showMixer && activeMenuItem !== 'export';
  const pianoRollOpen = state.pianoRollOpen && state.pianoRollTrackIndex !== null;
  if (!mixerOpen && !pianoRollOpen) return null;

  // Build tabs for open panels, respecting user's drag order
  const allTabDefs: Record<string, PanelHeaderTab> = {
    mixer: { id: 'mixer', label: 'Mixer' },
    'piano-roll': { id: 'piano-roll', label: 'Piano roll' },
  };
  const openIds = new Set<string>();
  if (mixerOpen) openIds.add('mixer');
  if (pianoRollOpen) openIds.add('piano-roll');
  const tabs: PanelHeaderTab[] = drawerTabOrder
    .filter(id => openIds.has(id))
    .map(id => allTabDefs[id]);

  // Ensure active tab is valid
  const activeTab = tabs.find(t => t.id === drawerActiveTab) ? drawerActiveTab : tabs[0].id;

  const handleTabClose = () => {
    if (activeTab === 'mixer') {
      // Close mixer — find and call the mixer toggle in App via dispatch or prop
      // The mixer is controlled by App.tsx's setMixerPanelOpen, but we only have showMixer as a read prop.
      // We need a callback. For now, dispatch is not available for mixer.
      // Actually, we can just toggle the prop — but we don't have a setter here.
      // Let's use a custom event or add an onCloseMixer prop.
      // For minimal change: dispatch a custom action or use window event.
      // Simplest: add onCloseMixer prop.
      window.dispatchEvent(new CustomEvent('close-mixer-panel'));
    } else if (activeTab === 'piano-roll') {
      dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: false } });
    }
  };

  // Content height = drawer height - header (32px)
  const contentHeight = drawerHeight - 32;

  return (
    <div
      style={{
        borderTop: `1px solid ${theme.border.default}`,
        flexShrink: 0,
        height: drawerHeight,
        minHeight: 144,
        maxHeight: '50vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PanelHeader
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={(tabId) => setDrawerActiveTab(tabId as 'mixer' | 'piano-roll')}
        onTabReorder={(newTabs) => setDrawerTabOrder(newTabs.map(t => t.id) as Array<'mixer' | 'piano-roll'>)}
        onClose={handleTabClose}
        onResizeStart={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const startHeight = drawerHeight;
          const maxH = window.innerHeight * 0.5;
          const onMove = (ev: MouseEvent) => {
            const delta = startY - ev.clientY;
            const newH = Math.max(144, Math.min(maxH, startHeight + delta));
            setDrawerHeight(newH);
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      />

      {/* Mixer content */}
      {activeTab === 'mixer' && mixerOpen && (() => {
        const audioTracks = state.tracks.filter((t) => t.type !== 'label');
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
      })()}

      {/* Piano Roll content */}
      {activeTab === 'piano-roll' && pianoRollOpen && (() => {
        const prTrack = state.tracks[state.pianoRollTrackIndex];
        if (!prTrack) return null;
        const prClip = prTrack.midiClips?.find(c => c.selected) ?? null;
        return (
          <PianoRollPanel
            hideHeader
            height={contentHeight}
            clip={prClip}
            allClips={prClip ? [prClip] : (prTrack.midiClips ?? [])}
            bpm={bpm}
            beatsPerMeasure={beatsPerMeasure}
            pixelsPerSecond={state.pianoRollPixelsPerSecond}
            scrollX={state.pianoRollScrollX}
            snap={state.pianoRollSnap}
            timeBasis={state.pianoRollTimeBasis}
            onSnapChange={(snap) => dispatch({ type: 'SET_PIANO_ROLL_SNAP', payload: snap })}
            onTimeBasisChange={(basis) => dispatch({ type: 'SET_PIANO_ROLL_TIME_BASIS', payload: basis })}
            onAddNote={(note) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const selectedClip = clips.find(c => c.selected);
              if (selectedClip) {
                // Note startTime is already in clip-local time — add directly
                const selectedClipIndex = clips.indexOf(selectedClip);
                const noteEnd = note.startTime + note.duration;
                // Expand clip if note falls outside current boundaries
                if (noteEnd > selectedClip.duration) {
                  dispatch({
                    type: 'TRIM_CLIP',
                    payload: {
                      trackIndex,
                      clipId: selectedClip.id,
                      newTrimStart: 0,
                      newDuration: noteEnd,
                    },
                  });
                }
                dispatch({ type: 'ADD_MIDI_NOTE', payload: { trackIndex, clipIndex: selectedClipIndex, note } });
              } else {
                // No selected clip — create one starting at beat 0
                const measureDuration = (60 / bpm) * beatsPerMeasure;
                const newClipId = Date.now();
                const newClip = {
                  id: newClipId,
                  name: 'MIDI Clip',
                  start: 0,
                  trimStart: 0,
                  duration: Math.max(measureDuration, note.startTime + note.duration),
                  notes: [note],
                };
                dispatch({ type: 'ADD_MIDI_CLIP', payload: { trackIndex, clip: newClip } });
                skipPianoRollScrollRef.current = true;
                dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: newClipId } });
              }
            }}
            onDeleteNotes={(noteIds) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const idSet = new Set(noteIds);
              for (let ci = 0; ci < clips.length; ci++) {
                const clipNoteIds = clips[ci].notes.filter(n => idSet.has(n.id)).map(n => n.id);
                if (clipNoteIds.length > 0) {
                  dispatch({ type: 'DELETE_MIDI_NOTES', payload: { trackIndex, clipIndex: ci, noteIds: clipNoteIds } });
                }
              }
            }}
            onUpdateNote={(noteId, updates) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const clipIndex = clips.findIndex(c => c.notes.some(n => n.id === noteId));
              if (clipIndex >= 0) {
                dispatch({ type: 'UPDATE_MIDI_NOTE', payload: { trackIndex, clipIndex, noteId, updates } });
              }
            }}
            onMoveNotes={() => {/* handled via UPDATE_MIDI_NOTE */}}
            onResizeNote={(noteId, newDuration) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const clipIndex = clips.findIndex(c => c.notes.some(n => n.id === noteId));
              if (clipIndex >= 0) {
                dispatch({ type: 'RESIZE_MIDI_NOTE', payload: { trackIndex, clipIndex, noteId, newDuration } });
              }
            }}
            onSelectNote={(noteId, additive) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              if (!additive) {
                for (let ci = 0; ci < clips.length; ci++) {
                  if (clips[ci].notes.some(n => n.selected)) {
                    dispatch({ type: 'DESELECT_ALL_MIDI_NOTES', payload: { trackIndex, clipIndex: ci } });
                  }
                }
              }
              const clipIndex = clips.findIndex(c => c.notes.some(n => n.id === noteId));
              if (clipIndex >= 0) {
                dispatch({ type: 'SELECT_MIDI_NOTE', payload: { trackIndex, clipIndex, noteId, additive: true } });
              }
            }}
            onSelectNotes={(noteIds, additive) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const idSet = new Set(noteIds);
              if (!additive) {
                for (let ci = 0; ci < clips.length; ci++) {
                  if (clips[ci].notes.some(n => n.selected)) {
                    dispatch({ type: 'DESELECT_ALL_MIDI_NOTES', payload: { trackIndex, clipIndex: ci } });
                  }
                }
              }
              for (let ci = 0; ci < clips.length; ci++) {
                const clipNoteIds = clips[ci].notes.filter(n => idSet.has(n.id)).map(n => n.id);
                if (clipNoteIds.length > 0) {
                  dispatch({ type: 'SELECT_MIDI_NOTES', payload: { trackIndex, clipIndex: ci, noteIds: clipNoteIds, additive: true } });
                }
              }
            }}
            onDeselectAll={() => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              for (let ci = 0; ci < clips.length; ci++) {
                if (clips[ci].notes.some(n => n.selected)) {
                  dispatch({ type: 'DESELECT_ALL_MIDI_NOTES', payload: { trackIndex, clipIndex: ci } });
                }
              }
            }}
            onPixelsPerSecondChange={(pps) => dispatch({ type: 'SET_PIANO_ROLL_PIXELS_PER_SECOND', payload: pps })}
            onScrollXChange={(sx) => dispatch({ type: 'SET_PIANO_ROLL_SCROLL_X', payload: sx })}
            onResizeClip={(_edge, newStart, newDuration, newTrimStart, clipId) => {
              const targetId = clipId ?? prClip?.id;
              if (!targetId) return;
              dispatch({
                type: 'TRIM_CLIP',
                payload: {
                  trackIndex: state.pianoRollTrackIndex!,
                  clipId: targetId,
                  newTrimStart,
                  newDuration,
                  newStart,
                },
              });
            }}
            onSelectClip={(clipId) => {
              dispatch({ type: 'SELECT_CLIP', payload: { trackIndex: state.pianoRollTrackIndex!, clipId } });
            }}
            onMoveClip={(clipId, newStart) => {
              const trackIndex = state.pianoRollTrackIndex!;
              dispatch({ type: 'MOVE_CLIP', payload: { clipId, fromTrackIndex: trackIndex, toTrackIndex: trackIndex, newStartTime: newStart } });
            }}
            hoveredClipId={hoveredMidiClipId}
            onHoverClip={setHoveredMidiClipId}
            onKeyClick={(pitch: number) => playMidiNote(pitch, 0.3, prTrack.instrument)}
            onPlayNote={(pitch: number) => playMidiNote(pitch, 0.3, prTrack.instrument)}
            instruments={MIDI_INSTRUMENTS}
            instrument={prTrack.instrument ?? midiInstrument}
            onInstrumentChange={(id: string) => {
              dispatch({ type: 'UPDATE_TRACK', payload: { index: state.pianoRollTrackIndex!, track: { instrument: id } } });
            }}
            trackColor={prTrack.color}
            playheadPosition={state.playheadPosition}
          />
        );
      })()}
    </div>
  );
}
