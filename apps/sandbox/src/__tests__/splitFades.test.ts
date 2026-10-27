/**
 * A FADE BELONGS TO ITS EDGE, SHORTENED TO FIT (2026-10-27, "go with the
 * edge-owned fade, shortened to fit"). A split through a fade leaves the
 * half that holds the fade's edge a WHOLE fade — silence to full — squeezed
 * into that half; the other half has none. Every curve is one the app can
 * make, the volume never jumps at the cut, and the shortened length is
 * what is stored, so the fade cannot regrow when the half is trimmed back
 * out. (Fade PIECES — slices that kept the sound exact — were tried the
 * same day and dropped: "that's making impossible fade curves".)
 */
import { describe, it, expect } from 'vitest';
import { computeClipGainSegments, applyGainSegmentsToChannel } from '@audacity-ui/audio';
import { tracksReducer, initialState, type TracksState, type Clip } from '../contexts/TracksContext';

const RATE = 1000;

const stateWith = (clip: Partial<Clip>): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [{ id: 1, name: '', start: 0, duration: 6, trimStart: 0, envelopePoints: [], ...clip } as Clip] }],
} as unknown as TracksState);

const split = (state: TracksState, leftEnd: number, rightStart = leftEnd): Clip[] =>
  tracksReducer(state, {
    type: 'APPLY_CLIP_PLACEMENT',
    payload: { placements: [], mutations: [{ type: 'split', clipId: 1, trackIndex: 0, leftEnd, rightStart }] },
  }).tracks[0].clips;

/** The gain a clip's own bake applies at every sample of its SOURCE */
function gainsOf(clip: Clip): Float32Array {
  const segments = computeClipGainSegments([clip]).get(String(clip.id)) ?? [];
  return applyGainSegmentsToChannel(new Float32Array(10 * RATE).fill(1), segments, RATE);
}
const gainAt = (clip: Clip, clipTime: number) => gainsOf(clip)[Math.floor(((clip.trimStart ?? 0) + clipTime) * RATE)];

const original: Partial<Clip> = { fadeIn: 2, fadeInShape: 'linear', fadeOut: 1.5, fadeOutShape: { t: 0.5, g: 0.3 } };

describe('a split through a fade: the fade stays with its edge, shortened to fit', () => {
  it('cut inside the fade-in: the left half keeps a whole fade-in as long as itself; the right half has none', () => {
    const [left, right] = split(stateWith(original), 1);
    expect(left).toMatchObject({ duration: 1, fadeIn: 1, fadeInShape: 'linear' });
    expect(left.fadeOut).toBeUndefined();
    expect(right.fadeIn).toBeUndefined();
    expect(right.fadeInShape).toBeUndefined();
    expect(right).toMatchObject({ fadeOut: 1.5, fadeOutShape: { t: 0.5, g: 0.3 } });
  });

  it('cut inside the fade-out: the right half keeps a whole fade-out as long as itself; the left half has none', () => {
    const [left, right] = split(stateWith(original), 5.5);
    expect(left).toMatchObject({ fadeIn: 2 });
    expect(left.fadeOut).toBeUndefined();
    expect(right).toMatchObject({ duration: 0.5, fadeOut: 0.5, fadeOutShape: { t: 0.5, g: 0.3 } });
    expect(right.fadeIn).toBeUndefined();
  });

  it('a cut in the flat middle keeps both fades at their lengths', () => {
    const [left, right] = split(stateWith(original), 3);
    expect(left.fadeIn).toBe(2);
    expect(right.fadeOut).toBe(1.5);
  });

  it('a sliver too short to hold a fade keeps none, and none of its shape', () => {
    const [left] = split(stateWith(original), 0.01);
    expect(left.fadeIn).toBeUndefined();
    expect(left.fadeInShape).toBeUndefined();
  });

  it('a range taken out of the fade-in leaves the left half a fitted fade and the right half none', () => {
    const [left, right] = split(stateWith(original), 0.6, 1.4);
    expect(left).toMatchObject({ duration: 0.6, fadeIn: 0.6 });
    expect(right.fadeIn).toBeUndefined();
  });

  it('the volume never jumps at the cut: the fade-in reaches full at the left half\'s end, the right half starts full', () => {
    for (const cut of [0.5, 1, 1.9]) {
      const [left, right] = split(stateWith(original), cut);
      expect(gainAt(left, cut - 0.001)).toBeGreaterThan(0.99);
      expect(gainAt(right, 0.0005)).toBeCloseTo(1, 6);
    }
    for (const cut of [4.6, 5.5]) {
      const [left, right] = split(stateWith(original), cut);
      expect(gainAt(left, cut - 0.001)).toBeCloseTo(1, 6);
      expect(gainAt(right, 0.0005)).toBeGreaterThan(0.99);
    }
  });

  it('the shortened length is the stored one: trimming the half back out does not regrow the old fade', () => {
    const [left] = split(stateWith(original), 1);
    const state = { ...initialState, tracks: [{ id: 1, name: 't', clips: [left] }] } as unknown as TracksState;
    const trimmed = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: { placements: [], mutations: [{ type: 'trim', clipId: left.id, trackIndex: 0, newStart: 0, newDuration: 4, newTrimStart: 0 }] },
    }).tracks[0].clips[0];
    expect(trimmed.duration).toBe(4);
    expect(trimmed.fadeIn).toBe(1);
  });
});
