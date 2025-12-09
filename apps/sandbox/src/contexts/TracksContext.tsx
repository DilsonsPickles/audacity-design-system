import { createContext, useContext, useReducer, ReactNode } from 'react';

// TODO: Import proper Track and Clip types from @audacity-ui/core once they're defined
interface EnvelopePoint {
  time: number;
  db: number;
}

interface Clip {
  id: number;
  name: string;
  start: number;
  duration: number;
  waveform?: number[];
  waveformLeft?: number[];
  waveformRight?: number[];
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
}

interface Track {
  id: number;
  name: string;
  height?: number;
  viewMode?: 'waveform' | 'spectrogram' | 'split';
  clips: Clip[];
}

interface TimeSelection {
  startTime: number;
  endTime: number;
}

interface SpectralSelection {
  trackIndex: number;
  clipId: number;
  startTime: number;
  endTime: number;
  minFrequency: number; // 0-1 (normalized)
  maxFrequency: number; // 0-1 (normalized)
}

// State interface
export interface TracksState {
  tracks: Track[];
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  envelopeMode: boolean;
  envelopeAltMode: boolean;
  spectrogramMode: boolean;
  timeSelection: TimeSelection | null;
  spectralSelection: SpectralSelection | null;
  playheadPosition: number; // in seconds
  hoveredPoint: { trackIndex: number; clipId: number; pointIndex: number } | null;
  // Stores track view modes before spectrogram overlay was applied
  viewModesBeforeOverlay: (('waveform' | 'spectrogram' | 'split') | undefined)[] | null;
}

// Action types
export type TracksAction =
  | { type: 'SET_TRACKS'; payload: Track[] }
  | { type: 'ADD_TRACK'; payload: Track }
  | { type: 'UPDATE_TRACK'; payload: { index: number; track: Partial<Track> } }
  | { type: 'DELETE_TRACK'; payload: number }
  | { type: 'SET_SELECTED_TRACKS'; payload: number[] }
  | { type: 'SET_FOCUSED_TRACK'; payload: number | null }
  | { type: 'SET_ENVELOPE_MODE'; payload: boolean }
  | { type: 'SET_ENVELOPE_ALT_MODE'; payload: boolean }
  | { type: 'SET_SPECTROGRAM_MODE'; payload: boolean }
  | { type: 'SET_TIME_SELECTION'; payload: TimeSelection | null }
  | { type: 'SET_SPECTRAL_SELECTION'; payload: SpectralSelection | null }
  | { type: 'SET_PLAYHEAD_POSITION'; payload: number }
  | { type: 'SET_HOVERED_POINT'; payload: { trackIndex: number; clipId: number; pointIndex: number } | null }
  | { type: 'UPDATE_TRACK_HEIGHT'; payload: { index: number; height: number } }
  | { type: 'UPDATE_TRACK_VIEW'; payload: { index: number; viewMode: 'waveform' | 'spectrogram' | 'split' } }
  | { type: 'SELECT_CLIP'; payload: { trackIndex: number; clipId: number } }
  | { type: 'SELECT_TRACK'; payload: number };

// Initial state
const initialState: TracksState = {
  tracks: [],
  selectedTrackIndices: [],
  focusedTrackIndex: null,
  envelopeMode: false,
  envelopeAltMode: false,
  spectrogramMode: false,
  timeSelection: null,
  spectralSelection: null,
  playheadPosition: 0,
  hoveredPoint: null,
  viewModesBeforeOverlay: null,
};

// Reducer
function tracksReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    case 'SET_TRACKS':
      return { ...state, tracks: action.payload };

    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.payload] };

    case 'UPDATE_TRACK': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        ...action.payload.track,
      };
      return { ...state, tracks: newTracks };
    }

    case 'DELETE_TRACK':
      return {
        ...state,
        tracks: state.tracks.filter((_, index) => index !== action.payload),
      };

    case 'SET_SELECTED_TRACKS':
      return { ...state, selectedTrackIndices: action.payload };

    case 'SET_FOCUSED_TRACK':
      return { ...state, focusedTrackIndex: action.payload };

    case 'SET_ENVELOPE_MODE':
      return {
        ...state,
        envelopeMode: action.payload,
        envelopeAltMode: action.payload ? false : state.envelopeAltMode
      };

    case 'SET_ENVELOPE_ALT_MODE':
      return {
        ...state,
        envelopeAltMode: action.payload,
        envelopeMode: action.payload ? false : state.envelopeMode
      };

    case 'SET_SPECTROGRAM_MODE': {
      const isEnabling = action.payload;

      if (isEnabling) {
        // Save current view modes before applying overlay
        const savedViewModes = state.tracks.map(track => track.viewMode);

        // Apply spectrogram overlay to all tracks
        const newTracks = state.tracks.map(track => ({
          ...track,
          viewMode: 'spectrogram' as const,
        }));

        return {
          ...state,
          spectrogramMode: true,
          viewModesBeforeOverlay: savedViewModes,
          tracks: newTracks,
        };
      } else {
        // Restore previous view modes
        const newTracks = state.tracks.map((track, index) => ({
          ...track,
          viewMode: state.viewModesBeforeOverlay?.[index],
        }));

        // If there's a spectral selection and the track is being restored to waveform view,
        // convert it to a time selection
        let newSpectralSelection = state.spectralSelection;
        let newTimeSelection = state.timeSelection;

        if (state.spectralSelection) {
          const trackIndex = state.spectralSelection.trackIndex;
          const restoredViewMode = state.viewModesBeforeOverlay?.[trackIndex];

          if (restoredViewMode === 'waveform' || restoredViewMode === undefined) {
            // Convert spectral selection to time selection
            newTimeSelection = {
              startTime: state.spectralSelection.startTime,
              endTime: state.spectralSelection.endTime,
            };
            newSpectralSelection = null;
          }
        }

        return {
          ...state,
          spectrogramMode: false,
          viewModesBeforeOverlay: null,
          tracks: newTracks,
          spectralSelection: newSpectralSelection,
          timeSelection: newTimeSelection,
        };
      }
    }

    case 'SET_TIME_SELECTION':
      return { ...state, timeSelection: action.payload };

    case 'SET_SPECTRAL_SELECTION':
      // Don't move playhead while dragging - only update on finalize
      return {
        ...state,
        spectralSelection: action.payload,
      };

    case 'SET_PLAYHEAD_POSITION':
      return { ...state, playheadPosition: action.payload };

    case 'SET_HOVERED_POINT':
      return { ...state, hoveredPoint: action.payload };

    case 'UPDATE_TRACK_HEIGHT': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        height: action.payload.height,
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_VIEW': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        viewMode: action.payload.viewMode,
      };

      // If changing to waveform view and there's a spectral selection on this track,
      // convert it to a time selection
      let newSpectralSelection = state.spectralSelection;
      let newTimeSelection = state.timeSelection;

      if (
        action.payload.viewMode === 'waveform' &&
        state.spectralSelection &&
        state.spectralSelection.trackIndex === action.payload.index
      ) {
        // Convert spectral selection to time selection
        newTimeSelection = {
          startTime: state.spectralSelection.startTime,
          endTime: state.spectralSelection.endTime,
        };
        newSpectralSelection = null;
      }

      return {
        ...state,
        tracks: newTracks,
        spectralSelection: newSpectralSelection,
        timeSelection: newTimeSelection,
      };
    }

    case 'SELECT_CLIP': {
      const { trackIndex, clipId } = action.payload;
      const newTracks = state.tracks.map((track, tIndex) => ({
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          selected: tIndex === trackIndex && clip.id === clipId
        }))
      }));

      return {
        ...state,
        tracks: newTracks,
        selectedTrackIndices: [trackIndex],
        focusedTrackIndex: trackIndex,
      };
    }

    case 'SELECT_TRACK': {
      return {
        ...state,
        selectedTrackIndices: [action.payload],
        focusedTrackIndex: action.payload,
      };
    }

    default:
      return state;
  }
}

// Context
const TracksStateContext = createContext<TracksState | undefined>(undefined);
const TracksDispatchContext = createContext<React.Dispatch<TracksAction> | undefined>(undefined);

// Provider
interface TracksProviderProps {
  children: ReactNode;
  initialTracks?: Track[];
}

export function TracksProvider({ children, initialTracks = [] }: TracksProviderProps) {
  const [state, dispatch] = useReducer(tracksReducer, {
    ...initialState,
    tracks: initialTracks,
  });

  return (
    <TracksStateContext.Provider value={state}>
      <TracksDispatchContext.Provider value={dispatch}>
        {children}
      </TracksDispatchContext.Provider>
    </TracksStateContext.Provider>
  );
}

// Custom hooks
export function useTracksState() {
  const context = useContext(TracksStateContext);
  if (context === undefined) {
    throw new Error('useTracksState must be used within a TracksProvider');
  }
  return context;
}

export function useTracksDispatch() {
  const context = useContext(TracksDispatchContext);
  if (context === undefined) {
    throw new Error('useTracksDispatch must be used within a TracksProvider');
  }
  return context;
}

// Convenience hook for using both state and dispatch
export function useTracks() {
  return {
    state: useTracksState(),
    dispatch: useTracksDispatch(),
  };
}
