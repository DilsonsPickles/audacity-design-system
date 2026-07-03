import type { TracksState, TracksAction } from '../TracksContext';

export function effectsReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    // Track effects actions
    case 'ADD_TRACK_EFFECT': {
      const { trackIndex, effect } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        effects: [...(newTracks[trackIndex].effects || []), effect],
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_EFFECT': {
      const { trackIndex, effectIndex, updates } = action.payload;
      const newTracks = [...state.tracks];
      const effects = newTracks[trackIndex].effects || [];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        effects: effects.map((effect, idx) =>
          idx === effectIndex ? { ...effect, ...updates } : effect
        ),
      };
      return { ...state, tracks: newTracks };
    }

    case 'REMOVE_TRACK_EFFECT': {
      const { trackIndex, effectIndex } = action.payload;
      const newTracks = [...state.tracks];
      const effects = newTracks[trackIndex].effects || [];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        effects: effects.filter((_, idx) => idx !== effectIndex),
      };
      return { ...state, tracks: newTracks };
    }

    case 'REORDER_TRACK_EFFECTS': {
      const { trackIndex, fromIndex, toIndex } = action.payload;
      const newTracks = [...state.tracks];
      const effects = [...(newTracks[trackIndex].effects || [])];
      const [movedEffect] = effects.splice(fromIndex, 1);
      effects.splice(toIndex, 0, movedEffect);
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        effects,
      };
      return { ...state, tracks: newTracks };
    }

    case 'TOGGLE_ALL_TRACK_EFFECTS': {
      const { trackIndex, enabled } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        effectsEnabled: enabled,
      };
      return { ...state, tracks: newTracks };
    }

    // Master effects actions
    case 'SET_MASTER_EFFECTS': {
      return {
        ...state,
        masterEffects: action.payload,
      };
    }

    case 'ADD_MASTER_EFFECT': {
      return {
        ...state,
        masterEffects: [...state.masterEffects, action.payload],
      };
    }

    case 'UPDATE_MASTER_EFFECT': {
      const { effectIndex, updates } = action.payload;
      return {
        ...state,
        masterEffects: state.masterEffects.map((effect, idx) =>
          idx === effectIndex ? { ...effect, ...updates } : effect
        ),
      };
    }

    case 'REMOVE_MASTER_EFFECT': {
      return {
        ...state,
        masterEffects: state.masterEffects.filter((_, idx) => idx !== action.payload),
      };
    }

    case 'REORDER_MASTER_EFFECTS': {
      const { fromIndex, toIndex } = action.payload;
      const newMasterEffects = [...state.masterEffects];
      const [movedEffect] = newMasterEffects.splice(fromIndex, 1);
      newMasterEffects.splice(toIndex, 0, movedEffect);
      return {
        ...state,
        masterEffects: newMasterEffects,
      };
    }

    case 'TOGGLE_ALL_MASTER_EFFECTS': {
      return {
        ...state,
        masterEffectsEnabled: action.payload,
      };
    }

    default:
      return state;
  }
}
