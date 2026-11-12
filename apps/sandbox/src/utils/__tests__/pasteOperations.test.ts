import { describe, it, expect } from 'vitest';
import { rippleInsert, carveIntervals } from '../pasteOperations';
import type { Track, Clip } from '../../contexts/TracksContext';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: `c${o.id}`,
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const track = (id: number, clips: Clip[]): Track => ({ id, name: `t${id}`, clips });

const starts = (t: Track) => t.clips.map((c) => [c.start, c.start + c.duration]).sort((a, b) => a[0] - b[0]);

describe('rippleInsert (2026-11-12, the paste matrix\'s push)', () => {
  it('shifts clips at or after the anchor right by delta; earlier clips hold still', () => {
    const tracks = [track(1, [clip({ id: 1, start: 0, duration: 2 }), clip({ id: 2, start: 5, duration: 1 })])];
    const out = rippleInsert(tracks, [0], 4, 3);
    expect(starts(out[0])).toEqual([[0, 2], [8, 9]]);
  });

  it('splits a straddling clip and pushes its right half — TWO clips that STAY two (the spec\'s no-auto-join bug guard)', () => {
    const tracks = [track(1, [
      clip({ id: 1, start: 0, duration: 10, fadeIn: 1, fadeOut: 1 }),
      clip({ id: 2, start: 12, duration: 1 }),
    ])];
    const out = rippleInsert(tracks, [0], 4, 2);
    // [0..4] (keeps the fade-in), the gap 4..6, [6..12] (keeps the
    // fade-out), and the separate clip pushed to 14..15 — four edges,
    // THREE clips, nothing merged.
    expect(starts(out[0])).toEqual([[0, 4], [6, 12], [14, 15]]);
    expect(out[0].clips).toHaveLength(3);
    const left = out[0].clips.find((c) => c.start === 0)!;
    const right = out[0].clips.find((c) => c.start === 6)!;
    expect(left.fadeIn).toBe(1);
    expect(left.fadeOut ?? 0).toBe(0); // a split edge grows no fade
    expect(right.fadeIn ?? 0).toBe(0);
    expect(right.fadeOut).toBe(1);
    // The right half plays on from where it was cut (source continuity)
    expect(right.trimStart).toBe(4);
  });

  it('touches only the listed tracks', () => {
    const tracks = [
      track(1, [clip({ id: 1, start: 5, duration: 1 })]),
      track(2, [clip({ id: 2, start: 5, duration: 1 })]),
    ];
    const out = rippleInsert(tracks, [0], 0, 2);
    expect(starts(out[0])).toEqual([[7, 8]]);
    expect(starts(out[1])).toEqual([[5, 6]]);
  });

  it('a clip starting exactly at the anchor shifts whole (no split)', () => {
    const tracks = [track(1, [clip({ id: 1, start: 4, duration: 2 })])];
    const out = rippleInsert(tracks, [0], 4, 3);
    expect(starts(out[0])).toEqual([[7, 9]]);
    expect(out[0].clips).toHaveLength(1);
  });
});

describe('carveIntervals (2026-11-12, the paste matrix\'s overlap landing)', () => {
  it('carves each interval on its own track only', () => {
    const tracks = [
      track(1, [clip({ id: 1, start: 0, duration: 10 })]),
      track(2, [clip({ id: 2, start: 0, duration: 10 })]),
    ];
    const out = carveIntervals(tracks, [{ trackIndex: 0, start: 2, end: 4 }]);
    expect(starts(out[0])).toEqual([[0, 2], [4, 10]]);
    expect(starts(out[1])).toEqual([[0, 10]]);
  });

  it('gaps between intervals delete nothing', () => {
    const tracks = [track(1, [clip({ id: 1, start: 0, duration: 10 })])];
    const out = carveIntervals(tracks, [
      { trackIndex: 0, start: 1, end: 2 },
      { trackIndex: 0, start: 4, end: 5 },
    ]);
    // Audio between 2 and 4 survives: three remaining pieces
    expect(starts(out[0])).toEqual([[0, 1], [2, 4], [5, 10]]);
  });
});
