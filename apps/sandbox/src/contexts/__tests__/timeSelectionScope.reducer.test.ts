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

describe('scope integrity under track delete/move', () => {
  const threeTracks = () => [
    track(1, [{ id: 10 }]),
    track(2, [{ id: 20 }]),
    track(3, [{ id: 30 }]),
  ];

  it('DELETE_TRACK shifts scope indices above the deleted track', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [1, 2] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 0 });
    expect(next.timeSelection?.tracks).toEqual([0, 1]);
  });

  it('DELETE_TRACK drops the deleted track from the scope', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [1, 2] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 1 });
    expect(next.timeSelection?.tracks).toEqual([1]);
  });

  it('DELETE_TRACK clears the whole time selection when the scope empties', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [1] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 1 });
    expect(next.timeSelection).toBeNull();
  });

  it('DELETE_TRACKS drops and shifts scope indices', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [0, 2] },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACKS', payload: [1] });
    expect(next.timeSelection?.tracks).toEqual([0, 1]);
  });

  it('MOVE_TRACK remaps scope indices to follow the reorder', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1, tracks: [0] },
    });
    const next = tracksReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 2 } });
    expect(next.timeSelection?.tracks).toEqual([2]);
  });

  it('leaves a scopeless time selection untouched', () => {
    const state = stateWith({
      tracks: threeTracks(),
      timeSelection: { startTime: 0, endTime: 1 },
    });
    const next = tracksReducer(state, { type: 'DELETE_TRACK', payload: 0 });
    expect(next.timeSelection).toEqual({ startTime: 0, endTime: 1 });
  });
});

describe('track-selection / time-selection mutual exclusivity', () => {
  it('SET_TIME_SELECTION with non-null payload clears selectedTrackIndices', () => {
    const state = stateWith({
      selectedTrackIndices: [0, 1],
    });
    const next = tracksReducer(state, {
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 1 },
    });
    expect(next.selectedTrackIndices).toEqual([]);
    expect(next.timeSelection).toEqual({ startTime: 0, endTime: 1 });
  });

  it('SET_TIME_SELECTION with null payload leaves selectedTrackIndices untouched', () => {
    const state = stateWith({
      selectedTrackIndices: [0, 1],
      timeSelection: { startTime: 0, endTime: 1 },
    });
    const next = tracksReducer(state, { type: 'SET_TIME_SELECTION', payload: null });
    expect(next.selectedTrackIndices).toEqual([0, 1]);
    expect(next.timeSelection).toBeNull();
  });

  it('SET_TIME_SELECTION is a no-op on selectedTrackIndices when it is already empty', () => {
    const state = stateWith({ selectedTrackIndices: [] });
    const next = tracksReducer(state, {
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 2 },
    });
    expect(next.selectedTrackIndices).toEqual([]);
  });
});
