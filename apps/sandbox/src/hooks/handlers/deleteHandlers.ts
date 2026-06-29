import type { TracksState, TracksAction } from '../../contexts/TracksContext';

export interface DeleteHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  selectionAnchorRef: React.MutableRefObject<number | null>;
  selectionEdgesRef: React.MutableRefObject<{ startTime: number; endTime: number } | null>;
  isKeyboardNavigating: boolean;
}

/**
 * Handles Delete/Backspace key with priority-based deletion:
 * 1. Selected labels
 * 2. Time selection (canvas-rendered)
 * 3. Focused/selected clips
 * 4. Selected tracks (when no clips/labels selected)
 */
export function handleDelete(deps: DeleteHandlerDeps): void {
  const { state } = deps;

  // Priority 1: If there are selected labels, delete them
  if (state.selectedLabelIds.length > 0) {
    handleDeleteLabels(deps);
    return;
  }

  // Priority 2: If there's a real time selection (not ruler-only from clip selection), perform cut operation
  if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
    handleDeleteTimeSelection(deps);
    return;
  }

  // Priority 3: Delete focused clip and/or selected clips
  handleDeleteClips(deps);
}

function clearSelectionAnchors(deps: DeleteHandlerDeps): void {
  deps.selectionAnchorRef.current = null;
  deps.selectionEdgesRef.current = null;
}

function handleDeleteLabels(deps: DeleteHandlerDeps): void {
  const { state, dispatch } = deps;

  // Check if we should also delete time (all tracks selected + time selection exists)
  const allTracksSelected = state.selectedTrackIndices.length === state.tracks.length;
  const hasTimeSelection = state.timeSelection !== null;
  const shouldDeleteTime = allTracksSelected && hasTimeSelection;

  // If deleting with time selection, also delete point labels within the region's time range
  if (shouldDeleteTime && state.timeSelection) {
    const { startTime, endTime } = state.timeSelection;

    state.selectedLabelIds.forEach(labelId => {
      const [trackIndexStr, labelIdStr] = labelId.split('-');
      const trackIndex = parseInt(trackIndexStr, 10);
      const labelIdNum = parseInt(labelIdStr, 10);
      const track = state.tracks[trackIndex];

      if (track && track.labels) {
        const updatedLabels = track.labels.filter(l => {
          if (l.id === labelIdNum) return false;
          if (l.startTime === l.endTime && l.startTime >= startTime && l.startTime <= endTime) {
            return false;
          }
          return true;
        });

        dispatch({
          type: 'UPDATE_TRACK',
          payload: { index: trackIndex, track: { labels: updatedLabels } }
        });
      }
    });
  } else {
    // Normal label deletion (no time range deletion)
    state.selectedLabelIds.forEach(labelId => {
      const [trackIndexStr, labelIdStr] = labelId.split('-');
      const trackIndex = parseInt(trackIndexStr, 10);
      const labelIdNum = parseInt(labelIdStr, 10);

      const track = state.tracks[trackIndex];
      if (track && track.labels) {
        const labelIndex = track.labels.findIndex(l => l.id === labelIdNum);
        if (labelIndex !== -1) {
          const updatedLabels = [...track.labels];
          updatedLabels.splice(labelIndex, 1);

          dispatch({
            type: 'UPDATE_TRACK',
            payload: { index: trackIndex, track: { labels: updatedLabels } }
          });
        }
      }
    });
  }

  // Clear label selection after deletion
  dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });

  // If conditions met, also delete time range across all tracks
  if (shouldDeleteTime && state.timeSelection) {
    const { startTime, endTime } = state.timeSelection;
    const deletionDuration = endTime - startTime;

    dispatch({ type: 'DELETE_TIME_RANGE', payload: { startTime, endTime } });
    dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    clearSelectionAnchors(deps);

    // Adjust playhead position based on cut mode
    if (state.cutMode === 'ripple' && state.playheadPosition > startTime) {
      const newPlayheadPosition = Math.max(startTime, state.playheadPosition - deletionDuration);
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPlayheadPosition });
    }
  } else {
    dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    clearSelectionAnchors(deps);
  }
}

function handleDeleteTimeSelection(deps: DeleteHandlerDeps): void {
  const { state, dispatch } = deps;

  const { startTime, endTime } = state.timeSelection!;
  const deletionDuration = endTime - startTime;

  dispatch({ type: 'DELETE_TIME_RANGE', payload: { startTime, endTime } });
  dispatch({ type: 'SET_TIME_SELECTION', payload: null });
  clearSelectionAnchors(deps);

  // Adjust playhead position based on cut mode
  if (state.cutMode === 'ripple' && state.playheadPosition > startTime) {
    const newPlayheadPosition = Math.max(startTime, state.playheadPosition - deletionDuration);
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPlayheadPosition });
  }
}

function handleDeleteClips(deps: DeleteHandlerDeps): void {
  const { state, dispatch, isKeyboardNavigating } = deps;

  // Read the focused clip from the DOM (only meaningful when the user
  // is keyboard-navigating — clicks give clips invisible focus that
  // shouldn't count as a "you are here" signal for delete).
  let focusedClipInfo: { clipId: number; trackIndex: number } | null = null;
  if (isKeyboardNavigating) {
    const activeElement = document.activeElement;
    if (activeElement) {
      const clipIdStr = activeElement.getAttribute('data-clip-id');
      const trackIndexStr = activeElement.getAttribute('data-track-index');
      if (clipIdStr !== null && trackIndexStr !== null) {
        const clipId = Number(clipIdStr);
        if (!isNaN(clipId)) {
          focusedClipInfo = { clipId, trackIndex: parseInt(trackIndexStr, 10) };
        }
      }
    }
  }

  // Collect the selected-clip set.
  const selectedClips: Array<{ trackIndex: number; clipId: number }> = [];
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach((clip) => {
      if (clip.selected) selectedClips.push({ trackIndex, clipId: clip.id as number });
    });
    track.midiClips?.forEach((clip) => {
      if (clip.selected) selectedClips.push({ trackIndex, clipId: clip.id as number });
    });
  });

  // Model 3 decision:
  //   - focused ∈ selection      → delete the selection (batch intent)
  //   - focused ∉ selection      → delete only the focused clip
  //   - no focused, has selection → delete the selection
  //   - nothing focused, nothing selected → fall through to track delete
  let clipsToDelete: Array<{ trackIndex: number; clipId: number }> = [];
  if (focusedClipInfo) {
    const focusedIsSelected = selectedClips.some(
      (c) => c.clipId === focusedClipInfo!.clipId && c.trackIndex === focusedClipInfo!.trackIndex,
    );
    clipsToDelete = focusedIsSelected ? selectedClips : [focusedClipInfo];
  } else if (selectedClips.length > 0) {
    clipsToDelete = selectedClips;
  }

  if (clipsToDelete.length > 0) {
    clipsToDelete.forEach(({ trackIndex, clipId }) => {
      dispatch({ type: 'DELETE_CLIP', payload: { trackIndex, clipId } });
    });
    return;
  }

  // No clips to delete — fall through to track-level Model 3.
  //   - focused track ∈ selectedTrackIndices → delete the track selection
  //   - focused track ∉ selectedTrackIndices → delete only the focused track
  //   - no focused track, has selection → delete the selection
  const focused = state.focusedTrackIndex;
  if (focused !== null && focused !== undefined) {
    const focusedInSelection = state.selectedTrackIndices.includes(focused);
    if (focusedInSelection && state.selectedTrackIndices.length > 0) {
      dispatch({ type: 'DELETE_TRACKS', payload: state.selectedTrackIndices });
    } else {
      dispatch({ type: 'DELETE_TRACK', payload: focused });
    }
    return;
  }
  if (state.selectedTrackIndices.length > 0) {
    dispatch({ type: 'DELETE_TRACKS', payload: state.selectedTrackIndices });
  }
}
