import type { TracksState, TracksAction } from '../TracksContext';

export function midiReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    // Piano Roll / MIDI actions
    case 'SET_PIANO_ROLL_OPEN': {
      const trackIdx = action.payload.trackIndex ?? state.pianoRollTrackIndex;
      const clipIdx = action.payload.clipIndex ?? state.pianoRollClipIndex;
      // When opening, scroll to the clip's global start position
      let scrollX = state.pianoRollScrollX;
      if (action.payload.open && trackIdx !== null && clipIdx !== null) {
        const midiClip = state.tracks[trackIdx]?.midiClips?.[clipIdx];
        if (midiClip) {
          scrollX = midiClip.start * state.pianoRollPixelsPerSecond;
        }
      }
      return {
        ...state,
        pianoRollOpen: action.payload.open,
        pianoRollTrackIndex: trackIdx,
        pianoRollClipIndex: clipIdx,
        pianoRollScrollX: scrollX,
      };
    }

    case 'SET_PIANO_ROLL_SNAP':
      return { ...state, pianoRollSnap: action.payload };

    case 'SET_PIANO_ROLL_TIME_BASIS':
      return { ...state, pianoRollTimeBasis: action.payload };

    case 'SET_PIANO_ROLL_PIXELS_PER_SECOND':
      return { ...state, pianoRollPixelsPerSecond: action.payload };

    case 'SET_PIANO_ROLL_SCROLL_X':
      return { ...state, pianoRollScrollX: action.payload };

    case 'ADD_MIDI_NOTE': {
      const { trackIndex, clipIndex, note } = action.payload;
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: [...midiClips[clipIndex].notes, note],
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'DELETE_MIDI_NOTES': {
      const { trackIndex, clipIndex, noteIds } = action.payload;
      const idSet = new Set(noteIds);
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: midiClips[clipIndex].notes.filter(n => !idSet.has(n.id)),
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_MIDI_NOTE': {
      const { trackIndex, clipIndex, noteId, updates } = action.payload;
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: midiClips[clipIndex].notes.map(n =>
          n.id === noteId ? { ...n, ...updates } : n
        ),
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'SELECT_MIDI_NOTE': {
      const { trackIndex, clipIndex, noteId, additive } = action.payload;
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: midiClips[clipIndex].notes.map(n => ({
          ...n,
          selected: n.id === noteId ? true : (additive ? n.selected : false),
        })),
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'SELECT_MIDI_NOTES': {
      const { trackIndex, clipIndex, noteIds, additive } = action.payload;
      const idSet = new Set(noteIds);
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: midiClips[clipIndex].notes.map(n => ({
          ...n,
          selected: idSet.has(n.id) ? true : (additive ? n.selected : false),
        })),
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'DESELECT_ALL_MIDI_NOTES': {
      const { trackIndex, clipIndex } = action.payload;
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: midiClips[clipIndex].notes.map(n => ({ ...n, selected: false })),
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'RESIZE_MIDI_NOTE': {
      const { trackIndex, clipIndex, noteId, newDuration } = action.payload;
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      const midiClips = [...(track.midiClips || [])];
      midiClips[clipIndex] = {
        ...midiClips[clipIndex],
        notes: midiClips[clipIndex].notes.map(n =>
          n.id === noteId ? { ...n, duration: newDuration } : n
        ),
      };
      track.midiClips = midiClips;
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    case 'ADD_MIDI_CLIP': {
      const { trackIndex, clip } = action.payload;
      const newTracks = [...state.tracks];
      const track = { ...newTracks[trackIndex] };
      track.midiClips = [...(track.midiClips || []), clip];
      newTracks[trackIndex] = track;
      return { ...state, tracks: newTracks };
    }

    default:
      return state;
  }
}
