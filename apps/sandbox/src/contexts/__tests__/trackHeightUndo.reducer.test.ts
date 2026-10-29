import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState, type Track, type TracksState } from '../TracksContext';

const seed = (): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 'T', height: 114, clips: [{ id: 1, name: 'A', start: 0, duration: 4, envelopePoints: [] } as Track['clips'][number]] }],
});
const height = (s: TracksState) => s.tracks[0].height;
const fadeIn = (s: TracksState) => s.tracks[0].clips[0].fadeIn ?? 0;
const resize = (s: TracksState, h: number) => tracksReducer(s, { type: 'UPDATE_TRACK_HEIGHT', payload: { index: 0, height: h } });
const setFade = (s: TracksState, seconds: number) => tracksReducer(s, { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: 1, side: 'in', seconds } });

describe('track height is off the undo chain (2026-10-29)', () => {
  it('a resize pushes no undo entry', () => {
    const s = resize(seed(), 200);
    expect(height(s)).toBe(200);
    expect(s.past).toHaveLength(0);
  });

  it('undo and redo change the content and leave every track at the height it has now', () => {
    let s = setFade(seed(), 1);
    s = resize(s, 200); // after the edit: the snapshot under it still says 114
    s = tracksReducer(s, { type: 'UNDO' });
    expect(fadeIn(s)).toBe(0);
    expect(height(s)).toBe(200);
    s = resize(s, 60);
    s = tracksReducer(s, { type: 'REDO' });
    expect(fadeIn(s)).toBe(1);
    expect(height(s)).toBe(60);
  });

  it('a stereo track\'s channel split is the view too', () => {
    let s = setFade(seed(), 1);
    s = tracksReducer(s, { type: 'UPDATE_CHANNEL_SPLIT_RATIO', payload: { index: 0, ratio: 0.3 } });
    expect(s.past).toHaveLength(1);
    s = tracksReducer(s, { type: 'UNDO' });
    expect(s.tracks[0].channelSplitRatio).toBe(0.3);
  });

  it('cancelling an undo gesture keeps the current heights', () => {
    let s = tracksReducer(seed(), { type: 'BEGIN_UNDO_GESTURE' });
    s = setFade(s, 2);
    s = resize(s, 150);
    s = tracksReducer(s, { type: 'CANCEL_UNDO_GESTURE' });
    expect(fadeIn(s)).toBe(0);
    expect(height(s)).toBe(150);
  });
});
