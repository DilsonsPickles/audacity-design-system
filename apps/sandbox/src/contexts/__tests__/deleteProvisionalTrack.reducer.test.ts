import { describe, it, expect } from 'vitest';
import { tracksDomainReducer } from '../reducers/tracksDomainReducer';
import { initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

function makeTrack(id: number, clipCount = 0): Track {
  return {
    id,
    name: `Track ${id}`,
    clips: Array.from({ length: clipCount }, (_, i) => ({
      id: i + 1,
      name: `Clip ${i + 1}`,
      start: i,
      duration: 1,
      trimStart: 0,
      fullDuration: 1,
      selected: false,
      envelopePoints: [],
    })),
  } as Track;
}

function makeState(tracks: Track[]): TracksState {
  return { ...initialState, tracks };
}

describe('DELETE_PROVISIONAL_TRACK', () => {
  it('removes the track with the matching id', () => {
    const state = makeState([makeTrack(1), makeTrack(99), makeTrack(2)]);
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 99 },
    });
    expect(next.tracks.map(t => t.id)).toEqual([1, 2]);
  });

  it('returns state unchanged when no track has the given id', () => {
    const state = makeState([makeTrack(1), makeTrack(2)]);
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 999 },
    });
    expect(next).toBe(state);
  });

  it('adjusts focusedTrackIndex when the deleted track is at or before focus', () => {
    const state = { ...makeState([makeTrack(1), makeTrack(99)]), focusedTrackIndex: 1 };
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 99 },
    });
    expect(next.focusedTrackIndex).toBe(0);
  });

  it('does not adjust focusedTrackIndex when the deleted track is after focus', () => {
    const state = { ...makeState([makeTrack(1), makeTrack(2), makeTrack(99)]), focusedTrackIndex: 0 };
    const next = tracksDomainReducer(state, {
      type: 'DELETE_PROVISIONAL_TRACK',
      payload: { trackId: 99 },
    });
    expect(next.focusedTrackIndex).toBe(0);
  });
});
