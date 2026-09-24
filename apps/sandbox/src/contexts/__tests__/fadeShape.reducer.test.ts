import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

const clip = (id: number, start: number, duration: number) =>
  ({ id, name: `c${id}`, start, duration, envelopePoints: [] }) as unknown as Track['clips'][number];

const state = (): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [clip(10, 0, 5), clip(11, 3, 5)] } as unknown as Track],
});

describe('fade shapes — linear is stored, ~1 is cleared', () => {
  it('SET_CROSSFADE_SHAPE stores linear on both sides', () => {
    const next = tracksReducer(state(), {
      type: 'SET_CROSSFADE_SHAPE',
      payload: { trackIndex: 0, outgoingClipId: 10, incomingClipId: 11, outShape: 'linear', inShape: 'linear' },
    });
    expect(next.tracks[0].clips[0].fadeOutShape).toBe('linear');
    expect(next.tracks[0].clips[1].fadeInShape).toBe('linear');
  });

  it('...and an exponent of ~1 clears back to the equal-power default', () => {
    const linear = tracksReducer(state(), {
      type: 'SET_CROSSFADE_SHAPE',
      payload: { trackIndex: 0, outgoingClipId: 10, incomingClipId: 11, outShape: 'linear', inShape: 'linear' },
    });
    const back = tracksReducer(linear, {
      type: 'SET_CROSSFADE_SHAPE',
      payload: { trackIndex: 0, outgoingClipId: 10, incomingClipId: 11, outShape: 1, inShape: 1.004 },
    });
    expect(back.tracks[0].clips[0].fadeOutShape).toBeUndefined();
    expect(back.tracks[0].clips[1].fadeInShape).toBeUndefined();
  });

  it('SET_CLIP_FADE_SHAPE stores linear for one edge', () => {
    const next = tracksReducer(state(), {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'out', shape: 'linear' },
    });
    expect(next.tracks[0].clips[0].fadeOutShape).toBe('linear');
    expect(next.tracks[0].clips[0].fadeInShape).toBeUndefined();
  });
});
