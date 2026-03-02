/**
 * Shared track selection utilities.
 *
 * Used by EditorLayout (click / Enter on track container) and
 * useKeyboardShortcuts (Enter when no clip is focused) so
 * every code-path behaves identically.
 */

/** Exclusively select a single track (plain Enter / plain Click). */
export function selectTrackExclusive(
  trackIndex: number,
  dispatch: React.Dispatch<any>,
) {
  dispatch({ type: 'DESELECT_ALL_CLIPS' });
  dispatch({ type: 'SELECT_TRACK', payload: trackIndex });
}

/** Toggle a track in/out of multi-selection (Cmd+Enter / Cmd+Click). */
export function toggleTrackSelection(
  trackIndex: number,
  selectedTrackIndices: number[],
  dispatch: React.Dispatch<any>,
) {
  dispatch({ type: 'DESELECT_ALL_CLIPS' });
  const isSelected = selectedTrackIndices.includes(trackIndex);
  if (isSelected) {
    dispatch({ type: 'SET_SELECTED_TRACKS', payload: selectedTrackIndices.filter(i => i !== trackIndex) });
  } else {
    dispatch({ type: 'SET_SELECTED_TRACKS', payload: [...selectedTrackIndices, trackIndex] });
  }
}
