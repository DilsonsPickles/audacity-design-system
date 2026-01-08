import { createContext, useContext, useReducer, ReactNode } from 'react';

// TODO: Import proper Track and Clip types from @audacity-ui/core once they're defined
interface EnvelopePoint {
  time: number;
  db: number;
}

interface Label {
  id: number;
  text: string;
  time: number;
  endTime?: number;
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
  trimStart?: number;
  fullDuration?: number;
}

interface Track {
  id: number;
  name: string;
  height?: number;
  viewMode?: 'waveform' | 'spectrogram' | 'split';
  channelSplitRatio?: number; // For stereo tracks: ratio of top channel height (0-1, default 0.5)
  clips: Clip[];
  labels?: Label[];
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

export interface EnvelopeDragState {
  clip: Clip;
  pointIndex: number;
  trackIndex: number;
  clipX: number;
  clipWidth: number;
  clipY: number;
  clipHeight: number;
  startX: number;
  startY: number;
  deletedPoints: EnvelopePoint[];
  originalTime: number;
  isNewPoint?: boolean;
  hiddenPointIndices: number[];
  hasMoved?: boolean;
}

export interface EnvelopeSegmentDragState {
  clip: Clip;
  segmentStartIndex: number;
  segmentEndIndex: number;
  trackIndex: number;
  clipX: number;
  clipWidth: number;
  clipY: number;
  clipHeight: number;
  startY: number;
  startDb1: number;
  startDb2: number;
  isAltMode?: boolean;
  clickX?: number;
  clickY?: number;
  hasMoved?: boolean;
}

export interface ClipDragState {
  clip: Clip;
  trackIndex: number;
  offsetX: number;        // Offset from clip left edge to mouse
  initialX: number;       // Initial mouse X position
  initialTrackIndex: number;  // Track where drag started
  initialStartTime: number; // Initial start time of the clip being dragged
  selectedClipsInitialPositions?: Array<{
    clipId: number;
    trackIndex: number;
    startTime: number;
  }>;
}

export interface StereoChannelResizeDragState {
  trackIndex: number; // Index of stereo track being resized
  clipId: number; // ID of the clip being resized
  startY: number; // Initial Y position when drag started
  startSplitRatio: number; // Initial channel split ratio
  clipY: number; // Y position of the clip top
  clipHeight: number; // Total height of the clip
}

// State interface
export interface TracksState {
  tracks: Track[];
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  selectedLabelIds: string[]; // Array of selected label IDs (format: "trackIndex-labelId")
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
  | { type: 'UPDATE_CHANNEL_SPLIT_RATIO'; payload: { index: number; ratio: number } }
  | { type: 'UPDATE_TRACK_VIEW'; payload: { index: number; viewMode: 'waveform' | 'spectrogram' | 'split' } }
  | { type: 'SELECT_CLIP'; payload: { trackIndex: number; clipId: number } }
  | { type: 'SELECT_TRACK'; payload: number }
  | { type: 'UPDATE_CLIP_ENVELOPE_POINTS'; payload: { trackIndex: number; clipId: number; envelopePoints: EnvelopePoint[] } }
  | { type: 'MOVE_CLIP'; payload: { clipId: number; fromTrackIndex: number; toTrackIndex: number; newStartTime: number } }
  | { type: 'ADD_CLIP'; payload: { trackIndex: number; clip: Clip } }
  | { type: 'TOGGLE_CLIP_SELECTION'; payload: { trackIndex: number; clipId: number } }
  | { type: 'DESELECT_ALL_CLIPS' }
  | { type: 'DELETE_CLIP'; payload: { trackIndex: number; clipId: number } }
  | { type: 'TRIM_CLIP'; payload: { trackIndex: number; clipId: number; newTrimStart: number; newDuration: number; newStart?: number } }
  | { type: 'ADD_LABEL'; payload: { trackIndex: number; label: Label } }
  | { type: 'UPDATE_LABEL'; payload: { trackIndex: number; labelId: number; label: Partial<Label> }  }
  | { type: 'SET_SELECTED_LABELS'; payload: string[] }
  | { type: 'TOGGLE_LABEL_SELECTION'; payload: string };

// Initial state
const initialState: TracksState = {
  tracks: [],
  selectedTrackIndices: [],
  focusedTrackIndex: null,
  selectedLabelIds: [],
  envelopeMode: false,
  envelopeAltMode: false,
  spectrogramMode: false,
  timeSelection: null,
  spectralSelection: null,
  playheadPosition: 1,
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

    case 'UPDATE_CHANNEL_SPLIT_RATIO': {
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        channelSplitRatio: action.payload.ratio,
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_TRACK_VIEW': {
      console.log('[Reducer] UPDATE_TRACK_VIEW:', action.payload);
      const newTracks = [...state.tracks];
      newTracks[action.payload.index] = {
        ...newTracks[action.payload.index],
        viewMode: action.payload.viewMode,
      };
      console.log('[Reducer] Track', action.payload.index, 'viewMode now:', newTracks[action.payload.index].viewMode);

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

      // Find the selected clip to create a time selection
      const selectedClip = state.tracks[trackIndex]?.clips.find(c => c.id === clipId);
      const newTimeSelection = selectedClip
        ? {
            startTime: selectedClip.start,
            endTime: selectedClip.start + selectedClip.duration
          }
        : state.timeSelection;

      return {
        ...state,
        tracks: newTracks,
        selectedTrackIndices: [trackIndex],
        focusedTrackIndex: trackIndex,
        timeSelection: newTimeSelection,
        selectedLabelIds: [], // Clear label selection when selecting clip
      };
    }

    case 'SELECT_TRACK': {
      return {
        ...state,
        selectedTrackIndices: [action.payload],
        focusedTrackIndex: action.payload,
      };
    }

    case 'UPDATE_CLIP_ENVELOPE_POINTS': {
      const { trackIndex, clipId, envelopePoints } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.map(clip =>
          clip.id === clipId
            ? { ...clip, envelopePoints }
            : clip
        ),
      };
      return { ...state, tracks: newTracks };
    }

    case 'MOVE_CLIP': {
      const { clipId, fromTrackIndex, toTrackIndex, newStartTime } = action.payload;
      const newTracks = [...state.tracks];

      // Find the clip in the source track
      const clip = newTracks[fromTrackIndex].clips.find(c => c.id === clipId);
      if (!clip) return state;

      // Calculate the delta for time selection update
      const timeDelta = newStartTime - clip.start;

      if (fromTrackIndex === toTrackIndex) {
        // Moving within the same track - just update start time
        newTracks[fromTrackIndex] = {
          ...newTracks[fromTrackIndex],
          clips: newTracks[fromTrackIndex].clips.map(c =>
            c.id === clipId ? { ...c, start: newStartTime } : c
          ),
        };
      } else {
        // Moving to a different track
        // Remove from source track
        newTracks[fromTrackIndex] = {
          ...newTracks[fromTrackIndex],
          clips: newTracks[fromTrackIndex].clips.filter(c => c.id !== clipId),
        };
        // Add to destination track with new start time
        newTracks[toTrackIndex] = {
          ...newTracks[toTrackIndex],
          clips: [...newTracks[toTrackIndex].clips, { ...clip, start: newStartTime }],
        };
      }

      // Update time selection if the moved clip is selected
      let newTimeSelection = state.timeSelection;
      if (clip.selected && state.timeSelection) {
        newTimeSelection = {
          startTime: state.timeSelection.startTime + timeDelta,
          endTime: state.timeSelection.endTime + timeDelta,
        };
      }

      return { ...state, tracks: newTracks, timeSelection: newTimeSelection };
    }

    case 'ADD_CLIP': {
      const { trackIndex, clip } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: [...newTracks[trackIndex].clips, clip],
      };
      return { ...state, tracks: newTracks };
    }

    case 'TOGGLE_CLIP_SELECTION': {
      const { trackIndex, clipId } = action.payload;
      const newTracks = state.tracks.map((track, tIndex) => ({
        ...track,
        clips: track.clips.map(clip => {
          if (tIndex === trackIndex && clip.id === clipId) {
            return { ...clip, selected: !clip.selected };
          }
          return clip;
        })
      }));

      // Update selectedTrackIndices based on which tracks have selected clips
      const tracksWithSelection = newTracks
        .map((track, idx) => ({ idx, hasSelection: track.clips.some(c => c.selected) }))
        .filter(t => t.hasSelection)
        .map(t => t.idx);

      // Count total selected clips
      const selectedClipsCount = newTracks.reduce(
        (count, track) => count + track.clips.filter(c => c.selected).length,
        0
      );

      // Only set time selection if exactly 1 clip is selected
      let newTimeSelection: TimeSelection | null = null;
      if (selectedClipsCount === 1) {
        const selectedClip = newTracks
          .flatMap(track => track.clips)
          .find(clip => clip.selected);
        if (selectedClip) {
          newTimeSelection = {
            startTime: selectedClip.start,
            endTime: selectedClip.start + selectedClip.duration,
          };
        }
      }

      return {
        ...state,
        tracks: newTracks,
        selectedTrackIndices: tracksWithSelection,
        selectedLabelIds: [], // Clear label selection when toggling clip
        timeSelection: newTimeSelection,
      };
    }

    case 'DESELECT_ALL_CLIPS': {
      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({ ...clip, selected: false }))
      }));

      return {
        ...state,
        tracks: newTracks,
      };
    }

    case 'DELETE_CLIP': {
      const { trackIndex, clipId } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.filter(c => c.id !== clipId),
      };
      return { ...state, tracks: newTracks };
    }

    case 'TRIM_CLIP': {
      const { trackIndex, clipId, newTrimStart, newDuration, newStart } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.map(clip => {
          if (clip.id === clipId) {
            const updatedClip: Clip = {
              ...clip,
              trimStart: newTrimStart,
              duration: newDuration,
            };
            if (newStart !== undefined) {
              updatedClip.start = newStart;
            }
            // Store full duration if not already stored
            if (!clip.fullDuration) {
              updatedClip.fullDuration = newTrimStart + newDuration;
            }
            return updatedClip;
          }
          return clip;
        }),
      };
      return { ...state, tracks: newTracks };
    }

    case 'ADD_LABEL': {
      const { trackIndex, label } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        labels: [...(newTracks[trackIndex].labels || []), label],
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_LABEL': {
      const { trackIndex, labelId, label } = action.payload;

      // Find the original label before update
      const originalLabel = state.tracks[trackIndex]?.labels?.find(l => l.id === labelId);

      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        labels: (newTracks[trackIndex].labels || []).map(l =>
          l.id === labelId ? { ...l, ...label } : l
        ),
      };

      // Update time selection if this label is selected and its time/endTime changed
      let newTimeSelection = state.timeSelection;
      const labelKeyId = `${trackIndex}-${labelId}`;
      if (originalLabel && state.selectedLabelIds.includes(labelKeyId)) {
        // Check if time or endTime changed
        const timeChanged = label.time !== undefined && label.time !== originalLabel.time;
        const endTimeChanged = label.endTime !== undefined && label.endTime !== (originalLabel.endTime ?? originalLabel.time);

        if (timeChanged || endTimeChanged) {
          // Get the updated label from newTracks
          const updatedLabel = newTracks[trackIndex].labels?.find(l => l.id === labelId);
          if (updatedLabel) {
            // Recalculate time selection from the updated label
            newTimeSelection = {
              startTime: updatedLabel.time,
              endTime: updatedLabel.endTime ?? updatedLabel.time,
            };
          }
        }
      }

      return { ...state, tracks: newTracks, timeSelection: newTimeSelection };
    }

    case 'SET_SELECTED_LABELS': {
      // Clear all clip selections when selecting labels
      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({ ...clip, selected: false }))
      }));

      // Calculate time selection from selected labels
      let newTimeSelection: TimeSelection | null = null;
      if (action.payload.length > 0) {
        const selectedLabels: Label[] = [];
        state.tracks.forEach((track, trackIndex) => {
          track.labels?.forEach(label => {
            const labelKeyId = `${trackIndex}-${label.id}`;
            if (action.payload.includes(labelKeyId)) {
              selectedLabels.push(label);
            }
          });
        });

        if (selectedLabels.length > 0) {
          const startTimes = selectedLabels.map(l => l.time);
          const endTimes = selectedLabels.map(l => l.endTime ?? l.time);
          newTimeSelection = {
            startTime: Math.min(...startTimes),
            endTime: Math.max(...endTimes),
          };
        }
      }

      return {
        ...state,
        selectedLabelIds: action.payload,
        tracks: newTracks,
        timeSelection: newTimeSelection,
      };
    }

    case 'TOGGLE_LABEL_SELECTION': {
      const labelId = action.payload;
      const isSelected = state.selectedLabelIds.includes(labelId);
      const newSelectedLabelIds = isSelected
        ? state.selectedLabelIds.filter(id => id !== labelId)
        : [...state.selectedLabelIds, labelId];

      // Check if there are any selected clips
      const selectedClipsCount = state.tracks.reduce(
        (count, track) => count + track.clips.filter(c => c.selected).length,
        0
      );

      // Calculate time selection from selected labels
      // Only set time selection if there are NO selected clips and at least 1 label selected
      let newTimeSelection: TimeSelection | null = null;
      if (selectedClipsCount === 0 && newSelectedLabelIds.length > 0) {
        const selectedLabels: Label[] = [];
        state.tracks.forEach((track, trackIndex) => {
          track.labels?.forEach(label => {
            const labelKeyId = `${trackIndex}-${label.id}`;
            if (newSelectedLabelIds.includes(labelKeyId)) {
              selectedLabels.push(label);
            }
          });
        });

        if (selectedLabels.length > 0) {
          const startTimes = selectedLabels.map(l => l.time);
          const endTimes = selectedLabels.map(l => l.endTime ?? l.time);
          newTimeSelection = {
            startTime: Math.min(...startTimes),
            endTime: Math.max(...endTimes),
          };
        }
      }

      return {
        ...state,
        selectedLabelIds: newSelectedLabelIds,
        timeSelection: newTimeSelection,
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
