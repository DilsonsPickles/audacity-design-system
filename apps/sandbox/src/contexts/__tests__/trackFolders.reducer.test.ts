import { describe, it, expect } from 'vitest';
import { tracksDomainReducer } from '../reducers/tracksDomainReducer';
import { initialState, tracksReducer } from '../TracksContext';
import type { TracksState, Track } from '../TracksContext';
import {
  effectiveTrackHeight,
  effectiveTrackMuted,
  effectiveTrackSoloed,
  FOLDER_ROW_HEIGHT,
  isHiddenByCollapse,
  normalizeFolders,
} from '../../utils/trackFolders';

function makeTrack(id: number, overrides: Partial<Track> = {}): Track {
  return { id, name: `Track ${id}`, clips: [], ...overrides } as Track;
}

function makeState(tracks: Track[], selected: number[] = []): TracksState {
  return { ...initialState, tracks, selectedTrackIndices: selected };
}

describe('GROUP_SELECTED_TRACKS', () => {
  it('wraps the selected tracks in a folder, contiguous below it, order preserved', () => {
    // tracks 1..4; select indices 1 and 3 (ids 2 and 4)
    const state = makeState([makeTrack(1), makeTrack(2), makeTrack(3), makeTrack(4)], [3, 1]);
    const next = tracksDomainReducer(state, { type: 'GROUP_SELECTED_TRACKS' });
    expect(next.tracks.map((t) => t.id)).toEqual([1, 5, 2, 4, 3]);
    expect(next.tracks[1].type).toBe('folder');
    expect(next.tracks[1].name).toBe('Group 1');
    expect(next.tracks[2].folderId).toBe(5);
    expect(next.tracks[3].folderId).toBe(5);
    // first MEMBER focused (a folder header is never focusable),
    // children selected at their new indices
    expect(next.focusedTrackIndex).toBe(2);
    expect(next.selectedTrackIndices).toEqual([2, 3]);
  });

  it('GROUP_TRACKS wraps a SINGLE track — a group of one is legal', () => {
    const state = makeState([makeTrack(1), makeTrack(2), makeTrack(3)]);
    const next = tracksDomainReducer(state, { type: 'GROUP_TRACKS', payload: { trackIndices: [1] } });
    expect(next.tracks.map((t) => t.id)).toEqual([1, 4, 2, 3]);
    expect(next.tracks[1].type).toBe('folder');
    expect(next.tracks[2].folderId).toBe(4);
    // ...and it survives normalizeFolders (one child is not "empty")
    expect(next.tracks.filter((t) => t.type === 'folder')).toHaveLength(1);
  });

  it('GROUP_TRACKS on a track already in a folder moves it to a new one', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(3, { folderId: 10 }),
    ]);
    const next = tracksDomainReducer(state, { type: 'GROUP_TRACKS', payload: { trackIndices: [2] } });
    const folders = next.tracks.filter((t) => t.type === 'folder');
    expect(folders).toHaveLength(2);
    const moved = next.tracks.find((t) => t.id === 3)!;
    expect(moved.folderId).not.toBe(10);
  });

  it('is a no-op with nothing eligible selected', () => {
    const state = makeState([makeTrack(1)], []);
    expect(tracksDomainReducer(state, { type: 'GROUP_SELECTED_TRACKS' })).toBe(state);
  });

  it('re-parents children out of an old folder; the emptied folder dissolves', () => {
    const folder = makeTrack(10, { type: 'folder', name: 'Group 1' });
    const child = makeTrack(2, { folderId: 10 });
    const state = makeState([folder, child, makeTrack(3)], [1, 2]);
    const next = tracksDomainReducer(state, { type: 'GROUP_SELECTED_TRACKS' });
    const folders = next.tracks.filter((t) => t.type === 'folder');
    expect(folders).toHaveLength(1);
    expect(folders[0].id).not.toBe(10);
    expect(next.tracks.filter((t) => t.folderId === folders[0].id).map((t) => t.id)).toEqual([2, 3]);
  });
});

describe('UNGROUP_FOLDER and folder deletion', () => {
  const folder = makeTrack(10, { type: 'folder' });
  const kids = [makeTrack(2, { folderId: 10 }), makeTrack(3, { folderId: 10 })];

  it('UNGROUP_FOLDER removes the row and frees the children in place', () => {
    const state = makeState([makeTrack(1), folder, ...kids]);
    const next = tracksDomainReducer(state, { type: 'UNGROUP_FOLDER', payload: { trackIndex: 1 } });
    expect(next.tracks.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(next.tracks.every((t) => t.folderId === undefined)).toBe(true);
  });

  it('DELETE_TRACK on a folder row is an ungroup, not a family delete', () => {
    const state = makeState([makeTrack(1), folder, ...kids]);
    const next = tracksDomainReducer(state, { type: 'DELETE_TRACK', payload: 1 });
    expect(next.tracks.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(next.tracks.every((t) => t.folderId === undefined)).toBe(true);
  });
});

describe('TOGGLE_FOLDER_COLLAPSED + derived visibility', () => {
  it('collapse hides children (zero effective height); folder row stays slim', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10, height: 114 }),
      makeTrack(3),
    ]);
    const next = tracksDomainReducer(state, { type: 'TOGGLE_FOLDER_COLLAPSED', payload: { trackIndex: 0 } });
    expect(next.tracks[0].collapsed).toBe(true);
    expect(isHiddenByCollapse(next.tracks, 1)).toBe(true);
    expect(effectiveTrackHeight(next.tracks, 0, 114)).toBe(FOLDER_ROW_HEIGHT);
    expect(effectiveTrackHeight(next.tracks, 1, 114)).toBe(0);
    expect(effectiveTrackHeight(next.tracks, 2, 114)).toBe(114);
  });
});

describe('MOVE_TRACK with a folder', () => {
  it('drags the whole family as a block', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(3, { folderId: 10 }),
      makeTrack(4),
      makeTrack(5),
    ]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 4 } });
    expect(next.tracks.map((t) => t.id)).toEqual([4, 5, 10, 2, 3]);
  });
});

describe('MOVE_TRACK membership — a track joins the folder it lands in', () => {
  const base = () => [
    makeTrack(10, { type: 'folder' }),
    makeTrack(2, { folderId: 10 }),
    makeTrack(3, { folderId: 10 }),
    makeTrack(4),
    makeTrack(5),
  ];

  it('a plain track dragged between two children JOINS the folder', () => {
    const state = makeState(base());
    // track 4 (index 3) → index 2, landing under child 2
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 3, toIndex: 2 } });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 2, 4, 3, 5]);
    expect(next.tracks[2].folderId).toBe(10);
  });

  it('landing directly under the folder ROW joins as the first child', () => {
    const state = makeState(base());
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 4, toIndex: 1 } });
    expect(next.tracks[1].id).toBe(5);
    expect(next.tracks[1].folderId).toBe(10);
  });

  it('a child dragged out below a plain track LEAVES the folder', () => {
    const state = makeState(base());
    // child 3 (index 2) → index 4, landing under plain track 4
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 2, toIndex: 4 } });
    const moved = next.tracks.find((t) => t.id === 3)!;
    expect(moved.folderId).toBeUndefined();
  });

  it('a child dragged to the very top leaves the folder', () => {
    const state = makeState(base());
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 1, toIndex: 0 } });
    expect(next.tracks[0].id).toBe(2);
    expect(next.tracks[0].folderId).toBeUndefined();
  });

  it('removing the LAST child dissolves the folder', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(4),
    ]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 1, toIndex: 2 } });
    expect(next.tracks.some((t) => t.type === 'folder')).toBe(false);
    expect(next.tracks.map((t) => t.id)).toEqual([4, 2]);
  });

  it('folders reorder as families, past each other', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(20, { type: 'folder' }),
      makeTrack(3, { folderId: 20 }),
    ]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 3 } });
    expect(next.tracks.map((t) => t.id)).toEqual([20, 3, 10, 2]);
    // membership survives the family move
    expect(next.tracks[1].folderId).toBe(20);
    expect(next.tracks[3].folderId).toBe(10);
  });
});

describe('ADD_TRACK_TO_FOLDER / REMOVE_TRACK_FROM_FOLDER (kebab menu)', () => {
  const base = () => [
    makeTrack(10, { type: 'folder' }),
    makeTrack(2, { folderId: 10 }),
    makeTrack(3),
    makeTrack(4),
  ];

  it('adds a track as the LAST child, keeping the family contiguous', () => {
    const state = makeState(base());
    const next = tracksDomainReducer(state, {
      type: 'ADD_TRACK_TO_FOLDER',
      payload: { trackIndex: 3, folderId: 10 },
    });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 2, 4, 3]);
    expect(next.tracks[2].folderId).toBe(10);
    expect(next.focusedTrackIndex).toBe(2);
  });

  it('adding a track from ABOVE the folder still lands inside it', () => {
    const state = makeState([makeTrack(4), makeTrack(10, { type: 'folder' }), makeTrack(2, { folderId: 10 })]);
    const next = tracksDomainReducer(state, {
      type: 'ADD_TRACK_TO_FOLDER',
      payload: { trackIndex: 0, folderId: 10 },
    });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 2, 4]);
    expect(next.tracks[2].folderId).toBe(10);
  });

  it('is a no-op for a folder row, an unknown folder, or a track already in it', () => {
    const state = makeState(base());
    expect(tracksDomainReducer(state, { type: 'ADD_TRACK_TO_FOLDER', payload: { trackIndex: 0, folderId: 10 } })).toBe(state);
    expect(tracksDomainReducer(state, { type: 'ADD_TRACK_TO_FOLDER', payload: { trackIndex: 1, folderId: 10 } })).toBe(state);
    expect(tracksDomainReducer(state, { type: 'ADD_TRACK_TO_FOLDER', payload: { trackIndex: 2, folderId: 99 } })).toBe(state);
  });

  it('removing parks the track just BELOW the family, membership cleared', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(3, { folderId: 10 }),
      makeTrack(4),
    ]);
    const next = tracksDomainReducer(state, {
      type: 'REMOVE_TRACK_FROM_FOLDER',
      payload: { trackIndex: 1 },
    });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 3, 2, 4]);
    expect(next.tracks[2].folderId).toBeUndefined();
    expect(next.tracks[1].folderId).toBe(10);
  });

  it('removing the last child dissolves the folder', () => {
    const state = makeState(base());
    const next = tracksDomainReducer(state, {
      type: 'REMOVE_TRACK_FROM_FOLDER',
      payload: { trackIndex: 1 },
    });
    expect(next.tracks.some((t) => t.type === 'folder')).toBe(false);
    expect(next.tracks.map((t) => t.id)).toEqual([2, 3, 4]);
  });

  it('removing is a no-op for a track with no folder', () => {
    const state = makeState(base());
    expect(tracksDomainReducer(state, { type: 'REMOVE_TRACK_FROM_FOLDER', payload: { trackIndex: 2 } })).toBe(state);
  });
});

describe('DUPLICATE_FOLDER', () => {
  const withClips = (id: number, folderId?: number) => ({
    ...makeTrack(id, folderId === undefined ? {} : { folderId }),
    clips: [
      { id: id * 10, name: 'c', start: 0, duration: 1, envelopePoints: [] },
    ],
  }) as Track;

  it('copies the whole family below the original with fresh ids', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder', name: 'Group 1' }),
      withClips(2, 10),
      withClips(3, 10),
      makeTrack(4),
    ]);
    const next = tracksDomainReducer(state, { type: 'DUPLICATE_FOLDER', payload: { trackIndex: 0 } });
    // original family, then the copy, then the untouched track
    expect(next.tracks).toHaveLength(7);
    const copyFolder = next.tracks[3];
    expect(copyFolder.type).toBe('folder');
    expect(copyFolder.name).toBe('Group 2');
    expect(copyFolder.id).not.toBe(10);
    const copies = next.tracks.filter((t) => t.folderId === copyFolder.id);
    expect(copies).toHaveLength(2);
    // fresh track ids AND fresh clip ids, with the source recorded so
    // the audio engine can still find the original buffer
    const originalIds = new Set([10, 2, 3, 4]);
    copies.forEach((c) => expect(originalIds.has(c.id)).toBe(false));
    expect(copies[0].clips[0].id).not.toBe(20);
    expect(copies[0].clips[0].sourceClipId).toBe(20);
    // originals untouched
    expect(next.tracks[1].clips[0].id).toBe(20);
  });

  it('is a no-op on a non-folder row', () => {
    const state = makeState([makeTrack(1)]);
    expect(tracksDomainReducer(state, { type: 'DUPLICATE_FOLDER', payload: { trackIndex: 0 } })).toBe(state);
  });
});

describe('folder mute/solo cascade', () => {
  it('a folder mute/solo reaches its children; siblings unaffected', () => {
    const tracks = [
      makeTrack(10, { type: 'folder', muted: true, soloed: true }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(3),
    ];
    expect(effectiveTrackMuted(tracks, 1)).toBe(true);
    expect(effectiveTrackSoloed(tracks, 1)).toBe(true);
    expect(effectiveTrackMuted(tracks, 2)).toBe(false);
  });
});

describe('normalizeFolders', () => {
  it('drops dangling folderIds and dissolves empty folders; identity-preserving otherwise', () => {
    const clean = [makeTrack(10, { type: 'folder' }), makeTrack(2, { folderId: 10 })];
    expect(normalizeFolders(clean)).toBe(clean);
    const dangling = [makeTrack(2, { folderId: 99 })];
    expect(normalizeFolders(dangling)[0].folderId).toBeUndefined();
    const empty = [makeTrack(10, { type: 'folder' }), makeTrack(2)];
    expect(normalizeFolders(empty).map((t) => t.id)).toEqual([2]);
  });
});


describe('focus invariant through tracksReducer — folder headers never hold focus', () => {
  // The OUTER reducer is the funnel every action passes through, so the
  // rule holds for arrow keys, canvas clicks, grouping and delete alike.
  const folderState = () =>
    makeState([
      makeTrack(1),
      makeTrack(10, { type: 'folder' }),
      makeTrack(2, { folderId: 10 }),
      makeTrack(3, { folderId: 10 }),
      makeTrack(4),
    ]);

  it('SET_FOCUSED_TRACK on a folder header lands on its first child', () => {
    const next = tracksReducer({ ...folderState(), focusedTrackIndex: 0 }, { type: 'SET_FOCUSED_TRACK', payload: 1 });
    expect(next.focusedTrackIndex).toBe(2);
  });

  it('SET_FOCUSED_TRACK on a collapsed folder skips the whole family', () => {
    const state = folderState();
    state.tracks[1] = makeTrack(10, { type: 'folder', collapsed: true });
    const next = tracksReducer({ ...state, focusedTrackIndex: 0 }, { type: 'SET_FOCUSED_TRACK', payload: 1 });
    expect(next.focusedTrackIndex).toBe(4);
  });

  it('SELECT_TRACK on a folder header redirects focus the same way', () => {
    const next = tracksReducer({ ...folderState(), focusedTrackIndex: 0 }, { type: 'SELECT_TRACK', payload: 1 });
    expect(next.focusedTrackIndex).toBe(2);
  });

  it('a focusable target is untouched, and state identity is preserved when nothing changes', () => {
    const state = { ...folderState(), focusedTrackIndex: 3 };
    const next = tracksReducer(state, { type: 'SET_FOCUSED_TRACK', payload: 3 });
    expect(next.focusedTrackIndex).toBe(3);
  });
});


describe('MOVE_TRACK to the bottom slot (toIndex = tracks.length)', () => {
  // Landing ON a row of a group that ends the list resolves to above
  // that group; only "after the last row" can put a block below it.
  it('a folder dragged past the end lands BELOW a trailing group, family intact', () => {
    const state = makeState([
      makeTrack(10, { type: 'folder' }), makeTrack(1, { folderId: 10 }),
      makeTrack(20, { type: 'folder' }), makeTrack(2, { folderId: 20 }), makeTrack(3, { folderId: 20 }),
    ]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 5 } });
    expect(next.tracks.map((t) => t.id)).toEqual([20, 2, 3, 10, 1]);
    expect(next.tracks[4].folderId).toBe(10);
    expect(next.focusedTrackIndex).toBe(3);
  });

  it('...whereas landing ON the trailing group (its header or an earlier member) stays above it — the ceiling', () => {
    // Landing on a member walks the block up to sit above that family
    // (no nesting). Only the family's LAST row escapes that, because the
    // block's insert point falls past the end — and a collapsed trailing
    // group has no reachable last row at all. Hence the sentinel.
    const state = makeState([
      makeTrack(10, { type: 'folder' }), makeTrack(1, { folderId: 10 }),
      makeTrack(20, { type: 'folder' }), makeTrack(2, { folderId: 20 }), makeTrack(3, { folderId: 20 }),
    ]);
    const onHeader = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 2 } });
    expect(onHeader.tracks.map((t) => t.id)).toEqual([10, 1, 20, 2, 3]);
    const onFirstMember = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 3 } });
    expect(onFirstMember.tracks.map((t) => t.id)).toEqual([10, 1, 20, 2, 3]);
  });

  it('a plain track dragged past the end appends and joins the group it lands under', () => {
    const state = makeState([makeTrack(1), makeTrack(20, { type: 'folder' }), makeTrack(2, { folderId: 20 })]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 3 } });
    expect(next.tracks.map((t) => t.id)).toEqual([20, 2, 1]);
    expect(next.tracks[2].folderId).toBe(20); // membership follows the row above
  });

  it('beyond tracks.length is still rejected', () => {
    const state = makeState([makeTrack(1), makeTrack(2)]);
    expect(tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 3 } })).toBe(state);
  });
});


describe("MOVE_TRACK membership: 'leave' — the group-boundary drop zones", () => {
  // Membership follows the row above by default, so no landing near a
  // group can get a track OUT. The boundary zones pass 'leave'.
  it('a member landing after its group with leave steps out of it', () => {
    const state = makeState([makeTrack(10, { type: 'folder' }), makeTrack(1, { folderId: 10 }), makeTrack(2, { folderId: 10 }), makeTrack(3)]);
    // drag track 1 (index 1) to after the last member (index 2): moving down → toIndex 2
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 1, toIndex: 2, membership: 'leave' } });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 2, 1, 3]);
    expect(next.tracks[2].folderId).toBeUndefined();
    expect(next.tracks[1].folderId).toBe(10);
    expect(next.focusedTrackIndex).toBe(2);
  });

  it("...whereas the same landing with the default 'follow' stays a member", () => {
    const state = makeState([makeTrack(10, { type: 'folder' }), makeTrack(1, { folderId: 10 }), makeTrack(2, { folderId: 10 }), makeTrack(3)]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 1, toIndex: 2 } });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 2, 1, 3]);
    expect(next.tracks[2].folderId).toBe(10);
  });

  it('the last member stepping out where it stands dissolves nothing but frees it', () => {
    const state = makeState([makeTrack(10, { type: 'folder' }), makeTrack(1, { folderId: 10 }), makeTrack(2, { folderId: 10 })]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 2, toIndex: 2, membership: 'leave' } });
    expect(next.tracks.map((t) => t.id)).toEqual([10, 1, 2]);
    expect(next.tracks[2].folderId).toBeUndefined();
  });

  it('the bottom slot with leave lands outside a trailing group', () => {
    const state = makeState([makeTrack(1), makeTrack(20, { type: 'folder' }), makeTrack(2, { folderId: 20 })]);
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 0, toIndex: 3, membership: 'leave' } });
    expect(next.tracks.map((t) => t.id)).toEqual([20, 2, 1]);
    expect(next.tracks[2].folderId).toBeUndefined();
    expect(next.focusedTrackIndex).toBe(2);
  });

  it('a member landing just above its own header with leave sits outside, above the group', () => {
    const state = makeState([makeTrack(0), makeTrack(10, { type: 'folder' }), makeTrack(1, { folderId: 10 }), makeTrack(2, { folderId: 10 })]);
    // drag track 2 (index 3) to before the header (index 1): moving up → toIndex 1
    const next = tracksDomainReducer(state, { type: 'MOVE_TRACK', payload: { fromIndex: 3, toIndex: 1, membership: 'leave' } });
    expect(next.tracks.map((t) => t.id)).toEqual([0, 2, 10, 1]);
    expect(next.tracks[1].folderId).toBeUndefined();
  });
});
