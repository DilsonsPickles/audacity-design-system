import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

const clip = (id: number, start: number, duration: number) =>
  ({ id, name: `c${id}`, start, duration, envelopePoints: [] }) as unknown as Track['clips'][number];

const state = (): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [clip(10, 0, 5), clip(11, 3, 5)] } as unknown as Track],
});

describe('fade shapes — linear is stored, the default is cleared', () => {
  it('SET_CROSSFADE_SHAPE stores linear on both sides', () => {
    const next = tracksReducer(state(), {
      type: 'SET_CROSSFADE_SHAPE',
      payload: { trackIndex: 0, outgoingClipId: 10, incomingClipId: 11, outShape: 'linear', inShape: 'linear' },
    });
    // …in the crossfade's OWN fields (2026-10-01): the quick fades'
    // shapes are not touched, so they are there when the clips come apart
    expect(next.tracks[0].clips[0].crossfadeOutShape).toBe('linear');
    expect(next.tracks[0].clips[1].crossfadeInShape).toBe('linear');
    expect(next.tracks[0].clips[0].fadeOutShape).toBeUndefined();
    expect(next.tracks[0].clips[1].fadeInShape).toBeUndefined();
  });

  it('SET_CROSSFADE_SHAPE leaves an authored quick-fade shape alone', () => {
    const s = state();
    s.tracks[0].clips[0].fadeOutShape = { t: 0.5, g: 0.3 };
    s.tracks[0].clips[1].fadeInShape = 'linear';
    const next = tracksReducer(s, {
      type: 'SET_CROSSFADE_SHAPE',
      payload: { trackIndex: 0, outgoingClipId: 10, incomingClipId: 11, outShape: 2, inShape: 2 },
    });
    expect(next.tracks[0].clips[0].fadeOutShape).toEqual({ t: 0.5, g: 0.3 });
    expect(next.tracks[0].clips[1].fadeInShape).toBe('linear');
    expect(next.tracks[0].clips[0].crossfadeOutShape).toBe(2);
    expect(next.tracks[0].clips[1].crossfadeInShape).toBe(2);
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
    expect(back.tracks[0].clips[0].crossfadeOutShape).toBeUndefined();
    expect(back.tracks[0].clips[1].crossfadeInShape).toBeUndefined();
  });

  it('SET_CLIP_FADE_SHAPE stores linear for one edge', () => {
    const next = tracksReducer(state(), {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'out', shape: 'linear' },
    });
    expect(next.tracks[0].clips[0].fadeOutShape).toBe('linear');
    expect(next.tracks[0].clips[0].fadeInShape).toBeUndefined();
  });

  it('SET_CLIP_FADE_SHAPE clears ~2 — the S-curve is the quick fade default', () => {
    const linear = tracksReducer(state(), {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'in', shape: 'linear' },
    });
    const back = tracksReducer(linear, {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'in', shape: 2.004 },
    });
    expect(back.tracks[0].clips[0].fadeInShape).toBeUndefined();
  });

  it('SET_CLIP_FADE_SHAPE STORES 1 — equal-power is a choice now, and clearing it would give back the S-curve', () => {
    const next = tracksReducer(state(), {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'in', shape: 1 },
    });
    expect(next.tracks[0].clips[0].fadeInShape).toBe(1);
  });

  it('SET_CLIP_FADE_SHAPE stores a handle, and clears one back at the centre', () => {
    const bent = tracksReducer(state(), {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'in', shape: { t: 0.2, g: 0.7 } },
    });
    expect(bent.tracks[0].clips[0].fadeInShape).toEqual({ t: 0.2, g: 0.7 });
    const back = tracksReducer(bent, {
      type: 'SET_CLIP_FADE_SHAPE',
      payload: { trackIndex: 0, clipId: 10, side: 'in', shape: { t: 0.501, g: 0.499 } },
    });
    expect(back.tracks[0].clips[0].fadeInShape).toBeUndefined();
  });

  it('SET_CROSSFADE_SHAPE stores 2 — an S-curve is a choice for a crossfade', () => {
    const next = tracksReducer(state(), {
      type: 'SET_CROSSFADE_SHAPE',
      payload: { trackIndex: 0, outgoingClipId: 10, incomingClipId: 11, outShape: 2, inShape: 2 },
    });
    expect(next.tracks[0].clips[0].crossfadeOutShape).toBe(2);
    expect(next.tracks[0].clips[1].crossfadeInShape).toBe(2);
  });
});
