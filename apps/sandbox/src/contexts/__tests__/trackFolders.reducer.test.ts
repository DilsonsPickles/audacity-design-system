import { describe, it, expect } from 'vitest';
import { tracksDomainReducer } from '../reducers/tracksDomainReducer';
import { initialState } from '../TracksContext';
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
    // folder focused, children selected at their new indices
    expect(next.focusedTrackIndex).toBe(1);
    expect(next.selectedTrackIndices).toEqual([2, 3]);
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
