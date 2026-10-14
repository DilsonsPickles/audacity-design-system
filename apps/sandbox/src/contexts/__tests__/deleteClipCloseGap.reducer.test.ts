import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState, type Track, type TracksState } from '../TracksContext';

type C = Track['clips'][number];
const clip = (id: number, start: number, duration: number): C => ({ id, name: `C${id}`, start, duration, envelopePoints: [] } as C);

// Two tracks: the clicked clip (id 2) sits between two others on track 0;
// track 1 has a clip after the clicked clip's span and one before it.
const seed = (): TracksState => ({
  ...initialState,
  tracks: [
    { id: 1, name: 'A', clips: [clip(1, 0, 2), clip(2, 3, 4), clip(3, 10, 2)] },
    { id: 2, name: 'B', clips: [clip(4, 1, 1), clip(5, 8, 2)] },
  ],
});
const starts = (s: TracksState, t: number) => s.tracks[t].clips.map((c) => [c.id, c.start]);

describe("DELETE_CLIP_CLOSE_GAP — the clip menu's \"close gap\" forms (2026-10-14)", () => {
  it("'track': the clip goes and what follows on ITS track slides left by its length; the other track holds", () => {
    const s = tracksReducer(seed(), { type: 'DELETE_CLIP_CLOSE_GAP', payload: { trackIndex: 0, clipId: 2, scope: 'track' } });
    expect(starts(s, 0)).toEqual([[1, 0], [3, 6]]);
    expect(starts(s, 1)).toEqual([[4, 1], [5, 8]]);
  });
  it("'all': every track's later clips slide left", () => {
    const s = tracksReducer(seed(), { type: 'DELETE_CLIP_CLOSE_GAP', payload: { trackIndex: 0, clipId: 2, scope: 'all' } });
    expect(starts(s, 0)).toEqual([[1, 0], [3, 6]]);
    expect(starts(s, 1)).toEqual([[4, 1], [5, 4]]);
  });
  it('is one undo step, and a clip id that is not there is a no-op', () => {
    const s = tracksReducer(seed(), { type: 'DELETE_CLIP_CLOSE_GAP', payload: { trackIndex: 0, clipId: 2, scope: 'all' } });
    expect(s.past).toHaveLength(1);
    const back = tracksReducer(s, { type: 'UNDO' });
    expect(starts(back, 1)).toEqual([[4, 1], [5, 8]]);
    const seeded = seed();
    expect(tracksReducer(seeded, { type: 'DELETE_CLIP_CLOSE_GAP', payload: { trackIndex: 0, clipId: 99, scope: 'all' } })).toBe(seeded);
  });
});
