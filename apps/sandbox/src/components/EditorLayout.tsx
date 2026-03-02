import React from 'react';
import { flushSync } from 'react-dom';
import { Canvas } from './Canvas';
import { TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, VerticalRulerPanel, EffectsPanel, CustomScrollbar, TrackType, ThemeProvider, toast } from '@audacity-ui/components';
import type { SpectrogramScale } from '@audacity-ui/components';
import type { EnvelopePointStyleKey } from '@audacity-ui/core';
import type { EffectsPanelState, EffectDialogState, EffectSelectorMenuState, ClipContextMenuState, TrackContextMenuState, TimelineRulerContextMenuState, TimeSelectionContextMenuState } from '../hooks/useContextMenuState';
import { selectTrackExclusive, toggleTrackSelection } from '../utils/trackSelection';

export interface EditorLayoutProps {
  // State
  state: any;
  dispatch: React.Dispatch<any>;

  // Active menu
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';

  // Effects panel
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  setEffectDialog: React.Dispatch<React.SetStateAction<EffectDialogState | null>>;
  setEffectSelectorMenu: React.Dispatch<React.SetStateAction<EffectSelectorMenuState | null>>;

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
  showVerticalRulers: boolean;
  setIsSpectrogramSettingsOpen: (open: boolean) => void;

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

  // Context menu triggers
  setClipContextMenu: React.Dispatch<React.SetStateAction<ClipContextMenuState | null>>;
  setTimeSelectionContextMenu: React.Dispatch<React.SetStateAction<TimeSelectionContextMenuState | null>>;
  setTrackContextMenu: React.Dispatch<React.SetStateAction<TrackContextMenuState | null>>;
  setTimelineRulerContextMenu: React.Dispatch<React.SetStateAction<TimelineRulerContextMenuState | null>>;
  contextMenuClosedTimeRef: React.MutableRefObject<number>;

  // Refs
  audioManagerRef: React.RefObject<any>;

  // Ruler time selection
  rulerTimeSelection: { startTime: number; endTime: number } | null | undefined;
  spectralSelection: any;

  // Theme
  theme: any;
  baseTheme: any;

  // Canvas height
  canvasHeight: number;
  setCanvasHeight: React.Dispatch<React.SetStateAction<number>>;

  // Click ruler to start playback
  clickRulerToStartPlayback: boolean;

  // Flat navigation mode
  isFlatNavigation: boolean;
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
    effectsPanel, setEffectsPanel, setEffectDialog, setEffectSelectorMenu,
    scrollX, scrollY, onScroll, onTrackHeaderScroll,
    scrollContainerRef, trackHeaderScrollRef,
    pixelsPerSecond, timelineWidth, timelineDuration, timelineFormat, bpm, beatsPerMeasure,
    showRmsInWaveform, controlPointStyle, spectrogramScale, showVerticalRulers, setIsSpectrogramSettingsOpen,
    isPlaying, setIsPlaying, trackMeterLevels, isMicMonitoring, recordingClipId,
    selectionAnchor, setSelectionAnchor, controlPanelHasFocus: _controlPanelHasFocus, setControlPanelHasFocus,
    containerFocusedTrack, setContainerFocusedTrack,
    mouseCursorPosition, setMouseCursorPosition, mouseCursorY, setMouseCursorY, isOverTrack, setIsOverTrack,
    loopRegionEnabled, setLoopRegionEnabled, loopRegionStart, setLoopRegionStart, loopRegionEnd, setLoopRegionEnd,
    loopRegionInteracting, setLoopRegionInteracting, loopRegionHovering, setLoopRegionHovering,
    setClipContextMenu, setTimeSelectionContextMenu, setTrackContextMenu, setTimelineRulerContextMenu,
    contextMenuClosedTimeRef,
    audioManagerRef, rulerTimeSelection, spectralSelection,
    theme, baseTheme, canvasHeight, setCanvasHeight,
    clickRulerToStartPlayback, isFlatNavigation: _isFlatNavigation,
  } = props;

  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const timelineRulerRef = React.useRef<HTMLDivElement>(null);

  // Buffer zone below tracks so user can scroll content further up the screen
  const viewportH = scrollContainerRef.current?.clientHeight || 0;
  const scrollBuffer = viewportH > 0 && canvasHeight > viewportH ? Math.round(viewportH * 0.4) : 0;

  return (
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
                });
              },
              onEffectsReorder: (fromIndex, toIndex) => {
                dispatch({
                  type: 'REORDER_TRACK_EFFECTS',
                  payload: { trackIndex, fromIndex, toIndex }
                });
              },
              onAddEffect: (e) => {
                const button = e.currentTarget;
                const rect = button.getBoundingClientRect();
                setEffectSelectorMenu({
                  isOpen: true,
                  x: rect.left,
                  y: rect.bottom + 4,
                  trackIndex,
                });
              },
              onContextMenu: (_e) => {
                toast.info('Track effects context menu');
              },
              onRemoveEffect: (index) => {
                dispatch({ type: 'REMOVE_TRACK_EFFECT', payload: { trackIndex, effectIndex: index } });
                toast.success('Effect removed');
              },
              onReplaceEffect: (index, effectName) => {
                dispatch({
                  type: 'UPDATE_TRACK_EFFECT',
                  payload: { trackIndex, effectIndex: index, updates: { name: effectName } }
                });
                toast.success(`Effect changed to ${effectName}`);
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
                });
              },
              onEffectsReorder: (fromIndex, toIndex) => {
                dispatch({
                  type: 'REORDER_MASTER_EFFECTS',
                  payload: { fromIndex, toIndex }
                });
              },
              onAddEffect: (e) => {
                const button = e.currentTarget;
                const rect = button.getBoundingClientRect();
                setEffectSelectorMenu({
                  isOpen: true,
                  x: rect.left,
                  y: rect.bottom + 4,
                  trackIndex: undefined,
                });
              },
              onContextMenu: (_e) => {
                toast.info('Master effects context menu');
              },
              onRemoveEffect: (index) => {
                dispatch({ type: 'REMOVE_MASTER_EFFECT', payload: index });
                toast.success('Master effect removed');
              },
              onReplaceEffect: (index, effectName) => {
                dispatch({
                  type: 'UPDATE_MASTER_EFFECT',
                  payload: { effectIndex: index, updates: { name: effectName } }
                });
                toast.success(`Effect changed to ${effectName}`);
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
          }}
          onAddTrackType={(type: TrackType) => {
            let trackName = `Track ${state.tracks.length + 1}`;
            if (type === 'label') {
              trackName = `Label ${state.tracks.length + 1}`;
            } else if (type === 'stereo') {
              trackName = `Stereo ${state.tracks.length + 1}`;
            } else if (type === 'mono') {
              trackName = `Mono ${state.tracks.length + 1}`;
            }

            const newTrack = {
              id: state.tracks.length + 1,
              name: trackName,
              type: (type === 'label' ? 'label' : 'audio') as 'audio' | 'label',
              height: type === 'label' ? 76 : 114,
              ...(type === 'stereo' ? { channelSplitRatio: 0.5 } : {}),
              clips: [],
            };
            dispatch({ type: 'ADD_TRACK', payload: newTrack });
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} track added`);
          }}
          showMidiOption={false}
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
            let trackType: 'mono' | 'stereo' | 'label' = 'mono';
            if (track.name.toLowerCase().includes('label')) {
              trackType = 'label';
            } else if (track.name.toLowerCase().includes('stereo')) {
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
                  toast.success('Label added at playhead');
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
                    }
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
                const clickedTime = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;

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
              {/* Playhead icon only in ruler */}
              <PlayheadCursor
                position={state.playheadPosition}
                pixelsPerSecond={pixelsPerSecond}
                height={0}
                showTopIcon={true}
                iconTopOffset={24}
                scrollX={scrollX}
                onPositionChange={(newPosition) => {
                  dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
                  const audioManager = audioManagerRef.current;
                  if (audioManager.getIsPaused()) {
                    audioManager.seek(newPosition);
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
              backgroundColor: baseTheme.background.surface.elevated,
              borderLeft: `1px solid ${baseTheme.border.default}`,
              borderBottom: `1px solid ${baseTheme.border.default}`,
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
                    onTimeSelectionMenuClick={(x, y) => {
                      const timeSinceClosed = Date.now() - contextMenuClosedTimeRef.current;
                      if (timeSinceClosed > 300) {
                        setTimeSelectionContextMenu({ isOpen: true, x, y });
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
                      if (modifiers.metaKey || modifiers.ctrlKey) {
                        toggleTrackSelection(trackIndex, state.selectedTrackIndices, dispatch);
                      } else {
                        selectTrackExclusive(trackIndex, dispatch);
                      }
                    }}
                    onShiftTabFromTrack={(trackIndex) => {
                      const prevIndex = trackIndex - 1;
                      if (prevIndex < 0) {
                        // First track — focus the "Add new" button
                        const addButton = document.querySelector('.track-control-side-panel__header button') as HTMLElement;
                        addButton?.focus();
                        return;
                      }
                      // Try previous track's last clip first
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
              }))}
              width={64}
              headerHeight={0}
              scrollY={scrollY}
              cursorY={isOverTrack ? mouseCursorY : undefined}
              spectrogramScale={spectrogramScale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
