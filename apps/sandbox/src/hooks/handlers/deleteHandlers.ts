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

  // Only track focused clip for focus-after-delete when using keyboard navigation
  let focusedClipInfo: { clipId: string | number; trackIndex: number } | null = null;
  if (isKeyboardNavigating) {
    const activeElement = document.activeElement;
    if (activeElement) {
      const clipIdStr = activeElement.getAttribute('data-clip-id');
      const trackIndexStr = activeElement.getAttribute('data-track-index');
      if (clipIdStr !== null && trackIndexStr !== null) {
        const clipId = !isNaN(Number(clipIdStr)) ? Number(clipIdStr) : clipIdStr;
        focusedClipInfo = { clipId, trackIndex: parseInt(trackIndexStr, 10) };
      }
    }
  }

  // Collect all clips to delete (union of focused + selected)
  const clipsToDelete: Array<{ trackIndex: number; clipId: string | number }> = [];

  if (focusedClipInfo) {
    clipsToDelete.push(focusedClipInfo);
  }

  // Add all selected clips (audio + midi)
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach((clip) => {
      if (clip.selected) {
        const isDuplicate = clipsToDelete.some(
          item => item.clipId === clip.id && item.trackIndex === trackIndex
        );
        if (!isDuplicate) {
          clipsToDelete.push({ trackIndex, clipId: clip.id });
        }
      }
    });
    track.midiClips?.forEach((clip) => {
      if (clip.selected) {
        const isDuplicate = clipsToDelete.some(
          item => item.clipId === clip.id && item.trackIndex === trackIndex
        );
        if (!isDuplicate) {
          clipsToDelete.push({ trackIndex, clipId: clip.id });
        }
      }
    });
  });

  if (clipsToDelete.length > 0) {
    // Delete all clips. We intentionally don't auto-move focus to a
    // neighbouring clip — the previous "nearest remaining clip" jump felt
    // arbitrary. The browser will drop focus to <body> when the focused
    // clip element is removed; users can arrow-key back into a clip when
    // they want to keep editing.
    clipsToDelete.forEach(({ trackIndex, clipId }) => {
      dispatch({
        type: 'DELETE_CLIP',
        payload: { trackIndex, clipId: typeof clipId === 'string' ? Number(clipId) : clipId },
      });
    });
    return;
  }

  // Priority 4: If there are selected tracks (and no labels/clips/time selected), delete the tracks
  if (state.selectedTrackIndices.length > 0) {
    const anyClipsSelected = state.tracks.some(track =>
      track.clips.some(clip => clip.selected) || track.midiClips?.some(clip => clip.selected)
    );

    if (!anyClipsSelected) {
      dispatch({ type: 'DELETE_TRACKS', payload: state.selectedTrackIndices });
    }
    return;
  }

  // Priority 5: Nothing selected, but a track is focused (e.g. via arrow-key
  // navigation). Treat focus as the deletion target — otherwise pressing
  // Delete on a freshly-focused track quietly does nothing.
  if (state.focusedTrackIndex !== null && state.focusedTrackIndex !== undefined) {
    dispatch({ type: 'DELETE_TRACK', payload: state.focusedTrackIndex });
  }
}
