import { describe, it, expect } from 'vitest';
import { tracksDomainReducer } from '../reducers/tracksDomainReducer';
import { initialState } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';
import {
  effectiveTrackHeight,
  effectiveTrackMuted,
  effectiveTrackSoloed,
  folderChildIndices,
  folderDescendantIndices,
  FOLDER_ROW_HEIGHT,
  isHiddenByCollapse,
  moveTrackWithFolders,
  normalizeFolders,
  resolveDropLanding,
  resolveInPlaceLanding,
  trackDepth,
  validParentsAt,
} from '../../utils/trackFolders';

function makeTrack(id: number, overrides: Partial<Track> = {}): Track {
  return { id, name: `Track ${id}`, clips: [], ...overrides } as Track;
}

function makeState(tracks: Track[], selected: number[] = []): TracksState {
  return { ...initialState, tracks, selectedTrackIndices: selected };
}

const ids = (tracks: readonly Track[]) => tracks.map((t) => t.id);
const parents = (tracks: readonly Track[]) => tracks.map((t) => t.folderId ?? null);

/**
 *  0  A (10)
 *  1    t1
 *  2    B (20)
 *  3      t2
 *  4      t3
 *  5    t4
 *  6  t5
 */
const nest = (overrides: Record<number, Partial<Track>> = {}): Track[] =>
  [
    makeTrack(10, { type: 'folder' }),
    makeTrack(1, { folderId: 10 }),
    makeTrack(20, { type: 'folder', folderId: 10 }),
    makeTrack(2, { folderId: 20 }),
    makeTrack(3, { folderId: 20 }),
    makeTrack(4, { folderId: 10 }),
    makeTrack(5),
  ].map((t) => ({ ...t, ...overrides[t.id] }));

/**
 *  0  A (10)
 *  1    B (20)
 *  2      t1
 *  3  t2
 *  4  t3
 *
 *  t1 closes BOTH groups: the slot under it is the ambiguous one.
 */
const stacked = (): Track[] => [
  makeTrack(10, { type: 'folder' }),
  makeTrack(20, { type: 'folder', folderId: 10 }),
  makeTrack(1, { folderId: 20 }),
  makeTrack(2),
  makeTrack(3),
];

describe('nested groups — structure', () => {
  it('children are direct, descendants are the whole subtree', () => {
    const tracks = nest();
    expect(folderChildIndices(tracks, 0)).toEqual([1, 2, 5]);
    expect(folderDescendantIndices(tracks, 0)).toEqual([1, 2, 3, 4, 5]);
    expect(folderDescendantIndices(tracks, 2)).toEqual([3, 4]);
    expect(tracks.map((_, i) => trackDepth(tracks, i))).toEqual([0, 1, 1, 2, 2, 1, 0]);
  });

  it('collapsing the OUTER group hides the inner header and everything in it', () => {
    const tracks = nest({ 10: { collapsed: true } });
    expect(effectiveTrackHeight(tracks, 0, 114)).toBe(FOLDER_ROW_HEIGHT);
    for (const i of [1, 2, 3, 4, 5]) {
      expect(isHiddenByCollapse(tracks, i)).toBe(true);
      expect(effectiveTrackHeight(tracks, i, 114)).toBe(0);
    }
    expect(effectiveTrackHeight(tracks, 6, 114)).toBe(114);
  });

  it('collapsing the INNER group hides only its own members', () => {
    const tracks = nest({ 20: { collapsed: true } });
    expect([1, 2, 5].map((i) => isHiddenByCollapse(tracks, i))).toEqual([false, false, false]);
    expect([3, 4].map((i) => isHiddenByCollapse(tracks, i))).toEqual([true, true]);
    expect(effectiveTrackHeight(tracks, 2, 114)).toBe(FOLDER_ROW_HEIGHT);
  });

  it('an inner group stays collapsed under an open outer one that was closed and reopened', () => {
    // Collapse is per-folder state, not inherited: nothing to restore.
    const tracks = nest({ 20: { collapsed: true } });
    const closed = tracks.map((t) => (t.id === 10 ? { ...t, collapsed: true } : t));
    const reopened = closed.map((t) => (t.id === 10 ? { ...t, collapsed: false } : t));
    expect(isHiddenByCollapse(reopened, 3)).toBe(true);
    expect(isHiddenByCollapse(reopened, 1)).toBe(false);
  });

  it('mute and solo cascade down the whole chain', () => {
    const outer = nest({ 10: { muted: true } });
    expect([1, 3, 5].map((i) => effectiveTrackMuted(outer, i))).toEqual([true, true, true]);
    expect(effectiveTrackMuted(outer, 6)).toBe(false);

    const inner = nest({ 20: { soloed: true } });
    expect([3, 4].map((i) => effectiveTrackSoloed(inner, i))).toEqual([true, true]);
    expect([1, 5].map((i) => effectiveTrackSoloed(inner, i))).toEqual([false, false]);
  });

  it('normalize dissolves upward: a group holding only an empty group goes with it', () => {
    const tracks = [
      makeTrack(10, { type: 'folder' }),
      makeTrack(20, { type: 'folder', folderId: 10 }),
      makeTrack(1),
    ];
    expect(ids(normalizeFolders(tracks))).toEqual([1]);
  });

  it('normalize keeps a group whose only member is a non-empty group', () => {
    const tracks = [
      makeTrack(10, { type: 'folder' }),
      makeTrack(20, { type: 'folder', folderId: 10 }),
      makeTrack(1, { folderId: 20 }),
    ];
    expect(normalizeFolders(tracks)).toBe(tracks);
  });
});

describe('validParentsAt — which groups a slot can belong to', () => {
  it('inside a family there is no choice', () => {
    const tracks = nest();
    expect(validParentsAt(tracks, 0)).toEqual([null]);
    expect(validParentsAt(tracks, 1)).toEqual([10]); // under A's header
    expect(validParentsAt(tracks, 3)).toEqual([20]); // under B's header
    expect(validParentsAt(tracks, 4)).toEqual([20]); // between B's members
  });

  it('where a group ends the slot may sit inside it or outside, shallowest first', () => {
    const tracks = nest();
    expect(validParentsAt(tracks, 5)).toEqual([10, 20]); // after B, still in A
    expect(validParentsAt(tracks, 6)).toEqual([null, 10]); // after A
    expect(validParentsAt(tracks, 7)).toEqual([null]);
  });

  it('where two groups end together, every level is on offer', () => {
    expect(validParentsAt(stacked(), 3)).toEqual([null, 10, 20]);
  });
});

describe('moveTrackWithFolders — explicit parent', () => {
  it('puts a track at the chosen level of an ambiguous slot', () => {
    const intoInner = moveTrackWithFolders(nest(), 6, 5, { parentId: 20 }).tracks;
    expect(ids(intoInner)).toEqual([10, 1, 20, 2, 3, 5, 4]);
    expect(intoInner[5].folderId).toBe(20);

    const intoOuter = moveTrackWithFolders(nest(), 6, 5, { parentId: 10 }).tracks;
    expect(ids(intoOuter)).toEqual([10, 1, 20, 2, 3, 5, 4]);
    expect(intoOuter[5].folderId).toBe(10);
  });

  it('a parent the slot cannot give is clamped to the nearest level, never honoured blindly', () => {
    // Slot 4 is between B's members: only B is possible.
    const { tracks } = moveTrackWithFolders(nest(), 6, 4, { parentId: null });
    expect(tracks[4].id).toBe(5);
    expect(tracks[4].folderId).toBe(20);
  });

  it('a group moved with no membership keeps its parent', () => {
    const { tracks } = moveTrackWithFolders(nest(), 2, 1);
    expect(ids(tracks)).toEqual([10, 20, 2, 3, 1, 4, 5]);
    expect(parents(tracks)).toEqual([null, 10, 20, 20, 10, 10, null]);
  });

  it('a group moved to the root takes its subtree and leaves its parent', () => {
    const tracks = nest();
    const { tracks: moved } = moveTrackWithFolders(tracks, 2, tracks.length, { parentId: null });
    expect(ids(moved)).toEqual([10, 1, 4, 5, 20, 2, 3]);
    expect(parents(moved)).toEqual([null, 10, 10, null, null, 20, 20]);
  });

  it('a root group moved into another becomes a sub-group, subtree intact', () => {
    const tracks = [...nest(), makeTrack(30, { type: 'folder' }), makeTrack(6, { folderId: 30 })];
    const { tracks: moved } = moveTrackWithFolders(tracks, 7, 1, { parentId: 10 });
    expect(ids(moved)).toEqual([10, 30, 6, 1, 20, 2, 3, 4, 5]);
    expect(moved[1].folderId).toBe(10);
    expect(moved[2].folderId).toBe(30);
  });
});

describe('resolveDropLanding — the drag preview and the drop share it', () => {
  it('under the last member of stacked groups, one level out is the default', () => {
    // t3 dropped on the lower half of t1, which closes B and A.
    expect(resolveDropLanding(stacked(), 4, 2, true)).toEqual({ toIndex: 3, parentId: 10 });
  });

  it('horizontal movement picks the level: left is shallower, right is deeper', () => {
    expect(resolveDropLanding(stacked(), 4, 2, true, -1)).toEqual({ toIndex: 3, parentId: null });
    expect(resolveDropLanding(stacked(), 4, 2, true, 1)).toEqual({ toIndex: 3, parentId: 20 });
  });

  it('the shift is clamped to the levels the slot has', () => {
    expect(resolveDropLanding(stacked(), 4, 2, true, -9)?.parentId).toBeNull();
    expect(resolveDropLanding(stacked(), 4, 2, true, 9)?.parentId).toBe(20);
    // No choice inside a family, however far the pointer travels
    expect(resolveDropLanding(nest(), 6, 4, false, -9)?.parentId).toBe(20);
  });

  it('the upper half of a nested header lands above it, in its parent', () => {
    expect(resolveDropLanding(nest(), 6, 2, false)).toEqual({ toIndex: 2, parentId: 10 });
  });

  it('the lower half of an open header is first child; a collapsed one takes it at the end', () => {
    expect(resolveDropLanding(nest(), 6, 2, true)).toEqual({ toIndex: 3, parentId: 20 });
    const closed = nest({ 20: { collapsed: true } });
    expect(resolveDropLanding(closed, 6, 2, true)).toEqual({ toIndex: 5, parentId: 20 });
  });

  it('a group dropped on the lower half of another header nests inside it', () => {
    const tracks = [...nest(), makeTrack(30, { type: 'folder' }), makeTrack(6, { folderId: 30 })];
    const landing = resolveDropLanding(tracks, 7, 0, true);
    expect(landing).toEqual({ toIndex: 1, parentId: 10 });
    const { tracks: moved } = moveTrackWithFolders(tracks, 7, landing!.toIndex, { parentId: landing!.parentId });
    expect(ids(moved)).toEqual([10, 30, 6, 1, 20, 2, 3, 4, 5]);
    expect(moved[1].folderId).toBe(10);
  });

  it('a group can never land inside itself', () => {
    expect(resolveDropLanding(nest(), 0, 0, true)).toBeNull();
    expect(resolveDropLanding(nest(), 0, 3, true)).toBeNull();
    expect(resolveDropLanding(nest(), 2, 4, false)).toBeNull();
  });

  it('the bottom slot is always outside everything', () => {
    const tracks = stacked().slice(0, 3); // the nest is the whole list
    const padded = [makeTrack(9), ...tracks];
    expect(resolveDropLanding(padded, 0, 'end', true)).toEqual({ toIndex: 3, parentId: null });
  });

  it('what it returns, the move delivers — at every row, half and shift', () => {
    const tracks = [...nest(), makeTrack(30, { type: 'folder' }), makeTrack(6, { folderId: 30 })];
    for (let from = 0; from < tracks.length; from++) {
      for (let target = 0; target < tracks.length; target++) {
        for (const lower of [false, true]) {
          for (const shift of [-2, -1, 0, 1, 2]) {
            const landing = resolveDropLanding(tracks, from, target, lower, shift);
            if (!landing) continue;
            const { tracks: moved } = moveTrackWithFolders(tracks, from, landing.toIndex, {
              parentId: landing.parentId,
            });
            const row = moved.find((t) => t.id === tracks[from].id)!;
            expect(row.folderId ?? null).toBe(landing.parentId);
            // Every family is still contiguous: each row's parent is
            // the nearest folder above it at one level less.
            moved.forEach((t, i) => {
              if (t.folderId === undefined) return;
              const header = moved.findIndex((f) => f.type === 'folder' && f.id === t.folderId);
              expect(header).toBeGreaterThanOrEqual(0);
              expect(header).toBeLessThan(i);
              expect(folderDescendantIndices(moved, header)).toContain(i);
            });
          }
        }
      }
    }
  });
});

describe('resolveInPlaceLanding — changing level without moving', () => {
  it('no sideways travel is no move at all', () => {
    expect(resolveInPlaceLanding(stacked(), 2)).toEqual({ toIndex: 2, parentId: 20 });
    expect(resolveInPlaceLanding(nest(), 6)).toEqual({ toIndex: 6, parentId: null });
  });

  it('the last row of stacked groups steps out one level per step, and back in', () => {
    expect(resolveInPlaceLanding(stacked(), 2, -1)).toEqual({ toIndex: 2, parentId: 10 });
    expect(resolveInPlaceLanding(stacked(), 2, -2)).toEqual({ toIndex: 2, parentId: null });
    expect(resolveInPlaceLanding(stacked(), 2, -9)).toEqual({ toIndex: 2, parentId: null });
    expect(resolveInPlaceLanding(stacked(), 2, 3)).toEqual({ toIndex: 2, parentId: 20 });
  });

  it('a row just below a group can step INTO it', () => {
    expect(resolveInPlaceLanding(stacked(), 3, 1)).toEqual({ toIndex: 3, parentId: 10 });
    expect(resolveInPlaceLanding(stacked(), 3, 2)).toEqual({ toIndex: 3, parentId: 20 });
  });

  it('a row in the middle of a family has no other level to take', () => {
    expect(resolveInPlaceLanding(nest(), 3, -3)).toEqual({ toIndex: 3, parentId: 20 });
    expect(resolveInPlaceLanding(nest(), 1, 3)).toEqual({ toIndex: 1, parentId: 10 });
  });

  it('a group changes level with its subtree, and the move delivers it', () => {
    const tracks = [
      makeTrack(10, { type: 'folder' }),
      makeTrack(1, { folderId: 10 }),
      makeTrack(20, { type: 'folder', folderId: 10 }),
      makeTrack(2, { folderId: 20 }),
    ];
    const landing = resolveInPlaceLanding(tracks, 2, -1);
    expect(landing).toEqual({ toIndex: 2, parentId: null });
    const { tracks: moved } = moveTrackWithFolders(tracks, 2, landing!.toIndex, { parentId: landing!.parentId });
    expect(ids(moved)).toEqual([10, 1, 20, 2]);
    expect(parents(moved)).toEqual([null, 10, null, 20]);
  });
});

describe('reducer — making and unmaking nests', () => {
  it('grouping tracks that share a group makes a SUB-group of it', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'GROUP_TRACKS',
      payload: { trackIndices: [3, 4] },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 21, 2, 3, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 20, 21, 21, 10, null]);
    expect(next.focusedTrackIndex).toBe(4);
    expect(next.selectedTrackIndices).toEqual([4, 5]);
  });

  it('tracks from different levels meet in the group that holds them both', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'GROUP_TRACKS',
      payload: { trackIndices: [1, 3] },
    });
    expect(ids(next.tracks)).toEqual([10, 21, 1, 2, 20, 3, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 21, 21, 10, 20, 10, null]);
  });

  it('with nothing in common the new group is at the root, above the family it drew from', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'GROUP_TRACKS',
      payload: { trackIndices: [3, 6] },
    });
    expect(ids(next.tracks)).toEqual([21, 2, 5, 10, 1, 20, 3, 4]);
    expect(parents(next.tracks)).toEqual([null, 21, 21, null, 10, 10, 20, 10]);
  });

  it('grouping every member of an inner group replaces it, in place', () => {
    // B empties and dissolves; indices are reported after that shift.
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'GROUP_TRACKS',
      payload: { trackIndices: [3, 4] },
    });
    const all = tracksDomainReducer(makeState(nest()), {
      type: 'GROUP_TRACKS',
      payload: { trackIndices: [1, 3, 4, 5] },
    });
    expect(next.tracks.filter((t) => t.type === 'folder')).toHaveLength(3);
    expect(ids(all.tracks)).toEqual([10, 21, 1, 2, 3, 4, 5]);
    expect(parents(all.tracks)).toEqual([null, 10, 21, 21, 21, 21, null]);
    expect(all.selectedTrackIndices).toEqual([2, 3, 4, 5]);
  });

  it('ungrouping an inner group hands its members to the outer one', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'UNGROUP_FOLDER',
      payload: { trackIndex: 2 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 2, 3, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 10, 10, null]);
  });

  it('DELETE_TRACK on an inner header does the same', () => {
    const next = tracksDomainReducer(makeState(nest()), { type: 'DELETE_TRACK', payload: 2 });
    expect(ids(next.tracks)).toEqual([10, 1, 2, 3, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 10, 10, null]);
  });

  it('ungrouping the outer group frees one level only: the inner group survives', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'UNGROUP_FOLDER',
      payload: { trackIndex: 0 },
    });
    expect(ids(next.tracks)).toEqual([1, 20, 2, 3, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, null, 20, 20, null, null]);
  });
});

describe('reducer — menu membership with nesting', () => {
  const withC = () => [...nest(), makeTrack(30, { type: 'folder' }), makeTrack(6, { folderId: 30 })];

  it('adding a track to an inner group lands at the end of THAT group', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'ADD_TRACK_TO_FOLDER',
      payload: { trackIndex: 6, folderId: 20 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 2, 3, 5, 4]);
    expect(next.tracks[5].folderId).toBe(20);
  });

  it('adding a track to the outer group lands after the inner family, not inside it', () => {
    const tracks = nest().filter((t) => t.id !== 4); // A now ENDS with B's family
    const next = tracksDomainReducer(makeState(tracks), {
      type: 'ADD_TRACK_TO_FOLDER',
      payload: { trackIndex: 5, folderId: 10 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 2, 3, 5]);
    expect(next.tracks[5].folderId).toBe(10);
  });

  it('adding a GROUP to a group nests it, subtree intact', () => {
    const next = tracksDomainReducer(makeState(withC()), {
      type: 'ADD_TRACK_TO_FOLDER',
      payload: { trackIndex: 7, folderId: 10 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 2, 3, 4, 30, 6, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 20, 20, 10, 10, 30, null]);
  });

  it('a group cannot be added to itself or to anything inside it', () => {
    const state = makeState(nest());
    expect(
      tracksDomainReducer(state, { type: 'ADD_TRACK_TO_FOLDER', payload: { trackIndex: 0, folderId: 10 } }),
    ).toBe(state);
    expect(
      tracksDomainReducer(state, { type: 'ADD_TRACK_TO_FOLDER', payload: { trackIndex: 0, folderId: 20 } }),
    ).toBe(state);
  });

  it('removing steps ONE level out and parks below the family it left', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'REMOVE_TRACK_FROM_FOLDER',
      payload: { trackIndex: 3 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 3, 2, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 20, 10, 10, null]);
  });

  it('removing a nested GROUP moves its whole subtree out to the root', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'REMOVE_TRACK_FROM_FOLDER',
      payload: { trackIndex: 2 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 4, 20, 2, 3, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, null, 20, 20, null]);
  });

  it('removing the only member of an inner group dissolves it, not its parent', () => {
    const tracks = nest().filter((t) => t.id !== 3);
    const next = tracksDomainReducer(makeState(tracks), {
      type: 'REMOVE_TRACK_FROM_FOLDER',
      payload: { trackIndex: 3 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 2, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 10, null]);
    expect(next.focusedTrackIndex).toBe(2);
  });
});

describe('reducer — DUPLICATE_FOLDER with nesting', () => {
  it('copies nested groups too, and the copies point at each other', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'DUPLICATE_FOLDER',
      payload: { trackIndex: 0 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 2, 3, 4, 21, 22, 23, 24, 25, 26, 5]);
    expect(parents(next.tracks).slice(6, 12)).toEqual([null, 21, 21, 23, 23, 21]);
    expect(next.tracks[8].type).toBe('folder');
    // the originals are untouched
    expect(parents(next.tracks).slice(0, 6)).toEqual([null, 10, 10, 20, 20, 10]);
  });

  it('a duplicated inner group stays beside the original, in the same parent', () => {
    const next = tracksDomainReducer(makeState(nest()), {
      type: 'DUPLICATE_FOLDER',
      payload: { trackIndex: 2 },
    });
    expect(ids(next.tracks)).toEqual([10, 1, 20, 2, 3, 21, 22, 23, 4, 5]);
    expect(parents(next.tracks)).toEqual([null, 10, 10, 20, 20, 10, 21, 21, 10, null]);
  });
});

describe('reducer — MOVE_TRACK with nesting', () => {
  it('carries an explicit parent through to the move', () => {
    const next = tracksDomainReducer(makeState(stacked()), {
      type: 'MOVE_TRACK',
      payload: { fromIndex: 4, toIndex: 3, membership: { parentId: 10 } },
    });
    expect(ids(next.tracks)).toEqual([10, 20, 1, 3, 2]);
    expect(parents(next.tracks)).toEqual([null, 10, 20, 10, null]);
  });

  it('lifting the only sub-group out dissolves nothing that still has members', () => {
    const tracks = stacked();
    const next = tracksDomainReducer(makeState(tracks), {
      type: 'MOVE_TRACK',
      payload: { fromIndex: 1, toIndex: tracks.length, membership: { parentId: null } },
    });
    // A held only B: with B gone it is empty and dissolves.
    expect(ids(next.tracks)).toEqual([2, 3, 20, 1]);
    expect(parents(next.tracks)).toEqual([null, null, null, 20]);
    expect(next.focusedTrackIndex).toBe(2);
  });
});
