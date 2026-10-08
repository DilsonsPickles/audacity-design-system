import { describe, it, expect } from 'vitest';
import { clipHandleRows, isClipCollapsed, CLIP_COLLAPSE_HEIGHT, HANDLE_ROW_MIN, HANDLE_ROW_MAX } from '../clipHandleRows';

describe("clipHandleRows — the real app's handle rows (2026-10-07)", () => {
  it('a full-height clip: two 32px rows under the 20px header (the Figma hit zones)', () => {
    expect(clipHandleRows(114)).toEqual({ collapsed: false, trimTop: 20, stretchTop: 52, rowHeight: 32 });
  });

  it("a clip collapses UNDER 72px, the real app's track threshold (2026-10-08): at the 44px minimum two 22px rows from the top split it exactly", () => {
    expect(CLIP_COLLAPSE_HEIGHT).toBe(72);
    expect(isClipCollapsed(71)).toBe(true);
    expect(isClipCollapsed(72)).toBe(false);
    expect(clipHandleRows(44)).toEqual({ collapsed: true, trimTop: 0, stretchTop: 22, rowHeight: 22 });
    // The band that used to break: a 46px clip kept its header and two
    // 22px rows that did not fit; collapsed, its rows are 23 from the top
    expect(clipHandleRows(46)).toEqual({ collapsed: true, trimTop: 0, stretchTop: 23, rowHeight: 23 });
    expect(clipHandleRows(60)).toEqual({ collapsed: true, trimTop: 0, stretchTop: 30, rowHeight: 30 });
  });

  it("the rows are half the room, clamped 22–32: a 72px clip gets 26px rows, the real app's numbers", () => {
    expect(clipHandleRows(72)).toEqual({ collapsed: false, trimTop: 20, stretchTop: 46, rowHeight: 26 });
    expect(clipHandleRows(84).rowHeight).toBe(HANDLE_ROW_MAX);
    expect(clipHandleRows(200).rowHeight).toBe(HANDLE_ROW_MAX);
    expect(clipHandleRows(72).rowHeight).toBe(26); // the smallest clip with a header: (72 − 20) / 2
    expect(clipHandleRows(30)).toEqual({ collapsed: true, trimTop: 0, stretchTop: 22, rowHeight: 22 }); // 15, clamped up to HANDLE_ROW_MIN
    expect(HANDLE_ROW_MIN).toBe(22);
  });
});
