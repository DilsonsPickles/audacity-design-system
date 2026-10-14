import { describe, it, expect } from 'vitest';
import { trackAudioExtent } from '../trackAudioExtent';

describe('trackAudioExtent (2026-10-14, double-click a track header)', () => {
  it('spans the first clip start to the last clip end, audio and MIDI together', () => {
    expect(trackAudioExtent({ clips: [{ start: 3, duration: 4 }, { start: 1, duration: 1 }], midiClips: [{ start: 8, duration: 2 }] }))
      .toEqual({ startTime: 1, endTime: 10 });
  });
  it('is null for a track with nothing on it', () => {
    expect(trackAudioExtent({ clips: [] })).toBeNull();
    expect(trackAudioExtent({ clips: [], midiClips: [] })).toBeNull();
  });
});
