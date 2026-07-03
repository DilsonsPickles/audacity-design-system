import type { TracksState, TracksAction, Track } from '../TracksContext';
import { TRACK_COLOR_PALETTE } from './shared';

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

    case 'DELETE_TRACK': {
      const newTracks = state.tracks.filter((_, index) => index !== action.payload);
      const newFocused = newTracks.length === 0
        ? null
        : Math.min(action.payload, newTracks.length - 1);
      return {
        ...state,
        tracks: newTracks,
        focusedTrackIndex: newFocused,
        // Selection is a deliberate user action; don't infer it on delete.
        // Drop any stale selection that referred to the deleted track.
        selectedTrackIndices: state.selectedTrackIndices
          .filter((i) => i !== action.payload)
          .map((i) => (i > action.payload ? i - 1 : i)),
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
        tracks: remainingTracks,
        // Drop deleted indices from the selection set rather than
        // auto-selecting the new focused track.
        selectedTrackIndices: state.selectedTrackIndices
          .filter((i) => !indicesToDelete.has(i))
          .map((i) => i - [...indicesToDelete].filter((d) => d < i).length),
        focusedTrackIndex: newFocused,
      };
    }

    case 'MOVE_TRACK': {
      const { fromIndex, toIndex } = action.payload;
      if (toIndex < 0 || toIndex >= state.tracks.length) return state;
      const TRACK_COLORS = ['blue', 'violet', 'magenta'] as const;
      // Stamp current index-based colors onto clips before reordering
      const newTracks = state.tracks.map((track, i) => {
        const hasExplicitColors = track.clips.every((c: any) => c.color);
        if (hasExplicitColors) return track;
        const color = TRACK_COLORS[i % TRACK_COLORS.length];
        return {
          ...track,
          clips: track.clips.map(c => ({ ...c, color: (c as any).color || color })),
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
      };
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
