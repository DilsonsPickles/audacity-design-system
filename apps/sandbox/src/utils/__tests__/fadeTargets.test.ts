import { describe, it, expect } from 'vitest';
import { fadeTargets, clampFadeSeconds } from '../fadeTargets';
import type { Track } from '../../contexts/TracksContext';

const clip = (id: number, duration: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start: 0, duration, envelopePoints: [], ...extra });
const tracks = (): Track[] => ([
  { id: 1, name: 'A', clips: [clip(1, 4, { selected: true }), clip(2, 4), clip(3, 1, { selected: true, fadeOut: 0.5 })] },
  { id: 2, name: 'B', clips: [clip(4, 4, { selected: true })] },
  { id: 3, name: 'L', type: 'label', clips: [clip(5, 4, { selected: true })] },
] as unknown as Track[]);

describe('fadeTargets — which clips a quick-fade edit applies to', () => {
  it('a selected clip: every selected audio clip, across tracks', () => {
    expect(fadeTargets(tracks(), 0, 1)).toEqual([
      { trackIndex: 0, clipId: 1 }, { trackIndex: 0, clipId: 3 }, { trackIndex: 1, clipId: 4 },
    ]);
  });
  it('an unselected clip: that clip alone', () => {
    expect(fadeTargets(tracks(), 0, 2)).toEqual([{ trackIndex: 0, clipId: 2 }]);
  });
  it('a clip that is not there: nothing', () => {
    expect(fadeTargets(tracks(), 0, 99)).toEqual([]);
  });
});

describe('clampFadeSeconds — each clip takes what it has room for', () => {
  it('a long clip takes the full length; a short one stops at its own room', () => {
    expect(clampFadeSeconds(tracks(), { trackIndex: 0, clipId: 1 }, 'in', 2.5)).toBe(2.5);
    // clip 3: 1s long with a 0.5s fade out → 0.5s of room for a fade in
    expect(clampFadeSeconds(tracks(), { trackIndex: 0, clipId: 3 }, 'in', 2.5)).toBe(0.5);
    // …and its fade out is not limited by its own fade out
    expect(clampFadeSeconds(tracks(), { trackIndex: 0, clipId: 3 }, 'out', 0.8)).toBe(0.8);
  });
  it('tiny fades snap away, as the handle does', () => {
    expect(clampFadeSeconds(tracks(), { trackIndex: 0, clipId: 1 }, 'in', 0.01)).toBe(0);
    expect(clampFadeSeconds(tracks(), { trackIndex: 0, clipId: 1 }, 'in', -1)).toBe(0);
  });
});
