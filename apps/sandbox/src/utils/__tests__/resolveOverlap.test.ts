import { describe, it, expect } from 'vitest';
import { resolveOverlap, ResolverTrack, ClipPlacement } from '../resolveOverlap';

const track = (clips: Array<{ id: number; start: number; duration: number; trimStart?: number }>): ResolverTrack => ({
  clips: clips.map(c => ({ trimStart: 0, ...c })),
});

describe('resolveOverlap', () => {
  it('returns no mutations when intent does not overlap any clip', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 10, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
    expect(result.placements).toEqual(intent);
  });

  it('returns no mutations when intent is exactly adjacent (touching but not overlapping)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 5, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
  });

  it('does not produce a mutation against a clip in movingClipIds (selected clips do not eat each other)', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 5 },
        { id: 2, start: 3, duration: 4 },
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 1, trackIndex: 0, start: 0, duration: 5 },
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([1, 2]));
    expect(result.mutations).toEqual([]);
  });
});
