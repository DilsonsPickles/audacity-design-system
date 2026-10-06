import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

const clip = (id: number, start: number, duration: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start, duration, envelopePoints: [], ...extra }) as unknown as Track['clips'][number];

const state = (extra: Record<string, unknown> = {}): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [clip(10, 0, 4, extra)] } as unknown as Track],
});

const set = (s: TracksState, side: 'in' | 'out', seconds: number) =>
  tracksReducer(s, { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: 10, side, seconds } }).tracks[0].clips[0];

describe('SET_CLIP_FADE — the fade being set wins the room (2026-10-06)', () => {
  it('pulled into the opposite fade, that fade gives way', () => {
    // 4s clip, 1.5s fade out: a 3s fade in leaves 1s for the fade out
    const c = set(state({ fadeOut: 1.5 }), 'in', 3);
    expect(c.fadeIn).toBe(3);
    expect(c.fadeOut).toBe(1);
  });

  it('short of the opposite fade, it is left alone', () => {
    const c = set(state({ fadeOut: 1.5 }), 'in', 2);
    expect(c.fadeIn).toBe(2);
    expect(c.fadeOut).toBe(1.5);
  });

  it('a fade may take the whole clip; the other is then gone, and nothing goes past the clip', () => {
    const c = set(state({ fadeOut: 1.5 }), 'in', 9);
    expect(c.fadeIn).toBe(4);
    expect(c.fadeOut).toBeUndefined();
  });

  it('the same from the other side; and 0 clears', () => {
    const c = set(state({ fadeIn: 3 }), 'out', 2.5);
    expect(c.fadeOut).toBe(2.5);
    expect(c.fadeIn).toBe(1.5);
    const cleared = set(state({ fadeIn: 3 }), 'in', 0);
    expect(cleared.fadeIn).toBeUndefined();
  });

  it('a sliver left of the other fade is cleared, not kept', () => {
    const c = set(state({ fadeOut: 1 }), 'in', 3.99);
    expect(c.fadeIn).toBe(3.99);
    expect(c.fadeOut).toBeUndefined(); // 0.01 left: no fade
  });
});
