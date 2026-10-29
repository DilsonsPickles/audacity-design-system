import { describe, it, expect } from 'vitest';
import { collapseTracks, expandTracks, resetTracks, COLLAPSED_TRACK_HEIGHT, type HeightMemory } from '../trackHeightMemory';

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

  it('expand leaves an OPEN track alone, shorter or taller than the default — it only undoes a collapse (Audacity 3, 2026-10-29)', () => {
    const memory: HeightMemory = new Map();
    const open = [{ id: 'a', height: 80 }, { id: 'b', height: 300 }, { id: 'c', height: 114 }];
    expect(expandTracks(open, [0, 1, 2], memory)).toEqual([]);
  });

  it('a remembered height counts only while the track is still collapsed: collapse, fit, expand gives the default', () => {
    const memory: HeightMemory = new Map([['a', 200], ['b', 114]]);
    const mixed = [{ id: 'a', height: 80 }, { id: 'b', height: 44 }, { id: 'c', height: 160 }];
    expect(expandTracks(mixed, [0, 1, 2], memory)).toEqual([
      // a is open (fitted to 80 since): left alone; c too
      { index: 1, height: 114 },
    ]);
    expect(memory.size).toBe(0); // the stale memory for a is gone with it
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

  it('reset takes every target to the default whatever it is, and forgets a collapse (2026-10-29, "so perhaps we want a reset?")', () => {
    const memory: HeightMemory = new Map([['b', 200]]);
    const tracks = [{ id: 'a', height: 300 }, { id: 'b', height: 44 }, { id: 'c', height: 114 }, { id: 'd' }];
    expect(resetTracks(tracks, [0, 1, 2, 3], memory)).toEqual([
      { index: 0, height: 114 },
      { index: 1, height: 114 },
    ]);
    expect(memory.size).toBe(0);
  });
});
