import { describe, it, expect } from 'vitest';
import { calculateTrackYOffset } from '../trackLayout';
import type { Track } from '../trackLayout';

describe('calculateTrackYOffset', () => {
  const tracks: Track[] = [
    { height: 100 },
    { height: 150 },
    {}, // no height — uses default
    { height: 80 },
  ];

  it('returns topGap for track 0', () => {
    expect(calculateTrackYOffset(0, tracks, 10, 5)).toBe(10);
  });

  it('accounts for first track height and gap for track 1', () => {
    // topGap(10) + track0(100) + gap(5) = 115
    expect(calculateTrackYOffset(1, tracks, 10, 5)).toBe(115);
  });

  it('uses default height (114) for tracks without explicit height', () => {
    // 10 + 100 + 5 + 150 + 5 = 270 (offset of track 2)
    expect(calculateTrackYOffset(2, tracks, 10, 5)).toBe(270);
    // track 2 has no height → uses 114
    // 270 + 114 + 5 = 389 (offset of track 3)
    expect(calculateTrackYOffset(3, tracks, 10, 5)).toBe(389);
  });

  it('uses custom default height', () => {
    const tracks: Track[] = [{}, {}];
    // topGap(0) + track0(200) + gap(0) = 200
    expect(calculateTrackYOffset(1, tracks, 0, 0, 200)).toBe(200);
  });

  it('returns topGap for empty tracks at index 0', () => {
    expect(calculateTrackYOffset(0, [], 20, 5)).toBe(20);
  });
});
