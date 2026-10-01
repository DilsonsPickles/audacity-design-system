/**
 * A clip's source length (fullDuration) is locked in on its first trim
 * FROM WHAT IT SHOWED BEFORE the trim (2026-10-01): a never-trimmed clip
 * shows its whole source, so that is trimStart + duration. Locking the
 * post-trim sum forgot the hidden tail on a right-edge trim and squashed
 * the waveform (the drawing derives its sample rate from fullDuration).
 */
import { describe, it, expect } from 'vitest';
import { tracksReducer, initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';

const clip = (id: number, start: number, duration: number) =>
  ({ id, name: `c${id}`, start, duration, envelopePoints: [] }) as unknown as Track['clips'][number];

const state = (): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [clip(10, 0, 5)] } as unknown as Track],
});

describe('TRIM_CLIP locks in the source length', () => {
  it('a right-edge trim keeps the hidden tail: fullDuration is the pre-trim 5s, not the new 3s', () => {
    const next = tracksReducer(state(), {
      type: 'TRIM_CLIP',
      payload: { trackIndex: 0, clipId: 10, newTrimStart: 0, newDuration: 3 },
    });
    expect(next.tracks[0].clips[0]).toMatchObject({ trimStart: 0, duration: 3, fullDuration: 5 });
  });

  it('a left-edge trim comes to the same number either way', () => {
    const next = tracksReducer(state(), {
      type: 'TRIM_CLIP',
      payload: { trackIndex: 0, clipId: 10, newTrimStart: 2, newDuration: 3, newStart: 2 },
    });
    expect(next.tracks[0].clips[0]).toMatchObject({ trimStart: 2, duration: 3, start: 2, fullDuration: 5 });
  });

  it('a clip that already knows its source length keeps it', () => {
    const s = state();
    s.tracks[0].clips[0].fullDuration = 9;
    const next = tracksReducer(s, {
      type: 'TRIM_CLIP',
      payload: { trackIndex: 0, clipId: 10, newTrimStart: 0, newDuration: 3 },
    });
    expect(next.tracks[0].clips[0].fullDuration).toBe(9);
  });
});
