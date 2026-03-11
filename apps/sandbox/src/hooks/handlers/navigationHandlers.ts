import type { TracksState, TracksAction } from '../../contexts/TracksContext';
import { selectTrackExclusive, toggleTrackSelection } from '../../utils/trackSelection';

export interface NavigationHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  selectionAnchor: number | null;
  setSelectionAnchor: React.Dispatch<React.SetStateAction<number | null>>;
  selectionAnchorRef: React.MutableRefObject<number | null>;
  selectionEdgesRef: React.MutableRefObject<{ startTime: number; endTime: number } | null>;
  isFlatNavigation: boolean;
  scrollPlayheadIntoView: () => void;
}

/** Home/End: jump playhead with optional Shift to extend time selection */
export function handleHomeEnd(e: KeyboardEvent, deps: NavigationHandlerDeps): void {
  const { state, dispatch, selectionAnchorRef, selectionEdgesRef, scrollPlayheadIntoView } = deps;

  if (e.key === 'Home') {
    if (e.shiftKey) {
      if (selectionAnchorRef.current === null) {
        selectionAnchorRef.current = state.playheadPosition;
        dispatch({ type: 'DESELECT_ALL_CLIPS' });
        if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
          const allTrackIndices = state.tracks.map((_, idx) => idx);
          dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
        }
      }
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: { startTime: 0, endTime: selectionAnchorRef.current },
      });
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });
    } else {
      selectionAnchorRef.current = null;
      selectionEdgesRef.current = null;
      dispatch({ type: 'SET_TIME_SELECTION', payload: null });
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });
    }
  } else {
    // End key
    const projectEnd = state.tracks.reduce((max, track) => {
      const audioMax = track.clips.reduce((m, clip) => Math.max(m, clip.start + clip.duration), max);
      return (track.midiClips || []).reduce((m, clip) => Math.max(m, clip.start + clip.duration), audioMax);
    }, 0);

    if (e.shiftKey) {
      if (selectionAnchorRef.current === null) {
        selectionAnchorRef.current = state.playheadPosition;
        dispatch({ type: 'DESELECT_ALL_CLIPS' });
        if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
          const allTrackIndices = state.tracks.map((_, idx) => idx);
          dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
        }
      }
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: { startTime: selectionAnchorRef.current, endTime: projectEnd },
      });
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: projectEnd });
    } else {
      selectionAnchorRef.current = null;
      selectionEdgesRef.current = null;
      dispatch({ type: 'SET_TIME_SELECTION', payload: null });
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: projectEnd });
    }
  }
  scrollPlayheadIntoView();
}

/** F6: jump between major UI blocks (flat navigation mode) */
export function handleF6(e: KeyboardEvent, _deps: NavigationHandlerDeps): void {
  const majorBlocks = [
    () => document.querySelector('[aria-label="File"]') as HTMLElement,
    () => document.querySelector('[aria-label="Home"]') as HTMLElement,
    () => document.querySelector('[aria-label="Play"]') as HTMLElement,
    () => document.querySelector('[aria-label="Add Track"]') as HTMLElement,
    () => document.querySelector('[aria-label*="track controls"]') as HTMLElement,
  ];

  const currentElement = document.activeElement as HTMLElement;
  let currentBlockIndex = -1;

  for (let i = 0; i < majorBlocks.length; i++) {
    const blockElement = majorBlocks[i]();
    if (blockElement && (blockElement === currentElement || blockElement.contains(currentElement))) {
      currentBlockIndex = i;
      break;
    }
  }

  const nextBlockIndex = e.shiftKey
    ? (currentBlockIndex <= 0 ? majorBlocks.length - 1 : currentBlockIndex - 1)
    : (currentBlockIndex + 1) % majorBlocks.length;

  const nextBlock = majorBlocks[nextBlockIndex]();
  if (nextBlock) {
    nextBlock.focus();
  }
}

/** ArrowUp/Down: move track focus with optional Shift for range selection */
export function handleTrackFocus(e: KeyboardEvent, deps: NavigationHandlerDeps): void {
  const { state, dispatch, selectionAnchor, setSelectionAnchor } = deps;

  if (state.focusedTrackIndex !== null) {
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const newIndex = state.focusedTrackIndex + delta;

    if (newIndex >= 0 && newIndex < state.tracks.length) {
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: newIndex });

      if (e.shiftKey) {
        const anchor = selectionAnchor ?? state.focusedTrackIndex;
        if (selectionAnchor === null) {
          setSelectionAnchor(state.focusedTrackIndex);
        }

        const start = Math.min(anchor, newIndex);
        const end = Math.max(anchor, newIndex);
        const newSelection: number[] = [];
        for (let i = start; i <= end; i++) {
          newSelection.push(i);
        }
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
      } else {
        setSelectionAnchor(null);
      }
    }
  } else if (state.tracks.length > 0) {
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
  }
}

/** Enter: toggle clip and track selection */
export function handleEnterSelection(e: KeyboardEvent, deps: NavigationHandlerDeps): void {
  const { state, dispatch, selectionAnchor, setSelectionAnchor } = deps;

  // Check if any clips are selected
  const selectedClips: Array<{ trackIndex: number; clipId: number }> = [];
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach(clip => {
      if (clip.selected) {
        selectedClips.push({ trackIndex, clipId: clip.id });
      }
    });
  });

  if (selectedClips.length > 0) {
    const firstSelectedClip = selectedClips[0];

    if (e.shiftKey && state.lastSelectedClip) {
      dispatch({
        type: 'SELECT_CLIP_RANGE',
        payload: { trackIndex: state.lastSelectedClip.trackIndex, clipId: state.lastSelectedClip.clipId },
      });
    } else if (e.metaKey || e.ctrlKey) {
      dispatch({
        type: 'TOGGLE_CLIP_SELECTION',
        payload: { trackIndex: firstSelectedClip.trackIndex, clipId: firstSelectedClip.clipId },
      });
    } else {
      if (selectedClips.length === 1) {
        dispatch({ type: 'DESELECT_ALL_CLIPS' });
      } else {
        dispatch({
          type: 'SELECT_CLIP',
          payload: { trackIndex: firstSelectedClip.trackIndex, clipId: firstSelectedClip.clipId },
        });
      }
    }
    return;
  }

  // No clips selected — fall back to track selection
  if (state.focusedTrackIndex !== null) {
    if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const anchor = selectionAnchor ?? (state.selectedTrackIndices.length > 0 ? state.selectedTrackIndices[0] : state.focusedTrackIndex);
      if (selectionAnchor === null) setSelectionAnchor(state.focusedTrackIndex);
      const start = Math.min(anchor, state.focusedTrackIndex);
      const end = Math.max(anchor, state.focusedTrackIndex);
      const newSelection: number[] = [];
      for (let i = start; i <= end; i++) newSelection.push(i);
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
    } else if (e.metaKey || e.ctrlKey) {
      toggleTrackSelection(state.focusedTrackIndex, state.selectedTrackIndices, dispatch);
    } else {
      selectTrackExclusive(state.focusedTrackIndex, dispatch);
    }
  }
}
