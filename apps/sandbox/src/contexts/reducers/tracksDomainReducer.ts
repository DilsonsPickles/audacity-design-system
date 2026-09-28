import type { TracksState, TracksAction, Track } from '../TracksContext';
import { TRACK_COLOR_PALETTE, dissolveDegenerateGroups } from './shared';
import { ancestorFolderIndices } from '@audacity-ui/core';
import { folderDescendantIndices, isFolderTrack, moveTrackWithFolders, normalizeFolders } from '../../utils/trackFolders';

/** Remap a time-selection's scope after tracks are removed or
 *  reordered. `remap` returns the new index for an old index, or null
 *  to drop it. If the remap empties a previously non-empty scope the
 *  whole selection is cleared — the rows it was scoped to are gone. */
function remapTimeSelectionTracks(
  timeSelection: TracksState['timeSelection'],
  remap: (index: number) => number | null,
): TracksState['timeSelection'] {
  if (!timeSelection?.tracks?.length) return timeSelection;
  const remapped = timeSelection.tracks
    .map(remap)
    .filter((i): i is number => i !== null)
    .sort((a, b) => a - b);
  if (remapped.length === 0) return null;
  return { ...timeSelection, tracks: remapped };
}

/** Wrap `indices` (non-folder tracks) in a NEW folder row — the one
 *  implementation behind both "Group selected tracks" and the row
 *  menu's "Create group", so a group of one and a group of many are
 *  built identically. Members move to sit CONTIGUOUSLY below the new
 *  row, preserving their relative order.
 *
 *  The new group is created WHERE ITS MEMBERS LIVE: inside the deepest
 *  group that contains all of them. Tracks that share a group become a
 *  SUB-group of it — that is how nesting is made from the menu — and
 *  tracks from different groups meet in whatever contains them both,
 *  which is the root when nothing does. A folder emptied by the move
 *  dissolves (normalize). */
function groupTracks(state: TracksState, indices: readonly number[]): TracksState {
  const eligible = [...new Set(indices)]
    .filter((i) => state.tracks[i] && state.tracks[i].type !== 'folder')
    .sort((a, b) => a - b);
  if (eligible.length === 0) return state;

  // Each member's chain of folders, outermost first; what they all
  // share is the new group's home.
  const chains = eligible.map((i) => ancestorFolderIndices(state.tracks, i).reverse());
  let shared = chains[0];
  for (const chain of chains) {
    let k = 0;
    while (k < shared.length && k < chain.length && shared[k] === chain[k]) k += 1;
    shared = shared.slice(0, k);
  }
  const parent = shared.length > 0 ? state.tracks[shared[shared.length - 1]] : undefined;
  // It goes where the first member was — unless that member sits deeper,
  // inside a sub-group: then BEFORE that sub-group, never in the middle
  // of it.
  const anchor = chains[0].length > shared.length ? chains[0][shared.length] : eligible[0];

  const folderId = state.tracks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const folderCount = state.tracks.filter((t) => t.type === 'folder').length;
  const folder: Track = {
    id: folderId,
    name: `Group ${folderCount + 1}`,
    type: 'folder',
    clips: [],
    collapsed: false,
    ...(parent ? { folderId: parent.id } : null),
  };

  const eligibleSet = new Set(eligible);
  const children = eligible.map((i) => ({ ...state.tracks[i], folderId }));
  const rest = state.tracks.filter((_, i) => !eligibleSet.has(i));
  // Insert position: count remaining tracks before the anchor
  const insertAt = state.tracks.slice(0, anchor).filter((_, i) => !eligibleSet.has(i)).length;
  const newTracks = [...rest];
  newTracks.splice(insertAt, 0, folder, ...children);
  const tracks = normalizeFolders(newTracks);
  // By id: a folder dissolving above shifts every index below it.
  const indexOf = (id: number) => tracks.findIndex((t) => t.id === id);

  return {
    ...state,
    tracks,
    // Focus the FIRST MEMBER, not the folder row: a folder header is
    // never focusable (utils/trackFocus.ts — tracksReducer would
    // redirect it anyway; saying it here keeps the intent readable).
    focusedTrackIndex: indexOf(children[0].id),
    // The members stay selected at their new, contiguous indices
    selectedTrackIndices: children.map((c) => indexOf(c.id)),
    timeSelection: null,
  };
}

/** Remove a folder ROW and hand its direct children to the group
 *  AROUND it (or free them, at the top level) — ungrouping one level
 *  of a nest must not throw its tracks out of every other level. */
function withoutFolderRow(tracks: readonly Track[], index: number): Track[] {
  const folder = tracks[index];
  return tracks
    .filter((_, i) => i !== index)
    .map((t) => {
      if (t.folderId !== folder.id) return t;
      if (folder.folderId !== undefined) return { ...t, folderId: folder.folderId };
      const { folderId: _dropped, ...rest } = t;
      return rest as Track;
    });
}

/** Move the row at `fromIndex` (a folder takes its subtree) to the END
 *  of `parent`'s subtree — or, with `parent` null, nowhere: callers
 *  pass the slot. Shared by the menu's Add to / Remove from group. */
function moveToSlot(
  state: TracksState,
  fromIndex: number,
  /** Insert before this row of the list WITHOUT the moved block */
  slotIn: (rest: readonly Track[], inRest: (i: number) => number) => number,
  parentId: number | null,
): TracksState {
  const source = state.tracks[fromIndex];
  const size = source.type === 'folder' ? 1 + folderDescendantIndices(state.tracks, fromIndex).length : 1;
  const inBlock = (i: number) => i >= fromIndex && i < fromIndex + size;
  const rest = state.tracks.filter((_, i) => !inBlock(i));
  const slot = slotIn(rest, (i) => (i < fromIndex ? i : i - size));
  const toIndex = slot <= fromIndex ? slot : slot + size - 1;
  const moved = moveTrackWithFolders(state.tracks, fromIndex, toIndex, { parentId });
  const tracks = normalizeFolders(moved.tracks);
  return {
    ...state,
    tracks,
    focusedTrackIndex: tracks.findIndex((t) => t.id === source.id),
    selectedTrackIndices: [],
    timeSelection: null,
  };
}

export function tracksDomainReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    case 'SET_TRACKS': {
      const newFocusedTrackIndex = action.payload.length > 0 && state.focusedTrackIndex === null
        ? 0
        : state.focusedTrackIndex;
      // Dedup ids: a previously-saved project (or any caller) may carry
      // colliding track.ids, which would crash React's keyed reconciliation.
      // First-seen wins; later collisions get bumped to running max+1.
      const seenIds = new Set<number>();
      let runningMaxId = action.payload.reduce(
        (max, t) => (t.id > max ? t.id : max),
        0,
      );
      const dedupedTracks = action.payload.map((track) => {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          return track;
        }
        runningMaxId += 1;
        seenIds.add(runningMaxId);
        return { ...track, id: runningMaxId };
      });
      // Assign colors to tracks that don't have one
      let colorIdx = 0;
      const coloredTracks = dedupedTracks.map((track) => {
        if (track.color) return track;
        const color = TRACK_COLOR_PALETTE[colorIdx % TRACK_COLOR_PALETTE.length];
        colorIdx++;
        return { ...track, color };
      });
      // Auto-select the first track on load — gives the project a
      // sensible starting state instead of "nothing selected". If the
      // caller already passed a selection in via state, leave it.
      const newSelectedTrackIndices =
        coloredTracks.length > 0 && state.selectedTrackIndices.length === 0
          ? [newFocusedTrackIndex ?? 0]
          : state.selectedTrackIndices;
      return {
        ...state,
        tracks: coloredTracks,
        nextTrackColorIndex: colorIdx,
        // Auto-focus first track when loading tracks, unless already focused
        focusedTrackIndex: newFocusedTrackIndex,
        selectedTrackIndices: newSelectedTrackIndices,
        // SET_TRACKS is a bulk replace (project load / reset) — drop history
        // so undo can't roll back across an unrelated project state.
        past: [],
        future: [],
        lastUndoCoalesceGroup: null,
        lastUndoTimestamp: null,
      };
    }

    case 'REPLACE_TRACKS_EDIT': {
      // Bulk replacement that IS a user-initiated edit (e.g. clipboard
      // cut/paste). Same coloring/dedup as SET_TRACKS but the wrapper
      // snapshots into `past` so Cmd+Z reverses the operation.
      const seenIds = new Set<number>();
      let runningMaxId = action.payload.reduce(
        (max, t) => (t.id > max ? t.id : max),
        0,
      );
      const dedupedTracks = action.payload.map((track) => {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          return track;
        }
        runningMaxId += 1;
        seenIds.add(runningMaxId);
        return { ...track, id: runningMaxId };
      });
      let colorIdx = state.nextTrackColorIndex;
      const coloredTracks = dedupedTracks.map((track) => {
        if (track.color) return track;
        const color = TRACK_COLOR_PALETTE[colorIdx % TRACK_COLOR_PALETTE.length];
        colorIdx++;
        return { ...track, color };
      });
      return {
        ...state,
        tracks: coloredTracks,
        nextTrackColorIndex: colorIdx,
      };
    }

    case 'ADD_TRACK': {
      const { insertAt, ...track } = action.payload as Track & { insertAt?: number };
      const color = track.color ?? TRACK_COLOR_PALETTE[state.nextTrackColorIndex % TRACK_COLOR_PALETTE.length];
      // Defense in depth: if the caller passed an id that already exists
      // (collisions caused React duplicate-key warnings), bump to max+1.
      const existingIds = new Set(state.tracks.map((t) => t.id));
      const safeId = existingIds.has(track.id)
        ? state.tracks.reduce((max, t) => (t.id > max ? t.id : max), 0) + 1
        : track.id;
      // insertAt lets callers (e.g. duplicate) drop the new track at
      // a specific position rather than appending — clamped to a
      // valid slice index so out-of-range values just append.
      const newTrack = { ...track, id: safeId, color };
      const newTracks = [...state.tracks];
      const position =
        insertAt !== undefined && insertAt >= 0 && insertAt <= state.tracks.length
          ? insertAt
          : newTracks.length;
      newTracks.splice(position, 0, newTrack);
      return {
        ...state,
        tracks: newTracks,
        focusedTrackIndex: position,
        nextTrackColorIndex: track.color ? state.nextTrackColorIndex : state.nextTrackColorIndex + 1,
      };
    }

    case 'UPDATE_TRACK': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        ...action.payload.track,
      };
      return { ...state, tracks: newTracks };
    }

    case 'SET_TRACK_MUTED_EXCLUSIVE': {
      const target = action.payload;
      return {
        ...state,
        tracks: state.tracks.map((t, i) => ({ ...t, muted: i === target })),
      };
    }

    case 'SET_TRACK_SOLOED_EXCLUSIVE': {
      const target = action.payload;
      return {
        ...state,
        tracks: state.tracks.map((t, i) => ({ ...t, soloed: i === target })),
      };
    }

    case 'DELETE_TRACK': {
      // Deleting a FOLDER row is an ungroup: the children survive in
      // place, handed to the group around it if there is one.
      const newTracks = normalizeFolders(
        isFolderTrack(state.tracks[action.payload])
          ? withoutFolderRow(state.tracks, action.payload)
          : state.tracks.filter((_, index) => index !== action.payload),
      );
      const newFocused = newTracks.length === 0
        ? null
        : Math.min(action.payload, newTracks.length - 1);
      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
        focusedTrackIndex: newFocused,
        // Selection is a deliberate user action; don't infer it on delete.
        // Drop any stale selection that referred to the deleted track.
        selectedTrackIndices: state.selectedTrackIndices
          .filter((i) => i !== action.payload)
          .map((i) => (i > action.payload ? i - 1 : i)),
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) =>
          i === action.payload ? null : i > action.payload ? i - 1 : i,
        ),
      };
    }

    case 'DELETE_PROVISIONAL_TRACK': {
      const idx = state.tracks.findIndex(t => t.id === action.payload.trackId);
      if (idx === -1) return state;
      const newTracks = state.tracks.filter(t => t.id !== action.payload.trackId);
      const newFocused = newTracks.length === 0
        ? null
        : state.focusedTrackIndex === null
        ? null
        : state.focusedTrackIndex >= idx
        ? Math.max(0, state.focusedTrackIndex - 1)
        : state.focusedTrackIndex;
      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
        focusedTrackIndex: newFocused,
        selectedTrackIndices: state.selectedTrackIndices
          .filter(i => i !== idx)
          .map(i => (i > idx ? i - 1 : i)),
        timeSelection: remapTimeSelectionTracks(state.timeSelection, i =>
          i === idx ? null : i > idx ? i - 1 : i
        ),
      };
    }

    case 'DELETE_TRACKS': {
      const indicesToDelete = new Set(action.payload);
      const remainingTracks = state.tracks.filter((_, index) => !indicesToDelete.has(index));
      const lowestDeleted = Math.min(...action.payload);
      const newFocused = remainingTracks.length === 0
        ? null
        : Math.min(lowestDeleted, remainingTracks.length - 1);
      return {
        ...state,
        tracks: dissolveDegenerateGroups(remainingTracks),
        // Drop deleted indices from the selection set rather than
        // auto-selecting the new focused track.
        selectedTrackIndices: state.selectedTrackIndices
          .filter((i) => !indicesToDelete.has(i))
          .map((i) => i - [...indicesToDelete].filter((d) => d < i).length),
        focusedTrackIndex: newFocused,
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) =>
          indicesToDelete.has(i)
            ? null
            : i - [...indicesToDelete].filter((d) => d < i).length,
        ),
      };
    }

    case 'MOVE_TRACK': {
      const { fromIndex, toIndex, membership = 'follow' } = action.payload;
      // toIndex === tracks.length is legal: "after the last row" — the
      // only way a block can land BELOW a group that ends the list, since
      // landing ON any of that group's rows resolves to above it.
      if (toIndex < 0 || toIndex > state.tracks.length) return state;
      // Folders v1: a folder row drags its FAMILY (folder + contiguous
      // children) as one block; membership editing is a separate
      // gesture. Implemented as a block splice with selection/scope
      // cleared to the folder row (index remapping across a block move
      // is not worth its edge cases for v1).
      if (isFolderTrack(state.tracks[fromIndex])) {
        // Shared with the drag preview (utils/trackFolders.ts) so the
        // indicator can't promise a landing the move won't deliver.
        // Normalized too: lifting a nested group out can empty the
        // group it left.
        const movedId = state.tracks[fromIndex].id;
        const moved = normalizeFolders(
          moveTrackWithFolders(state.tracks, fromIndex, toIndex, membership).tracks,
        );
        return {
          ...state,
          tracks: moved,
          focusedTrackIndex: moved.findIndex((t) => t.id === movedId),
          selectedTrackIndices: [],
          timeSelection: null,
        };
      }
      const TRACK_COLORS = ['blue', 'violet', 'magenta'] as const;
      // Stamp current index-based colors onto clips before reordering
      const newTracks = state.tracks.map((track, i) => {
        const hasExplicitColors = track.clips.every((c) => c.color);
        if (hasExplicitColors) return track;
        const color = TRACK_COLORS[i % TRACK_COLORS.length];
        return {
          ...track,
          clips: track.clips.map(c => ({ ...c, color: c.color || color })),
        };
      });
      // Membership follows the landing spot — or is explicitly LEFT, for
      // the group-boundary drop zones — via the same shared helper the
      // drag preview runs (utils/trackFolders.ts)
      const moved = moveTrackWithFolders(newTracks, fromIndex, toIndex, membership);
      newTracks.length = 0;
      newTracks.push(...moved.tracks);
      // Remap selected track indices to follow the reorder
      const newSelected = state.selectedTrackIndices.map(i => {
        if (i === fromIndex) return toIndex;
        if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
        if (fromIndex > toIndex && i >= toIndex && i < fromIndex) return i + 1;
        return i;
      });
      const movedTrackId = state.tracks[fromIndex]?.id;
      const normalized = normalizeFolders(newTracks);
      return {
        ...state,
        tracks: normalized,
        // By id, not toIndex: the bottom-slot sentinel is past the end,
        // and a folder dissolving above shifts everything below it
        focusedTrackIndex: Math.max(0, normalized.findIndex((t) => t.id === movedTrackId)),
        selectedTrackIndices: newSelected,
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) => {
          if (i === fromIndex) return toIndex;
          if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
          if (fromIndex > toIndex && i >= toIndex && i < fromIndex) return i + 1;
          return i;
        }),
      };
    }

    case 'GROUP_SELECTED_TRACKS':
      return groupTracks(state, state.selectedTrackIndices);

    case 'GROUP_TRACKS':
      return groupTracks(state, action.payload.trackIndices);

    case 'UNGROUP_FOLDER': {
      const folder = state.tracks[action.payload.trackIndex];
      if (!folder || folder.type !== 'folder') return state;
      const newTracks = withoutFolderRow(state.tracks, action.payload.trackIndex);
      return {
        ...state,
        tracks: newTracks,
        focusedTrackIndex: Math.min(action.payload.trackIndex, Math.max(0, newTracks.length - 1)),
        selectedTrackIndices: state.selectedTrackIndices
          .filter((i) => i !== action.payload.trackIndex)
          .map((i) => (i > action.payload.trackIndex ? i - 1 : i)),
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) =>
          i === action.payload.trackIndex ? null : i > action.payload.trackIndex ? i - 1 : i,
        ),
      };
    }

    case 'ADD_TRACK_TO_FOLDER': {
      // Menu mirror of dragging a row into a group: it moves to the
      // END of that group's subtree, keeping every family contiguous.
      // A row may be a group itself — that nests it — but never into
      // itself or anything inside it.
      const { trackIndex, folderId } = action.payload;
      const track = state.tracks[trackIndex];
      const folderIdx = state.tracks.findIndex((t) => t.type === 'folder' && t.id === folderId);
      if (!track || folderIdx === -1 || folderIdx === trackIndex || track.folderId === folderId) return state;
      if (ancestorFolderIndices(state.tracks, folderIdx).includes(trackIndex)) return state;
      return moveToSlot(
        state,
        trackIndex,
        (rest, inRest) => {
          const home = inRest(folderIdx);
          return home + 1 + folderDescendantIndices(rest, home).length;
        },
        folderId,
      );
    }

    case 'REMOVE_TRACK_FROM_FOLDER': {
      // Steps ONE level out: it leaves its group for the group around
      // that (or the root), parking just BELOW the family it left so
      // what remains stays contiguous.
      const { trackIndex } = action.payload;
      const track = state.tracks[trackIndex];
      const folderId = track?.folderId;
      if (!track || folderId === undefined) return state;
      const folderIdx = state.tracks.findIndex((t) => t.type === 'folder' && t.id === folderId);
      if (folderIdx === -1) return state;
      return moveToSlot(
        state,
        trackIndex,
        (rest, inRest) => {
          const home = inRest(folderIdx);
          return home + 1 + folderDescendantIndices(rest, home).length;
        },
        state.tracks[folderIdx].folderId ?? null,
      );
    }

    case 'DUPLICATE_FOLDER': {
      // Copy the whole SUBTREE below the original, nested groups and
      // all. Every row gets a fresh id and the copies point at each
      // other, not at the originals. Clips get fresh ids but carry
      // `sourceClipId` so the audio engine still finds the original's
      // buffer (duplicate ids would collide in its player map and one
      // copy would go silent).
      const { trackIndex } = action.payload;
      const folder = state.tracks[trackIndex];
      if (!folder || folder.type !== 'folder') return state;
      const family = [trackIndex, ...folderDescendantIndices(state.tracks, trackIndex)];

      let nextTrackId = state.tracks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      let nextClipId = state.tracks.reduce(
        (max, t) => t.clips.reduce((m, c) => Math.max(m, c.id), max),
        0,
      ) + 1;
      const folderCount = state.tracks.filter((t) => t.type === 'folder').length;
      const newIds = new Map<number, number>();
      family.forEach((i) => newIds.set(state.tracks[i].id, nextTrackId++));
      const copies: Track[] = family.map((i) => {
        const src = state.tracks[i];
        const isRoot = i === trackIndex;
        return {
          ...src,
          id: newIds.get(src.id) as number,
          // The copy stays beside the original, in the same group;
          // everything inside it follows the copy.
          ...(isRoot ? null : { folderId: newIds.get(src.folderId as number) }),
          ...(isRoot ? { name: `Group ${folderCount + 1}` } : null),
          clips: src.clips.map((c) => ({
            ...c,
            id: nextClipId++,
            sourceClipId: c.sourceClipId ?? c.id,
          })),
        };
      });

      const insertAt = Math.max(...family) + 1;
      const next = [...state.tracks];
      next.splice(insertAt, 0, ...copies);
      return {
        ...state,
        tracks: next,
        focusedTrackIndex: insertAt,
        selectedTrackIndices: [],
        timeSelection: null,
      };
    }

    case 'TOGGLE_FOLDER_COLLAPSED': {
      const folder = state.tracks[action.payload.trackIndex];
      if (!folder || folder.type !== 'folder') return state;
      const newTracks = [...state.tracks];
      newTracks[action.payload.trackIndex] = { ...folder, collapsed: !folder.collapsed };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_HEIGHT': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        height: action.payload.height,
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_CHANNEL_SPLIT_RATIO': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        channelSplitRatio: action.payload.ratio,
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_VIEW': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        viewMode: action.payload.viewMode,
      };

      return {
        ...state,
        tracks: newTracks,
      };
    }

    case 'UPDATE_TRACK_RULER_FORMAT': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        waveformRulerFormat: action.payload.format,
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_SPECTROGRAM_SCALE': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        spectrogramScale: action.payload.scale,
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_SPECTROGRAM_FREQ': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        ...(action.payload.minFreq !== undefined && { spectrogramMinFreq: action.payload.minFreq }),
        ...(action.payload.maxFreq !== undefined && { spectrogramMaxFreq: action.payload.maxFreq }),
      };
      return { ...state, tracks: newTracks };
    }

    default:
      return state;
  }
}
