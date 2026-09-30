import { describe, it, expect } from 'vitest';
import { computeEdgeHitZones, EDGE_HIT_INSIDE_PX, EDGE_HIT_OUTSIDE_PX } from '../clipEdgeHitZones';

const clip = (id: number, start: number, duration: number) => ({ id, start, duration });
const PPS = 100;
const zones = (clips: ReturnType<typeof clip>[], extra = {}) =>
  computeEdgeHitZones(clips, { pixelsPerSecond: PPS, ...extra });
const find = (list: ReturnType<typeof zones>, id: number, edge: 'left' | 'right') =>
  list.find((z) => z.clipId === id && z.edge === edge);

describe('computeEdgeHitZones — where a clip edge can be grabbed', () => {
  it('a zone sits ON the edge: the app\'s 5px outside it and 6px inside', () => {
    expect(EDGE_HIT_OUTSIDE_PX).toBe(5);
    expect(EDGE_HIT_INSIDE_PX).toBe(6);
    const list = zones([clip(1, 2, 3)]); // 200px..500px
    expect(list).toEqual([
      { clipId: 1, edge: 'left', edgeX: 200, left: 195, width: 11 },
      { clipId: 1, edge: 'right', edgeX: 500, left: 494, width: 11 },
    ]);
  });

  it('the inside part stays clear of where the fade handles start', () => {
    // TrackNew puts a fade handle's hit box no closer than this to the edge
    const FADE_HANDLE_BOX_FROM_EDGE = 12;
    for (const z of zones([clip(1, 2, 3)])) {
      const insideReach = z.edge === 'left' ? z.left + z.width - z.edgeX : z.edgeX - z.left;
      expect(insideReach).toBeLessThanOrEqual(FADE_HANDLE_BOX_FROM_EDGE);
    }
  });

  it('a clip at time zero still has the outside part of its left zone', () => {
    expect(find(zones([clip(1, 0, 3)]), 1, 'left')).toEqual({ clipId: 1, edge: 'left', edgeX: 0, left: -5, width: 11 });
  });

  it('clips that touch: each keeps its own side of the joint', () => {
    const list = zones([clip(1, 0, 3), clip(2, 3, 2)]); // joint at 300px
    expect(find(list, 1, 'right')).toEqual({ clipId: 1, edge: 'right', edgeX: 300, left: 294, width: 6 });
    expect(find(list, 2, 'left')).toEqual({ clipId: 2, edge: 'left', edgeX: 300, left: 300, width: 6 });
    // …whichever way round they are stacked or listed
    const flipped = zones([clip(2, 3, 2), clip(1, 0, 3)]);
    expect(find(flipped, 1, 'right')).toEqual(find(list, 1, 'right'));
    expect(find(flipped, 2, 'left')).toEqual(find(list, 2, 'left'));
  });

  it('clips a few pixels apart split the gap down the middle — the app\'s half-the-gap rule', () => {
    const list = zones([clip(1, 0, 3), clip(2, 3.06, 2)]); // 300px and 306px
    const a = find(list, 1, 'right')!;
    const b = find(list, 2, 'left')!;
    expect(a.left + a.width).toBeCloseTo(303, 9);
    expect(b.left).toBeCloseTo(303, 9);
    expect(a.left).toBe(294);
    expect(b.left + b.width).toBeCloseTo(312, 9);
  });

  it('clips 10px or more apart are left alone', () => {
    const list = zones([clip(1, 0, 3), clip(2, 3.1, 2)]);
    expect(find(list, 1, 'right')!.width).toBe(11);
    expect(find(list, 2, 'left')!.width).toBe(11);
  });

  it('no two zones ever overlap, however the clips are packed', () => {
    const packed = [clip(1, 0, 1), clip(2, 1, 0.02), clip(3, 1.02, 0.05), clip(4, 1.07, 2), clip(5, 3.08, 1)];
    const list = zones(packed).sort((a, b) => a.left - b.left);
    for (let i = 0; i + 1 < list.length; i++) {
      expect(list[i].left + list[i].width).toBeLessThanOrEqual(list[i + 1].left + 1e-9);
    }
    for (const z of list) expect(z.width).toBeGreaterThan(0);
  });

  it('a very short clip: its two zones meet at its middle and do not cross', () => {
    const list = zones([clip(1, 2, 0.04)]); // 4px wide
    expect(find(list, 1, 'left')).toEqual({ clipId: 1, edge: 'left', edgeX: 200, left: 195, width: 7 });
    expect(find(list, 1, 'right')).toEqual({ clipId: 1, edge: 'right', edgeX: 204, left: 202, width: 7 });
  });

  it('an edge under a higher clip has no zone; the higher clip\'s own edge straddles as usual', () => {
    // A 0..5 below, B 3..7 on top: A's right edge (5) is under B
    const list = zones([clip(1, 0, 5), clip(2, 3, 4)]);
    expect(find(list, 1, 'right')).toBeUndefined();
    expect(find(list, 1, 'left')!.width).toBe(11);
    expect(find(list, 2, 'left')).toEqual({ clipId: 2, edge: 'left', edgeX: 300, left: 295, width: 11 });
    expect(find(list, 2, 'right')!.width).toBe(11);
    // Stacked the other way, it is B's left edge that is buried
    const flipped = zones([clip(1, 0, 5), clip(2, 3, 4)], { zOf: (c: { id: number }) => -c.id });
    expect(find(flipped, 2, 'left')).toBeUndefined();
    expect(find(flipped, 1, 'right')!.width).toBe(11);
  });

  it('a clip with no zone of its own still keeps a neighbour\'s zone out', () => {
    // Clip 1 is (say) selected — it has handles, not zones
    const list = zones([clip(1, 0, 3), clip(2, 3, 2)], { eligible: (c: { id: number }) => c.id !== 1 });
    expect(list.filter((z) => z.clipId === 1)).toEqual([]);
    expect(find(list, 2, 'left')).toEqual({ clipId: 2, edge: 'left', edgeX: 300, left: 300, width: 6 });
  });
});
