import { describe, it, expect } from 'vitest';
import { resolveTracksImOn } from '../tracksImOn';

describe('resolveTracksImOn — the tracks the height commands act on', () => {
  it('a focused track INSIDE the selection takes the whole selection (2026-11-04)', () => {
    // A time selection dragged across three tracks leaves the focus on one of them
    expect(resolveTracksImOn(3, 2, [0, 1, 2])).toEqual([0, 1, 2]);
    expect(resolveTracksImOn(3, 0, [2, 0])).toEqual([0, 2]);
  });

  it('a focused track OUTSIDE the selection acts alone', () => {
    expect(resolveTracksImOn(4, 3, [0, 1])).toEqual([3]);
  });

  it('a focused track with no selection acts alone', () => {
    expect(resolveTracksImOn(3, 1, [])).toEqual([1]);
  });

  it('no focus: the selection; neither: every track', () => {
    expect(resolveTracksImOn(3, null, [1, 2])).toEqual([1, 2]);
    expect(resolveTracksImOn(3, undefined, [])).toEqual([0, 1, 2]);
  });

  it('ignores indices past the end of the track list', () => {
    expect(resolveTracksImOn(2, 5, [0, 7])).toEqual([0]);
  });
});
