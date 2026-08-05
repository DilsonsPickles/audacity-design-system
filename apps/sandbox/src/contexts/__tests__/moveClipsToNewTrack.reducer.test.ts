import { describe, it, expect } from 'vitest';
import { clipsReducer } from '../reducers/clipsReducer';
import { initialState } from '../TracksContext';
import type { TracksState, Track, Clip } from '../TracksContext';

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 1, name: 'Clip 1', start: 0, duration: 1,
    trimStart: 0, fullDuration: 1, selected: false,
    envelopePoints: [],
    ...overrides,
  };
}

function makeTrack(id: number, clips: Clip[]): Track {
  return { id, name: `Track ${id}`, clips };
}

function makeState(tracks: Track[]): TracksState {
  return { ...initialState, tracks };
}

const newTrackTemplate: Track = { id: 99, name: 'Track 99', clips: [] };

describe('MOVE_SELECTED_CLIPS_TO_NEW_TRACK', () => {
  it('appends the new track and moves the selected clip to it', () => {
    const clip = makeClip({ id: 1, selected: true });
    const state = makeState([makeTrack(1, [clip])]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    expect(next.tracks).toHaveLength(2);
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips).toHaveLength(1);
    expect(next.tracks[1].clips[0].id).toBe(1);
    expect(next.tracks[1].id).toBe(99);
  });

  it('moves all selected clips, leaves unselected clips in place', () => {
    const selected = makeClip({ id: 1, selected: true });
    const unselected = makeClip({ id: 2, selected: false, start: 2 });
    const state = makeState([makeTrack(1, [selected, unselected])]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    expect(next.tracks[0].clips.map(c => c.id)).toEqual([2]);
    expect(next.tracks[1].clips.map(c => c.id)).toEqual([1]);
  });

  it('handles a multi-track group: each clip shifts down by one, preserving relative spacing', () => {
    const clip1 = makeClip({ id: 1, selected: true });
    const clip2 = makeClip({ id: 2, selected: true });
    const state = makeState([
      makeTrack(1, [clip1]),
      makeTrack(2, [clip2]),
    ]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    // Three tracks after: original two vacated, clip1 shifts to slot 1,
    // clip2 shifts to slot 2 (the new appended track).
    expect(next.tracks).toHaveLength(3);
    expect(next.tracks[0].clips).toHaveLength(0);
    expect(next.tracks[1].clips.map(c => c.id)).toEqual([1]);
    expect(next.tracks[2].clips.map(c => c.id)).toEqual([2]);
  });

  it('returns state unchanged when no clips are selected', () => {
    const clip = makeClip({ id: 1, selected: false });
    const state = makeState([makeTrack(1, [clip])]);

    const next = clipsReducer(state, {
      type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
      payload: { newTrack: newTrackTemplate },
    });

    expect(next).toBe(state);
  });
});
