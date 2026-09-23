import { describe, it, expect } from 'vitest';
import { clipsInMarquee, type MarqueeHitContext } from '../useMarqueeSelection';
import type { Track } from '../../contexts/TracksContext';

// Layout used throughout: topGap=2, trackGap=2, defaultTrackHeight=100,
// clipContentOffset=0, pixelsPerSecond=100 (so 1px = 10ms).
// Plain tracks stack at y = 2, 104, 206, ...
const ctx = (tracks: Track[]): MarqueeHitContext => ({
  tracks,
  pixelsPerSecond: 100,
  clipContentOffset: 0,
  topGap: 2,
  trackGap: 2,
  defaultTrackHeight: 100,
});

const clip = (id: number, start: number, duration: number) => ({
  id,
  name: `c${id}`,
  start,
  duration,
  envelopePoints: [],
});

const plainTracks = [
  { id: 1, name: 'a', height: 100, clips: [clip(10, 0, 1), clip(11, 2, 1)] },
  { id: 2, name: 'b', height: 100, clips: [clip(20, 0.5, 1)] },
] as unknown as Track[];

describe('clipsInMarquee', () => {
  it('picks every clip whose time span overlaps the rectangle', () => {
    // x 0..150 = 0..1.5s, y covers track 0 only.
    const picks = clipsInMarquee({ left: 0, top: 0, width: 150, height: 50 }, ctx(plainTracks));
    expect(picks).toEqual([{ trackIndex: 0, clipId: 10 }]);
  });

  it('counts partial overlap, not containment', () => {
    // x 250..350 = 2.5..3.5s; clip 11 runs 2..3s — it only half-overlaps.
    const picks = clipsInMarquee({ left: 250, top: 0, width: 100, height: 50 }, ctx(plainTracks));
    expect(picks).toEqual([{ trackIndex: 0, clipId: 11 }]);
  });

  it('spans tracks whose drawn band the rectangle touches', () => {
    const picks = clipsInMarquee({ left: 0, top: 0, width: 150, height: 200 }, ctx(plainTracks));
    expect(picks).toEqual([
      { trackIndex: 0, clipId: 10 },
      { trackIndex: 1, clipId: 20 },
    ]);
  });

  it('skips a track the rectangle misses vertically', () => {
    // y 110..150 sits below track 0 (ends at 102) and inside track 1.
    const picks = clipsInMarquee({ left: 0, top: 110, width: 150, height: 40 }, ctx(plainTracks));
    expect(picks).toEqual([{ trackIndex: 1, clipId: 20 }]);
  });

  it('returns nothing for a rectangle over empty canvas', () => {
    const picks = clipsInMarquee({ left: 900, top: 0, width: 50, height: 200 }, ctx(plainTracks));
    expect(picks).toEqual([]);
  });

  it('includes MIDI clips alongside audio clips', () => {
    const tracks = [
      { id: 1, name: 'a', height: 100, clips: [clip(10, 0, 1)], midiClips: [clip(99, 0, 1)] },
    ] as unknown as Track[];
    const picks = clipsInMarquee({ left: 0, top: 0, width: 150, height: 50 }, ctx(tracks));
    expect(picks).toEqual([
      { trackIndex: 0, clipId: 10 },
      { trackIndex: 0, clipId: 99 },
    ]);
  });

  // Folder awareness: the highlight is the promise, so anything that
  // draws nothing must not be lassoable.
  it('cannot lasso the children of a collapsed folder', () => {
    const tracks = [
      { id: 1, type: 'folder', name: 'G', collapsed: true, clips: [] },
      { id: 2, name: 'child', folderId: 1, height: 100, clips: [clip(10, 0, 1)] },
      { id: 3, name: 'after', height: 100, clips: [clip(30, 0, 1)] },
    ] as unknown as Track[];
    // A tall rectangle over everything the canvas actually draws.
    const picks = clipsInMarquee({ left: 0, top: 0, width: 150, height: 400 }, ctx(tracks));
    expect(picks).toEqual([{ trackIndex: 2, clipId: 30 }]);
  });

  it('lassos a folder child once the folder is expanded', () => {
    const tracks = [
      { id: 1, type: 'folder', name: 'G', collapsed: false, clips: [] },
      { id: 2, name: 'child', folderId: 1, height: 100, clips: [clip(10, 0, 1)] },
    ] as unknown as Track[];
    const picks = clipsInMarquee({ left: 0, top: 0, width: 150, height: 400 }, ctx(tracks));
    expect(picks).toEqual([{ trackIndex: 1, clipId: 10 }]);
  });

  it('uses the slim folder row height, so a child below it stays reachable', () => {
    const tracks = [
      { id: 1, type: 'folder', name: 'G', collapsed: false, clips: [] },
      { id: 2, name: 'child', folderId: 1, height: 100, clips: [clip(10, 0, 1)] },
    ] as unknown as Track[];
    // The folder row is 28px tall at y=2, so the child starts at y=32.
    // A rectangle wholly inside the child's band must still find it.
    const picks = clipsInMarquee({ left: 0, top: 40, width: 150, height: 20 }, ctx(tracks));
    expect(picks).toEqual([{ trackIndex: 1, clipId: 10 }]);
  });
});
