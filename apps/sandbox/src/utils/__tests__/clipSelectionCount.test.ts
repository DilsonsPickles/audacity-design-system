import { describe, it, expect } from 'vitest';
import { countSelectedClips } from '../clipSelectionCount';

describe('countSelectedClips — the single-selection test for the handles (2026-10-01)', () => {
  it('counts selected audio and MIDI clips across every track', () => {
    expect(countSelectedClips([])).toBe(0);
    expect(countSelectedClips([{ clips: [{ selected: true }, {}] }, { midiClips: [{ selected: true }] }])).toBe(2);
    expect(countSelectedClips([{ clips: [{ selected: true }] }, { clips: [{ selected: false }] }])).toBe(1);
  });
});
