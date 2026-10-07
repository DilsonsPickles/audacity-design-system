import { describe, it, expect } from 'vitest';
import { clipHandleRows, CLIP_COLLAPSE_HEIGHT, HANDLE_ROW_MIN, HANDLE_ROW_MAX } from '../clipHandleRows';

describe("clipHandleRows — the real app's handle rows (2026-10-07)", () => {
  it('a full-height clip: two 32px rows under the 20px header (the Figma hit zones)', () => {
    expect(clipHandleRows(114)).toEqual({ collapsed: false, trimTop: 20, stretchTop: 52, rowHeight: 32 });
  });

  it('a collapsed clip at the minimum: two 22px rows from the top that split it exactly', () => {
    expect(CLIP_COLLAPSE_HEIGHT).toBe(44);
    expect(clipHandleRows(44)).toEqual({ collapsed: true, trimTop: 0, stretchTop: 22, rowHeight: 22 });
  });

  it("the rows are half the room, clamped 22–32: a 72px clip gets 26px rows, the real app's numbers", () => {
    expect(clipHandleRows(72)).toEqual({ collapsed: false, trimTop: 20, stretchTop: 46, rowHeight: 26 });
    expect(clipHandleRows(84).rowHeight).toBe(HANDLE_ROW_MAX);
    expect(clipHandleRows(200).rowHeight).toBe(HANDLE_ROW_MAX);
    expect(clipHandleRows(50).rowHeight).toBe(HANDLE_ROW_MIN); // (50 − 20) / 2 = 15, clamped up
    expect(clipHandleRows(30)).toEqual({ collapsed: true, trimTop: 0, stretchTop: 22, rowHeight: 22 }); // 15, clamped up
  });
});
