import { describe, it, expect } from 'vitest';
import { normalizeClipZOrder, normalizeTracksZOrder } from '../clipZOrder';
import type { Clip, Track } from '../../contexts/TracksContext';

const clip = (id: number, start: number, duration: number): Clip => ({
  id,
  name: `Clip ${id}`,
  start,
  duration,
  envelopePoints: [],
});

const ids = (clips: Clip[]) => clips.map((c) => c.id);

describe('normalizeClipZOrder', () => {
  it('edge overlap: the right-most clip goes on top, even when the left one was raised last', () => {
    // clip 2 starts later but sits BELOW (earlier in array) after clip 1
    // was dragged (raised): normalization restacks 2 on top
    const result = normalizeClipZOrder([clip(2, 3, 4), clip(1, 0, 5)]);
    expect(ids(result)).toEqual([1, 2]);
  });

  it('already-correct edge stacks return the same array reference', () => {
    const clips = [clip(1, 0, 5), clip(2, 3, 4)];
    expect(normalizeClipZOrder(clips)).toBe(clips);
  });

  it('containment keeps the move-controlled order — both directions', () => {
    // contained clip on top (dropped in): stays on top
    const onTop = [clip(1, 0, 10), clip(2, 3, 2)];
    expect(normalizeClipZOrder(onTop)).toBe(onTop);
    // contained clip underneath (container moved over it): stays under
    const underneath = [clip(2, 3, 2), clip(1, 0, 10)];
    expect(normalizeClipZOrder(underneath)).toBe(underneath);
  });

  it('an edge chain stacks left to right regardless of input order', () => {
    // 1: 0..5, 2: 4..9, 3: 8..12 — arrive fully shuffled
    const result = normalizeClipZOrder([clip(3, 8, 4), clip(1, 0, 5), clip(2, 4, 5)]);
    expect(ids(result)).toEqual([1, 2, 3]);
  });

  it('disjoint clips are never reordered', () => {
    const clips = [clip(2, 10, 3), clip(1, 0, 5)];
    expect(normalizeClipZOrder(clips)).toBe(clips);
  });

  it('mixed: edge pair reorders while an unrelated containment pair keeps its order', () => {
    // 1: 0..5 edge-overlaps 2: 4..9; 3: 20..30 contains 4: 22..24 with 4 UNDER 3
    const result = normalizeClipZOrder([
      clip(4, 22, 2),
      clip(2, 4, 5),
      clip(3, 20, 10),
      clip(1, 0, 5),
    ]);
    // edge: 1 below 2; containment: 4 stays below 3
    expect(ids(result).indexOf(1)).toBeLessThan(ids(result).indexOf(2));
    expect(ids(result).indexOf(4)).toBeLessThan(ids(result).indexOf(3));
  });
});

describe('normalizeTracksZOrder', () => {
  it('is identity-preserving per track and for the whole array', () => {
    const untouched: Track = { id: 1, name: 'A', clips: [clip(1, 0, 5), clip(2, 3, 4)] };
    const violating: Track = { id: 2, name: 'B', clips: [clip(4, 3, 4), clip(3, 0, 5)] };
    const cleanTracks = [untouched];
    expect(normalizeTracksZOrder(cleanTracks)).toBe(cleanTracks);

    const mixed = [untouched, violating];
    const result = normalizeTracksZOrder(mixed);
    expect(result).not.toBe(mixed);
    expect(result[0]).toBe(untouched);
    expect(ids(result[1].clips)).toEqual([3, 4]);
  });
});
