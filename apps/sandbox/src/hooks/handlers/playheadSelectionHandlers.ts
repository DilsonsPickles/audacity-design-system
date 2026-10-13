import type { TracksState, TracksAction } from '../../contexts/TracksContext';
import { nextClipEdge, prevClipEdge } from '../../utils/clipEdges';

export interface PlayheadSelectionHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  selectionAnchorRef: React.MutableRefObject<number | null>;
  selectionEdgesRef: React.MutableRefObject<{ startTime: number; endTime: number } | null>;
  scrollPlayheadIntoView: () => void;
}

/**
 * Shared handler for playhead movement and time selection manipulation.
 * Used by both ArrowLeft/Right (moveAmount=0.1) and Comma/Period (moveAmount=1.0).
 */
export function handlePlayheadMove(
  e: KeyboardEvent,
  isLeftward: boolean,
  moveAmount: number,
  deps: PlayheadSelectionHandlerDeps,
): void {
  const { state, dispatch, selectionAnchorRef, selectionEdgesRef, scrollPlayheadIntoView } = deps;

  if (e.shiftKey) {
    // SHIFT: adjust selection edges. Cmd/Ctrl toggles reduce mode
    //   Shift+ArrowLeft/Right          → extend the near / far edge outward
    //   Cmd+Shift+ArrowLeft/Right      → shrink from that edge inward
    // Alt is the speed modifier (1s vs 0.1s) — already applied via
    // the caller's moveAmount.
    const reduce = e.metaKey || e.ctrlKey;

    // In reduce mode with no existing selection there's nothing to
    // shrink — bail so we don't spuriously initialise one.
    if (reduce && !state.timeSelection) return;

    const playheadOutsideSelection = state.timeSelection && (
      state.playheadPosition < state.timeSelection.startTime - 0.001 ||
      state.playheadPosition > state.timeSelection.endTime + 0.001
    );

    if (!state.timeSelection || playheadOutsideSelection) {
      dispatch({ type: 'DESELECT_ALL_CLIPS' });
      selectionEdgesRef.current = { startTime: state.playheadPosition, endTime: state.playheadPosition };
    }

    if (!selectionEdgesRef.current) {
      selectionEdgesRef.current = {
        startTime: state.timeSelection!.startTime,
        endTime: state.timeSelection!.endTime,
      };
    }

    if (isLeftward) {
      if (reduce) {
        // Shrink from the LEFT: move startTime rightward, clamp to
        // endTime so the edges can't cross.
        selectionEdgesRef.current.startTime = Math.min(
          selectionEdgesRef.current.endTime,
          selectionEdgesRef.current.startTime + moveAmount,
        );
      } else {
        selectionEdgesRef.current.startTime = Math.max(0, selectionEdgesRef.current.startTime - moveAmount);
      }
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
    } else {
      if (reduce) {
        // Shrink from the RIGHT: move endTime leftward, clamp to
        // startTime.
        selectionEdgesRef.current.endTime = Math.max(
          selectionEdgesRef.current.startTime,
          selectionEdgesRef.current.endTime - moveAmount,
        );
      } else {
        selectionEdgesRef.current.endTime = selectionEdgesRef.current.endTime + moveAmount;
      }
    }

    dispatch({
      type: 'SET_TIME_SELECTION',
      payload: {
        startTime: selectionEdgesRef.current.startTime,
        endTime: selectionEdgesRef.current.endTime,
        // Preserve an existing scope. A FRESH keyboard range inherits
        // the selection the user already built (Shift+Arrow extends —
        // it must never shrink the footprint the mirror will write
        // back), falling back to the focused track when nothing is
        // selected. No scope when neither exists — consumers fall
        // back to all tracks.
        tracks: state.timeSelection?.tracks
          ?? (state.selectedTrackIndices.length > 0
            ? state.selectedTrackIndices
            : state.focusedTrackIndex != null ? [state.focusedTrackIndex] : undefined),
      },
    });
    scrollPlayheadIntoView();
  } else {
    // Plain: move playhead
    selectionAnchorRef.current = null;
    selectionEdgesRef.current = null;
    const delta = isLeftward ? -moveAmount : moveAmount;
    const newPosition = Math.max(0, state.playheadPosition + delta);
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
    scrollPlayheadIntoView();
  }
}

/** Escape: clear time selection */
export function handleEscape(deps: PlayheadSelectionHandlerDeps): void {
  const { dispatch, selectionAnchorRef, selectionEdgesRef } = deps;
  dispatch({ type: 'SET_TIME_SELECTION', payload: null });
  selectionAnchorRef.current = null;
  selectionEdgesRef.current = null;
}

/** Ctrl+K: delete selected time range */
export function handleDeleteTimeRange(deps: PlayheadSelectionHandlerDeps): void {
  const { state, dispatch, selectionAnchorRef, selectionEdgesRef } = deps;

  if (state.timeSelection) {
    const { startTime, endTime } = state.timeSelection;

    dispatch({ type: 'DELETE_TIME_RANGE', payload: { startTime, endTime } });
    dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    selectionAnchorRef.current = null;
    selectionEdgesRef.current = null;
  }
}

/**
 * THE BRACKET KEYS WALK THE CLIP EDGES (user decision 2026-10-13, "use
 * [ and ] to jump between clip edges and shift + [ / ] to select in
 * between"): [ parks the playhead on the previous clip edge, ] on the
 * next — any clip's start or end on the FOCUSED track ("maybe [ and ]
 * should step based on the focused track", the same day; every track
 * when none is focused), utils/clipEdges.ts. SHIFT grows the time
 * selection edge by edge: ⇧] takes the selection's END to the next
 * edge after it, ⇧[ its START to the previous edge before it, from the
 * playhead when there is no selection (or the playhead is outside it),
 * and again on every press; the range's track scope is the selection
 * extend's (the existing scope, then the selected tracks, then the
 * focused track). Nothing beyond the last edge: the key does nothing.
 * (Bare [ ] were Audacity 3's selection-boundary setters until
 * 2026-10-12; J / K did this jump for the focused track alone until
 * the same day the brackets took it — J and K are unbound for now.)
 */
export function handleBracketEdge(
  e: KeyboardEvent,
  isLeftward: boolean,
  deps: PlayheadSelectionHandlerDeps,
): void {
  const { state, dispatch, selectionAnchorRef, selectionEdgesRef, scrollPlayheadIntoView } = deps;
  // The focused track's edges; every track's when none is focused
  const fti = state.focusedTrackIndex;
  const scope = fti != null && state.tracks[fti] ? [state.tracks[fti]] : state.tracks;
  if (!e.shiftKey) {
    const target = isLeftward ? prevClipEdge(scope, state.playheadPosition) : nextClipEdge(scope, state.playheadPosition);
    if (target === null) return;
    selectionAnchorRef.current = null;
    selectionEdgesRef.current = null;
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: target });
    scrollPlayheadIntoView();
    return;
  }
  const playheadOutsideSelection = state.timeSelection && (
    state.playheadPosition < state.timeSelection.startTime - 0.001 ||
    state.playheadPosition > state.timeSelection.endTime + 0.001
  );
  if (!state.timeSelection || playheadOutsideSelection) {
    dispatch({ type: 'DESELECT_ALL_CLIPS' });
    selectionEdgesRef.current = { startTime: state.playheadPosition, endTime: state.playheadPosition };
  }
  if (!selectionEdgesRef.current) {
    selectionEdgesRef.current = { startTime: state.timeSelection!.startTime, endTime: state.timeSelection!.endTime };
  }
  if (isLeftward) {
    const target = prevClipEdge(scope, selectionEdgesRef.current.startTime);
    if (target === null) return;
    selectionEdgesRef.current.startTime = target;
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: target });
  } else {
    const target = nextClipEdge(scope, selectionEdgesRef.current.endTime);
    if (target === null) return;
    selectionEdgesRef.current.endTime = target;
  }
  dispatch({
    type: 'SET_TIME_SELECTION',
    payload: {
      startTime: selectionEdgesRef.current.startTime,
      endTime: selectionEdgesRef.current.endTime,
      tracks: state.timeSelection?.tracks
        ?? (state.selectedTrackIndices.length > 0
          ? state.selectedTrackIndices
          : state.focusedTrackIndex != null ? [state.focusedTrackIndex] : undefined),
    },
  });
  scrollPlayheadIntoView();
}
