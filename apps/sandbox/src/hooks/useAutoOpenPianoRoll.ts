import { useEffect } from 'react';
import type { TracksState, TracksAction } from '../contexts/TracksContext';

export interface UseAutoOpenPianoRollDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

export function useAutoOpenPianoRoll(deps: UseAutoOpenPianoRollDeps): void {
  const { state, dispatch } = deps;

  // Auto-open/switch piano roll when a MIDI track is focused
  useEffect(() => {
    const focusedIdx = state.focusedTrackIndex;
    if (focusedIdx === null) return;
    const track = state.tracks[focusedIdx];
    if (track?.type === 'midi') {
      if (!state.pianoRollOpen || state.pianoRollTrackIndex !== focusedIdx) {
        const clipIndex = track.midiClips && track.midiClips.length > 0 ? 0 : null;
        dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex: focusedIdx, clipIndex } });
      }
    }
  }, [state.focusedTrackIndex]); // eslint-disable-line react-hooks/exhaustive-deps
}
