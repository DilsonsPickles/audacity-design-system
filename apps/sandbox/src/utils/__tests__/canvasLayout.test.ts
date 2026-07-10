import { describe, it, expect } from 'vitest';
import { computeCanvasHeights } from '../canvasLayout';
import type { CanvasHeightTrack } from '../canvasLayout';

describe('computeCanvasHeights', () => {
  const opts = { topGap: 2, trackGap: 2, defaultTrackHeight: 114, bottomBuffer: 50 };

  it('sums explicit heights + default height + top gap + inter-track gaps', () => {
    const tracks: CanvasHeightTrack[] = [{ height: 100 }, { height: 150 }, {}];
    // tracksHeight = (100 + 150 + 114) + topGap(2) + trackGap(2) * (3 - 1) = 364 + 2 + 4 = 370
    const result = computeCanvasHeights(tracks, opts);
    expect(result.tracksHeight).toBe(370);
    expect(result.totalHeight).toBe(370);
    expect(result.containerHeight).toBe(370 + 50);
  });

  it('totalHeight always equals tracksHeight', () => {
    const tracks: CanvasHeightTrack[] = [{ height: 200 }];
    const result = computeCanvasHeights(tracks, opts);
    expect(result.totalHeight).toBe(result.tracksHeight);
  });

  it('containerHeight adds bottomBuffer on top of totalHeight', () => {
    const tracks: CanvasHeightTrack[] = [{ height: 50 }, { height: 60 }];
    const result = computeCanvasHeights(tracks, { ...opts, bottomBuffer: 0 });
    expect(result.containerHeight).toBe(result.totalHeight);

    const withBuffer = computeCanvasHeights(tracks, { ...opts, bottomBuffer: 25 });
    expect(withBuffer.containerHeight).toBe(withBuffer.totalHeight + 25);
  });

  it('uses defaultTrackHeight for tracks with no explicit height', () => {
    const tracks: CanvasHeightTrack[] = [{}, {}];
    // tracksHeight = (114 + 114) + 2 + 2 * (2 - 1) = 228 + 2 + 2 = 232
    const result = computeCanvasHeights(tracks, opts);
    expect(result.tracksHeight).toBe(232);
  });

  it('treats height: 0 as falsy and falls back to the default (matches || in source)', () => {
    const tracks: CanvasHeightTrack[] = [{ height: 0 }];
    // tracksHeight = 114 + topGap(2) + trackGap(2) * (1 - 1) = 116
    const result = computeCanvasHeights(tracks, opts);
    expect(result.tracksHeight).toBe(116);
  });

  it('handles an empty tracks array (trackGap * (0 - 1) goes negative, per source formula)', () => {
    // tracksHeight = 0 + topGap(2) + trackGap(2) * (0 - 1) = 2 - 2 = 0
    const result = computeCanvasHeights([], opts);
    expect(result.tracksHeight).toBe(0);
    expect(result.totalHeight).toBe(0);
    expect(result.containerHeight).toBe(0 + opts.bottomBuffer);
  });

  it('handles a single track (no inter-track gaps)', () => {
    const tracks: CanvasHeightTrack[] = [{ height: 80 }];
    // tracksHeight = 80 + topGap(2) + trackGap(2) * (1 - 1) = 82
    const result = computeCanvasHeights(tracks, opts);
    expect(result.tracksHeight).toBe(82);
  });
});
