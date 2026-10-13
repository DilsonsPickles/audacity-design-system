import { describe, it, expect } from 'vitest';
import { computeFadeToTime } from '../fadeToPlayhead';

const targets = [
  { trackIndex: 0, clipId: 1, start: 1, duration: 4 }, // 1..5
  { trackIndex: 1, clipId: 2, start: 3, duration: 1 }, // 3..4
];

describe('computeFadeToTime — a fade boundary to the playhead (2026-10-13)', () => {
  it('each target\'s fade-in reaches the same playhead by its own length; a clip the playhead is not inside is refused, not clamped', () => {
    expect(computeFadeToTime(targets, 'in', 2)).toEqual([{ trackIndex: 0, clipId: 1, seconds: 1 }]);
    expect(computeFadeToTime(targets, 'in', 3.5)).toEqual([
      { trackIndex: 0, clipId: 1, seconds: 2.5 },
      { trackIndex: 1, clipId: 2, seconds: 0.5 },
    ]);
  });
  it('the fade-out is measured from the clip\'s end', () => {
    expect(computeFadeToTime(targets, 'out', 3.5)).toEqual([
      { trackIndex: 0, clipId: 1, seconds: 1.5 },
      { trackIndex: 1, clipId: 2, seconds: 0.5 },
    ]);
  });
  it('a playhead at or outside a clip\'s edges moves nothing for it', () => {
    expect(computeFadeToTime(targets, 'in', 1)).toEqual([]);
    expect(computeFadeToTime(targets, 'out', 5)).toEqual([]);
    expect(computeFadeToTime(targets, 'in', 0)).toEqual([]);
    expect(computeFadeToTime(targets, 'out', 9)).toEqual([]);
  });
});
