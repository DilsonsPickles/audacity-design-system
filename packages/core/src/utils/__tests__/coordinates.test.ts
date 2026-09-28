import { describe, it, expect } from 'vitest';
import {
  pixelsToTime,
  timeToPixels,
  getTrackHeight,
  clampTrackIndex,
  getTrackRange,
  yToTrackIndex,
  trackIndexToY,
  effectiveRowHeight,
  groupsClosingAt,
  rowGapAfter,
  ancestorFolderIndices,
  computeGroupLayout,
  rowOffsets,
  FOLDER_ROW_HEIGHT,
  GROUP_END_PAD,
  GROUP_LABEL_INDENT,
  groupLabelIndent,
} from '../coordinates';
import type { TrackLike } from '../../types';

describe('pixelsToTime', () => {
  it('converts pixels to time at 100px/s', () => {
    expect(pixelsToTime(200, 100)).toBe(2);
  });

  it('returns 0 for pixel position 0', () => {
    expect(pixelsToTime(0, 100)).toBe(0);
  });

  it('accounts for left padding', () => {
    expect(pixelsToTime(150, 100, 50)).toBe(1);
  });

  it('returns negative time for pixels before padding', () => {
    expect(pixelsToTime(0, 100, 50)).toBe(-0.5);
  });
});

describe('timeToPixels', () => {
  it('converts time to pixels at 100px/s', () => {
    expect(timeToPixels(2, 100)).toBe(200);
  });

  it('returns 0 for time 0', () => {
    expect(timeToPixels(0, 100)).toBe(0);
  });

  it('accounts for left padding', () => {
    expect(timeToPixels(1, 100, 50)).toBe(150);
  });

  it('is the inverse of pixelsToTime', () => {
    const pps = 120;
    const time = 3.5;
    expect(pixelsToTime(timeToPixels(time, pps), pps)).toBeCloseTo(time);
  });
});

describe('getTrackHeight', () => {
  it('returns custom height when set', () => {
    const track = { clips: [], height: 200 } satisfies TrackLike;
    expect(getTrackHeight(track, 114)).toBe(200);
  });

  it('returns default height when height is undefined', () => {
    const track = { clips: [] } satisfies TrackLike;
    expect(getTrackHeight(track, 114)).toBe(114);
  });
});

describe('clampTrackIndex', () => {
  const tracks: TrackLike[] = [
    { clips: [] },
    { clips: [] },
    { clips: [] },
  ];

  it('clamps negative index to 0', () => {
    expect(clampTrackIndex(-5, tracks)).toBe(0);
  });

  it('clamps index beyond length to last index', () => {
    expect(clampTrackIndex(10, tracks)).toBe(2);
  });

  it('leaves valid index unchanged', () => {
    expect(clampTrackIndex(1, tracks)).toBe(1);
  });
});

describe('getTrackRange', () => {
  it('returns inclusive range in ascending order', () => {
    expect(getTrackRange(1, 3)).toEqual([1, 2, 3]);
  });

  it('works when start > end (auto-sorts)', () => {
    expect(getTrackRange(3, 1)).toEqual([1, 2, 3]);
  });

  it('returns single element when start === end', () => {
    expect(getTrackRange(2, 2)).toEqual([2]);
  });
});

describe('yToTrackIndex', () => {
  const tracks: TrackLike[] = [
    { clips: [], height: 100 },
    { clips: [], height: 150 },
    { clips: [] },
  ];

  it('returns 0 for Y inside first track', () => {
    // initialGap=10, first track starts at y=10, height=100
    expect(yToTrackIndex(50, tracks, 10, 5, 114)).toBe(0);
  });

  it('returns 1 for Y inside second track', () => {
    // first track: 10..110, gap 5, second track: 115..265
    expect(yToTrackIndex(120, tracks, 10, 5, 114)).toBe(1);
  });
});

describe('trackIndexToY', () => {
  const tracks: TrackLike[] = [
    { clips: [], height: 100 },
    { clips: [], height: 150 },
    { clips: [] },
  ];

  it('returns initialGap for track 0', () => {
    expect(trackIndexToY(0, tracks, 10, 5, 114)).toBe(10);
  });

  it('returns correct offset for track 1', () => {
    // initialGap=10 + track0 height(100) + gap(5) = 115
    expect(trackIndexToY(1, tracks, 10, 5, 114)).toBe(115);
  });

  it('returns correct offset for track 2', () => {
    // 10 + 100 + 5 + 150 + 5 = 270
    expect(trackIndexToY(2, tracks, 10, 5, 114)).toBe(270);
  });
});

describe('yToTrackIndex with track folders', () => {
  // folder row (28) + two children (114 each), gap 2, initialGap 2
  const folded = [
    { clips: [], id: 10, type: 'folder' },
    { clips: [], id: 1, folderId: 10, height: 114 },
    { clips: [], id: 2, folderId: 10, height: 114 },
  ];

  it('counts a folder row as its SLIM height, so children resolve correctly', () => {
    // folder band 2..30; child 1 band 32..146; child 2 band 148..262.
    // Before the fix the folder counted as a full 114px track and a
    // click on child 2 resolved to child 1.
    expect(yToTrackIndex(10, folded, 2, 2, 114)).toBe(0);
    expect(yToTrackIndex(100, folded, 2, 2, 114)).toBe(1);
    expect(yToTrackIndex(200, folded, 2, 2, 114)).toBe(2);
  });

  it('gives a collapsed folder\'s children no band at all', () => {
    const collapsed = [
      { clips: [], id: 10, type: 'folder', collapsed: true },
      { clips: [], id: 1, folderId: 10, height: 114 },
      { clips: [], id: 2, folderId: 10, height: 114 },
      { clips: [], id: 3, height: 114 },
    ];
    // folder 2..30, then the NEXT VISIBLE row (track 3) starts at 32
    expect(yToTrackIndex(10, collapsed, 2, 2, 114)).toBe(0);
    expect(yToTrackIndex(100, collapsed, 2, 2, 114)).toBe(3);
  });

  it('trackIndexToY agrees with the same rule', () => {
    expect(trackIndexToY(1, folded, 2, 2, 114)).toBe(32);
    expect(trackIndexToY(2, folded, 2, 2, 114)).toBe(148);
  });
});

describe('nested track groups', () => {
  // [0] plain
  // [1] Drums (folder 10)
  // [2]   Kick (folder 20, in 10)
  // [3]     kick in   (in 20)
  // [4]     kick out  (in 20)
  // [5]   snare       (in 10)
  // [6] Bass (folder 30)
  // [7]   bass di     (in 30)
  // [8] plain
  const tree = (over: Record<number, object> = {}) =>
    [
      { id: 1 },
      { id: 10, type: 'folder' },
      { id: 20, type: 'folder', folderId: 10 },
      { id: 3, folderId: 20 },
      { id: 4, folderId: 20 },
      { id: 5, folderId: 10 },
      { id: 30, type: 'folder' },
      { id: 7, folderId: 30 },
      { id: 8 },
    ].map((t, i) => ({ ...t, ...(over[i] ?? {}) }));

  it('ancestors are nearest first, to any depth', () => {
    expect(ancestorFolderIndices(tree(), 3)).toEqual([2, 1]);
    expect(ancestorFolderIndices(tree(), 2)).toEqual([1]);
    expect(ancestorFolderIndices(tree(), 0)).toEqual([]);
  });

  it('a loop in the data ends the walk instead of hanging', () => {
    const loop = [{ id: 10, type: 'folder', folderId: 20 }, { id: 20, type: 'folder', folderId: 10 }, { id: 1, folderId: 20 }];
    expect(ancestorFolderIndices(loop, 2)).toEqual([1, 0]);
  });

  it('collapsing an OUTER group hides everything inside it, nested headers included', () => {
    const t = tree({ 1: { collapsed: true } });
    expect(effectiveRowHeight(t, 1, 100)).toBe(FOLDER_ROW_HEIGHT);
    for (const i of [2, 3, 4, 5]) expect(effectiveRowHeight(t, i, 100)).toBe(0);
    expect(effectiveRowHeight(t, 6, 100)).toBe(FOLDER_ROW_HEIGHT);
  });

  it('collapsing an INNER group hides only its own rows', () => {
    const t = tree({ 2: { collapsed: true } });
    expect(effectiveRowHeight(t, 2, 100)).toBe(FOLDER_ROW_HEIGHT);
    expect(effectiveRowHeight(t, 3, 100)).toBe(0);
    expect(effectiveRowHeight(t, 5, 100)).toBe(100);
  });

  it('floors: one per group ending under a row, stacking when nested groups end together', () => {
    const t = tree();
    expect(groupsClosingAt(t, 4, 100)).toBe(1); // kick out closes Kick; Drums goes on to snare
    expect(groupsClosingAt(t, 5, 100)).toBe(1); // snare closes Drums
    expect(groupsClosingAt(t, 3, 100)).toBe(0);
    expect(groupsClosingAt(t, 7, 100)).toBe(1);
    // Without snare, kick out is the last row of BOTH groups
    const both = tree().filter((_r, i) => i !== 5);
    expect(groupsClosingAt(both, 4, 100)).toBe(2);
    expect(rowGapAfter(both, 4, 2, 100)).toBe(2 + 2 * GROUP_END_PAD);
  });

  it('a collapsed nested header closes its ANCESTORS, never itself', () => {
    const t = tree({ 2: { collapsed: true } }).filter((_r, i) => i !== 5); // Kick collapsed, no snare
    expect(groupsClosingAt(t, 2, 100)).toBe(1); // Drums ends under Kick's header
    const top = tree({ 1: { collapsed: true } });
    expect(groupsClosingAt(top, 1, 100)).toBe(0); // a collapsed top-level group has no floor
  });

  it('the one-pass layout agrees with the per-row rules on every row', () => {
    for (const t of [tree(), tree({ 1: { collapsed: true } }), tree({ 2: { collapsed: true } }), tree().filter((_r, i) => i !== 5)]) {
      const layout = computeGroupLayout(t, 100);
      const ys = rowOffsets(layout, 2, 2);
      t.forEach((_row, i) => {
        expect(layout[i].height).toBe(effectiveRowHeight(t, i, 100));
        expect(layout[i].closing).toBe(groupsClosingAt(t, i, 100));
        expect(layout[i].depth).toBe(ancestorFolderIndices(t, i).length);
        expect(ys[i]).toBe(trackIndexToY(i, t as never, 2, 2, 100));
      });
    }
  });

  it('layout names ancestors outermost first, and knows which headers open below', () => {
    const layout = computeGroupLayout(tree({ 6: { collapsed: true } }), 100);
    expect(layout[3].ancestors).toEqual([1, 2]);
    expect(layout[1].opensBelow).toBe(true);
    expect(layout[2].opensBelow).toBe(true);
    expect(layout[6].opensBelow).toBe(false);
    expect(layout[6].collapsed).toBe(true);
    expect(layout[7].hidden).toBe(true);
  });

  it('a click resolves to the right row below stacked floors', () => {
    const t = tree().filter((_r, i) => i !== 5); // kick out closes two groups
    const y = trackIndexToY(5, t as never, 2, 2, 100); // Bass header
    expect(yToTrackIndex(y + 1, t as never, 2, 2, 100)).toBe(5);
    expect(yToTrackIndex(y - 1, t as never, 2, 2, 100)).not.toBe(5);
  });
});

describe('groupLabelIndent', () => {
  it('a top-level group is not indented; each level in steps once', () => {
    expect(groupLabelIndent(0)).toBe(0);
    expect(groupLabelIndent(1)).toBe(GROUP_LABEL_INDENT);
    expect(groupLabelIndent(3)).toBe(3 * GROUP_LABEL_INDENT);
  });

  it('stops stepping past the cap, so a deep name still has room', () => {
    expect(groupLabelIndent(4)).toBe(groupLabelIndent(9));
    expect(groupLabelIndent(-1)).toBe(0);
  });
});
