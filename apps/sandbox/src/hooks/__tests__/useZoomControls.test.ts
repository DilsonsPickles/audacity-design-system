import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useZoomControls, zoomAnchorOnPlayhead } from '../useZoomControls';
import { CLIP_CONTENT_OFFSET } from '@audacity-ui/components';
import type { Track } from '../../contexts/TracksContext';

const hookOptions = (tracks: Track[]) => ({
  state: { tracks, timeSelection: null },
  // ref.current null → the hook falls back to an 800px viewport
  scrollContainerRef: { current: null },
  zoomToggleLevel1: 'zoom-default',
  zoomToggleLevel2: 'seconds',
});

describe('useZoomControls — dynamic zoom-out floor (2× project length)', () => {
  it('floors zoom-out where the viewport spans twice the project length', () => {
    // Audio ends at 4:00 (240 s) → the 800px viewport may span at most
    // 480 s (out to 8:00) → floor = 800 / 480 px/s.
    const tracks = [
      { id: 1, name: 't', clips: [{ id: 1, name: 'c', start: 0, duration: 240, envelopePoints: [] }] },
    ] as Track[];
    const { result } = renderHook(() => useZoomControls(hookOptions(tracks)));

    expect(result.current.minPixelsPerSecond).toBeCloseTo(800 / 480, 6);

    // Zooming out repeatedly lands exactly on the floor and stays there.
    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomOut();
    });
    expect(result.current.pixelsPerSecond).toBeCloseTo(800 / 480, 6);
    // Visible span at the floor = viewport / pps = 480 s = 2 × 240 s.
    expect(800 / result.current.pixelsPerSecond).toBeCloseTo(480, 4);
  });

  it('caps the floor at the default zoom for short projects (never forces zoom-in)', () => {
    // A 2 s project would compute an absurd 200 px/s floor; it must cap
    // at the 100 px/s default so the default zoom state stays legal.
    const tracks = [
      { id: 1, name: 't', clips: [{ id: 1, name: 'c', start: 0, duration: 2, envelopePoints: [] }] },
    ] as Track[];
    const { result } = renderHook(() => useZoomControls(hookOptions(tracks)));
    expect(result.current.minPixelsPerSecond).toBe(100);
    expect(result.current.pixelsPerSecond).toBe(100);
  });

  it('falls back to the absolute floor for an empty project', () => {
    const { result } = renderHook(() => useZoomControls(hookOptions([])));
    expect(result.current.minPixelsPerSecond).toBe(1);
  });
});

describe('useZoomControls — zoom in / out anchored on the playhead (2026-10-12)', () => {
  it('a visible playhead keeps its pixel; one off screen is brought to the middle', () => {
    // playhead at 2 s, 100 px/s, no scroll → on screen at OFFSET + 200
    expect(zoomAnchorOnPlayhead(2, 100, 0, 800)).toEqual({ time: 2, x: CLIP_CONTENT_OFFSET + 200 });
    // at 20 s it is 2000px in, past an 800px viewport → the middle
    expect(zoomAnchorOnPlayhead(20, 100, 0, 800)).toEqual({ time: 20, x: 400 });
  });

  it('zoomIn scrolls so the playhead stays where it was on screen', () => {
    const el = { scrollLeft: 0, clientWidth: 800 } as HTMLDivElement;
    const tracks = [
      { id: 1, name: 't', clips: [{ id: 1, name: 'c', start: 0, duration: 60, envelopePoints: [] }] },
    ] as Track[];
    const { result } = renderHook(() => useZoomControls({
      ...hookOptions(tracks),
      state: { tracks, timeSelection: null, playheadPosition: 2 },
      scrollContainerRef: { current: el },
    }));
    const before = result.current.pixelsPerSecond;
    const xBefore = CLIP_CONTENT_OFFSET + 2 * before - el.scrollLeft;
    act(() => { result.current.zoomIn(); });
    const after = result.current.pixelsPerSecond;
    expect(after).toBeGreaterThan(before);
    // the playhead's screen x is unchanged
    expect(CLIP_CONTENT_OFFSET + 2 * after - el.scrollLeft).toBeCloseTo(xBefore, 6);
    act(() => { result.current.zoomOut(); });
    expect(CLIP_CONTENT_OFFSET + 2 * result.current.pixelsPerSecond - el.scrollLeft).toBeCloseTo(xBefore, 6);
  });

  it('zoomIn with the playhead off screen centres it', () => {
    const el = { scrollLeft: 0, clientWidth: 800 } as HTMLDivElement;
    const tracks = [
      { id: 1, name: 't', clips: [{ id: 1, name: 'c', start: 0, duration: 60, envelopePoints: [] }] },
    ] as Track[];
    const { result } = renderHook(() => useZoomControls({
      ...hookOptions(tracks),
      state: { tracks, timeSelection: null, playheadPosition: 20 },
      scrollContainerRef: { current: el },
    }));
    act(() => { result.current.zoomIn(); });
    expect(CLIP_CONTENT_OFFSET + 20 * result.current.pixelsPerSecond - el.scrollLeft).toBeCloseTo(400, 6);
  });
});
