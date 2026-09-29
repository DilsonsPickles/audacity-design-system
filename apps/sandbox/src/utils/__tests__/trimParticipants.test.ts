import { describe, it, expect } from 'vitest';
import { buildTrimParticipants } from '../trimParticipants';
import type { Track } from '../../contexts/TracksContext';

const clip = (id: number, start: number, duration: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start, duration, envelopePoints: [], ...extra });
const tracks = (): Track[] => ([
  { id: 1, name: 'A', clips: [clip(1, 0, 4, { selected: true }), clip(2, 5, 4), clip(3, 10, 2, { selected: true, trimStart: 1, fullDuration: 6 })] },
  { id: 2, name: 'B', clips: [clip(4, 0, 3, { selected: true, stretchFactor: 2 }), clip(5, 4, 3)] },
] as unknown as Track[]);

describe('buildTrimParticipants — who a trim drag moves', () => {
  it('an UNSELECTED clip trims alone, whatever else is selected', () => {
    const map = buildTrimParticipants(tracks(), 0, 2);
    expect([...map.keys()]).toEqual(['0-2']);
    expect(map.get('0-2')).toEqual({ trimStart: 0, duration: 4, start: 5, fullDuration: 4, isMidi: false, stretchFactor: 1 });
  });

  it('a SELECTED clip trims with every selected clip, across tracks', () => {
    const map = buildTrimParticipants(tracks(), 0, 1);
    expect([...map.keys()].sort()).toEqual(['0-1', '0-3', '1-4']);
    // Stored trim and source length are carried; a stretched clip's
    // source length is recovered from its visible one
    expect(map.get('0-3')).toMatchObject({ trimStart: 1, fullDuration: 6 });
    expect(map.get('1-4')).toMatchObject({ stretchFactor: 2, fullDuration: 1.5 });
  });

  it('the same clip id on another track is a different clip', () => {
    const t = tracks();
    (t[1].clips[1] as unknown as { id: number }).id = 2;
    expect([...buildTrimParticipants(t, 0, 2).keys()]).toEqual(['0-2']);
    expect([...buildTrimParticipants(t, 1, 2).keys()]).toEqual(['1-2']);
  });

  it('nothing to trim: an empty list', () => {
    expect(buildTrimParticipants(tracks(), 0, 99).size).toBe(0);
    expect(buildTrimParticipants(tracks(), 7, 1).size).toBe(0);
  });
});
