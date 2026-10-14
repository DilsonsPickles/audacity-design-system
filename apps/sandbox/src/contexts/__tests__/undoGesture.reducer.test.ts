import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState, type Track, type TracksState } from '../TracksContext';

const seed = (): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 'T', clips: [{ id: 1, name: 'A', start: 0, duration: 4, envelopePoints: [] } as Track['clips'][number]] }],
});
const fadeIn = (s: TracksState) => s.tracks[0].clips[0].fadeIn ?? 0;
const setFade = (s: TracksState, seconds: number) => tracksReducer(s, { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: 1, side: 'in', seconds } });

describe('the undo gesture bracket (2026-10-14, the Fades dialog\'s live preview)', () => {
  it('BEGIN … END: every edit inside applies, and END pushes ONE entry — Cmd+Z returns to before the gesture', () => {
    let s = tracksReducer(seed(), { type: 'BEGIN_UNDO_GESTURE' });
    s = setFade(s, 1);
    s = setFade(s, 2);
    s = setFade(s, 3);
    expect(fadeIn(s)).toBe(3);
    expect(s.past).toHaveLength(0);
    s = tracksReducer(s, { type: 'END_UNDO_GESTURE' });
    expect(s.past).toHaveLength(1);
    expect(s.undoGesture).toBeNull();
    s = tracksReducer(s, { type: 'UNDO' });
    expect(fadeIn(s)).toBe(0);
  });
  it('BEGIN … CANCEL: the edits are undone outright and nothing is pushed', () => {
    let s = tracksReducer(seed(), { type: 'BEGIN_UNDO_GESTURE' });
    s = setFade(s, 2);
    s = tracksReducer(s, { type: 'CANCEL_UNDO_GESTURE' });
    expect(fadeIn(s)).toBe(0);
    expect(s.past).toHaveLength(0);
    expect(s.undoGesture).toBeNull();
  });
  it('an END with nothing changed pushes nothing; BEGIN inside a gesture keeps the first snapshot', () => {
    let s = tracksReducer(seed(), { type: 'BEGIN_UNDO_GESTURE' });
    s = tracksReducer(s, { type: 'END_UNDO_GESTURE' });
    expect(s.past).toHaveLength(0);
    s = tracksReducer(seed(), { type: 'BEGIN_UNDO_GESTURE' });
    s = setFade(s, 1);
    s = tracksReducer(s, { type: 'BEGIN_UNDO_GESTURE' });
    s = setFade(s, 2);
    s = tracksReducer(s, { type: 'CANCEL_UNDO_GESTURE' });
    expect(fadeIn(s)).toBe(0);
  });
});
