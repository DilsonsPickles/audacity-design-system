import type { TracksAction } from '../TracksContext';

export type Domain =
  | 'history' | 'tracks' | 'clips' | 'selection'
  | 'envelope' | 'effects' | 'view' | 'recording' | 'midi';

export const DOMAINS: Domain[] = [
  'history', 'tracks', 'clips', 'selection',
  'envelope', 'effects', 'view', 'recording', 'midi',
];

export const ACTION_DOMAIN: Record<TracksAction['type'], Domain> = {
  // history
  RESET_STATE: 'history', UNDO: 'history', REDO: 'history',

  // tracks
  SET_TRACKS: 'tracks', REPLACE_TRACKS_EDIT: 'tracks', ADD_TRACK: 'tracks',
  UPDATE_TRACK: 'tracks', DELETE_TRACK: 'tracks', DELETE_TRACKS: 'tracks',
  MOVE_TRACK: 'tracks', UPDATE_TRACK_HEIGHT: 'tracks', UPDATE_CHANNEL_SPLIT_RATIO: 'tracks',
  UPDATE_TRACK_VIEW: 'tracks', UPDATE_TRACK_RULER_FORMAT: 'tracks',
  UPDATE_TRACK_SPECTROGRAM_SCALE: 'tracks', UPDATE_TRACK_SPECTROGRAM_FREQ: 'tracks',

  // clips
  ADD_CLIP: 'clips', UPDATE_CLIP: 'clips', DELETE_CLIP: 'clips', MOVE_CLIP: 'clips',
  APPLY_CLIP_PLACEMENT: 'clips', TRIM_CLIP: 'clips', STRETCH_CLIP: 'clips',
  MOVE_SELECTED_CLIPS: 'clips', MOVE_SELECTED_CLIPS_TO_TRACK: 'clips',
  DELETE_TIME_RANGE: 'clips', GROUP_SELECTED_CLIPS: 'clips', UNGROUP_CLIPS: 'clips',
  ADD_LABEL: 'clips', UPDATE_LABEL: 'clips',

  // selection
  SET_SELECTED_TRACKS: 'selection', SET_FOCUSED_TRACK: 'selection', SELECT_TRACK: 'selection',
  SELECT_CLIP: 'selection', SELECT_CLIPS: 'selection', SELECT_CLIP_RANGE: 'selection',
  TOGGLE_CLIP_SELECTION: 'selection', DESELECT_ALL_CLIPS: 'selection',
  SET_SELECTED_LABELS: 'selection', TOGGLE_LABEL_SELECTION: 'selection',
  SET_HOVERED_POINT: 'selection',

  // envelope
  UPDATE_CLIP_ENVELOPE_POINTS: 'envelope', SET_ENVELOPE_MODE: 'envelope', SET_ENVELOPE_ALT_MODE: 'envelope',

  // effects
  ADD_TRACK_EFFECT: 'effects', UPDATE_TRACK_EFFECT: 'effects', REMOVE_TRACK_EFFECT: 'effects',
  REORDER_TRACK_EFFECTS: 'effects', TOGGLE_ALL_TRACK_EFFECTS: 'effects',
  SET_MASTER_EFFECTS: 'effects', ADD_MASTER_EFFECT: 'effects', UPDATE_MASTER_EFFECT: 'effects',
  REMOVE_MASTER_EFFECT: 'effects', REORDER_MASTER_EFFECTS: 'effects', TOGGLE_ALL_MASTER_EFFECTS: 'effects',

  // view
  SET_SPECTROGRAM_MODE: 'view', SET_SPLIT_MODE: 'view', SET_TIME_SELECTION: 'view',
  SET_PLAYHEAD_POSITION: 'view', SET_CUT_MODE: 'view', SET_CANVAS_SNAP: 'view',

  // recording
  START_RECORDING: 'recording', STOP_RECORDING: 'recording', UPDATE_RECORDING_METERS: 'recording',

  // midi
  SET_PIANO_ROLL_OPEN: 'midi', SET_PIANO_ROLL_SNAP: 'midi', SET_PIANO_ROLL_TIME_BASIS: 'midi',
  SET_PIANO_ROLL_PIXELS_PER_SECOND: 'midi', SET_PIANO_ROLL_SCROLL_X: 'midi',
  ADD_MIDI_NOTE: 'midi', DELETE_MIDI_NOTES: 'midi', UPDATE_MIDI_NOTE: 'midi',
  SELECT_MIDI_NOTE: 'midi', SELECT_MIDI_NOTES: 'midi', DESELECT_ALL_MIDI_NOTES: 'midi',
  RESIZE_MIDI_NOTE: 'midi', ADD_MIDI_CLIP: 'midi',
};
