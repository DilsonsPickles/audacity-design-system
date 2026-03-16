import React from 'react';
import { flushSync } from 'react-dom';
import { Canvas } from './Canvas';
import { TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, VerticalRulerPanel, EffectsPanel, CustomScrollbar, TrackType, ThemeProvider, RulerFlyout, useTabOrder, useAccessibilityProfile, PianoRollPanel, PanelHeader } from '@audacity-ui/components';
import type { SpectrogramScale, WaveformRulerFormat, PanelHeaderTab } from '@audacity-ui/components';
import { MixerPanel, type MixerPanelChannel } from '@audacity-ui/components';
import type { EnvelopePointStyleKey } from '@audacity-ui/core';
import { useDialogs } from '../contexts/DialogContext';
import { useContextMenus } from '../contexts/ContextMenuContext';
import { selectTrackExclusive, toggleTrackSelection } from '../utils/trackSelection';
import { snapToGrid } from '../utils/snapToGrid';

export interface EditorLayoutProps {
  // State
  state: any;
  dispatch: React.Dispatch<any>;

  // Active menu
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';

  // Scroll
  scrollX: number;
  scrollY: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onTrackHeaderScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  trackHeaderScrollRef: React.RefObject<HTMLDivElement | null>;

  // Timeline
  pixelsPerSecond: number;
  timelineWidth: number;
  timelineDuration: number;
  timelineFormat: 'minutes-seconds' | 'beats-measures';
  bpm: number;
  beatsPerMeasure: number;

  // Canvas options
  showRmsInWaveform: boolean;
  controlPointStyle: EnvelopePointStyleKey;
  spectrogramScale: SpectrogramScale;
  setSpectrogramScale: React.Dispatch<React.SetStateAction<SpectrogramScale>>;
  showVerticalRulers: boolean;

  // Playback
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  trackMeterLevels: Map<number, number>;
  isMicMonitoring: boolean;
  recordingClipId: number | null;

  // Selection
  selectionAnchor: number | null;
  setSelectionAnchor: React.Dispatch<React.SetStateAction<number | null>>;
  controlPanelHasFocus: number | null;
  setControlPanelHasFocus: React.Dispatch<React.SetStateAction<number | null>>;

  // Track container focus (which track has its .track container focused, if any)
  containerFocusedTrack: number | null;
  setContainerFocusedTrack: React.Dispatch<React.SetStateAction<number | null>>;

  // Mouse cursor
  mouseCursorPosition: number | undefined;
  setMouseCursorPosition: React.Dispatch<React.SetStateAction<number | undefined>>;
  mouseCursorY: number | undefined;
  setMouseCursorY: React.Dispatch<React.SetStateAction<number | undefined>>;
  isOverTrack: boolean;
  setIsOverTrack: React.Dispatch<React.SetStateAction<boolean>>;

  // Loop region
  loopRegionEnabled: boolean;
  setLoopRegionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  loopRegionStart: number | null;
  setLoopRegionStart: React.Dispatch<React.SetStateAction<number | null>>;
  loopRegionEnd: number | null;
  setLoopRegionEnd: React.Dispatch<React.SetStateAction<number | null>>;
  loopRegionInteracting: boolean;
  setLoopRegionInteracting: React.Dispatch<React.SetStateAction<boolean>>;
  loopRegionHovering: boolean;
  setLoopRegionHovering: React.Dispatch<React.SetStateAction<boolean>>;

  // Refs
  audioManagerRef: React.RefObject<any>;

  // Ruler time selection
  rulerTimeSelection: { startTime: number; endTime: number } | null | undefined;
  spectralSelection: any;

  // Theme
  theme: any;

  // Canvas height
  canvasHeight: number;
  setCanvasHeight: React.Dispatch<React.SetStateAction<number>>;

  // Click ruler to start playback
  clickRulerToStartPlayback: boolean;

  // Punch point (roll-in recording indicator)
  punchPointPosition?: number | null;

  // Snap to grid
  snapEnabled?: boolean;

  // Flat navigation mode
  isFlatNavigation: boolean;

  // Mixer panel
  showMixer?: boolean;
}

const STYLE_FLEX_ROW_OVERFLOW: React.CSSProperties = { display: 'flex', flex: 1, overflow: 'hidden' };
const STYLE_FLEX_COL_OVERFLOW: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' };
const STYLE_ROW_NO_SHRINK: React.CSSProperties = { display: 'flex', flexDirection: 'row' as const, flexShrink: 0 };
const STYLE_RELATIVE_FLEX_OVERFLOW: React.CSSProperties = { position: 'relative', flex: 1, overflow: 'hidden' };
const STYLE_FULL_WIDTH_RELATIVE: React.CSSProperties = { width: '100%', position: 'relative' };
const STYLE_FLEX_ROW_OVERFLOW_HIDDEN: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'row' as const, overflow: 'hidden' };

export function EditorLayout(props: EditorLayoutProps) {
  const {
    state, dispatch, activeMenuItem,
    scrollX, scrollY, onScroll, onTrackHeaderScroll,
    scrollContainerRef, trackHeaderScrollRef,
    pixelsPerSecond, timelineWidth, timelineDuration, timelineFormat, bpm, beatsPerMeasure,
    showRmsInWaveform, controlPointStyle, spectrogramScale, setSpectrogramScale: _setSpectrogramScale, showVerticalRulers,
    isPlaying, setIsPlaying, trackMeterLevels, isMicMonitoring, recordingClipId,
    selectionAnchor, setSelectionAnchor, controlPanelHasFocus: _controlPanelHasFocus, setControlPanelHasFocus,
    containerFocusedTrack, setContainerFocusedTrack,
    mouseCursorPosition, setMouseCursorPosition, mouseCursorY, setMouseCursorY, isOverTrack, setIsOverTrack,
    loopRegionEnabled, setLoopRegionEnabled, loopRegionStart, setLoopRegionStart, loopRegionEnd, setLoopRegionEnd,
    loopRegionInteracting, setLoopRegionInteracting, loopRegionHovering, setLoopRegionHovering,
    audioManagerRef, rulerTimeSelection, spectralSelection,
    theme, canvasHeight, setCanvasHeight,
    clickRulerToStartPlayback, punchPointPosition, snapEnabled, isFlatNavigation: _isFlatNavigation,
    showMixer,
  } = props;

  const { setIsSpectrogramSettingsOpen } = useDialogs();
  const {
    effectsPanel, setEffectsPanel, setEffectDialog, setEffectSelectorMenu,
    setClipContextMenu, setTimeSelectionContextMenu, setTrackContextMenu, setTimelineRulerContextMenu,
    contextMenuClosedTimeRef,
  } = useContextMenus();

  const [drawerHeight, setDrawerHeight] = React.useState(376);
  const [drawerActiveTab, setDrawerActiveTab] = React.useState<'mixer' | 'piano-roll'>('mixer');
  const [drawerTabOrder, setDrawerTabOrder] = React.useState<Array<'mixer' | 'piano-roll'>>(['mixer', 'piano-roll']);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const timelineRulerRef = React.useRef<HTMLDivElement>(null);

  // Tab order for ruler focus
  const { activeProfile } = useAccessibilityProfile();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';
  const trackBase = useTabOrder('tracks');

  // Calculate ruler tab indices — one per track, -1 for label tracks
  const rulerTabIndices = React.useMemo(() =>
    state.tracks.map((track: any, i: number) => {
      if (track.type === 'label' || track.type === 'midi') return -1;
      return isFlatNavigation ? 0 : (trackBase + 3 + i * 4);
    }),
    [state.tracks, isFlatNavigation, trackBase],
  );

  // Auto-switch drawer active tab when panels open/close
  const prevMixerRef = React.useRef(showMixer);
  const prevPianoRollRef = React.useRef(state.pianoRollOpen);
  React.useEffect(() => {
    const mixerJustOpened = showMixer && !prevMixerRef.current;
    const pianoRollJustOpened = state.pianoRollOpen && !prevPianoRollRef.current;
    if (pianoRollJustOpened) {
      setDrawerActiveTab('piano-roll');
    } else if (mixerJustOpened) {
      setDrawerActiveTab('mixer');
    } else if (!showMixer && drawerActiveTab === 'mixer' && state.pianoRollOpen) {
      setDrawerActiveTab('piano-roll');
    } else if (!state.pianoRollOpen && drawerActiveTab === 'piano-roll' && showMixer) {
      setDrawerActiveTab('mixer');
    }
    prevMixerRef.current = showMixer;
    prevPianoRollRef.current = state.pianoRollOpen;
  }, [showMixer, state.pianoRollOpen]);

  // Auto-open/switch piano roll when a MIDI track is focused
  React.useEffect(() => {
    const focusedIdx = state.focusedTrackIndex;
    if (focusedIdx === null) return;
    const track = state.tracks[focusedIdx];
    if (track?.type === 'midi') {
      if (!state.pianoRollOpen || state.pianoRollTrackIndex !== focusedIdx) {
        const clipIndex = track.midiClips && track.midiClips.length > 0 ? 0 : null;
        dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex: focusedIdx, clipIndex } });
      }
    }
  }, [state.focusedTrackIndex]);

  // Smooth-scroll piano roll to the selected clip's boundary area
  const pianoRollScrollAnimRef = React.useRef<number | null>(null);
  // When true, the next selectedMidiClipId change will NOT trigger smooth-scroll
  // (used to suppress scroll when selection originates from within the piano roll)
  const skipPianoRollScrollRef = React.useRef(false);
  const selectedMidiClipId = React.useMemo(() => {
    if (!state.pianoRollOpen || state.pianoRollTrackIndex === null) return null;
    const track = state.tracks[state.pianoRollTrackIndex];
    return track?.midiClips?.find(c => c.selected)?.id ?? null;
  }, [state.pianoRollOpen, state.pianoRollTrackIndex, state.tracks]);

  React.useEffect(() => {
    if (selectedMidiClipId === null || state.pianoRollTrackIndex === null) return;
    // Skip scroll when selection was triggered from within the piano roll
    if (skipPianoRollScrollRef.current) {
      skipPianoRollScrollRef.current = false;
      return;
    }

    // Piano roll is in local time — always scroll to the start (0) on clip switch
    const targetScrollX = 0;
    const startScrollX = state.pianoRollScrollX;
    if (Math.abs(targetScrollX - startScrollX) < 1) return;

    const duration = 300; // ms
    const startTime = performance.now();

    // Cancel any in-flight animation
    if (pianoRollScrollAnimRef.current !== null) {
      cancelAnimationFrame(pianoRollScrollAnimRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startScrollX + (targetScrollX - startScrollX) * eased;
      dispatch({ type: 'SET_PIANO_ROLL_SCROLL_X', payload: current });
      if (t < 1) {
        pianoRollScrollAnimRef.current = requestAnimationFrame(animate);
      } else {
        pianoRollScrollAnimRef.current = null;
      }
    };

    pianoRollScrollAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (pianoRollScrollAnimRef.current !== null) {
        cancelAnimationFrame(pianoRollScrollAnimRef.current);
        pianoRollScrollAnimRef.current = null;
      }
    };
  }, [selectedMidiClipId]);

  // Ruler flyout state
  const rulerTriggerRef = React.useRef<HTMLElement | null>(null);
  const [rulerFlyout, setRulerFlyout] = React.useState<{ isOpen: boolean; x: number; y: number; mode: 'waveform' | 'spectrogram'; trackIndex: number } | null>(null);
  const [halfWave, setHalfWave] = React.useState(false);
  const [hoveredMidiClipId, setHoveredMidiClipId] = React.useState<number | null>(null);

  const handleRulerContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Determine mode based on which track the cursor is over
    // For now, check if any track at the click position is in spectrogram mode
    const clickY = e.clientY;
    const panelRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = clickY - panelRect.top + scrollY;

    const trackGap = 2; // matches VerticalRulerPanel trackGap default
    let accumulatedHeight = trackGap; // tracks container has paddingTop of trackGap
    let mode: 'waveform' | 'spectrogram' = 'waveform';
    let targetTrackIndex = 0;
    for (let i = 0; i < state.tracks.length; i++) {
      const track = state.tracks[i];
      const trackHeight = track.height || 114;
      if (relativeY >= accumulatedHeight && relativeY < accumulatedHeight + trackHeight) {
        targetTrackIndex = i;
        if (track.viewMode === 'spectrogram') {
          mode = 'spectrogram';
        } else if (track.viewMode === 'split') {
          // Determine which half of the split the click is in
          const yInTrack = relativeY - accumulatedHeight;
          const spacerHeight = trackHeight > 44 ? 20 : 0;
          const splitRatio = track.channelSplitRatio ?? 0.5;
          const topHeight = (trackHeight - spacerHeight) * splitRatio;
          mode = yInTrack < spacerHeight + topHeight ? 'spectrogram' : 'waveform';
        } else {
          mode = 'waveform';
        }
        break;
      }
      accumulatedHeight += trackHeight + trackGap;
    }

    // Position flyout 24px to the left of the ruler panel, vertically centered on click
    const flyoutWidth = 200;
    const flyoutHeight = mode === 'waveform' ? 242 : 280; // approximate heights
    const flyoutX = panelRect.left - flyoutWidth - 16;
    let flyoutY = e.clientY - flyoutHeight / 2;

    // Clamp to viewport
    const vh = window.innerHeight;
    if (flyoutY + flyoutHeight > vh - 10) flyoutY = vh - flyoutHeight - 10;
    if (flyoutY < 10) flyoutY = 10;

    setRulerFlyout({ isOpen: true, x: flyoutX, y: flyoutY, mode, trackIndex: targetTrackIndex });
  }, [state.tracks, scrollY]);

  // Buffer zone below tracks so user can scroll content further up the screen
  const viewportH = scrollContainerRef.current?.clientHeight || 0;
  const scrollBuffer = viewportH > 0 && canvasHeight > viewportH ? Math.round(viewportH * 0.4) : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
    <div style={STYLE_FLEX_ROW_OVERFLOW}>
      {/* Effects Panel - Hidden on export tab */}
      {activeMenuItem !== 'export' && effectsPanel?.isOpen && (() => {
        const trackIndex = effectsPanel.trackIndex;
        const currentTrackEffects = state.tracks[trackIndex]?.effects || [];
        const trackEffectsEnabled = state.tracks[trackIndex]?.effectsEnabled ?? true;

        return (
          <EffectsPanel
            isOpen={effectsPanel.isOpen}
            mode="sidebar"
            trackSection={{
              trackName: state.tracks[trackIndex]?.name || 'Track',
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
            }}
            masterSection={{
              effects: state.masterEffects,
              allEnabled: state.masterEffectsEnabled,
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
                const effect = state.masterEffects[index];
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
            }}
            onClose={() => setEffectsPanel(null)}
          />
        );
      })()}

      {/* Track Control Side Panel - Hidden on export tab */}
      {activeMenuItem !== 'export' && (
        <TrackControlSidePanel
          trackHeights={state.tracks.map((t: any) => t.height || 114)}
          trackViewModes={state.tracks.map((t: any) => t.viewMode)}
          focusedTrackIndex={state.focusedTrackIndex}
          scrollRef={trackHeaderScrollRef}
          onScroll={onTrackHeaderScroll}
          bufferSpace={scrollBuffer}
          onTrackResize={(trackIndex, height) => {
            dispatch({ type: 'UPDATE_TRACK_HEIGHT', payload: { index: trackIndex, height } });
            setRulerFlyout(null);
          }}
          onAddTrackType={(type: TrackType) => {
            let trackName = `Track ${state.tracks.length + 1}`;
            if (type === 'label') {
              trackName = `Label ${state.tracks.length + 1}`;
            } else if (type === 'stereo') {
              trackName = `Stereo ${state.tracks.length + 1}`;
            } else if (type === 'mono') {
              trackName = `Mono ${state.tracks.length + 1}`;
            } else if (type === 'midi') {
              trackName = `MIDI ${state.tracks.length + 1}`;
            }

            const trackType = type === 'label' ? 'label' : type === 'midi' ? 'midi' : 'audio';
            const newTrack: any = {
              id: state.tracks.length + 1,
              name: trackName,
              type: trackType,
              height: type === 'label' ? 76 : 114,
              ...(type === 'stereo' ? { channelSplitRatio: 0.5 } : {}),
              clips: [],
              ...(type === 'midi' ? { midiClips: [] } : {}),
            };
            dispatch({ type: 'ADD_TRACK', payload: newTrack });
          }}
          showMidiOption={true}
          onDeleteTrack={(trackIndex) => {
            dispatch({
              type: 'DELETE_TRACK',
              payload: trackIndex,
            });
          }}
          onDuplicateTrack={(trackIndex) => {
            const trackIndices = state.selectedTrackIndices.includes(trackIndex)
              ? state.selectedTrackIndices
              : [trackIndex];

            let nextClipId = Math.max(...state.tracks.flatMap((t: any) => t.clips.map((c: any) => c.id)), 0) + 1;
            let nextTrackId = Math.max(...state.tracks.map((t: any) => t.id), 0) + 1;

            trackIndices.forEach((idx: number) => {
              const originalTrack = state.tracks[idx];
              if (originalTrack) {
                const duplicatedTrack = {
                  ...originalTrack,
                  id: nextTrackId++,
                  name: `${originalTrack.name} (copy)`,
                  clips: originalTrack.clips.map((clip: any) => ({
                    ...clip,
                    id: nextClipId++,
                  })),
                };

                dispatch({
                  type: 'ADD_TRACK',
                  payload: duplicatedTrack,
                });
              }
            });
          }}
          onMoveTrackUp={(trackIndex) => {
            console.log('Move track up:', trackIndex);
          }}
          onMoveTrackDown={(trackIndex) => {
            console.log('Move track down:', trackIndex);
          }}
          onTrackViewChange={(trackIndex, viewMode) => {
            dispatch({ type: 'UPDATE_TRACK_VIEW', payload: { index: trackIndex, viewMode } });
          }}
          trackColors={state.tracks.map((t: any) => t.clips[0]?.color)}
          onTrackColorChange={(trackIndex, color) => {
            const track = state.tracks[trackIndex];
            track?.clips.forEach((clip: any) => {
              dispatch({
                type: 'UPDATE_CLIP',
                payload: { trackIndex, clipId: clip.id, updates: { color } },
              });
            });
          }}
          onSpectrogramSettings={() => {
            setIsSpectrogramSettingsOpen(true);
          }}
        >
          {state.tracks.map((track: any, index: number) => {
            let trackType: 'mono' | 'stereo' | 'label' | 'midi' = 'mono';
            if (track.type === 'label') {
              trackType = 'label';
            } else if (track.type === 'midi') {
              trackType = 'midi';
            } else if (track.channelSplitRatio !== undefined) {
              trackType = 'stereo';
            }

            const trackHeight = track.height || 114;
            let heightState: 'default' | 'truncated' | 'collapsed';
            if (trackHeight <= 44) {
              heightState = 'collapsed';
            } else if (trackHeight <= 82) {
              heightState = 'truncated';
            } else {
              heightState = 'default';
            }

            return (
              <TrackControlPanel
                key={track.id}
                trackName={track.name}
                trackType={trackType}
                volume={75}
                pan={0}
                isMuted={false}
                isSolo={false}
                isFocused={state.focusedTrackIndex === index}
                containerFocused={containerFocusedTrack === index}
                meterLevel={
                  state.isRecording && state.recordingTrackIndex === index
                    ? state.recordingMeterLevel
                    : isMicMonitoring && state.selectedTrackIndices.includes(index)
                      ? state.recordingMeterLevel
                      : isPlaying
                        ? trackMeterLevels.get(index) || 0
                        : 0
                }
                meterLevelLeft={
                  state.isRecording && state.recordingTrackIndex === index
                    ? state.recordingMeterLevel
                    : isMicMonitoring && state.selectedTrackIndices.includes(index)
                      ? state.recordingMeterLevel
                      : isPlaying
                        ? trackMeterLevels.get(index) || 0
                        : 0
                }
                meterLevelRight={
                  state.isRecording && state.recordingTrackIndex === index
                    ? state.recordingMeterLevel
                    : isMicMonitoring && state.selectedTrackIndices.includes(index)
                      ? state.recordingMeterLevel
                      : isPlaying
                        ? trackMeterLevels.get(index) || 0
                        : 0
                }
                meterClipped={state.recordingPeakLevel > 100}
                meterStyle="default"
                onMuteToggle={() => {}}
                onSoloToggle={() => {}}
                onEffectsClick={() => {
                  const isCurrentlyOpen = effectsPanel?.isOpen && effectsPanel.trackIndex === index;
                  setEffectsPanel(isCurrentlyOpen ? null : {
                    isOpen: true,
                    trackIndex: index,
                    left: 0,
                    top: 0,
                    height: 0,
                    width: 0,
                  });
                }}
                tabIndex={-1}
                onFocusChange={(hasFocus) => {
                  setControlPanelHasFocus(hasFocus ? index : null);
                  if (hasFocus) {
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: index });
                  }
                }}
                onNavigateVertical={(direction, shiftKey) => {
                  const nextIndex = direction === 'up' ? index - 1 : index + 1;
                  if (nextIndex >= 0 && nextIndex < state.tracks.length) {
                    flushSync(() => {
                      dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
                    });

                    if (shiftKey) {
                      // Shift+Arrow: extend/contract track selection
                      const anchor = selectionAnchor ?? index;
                      if (selectionAnchor === null) {
                        setSelectionAnchor(index);
                      }
                      const start = Math.min(anchor, nextIndex);
                      const end = Math.max(anchor, nextIndex);
                      const newSelection: number[] = [];
                      for (let i = start; i <= end; i++) newSelection.push(i);
                      dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                    } else {
                      setSelectionAnchor(null);
                    }

                    const panels = document.querySelectorAll('[aria-label*="track controls"]');
                    if (panels[nextIndex]) {
                      (panels[nextIndex] as HTMLElement).focus();
                      (panels[nextIndex] as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                      });
                    }
                  }
                }}
                onAddLabelClick={() => {
                  const allLabels = state.tracks.flatMap((t: any) => t.labels || []);
                  const nextLabelId = allLabels.length > 0
                    ? Math.max(...allLabels.map((l: any) => l.id)) + 1
                    : 1;

                  const newLabel = {
                    id: nextLabelId,
                    trackIndex: index,
                    text: '',
                    startTime: state.timeSelection?.startTime ?? state.playheadPosition,
                    endTime: state.timeSelection?.endTime ?? state.playheadPosition,
                  };

                  dispatch({
                    type: 'ADD_LABEL',
                    payload: { trackIndex: index, label: newLabel }
                  });
                }}
                onMenuClick={(e) => {
                  const button = e.currentTarget;
                  const rect = button.getBoundingClientRect();
                  setTrackContextMenu({
                    isOpen: true,
                    x: rect.right - 20,
                    y: rect.top + 10,
                    trackIndex: index,
                    openedViaKeyboard: true,
                  });
                }}
                state={state.selectedTrackIndices.includes(index) ? 'active' : 'idle'}
                height={heightState}
                trackHeight={trackHeight}
                onClick={() => {
                  selectTrackExclusive(index, dispatch);
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: index });
                  setSelectionAnchor(null);
                }}
                onToggleSelection={() => {
                  toggleTrackSelection(index, state.selectedTrackIndices, dispatch);
                }}
                onRangeSelection={() => {
                  const anchor = selectionAnchor ?? (state.selectedTrackIndices.length > 0 ? state.selectedTrackIndices[0] : index);
                  if (selectionAnchor === null) {
                    setSelectionAnchor(anchor);
                  }

                  const start = Math.min(anchor, index);
                  const end = Math.max(anchor, index);
                  const newSelection: number[] = [];
                  for (let i = start; i <= end; i++) {
                    newSelection.push(i);
                  }
                  dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                }}
                onTabOut={() => {
                  const trackElement = document.querySelector(`[data-track-index="${index}"]`);
                  if (trackElement) {
                    const firstClip = trackElement.querySelector(`[data-first-clip="true"]`) as HTMLElement;
                    if (firstClip) {
                      firstClip.focus();
                      return;
                    }
                  }
                  // No clips — skip to ruler or next track
                  if (showVerticalRulers && state.tracks[index]?.type !== 'label' && state.tracks[index]?.type !== 'midi') {
                    const rulerEl = document.querySelector(
                      `[data-track-ruler-index="${index}"]`
                    ) as HTMLElement;
                    if (rulerEl) {
                      rulerEl.focus();
                      return;
                    }
                  }
                  const nextIndex = index + 1;
                  if (nextIndex < state.tracks.length) {
                    const target = document.querySelector(
                      `.track-wrapper[data-track-index="${nextIndex}"] .track`
                    ) as HTMLElement;
                    target?.focus();
                  } else {
                    const selToolbar = document.querySelector('.selection-toolbar');
                    const firstChild = selToolbar?.querySelector('[role="group"]') as HTMLElement;
                    firstChild?.focus();
                  }
                }}
                onShiftTabOut={() => {
                  const trackContainer = document.querySelector(
                    `.track-wrapper[data-track-index="${index}"] .track`
                  ) as HTMLElement;
                  trackContainer?.focus();
                }}
              />
            );
          })}
        </TrackControlSidePanel>
      )}

      {/* Timeline Ruler + Canvas Area */}
      <div style={STYLE_FLEX_COL_OVERFLOW}>
        {/* Timeline Ruler Row (with fixed vertical ruler header) */}
        <div style={STYLE_ROW_NO_SHRINK}>
          {/* Timeline Ruler - Fixed at top */}
          <div
            ref={canvasContainerRef}
            style={STYLE_RELATIVE_FLEX_OVERFLOW}
          >
            <div
              ref={timelineRulerRef}
              tabIndex={useTabOrder('timeline-ruler')}
              role="region"
              aria-label="Timeline ruler"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.currentTarget as HTMLElement).blur();
                }
                if (e.key === 'F10' && e.shiftKey) {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTimelineRulerContextMenu({
                    isOpen: true,
                    x: rect.left + rect.width / 2,
                    y: rect.bottom,
                  });
                }
              }}
              style={STYLE_FULL_WIDTH_RELATIVE}
              onMouseMove={(e) => {
                if (timelineRulerRef.current) {
                  const rect = timelineRulerRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left + scrollX;
                  const CLIP_CONTENT_OFFSET = 12;
                  const timePosition = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;
                  setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
                }
              }}
              onMouseLeave={() => {
                setMouseCursorPosition(undefined);
              }}
              onClick={async (e) => {
                if (!clickRulerToStartPlayback || !timelineRulerRef.current) return;

                const rect = timelineRulerRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left + scrollX;
                const CLIP_CONTENT_OFFSET = 12;
                let clickedTime = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;

                if (snapEnabled) {
                  clickedTime = snapToGrid(clickedTime, {
                    timeFormat: timelineFormat,
                    bpm,
                    beatsPerMeasure,
                    snap: state.canvasSnap,
                    pixelsPerSecond,
                  });
                }

                if (clickedTime >= 0) {
                  dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: clickedTime });

                  const audioManager = audioManagerRef.current;

                  if (audioManager.getIsPlaying()) {
                    audioManager.stop();
                    setIsPlaying(false);
                  }

                  audioManager.loadClips(state.tracks, clickedTime);
                  await audioManager.play(clickedTime);
                  setIsPlaying(true);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setTimelineRulerContextMenu({
                  isOpen: true,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
            >
              <TimelineRuler
                pixelsPerSecond={pixelsPerSecond}
                scrollX={scrollX}
                totalDuration={timelineDuration}
                width={timelineWidth}
                height={40}
                timeSelection={rulerTimeSelection}
                spectralSelection={spectralSelection}
                selectionColor="rgba(112, 181, 255, 0.5)"
                cursorPosition={mouseCursorPosition}
                timeFormat={timelineFormat}
                bpm={bpm}
                beatsPerMeasure={beatsPerMeasure}
                loopRegionEnabled={loopRegionEnabled}
                loopRegionStart={loopRegionStart}
                loopRegionEnd={loopRegionEnd}
                onLoopRegionChange={(start, end) => {
                  setLoopRegionStart(start);
                  setLoopRegionEnd(end);
                }}
                onLoopRegionInteracting={setLoopRegionInteracting}
                onLoopRegionEnabledToggle={() => setLoopRegionEnabled(!loopRegionEnabled)}
                onLoopRegionHoverChange={setLoopRegionHovering}
              />
              {/* Loop region stalks in ruler */}
              {loopRegionStart !== null && loopRegionEnd !== null && (loopRegionInteracting || loopRegionHovering) && loopRegionEnabled && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${12 + loopRegionStart * pixelsPerSecond}px`,
                      top: 0,
                      width: '2px',
                      height: '40px',
                      backgroundColor: loopRegionEnabled
                        ? theme.audio.timeline.loopRegionBorder
                        : theme.audio.timeline.loopRegionBorderInactive,
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${12 + loopRegionEnd * pixelsPerSecond}px`,
                      top: 0,
                      width: '2px',
                      height: '40px',
                      backgroundColor: loopRegionEnabled
                        ? theme.audio.timeline.loopRegionBorder
                        : theme.audio.timeline.loopRegionBorderInactive,
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  />
                </>
              )}
              {/* Punch point indicator in ruler */}
              {punchPointPosition != null && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${12 + punchPointPosition * pixelsPerSecond}px`,
                    top: 0,
                    width: 1,
                    height: '100%',
                    backgroundColor: '#FF2672',
                    zIndex: 99,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {/* Playhead icon only in ruler */}
              <PlayheadCursor
                position={state.playheadPosition}
                pixelsPerSecond={pixelsPerSecond}
                height={0}
                showTopIcon={true}
                iconTopOffset={24}
                scrollX={scrollX}
                onPositionChange={(newPosition) => {
                  let pos = newPosition;
                  if (snapEnabled) {
                    pos = snapToGrid(pos, {
                      timeFormat: timelineFormat,
                      bpm,
                      beatsPerMeasure,
                      snap: state.canvasSnap,
                      pixelsPerSecond,
                    });
                  }
                  dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: pos });
                  const audioManager = audioManagerRef.current;
                  if (audioManager.getIsPaused()) {
                    audioManager.seek(pos);
                  }
                }}
                minPosition={0}
              />
            </div>
          </div>

          {/* Fixed Vertical Ruler Header (next to timeline ruler) */}
          {showVerticalRulers && (
            <div style={{
              width: '64px',
              height: '40px',
              flexShrink: 0,
              backgroundColor: theme.background.surface.elevated,
              borderLeft: `1px solid ${theme.border.default}`,
              borderBottom: `1px solid ${theme.border.default}`,
            }} />
          )}
        </div>

        {/* Canvas + Scrollable Vertical Rulers Row */}
        <div style={STYLE_FLEX_ROW_OVERFLOW_HIDDEN}>
          {/* Canvas wrapper for custom scrollbars */}
          <div style={STYLE_RELATIVE_FLEX_OVERFLOW}>
            {/* Scrollable Canvas area */}
            <div
              ref={scrollContainerRef}
              onScroll={onScroll}
              className="canvas-scroll-container"
              tabIndex={-1}
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                backgroundColor: theme.background.canvas.default,
                cursor: 'text',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overscrollBehavior: 'none',
              } as React.CSSProperties}
              onMouseMove={(e) => {
                if (scrollContainerRef.current) {
                  const rect = scrollContainerRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left + scrollX;
                  const y = e.clientY - rect.top + scrollY;
                  const CLIP_CONTENT_OFFSET = 12;
                  const timePosition = (x - CLIP_CONTENT_OFFSET) / 100;
                  setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
                  setMouseCursorY(y >= 0 ? y : undefined);

                  const TRACK_GAP = 2;
                  const CLIP_HEADER_HEIGHT = 20;
                  let overTrack = false;
                  let currentY = 0;

                  for (const track of state.tracks) {
                    const trackHeight = track.height || 114;
                    if (y >= currentY + CLIP_HEADER_HEIGHT && y < currentY + trackHeight) {
                      overTrack = true;
                      break;
                    }
                    currentY += trackHeight + TRACK_GAP;
                  }

                  setIsOverTrack(overTrack);
                }
              }}
              onMouseLeave={() => {
                setMouseCursorPosition(undefined);
                setMouseCursorY(undefined);
                setIsOverTrack(false);
              }}
            >
              <div style={{ minWidth: `${timelineWidth}px`, paddingBottom: `${scrollBuffer}px`, position: 'relative', cursor: 'text' }}>
                <ThemeProvider theme={theme}>
                  <Canvas
                    pixelsPerSecond={pixelsPerSecond}
                    width={timelineWidth}
                    leftPadding={12}
                    snap={state.canvasSnap}
                    snapEnabled={snapEnabled}
                    keyboardFocusedTrack={state.focusedTrackIndex}
                    showRmsInWaveform={showRmsInWaveform}
                    controlPointStyle={controlPointStyle}
                    viewportHeight={scrollContainerRef.current?.clientHeight || 0}
                    recordingClipId={recordingClipId}
                    selectionAnchor={selectionAnchor}
                    setSelectionAnchor={setSelectionAnchor}
                    bpm={bpm}
                    beatsPerMeasure={beatsPerMeasure}
                    timeFormat={timelineFormat}
                    onClipMenuClick={(clipId, trackIndex, x, y, openedViaKeyboard) => {
                      setClipContextMenu({ isOpen: true, x, y, clipId, trackIndex, openedViaKeyboard });
                    }}
                    onTimeSelectionMenuClick={(x, y, trackIndex) => {
                      const timeSinceClosed = Date.now() - contextMenuClosedTimeRef.current;
                      if (timeSinceClosed > 300) {
                        const track = trackIndex !== undefined ? state.tracks[trackIndex] : undefined;
                        setTimeSelectionContextMenu({ isOpen: true, x, y, trackIndex, trackType: track?.type });
                      }
                    }}
                    onTrackFocusChange={(_trackIndex, _hasFocus) => {
                      // Don't dispatch SET_FOCUSED_TRACK here — clip vertical navigation
                      // moves focus between tracks without moving the track focus outline.
                      // Track clicks and container arrow navigation handle SET_FOCUSED_TRACK directly.
                      setControlPanelHasFocus(null);
                    }}
                    onTrackContainerFocusChange={(trackIndex, hasFocus) => {
                      setContainerFocusedTrack(hasFocus ? trackIndex : null);
                      if (hasFocus) {
                        dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                      }
                    }}
                    onEnterTrackPanel={(trackIndex) => {
                      const panels = document.querySelectorAll('[aria-label*="track controls"]');
                      if (panels[trackIndex]) {
                        const firstButton = panels[trackIndex].querySelector('button') as HTMLElement;
                        firstButton?.focus();
                      }
                    }}
                    onContainerEnter={(trackIndex, modifiers) => {
                      if (modifiers.shiftKey && !modifiers.metaKey && !modifiers.ctrlKey) {
                        // Shift+Enter: range-select from anchor to this track
                        const anchor = selectionAnchor ?? (state.selectedTrackIndices.length > 0 ? state.selectedTrackIndices[0] : trackIndex);
                        if (selectionAnchor === null) setSelectionAnchor(anchor);
                        const start = Math.min(anchor, trackIndex);
                        const end = Math.max(anchor, trackIndex);
                        const newSelection: number[] = [];
                        for (let i = start; i <= end; i++) newSelection.push(i);
                        dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                      } else if (modifiers.metaKey || modifiers.ctrlKey) {
                        toggleTrackSelection(trackIndex, state.selectedTrackIndices, dispatch);
                      } else {
                        selectTrackExclusive(trackIndex, dispatch);
                      }
                    }}
                    onShiftTabFromTrack={(trackIndex) => {
                      const prevIndex = trackIndex - 1;
                      if (prevIndex < 0) {
                        // First track — focus the timeline ruler
                        timelineRulerRef.current?.focus();
                        return;
                      }
                      // If rulers are visible and previous track is audio, focus its ruler
                      if (showVerticalRulers && state.tracks[prevIndex]?.type !== 'label' && state.tracks[prevIndex]?.type !== 'midi') {
                        const rulerEl = document.querySelector(
                          `[data-track-ruler-index="${prevIndex}"]`
                        ) as HTMLElement;
                        if (rulerEl) {
                          rulerEl.focus();
                          return;
                        }
                      }
                      // Try previous track's last clip
                      const prevTrack = document.querySelector(
                        `.track-wrapper[data-track-index="${prevIndex}"] .track`
                      );
                      if (prevTrack) {
                        const clips = prevTrack.querySelectorAll('[data-clip-id]');
                        if (clips.length > 0) {
                          (clips[clips.length - 1] as HTMLElement).focus();
                          return;
                        }
                      }
                      // No clips — focus last button in previous track's panel
                      const panels = document.querySelectorAll('[aria-label*="track controls"]');
                      if (panels[prevIndex]) {
                        const buttons = panels[prevIndex].querySelectorAll('button');
                        if (buttons.length > 0) {
                          (buttons[buttons.length - 1] as HTMLElement).focus();
                        }
                      }
                    }}
                    onTabFromLastClip={(trackIndex) => {
                      // If rulers are visible and this track is audio, focus the ruler
                      if (showVerticalRulers && state.tracks[trackIndex]?.type !== 'label' && state.tracks[trackIndex]?.type !== 'midi') {
                        const rulerEl = document.querySelector(
                          `[data-track-ruler-index="${trackIndex}"]`
                        ) as HTMLElement;
                        if (rulerEl) {
                          rulerEl.focus();
                          return;
                        }
                      }
                      // Otherwise, focus next track's container
                      const nextIndex = trackIndex + 1;
                      if (nextIndex < state.tracks.length) {
                        const target = document.querySelector(
                          `.track-wrapper[data-track-index="${nextIndex}"] .track`
                        ) as HTMLElement;
                        target?.focus();
                      } else {
                        // Last track — focus first focusable child in selection toolbar
                        const selToolbar = document.querySelector('.selection-toolbar');
                        const firstChild = selToolbar?.querySelector('[role="group"]') as HTMLElement;
                        firstChild?.focus();
                      }
                    }}
                    onMidiClipDoubleClick={(trackIndex, clipIndex) => {
                      dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex, clipIndex } });
                    }}
                    hoveredMidiClipId={hoveredMidiClipId}
                    onHoverMidiClip={setHoveredMidiClipId}
                    onHeightChange={setCanvasHeight}
                    spectrogramScale={spectrogramScale}
                  />
                </ThemeProvider>
                {/* Playhead stalk only (no icon) */}
                <PlayheadCursor
                  position={state.playheadPosition}
                  pixelsPerSecond={pixelsPerSecond}
                  height={Math.max(canvasHeight + scrollBuffer, viewportH)}
                  showTopIcon={false}
                />
                {/* Punch point indicator (roll-in recording) */}
                {punchPointPosition != null && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${12 + punchPointPosition * pixelsPerSecond}px`,
                      top: 0,
                      width: 1,
                      height: Math.max(canvasHeight + scrollBuffer, viewportH),
                      backgroundColor: '#FF2672',
                      zIndex: 99,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Loop region stalks */}
                {loopRegionStart !== null && loopRegionEnd !== null && (loopRegionInteracting || loopRegionHovering) && loopRegionEnabled && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${12 + loopRegionStart * pixelsPerSecond}px`,
                        top: 0,
                        width: '2px',
                        height: `${Math.max(canvasHeight + scrollBuffer, viewportH)}px`,
                        backgroundColor: loopRegionEnabled
                          ? theme.audio.timeline.loopRegionBorder
                          : theme.audio.timeline.loopRegionBorderInactive,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: `${12 + loopRegionEnd * pixelsPerSecond}px`,
                        top: 0,
                        width: '2px',
                        height: `${Math.max(canvasHeight + scrollBuffer, viewportH)}px`,
                        backgroundColor: loopRegionEnabled
                          ? theme.audio.timeline.loopRegionBorder
                          : theme.audio.timeline.loopRegionBorderInactive,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Custom Scrollbars */}
            <CustomScrollbar
              contentRef={scrollContainerRef}
              orientation="horizontal"
              height={20}
              className="custom-scrollbar--canvas-horizontal"
            />
            <CustomScrollbar
              contentRef={scrollContainerRef}
              orientation="vertical"
              width={20}
              className="custom-scrollbar--canvas-vertical"
            />
          </div>

          {/* Vertical Amplitude Rulers */}
          {showVerticalRulers && (
            <div onContextMenu={handleRulerContextMenu} style={{ display: 'flex', flexShrink: 0 }}>
              <VerticalRulerPanel
                tracks={state.tracks.map((track: any, index: number) => ({
                  id: track.id.toString(),
                  height: track.height || 114,
                  selected: state.selectedTrackIndices.includes(index),
                  focused: state.focusedTrackIndex === index,
                  containerFocused: containerFocusedTrack === index,
                  stereo: track.channelSplitRatio !== undefined,
                  viewMode: track.viewMode,
                  trackType: track.type,
                  channelSplitRatio: track.channelSplitRatio,
                  waveformRulerFormat: track.waveformRulerFormat,
                  spectrogramScale: track.spectrogramScale,
                  minFreq: track.spectrogramMinFreq,
                  maxFreq: track.spectrogramMaxFreq,
                }))}
                width={64}
                headerHeight={0}
                scrollY={scrollY}
                cursorY={isOverTrack ? mouseCursorY : undefined}
                rulerTabIndices={rulerTabIndices}
                onTabFromRuler={(trackIndex) => {
                  // Focus next track's container, or selection toolbar if last audio track
                  let nextIndex = trackIndex + 1;
                  // Skip label tracks (they have no focusable ruler)
                  while (nextIndex < state.tracks.length && (state.tracks[nextIndex].type === 'label' || state.tracks[nextIndex].type === 'midi')) {
                    nextIndex++;
                  }
                  if (nextIndex < state.tracks.length) {
                    const target = document.querySelector(
                      `.track-wrapper[data-track-index="${nextIndex}"] .track`
                    ) as HTMLElement;
                    target?.focus();
                  } else {
                    // Focus first focusable child in selection toolbar
                    const selToolbar = document.querySelector('.selection-toolbar');
                    const firstChild = selToolbar?.querySelector('[role="group"]') as HTMLElement;
                    firstChild?.focus();
                  }
                }}
                onShiftTabFromRuler={(trackIndex) => {
                  // Focus same track's last clip, or panel last button if no clips
                  const trackEl = document.querySelector(
                    `.track-wrapper[data-track-index="${trackIndex}"] .track`
                  );
                  if (trackEl) {
                    const clips = trackEl.querySelectorAll('[data-clip-id]');
                    if (clips.length > 0) {
                      (clips[clips.length - 1] as HTMLElement).focus();
                      return;
                    }
                  }
                  // No clips — focus last button in this track's panel
                  const panels = document.querySelectorAll('[aria-label*="track controls"]');
                  if (panels[trackIndex]) {
                    const buttons = panels[trackIndex].querySelectorAll('button');
                    if (buttons.length > 0) {
                      (buttons[buttons.length - 1] as HTMLElement).focus();
                    }
                  }
                }}
                onRulerNavigateVertical={(trackIndex, direction) => {
                  // Find next audio track's ruler in the given direction (skip label tracks)
                  let target = trackIndex + direction;
                  while (target >= 0 && target < state.tracks.length) {
                    if (state.tracks[target].type !== 'label' && state.tracks[target].type !== 'midi') {
                      const rulerEl = document.querySelector(
                        `[data-track-ruler-index="${target}"]`
                      ) as HTMLElement;
                      if (rulerEl) {
                        dispatch({ type: 'SET_FOCUSED_TRACK', payload: target });
                        rulerEl.focus();
                        return;
                      }
                    }
                    target += direction;
                  }
                }}
                onRulerActivate={(trackIndex, rect) => {
                  // Store trigger element for focus restoration on close
                  const rulerEl = document.querySelector(
                    `[data-track-ruler-index="${trackIndex}"]`
                  ) as HTMLElement;
                  rulerTriggerRef.current = rulerEl;
                  // Determine mode for flyout
                  const track = state.tracks[trackIndex];
                  const mode: 'waveform' | 'spectrogram' =
                    track?.viewMode === 'spectrogram' ? 'spectrogram' : 'waveform';
                  // Position flyout to the left of the ruler
                  const flyoutWidth = 200;
                  const flyoutHeight = mode === 'waveform' ? 242 : 280;
                  const flyoutX = rect.left - flyoutWidth - 16;
                  let flyoutY = rect.top + rect.height / 2 - flyoutHeight / 2;
                  const vh = window.innerHeight;
                  if (flyoutY + flyoutHeight > vh - 10) flyoutY = vh - flyoutHeight - 10;
                  if (flyoutY < 10) flyoutY = 10;
                  setRulerFlyout({ isOpen: true, x: flyoutX, y: flyoutY, mode, trackIndex });
                }}
                onRulerFocus={(trackIndex) => {
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                  setControlPanelHasFocus(null);
                }}
              />
            </div>
          )}

          {/* Ruler Flyout */}
          {rulerFlyout && (
            <RulerFlyout
              isOpen={rulerFlyout.isOpen}
              onClose={() => setRulerFlyout(null)}
              triggerRef={rulerTriggerRef as React.RefObject<HTMLElement>}
              x={rulerFlyout.x}
              y={rulerFlyout.y}
              mode={rulerFlyout.mode}
              rulerFormat={state.tracks[rulerFlyout.trackIndex]?.waveformRulerFormat ?? 'linear-amp'}
              onRulerFormatChange={(format: WaveformRulerFormat) => {
                dispatch({ type: 'UPDATE_TRACK_RULER_FORMAT', payload: { index: rulerFlyout.trackIndex, format } });
              }}
              halfWave={halfWave}
              onHalfWaveChange={setHalfWave}
              spectrogramScale={state.tracks[rulerFlyout.trackIndex]?.spectrogramScale ?? spectrogramScale}
              onSpectrogramScaleChange={(scale: SpectrogramScale) => {
                dispatch({ type: 'UPDATE_TRACK_SPECTROGRAM_SCALE', payload: { index: rulerFlyout.trackIndex, scale } });
              }}
              minFreq={state.tracks[rulerFlyout.trackIndex]?.spectrogramMinFreq}
              onMinFreqChange={(freq: number) => {
                dispatch({ type: 'UPDATE_TRACK_SPECTROGRAM_FREQ', payload: { index: rulerFlyout.trackIndex, minFreq: freq } });
              }}
              maxFreq={state.tracks[rulerFlyout.trackIndex]?.spectrogramMaxFreq}
              onMaxFreqChange={(freq: number) => {
                dispatch({ type: 'UPDATE_TRACK_SPECTROGRAM_FREQ', payload: { index: rulerFlyout.trackIndex, maxFreq: freq } });
              }}
            />
          )}
        </div>

      </div>
    </div>

    {/* Bottom Drawer — unified tabbed panel for Mixer and Piano Roll */}
    {(() => {
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
            const audioTracks = state.tracks.filter((t: any) => t.type !== 'label');
            const mixerChannels: MixerPanelChannel[] = audioTracks.map((track: any) => {
              const trackIndex = state.tracks.findIndex((t: any) => t.id === track.id);
              const trackGain = track.gain ?? -6;
              const meterLevel = trackMeterLevels.get(trackIndex) ?? 0;
              return {
                id: String(track.id),
                channelProps: {
                  trackName: track.name,
                  trackColor: track.color ? (theme.audio.clip as any)[track.color]?.header : undefined,
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
                  effects: (track.effects || []).map((effect: any, effectIndex: number) => ({
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
                  effects: (state.masterEffects || []).map((effect: any, effectIndex: number) => ({
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
                trackColor={prTrack.color}
                playheadPosition={state.playheadPosition}
              />
            );
          })()}
        </div>
      );
    })()}
    </div>
  );
}
