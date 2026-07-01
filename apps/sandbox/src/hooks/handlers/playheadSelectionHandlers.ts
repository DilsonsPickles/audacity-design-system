import type { TracksState, TracksAction } from '../../contexts/TracksContext';

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
      // Scope the selection to the focused track if it isn't already
      // part of the track selection — mirrors the mouse-drag
      // behaviour so the keyboard-driven Shift+Arrow feels the same.
      // Falls back to selecting every track when nothing's focused
      // (kept for the "wide selection from ambient state" case).
      const focused = state.focusedTrackIndex;
      if (
        focused !== null && focused !== undefined
        && !state.selectedTrackIndices.includes(focused)
      ) {
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: [focused] });
      } else if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
        const allTrackIndices = state.tracks.map((_, idx) => idx);
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
      }
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

    if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
      const allTrackIndices = state.tracks.map((_, idx) => idx);
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
    }

    dispatch({ type: 'DELETE_TIME_RANGE', payload: { startTime, endTime } });
    dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    selectionAnchorRef.current = null;
    selectionEdgesRef.current = null;
  }
}
