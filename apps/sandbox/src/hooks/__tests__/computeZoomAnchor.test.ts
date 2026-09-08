import { describe, it, expect } from 'vitest';
import { CLIP_CONTENT_OFFSET } from '@audacity-ui/components';
import { computeZoomAnchor } from '../useCanvasScrollSync';

/** Screen pixel where time t renders, given a scroll position. */
const pixelOf = (t: number, pps: number, scrollLeft: number) =>
  CLIP_CONTENT_OFFSET + t * pps - scrollLeft;

describe('computeZoomAnchor', () => {
  it('keeps the time under the cursor at the same screen pixel across a zoom step', () => {
    for (const [cursorX, scrollLeft, pps, newPps] of [
      [300, 0, 100, 66.6],
      [300, 0, 100, 150],
      [523.7, 1200.3, 42.5, 28.1],
      [50, 10_000, 10, 6.7],
    ] as const) {
      const { timeAtCursor, newScrollLeft } = computeZoomAnchor(cursorX, scrollLeft, pps, newPps);
      // The anchor is the time currently under the cursor…
      expect(pixelOf(timeAtCursor, pps, scrollLeft)).toBeCloseTo(cursorX, 8);
      // …and it stays under the cursor after the zoom (unless clamped at 0).
      if (newScrollLeft > 0) {
        expect(pixelOf(timeAtCursor, newPps, newScrollLeft)).toBeCloseTo(cursorX, 8);
      }
    }
  });

  it('accounts for the content offset (the historical drift bug)', () => {
    // Cursor exactly on the content origin (t = 0, no scroll): zooming must
    // not move it. The pre-fix math (no offset) drifted here.
    const { timeAtCursor, newScrollLeft } = computeZoomAnchor(CLIP_CONTENT_OFFSET, 0, 100, 50);
    expect(timeAtCursor).toBeCloseTo(0, 12);
    expect(newScrollLeft).toBe(0);
  });

  it('clamps the corrected scroll at 0', () => {
    const { newScrollLeft } = computeZoomAnchor(500, 0, 100, 10);
    expect(newScrollLeft).toBe(0);
  });
});
