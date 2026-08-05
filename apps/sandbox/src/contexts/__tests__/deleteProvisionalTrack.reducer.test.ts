import { describe, it, expect } from 'vitest';
import { tracksDomainReducer } from '../reducers/tracksDomainReducer';
import { clipsReducer } from '../reducers/clipsReducer';
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

  it('correctly sequences move-then-delete: clip arrives before track is removed', () => {
    const state = makeState([
      makeTrack(1, 1),
      { ...makeTrack(99, 0), clips: [{ id: 10, name: 'Clip 10', start: 0, duration: 1, trimStart: 0, fullDuration: 1, selected: true, envelopePoints: [] }] } as Track,
    ]);

    const moveAction = { type: 'MOVE_SELECTED_CLIPS_TO_TRACK' as const, payload: { direction: -1 as const } };
    const afterMove = clipsReducer(state, moveAction);

    const deleteAction = { type: 'DELETE_PROVISIONAL_TRACK' as const, payload: { trackId: 99 } };
    const afterDelete = tracksDomainReducer(afterMove, deleteAction);

    expect(afterDelete.tracks).toHaveLength(1);
    expect(afterDelete.tracks[0].id).toBe(1);
    expect(afterDelete.tracks[0].clips).toHaveLength(2);
  });
});
