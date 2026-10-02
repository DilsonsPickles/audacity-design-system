import { describe, it, expect } from 'vitest';
import { MIXED } from '@audacity-ui/components';
import { mergeSelectedClips, selectedClipEntries } from '../clipPropertiesSelection';
import type { Clip } from '../../contexts/TracksContext';

const clip = (over: Partial<Clip> & { id: number }): Clip => ({ name: `C${over.id}`, start: 0, duration: 1, envelopePoints: [], ...over });

describe('clipPropertiesSelection — the panel\'s view of several clips (2026-10-02)', () => {
  it('lists the selected clips in track order with their track names', () => {
    const tracks = [
      { name: 'Track 1', clips: [clip({ id: 1 }), clip({ id: 2, selected: true })] },
      { name: 'Track 2', clips: [clip({ id: 3, selected: true })] },
    ];
    expect(selectedClipEntries(tracks).map((e) => [e.trackIndex, e.trackName, e.clip.id])).toEqual([[0, 'Track 1', 2], [1, 'Track 2', 3]]);
  });

  it('merges: shared values stay, differing ones are MIXED; the span is first start to last end', () => {
    const entries = [
      { trackIndex: 0, trackName: 'Track 1', clip: clip({ id: 1, start: 1, duration: 2, fadeIn: 0.5, fadeOut: 0, pitchSemitones: 2, ownColor: 'red' }) },
      { trackIndex: 1, trackName: 'Track 2', clip: clip({ id: 2, start: 2.5, duration: 4, fadeIn: 0.5, fadeOut: 1, pitchSemitones: 2 }) },
      { trackIndex: 1, trackName: 'Track 2', clip: clip({ id: 3, start: 0.5, duration: 1, fadeIn: 0.5, fadeOut: 0, pitchSemitones: 2, ownColor: 'red' }) },
    ];
    const m = mergeSelectedClips(entries, 'track');
    expect(m.count).toBe(3);
    expect(m.trackNames).toEqual(['Track 1', 'Track 2']);
    expect([m.start, m.end]).toEqual([0.5, 6.5]);
    expect(m.fadeIn).toBe(0.5);
    expect(m.fadeOut).toBe(MIXED);
    expect(m.pitchSemitones).toBe(2);
    expect(m.color).toBe(MIXED); // red, track, red
    expect(m.stretchFactor).toBe(1);
    expect(m.fadeInShapeId).toBe('default'); // all unauthored = the default S-curve
  });

  it('a colour nobody overrides reads as the track colour, agreed', () => {
    const entries = [1, 2].map((id) => ({ trackIndex: 0, trackName: 'T', clip: clip({ id }) }));
    expect(mergeSelectedClips(entries, 'track').color).toBe('track');
  });
});
