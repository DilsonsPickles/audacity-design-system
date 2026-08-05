import { useTracksDispatch, type Track, type TimeSelection } from '../contexts/TracksContext';
import { pendingClipMoveResolution } from '../utils/pendingClipMoveResolution';
import { provisionalKeyboardTrackIds } from '../utils/provisionalKeyboardTrackIds';
import { resolveTimeSelectionScope } from '../utils/timeSelectionScope';

export interface UseTrackKeyboardHandlersOptions {
  tracks: Track[];
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  timeSelection: TimeSelection | null;
  selectionAnchor: number | null;
  setSelectionAnchor?: (anchor: number | null) => void;
  trackSelectionMode: 'classic' | 'follows-focus';
  /** Callback when the track container itself gains/loses keyboard focus (Canvas prop, forwarded through). */
  onTrackContainerFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  /** Records a pending keyboard clip-move; overlap resolution fires on Cmd/Ctrl release (from useCmdArrowMove). */
  beginCmdMove: () => void;
  /** Factory that builds a new track template when Cmd+Down overflows the
   *  last track. Same signature as useClipDragging's buildTrackForDrop. */
  buildTrackForDrop?: (indexAmongNew: number, sourceTrackIndex: number) => Track;
}

export interface UseTrackKeyboardHandlersReturn {
  onTrackNavigateVertical: (
    trackIndex: number,
    direction: 1 | -1,
    shiftKey?: boolean,
    decouple?: boolean,
  ) => void;
  onTrackReorder: (
    trackIndex: number,
    direction: 1 | -1,
    wasContainerFocused: boolean,
  ) => void;
}

/**
 * Track-level keyboard navigation and reorder handlers, factored out of
 * Canvas's per-track render loop. Each TrackNew instance wires its
 * `onTrackNavigateVertical` / `onTrackReorder` props to a thin arrow that
 * supplies its own `trackIndex`:
 *
 *   onTrackNavigateVertical={(direction, shiftKey, decouple) =>
 *     onTrackNavigateVertical(trackIndex, direction, shiftKey, decouple)}
 *
 * so the closures here read purely from the options object rather than
 * from JSX-loop scope.
 */
export function useTrackKeyboardHandlers(
  options: UseTrackKeyboardHandlersOptions,
): UseTrackKeyboardHandlersReturn {
  const {
    tracks,
    selectedTrackIndices,
    focusedTrackIndex,
    timeSelection,
    selectionAnchor,
    setSelectionAnchor,
    trackSelectionMode,
    onTrackContainerFocusChange,
    beginCmdMove,
    buildTrackForDrop,
  } = options;
  const dispatch = useTracksDispatch();

  const onTrackNavigateVertical = (
    trackIndex: number,
    direction: 1 | -1,
    shiftKey?: boolean,
    decouple?: boolean,
  ) => {
    const targetIndex = trackIndex + direction;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: targetIndex });

    if (shiftKey) {
      // Shift+Arrow: extend/contract a track selection.
      // Model 3: if the focused track is NOT part of the
      // current selection, treat this as the start of a
      // fresh range — anchor on the focused track,
      // ignore the stale selection. Otherwise keep
      // extending from the existing anchor.
      const focusInSelection = selectedTrackIndices.includes(trackIndex);
      const anchor = focusInSelection
        ? (selectionAnchor ?? trackIndex)
        : trackIndex;
      if (!focusInSelection || selectionAnchor === null) {
        setSelectionAnchor?.(trackIndex);
      }
      const start = Math.min(anchor, targetIndex);
      const end = Math.max(anchor, targetIndex);
      const newSelection: number[] = [];
      for (let i = start; i <= end; i++) newSelection.push(i);
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
    } else if (trackSelectionMode === 'follows-focus' && !decouple) {
      // Plain arrow in follows-focus mode: selection moves
      // with focus. Cmd held = "decouple": focus moves
      // alone so the user can peek around without
      // disturbing the current selection.
      dispatch({ type: 'SELECT_TRACK', payload: targetIndex });
      setSelectionAnchor?.(targetIndex);
    }

    setTimeout(() => {
      const target = document.querySelector(
        `.track-wrapper[data-track-index="${targetIndex}"] .track`
      ) as HTMLElement | null;
      if (target) {
        // Mark this focus as arrow-navigated so the receiving
        // TrackNew shows the blue outline (mouse-style) rather
        // than the black/white "container-focused" Tab-style.
        target.setAttribute('data-focus-from-nav', '1');
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  };

  const onTrackReorder = (
    trackIndex: number,
    direction: 1 | -1,
    wasContainerFocused: boolean,
  ) => {
    // Focus disambiguates the gesture:
    //   • Focus on the track CONTAINER (Tab-nav lands
    //     the wrapper) → user is pointing at the track,
    //     Cmd+Arrow reorders the track even if a clip
    //     inside it is still selected.
    //   • Focus on a CLIP (arrow-nav / Tab-into-clip) →
    //     Cmd+Arrow moves the clip, per the usual
    //     clip-move / time-selection promotion paths.
    // Container-focused users can Tab back into the
    // clip if they want the clip-level gesture.
    if (wasContainerFocused) {
      // Skip the clip-move / time-selection promotion
      // branches — fall straight through to track
      // reorder below.
    }

    const focusedTrack = tracks[trackIndex];
    const focusedHasSelectedClip = !wasContainerFocused && (
      focusedTrack?.clips.some((c) => c.selected)
      || focusedTrack?.midiClips?.some((c) => c.selected)
      || false
    );

    // If a time selection covers a clip on the focused
    // track (mirrors the horizontal Cmd+Arrow path),
    // promote overlapping clips on the scoped tracks
    // to selected + clear the time selection, then
    // continue into the clip-move branch.
    let promotedFromTimeSelection = false;
    if (!wasContainerFocused && !focusedHasSelectedClip && timeSelection) {
      const { startTime, endTime } = timeSelection;
      const EPS = 0.0001;
      const focusedOverlaps = (focusedTrack?.clips || []).some((c) =>
        c.start < endTime - EPS && c.start + c.duration > startTime + EPS,
      );
      if (focusedOverlaps) {
        const scopedTrackIndices = resolveTimeSelectionScope(
          timeSelection,
          selectedTrackIndices,
          [trackIndex],
        );
        const overlapping: Array<{ trackIndex: number; clipId: number }> = [];
        for (const ti of scopedTrackIndices) {
          const t = tracks[ti];
          if (!t) continue;
          for (const c of t.clips) {
            if (c.start < endTime - EPS && c.start + c.duration > startTime + EPS) {
              overlapping.push({ trackIndex: ti, clipId: c.id });
            }
          }
        }
        if (overlapping.length > 0) {
          dispatch({
            type: 'SELECT_CLIPS',
            payload: overlapping,
          });
          dispatch({ type: 'SET_TIME_SELECTION', payload: null });
          promotedFromTimeSelection = true;
        }
      }
    }

    if (focusedHasSelectedClip || promotedFromTimeSelection) {
      const maxSelectedTrackIndex = tracks.reduce((max, t, ti) => {
        const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
        return hasSelected ? Math.max(max, ti) : max;
      }, -1);
      const wouldOverflow = direction === 1 && maxSelectedTrackIndex + 1 >= tracks.length;

      // Identify provisional tracks to clean up using the pre-move snapshot
      // (all their clips are selected and about to leave). Delete them AFTER
      // the move so the reducer sees empty tracks, not tracks with clips.
      const toCleanUp: number[] = [];
      for (const trackId of provisionalKeyboardTrackIds.current) {
        const pt = tracks.find(t => t.id === trackId);
        if (!pt) { provisionalKeyboardTrackIds.current.delete(trackId); continue; }
        const hasUnselected = pt.clips.some(c => !c.selected) || (pt.midiClips || []).some(c => !c.selected);
        if (!hasUnselected) {
          toCleanUp.push(trackId);
          provisionalKeyboardTrackIds.current.delete(trackId);
        }
      }

      if (wouldOverflow && buildTrackForDrop) {
        const anchorTrackIndex = focusedTrackIndex ?? trackIndex;
        const template = buildTrackForDrop(0, anchorTrackIndex);
        dispatch({
          type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
          payload: { newTrack: template },
        });
        provisionalKeyboardTrackIds.current.add(template.id);
        for (const trackId of toCleanUp) {
          dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
        }
        dispatch({ type: 'SET_FOCUSED_TRACK', payload: tracks.length });
      } else {
        dispatch({
          type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
          payload: { direction: direction as 1 | -1 },
        });
        for (const trackId of toCleanUp) {
          dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
        }
        // Follow the moved clips with the focused-track
        // indicator so the UI stays aligned with where
        // the user just moved themselves. Anchor on the
        // CURRENT focused track from state (not the
        // trackIndex closure) so consecutive Cmd+Arrow
        // presses accumulate correctly — otherwise DOM
        // focus stays parked on the original track and
        // the state pointer keeps snapping back next to
        // it instead of trailing the clips downward.
        const anchor = focusedTrackIndex ?? trackIndex;
        const newTrackIndex = anchor + direction;
        if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
        }
      }

      // Follow-up: move DOM focus to the new track container
      const followIndex = wouldOverflow && buildTrackForDrop ? tracks.length : (focusedTrackIndex ?? trackIndex) + direction;
      if (followIndex >= 0 && (wouldOverflow || followIndex < tracks.length)) {
        // Also move DOM focus to the new track so the
        // next Cmd+Arrow press fires from the right
        // TrackNew instance.
        setTimeout(() => {
          const target = document.querySelector<HTMLElement>(
            `.track-wrapper[data-track-index="${followIndex}"] .track`,
          );
          if (target && document.activeElement !== target) {
            target.focus({ preventScroll: true });
          }
        }, 0);
      }
      // Defer overlap resolution until Cmd/Ctrl release
      // — matches the horizontal clip-nudge flow.
      pendingClipMoveResolution.current = true;
      beginCmdMove();
      return;
    }

    // If the focused track is part of a multi-track
    // selection, move every selected track in lockstep
    // — the user expects the group to travel together.
    // Otherwise just shift the focused track.
    const focusedInSelection = selectedTrackIndices.includes(trackIndex);
    const tracksToMove = focusedInSelection && selectedTrackIndices.length > 1
      ? [...selectedTrackIndices].sort((a, b) => a - b)
      : [trackIndex];

    // Bounds check the whole group — if any member would
    // fall off the top / bottom, abort the entire reorder
    // so relative spacing is preserved.
    const minIdx = tracksToMove[0];
    const maxIdx = tracksToMove[tracksToMove.length - 1];
    if (minIdx + direction < 0 || maxIdx + direction >= tracks.length) return;

    const targetIndex = trackIndex + direction;
    // Only carry the container-focused indicator over to
    // the target position when it was actually set — i.e.
    // the user had Tab-focused the track. Otherwise the
    // pre-emptive update would flip the side panel into
    // the keyboard (black/white) mode for a track that
    // was in mouse (blue) mode, mismatching the wrapper.
    if (wasContainerFocused) {
      onTrackContainerFocusChange?.(targetIndex, true);
    }

    // Dispatch MOVE_TRACK per selected track. Order matters:
    // when moving UP, process ascending so each slot is
    // freed before the next member shifts into it; when
    // moving DOWN, process descending for the same reason.
    const order = direction === -1
      ? tracksToMove
      : [...tracksToMove].reverse();
    for (const from of order) {
      dispatch({
        type: 'MOVE_TRACK',
        payload: { fromIndex: from, toIndex: from + direction },
      });
    }

    // Each MOVE_TRACK sets focusedTrackIndex to its own
    // toIndex, so after the batch the focused-track
    // pointer is on whichever member was moved last
    // rather than on the originally focused track. Re-
    // pin it explicitly to the focused track's new row.
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: targetIndex });

    // Sync track selection with the reorder:
    //  - Focus was inside a multi-track selection →
    //    remap each index by +direction so the same
    //    group stays selected at their new rows.
    //  - Focus was outside → collapse track selection
    //    to the moved row.
    // Clip selection is intentionally left alone in
    // both cases: clips move with their track, and the
    // clip / track selection axes are decoupled — the
    // user can Tab back into a still-selected clip.
    if (focusedInSelection && selectedTrackIndices.length > 1) {
      dispatch({
        type: 'SET_SELECTED_TRACKS',
        payload: tracksToMove.map((i) => i + direction),
      });
    } else {
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [targetIndex] });
      setSelectionAnchor?.(targetIndex);
    }

    setTimeout(() => {
      const target = document.querySelector(
        `.track-wrapper[data-track-index="${targetIndex}"] .track`
      ) as HTMLElement;
      target?.focus();
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  };

  return { onTrackNavigateVertical, onTrackReorder };
}
