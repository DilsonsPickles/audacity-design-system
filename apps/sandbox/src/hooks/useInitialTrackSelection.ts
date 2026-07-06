import { useEffect } from 'react';
import type { TracksState, TracksAction } from '../contexts/TracksContext';

export interface UseInitialTrackSelectionDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

/**
 * Selects and focuses track 0 on mount if there are tracks and nothing is
 * already selected/focused.
 *
 * NOTE: App.tsx had two duplicate mount effects covering this — one at ~227
 * (guard: selectedTrackIndices.length === 0) and one at ~745 (guard:
 * focusedTrackIndex === null). Both were mount-only with identical initial
 * state, making the second redundant. This hook consolidates them into one.
 * The combined guard (`selectedTrackIndices.length === 0 &&
 * focusedTrackIndex === null`) is equivalent at mount time since initialState
 * has both as empty/null.
 */
export function useInitialTrackSelection(deps: UseInitialTrackSelectionDeps): void {
  const { state, dispatch } = deps;

  // Select and focus track 0 on mount
  useEffect(() => {
    if (
      state.tracks.length > 0 &&
      state.selectedTrackIndices.length === 0 &&
      state.focusedTrackIndex === null
    ) {
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [0] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
