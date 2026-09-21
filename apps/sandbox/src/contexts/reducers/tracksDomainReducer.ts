import type { TracksState, TracksAction, Track } from '../TracksContext';
import { TRACK_COLOR_PALETTE, dissolveDegenerateGroups } from './shared';
import { folderChildIndices, isFolderTrack, normalizeFolders } from '../../utils/trackFolders';

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
      // place (normalizeFolders drops their dangling folderId).
      const newTracks = normalizeFolders(state.tracks.filter((_, index) => index !== action.payload));
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
      const { fromIndex, toIndex } = action.payload;
      if (toIndex < 0 || toIndex >= state.tracks.length) return state;
      // Folders v1: a folder row drags its FAMILY (folder + contiguous
      // children) as one block; membership editing is a separate
      // gesture. Implemented as a block splice with selection/scope
      // cleared to the folder row (index remapping across a block move
      // is not worth its edge cases for v1).
      if (isFolderTrack(state.tracks[fromIndex])) {
        const children = folderChildIndices(state.tracks, fromIndex);
        const blockSize = 1 + children.length;
        const blockStart = fromIndex;
        const tracksCopy = [...state.tracks];
        const block = tracksCopy.splice(blockStart, blockSize);
        // Clamp the landing index so the block stays inside the array
        // and never lands INSIDE another folder's family
        let insert = Math.max(0, Math.min(tracksCopy.length, toIndex > fromIndex ? toIndex - blockSize + 1 : toIndex));
        const landingOn = tracksCopy[insert];
        if (landingOn?.folderId !== undefined) {
          // walk up out of the family we'd be splitting
          while (insert > 0 && tracksCopy[insert - 1] && (tracksCopy[insert - 1].folderId === landingOn.folderId || (isFolderTrack(tracksCopy[insert - 1]) && tracksCopy[insert - 1].id === landingOn.folderId))) {
            insert -= 1;
          }
        }
        tracksCopy.splice(insert, 0, ...block);
        return {
          ...state,
          tracks: tracksCopy,
          focusedTrackIndex: insert,
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
      const [moved] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, moved);
      // Remap selected track indices to follow the reorder
      const newSelected = state.selectedTrackIndices.map(i => {
        if (i === fromIndex) return toIndex;
        if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
        if (fromIndex > toIndex && i >= toIndex && i < fromIndex) return i + 1;
        return i;
      });
      return {
        ...state,
        tracks: newTracks,
        focusedTrackIndex: toIndex,
        selectedTrackIndices: newSelected,
        timeSelection: remapTimeSelectionTracks(state.timeSelection, (i) => {
          if (i === fromIndex) return toIndex;
          if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
          if (fromIndex > toIndex && i >= toIndex && i < fromIndex) return i + 1;
          return i;
        }),
      };
    }

    case 'GROUP_SELECTED_TRACKS': {
      // Folders v1: wrap the selected (non-folder) tracks in a new
      // folder row. The folder inserts where the first selected track
      // was; the children move to sit CONTIGUOUSLY below it, preserving
      // their relative order (the folder-family invariant every other
      // folder operation relies on). Tracks already in a folder are
      // re-parented; a folder emptied by that dissolves (normalize).
      const eligible = state.selectedTrackIndices
        .filter((i) => state.tracks[i] && state.tracks[i].type !== 'folder')
        .sort((a, b) => a - b);
      if (eligible.length === 0) return state;

      const folderId = state.tracks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      const folderCount = state.tracks.filter((t) => t.type === 'folder').length;
      const folder: Track = {
        id: folderId,
        name: `Group ${folderCount + 1}`,
        type: 'folder',
        clips: [],
        collapsed: false,
      };

      const eligibleSet = new Set(eligible);
      const children = eligible.map((i) => ({ ...state.tracks[i], folderId }));
      const rest = state.tracks.filter((_, i) => !eligibleSet.has(i));
      // Insert position: count remaining tracks before the first child
      const insertAt = state.tracks.slice(0, eligible[0]).filter((_, i) => !eligibleSet.has(i)).length;
      const newTracks = [...rest];
      newTracks.splice(insertAt, 0, folder, ...children);

      return {
        ...state,
        tracks: normalizeFolders(newTracks),
        focusedTrackIndex: insertAt,
        // The children stay selected at their new, contiguous indices
        selectedTrackIndices: children.map((_, k) => insertAt + 1 + k),
        timeSelection: null,
      };
    }

    case 'UNGROUP_FOLDER': {
      const folder = state.tracks[action.payload.trackIndex];
      if (!folder || folder.type !== 'folder') return state;
      const newTracks = state.tracks
        .filter((_, i) => i !== action.payload.trackIndex)
        .map((t) => {
          if (t.folderId !== folder.id) return t;
          const { folderId: _dropped, ...rest } = t;
          return rest as Track;
        });
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
