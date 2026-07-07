import { describe, it, expect } from 'vitest';
import { computeWholeGroupIds, regroupCopiedClips, mintGroupId } from '../clipGroupCopy';
import type { Clip, Track } from '../../contexts/TracksContext';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: '',
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const trackOf = (...clips: Clip[]): Track => ({ id: 1, name: 't', clips } as Track);

describe('mintGroupId', () => {
  it('returns distinct non-empty ids', () => {
    const a = mintGroupId();
    const b = mintGroupId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('computeWholeGroupIds', () => {
  const g1a = clip({ id: 1, groupId: 'g1', start: 0 });
  const g1b = clip({ id: 2, groupId: 'g1', start: 2 });
  const loner = clip({ id: 3 });

  it('reports a group whole when every member is in the copied set', () => {
    const tracks = [trackOf(g1a, g1b, loner)];
    expect(computeWholeGroupIds([g1a, g1b], tracks)).toEqual(new Set(['g1']));
  });

  it('reports nothing when only some members are copied (partial -> ungrouped)', () => {
    const tracks = [trackOf(g1a, g1b)];
    expect(computeWholeGroupIds([g1a], tracks).size).toBe(0);
  });

  it('counts members across tracks (cross-track group, one track copied -> partial)', () => {
    const tracks = [trackOf(g1a), trackOf(g1b)];
    expect(computeWholeGroupIds([g1a], tracks).size).toBe(0);
    expect(computeWholeGroupIds([g1a, g1b], tracks)).toEqual(new Set(['g1']));
  });

  it('ungrouped copied clips contribute nothing', () => {
    const tracks = [trackOf(g1a, g1b, loner)];
    expect(computeWholeGroupIds([loner], tracks).size).toBe(0);
  });

  it('time range: whole only when every member is covered untrimmed (rule 4)', () => {
    // g1a spans [0,1), g1b spans [2,3)
    const tracks = [trackOf(g1a, g1b)];
    // Range covers both entirely -> whole
    expect(
      computeWholeGroupIds([g1a, g1b], tracks, { startTime: 0, endTime: 3 })
    ).toEqual(new Set(['g1']));
    // Range slices g1b (ends mid-clip) -> the fragment is not the member -> not whole
    expect(
      computeWholeGroupIds([g1a, g1b], tracks, { startTime: 0, endTime: 2.5 }).size
    ).toBe(0);
  });

  it('handles multiple groups independently', () => {
    const g2a = clip({ id: 4, groupId: 'g2' });
    const g2b = clip({ id: 5, groupId: 'g2' });
    const tracks = [trackOf(g1a, g1b, g2a, g2b)];
    expect(computeWholeGroupIds([g1a, g1b, g2a], tracks)).toEqual(new Set(['g1']));
  });
});

describe('regroupCopiedClips', () => {
  it('whole group -> one fresh shared groupId, never the original (rules 1+2)', () => {
    const copies = [clip({ id: 10, groupId: 'g1' }), clip({ id: 11, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set(['g1']));
    expect(out[0].groupId).toBeDefined();
    expect(out[0].groupId).toBe(out[1].groupId);
    expect(out[0].groupId).not.toBe('g1');
  });

  it('partial group -> ungrouped (rule 3)', () => {
    const copies = [clip({ id: 10, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set());
    expect(out[0].groupId).toBeUndefined();
  });

  it('two whole groups get two distinct fresh ids', () => {
    const copies = [
      clip({ id: 10, groupId: 'g1' }), clip({ id: 11, groupId: 'g1' }),
      clip({ id: 12, groupId: 'g2' }), clip({ id: 13, groupId: 'g2' }),
    ];
    const out = regroupCopiedClips(copies, new Set(['g1', 'g2']));
    expect(out[0].groupId).toBe(out[1].groupId);
    expect(out[2].groupId).toBe(out[3].groupId);
    expect(out[0].groupId).not.toBe(out[2].groupId);
  });

  it('whole group whose copies dwindled below 2 -> ungrouped (rule 5)', () => {
    // e.g. paste dropped sibling copies (out-of-range destination track)
    const copies = [clip({ id: 10, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set(['g1']));
    expect(out[0].groupId).toBeUndefined();
  });

  it('ungrouped copies stay ungrouped; original order preserved', () => {
    const copies = [clip({ id: 10 }), clip({ id: 11, groupId: 'g1' }), clip({ id: 12, groupId: 'g1' })];
    const out = regroupCopiedClips(copies, new Set(['g1']));
    expect(out.map(c => c.id)).toEqual([10, 11, 12]);
    expect(out[0].groupId).toBeUndefined();
  });

  it('successive calls mint different fresh ids (paste twice != one group)', () => {
    const copies = [clip({ id: 10, groupId: 'g1' }), clip({ id: 11, groupId: 'g1' })];
    const first = regroupCopiedClips(copies, new Set(['g1']));
    const second = regroupCopiedClips(copies, new Set(['g1']));
    expect(first[0].groupId).not.toBe(second[0].groupId);
  });
});
