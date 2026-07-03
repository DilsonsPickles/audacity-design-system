/**
 * Characterization tests for tracksReducer — behavior lock for the domain split.
 *
 * These tests capture CURRENT behavior and must remain green through the entire
 * split. They test through the public `tracksReducer` (including the undo
 * wrapper) so no reducer internals are exposed.
 *
 * If a test does not match actual behavior, the TEST is corrected (not the
 * reducer), with a comment noting the observed behavior.
 */
import { describe, it, expect } from 'vitest';
import {
  tracksReducer,
  initialState,
  TRACK_COLOR_PALETTE,
  type Track,
  type Clip,
  type TracksState,
  type TracksAction,
} from '../TracksContext';

// ---- factories ----------------------------------------------------------------

const makeClip = (o: Partial<Clip> = {}): Clip =>
  ({
    id: 1,
    name: 'c',
    start: 0,
    duration: 1,
    envelopePoints: [],
    ...o,
  } as Clip);

const makeTrack = (o: Partial<Track> = {}): Track =>
  ({
    id: 1,
    name: 't',
    clips: [makeClip()],
    ...o,
  } as Track);

/** Spread initialState so we get every required field without running RESET_STATE
 *  from an undefined state (which would throw because innerReducer reads
 *  state.tracks before reaching the switch). */
const makeState = (o: Partial<TracksState> = {}): TracksState => ({
  ...initialState,
  ...o,
});

// ---- domain: tracks -----------------------------------------------------------

describe('tracksReducer characterization (behavior lock for domain split)', () => {
  it('tracks: ADD_TRACK appends a track', () => {
    const s = makeState({ tracks: [] });
    const next = tracksReducer(s, { type: 'ADD_TRACK', payload: makeTrack({ id: 9 }) });
    expect(next.tracks.map((t) => t.id)).toEqual([9]);
  });

  it('tracks: ADD_TRACK assigns a color from the palette', () => {
    // ADD_TRACK auto-assigns a color when the payload has none; the reducer
    // must not leave color undefined.
    const s = makeState({ tracks: [], nextTrackColorIndex: 0 });
    const next = tracksReducer(s, {
      type: 'ADD_TRACK',
      payload: makeTrack({ id: 9, color: undefined }),
    });
    expect(TRACK_COLOR_PALETTE).toContain(next.tracks[0].color);
  });

  it('tracks: DELETE_TRACK removes the track by index', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1 }), makeTrack({ id: 2 })],
      selectedTrackIndices: [],
    });
    const next = tracksReducer(s, { type: 'DELETE_TRACK', payload: 0 });
    expect(next.tracks.map((t) => t.id)).toEqual([2]);
  });

  // ---- domain: clips ----------------------------------------------------------

  it('clips: UPDATE_CLIP applies a partial update', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1, name: 'old' })] })],
    });
    const next = tracksReducer(s, {
      type: 'UPDATE_CLIP',
      payload: { trackIndex: 0, clipId: 1, updates: { name: 'new' } },
    });
    expect(next.tracks[0].clips[0].name).toBe('new');
  });

  it('clips: ADD_CLIP appends a clip to the target track', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 })] })],
    });
    const next = tracksReducer(s, {
      type: 'ADD_CLIP',
      payload: { trackIndex: 0, clip: makeClip({ id: 2 }) },
    });
    expect(next.tracks[0].clips.map((c) => c.id)).toEqual([1, 2]);
  });

  it('clips: DELETE_CLIP removes the clip', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 }), makeClip({ id: 2 })] })],
    });
    const next = tracksReducer(s, {
      type: 'DELETE_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.map((c) => c.id)).toEqual([2]);
  });

  // ---- domain: selection ------------------------------------------------------

  it('selection: SELECT_CLIP marks exactly that clip selected', () => {
    const s = makeState({
      tracks: [
        makeTrack({ id: 1, clips: [makeClip({ id: 1 }), makeClip({ id: 2 })] }),
      ],
    });
    const next = tracksReducer(s, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 2 },
    });
    expect(next.tracks[0].clips.find((c) => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find((c) => c.id === 1)?.selected).toBeFalsy();
  });

  it('selection: SELECT_CLIP clears time selection', () => {
    // Observed: SELECT_CLIP always nullifies timeSelection.
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 })] })],
      timeSelection: { startTime: 0, endTime: 1 },
    });
    const next = tracksReducer(s, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.timeSelection).toBeNull();
  });

  it('selection: DESELECT_ALL_CLIPS clears selection on every clip', () => {
    const s = makeState({
      tracks: [
        makeTrack({
          id: 1,
          clips: [makeClip({ id: 1, selected: true }), makeClip({ id: 2, selected: true })],
        }),
      ],
    });
    const next = tracksReducer(s, { type: 'DESELECT_ALL_CLIPS' });
    expect(next.tracks[0].clips.every((c) => !c.selected)).toBe(true);
  });

  // ---- domain: envelope -------------------------------------------------------

  it('envelope: SET_ENVELOPE_MODE toggles the flag', () => {
    const next = tracksReducer(makeState({ envelopeMode: false }), {
      type: 'SET_ENVELOPE_MODE',
      payload: true,
    });
    expect(next.envelopeMode).toBe(true);
  });

  it('envelope: SET_ENVELOPE_MODE true resets envelopeAltMode', () => {
    // Observed: enabling envelope mode clears the alt-mode flag.
    const s = makeState({ envelopeMode: false, envelopeAltMode: true });
    const next = tracksReducer(s, { type: 'SET_ENVELOPE_MODE', payload: true });
    expect(next.envelopeAltMode).toBe(false);
  });

  it('envelope: UPDATE_CLIP_ENVELOPE_POINTS replaces envelope points', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1, envelopePoints: [] })] })],
    });
    const pts = [{ time: 0.5, db: -6 }];
    const next = tracksReducer(s, {
      type: 'UPDATE_CLIP_ENVELOPE_POINTS',
      payload: { trackIndex: 0, clipId: 1, envelopePoints: pts },
    });
    expect(next.tracks[0].clips[0].envelopePoints).toEqual(pts);
  });

  // ---- domain: view -----------------------------------------------------------

  it('view: SET_PLAYHEAD_POSITION sets the playhead', () => {
    const next = tracksReducer(makeState(), {
      type: 'SET_PLAYHEAD_POSITION',
      payload: 3.5,
    });
    expect(next.playheadPosition).toBe(3.5);
  });

  it('view: SET_TIME_SELECTION stores the selection', () => {
    const sel = { startTime: 1, endTime: 2 };
    const next = tracksReducer(makeState(), {
      type: 'SET_TIME_SELECTION',
      payload: sel,
    });
    expect(next.timeSelection).toEqual(sel);
  });

  it('view: SET_TIME_SELECTION null clears the selection', () => {
    const s = makeState({ timeSelection: { startTime: 1, endTime: 2 } });
    const next = tracksReducer(s, { type: 'SET_TIME_SELECTION', payload: null });
    expect(next.timeSelection).toBeNull();
  });

  // ---- domain: effects --------------------------------------------------------

  it('effects: ADD_MASTER_EFFECT appends to masterEffects', () => {
    const s = makeState({ masterEffects: [] });
    const fx = { id: 'e1', name: 'Reverb', enabled: true };
    const next = tracksReducer(s, {
      type: 'ADD_MASTER_EFFECT',
      payload: fx as TracksState['masterEffects'][number],
    });
    expect(next.masterEffects.length).toBe(1);
    expect(next.masterEffects[0].id).toBe('e1');
  });

  it('effects: ADD_TRACK_EFFECT appends to the track effects chain', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip()], effects: [] })],
    });
    const fx = { id: 'e1', name: 'EQ', enabled: true };
    const next = tracksReducer(s, {
      type: 'ADD_TRACK_EFFECT',
      payload: { trackIndex: 0, effect: fx },
    });
    expect(next.tracks[0].effects?.length).toBe(1);
    expect(next.tracks[0].effects?.[0].id).toBe('e1');
  });

  // ---- undo wrapper -----------------------------------------------------------

  it('undo wrapper: a destructive edit then UNDO restores prior tracks', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 })] })],
    });
    const added = tracksReducer(s, {
      type: 'ADD_CLIP',
      payload: { trackIndex: 0, clip: makeClip({ id: 2 }) },
    });
    expect(added.tracks[0].clips.map((c) => c.id)).toEqual([1, 2]);

    const undone = tracksReducer(added, { type: 'UNDO' });
    expect(undone.tracks[0].clips.map((c) => c.id)).toEqual([1]);
  });

  it('undo wrapper: UNDO is a no-op when past is empty', () => {
    const s = makeState({ tracks: [], past: [] });
    const next = tracksReducer(s, { type: 'UNDO' });
    // Returns same reference when past is empty.
    expect(next).toBe(s);
  });

  it('undo wrapper: REDO restores after UNDO', () => {
    const s = makeState({
      tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 })] })],
    });
    const added = tracksReducer(s, {
      type: 'ADD_CLIP',
      payload: { trackIndex: 0, clip: makeClip({ id: 2 }) },
    });
    const undone = tracksReducer(added, { type: 'UNDO' });
    const redone = tracksReducer(undone, { type: 'REDO' });
    expect(redone.tracks[0].clips.map((c) => c.id)).toEqual([1, 2]);
  });
});
