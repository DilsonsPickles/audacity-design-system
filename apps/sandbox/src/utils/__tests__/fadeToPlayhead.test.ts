import { describe, it, expect } from 'vitest';
import { computeFadeToTime, fadeSideForTime, trackImOnOf, clipAtTime, resolveTrackFadeToPlayhead } from '../fadeToPlayhead';

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

describe('fadeSideForTime — which fade the playhead means (2026-10-13)', () => {
  const clip = { start: 1, duration: 4 }; // middle at 3
  it('the first half is the fade-in, the second the fade-out; the middle counts as the second', () => {
    expect(fadeSideForTime(clip, 1.5)).toBe('in');
    expect(fadeSideForTime(clip, 2.99)).toBe('in');
    expect(fadeSideForTime(clip, 3)).toBe('out');
    expect(fadeSideForTime(clip, 4.5)).toBe('out');
  });
});

describe('⌥F from a TRACK (2026-10-13, "a track focus and a cursor… x,y coordinates"): the clip under the playhead on the track you are on', () => {
  const tracks = [
    { name: 'Track 1', clips: [{ id: 1, start: 1, duration: 4 }, { id: 2, start: 4, duration: 2 }] }, // 1..5 under 4..6 (2 on top in the overlap)
    { name: 'Labels', type: 'label' as const, clips: [{ id: 3, start: 0, duration: 9 }] },
    { name: 'Track 3', clips: [] },
  ];
  const el = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild as Element; };
  it('reads the track from the focused header or row, else the focused track; nothing with neither', () => {
    expect(trackImOnOf(el('<div data-track-panel-index="2"><button></button></div>').querySelector('button'), 0, 3)).toBe(2);
    expect(trackImOnOf(el('<div data-track-index="1"></div>'), 0, 3)).toBe(1);
    expect(trackImOnOf(el('<button></button>'), 0, 3)).toBe(0);
    expect(trackImOnOf(null, null, 3)).toBeNull();
    expect(trackImOnOf(el('<div data-track-index="7"></div>'), 9, 3)).toBeNull();
  });
  it('finds the clip strictly under the playhead — the TOP one of an overlap — and infers the side from its halves; a label track or a bare lane is nothing', () => {
    expect(clipAtTime(tracks[0], 2)?.id).toBe(1);
    expect(clipAtTime(tracks[0], 4.5)?.id).toBe(2);
    expect(clipAtTime(tracks[0], 1)).toBeNull();
    expect(clipAtTime(tracks[0], 7)).toBeNull();
    expect(clipAtTime(tracks[1], 3)).toBeNull();
    expect(resolveTrackFadeToPlayhead(tracks, 0, null, 2)).toEqual({ trackIndex: 0, clipId: 1, side: 'in' });
    expect(resolveTrackFadeToPlayhead(tracks, 0, null, 4.5)).toEqual({ trackIndex: 0, clipId: 2, side: 'in' });
    expect(resolveTrackFadeToPlayhead(tracks, 0, null, 5.5)).toEqual({ trackIndex: 0, clipId: 2, side: 'out' });
    expect(resolveTrackFadeToPlayhead(tracks, 2, null, 2)).toBeNull();
    expect(resolveTrackFadeToPlayhead(tracks, null, el('<div data-track-panel-index="0"></div>'), 2)).toEqual({ trackIndex: 0, clipId: 1, side: 'in' });
  });
});
