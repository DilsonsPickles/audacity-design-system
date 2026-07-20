import { createContext, useContext, useReducer, ReactNode } from 'react';
import type { CutMode } from '../utils/cutOperations';
import type { Label as CoreLabel } from '@audacity-ui/core';
import type { SpectrogramScale } from '@dilsonspickles/components';
import { ACTION_DOMAIN } from './reducers/domains';
import { selectionReducer } from './reducers/selectionReducer';
import { viewReducer } from './reducers/viewReducer';
import { recordingReducer } from './reducers/recordingReducer';
import { effectsReducer } from './reducers/effectsReducer';
import { midiReducer } from './reducers/midiReducer';
import { tracksDomainReducer } from './reducers/tracksDomainReducer';
import { clipsReducer } from './reducers/clipsReducer';
import { envelopeReducer } from './reducers/envelopeReducer';
import { TRACK_COLOR_PALETTE, expandSelectionToGroups, dissolveDegenerateGroups } from './reducers/shared';

// Re-exported for consumers that historically imported these from TracksContext.
export { TRACK_COLOR_PALETTE, expandSelectionToGroups, dissolveDegenerateGroups };

// TODO: Import proper Track and Clip types from @audacity-ui/core once they're defined
interface EnvelopePoint {
  time: number;
  db: number;
}

// Local Label interface for TracksContext (extends core Label with numeric id)
export interface Label extends Omit<CoreLabel, 'id'> {
  id: number;
}

interface DeletedRegion {
  startTime: number; // Relative to clip start (after trimStart)
  duration: number;   // Duration of the deleted region
}

export interface Clip {
  id: number;
  name: string;
  start: number;
  duration: number;
  waveform?: number[];
  waveformLeft?: number[];
  waveformRight?: number[];
  waveformRms?: number[];
  waveformLeftRms?: number[];
  waveformRightRms?: number[];
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
  trimStart?: number;
  fullDuration?: number;
  deletedRegions?: DeletedRegion[]; // Sorted, non-overlapping deleted regions
  color?: 'cyan' | 'blue' | 'violet' | 'magenta' | 'red' | 'orange' | 'yellow' | 'green' | 'teal';
  groupId?: string;
  /**
   * Original clip id that owns the audio buffer. When a clip is split,
   * the right segment gets a new id but should still play from the
   * same source buffer — `sourceClipId` carries that mapping forward
   * so the audio engine can look the buffer up by source.
   */
  sourceClipId?: number;
}

export interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  parameters?: Record<string, unknown>; // open effect-param shape
}

export interface Track {
  id: number;
  name: string;
  type?: 'audio' | 'label' | 'midi'; // Track type: audio (default), label, or midi
  color?: typeof TRACK_COLOR_PALETTE[number]; // Assigned at creation, persists across reorder
  height?: number;
  viewMode?: 'waveform' | 'spectrogram' | 'split';
  channelSplitRatio?: number; // For stereo tracks: ratio of top channel height (0-1, default 0.5)
  clips: Clip[];
  labels?: Label[];
  midiClips?: import('@audacity-ui/core').MidiClip[]; // MIDI clips for MIDI tracks
  effects?: Effect[]; // Track-specific effects chain
  effectsEnabled?: boolean; // Master toggle for all track effects (independent of individual effect states)
  waveformRulerFormat?: 'linear-amp' | 'logarithmic-db' | 'linear-db'; // Per-track waveform ruler format
  spectrogramScale?: SpectrogramScale; // Per-track spectrogram scale
  spectrogramMinFreq?: number; // Per-track min frequency in Hz
  spectrogramMaxFreq?: number; // Per-track max frequency in Hz
  gain?: number; // Track gain in dB (-60 to +12, default -6)
  pan?: number; // Pan position (-100 to 100, default 0)
  muted?: boolean; // Whether the track is muted
  soloed?: boolean; // Whether the track is soloed
  instrument?: string; // MIDI instrument id (e.g. 'synth', 'fm-synth')
  /** User-picked header icon. When absent the icon is derived from
   *  `type` (mic for audio, midi for MIDI, etc). Kept as a loose
   *  string here so we don't need to import IconName across every
   *  reducer / test — TrackControlPanel narrows it at render time. */
  icon?: string;
}


export interface TimeSelection {
  startTime: number;
  endTime: number;
  renderOnCanvas?: boolean; // If false, only show in ruler (e.g., when clip is selected)
  /** Tracks the selection spans. Populated by the creating gesture
   *  (drag rows / focused track). Operations resolve scope via
   *  utils/timeSelectionScope.ts: this list → selectedTrackIndices →
   *  operation default. */
  tracks?: number[];
}

// SpectralSelection moved to SpectralSelectionContext for performance

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
  /** Undo history: snapshots of the `tracks` array prior to a destructive
   *  action. Kept on `TracksState` so the reducer can manage it without
   *  pulling in a separate store. Capped at MAX_UNDO_HISTORY. */
  past: Track[][];
  /** Redo stack — snapshots that an UNDO has surfaced and a subsequent
   *  destructive action would clear. */
  future: Track[][];
  /** Name of the coalesce group the previous undoable action belonged
   *  to, e.g. 'clip-drag'. Lets the wrapper merge all the mousemoves of
   *  a single drag into one undo entry. Null between gestures. */
  lastUndoCoalesceGroup: string | null;
  /** Wall-clock timestamp of the previous undoable action. Used with
   *  COALESCE_TIMEOUT_MS to break two consecutive same-group gestures
   *  apart when the user clearly paused between them. */
  lastUndoTimestamp: number | null;
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  selectedLabelIds: string[]; // Array of selected label IDs (format: "trackIndex-labelId")
  envelopeMode: boolean;
  envelopeAltMode: boolean;
  spectrogramMode: boolean;
  splitMode: boolean; // S key: click-to-split tool
  timeSelection: TimeSelection | null;
  clipDurationIndicator: { startTime: number; endTime: number } | null; // Shows clip duration in ruler without affecting canvas
  playheadPosition: number; // in seconds
  hoveredPoint: { trackIndex: number; clipId: number; pointIndex: number } | null;
  // Stores track view modes before spectrogram overlay was applied
  viewModesBeforeOverlay: (('waveform' | 'spectrogram' | 'split') | undefined)[] | null;
  cutMode: CutMode; // 'split' or 'ripple'
  // Recording state
  isRecording: boolean;
  recordingTrackIndex: number | null;
  recordingStartTime: number; // Timestamp when recording started
  recordingMeterLevel: number; // 0-100, current meter level during recording
  recordingPeakLevel: number; // 0-100, peak level during recording
  // Track last selected clip for shift-click range selection
  lastSelectedClip: { trackIndex: number; clipId: number } | null;
  // Master effects chain (applied to all tracks)
  masterEffects: Effect[];
  // Master toggle for all master effects (independent of individual effect states)
  masterEffectsEnabled: boolean;
  // Counter for cycling through TRACK_COLOR_PALETTE on each new track
  nextTrackColorIndex: number;
  // Piano roll state
  pianoRollOpen: boolean;
  pianoRollTrackIndex: number | null;
  pianoRollClipIndex: number | null;
  pianoRollSnap: import('@audacity-ui/core').SnapGrid;
  pianoRollTimeBasis: 'beats' | 'seconds';
  pianoRollPixelsPerSecond: number;
  pianoRollScrollX: number;
  // Canvas snap grid (independent from piano roll)
  canvasSnap: import('@audacity-ui/core').SnapGrid;
}

// Action types
export type TracksAction =
  | { type: 'RESET_STATE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_TRACKS'; payload: Track[] }
  | { type: 'REPLACE_TRACKS_EDIT'; payload: Track[] }
  | { type: 'ADD_TRACK'; payload: Track | (Track & { insertAt?: number }) }
  | { type: 'UPDATE_TRACK'; payload: { index: number; track: Partial<Track> } }
  /** Set `muted: true` on the target track, `muted: false` on every
   *  other track. Powers ctrl/cmd+click on the M button — an exclusive
   *  mute that clears any existing mute pool. */
  | { type: 'SET_TRACK_MUTED_EXCLUSIVE'; payload: number }
  /** Set `soloed: true` on the target track, `soloed: false` on every
   *  other track. Powers ctrl/cmd+click on the S button — an exclusive
   *  solo that clears any existing solo pool. */
  | { type: 'SET_TRACK_SOLOED_EXCLUSIVE'; payload: number }
  | { type: 'DELETE_TRACK'; payload: number }
  | { type: 'DELETE_TRACKS'; payload: number[] }
  | { type: 'SET_SELECTED_TRACKS'; payload: number[] }
  | { type: 'SET_FOCUSED_TRACK'; payload: number | null }
  | { type: 'SET_ENVELOPE_MODE'; payload: boolean }
  | { type: 'SET_SPLIT_MODE'; payload: boolean }
  | { type: 'SET_ENVELOPE_ALT_MODE'; payload: boolean }
  | { type: 'SET_SPECTROGRAM_MODE'; payload: boolean }
  | { type: 'SET_TIME_SELECTION'; payload: TimeSelection | null }
  | { type: 'SET_PLAYHEAD_POSITION'; payload: number }
  | { type: 'SET_HOVERED_POINT'; payload: { trackIndex: number; clipId: number; pointIndex: number } | null }
  | { type: 'UPDATE_TRACK_HEIGHT'; payload: { index: number; height: number } }
  | { type: 'UPDATE_CHANNEL_SPLIT_RATIO'; payload: { index: number; ratio: number } }
  | { type: 'UPDATE_TRACK_VIEW'; payload: { index: number; viewMode: 'waveform' | 'spectrogram' | 'split' } }
  | { type: 'SELECT_CLIP'; payload: { trackIndex: number; clipId: number } }
  | { type: 'SELECT_CLIPS'; payload: Array<{ trackIndex: number; clipId: number }> }
  | { type: 'SELECT_CLIP_RANGE'; payload: { trackIndex: number; clipId: number } }
  | { type: 'SELECT_TRACK'; payload: number }
  | { type: 'UPDATE_CLIP_ENVELOPE_POINTS'; payload: { trackIndex: number; clipId: number; envelopePoints: EnvelopePoint[] } }
  | { type: 'UPDATE_CLIP'; payload: { trackIndex: number; clipId: number; updates: Partial<Clip> } }
  | { type: 'MOVE_CLIP'; payload: { clipId: number; fromTrackIndex: number; toTrackIndex: number; newStartTime: number } }
  | {
      type: 'APPLY_CLIP_PLACEMENT';
      payload: {
        placements: Array<{ clipId: number; trackIndex: number; start: number; duration: number }>;
        mutations: Array<
          | { type: 'trim'; clipId: number; trackIndex: number; newStart: number; newDuration: number; newTrimStart: number }
          | { type: 'split'; clipId: number; trackIndex: number; leftEnd: number; rightStart: number }
          | { type: 'delete'; clipId: number; trackIndex: number }
        >;
      };
    }
  | { type: 'ADD_CLIP'; payload: { trackIndex: number; clip: Clip } }
  | { type: 'TOGGLE_CLIP_SELECTION'; payload: { trackIndex: number; clipId: number } }
  | { type: 'DESELECT_ALL_CLIPS' }
  | { type: 'DELETE_CLIP'; payload: { trackIndex: number; clipId: number } }
  | { type: 'TRIM_CLIP'; payload: { trackIndex: number; clipId: number; newTrimStart: number; newDuration: number; newStart?: number } }
  | { type: 'STRETCH_CLIP'; payload: { trackIndex: number; clipId: number; newDuration: number; newStretchFactor: number; newStart?: number } }
  | { type: 'DELETE_TIME_RANGE'; payload: { startTime: number; endTime: number } }
  | { type: 'ADD_LABEL'; payload: { trackIndex: number; label: Label } }
  | { type: 'UPDATE_LABEL'; payload: { trackIndex: number; labelId: number; label: Partial<Label> }  }
  | { type: 'SET_SELECTED_LABELS'; payload: string[] }
  | { type: 'TOGGLE_LABEL_SELECTION'; payload: string }
  | { type: 'SET_CUT_MODE'; payload: CutMode }
  | { type: 'START_RECORDING'; payload: { trackIndex: number } }
  | { type: 'STOP_RECORDING' }
  | { type: 'UPDATE_RECORDING_METERS'; payload: { level: number; peak: number } }
  // Track effects actions
  | { type: 'ADD_TRACK_EFFECT'; payload: { trackIndex: number; effect: Effect } }
  | { type: 'UPDATE_TRACK_EFFECT'; payload: { trackIndex: number; effectIndex: number; updates: Partial<Effect> } }
  | { type: 'REMOVE_TRACK_EFFECT'; payload: { trackIndex: number; effectIndex: number } }
  | { type: 'REORDER_TRACK_EFFECTS'; payload: { trackIndex: number; fromIndex: number; toIndex: number } }
  | { type: 'TOGGLE_ALL_TRACK_EFFECTS'; payload: { trackIndex: number; enabled: boolean } }
  // Master effects actions
  | { type: 'SET_MASTER_EFFECTS'; payload: Effect[] }
  | { type: 'ADD_MASTER_EFFECT'; payload: Effect }
  | { type: 'UPDATE_MASTER_EFFECT'; payload: { effectIndex: number; updates: Partial<Effect> } }
  | { type: 'REMOVE_MASTER_EFFECT'; payload: number }
  | { type: 'REORDER_MASTER_EFFECTS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'TOGGLE_ALL_MASTER_EFFECTS'; payload: boolean }
  | { type: 'MOVE_TRACK'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'MOVE_SELECTED_CLIPS'; payload: { deltaSeconds: number } }
  | { type: 'MOVE_SELECTED_CLIPS_TO_TRACK'; payload: { direction: 1 | -1 } }
  | { type: 'UPDATE_TRACK_RULER_FORMAT'; payload: { index: number; format: 'linear-amp' | 'logarithmic-db' | 'linear-db' } }
  | { type: 'UPDATE_TRACK_SPECTROGRAM_SCALE'; payload: { index: number; scale: SpectrogramScale } }
  | { type: 'UPDATE_TRACK_SPECTROGRAM_FREQ'; payload: { index: number; minFreq?: number; maxFreq?: number } }
  // Piano roll / MIDI actions
  | { type: 'SET_PIANO_ROLL_OPEN'; payload: { open: boolean; trackIndex?: number; clipIndex?: number } }
  | { type: 'GROUP_SELECTED_CLIPS' }
  | { type: 'UNGROUP_CLIPS'; payload: { groupId: string } }
  | { type: 'SET_CANVAS_SNAP'; payload: import('@audacity-ui/core').SnapGrid }
  | { type: 'SET_PIANO_ROLL_SNAP'; payload: import('@audacity-ui/core').SnapGrid }
  | { type: 'SET_PIANO_ROLL_TIME_BASIS'; payload: 'beats' | 'seconds' }
  | { type: 'ADD_MIDI_NOTE'; payload: { trackIndex: number; clipIndex: number; note: import('@audacity-ui/core').MidiNote } }
  | { type: 'DELETE_MIDI_NOTES'; payload: { trackIndex: number; clipIndex: number; noteIds: number[] } }
  | { type: 'UPDATE_MIDI_NOTE'; payload: { trackIndex: number; clipIndex: number; noteId: number; updates: Partial<import('@audacity-ui/core').MidiNote> } }
  | { type: 'SELECT_MIDI_NOTE'; payload: { trackIndex: number; clipIndex: number; noteId: number; additive?: boolean } }
  | { type: 'SELECT_MIDI_NOTES'; payload: { trackIndex: number; clipIndex: number; noteIds: number[]; additive?: boolean } }
  | { type: 'DESELECT_ALL_MIDI_NOTES'; payload: { trackIndex: number; clipIndex: number } }
  | { type: 'RESIZE_MIDI_NOTE'; payload: { trackIndex: number; clipIndex: number; noteId: number; newDuration: number } }
  | { type: 'SET_PIANO_ROLL_PIXELS_PER_SECOND'; payload: number }
  | { type: 'SET_PIANO_ROLL_SCROLL_X'; payload: number }
  | { type: 'ADD_MIDI_CLIP'; payload: { trackIndex: number; clip: import('@audacity-ui/core').MidiClip } };

// Initial state
export const initialState: TracksState = {
  tracks: [],
  past: [],
  future: [],
  lastUndoCoalesceGroup: null,
  lastUndoTimestamp: null,
  selectedTrackIndices: [],
  focusedTrackIndex: null,
  selectedLabelIds: [],
  envelopeMode: false,
  envelopeAltMode: false,
  spectrogramMode: false,
  splitMode: false,
  timeSelection: null,
  clipDurationIndicator: null,
  playheadPosition: 0,
  hoveredPoint: null,
  viewModesBeforeOverlay: null,
  cutMode: 'split', // Default to split cut mode
  isRecording: false,
  recordingTrackIndex: null,
  recordingStartTime: 0,
  recordingMeterLevel: 0,
  recordingPeakLevel: 0,
  lastSelectedClip: null,
  masterEffects: [],
  masterEffectsEnabled: true,
  nextTrackColorIndex: 0,
  pianoRollOpen: false,
  pianoRollTrackIndex: null,
  pianoRollClipIndex: null,
  pianoRollSnap: { subdivision: 4 },
  pianoRollTimeBasis: 'beats',
  pianoRollPixelsPerSecond: 200,
  pianoRollScrollX: 0,
  canvasSnap: { subdivision: 1 },
};

// --- Undo / Redo plumbing -----------------------------------------------
const MAX_UNDO_HISTORY = 50;
/** Action types that produce an undo entry. Anything that mutates the
 *  `tracks` array in a user-visible way. UI-only actions (selection,
 *  focus, mode toggles, playhead, time selection, etc.) are intentionally
 *  excluded so the undo stack only carries meaningful edits. */
const UNDOABLE_ACTIONS = new Set<TracksAction['type']>([
  // Bulk
  'REPLACE_TRACKS_EDIT',
  // Track lifecycle
  'ADD_TRACK',
  'UPDATE_TRACK',
  'DELETE_TRACK',
  'DELETE_TRACKS',
  'MOVE_TRACK',
  'UPDATE_TRACK_HEIGHT',
  'UPDATE_CHANNEL_SPLIT_RATIO',
  // Clip lifecycle / edits
  'ADD_CLIP',
  'DELETE_CLIP',
  'UPDATE_CLIP',
  'APPLY_CLIP_PLACEMENT',
  'DELETE_TIME_RANGE',
  'MOVE_CLIP',
  'TRIM_CLIP',
  'STRETCH_CLIP',
  'MOVE_SELECTED_CLIPS',
  'MOVE_SELECTED_CLIPS_TO_TRACK',
  'GROUP_SELECTED_CLIPS',
  'UNGROUP_CLIPS',
  // Envelope
  'UPDATE_CLIP_ENVELOPE_POINTS',
  // Labels
  'ADD_LABEL',
  'UPDATE_LABEL',
  // Effects
  'ADD_TRACK_EFFECT',
  'REMOVE_TRACK_EFFECT',
  'UPDATE_TRACK_EFFECT',
  'REORDER_TRACK_EFFECTS',
  'TOGGLE_ALL_TRACK_EFFECTS',
  // MIDI
  'ADD_MIDI_CLIP',
  'ADD_MIDI_NOTE',
  'DELETE_MIDI_NOTES',
  'UPDATE_MIDI_NOTE',
  'RESIZE_MIDI_NOTE',
]);

/** Actions that belong to a continuous gesture (e.g. clip drag fires
 *  MOVE_CLIP × N then APPLY_CLIP_PLACEMENT on mouseup). All actions in
 *  the same group are merged into a single undo entry — the snapshot
 *  taken at the first action of the gesture — so Cmd+Z restores the
 *  state from before the drag, not the state from one mousemove ago. */
const UNDO_COALESCE_GROUP: Partial<Record<TracksAction['type'], string>> = {
  MOVE_CLIP: 'clip-drag',
  MOVE_SELECTED_CLIPS: 'clip-drag',
  MOVE_SELECTED_CLIPS_TO_TRACK: 'clip-drag',
  TRIM_CLIP: 'clip-drag',
  STRETCH_CLIP: 'clip-drag',
  UPDATE_CLIP_ENVELOPE_POINTS: 'envelope-drag',
  UPDATE_TRACK_HEIGHT: 'track-resize',
  UPDATE_CHANNEL_SPLIT_RATIO: 'track-resize',
  RESIZE_MIDI_NOTE: 'midi-resize',
  UPDATE_MIDI_NOTE: 'midi-resize',
  // APPLY_CLIP_PLACEMENT is intentionally absent: it's used both as the
  // settle action of a clip-drag AND as the standalone action the split
  // tool dispatches. The wrapper special-cases it so the drag settle
  // coalesces but a standalone split keeps its own undo entry.
};

/** Two same-group actions farther apart than this are treated as
 *  separate gestures and each get their own undo entry. Drag mousemoves
 *  fire every ~16ms, so this comfortably keeps a drag coalesced but
 *  any reaction-time pause breaks the group. */
const COALESCE_TIMEOUT_MS = 250;

// Reducer
export function tracksReducer(state: TracksState, action: TracksAction): TracksState {
  // UNDO / REDO swap the `tracks` array against the past/future stacks
  // without touching the rest of the state (selection, focus, playhead
  // stay where the user left them).
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previousTracks = state.past[state.past.length - 1];
    return {
      ...state,
      tracks: previousTracks,
      past: state.past.slice(0, -1),
      future: [state.tracks, ...state.future].slice(0, MAX_UNDO_HISTORY),
      lastUndoCoalesceGroup: null,
      lastUndoTimestamp: null,
    };
  }
  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    const nextTracks = state.future[0];
    return {
      ...state,
      tracks: nextTracks,
      past: [...state.past, state.tracks].slice(-MAX_UNDO_HISTORY),
      future: state.future.slice(1),
      lastUndoCoalesceGroup: null,
      lastUndoTimestamp: null,
    };
  }

  // Invariant: a non-null time selection cannot coexist with track selection.
  if (action.type === 'SET_TIME_SELECTION' && action.payload !== null) {
    return { ...innerReducer(state, action), selectedTrackIndices: [] };
  }

  // Snapshot the current tracks before running the reducer if this is an
  // undoable action. We only push to `past` when the reducer actually
  // mutates tracks (checked below).
  const before = state.tracks;
  const next = innerReducer(state, action);
  if (UNDOABLE_ACTIONS.has(action.type) && next.tracks !== before) {
    const group = UNDO_COALESCE_GROUP[action.type] ?? null;
    const now = Date.now();
    const withinTimeout =
      state.lastUndoTimestamp !== null
      && now - state.lastUndoTimestamp < COALESCE_TIMEOUT_MS;

    // Same-group continuation (e.g. mousemove during a drag).
    const sameGroupGesture =
      group !== null && group === state.lastUndoCoalesceGroup && withinTimeout;

    // APPLY_CLIP_PLACEMENT settles a clip-drag in progress, so it should
    // coalesce with the gesture; but as a standalone (split tool) it
    // gets its own entry.
    const settlesClipDrag =
      action.type === 'APPLY_CLIP_PLACEMENT'
      && state.lastUndoCoalesceGroup === 'clip-drag'
      && withinTimeout;

    const continuesGesture = sameGroupGesture || settlesClipDrag;
    // After settling, clear the group so the next gesture starts fresh.
    const nextGroup = action.type === 'APPLY_CLIP_PLACEMENT' ? null : group;

    if (continuesGesture) {
      return {
        ...next,
        future: [],
        lastUndoCoalesceGroup: nextGroup,
        lastUndoTimestamp: now,
      };
    }
    return {
      ...next,
      past: [...state.past, before].slice(-MAX_UNDO_HISTORY),
      future: [], // new edit invalidates any redo stack
      lastUndoCoalesceGroup: nextGroup,
      lastUndoTimestamp: now,
    };
  }
  return next;
}

function innerReducer(state: TracksState, action: TracksAction): TracksState {
  // Pure domain routing. Every action is mapped to exactly one domain by
  // ACTION_DOMAIN (compiler-enforced exhaustive); each domain owns its slice
  // of the reducer logic in ./reducers/. The 'history' domain's UNDO/REDO are
  // handled by the outer tracksReducer before this runs and never reach here;
  // only RESET_STATE does.
  switch (ACTION_DOMAIN[action.type]) {
    case 'selection': return selectionReducer(state, action);
    case 'view': return viewReducer(state, action);
    case 'recording': return recordingReducer(state, action);
    case 'effects': return effectsReducer(state, action);
    case 'midi': return midiReducer(state, action);
    case 'tracks': return tracksDomainReducer(state, action);
    case 'clips': return clipsReducer(state, action);
    case 'envelope': return envelopeReducer(state, action);
    case 'history': return action.type === 'RESET_STATE' ? initialState : state;
    default: return state;
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
