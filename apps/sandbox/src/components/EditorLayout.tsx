import React from 'react';
import { flushSync } from 'react-dom';
import type { SpectralSelection } from '../contexts/SpectralSelectionContext';
import { Canvas } from './Canvas';
import { MarketplaceModal, type MarketplaceEffect } from './MarketplaceModal';
import { EffectPickerMenu } from './EffectPickerMenu';
import { useMuseHub } from '../contexts/MuseHubContext';
import { TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, VerticalRulerPanel, CustomScrollbar, TrackType, ThemeProvider, RulerFlyout, useTabOrder, useAccessibilityProfile, useEditingBehaviorPrefs } from '@dilsonspickles/components';
import type { SpectrogramScale, WaveformRulerFormat, ThemeTokens } from '@dilsonspickles/components';
import type { EnvelopePointStyleKey } from '@audacity-ui/core';
import { useTracks } from '../contexts/TracksContext';
import { useDialogs } from '../contexts/DialogContext';
import { useContextMenus } from '../contexts/ContextMenuContext';
import { useAudioEngine, MIDI_INSTRUMENTS } from '../contexts/AudioEngineContext';
import { selectTrackExclusive, toggleTrackSelection } from '../utils/trackSelection';
import { snapToGrid } from '../utils/snapToGrid';
import { confirmTrackDelete } from '../utils/confirmTrackDelete';
import { usePianoRollSmoothScroll } from '../hooks/usePianoRollSmoothScroll';
import { useMeasuredWidth } from '../hooks/useMeasuredWidth';
import { useRulerFlyout } from '../hooks/useRulerFlyout';
import { useTimelineRulerInteractions } from '../hooks/useTimelineRulerInteractions';
import { useAutoOpenPianoRoll } from '../hooks/useAutoOpenPianoRoll';
import { useDrawerTabAutoSwitch } from '../hooks/useDrawerTabAutoSwitch';
import { useTimeSelectionTabHandler } from '../hooks/useTimeSelectionTabHandler';
import { useFlatNavTabRouter } from '../hooks/useFlatNavTabRouter';
import { usePlayback } from '../contexts/PlaybackContext';
import { useLoopRegionContext } from '../contexts/LoopRegionContext';
import { buildNewTrack, buildDuplicatedTracks } from '../utils/trackManagement';
import { LoopRegionStalks } from './editor/LoopRegionStalks';
import { PunchPointIndicator } from './editor/PunchPointIndicator';
import { EditorBottomDrawer } from './editor/EditorBottomDrawer';
import { TrackEffectsPanel } from './editor/TrackEffectsPanel';
import {
  findTrackControlPanelByIndex,
  findFirstButtonInTrackControlPanel,
  findLastButtonInTrackControlPanel,
  resolveTrackDropIndex,
  findFirstClipInTrack,
  findLastClipInTrack,
  findTrackRulerByIndex,
  findTrackContainerByIndex,
  findSelectionToolbarFirstGroup,
} from '../utils/focusRouting';

export interface EditorLayoutProps {
  // Active menu
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';

  // Captures the element that opened the track context menu so the
  // shell can restore focus there when the menu closes. Shared with
  // AppContextMenus.
  trackMenuTriggerRef?: React.MutableRefObject<HTMLElement | null>;

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

  // Ruler time selection
  rulerTimeSelection: { startTime: number; endTime: number } | null | undefined;
  spectralSelection: SpectralSelection | null;

  // Theme
  theme: ThemeTokens;

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

  // MuseHub marketplace modal — lifted to App.tsx so the project toolbar
  // can trigger it from outside the track UI.
  marketplaceModal: {
    open: boolean;
    trackIndex?: number;
    anchorRect?: DOMRect | null;
    replaceIndex?: number;
  };
  setMarketplaceModal: React.Dispatch<React.SetStateAction<{
    open: boolean;
    trackIndex?: number;
    anchorRect?: DOMRect | null;
    replaceIndex?: number;
  }>>;
}

const STYLE_FLEX_ROW_OVERFLOW: React.CSSProperties = { display: 'flex', flex: 1, overflow: 'hidden' };
const STYLE_FLEX_COL_OVERFLOW: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' };
const STYLE_ROW_NO_SHRINK: React.CSSProperties = { display: 'flex', flexDirection: 'row' as const, flexShrink: 0 };
const STYLE_RELATIVE_FLEX_OVERFLOW: React.CSSProperties = { position: 'relative', flex: 1, overflow: 'hidden' };
const STYLE_FULL_WIDTH_RELATIVE: React.CSSProperties = { width: '100%', position: 'relative' };
const STYLE_FLEX_ROW_OVERFLOW_HIDDEN: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'row' as const, overflow: 'hidden' };

export function EditorLayout(props: EditorLayoutProps) {
  const { state, dispatch } = useTracks();
  const {
    activeMenuItem,
    trackMenuTriggerRef,
    scrollX, scrollY, onScroll, onTrackHeaderScroll,
    scrollContainerRef, trackHeaderScrollRef,
    pixelsPerSecond, timelineWidth, timelineDuration, timelineFormat, bpm, beatsPerMeasure,
    showRmsInWaveform, controlPointStyle, spectrogramScale, setSpectrogramScale: _setSpectrogramScale, showVerticalRulers,
    isPlaying, setIsPlaying, trackMeterLevels, isMicMonitoring, recordingClipId,
    selectionAnchor, setSelectionAnchor, controlPanelHasFocus: _controlPanelHasFocus, setControlPanelHasFocus,
    containerFocusedTrack, setContainerFocusedTrack,
    mouseCursorPosition, setMouseCursorPosition, mouseCursorY, setMouseCursorY, isOverTrack, setIsOverTrack,
    rulerTimeSelection, spectralSelection,
    theme, canvasHeight, setCanvasHeight,
    clickRulerToStartPlayback, punchPointPosition, snapEnabled, isFlatNavigation: _isFlatNavigation,
    showMixer,
  } = props;

  const {
    loopRegionEnabled, setLoopRegionEnabled, loopRegionStart, setLoopRegionStart, loopRegionEnd, setLoopRegionEnd,
    loopRegionInteracting, setLoopRegionInteracting, loopRegionHovering, setLoopRegionHovering,
  } = useLoopRegionContext();

  const { audioManagerRef } = usePlayback();
  const { trackSelectionMode } = useEditingBehaviorPrefs();
  const { setIsSpectrogramSettingsOpen, setIsPluginManagerOpen } = useDialogs();
  const {
    effectsPanel, setEffectsPanel, setEffectDialog, setEffectSelectorMenu,
    setClipContextMenu, setTimeSelectionContextMenu, setTrackContextMenu, setTimelineRulerContextMenu,
    contextMenuClosedTimeRef,
  } = useContextMenus();

  const { playMidiNote, midiInstrument } = useAudioEngine();
  const { marketplaceModal, setMarketplaceModal } = props;
  // Pull MuseHub state (wallet, library, plugin-manager flags) from the
  // shared context so the picker, slot caret menus and marketplace modal all
  // stay in sync without prop-drilling.
  const {
    signedIn: museHubSignedIn,
    purchasedEffects,
    installedEffects,
    uninstalledIds,
    installingIds,
    disabledPluginIds,
    addToLibrary,
    uninstallEffect,
    startDownload,
  } = useMuseHub();
  const purchasedIds = React.useMemo(
    () => new Set(purchasedEffects.map((e) => e.id)),
    [purchasedEffects]
  );
  // Picker menu shown when "Effects" / "+" button is clicked. Categories of
  // installed effects appear as submenus; "Get effects…" opens the marketplace.
  const [effectPicker, setEffectPicker] = React.useState<{
    open: boolean;
    x: number;
    y: number;
    trackIndex?: number;
    anchorRect: DOMRect | null;
  }>({ open: false, x: 0, y: 0, anchorRect: null });
  const [drawerHeight, setDrawerHeight] = React.useState(376);
  const [drawerActiveTab, setDrawerActiveTab] = React.useState<'mixer' | 'piano-roll'>('mixer');
  const [drawerTabOrder, setDrawerTabOrder] = React.useState<Array<'mixer' | 'piano-roll'>>(['mixer', 'piano-roll']);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const timelineRulerRef = React.useRef<HTMLDivElement>(null);

  // Measured viewport width of the ruler wrapper. Passed to TimelineRuler
  // as `viewportWidth` so its canvas stays sharp on HiDPI displays — the
  // project-sized `width` is kept only for legacy scroll-extent math.
  const rulerViewportWidth = useMeasuredWidth(timelineRulerRef);

  // Tab order for ruler focus
  const { activeProfile } = useAccessibilityProfile();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';
  const trackBase = useTabOrder('tracks');

  // Calculate ruler tab indices — one per track, -1 for label tracks
  const rulerTabIndices = React.useMemo(() =>
    state.tracks.map((track, i: number) => {
      if (track.type === 'label' || track.type === 'midi') return -1;
      return isFlatNavigation ? 0 : (trackBase + 3 + i * 4);
    }),
    [state.tracks, isFlatNavigation, trackBase],
  );

  useTimeSelectionTabHandler({ state, showVerticalRulers });

  useFlatNavTabRouter({ isFlatNavigation });

  // Auto-switch drawer active tab when panels open/close
  useDrawerTabAutoSwitch({ showMixer, pianoRollOpen: state.pianoRollOpen, drawerActiveTab, setDrawerActiveTab });

  // Auto-open/switch piano roll when a MIDI track is focused
  useAutoOpenPianoRoll({ state, dispatch });

  // Smooth-scroll piano roll to the selected clip's boundary area
  const { skipPianoRollScrollRef } = usePianoRollSmoothScroll({ state, dispatch });

  const [hoveredMidiClipId, setHoveredMidiClipId] = React.useState<number | null>(null);

  // Ruler flyout state
  const {
    rulerFlyout, setRulerFlyout, rulerTriggerRef, halfWave, setHalfWave,
    handleRulerContextMenu, openRulerFlyoutForTrack,
  } = useRulerFlyout({ tracks: state.tracks, scrollY });

  // Timeline-ruler wrapper interactions: keyboard nudge/escape/context-menu,
  // mouse-cursor time tracking, click-to-play, right-click context menu.
  const {
    onKeyDown: onRulerKeyDown, onMouseMove: onRulerMouseMove, onMouseLeave: onRulerMouseLeave,
    onClick: onRulerClick, onContextMenu: onRulerContextMenu,
  } = useTimelineRulerInteractions({
    timelineRulerRef,
    playheadPosition: state.playheadPosition,
    canvasSnap: state.canvasSnap,
    snapEnabled,
    timelineFormat,
    bpm,
    beatsPerMeasure,
    pixelsPerSecond,
    scrollX,
    clickRulerToStartPlayback,
    tracks: state.tracks,
    audioManagerRef,
    setIsPlaying,
    setMouseCursorPosition,
    setTimelineRulerContextMenu,
    dispatch,
  });

  // Cmd+Click / Cmd+Enter on a track panel row. With a scoped time
  // selection active, the gesture edits the SELECTION SCOPE — which
  // rows the time selection covers — and leaves the track selection
  // alone (the two axes are independent). Without one, it falls back
  // to the classic track-selection toggle.
  const toggleScopeOrTrackSelection = (index: number) => {
    toggleTrackSelection(index, state.selectedTrackIndices, dispatch);
    // If there's an active time selection, keep its scope in sync with
    // the new track selection so the selection visual appears on the
    // newly added (or disappears from the removed) track.
    const ts = state.timeSelection;
    if (ts) {
      const currentScope = ts.tracks ?? state.selectedTrackIndices;
      const newScope = currentScope.includes(index)
        ? currentScope.filter((i) => i !== index)
        : [...currentScope, index].sort((a, b) => a - b);
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: newScope.length > 0 ? { ...ts, tracks: newScope } : null,
      });
    }
    setSelectionAnchor(index);
  };

  // Buffer zone below tracks so user can scroll content further up the screen
  const viewportH = scrollContainerRef.current?.clientHeight || 0;
  const scrollBuffer = viewportH > 0 && canvasHeight > viewportH ? Math.round(viewportH * 0.4) : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
    <div style={STYLE_FLEX_ROW_OVERFLOW}>
      {/* Effects Panel - Hidden on export tab */}
      {activeMenuItem !== 'export' && effectsPanel?.isOpen && (
        <TrackEffectsPanel
          effectsPanel={effectsPanel}
          tracks={state.tracks}
          masterEffects={state.masterEffects}
          masterEffectsEnabled={state.masterEffectsEnabled}
          museHubSignedIn={museHubSignedIn}
          installedEffects={installedEffects}
          disabledPluginIds={disabledPluginIds}
          setEffectPicker={setEffectPicker}
          setEffectDialog={setEffectDialog}
          setEffectsPanel={setEffectsPanel}
          setMarketplaceModal={setMarketplaceModal}
        />
      )}

      {/* Track Control Side Panel - Hidden on export tab */}
      {activeMenuItem !== 'export' && (
        <TrackControlSidePanel
          trackHeights={state.tracks.map((t) => t.height || 114)}
          trackViewModes={state.tracks.map((t) => t.viewMode)}
          focusedTrackIndex={state.focusedTrackIndex}
          scrollRef={trackHeaderScrollRef}
          onScroll={onTrackHeaderScroll}
          bufferSpace={scrollBuffer}
          onTrackResize={(trackIndex, height) => {
            dispatch({ type: 'UPDATE_TRACK_HEIGHT', payload: { index: trackIndex, height } });
            setRulerFlyout(null);
          }}
          onAddTrackType={(type: TrackType) => {
            const newTrack = buildNewTrack(type, state.tracks);
            dispatch({ type: 'ADD_TRACK', payload: newTrack });
          }}
          showMidiOption={true}
          onDeleteTrack={(trackIndex) => {
            const t = state.tracks[trackIndex];
            const hasContent = t
              && ((t.clips?.length ?? 0) > 0 || (t.midiClips?.length ?? 0) > 0);
            confirmTrackDelete(
              1,
              () => dispatch({ type: 'DELETE_TRACK', payload: trackIndex }),
              { skipDialog: !hasContent },
            );
          }}
          onDuplicateTrack={(trackIndex) => {
            const trackIndices = state.selectedTrackIndices.includes(trackIndex)
              ? [...state.selectedTrackIndices]
              : [trackIndex];

            const duplicatedTracks = buildDuplicatedTracks(trackIndices, state.tracks);
            duplicatedTracks.forEach((duplicatedTrack) => {
              dispatch({
                type: 'ADD_TRACK',
                payload: duplicatedTrack,
              });
            });
          }}
          onMoveTrackUp={() => {
          }}
          onMoveTrackDown={() => {
          }}
          onTrackViewChange={(trackIndex, viewMode) => {
            dispatch({ type: 'UPDATE_TRACK_VIEW', payload: { index: trackIndex, viewMode } });
          }}
          // Prefer the track's own color when it's set — falling back
          // to the first clip's color keeps the swatch showing the
          // right hue for legacy state where a user-picked colour
          // never made it into track.color.
          trackColors={state.tracks.map((t) => t.color ?? t.clips[0]?.color)}
          onTrackColorChange={(trackIndex, color) => {
            // Update the track's own colour too — handlePaste reads
            // state.tracks[destTrackIndex].color to stamp pasted clips,
            // so a track whose colour lives only on its clips would
            // stamp pastes with the stale palette default.
            dispatch({
              type: 'UPDATE_TRACK',
              payload: { index: trackIndex, track: { color } },
            });
            const track = state.tracks[trackIndex];
            track?.clips.forEach((clip) => {
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
          {state.tracks.map((track, index: number) => {
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
                icon={track.icon as any} // justified: Track.icon is a loose string; TrackControlPanel narrows to IconName at render
                onIconChange={(nextIcon) => {
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { icon: nextIcon } } });
                }}
                onRename={(newName) => {
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { name: newName } } });
                }}
                volume={track.gain ?? 75}
                pan={track.pan ?? 0}
                onVolumeChange={(value) => {
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { gain: value } } });
                }}
                onPanChange={(value) => {
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { pan: value } } });
                }}
                isMuted={track.muted ?? false}
                isSolo={track.soloed ?? false}
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
                onMuteToggle={(e) => {
                  // Cmd/Ctrl+click: exclusive mute — mute this track
                  // (unconditionally), clear every other track's mute.
                  if (e.metaKey || e.ctrlKey) {
                    dispatch({ type: 'SET_TRACK_MUTED_EXCLUSIVE', payload: index });
                    state.tracks.forEach((t, i) => {
                      if (i === index) {
                        audioManagerRef.current.setTrackMuted(i, true);
                      } else {
                        audioManagerRef.current.setTrackGain(i, t.gain ?? 75);
                      }
                    });
                    return;
                  }
                  // Plain click: toggle this track's mute in place.
                  const newMuted = !(track.muted ?? false);
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { muted: newMuted } } });
                  if (newMuted) {
                    audioManagerRef.current.setTrackMuted(index, true);
                  } else {
                    audioManagerRef.current.setTrackGain(index, track.gain ?? 75);
                  }
                }}
                onSoloToggle={(e) => {
                  // Cmd/Ctrl+click: exclusive solo — solo this track
                  // (unconditionally), clear every other track's solo.
                  if (e.metaKey || e.ctrlKey) {
                    dispatch({ type: 'SET_TRACK_SOLOED_EXCLUSIVE', payload: index });
                    return;
                  }
                  // Plain click: toggle this track's solo — adds/removes
                  // it from the solo pool without touching other tracks.
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { soloed: !(track.soloed ?? false) } } });
                }}
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
                instruments={track.type === 'midi' ? MIDI_INSTRUMENTS : undefined}
                instrument={track.instrument}
                onInstrumentChange={track.type === 'midi' ? (id: string) => {
                  dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { instrument: id } } });
                } : undefined}
                tabIndex={-1}
                onFocusChange={(hasFocus) => {
                  setControlPanelHasFocus(hasFocus ? index : null);
                  if (hasFocus) {
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: index });
                  }
                }}
                onDragReorderDrop={(clientY) => {
                  // Resolve the drop Y to a track index by hit-testing
                  // every visible panel. If the pointer landed above
                  // the first row or below the last, clamp.
                  const target = resolveTrackDropIndex(document, clientY);
                  if (target < 0 || target === index) return;
                  dispatch({
                    type: 'MOVE_TRACK',
                    payload: { fromIndex: index, toIndex: target },
                  });
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: target });
                }}
                onReorderVertical={(direction) => {
                  // Cmd+Arrow on the track panel header: reorder
                  // this track's row within the track list, using
                  // the same MOVE_TRACK path the canvas .track
                  // container uses. Aborts silently at the edges.
                  const dir = direction === 'up' ? -1 : 1;
                  const target = index + dir;
                  if (target < 0 || target >= state.tracks.length) return;
                  dispatch({
                    type: 'MOVE_TRACK',
                    payload: { fromIndex: index, toIndex: target },
                  });
                  // Focus follows the moved row so subsequent
                  // Cmd+Arrows accumulate.
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: target });
                  // Move DOM focus to the newly positioned panel so
                  // the next keydown fires from the right instance.
                  requestAnimationFrame(() => {
                    findTrackControlPanelByIndex(document, target)?.focus?.();
                  });
                }}
                onNavigateVertical={(direction, shiftKey) => {
                  const nextIndex = direction === 'up' ? index - 1 : index + 1;
                  if (nextIndex >= 0 && nextIndex < state.tracks.length) {
                    flushSync(() => {
                      dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
                    });

                    if (shiftKey) {
                      // Shift+Arrow: extend/contract track selection.
                      // Anchor persists across the chain.
                      const anchor = selectionAnchor ?? index;
                      if (selectionAnchor === null) {
                        setSelectionAnchor(index);
                      }
                      const start = Math.min(anchor, nextIndex);
                      const end = Math.max(anchor, nextIndex);
                      const newSelection: number[] = [];
                      for (let i = start; i <= end; i++) newSelection.push(i);
                      dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                    }
                    // Plain arrow-nav: intentionally NOT clearing the
                    // anchor. A stale selectedTrackIndices[0] fallback
                    // was the source of "Shift+Enter after nav selects
                    // the wrong range". The anchor is now only reset
                    // by explicit "reset intent" gestures (plain click,
                    // plain Enter, exclusive-select), so a
                    // just-established anchor survives the walk to
                    // where the user wants to extend.

                    const nextPanel = findTrackControlPanelByIndex(document, nextIndex);
                    if (nextPanel) {
                      nextPanel.focus();
                      nextPanel.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                      });
                    }
                  }
                }}
                onAddLabelClick={() => {
                  const allLabels = state.tracks.flatMap((t) => t.labels || []);
                  const nextLabelId = allLabels.length > 0
                    ? Math.max(...allLabels.map((l) => l.id)) + 1
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
                  if (trackMenuTriggerRef) {
                    trackMenuTriggerRef.current = button as HTMLElement;
                  }
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
                  dispatch({ type: 'SET_TIME_SELECTION', payload: null });
                  // Anchor the just-clicked track so a subsequent
                  // Shift+Enter from another track extends the range
                  // from HERE — the user's most recent explicit
                  // selection, not the app-init default of [0].
                  setSelectionAnchor(index);
                }}
                onToggleSelection={() => toggleScopeOrTrackSelection(index)}
                onRangeSelection={() => {
                  // Fallback to CURRENT focus rather than
                  // selectedTrackIndices[0]. The old fallback picked
                  // up the app-init `[0]` selection as an implicit
                  // anchor, so Shift+Enter down to the bottom track
                  // silently spanned from track 0 → last (i.e., "all
                  // tracks selected") without the user ever having
                  // established that anchor.
                  const anchor = selectionAnchor ?? index;
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
                  const firstClip = findFirstClipInTrack(document, index);
                  if (firstClip) {
                    firstClip.focus();
                    return;
                  }
                  // No clips — skip to ruler or next track
                  if (showVerticalRulers && state.tracks[index]?.type !== 'label' && state.tracks[index]?.type !== 'midi') {
                    const rulerEl = findTrackRulerByIndex(document, index);
                    if (rulerEl) {
                      rulerEl.focus();
                      return;
                    }
                  }
                  const nextIndex = index + 1;
                  if (nextIndex < state.tracks.length) {
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
                    if (trackSelectionMode === 'follows-focus') {
                      dispatch({ type: 'SELECT_TRACK', payload: nextIndex });
                      setSelectionAnchor(nextIndex);
                    }
                    findTrackContainerByIndex(document, nextIndex)?.focus();
                  } else {
                    findSelectionToolbarFirstGroup(document)?.focus();
                  }
                }}
                onShiftTabOut={() => {
                  findTrackContainerByIndex(document, index)?.focus();
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
              onKeyDown={onRulerKeyDown}
              style={STYLE_FULL_WIDTH_RELATIVE}
              onMouseMove={onRulerMouseMove}
              onMouseLeave={onRulerMouseLeave}
              onClick={onRulerClick}
              onContextMenu={onRulerContextMenu}
            >
              <TimelineRuler
                pixelsPerSecond={pixelsPerSecond}
                scrollX={scrollX}
                totalDuration={timelineDuration}
                width={timelineWidth}
                viewportWidth={rulerViewportWidth || undefined}
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
                <LoopRegionStalks
                  loopRegionStart={loopRegionStart}
                  loopRegionEnd={loopRegionEnd}
                  loopRegionEnabled={loopRegionEnabled}
                  pixelsPerSecond={pixelsPerSecond}
                  height="40px"
                  theme={theme}
                />
              )}
              {/* Punch point indicator in ruler */}
              {punchPointPosition != null && (
                <PunchPointIndicator
                  punchPointPosition={punchPointPosition}
                  pixelsPerSecond={pixelsPerSecond}
                  height="100%"
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

          {/* Fixed Vertical Ruler Header (next to timeline ruler) —
              sits in the top-right corner where the timeline ruler
              meets the vertical amplitude ruler. Colour-matched to
              the timeline rail so the whole top strip reads as one
              continuous surface. */}
          {showVerticalRulers && (
            <div style={{
              width: '64px',
              height: '40px',
              flexShrink: 0,
              backgroundColor: theme.background.panel.timeline,
              borderLeft: `1px solid ${theme.border.onElevated}`,
              borderBottom: `1px solid ${theme.border.onElevated}`,
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
              {/* scrollBuffer now lives inside the Canvas component
                  (passed as bottomBuffer) so beat/measure gridlines
                  extend through that empty area below the last track
                  instead of stopping where the canvas-container ends. */}
              <div style={{ minWidth: `${timelineWidth}px`, position: 'relative', cursor: 'text' }}>
                <ThemeProvider theme={theme}>
                  <Canvas
                    pixelsPerSecond={pixelsPerSecond}
                    width={timelineWidth}
                    leftPadding={12}
                    snap={state.canvasSnap}
                    snapEnabled={snapEnabled}
                    showRmsInWaveform={showRmsInWaveform}
                    controlPointStyle={controlPointStyle}
                    viewportHeight={scrollContainerRef.current?.clientHeight || 0}
                    bottomBuffer={scrollBuffer}
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
                      // Track focus no longer follows clip focus —
                      // each focus state stands on its own. The
                      // container-focus path (onTrackContainerFocusChange)
                      // is the only thing that sets focusedTrackIndex
                      // now, so keyboard nav landing on the track row
                      // itself still updates the side panel / ruler,
                      // while landing on a clip leaves the track focus
                      // state where it was.
                      setControlPanelHasFocus(null);
                    }}
                    onTrackContainerFocusChange={(trackIndex, hasFocus) => {
                      setContainerFocusedTrack(hasFocus ? trackIndex : null);
                      if (hasFocus) {
                        dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                      }
                    }}
                    onEnterTrackPanel={(trackIndex) => {
                      findFirstButtonInTrackControlPanel(document, trackIndex)?.focus();
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
                        toggleScopeOrTrackSelection(trackIndex);
                      } else {
                        // Plain Enter: select the track, or deselect if it's
                        // already the sole selection (toggle-off).
                        const isOnlySelection =
                          state.selectedTrackIndices.length === 1 &&
                          state.selectedTrackIndices[0] === trackIndex;
                        if (isOnlySelection) {
                          dispatch({ type: 'SET_SELECTED_TRACKS', payload: [] });
                          setSelectionAnchor(null);
                        } else {
                          selectTrackExclusive(trackIndex, dispatch);
                        }
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
                        const rulerEl = findTrackRulerByIndex(document, prevIndex);
                        if (rulerEl) {
                          rulerEl.focus();
                          return;
                        }
                      }
                      // Try previous track's last clip
                      const lastClip = findLastClipInTrack(document, prevIndex);
                      if (lastClip) {
                        lastClip.focus();
                        return;
                      }
                      // No clips — focus last button in previous track's panel
                      findLastButtonInTrackControlPanel(document, prevIndex)?.focus();
                    }}
                    onTabFromLastClip={(trackIndex) => {
                      // Tab off the last clip → focus THIS track's
                      // vertical ruler as the next stop in the
                      // per-track flow: [header] → clip 1 → … →
                      // clip N → [ruler] → [next header]. The
                      // ruler's own onTabFromRuler picks up from
                      // here and moves to the next track's panel.
                      if (showVerticalRulers && state.tracks[trackIndex]?.type !== 'label' && state.tracks[trackIndex]?.type !== 'midi') {
                        const rulerEl = findTrackRulerByIndex(document, trackIndex);
                        if (rulerEl) {
                          rulerEl.focus();
                          return;
                        }
                      }
                      // No ruler (hidden, or label/midi track) —
                      // skip straight to the next track's control
                      // panel.
                      const nextIndex = trackIndex + 1;
                      if (nextIndex < state.tracks.length) {
                        const nextPanel = findTrackControlPanelByIndex(document, nextIndex);
                        if (nextPanel) {
                          const firstButton = nextPanel.querySelector<HTMLElement>('button');
                          firstButton?.focus();
                          return;
                        }
                        // Fall back to focusing the track container
                        // if the panel can't be found.
                        dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
                        if (trackSelectionMode === 'follows-focus') {
                          dispatch({ type: 'SELECT_TRACK', payload: nextIndex });
                          setSelectionAnchor(nextIndex);
                        }
                        findTrackContainerByIndex(document, nextIndex)?.focus();
                      } else {
                        // Last track — focus first focusable child in selection toolbar
                        findSelectionToolbarFirstGroup(document)?.focus();
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
                  <PunchPointIndicator
                    punchPointPosition={punchPointPosition}
                    pixelsPerSecond={pixelsPerSecond}
                    height={Math.max(canvasHeight + scrollBuffer, viewportH)}
                  />
                )}
                {/* Loop region stalks */}
                {loopRegionStart !== null && loopRegionEnd !== null && (loopRegionInteracting || loopRegionHovering) && loopRegionEnabled && (
                  <LoopRegionStalks
                    loopRegionStart={loopRegionStart}
                    loopRegionEnd={loopRegionEnd}
                    loopRegionEnabled={loopRegionEnabled}
                    pixelsPerSecond={pixelsPerSecond}
                    height={`${Math.max(canvasHeight + scrollBuffer, viewportH)}px`}
                    theme={theme}
                  />
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
                tracks={state.tracks.map((track, index: number) => ({
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
                  // Tab off the ruler → focus the NEXT track's
                  // container (.track div). The per-track flow is
                  // [header] → clips → [ruler] → [next track row],
                  // from which the user can then Tab into that
                  // track's own header / clips as they wish.
                  let nextIndex = trackIndex + 1;
                  // Skip label / midi tracks (they have no focusable ruler)
                  while (nextIndex < state.tracks.length && (state.tracks[nextIndex].type === 'label' || state.tracks[nextIndex].type === 'midi')) {
                    nextIndex++;
                  }
                  if (nextIndex < state.tracks.length) {
                    // Move all three focus signals to the next track:
                    // blue outline (focusedTrackIndex), selection
                    // (in follows-focus mode), and DOM focus.
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
                    if (trackSelectionMode === 'follows-focus') {
                      dispatch({ type: 'SELECT_TRACK', payload: nextIndex });
                      setSelectionAnchor(nextIndex);
                    }
                    findTrackContainerByIndex(document, nextIndex)?.focus();
                  } else {
                    // Focus first focusable child in selection toolbar
                    findSelectionToolbarFirstGroup(document)?.focus();
                  }
                }}
                onShiftTabFromRuler={(trackIndex) => {
                  // Focus same track's last clip, or panel last button if no clips
                  const lastClip = findLastClipInTrack(document, trackIndex);
                  if (lastClip) {
                    lastClip.focus();
                    return;
                  }
                  // No clips — focus last button in this track's panel
                  findLastButtonInTrackControlPanel(document, trackIndex)?.focus();
                }}
                onRulerNavigateVertical={(trackIndex, direction) => {
                  // Find next audio track's ruler in the given direction (skip label tracks)
                  let target = trackIndex + direction;
                  while (target >= 0 && target < state.tracks.length) {
                    if (state.tracks[target].type !== 'label' && state.tracks[target].type !== 'midi') {
                      const rulerEl = findTrackRulerByIndex(document, target);
                      if (rulerEl) {
                        dispatch({ type: 'SET_FOCUSED_TRACK', payload: target });
                        // Focus the ruler with preventScroll — the ruler
                        // panel positions itself via CSS transform driven
                        // by scrollY, not native scrolling, so a default
                        // scroll-into-view would shift the ruler column
                        // out of alignment with the tracks. Instead we
                        // scroll the canvas container manually; its
                        // scrollY prop then flows back into the ruler
                        // transform on the next render.
                        rulerEl.focus({ preventScroll: true });
                        const scrollEl = scrollContainerRef.current;
                        if (scrollEl) {
                          const trackTop = state.tracks
                            .slice(0, target)
                            .reduce((sum, t) => sum + ((t.height || 114) + 2), 0);
                          const trackHeight = state.tracks[target].height || 114;
                          const viewportTop = scrollEl.scrollTop;
                          const viewportBottom = viewportTop + scrollEl.clientHeight;
                          if (trackTop < viewportTop) {
                            scrollEl.scrollTop = Math.max(0, trackTop - 8);
                          } else if (trackTop + trackHeight > viewportBottom) {
                            scrollEl.scrollTop = trackTop + trackHeight - scrollEl.clientHeight + 8;
                          }
                        }
                        return;
                      }
                    }
                    target += direction;
                  }
                }}
                onRulerActivate={(trackIndex, rect) => {
                  openRulerFlyoutForTrack(trackIndex, rect);
                }}
                onRulerFocus={(trackIndex) => {
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                  setControlPanelHasFocus(null);
                  // Ruler lives outside .canvas-scroll-container, so
                  // scrollIntoViewIfNeeded can't find a scroll parent
                  // for it. Instead, scroll the canvas to the matching
                  // track row — the ruler translates with scrollY and
                  // follows along. Matches the wrapper's scroll feel:
                  // smooth, with the track top landing TOP_OFFSET below
                  // the viewport top in both directions.
                  if (isFlatNavigation) {
                    const scrollEl = scrollContainerRef.current;
                    if (scrollEl) {
                      const TOP_OFFSET = 80;
                      const BOTTOM_PAD = 24;
                      const trackTop = state.tracks
                        .slice(0, trackIndex)
                        .reduce((sum: number, t) => sum + ((t.height || 114) + 2), 0);
                      const trackHeight = state.tracks[trackIndex]?.height || 114;
                      const viewportTop = scrollEl.scrollTop;
                      const viewportBottom = viewportTop + scrollEl.clientHeight;
                      const isAboveBand = trackTop < viewportTop + TOP_OFFSET;
                      const isBelowBand = trackTop + trackHeight > viewportBottom - BOTTOM_PAD;
                      if (isAboveBand || isBelowBand) {
                        scrollEl.scrollTo({
                          top: Math.max(0, trackTop - TOP_OFFSET),
                          behavior: 'smooth',
                        });
                      }
                    }
                  }
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
    <EditorBottomDrawer
      state={state}
      theme={theme}
      activeMenuItem={activeMenuItem}
      showMixer={showMixer}
      trackMeterLevels={trackMeterLevels}
      audioManagerRef={audioManagerRef}
      setEffectSelectorMenu={setEffectSelectorMenu}
      bpm={bpm}
      beatsPerMeasure={beatsPerMeasure}
      playMidiNote={playMidiNote}
      midiInstrument={midiInstrument}
      skipPianoRollScrollRef={skipPianoRollScrollRef}
      hoveredMidiClipId={hoveredMidiClipId}
      setHoveredMidiClipId={setHoveredMidiClipId}
      drawerHeight={drawerHeight}
      setDrawerHeight={setDrawerHeight}
      drawerActiveTab={drawerActiveTab}
      setDrawerActiveTab={setDrawerActiveTab}
      drawerTabOrder={drawerTabOrder}
      setDrawerTabOrder={setDrawerTabOrder}
    />

    <EffectPickerMenu
      isOpen={effectPicker.open}
      x={effectPicker.x}
      y={effectPicker.y}
      purchasedEffects={installedEffects}
      disabledPluginIds={disabledPluginIds}
      onClose={() => setEffectPicker((s) => ({ ...s, open: false }))}
      onPickEffect={(effect) => {
        const newEffect = { id: effect.id, name: effect.name, enabled: true };
        if (effectPicker.trackIndex === undefined) {
          dispatch({ type: 'ADD_MASTER_EFFECT', payload: newEffect });
        } else {
          dispatch({
            type: 'ADD_TRACK_EFFECT',
            payload: { trackIndex: effectPicker.trackIndex, effect: newEffect },
          });
        }
      }}
      onOpenMarketplace={() => {
        setMarketplaceModal({
          open: true,
          trackIndex: effectPicker.trackIndex,
          anchorRect: effectPicker.anchorRect,
        });
      }}
    />

    <MarketplaceModal
      open={marketplaceModal.open}
      anchorRect={marketplaceModal.anchorRect}
      mode={marketplaceModal.replaceIndex !== undefined ? 'replace' : 'add'}
      currentEffect={(() => {
        if (marketplaceModal.replaceIndex === undefined) return null;
        const list = marketplaceModal.trackIndex === undefined
          ? state.masterEffects
          : state.tracks[marketplaceModal.trackIndex!]?.effects ?? [];
        const e = list[marketplaceModal.replaceIndex];
        return e ? { id: e.id, name: e.name } : null;
      })()}
      destinationName={
        marketplaceModal.trackIndex === undefined
          ? 'Master track'
          : state.tracks[marketplaceModal.trackIndex!]?.name ?? 'Track'
      }
      onClose={() => setMarketplaceModal({ open: false })}
      onAddEffect={(effect: MarketplaceEffect) => {
        const newEffect = { id: effect.id, name: effect.name, enabled: true };
        const { trackIndex, replaceIndex } = marketplaceModal;
        if (replaceIndex !== undefined) {
          // Replace flow — update the existing slot in place.
          if (trackIndex === undefined) {
            dispatch({
              type: 'UPDATE_MASTER_EFFECT',
              payload: { effectIndex: replaceIndex, updates: { name: effect.name, id: effect.id } },
            });
          } else {
            dispatch({
              type: 'UPDATE_TRACK_EFFECT',
              payload: { trackIndex, effectIndex: replaceIndex, updates: { name: effect.name, id: effect.id } },
            });
          }
        } else if (trackIndex === undefined) {
          dispatch({ type: 'ADD_MASTER_EFFECT', payload: newEffect });
        } else {
          dispatch({
            type: 'ADD_TRACK_EFFECT',
            payload: { trackIndex, effect: newEffect },
          });
        }
        setMarketplaceModal({ open: false });
      }}
      purchasedIds={purchasedIds}
      uninstalledIds={uninstalledIds}
      installingIds={installingIds}
      onPurchase={async (effect) => {
        // Two-step: server-side purchase, then kick off the download phase.
        // The download progress shows in the marketplace footer; once it
        // finishes the footer surfaces a "Launch installer" button that
        // opens the actual installer wizard. If purchase rejects, the
        // download never starts.
        const purchased = {
          id: effect.id,
          name: effect.name,
          vendor: effect.vendor,
        };
        try {
          await addToLibrary(purchased);
        } catch {
          // addToLibrary surfaces its own toast on failure.
          return;
        }
        startDownload(purchased);
      }}
      onUninstallEffect={(effect) => {
        // Owned-view "Uninstall" — remove the local install so the effect
        // leaves the picker menus and the Plugin Manager dialog, but keep
        // the entitlement so the user can reinstall without paying again.
        uninstallEffect(effect.id);
      }}
      onReinstallEffect={(effect) => {
        // Reinstall mirrors the purchase flow — kick off the download in
        // the marketplace footer, the user launches the installer wizard
        // when it completes.
        startDownload({
          id: effect.id,
          name: effect.name,
          vendor: effect.vendor,
        });
      }}
      onOpenPluginManager={() => setIsPluginManagerOpen(true)}
    />
    </div>
  );
}
