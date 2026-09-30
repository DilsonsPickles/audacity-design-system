import { describe, it, expect } from 'vitest';
import { cloneClipsInPlace } from '../cloneClipsInPlace';
import type { Track } from '../../contexts/TracksContext';

const clip = (id: number, start: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start, duration: 2, envelopePoints: [], waveform: [0.1, 0.2], ...extra });
const tracks = (): Track[] => ([
  { id: 1, name: 'A', clips: [clip(1, 0, { groupId: 'g' }), clip(2, 3, { groupId: 'g' }), clip(3, 6, { sourceClipId: 1 })] },
  { id: 2, name: 'B', clips: [clip(7, 0)] },
] as unknown as Track[]);

describe('cloneClipsInPlace — copies over their sources, for a duplicating drag', () => {
  it('each copy sits where its source sits, with a fresh id, selected, sharing the source audio', () => {
    const t = tracks();
    const copies = cloneClipsInPlace(t, [{ trackIndex: 0, clipId: 1 }, { trackIndex: 1, clipId: 7 }]);
    expect(copies.map((c) => [c.trackIndex, c.clip.start, c.from])).toEqual([
      [0, 0, { trackIndex: 0, clipId: 1 }],
      [1, 0, { trackIndex: 1, clipId: 7 }],
    ]);
    expect(copies.map((c) => c.clip.id)).toEqual([8, 9]); // past every id in use
    for (const c of copies) {
      expect(c.clip.selected).toBe(true);
      expect(c.clip.waveform).toBe(t[c.trackIndex].clips.find((s) => s.id === c.from.clipId)!.waveform); // by reference
    }
    expect(copies[0].clip.sourceClipId).toBe(1);
    // A source that is itself a copy hands on the ORIGINAL's id
    expect(cloneClipsInPlace(t, [{ trackIndex: 0, clipId: 3 }])[0].clip.sourceClipId).toBe(1);
    // …and the sources themselves are untouched
    expect(t[0].clips.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it('the group invariant: a whole group copied whole becomes a fresh group; a partial copy is ungrouped', () => {
    const t = tracks();
    const whole = cloneClipsInPlace(t, [{ trackIndex: 0, clipId: 1 }, { trackIndex: 0, clipId: 2 }]);
    expect(whole[0].clip.groupId).toBeTruthy();
    expect(whole[0].clip.groupId).toBe(whole[1].clip.groupId);
    expect(whole[0].clip.groupId).not.toBe('g');
    const partial = cloneClipsInPlace(t, [{ trackIndex: 0, clipId: 1 }]);
    expect(partial[0].clip.groupId).toBeUndefined();
  });

  it('a target that does not exist gets no copy; the rest still do', () => {
    const copies = cloneClipsInPlace(tracks(), [{ trackIndex: 0, clipId: 42 }, { trackIndex: 1, clipId: 7 }]);
    expect(copies.map((c) => c.from.clipId)).toEqual([7]);
    expect(cloneClipsInPlace(tracks(), [])).toEqual([]);
  });
});
