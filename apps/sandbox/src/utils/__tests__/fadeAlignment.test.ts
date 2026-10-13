import { describe, it, expect } from 'vitest';
import { nearestFadeAlignment, nearestClipEdge, nearestClipEdgeOnOtherTracks, FADE_ALIGN_THRESHOLD_PX } from '../fadeAlignment';

describe('nearestClipEdgeOnOtherTracks — a fade boundary\'s alignment targets (2026-10-01)', () => {
  const tracks = [
    { clips: [{ start: 1, duration: 4 }] },                 // the fade's own track: 1..5
    { clips: [{ start: 4, duration: 2 }], midiClips: [{ start: 0.5, duration: 1 }] }, // 4..6, MIDI 0.5..1.5
    { clips: [{ start: 2.95, duration: 0.5 }] },            // 2.95..3.45
  ];

  it('finds the nearest start or end on another track within reach, audio or MIDI', () => {
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 4.04, 0.06)).toBe(4);
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 5.97, 0.06)).toBe(6);
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 1.46, 0.06)).toBe(1.5); // the MIDI clip's end
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 3.0, 0.06)).toBe(2.95);
  });

  it('nothing in reach is null; the threshold is exclusive', () => {
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 3.7, 0.06)).toBeNull();
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 4.07, 0.06)).toBeNull();
  });

  it('the fade\'s own track is left out — its own edges and its neighbours\' are not targets', () => {
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 1.0, 0.06)).toBeNull(); // own start
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 5.0, 0.06)).toBeNull(); // own end
    expect(nearestClipEdgeOnOtherTracks(tracks, 1, 4.0, 0.06)).toBeNull(); // track 1's own clip
    expect(nearestClipEdgeOnOtherTracks(tracks, 1, 5.0, 0.06)).toBe(5);    // …but track 0's end is
  });

  it('picks the closest when several are in reach', () => {
    expect(nearestClipEdgeOnOtherTracks(tracks, 0, 3.4, 0.1)).toBe(3.45);
  });

  it('uses the clip drag\'s threshold', () => {
    expect(FADE_ALIGN_THRESHOLD_PX).toBe(6);
  });
});

describe('nearestClipEdge — the cursor\'s magnet, every track (2026-10-07)', () => {
  const tracks = [
    { clips: [{ start: 1, duration: 2 }] },
    { clips: [{ start: 5, duration: 1 }] },
  ];
  it('finds the nearest clip start or end on any track within reach, else null', () => {
    expect(nearestClipEdge(tracks, 1.04, 0.06)).toBe(1);
    expect(nearestClipEdge(tracks, 2.95, 0.06)).toBe(3);
    expect(nearestClipEdge(tracks, 6.05, 0.06)).toBe(6);
    expect(nearestClipEdge(tracks, 4, 0.06)).toBeNull();
  });
});

describe('nearestFadeAlignment — the playhead joins the fade boundary\'s targets (2026-10-13)', () => {
  const tracks = [
    { clips: [{ start: 0, duration: 4 }] },
    { clips: [{ start: 2, duration: 2 }] },
  ];
  it('snaps to the playhead within reach, to the nearer of it and a clip edge, and to neither out of reach', () => {
    // Near the playhead alone
    expect(nearestFadeAlignment(tracks, 0, 1.02, 0.06, 1)).toBe(1);
    // Nearer the other track's clip edge (2) than the playhead (2.05)
    expect(nearestFadeAlignment(tracks, 0, 2.01, 0.06, 2.05)).toBe(2);
    // Nearer the playhead than the edge
    expect(nearestFadeAlignment(tracks, 0, 2.04, 0.06, 2.05)).toBe(2.05);
    // A tie goes to the playhead
    expect(nearestFadeAlignment(tracks, 0, 2.025, 0.06, 2.05)).toBe(2.05);
    // Out of reach of both
    expect(nearestFadeAlignment(tracks, 0, 1, 0.06, 3)).toBeNull();
    // No playhead: the edge rule alone
    expect(nearestFadeAlignment(tracks, 0, 2.01, 0.06, null)).toBe(2);
  });
});
