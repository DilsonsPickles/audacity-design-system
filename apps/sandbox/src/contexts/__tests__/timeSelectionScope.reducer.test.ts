import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState, type Track, type TracksState, type Clip } from '../TracksContext';

const track = (id: number, clips: Array<Partial<Clip> & { id: number }>): Track => ({
  id,
  name: `t${id}`,
  clips: clips.map((c) => ({
    name: '',
    start: 0,
    duration: 1,
    envelopePoints: [],
    ...c,
  } as Clip)),
} as Track);

const stateWith = (o: Partial<TracksState>): TracksState =>
  ({ ...initialState, ...o } as TracksState);

describe('DELETE_TIME_RANGE scope resolution', () => {
  const twoTracks = () => [
    track(1, [{ id: 10, start: 0, duration: 2 }]),
    track(2, [{ id: 20, start: 0, duration: 2 }]),
  ];

  it('prefers timeSelection.tracks over selectedTrackIndices', () => {
    const state = stateWith({
      tracks: twoTracks(),
      selectedTrackIndices: [0],
      cutMode: 'split',
      timeSelection: { startTime: 0, endTime: 3, tracks: [1] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 0, endTime: 3 } });
    expect(next.tracks[0].clips).toHaveLength(1); // out of scope — untouched
    expect(next.tracks[1].clips).toHaveLength(0); // in scope — cut
  });

  it('falls back to selectedTrackIndices when no scope', () => {
    const state = stateWith({
      tracks: twoTracks(),
      selectedTrackIndices: [0],
      cutMode: 'split',
      timeSelection: { startTime: 0, endTime: 3 },
    });
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 0, endTime: 3 } });
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(1);
  });

  it('falls back to all tracks when neither scope nor selection', () => {
    const state = stateWith({
      tracks: twoTracks(),
      selectedTrackIndices: [],
      cutMode: 'split',
      timeSelection: null,
    });
    const next = tracksReducer(state, { type: 'DELETE_TIME_RANGE', payload: { startTime: 0, endTime: 3 } });
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(0);
  });
});

describe('SELECT_CLIPS focus behavior', () => {
  it('no longer moves focusedTrackIndex to the last selected clip', () => {
    const state = stateWith({
      tracks: [track(1, [{ id: 10 }]), track(2, [{ id: 20 }])],
      focusedTrackIndex: 0,
    });
    const next = tracksReducer(state, {
      type: 'SELECT_CLIPS',
      payload: [{ trackIndex: 1, clipId: 20 }],
    });
    expect(next.tracks[1].clips[0].selected).toBe(true);
    expect(next.focusedTrackIndex).toBe(0); // unmoved
  });
});
