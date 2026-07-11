import React from 'react';
import { flushSync } from 'react-dom';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { useTracksDispatch, type Track, type TimeSelection } from '../contexts/TracksContext';
import { selectTrackExclusive, toggleTrackSelection } from '../utils/trackSelection';
import type { EffectsPanelState, TrackContextMenuState } from '../hooks/useContextMenuState';
import {
  findTrackControlPanelByIndex,
  findFirstClipInTrack,
  findTrackRulerByIndex,
  findTrackContainerByIndex,
  findSelectionToolbarFirstGroup,
  resolveTrackDropIndex,
} from '../utils/focusRouting';

export interface UseTrackPanelHandlersOptions {
  tracks: Track[];
  selectedTrackIndices: number[];
  timeSelection: TimeSelection | null;
  playheadPosition: number;
  showVerticalRulers: boolean;
  trackSelectionMode: 'classic' | 'follows-focus';
  selectionAnchor: number | null;
  setSelectionAnchor: (anchor: number | null) => void;
  setControlPanelHasFocus: (index: number | null) => void;
  /** Service ref (no state) — mute/solo exclusive paths push gain/mute directly to audio playback. */
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  /** Shared with AppContextMenus so it can restore focus to the button that opened the track menu. */
  trackMenuTriggerRef?: React.MutableRefObject<HTMLElement | null>;
  setTrackContextMenu: React.Dispatch<React.SetStateAction<TrackContextMenuState | null>>;
}

export interface UseTrackPanelHandlersReturn {
  /**
   * Cmd+Click / Cmd+Enter on a track panel row. With a scoped time
   * selection active, the gesture edits the SELECTION SCOPE — which rows
   * the time selection covers — and leaves the track selection alone (the
   * two axes are independent). Without one, it falls back to the classic
   * track-selection toggle. Single copy — consumed by both the
   * TrackControlPanel `onToggleSelection` wiring and Canvas's
   * `onContainerEnter` Cmd/Ctrl+Enter branch.
   */
  toggleScopeOrTrackSelection: (index: number) => void;
  onMuteToggle: (e: React.MouseEvent<HTMLButtonElement>, index: number, track: Track) => void;
  onSoloToggle: (e: React.MouseEvent<HTMLButtonElement>, index: number, track: Track) => void;
  onEffectsClick: (index: number) => void;
  onFocusChange: (hasFocus: boolean, index: number) => void;
  onDragReorderDrop: (clientY: number, index: number) => void;
  onReorderVertical: (direction: 'up' | 'down', index: number) => void;
  onNavigateVertical: (direction: 'up' | 'down', shiftKey: boolean | undefined, index: number) => void;
  onAddLabelClick: (index: number) => void;
  onMenuClick: (e: React.MouseEvent<HTMLButtonElement>, index: number) => void;
  onClick: (index: number) => void;
  onRangeSelection: (index: number) => void;
  onTabOut: (index: number) => void;
  onShiftTabOut: (index: number) => void;
}

/**
 * Per-track control-panel handlers, factored out of EditorLayout's
 * `state.tracks.map(...)` render loop (block C). Each TrackControlPanel
 * instance wires its props to a thin arrow that supplies its own
 * `index`/`track` from the map closure:
 *
 *   onMuteToggle={(e) => onMuteToggle(e, index, track)}
 *
 * so the closures here read purely from the options object rather than
 * from JSX-loop scope — same pattern as useTrackKeyboardHandlers.
 */
export function useTrackPanelHandlers(
  options: UseTrackPanelHandlersOptions,
): UseTrackPanelHandlersReturn {
  const {
    tracks,
    selectedTrackIndices,
    timeSelection,
    playheadPosition,
    showVerticalRulers,
    trackSelectionMode,
    selectionAnchor,
    setSelectionAnchor,
    setControlPanelHasFocus,
    audioManagerRef,
    effectsPanel,
    setEffectsPanel,
    trackMenuTriggerRef,
    setTrackContextMenu,
  } = options;
  const dispatch = useTracksDispatch();

  const toggleScopeOrTrackSelection = (index: number) => {
    toggleTrackSelection(index, selectedTrackIndices, dispatch);
    // If there's an active time selection, keep its scope in sync with
    // the new track selection so the selection visual appears on the
    // newly added (or disappears from the removed) track.
    const ts = timeSelection;
    if (ts) {
      const currentScope = ts.tracks ?? selectedTrackIndices;
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

  const onMuteToggle = (e: React.MouseEvent<HTMLButtonElement>, index: number, track: Track) => {
    // Cmd/Ctrl+click: exclusive mute — mute this track
    // (unconditionally), clear every other track's mute.
    if (e.metaKey || e.ctrlKey) {
      dispatch({ type: 'SET_TRACK_MUTED_EXCLUSIVE', payload: index });
      tracks.forEach((t, i) => {
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
  };

  const onSoloToggle = (e: React.MouseEvent<HTMLButtonElement>, index: number, track: Track) => {
    // Cmd/Ctrl+click: exclusive solo — solo this track
    // (unconditionally), clear every other track's solo.
    if (e.metaKey || e.ctrlKey) {
      dispatch({ type: 'SET_TRACK_SOLOED_EXCLUSIVE', payload: index });
      return;
    }
    // Plain click: toggle this track's solo — adds/removes
    // it from the solo pool without touching other tracks.
    dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { soloed: !(track.soloed ?? false) } } });
  };

  const onEffectsClick = (index: number) => {
    const isCurrentlyOpen = effectsPanel?.isOpen && effectsPanel.trackIndex === index;
    setEffectsPanel(isCurrentlyOpen ? null : {
      isOpen: true,
      trackIndex: index,
      left: 0,
      top: 0,
      height: 0,
      width: 0,
    });
  };

  const onFocusChange = (hasFocus: boolean, index: number) => {
    setControlPanelHasFocus(hasFocus ? index : null);
    if (hasFocus) {
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: index });
    }
  };

  const onDragReorderDrop = (clientY: number, index: number) => {
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
  };

  const onReorderVertical = (direction: 'up' | 'down', index: number) => {
    // Cmd+Arrow on the track panel header: reorder
    // this track's row within the track list, using
    // the same MOVE_TRACK path the canvas .track
    // container uses. Aborts silently at the edges.
    const dir = direction === 'up' ? -1 : 1;
    const target = index + dir;
    if (target < 0 || target >= tracks.length) return;
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
  };

  const onNavigateVertical = (direction: 'up' | 'down', shiftKey: boolean | undefined, index: number) => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex >= 0 && nextIndex < tracks.length) {
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
  };

  const onAddLabelClick = (index: number) => {
    const allLabels = tracks.flatMap((t) => t.labels || []);
    const nextLabelId = allLabels.length > 0
      ? Math.max(...allLabels.map((l) => l.id)) + 1
      : 1;

    const newLabel = {
      id: nextLabelId,
      trackIndex: index,
      text: '',
      startTime: timeSelection?.startTime ?? playheadPosition,
      endTime: timeSelection?.endTime ?? playheadPosition,
    };

    dispatch({
      type: 'ADD_LABEL',
      payload: { trackIndex: index, label: newLabel }
    });
  };

  const onMenuClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
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
  };

  const onClick = (index: number) => {
    selectTrackExclusive(index, dispatch);
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: index });
    dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    // Anchor the just-clicked track so a subsequent
    // Shift+Enter from another track extends the range
    // from HERE — the user's most recent explicit
    // selection, not the app-init default of [0].
    setSelectionAnchor(index);
  };

  const onRangeSelection = (index: number) => {
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
  };

  const onTabOut = (index: number) => {
    const firstClip = findFirstClipInTrack(document, index);
    if (firstClip) {
      firstClip.focus();
      return;
    }
    // No clips — skip to ruler or next track
    if (showVerticalRulers && tracks[index]?.type !== 'label' && tracks[index]?.type !== 'midi') {
      const rulerEl = findTrackRulerByIndex(document, index);
      if (rulerEl) {
        rulerEl.focus();
        return;
      }
    }
    const nextIndex = index + 1;
    if (nextIndex < tracks.length) {
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
      if (trackSelectionMode === 'follows-focus') {
        dispatch({ type: 'SELECT_TRACK', payload: nextIndex });
        setSelectionAnchor(nextIndex);
      }
      findTrackContainerByIndex(document, nextIndex)?.focus();
    } else {
      findSelectionToolbarFirstGroup(document)?.focus();
    }
  };

  const onShiftTabOut = (index: number) => {
    findTrackContainerByIndex(document, index)?.focus();
  };

  return {
    toggleScopeOrTrackSelection,
    onMuteToggle,
    onSoloToggle,
    onEffectsClick,
    onFocusChange,
    onDragReorderDrop,
    onReorderVertical,
    onNavigateVertical,
    onAddLabelClick,
    onMenuClick,
    onClick,
    onRangeSelection,
    onTabOut,
    onShiftTabOut,
  };
}
