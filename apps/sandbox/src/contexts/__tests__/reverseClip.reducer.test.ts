import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

const clip = (id: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start: 0, duration: 4, envelopePoints: [], ...extra }) as unknown as Track['clips'][number];

const state = (extra: Record<string, unknown> = {}): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [clip(10, extra)] } as unknown as Track],
});

const reverse = (s: TracksState) => tracksReducer(s, { type: 'REVERSE_CLIP', payload: { trackIndex: 0, clipId: 10 } });

describe('REVERSE_CLIP — the clip reads its source mirrored (2026-10-07)', () => {
  it('toggles reversed and mirrors trimStart: what was hidden at the head is hidden at the tail', () => {
    // Source 10 s, 2 s hidden at the head, 4 s shown → 4 s hidden at the tail
    const once = reverse(state({ trimStart: 2, fullDuration: 10 })).tracks[0].clips[0];
    expect(once.reversed).toBe(true);
    expect(once.trimStart).toBe(4);
    expect(once.fullDuration).toBe(10);
    const twice = reverse({ ...initialState, tracks: [{ id: 1, name: 't', clips: [once] } as unknown as Track] }).tracks[0].clips[0];
    expect(twice.reversed).toBeUndefined();
    expect(twice.trimStart).toBe(2);
  });

  it('an untrimmed clip stays untrimmed, and locks its source length', () => {
    const c = reverse(state()).tracks[0].clips[0];
    expect(c.reversed).toBe(true);
    expect(c.trimStart).toBe(0);
    expect(c.fullDuration).toBe(4);
  });

  it('through a stretch: the window is the source seconds, not the timeline ones', () => {
    // 4 s shown at half speed = 2 s of a 10 s source, 1 s hidden at the head → 7 s at the tail
    const c = reverse(state({ trimStart: 1, fullDuration: 10, stretchFactor: 2 })).tracks[0].clips[0];
    expect(c.trimStart).toBe(7);
  });
});
