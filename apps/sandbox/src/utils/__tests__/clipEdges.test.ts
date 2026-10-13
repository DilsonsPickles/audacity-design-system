import { describe, it, expect } from 'vitest';
import { clipEdgesOf, nextClipEdge, prevClipEdge } from '../clipEdges';

const tracks = [
  { clips: [{ start: 1, duration: 2 }, { start: 5, duration: 1 }] }, // 1..3, 5..6
  { clips: [{ start: 3, duration: 1 }], midiClips: [{ start: 8, duration: 2 }] }, // 3..4, 8..10
];

describe('clip edges across every track (2026-10-13)', () => {
  it('collects every start and end, deduplicated and sorted', () => {
    expect(clipEdgesOf(tracks)).toEqual([1, 3, 4, 5, 6, 8, 10]);
    expect(clipEdgesOf([])).toEqual([]);
  });
  it('steps to the next and previous edge, past one the time sits on', () => {
    expect(nextClipEdge(tracks, 0)).toBe(1);
    expect(nextClipEdge(tracks, 3)).toBe(4);
    expect(nextClipEdge(tracks, 3.00005)).toBe(4);
    expect(nextClipEdge(tracks, 10)).toBeNull();
    expect(prevClipEdge(tracks, 3)).toBe(1);
    expect(prevClipEdge(tracks, 11)).toBe(10);
    expect(prevClipEdge(tracks, 1)).toBeNull();
  });
});
