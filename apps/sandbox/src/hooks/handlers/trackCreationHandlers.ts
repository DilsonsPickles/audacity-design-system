import type { TracksState, TracksAction } from '../../contexts/TracksContext';

export interface TrackCreationHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

/** Cmd/Ctrl+T (mono), Cmd/Ctrl+Shift+T (stereo), Cmd/Ctrl+Shift+L (label). */
export function handleTrackCreation(e: KeyboardEvent, deps: TrackCreationHandlerDeps): void {
  const { state, dispatch } = deps;

  // Pick a non-colliding id and a non-colliding numeric suffix from
  // existing tracks (length+1 collides after you delete a middle track).
  const nextIdAfterDeletes = (state.tracks.reduce(
    (max: number, t: any) => (t.id > max ? t.id : max),
    0,
  ) + 1);
  const nextNameNumber = (prefix: string) => {
    const pattern = new RegExp(`^${prefix} (\\d+)$`);
    const usedNumbers = state.tracks
      .map((t: any) => {
        const m = pattern.exec(t.name ?? '');
        return m ? parseInt(m[1], 10) : NaN;
      })
      .filter((n: number) => !isNaN(n));
    if (usedNumbers.length === 0) return 1;
    return Math.max(...usedNumbers) + 1;
  };

  if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
    e.preventDefault();
    const prefix = e.shiftKey ? 'Stereo' : 'Audio';
    const baseTrack: any = {
      id: nextIdAfterDeletes,
      name: `${prefix} ${nextNameNumber(prefix)}`,
      type: 'audio',
      height: 114,
      clips: [],
    };
    if (e.shiftKey) baseTrack.channelSplitRatio = 0.5; // stereo signifier
    dispatch({ type: 'ADD_TRACK', payload: baseTrack });
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault();
    dispatch({
      type: 'ADD_TRACK',
      payload: {
        id: nextIdAfterDeletes,
        name: `Label ${nextNameNumber('Label')}`,
        type: 'label',
        height: 76, // matches the AddTrackFlyout default in EditorLayout
        clips: [],
      } as any,
    });
    return;
  }
}
