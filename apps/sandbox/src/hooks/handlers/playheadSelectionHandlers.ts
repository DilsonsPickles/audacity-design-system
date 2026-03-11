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

  if (e.shiftKey && e.metaKey && state.timeSelection) {
    // REDUCE mode (Cmd+Shift): Trim existing selection inward
    if (!selectionEdgesRef.current) {
      selectionEdgesRef.current = {
        startTime: state.timeSelection.startTime,
        endTime: state.timeSelection.endTime,
      };
    }

    if (isLeftward) {
      // Move RIGHT edge LEFT (trim from right)
      const newEndTime = Math.max(
        selectionEdgesRef.current.startTime + 0.1,
        selectionEdgesRef.current.endTime - moveAmount
      );
      selectionEdgesRef.current.endTime = newEndTime;
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: {
          startTime: selectionEdgesRef.current.startTime,
          endTime: newEndTime,
        },
      });
    } else {
      // Move LEFT edge RIGHT (trim from left)
      const newStartTime = Math.min(
        selectionEdgesRef.current.endTime - 0.1,
        selectionEdgesRef.current.startTime + moveAmount
      );
      selectionEdgesRef.current.startTime = newStartTime;
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: {
          startTime: newStartTime,
          endTime: selectionEdgesRef.current.endTime,
        },
      });
    }
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
    scrollPlayheadIntoView();
  } else if (e.shiftKey) {
    // EXTEND mode (Shift): extend selection edges outward
    const playheadOutsideSelection = state.timeSelection && (
      state.playheadPosition < state.timeSelection.startTime - 0.001 ||
      state.playheadPosition > state.timeSelection.endTime + 0.001
    );

    if (!state.timeSelection || playheadOutsideSelection) {
      dispatch({ type: 'DESELECT_ALL_CLIPS' });
      if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
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
      selectionEdgesRef.current.startTime = Math.max(0, selectionEdgesRef.current.startTime - moveAmount);
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
    } else {
      selectionEdgesRef.current.endTime = selectionEdgesRef.current.endTime + moveAmount;
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
