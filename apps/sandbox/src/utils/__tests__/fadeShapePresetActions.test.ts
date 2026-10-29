import { describe, it, expect } from 'vitest';
import { fadeShapePresetActions, PRESET_FADE_SECONDS } from '../fadeShapePresetActions';
import { tracksReducer, type Track, type TracksState } from '../../contexts/TracksContext';

const clip = (id: number, duration: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start: 0, duration, envelopePoints: [], ...extra });
const tracks = (): Track[] => ([
  { id: 1, name: 'A', clips: [clip(1, 4), clip(2, 4, { fadeIn: 1 }), clip(3, 1, { selected: true }), clip(4, 4, { selected: true, fadeIn: 2 })] },
] as unknown as Track[]);

describe('fadeShapePresetActions — a curve picked for a fade (2026-10-29)', () => {
  it('with a fade: the shape alone, no undo bracket', () => {
    expect(fadeShapePresetActions(tracks(), 0, 2, 'in', 'linear')).toEqual([
      { type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: 0, clipId: 2, side: 'in', shape: 'linear' } },
    ]);
  });

  it('with no fade: makes one of 0.5 s in that shape, as one undo step', () => {
    expect(fadeShapePresetActions(tracks(), 0, 1, 'out', 'linear')).toEqual([
      { type: 'BEGIN_UNDO_GESTURE' },
      { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: 1, side: 'out', seconds: PRESET_FADE_SECONDS } },
      { type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: 0, clipId: 1, side: 'out', shape: 'linear' } },
      { type: 'END_UNDO_GESTURE' },
    ]);
  });

  it('a short clip gets a quarter of its length; a selected clip\'s pick is every selected clip\'s, each judged alone', () => {
    const actions = fadeShapePresetActions(tracks(), 0, 3, 'in', 'linear');
    const lengths = actions.filter((a) => a.type === 'SET_CLIP_FADE');
    // clip 3 (1 s, no fade) is made at 0.25 s; clip 4 keeps its 2 s fade
    expect(lengths).toEqual([
      { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: 3, side: 'in', seconds: 0.25 } },
    ]);
    expect(actions.filter((a) => a.type === 'SET_CLIP_FADE_SHAPE')).toHaveLength(2);
  });

  it('through the reducer: the fade appears, and one undo takes it away', () => {
    let state = { tracks: tracks(), past: [], future: [], undoGesture: null } as unknown as TracksState;
    for (const a of fadeShapePresetActions(state.tracks, 0, 1, 'in', 'linear')) state = tracksReducer(state, a);
    const made = state.tracks[0].clips.find((c) => c.id === 1)!;
    expect(made.fadeIn).toBe(PRESET_FADE_SECONDS);
    expect(made.fadeInShape).toBe('linear');
    state = tracksReducer(state, { type: 'UNDO' });
    const back = state.tracks[0].clips.find((c) => c.id === 1)!;
    expect(back.fadeIn ?? 0).toBe(0);
    expect(back.fadeInShape).toBeUndefined();
  });
});
