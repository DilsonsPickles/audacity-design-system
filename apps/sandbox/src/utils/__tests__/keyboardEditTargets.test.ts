import { describe, it, expect } from 'vitest';
import { keyboardEditTargets } from '../keyboardEditTargets';

const clip = (id: number, selected = false) => ({ id, start: 0, duration: 2, selected });

describe('keyboardEditTargets — what [ ] on a focused clip edits (2026-10-01, the mouse trim\'s rule)', () => {
  const tracks = [
    { clips: [clip(1, true), clip(2)] },
    { clips: [clip(3, true)], midiClips: [clip(4, true), clip(5)] },
  ];

  it('an UNSELECTED focused clip edits alone — whatever else is selected', () => {
    expect(keyboardEditTargets(tracks, 0, 2)).toEqual([{ trackIndex: 0, clip: clip(2) }]);
    expect(keyboardEditTargets(tracks, 1, 5)).toEqual([{ trackIndex: 1, clip: clip(5) }]);
  });

  it('a SELECTED focused clip edits with every selected clip, audio and MIDI, on every track — once each', () => {
    const ids = keyboardEditTargets(tracks, 0, 1).map((t) => `${t.trackIndex}-${t.clip.id}`);
    expect(ids).toEqual(['0-1', '1-3', '1-4']);
  });

  it('no such clip: nothing', () => {
    expect(keyboardEditTargets(tracks, 0, 99)).toEqual([]);
  });
});
