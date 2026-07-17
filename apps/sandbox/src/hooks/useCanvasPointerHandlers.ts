import React from 'react';
import type { MutableRefObject } from 'react';
import type { UseAudioSelectionReturn } from '@dilsonspickles/components';
import { useTracksDispatch, type Track, type TimeSelection } from '../contexts/TracksContext';
import { calculateTrackYOffset } from '../utils/trackLayout';
import { resolveTrackIndexFromY } from '../utils/canvasGeometry';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT } from '../constants/canvas';
import type { UseSplitToolResult } from './useSplitTool';
import type { UseMarqueeSelectionReturn } from './useMarqueeSelection';
import type { CanvasProps } from '../components/Canvas';

export interface UseCanvasPointerHandlersOptions {
  /** Written on every mousedown, read by onContextMenu to distinguish a
   *  right-click from a left/middle click when the menu fires. Owned by
   *  this bundle — nothing outside these nine handlers touches it. */
  lastMouseButtonRef: MutableRefObject<number>;
  splitTool: UseSplitToolResult;
  /** Scissor-tool active flag — read directly (not via splitTool) because
   *  it's Canvas-level state from useTracksState, same as the original. */
  splitMode: boolean;
  marquee: UseMarqueeSelectionReturn;
  /** Only the onMouseMove/onMouseLeave chaining is needed here — this
   *  bundle must keep calling these or the ew-resize hover cursor from
   *  useAudioSelection strands when the pointer leaves the canvas. */
  containerProps: Pick<UseAudioSelectionReturn['containerProps'], 'onMouseMove' | 'onMouseLeave'>;
  /** isDragging / isCreating gate whether onContextMenu's own menu opens. */
  selection: Pick<UseAudioSelectionReturn['selection'], 'isDragging' | 'isCreating'>;
  handleClipMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleContainerClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimeSelectionMenuClick: CanvasProps['onTimeSelectionMenuClick'];
  onMidiClipDoubleClick: CanvasProps['onMidiClipDoubleClick'];
  tracks: Track[];
  pixelsPerSecond: number;
  leftPadding: number;
  playheadPosition: number;
  focusedTrackIndex: number | null;
  timeSelection: TimeSelection | null;
}

export interface UseCanvasPointerHandlersReturn {
  onMouseDownCapture: React.MouseEventHandler<HTMLDivElement>;
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
  onMouseMove: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave: React.MouseEventHandler<HTMLDivElement>;
  onClickCapture: React.MouseEventHandler<HTMLDivElement>;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onDoubleClick: React.MouseEventHandler<HTMLDivElement>;
  onDragStart: React.DragEventHandler<HTMLDivElement>;
}

/**
 * Bundles the nine inline mouse/drag handlers that used to live directly on
 * Canvas's event-attached container div. Moved verbatim — see the source
 * comments preserved below for the reasoning behind each ordering quirk.
 *
 * This hook attaches no document listeners (every handler here is a plain
 * React prop), so — unlike drag hooks that mirror state into refs to dodge
 * stale closures across an effect's lifetime — plain closures over the
 * options are correct: they're recreated every render, same as the inline
 * handlers they replace.
 */
export function useCanvasPointerHandlers(
  options: UseCanvasPointerHandlersOptions,
): UseCanvasPointerHandlersReturn {
  const {
    lastMouseButtonRef,
    splitTool,
    splitMode,
    marquee,
    containerProps,
    selection,
    handleClipMouseDown,
    handleContainerClick,
    onTimeSelectionMenuClick,
    onMidiClipDoubleClick,
    tracks,
    pixelsPerSecond,
    leftPadding,
    playheadPosition,
    focusedTrackIndex,
    timeSelection,
  } = options;

  const dispatch = useTracksDispatch();

  const onMouseDownCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // Right-drag marquee selection runs at capture so it beats
    // the browser's context-menu dispatch and any bubble-phase
    // handlers that would otherwise register a plain right-click.
    if (e.button === 2) {
      marquee.onMouseDownCapture(e);
      // Fall through — marquee only activates once the pointer
      // moves past the threshold; a bare right-click still
      // reaches the existing contextmenu handler below.
    }

    // Split mode runs in the capture phase so it beats clip-level
    // mousedown handlers (drag start, selection) that would otherwise
    // initiate a drag and clear our just-dispatched selection on
    // mouseup. Outside split mode, this capture handler does nothing
    // and the regular bubble-phase onMouseDown runs.
    if (splitTool.handlers.onMouseDownCapture(e)) return;
  };

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    lastMouseButtonRef.current = e.button;

    // Shift+Click on the canvas background extends the current
    // playhead into a time range selection (handled on click,
    // not mousedown, so the underlying time-selection hook
    // doesn't start a drag we then have to clean up). We still
    // preventDefault on mousedown to keep selection-text drag
    // from kicking off, and we remember to skip the click that
    // would normally reposition the playhead.
    if (
      !splitMode
      && e.button === 0
      && e.shiftKey
      && !e.metaKey
      && !e.ctrlKey
      && !e.altKey
      && !(e.target as HTMLElement).closest('[data-clip-id]')
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ti = resolveTrackIndexFromY(y, tracks);
      if (ti !== null) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // --- Split tool intercept (legacy bubble path; kept as a no-op
    //     fallback — the capture handler above takes care of it). ---
    if (splitTool.handlers.onMouseDown(e)) return;
    handleClipMouseDown(e);
  };

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    splitTool.handlers.onMouseMove(e);
    containerProps.onMouseMove?.(e);
  };

  const onMouseLeave: React.MouseEventHandler<HTMLDivElement> = (e) => {
    splitTool.handlers.onMouseLeave(e);
    // Let useAudioSelection reset the time-selection cursor so a
    // hover-triggered `ew-resize` doesn't stick when the pointer
    // leaves the canvas.
    containerProps.onMouseLeave?.(e);
  };

  const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // Split mode: swallow the click at capture so neither child
    // clip-level click handlers nor the container's blank-area
    // click handler can clear the selection that mousedown just
    // dispatched.
    splitTool.handlers.onClickCapture(e);
  };

  const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (splitMode) return;

    // Body-click clip deselection: clicking the body of any
    // clip that isn't currently selected drops the existing
    // clip selection. Clicking the body of an already-
    // selected clip (or anywhere outside a clip) doesn't
    // touch the selection here — header clicks own the
    // additive / range / toggle paths via ClipHeader's
    // onClick (which stopPropagation, so we never see them).
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const bodyClipEl = (e.target as HTMLElement).closest('[data-clip-id]') as HTMLElement | null;
      if (bodyClipEl) {
        const cid = Number(bodyClipEl.getAttribute('data-clip-id'));
        const ti = Number(bodyClipEl.getAttribute('data-track-index'));
        const t = tracks[ti];
        const clip = t?.clips.find((c) => c.id === cid)
          || (t?.midiClips || []).find((c) => c.id === cid);
        if (clip && !clip.selected) {
          dispatch({ type: 'DESELECT_ALL_CLIPS' });
        }
      }
    }

    // Shift+Click → build a time range from the existing playhead
    // to the click point, spanning the focused track to the
    // clicked track. Runs here (not on mousedown) so it sits
    // after the time-selection hook's mouseup logic and our work
    // doesn't get wiped out.
    if (
      e.shiftKey
      && !e.metaKey
      && !e.ctrlKey
      && !e.altKey
      && !(e.target as HTMLElement).closest('[data-clip-id]')
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ti = resolveTrackIndexFromY(y, tracks);
      if (ti !== null) {
        const time = Math.max(0, (x - leftPadding) / pixelsPerSecond);
        const anchorTime = playheadPosition;
        const startTime = Math.min(anchorTime, time);
        const endTime = Math.max(anchorTime, time);
        const anchorTrack = focusedTrackIndex ?? ti;
        const trackStart = Math.min(anchorTrack, ti);
        const trackEnd = Math.max(anchorTrack, ti);
        const selectedTracks: number[] = [];
        for (let i = trackStart; i <= trackEnd; i++) selectedTracks.push(i);
        dispatch({
          type: 'SET_TIME_SELECTION',
          payload: {
            startTime,
            endTime,
            // Shift+Click range select has an explicit vertical
            // extent — stamp it as the selection's scope.
            tracks: selectedTracks,
          },
        });
        dispatch({
          type: 'SET_SELECTED_TRACKS',
          payload: selectedTracks,
        });
        dispatch({ type: 'SET_FOCUSED_TRACK', payload: ti });
        return;
      }
    }

    // Cmd/Ctrl+click on a track's bare canvas toggles that track
    // in/out of the active time selection's scope.
    if (
      (e.metaKey || e.ctrlKey)
      && !e.shiftKey
      && !e.altKey
      && timeSelection
      && !(e.target as HTMLElement).closest('[data-clip-id]')
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ti = resolveTrackIndexFromY(y, tracks);
      if (ti !== null) {
        const currentScope = timeSelection.tracks ?? tracks.map((_, i) => i);
        const newScope = currentScope.includes(ti)
          ? currentScope.filter((i) => i !== ti)
          : [...currentScope, ti].sort((a, b) => a - b);
        dispatch({
          type: 'SET_TIME_SELECTION',
          payload: newScope.length > 0 ? { ...timeSelection, tracks: newScope } : null,
        });
      }
      return;
    }

    // (Single-clip lockout removed — clicking inside any clip
    // body now falls through to handleContainerClick so the
    // playhead moves, matching the multi-clip case.)
    handleContainerClick(e);
  };

  const onContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // Always prevent default browser context menu
    e.preventDefault();

    // A right-drag that just committed a marquee selection
    // shouldn't also pop the context menu.
    if (marquee.wasMarqueeing()) {
      lastMouseButtonRef.current = 0;
      return;
    }

    // Only show OUR context menu if:
    // 1. The last mouse button pressed was right-click (button 2)
    // 2. There's an existing time selection
    // 3. We're not currently dragging or creating a selection
    if (lastMouseButtonRef.current === 2 && timeSelection && !selection.isDragging && !selection.isCreating) {
      // Determine which track was right-clicked
      const containerRect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - containerRect.top;
      let clickedTrackIndex: number | undefined;
      for (let i = 0; i < tracks.length; i++) {
        const yOff = calculateTrackYOffset(i, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT);
        const tH = tracks[i].height || DEFAULT_TRACK_HEIGHT;
        if (relativeY >= yOff && relativeY < yOff + tH) {
          clickedTrackIndex = i;
          break;
        }
      }
      onTimeSelectionMenuClick?.(e.clientX, e.clientY, clickedTrackIndex);
    }

    // Reset the button ref after handling
    lastMouseButtonRef.current = 0;
  };

  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!onMidiClipDoubleClick) return;
    // Walk up from the click target to find a clip element with data-clip-id
    let el = e.target as HTMLElement | null;
    while (el && el !== e.currentTarget) {
      const clipId = el.getAttribute('data-clip-id');
      const tIdx = el.getAttribute('data-track-index');
      if (clipId && tIdx !== null) {
        const trackIdx = Number(tIdx);
        const track = tracks[trackIdx];
        if (track?.type === 'midi' && track.midiClips) {
          const clipIndex = track.midiClips.findIndex((mc) => String(mc.id) === clipId);
          if (clipIndex >= 0) {
            onMidiClipDoubleClick(trackIdx, clipIndex);
          }
        }
        return;
      }
      el = el.parentElement;
    }
  };

  const onDragStart: React.DragEventHandler<HTMLDivElement> = (e) => e.preventDefault();

  return {
    onMouseDownCapture,
    onMouseDown,
    onMouseMove,
    onMouseLeave,
    onClickCapture,
    onClick,
    onContextMenu,
    onDoubleClick,
    onDragStart,
  };
}
