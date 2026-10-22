import { describe, it, expect } from 'vitest';
import { collapseTracks, expandTracks, COLLAPSED_TRACK_HEIGHT, type HeightMemory } from '../trackHeightMemory';

const tracks = [
  { id: 'a', height: 200 },
  { id: 'b' }, // the default, 114
  { id: 'c', height: COLLAPSED_TRACK_HEIGHT },
];

describe('collapse remembers, expand restores (2026-10-22)', () => {
  it('collapse takes every open target to 44 and remembers what it was; an already collapsed track is left as it is', () => {
    const memory: HeightMemory = new Map();
    expect(collapseTracks(tracks, [0, 1, 2], memory)).toEqual([
      { index: 0, height: 44 },
      { index: 1, height: 44 },
    ]);
    expect([...memory]).toEqual([['a', 200], ['b', 114]]);
  });

  it('expand puts collapsed tracks back to their remembered height, the default when there is none', () => {
    const memory: HeightMemory = new Map([['a', 200]]);
    const collapsed = tracks.map((t) => ({ ...t, height: 44 }));
    expect(expandTracks(collapsed, [0, 1, 2], memory)).toEqual([
      { index: 0, height: 200 },
      { index: 1, height: 114 },
      { index: 2, height: 114 },
    ]);
    expect(memory.size).toBe(0); // used up
  });

  it('expand leaves a track that is not collapsed alone — dragged to a height since, it is not ours', () => {
    const memory: HeightMemory = new Map([['a', 200], ['b', 114]]);
    const mixed = [{ id: 'a', height: 80 }, { id: 'b', height: 44 }, { id: 'c', height: 160 }];
    expect(expandTracks(mixed, [0, 1, 2], memory)).toEqual([{ index: 1, height: 114 }]);
    expect(memory.get('a')).toBe(200); // kept for a later collapse/expand
  });

  it('a round trip gives the layout back', () => {
    const memory: HeightMemory = new Map();
    const down = collapseTracks(tracks, [0, 1], memory);
    const collapsed = tracks.map((t, i) => ({ ...t, height: down.find((u) => u.index === i)?.height ?? t.height }));
    expect(expandTracks(collapsed, [0, 1], memory)).toEqual([{ index: 0, height: 200 }, { index: 1, height: 114 }]);
  });

  it('only the targets are touched', () => {
    const memory: HeightMemory = new Map();
    expect(collapseTracks(tracks, [1], memory)).toEqual([{ index: 1, height: 44 }]);
    expect(memory.has('a')).toBe(false);
  });
});
