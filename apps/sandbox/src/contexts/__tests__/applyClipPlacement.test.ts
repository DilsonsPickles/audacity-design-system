import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState, type TracksState, type Clip } from '../TracksContext';

const baseState = (clips: Partial<Clip>[]): TracksState => ({
  ...initialState,
  tracks: [{
    id: 1,
    name: 't',
    clips: clips.map((c, i) => ({
      id: i + 1,
      name: '',
      start: 0,
      duration: 1,
      envelopePoints: [],
      ...c,
    } as Clip)),
  }],
} as unknown as TracksState);

describe('APPLY_CLIP_PLACEMENT', () => {
  it('applies a trim mutation by updating start, duration, trimStart', () => {
    const state = baseState([{ id: 1, start: 0, duration: 5, trimStart: 0 }]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [
          { type: 'trim', clipId: 1, trackIndex: 0, newStart: 0, newDuration: 3, newTrimStart: 0 },
        ],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(1);
    expect(next.tracks[0].clips[0]).toMatchObject({ id: 1, start: 0, duration: 3, trimStart: 0 });
  });

  it('applies a split mutation by producing two clips that share metadata', () => {
    const state = baseState([{ id: 1, start: 0, duration: 10, trimStart: 0, name: 'src' }]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [
          { type: 'split', clipId: 1, trackIndex: 0, leftEnd: 3, rightStart: 7 },
        ],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(2);
    expect(next.tracks[0].clips[0]).toMatchObject({ id: 1, start: 0, duration: 3, trimStart: 0, name: 'src' });
    expect(next.tracks[0].clips[1]).toMatchObject({ start: 7, duration: 3, trimStart: 7, name: 'src' });
    expect(next.tracks[0].clips[1].id).not.toBe(1);
  });

  it('applies a delete mutation by removing the clip', () => {
    const state = baseState([
      { id: 1, start: 0, duration: 5 },
      { id: 2, start: 10, duration: 5 },
    ]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [{ type: 'delete', clipId: 1, trackIndex: 0 }],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(1);
    expect(next.tracks[0].clips[0].id).toBe(2);
  });

  it('applies a placement by updating the moving clip start/duration', () => {
    const state = baseState([{ id: 1, start: 0, duration: 5 }]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [{ clipId: 1, trackIndex: 0, start: 7, duration: 5 }],
        mutations: [],
      },
    });
    expect(next.tracks[0].clips[0]).toMatchObject({ start: 7, duration: 5 });
  });

  it('applies trim + split + delete in one dispatch atomically', () => {
    const state = baseState([
      { id: 1, start: 0, duration: 5, trimStart: 0 },
      { id: 2, start: 6, duration: 10, trimStart: 0 },
      { id: 3, start: 18, duration: 4 },
    ]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [
          { type: 'trim', clipId: 1, trackIndex: 0, newStart: 0, newDuration: 3, newTrimStart: 0 },
          { type: 'split', clipId: 2, trackIndex: 0, leftEnd: 8, rightStart: 12 },
          { type: 'delete', clipId: 3, trackIndex: 0 },
        ],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(3);
    expect(next.tracks[0].clips.find(c => c.id === 3)).toBeUndefined();
  });
});

describe('APPLY_CLIP_PLACEMENT — group dissolution', () => {
  it('dissolves a 2-member group when the delete mutation removes one member', () => {
    // clips 1 and 2 form a 2-member group; a drop fully covers clip 2 → delete mutation
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
    ]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [{ type: 'delete', clipId: 2, trackIndex: 0 }],
      },
    });
    // clip 1 is the lone survivor — groupId must be cleared
    expect(next.tracks[0].clips).toHaveLength(1);
    expect(next.tracks[0].clips[0].groupId).toBeUndefined();
  });

  it('keeps the group intact when a delete removes one of 3 members (2 remain)', () => {
    // clips 1, 2, 3 form a 3-member group; dropping fully covers clip 3
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3, groupId: 'g1' },
    ]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [{ type: 'delete', clipId: 3, trackIndex: 0 }],
      },
    });
    // 2 survivors — group must be preserved
    expect(next.tracks[0].clips).toHaveLength(2);
    expect(next.tracks[0].clips.find(c => c.id === 1)?.groupId).toBe('g1');
    expect(next.tracks[0].clips.find(c => c.id === 2)?.groupId).toBe('g1');
  });
});
