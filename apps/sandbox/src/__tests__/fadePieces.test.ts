/**
 * A CUT THROUGH A FADE DIVIDES IT (2026-10-27, "try the partial fade
 * approach"): splitting a clip must not change its sound. Each half keeps
 * its own slice of the fade's curve — a FADE PIECE (Clip.fadeInLead /
 * fadeOutTail) — so the two halves played back to back are the clip as it
 * was. These tests bake the gains through the audio package and read the
 * drawn gains through the components package, so the reducer, the sound
 * and the picture are held to one answer.
 */
import { describe, it, expect } from 'vitest';
import { computeClipGainSegments, applyGainSegmentsToChannel } from '@audacity-ui/audio';
import { computeFadeCurves, localFadeRegionsByClip, fadeGainAt } from '@audacity-ui/components';
import { tracksReducer, initialState, type TracksState, type Clip } from '../contexts/TracksContext';

const RATE = 1000;

const stateWith = (clip: Partial<Clip>): TracksState => ({
  ...initialState,
  tracks: [{ id: 1, name: 't', clips: [{ id: 1, name: '', start: 0, duration: 6, trimStart: 0, envelopePoints: [], ...clip } as Clip] }],
} as unknown as TracksState);

const split = (state: TracksState, leftEnd: number, rightStart = leftEnd, clipId = 1): TracksState =>
  tracksReducer(state, {
    type: 'APPLY_CLIP_PLACEMENT',
    payload: { placements: [], mutations: [{ type: 'split', clipId, trackIndex: 0, leftEnd, rightStart }] },
  });

/** The gain each clip applies at every SOURCE sample, as the audio bakes it */
function bakedGains(clips: readonly Clip[], sourceSeconds: number): Map<string, Float32Array> {
  const segments = computeClipGainSegments(clips);
  const ones = new Float32Array(Math.round(sourceSeconds * RATE)).fill(1);
  return new Map(clips.map((c) => [String(c.id), applyGainSegmentsToChannel(ones, segments.get(String(c.id)) ?? [], RATE)]));
}

/** What you HEAR at timeline sample i: the gain of whichever clip plays there */
function heard(clips: readonly Clip[], sourceSeconds: number): (i: number) => number | null {
  const gains = bakedGains(clips, sourceSeconds);
  return (i) => {
    const t = (i + 0.5) / RATE;
    const c = clips.find((k) => t >= k.start && t < k.start + k.duration);
    if (!c) return null;
    return gains.get(String(c.id))![Math.floor(((c.trimStart ?? 0) + (t - c.start)) * RATE)];
  };
}

const original: Partial<Clip> = {
  fadeIn: 2,
  fadeInShape: { t: 0.5, g: 0.3 }, // a bent curve, so a squash or a restart would show
  fadeOut: 1.5,
  fadeOutShape: 'linear',
};

describe('a split through a fade divides it into pieces', () => {
  it('cut inside the fade-in: the left half keeps the whole curve cut off at its end, the right half the rest', () => {
    const next = split(stateWith(original), 1);
    const [left, right] = next.tracks[0].clips;
    expect(left).toMatchObject({ start: 0, duration: 1, fadeIn: 2, fadeInLead: 0 });
    expect(left.fadeOut).toBeUndefined();
    expect(right).toMatchObject({ start: 1, duration: 5, fadeIn: 2, fadeInLead: 1, fadeInShape: { t: 0.5, g: 0.3 }, fadeOut: 1.5 });
    expect(right.fadeOutTail).toBeUndefined();
  });

  it('cut inside the fade-out: the left half carries its start, the right half keeps the curve cut off at its start', () => {
    const next = split(stateWith(original), 5);
    const [left, right] = next.tracks[0].clips;
    expect(left).toMatchObject({ fadeIn: 2, fadeOut: 1.5, fadeOutTail: 1, fadeOutShape: 'linear' });
    expect(left.fadeInLead).toBeUndefined();
    expect(right).toMatchObject({ start: 5, duration: 1, fadeOut: 1.5, fadeOutTail: 0 });
    expect(right.fadeIn).toBeUndefined();
  });

  it('a cut in the flat middle touches neither fade', () => {
    const [left, right] = split(stateWith(original), 3).tracks[0].clips;
    expect(left.fadeInLead).toBeUndefined();
    expect(left.fadeOut).toBeUndefined();
    expect(right.fadeIn).toBeUndefined();
    expect(right.fadeOutTail).toBeUndefined();
  });

  for (const cut of [0.25, 1, 1.999, 3, 4.6, 5.5, 5.95]) {
    it(`cut at ${cut}s sounds exactly as the clip did`, () => {
      const before = stateWith(original);
      const after = split(before, cut);
      const was = heard(before.tracks[0].clips, 6);
      const now = heard(after.tracks[0].clips, 6);
      let worst = 0;
      for (let i = 0; i < 6 * RATE; i++) worst = Math.max(worst, Math.abs((now(i) ?? NaN) - (was(i) ?? NaN)));
      expect(worst).toBeLessThan(1e-3);
    });
  }

  it('cutting a piece again stays transparent (three cuts through one fade-in)', () => {
    const before = stateWith(original);
    let after = split(before, 0.5);
    after = split(after, 1.2, 1.2, after.tracks[0].clips[1].id as number);
    after = split(after, 1.7, 1.7, after.tracks[0].clips[2].id as number);
    expect(after.tracks[0].clips).toHaveLength(4);
    const was = heard(before.tracks[0].clips, 6);
    const now = heard(after.tracks[0].clips, 6);
    for (let i = 0; i < 6 * RATE; i += 7) expect(now(i)).toBeCloseTo(was(i)!, 3);
  });

  it('a range taken out of the fade-in leaves every remaining sample at the gain it had', () => {
    const before = stateWith(original);
    const after = split(before, 0.6, 1.4); // the gap 0.6..1.4 is gone
    const [left, right] = after.tracks[0].clips;
    expect(right).toMatchObject({ start: 1.4, fadeInLead: 1.4, fadeIn: 2 });
    const was = heard(before.tracks[0].clips, 6);
    const now = heard(after.tracks[0].clips, 6);
    for (let i = 0; i < 6 * RATE; i += 5) {
      const t = (i + 0.5) / RATE;
      if (t >= left.start + left.duration && t < right.start) expect(now(i)).toBeNull();
      else expect(now(i)).toBeCloseTo(was(i)!, 3);
    }
  });

  it('the drawn gain is the baked gain, piece by piece', () => {
    const clips = split(stateWith(original), 1).tracks[0].clips;
    const regions = localFadeRegionsByClip(clips, computeFadeCurves(clips));
    const baked = bakedGains(clips, 6);
    for (const c of clips) {
      const gains = baked.get(String(c.id))!;
      for (let k = 0; k < 200; k++) {
        const local = (k + 0.5) / 200 * c.duration;
        const drawn = fadeGainAt(local, regions.get(c.id));
        const sound = gains[Math.floor(((c.trimStart ?? 0) + local) * RATE)];
        expect(drawn).toBeCloseTo(sound, 2);
      }
    }
  });
});

describe('editing a piece makes it an ordinary fade', () => {
  it('setting the right half\'s fade-in length clears its lead; its fade-out stays', () => {
    const [, right] = split(stateWith(original), 1).tracks[0].clips;
    const state = { ...initialState, tracks: [{ id: 1, name: 't', clips: [right] }] } as unknown as TracksState;
    const next = tracksReducer(state, { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: right.id, side: 'in', seconds: 0.8 } });
    const c = next.tracks[0].clips[0];
    expect(c.fadeIn).toBe(0.8);
    expect(c.fadeInLead).toBeUndefined();
    expect(c.fadeOut).toBe(1.5);
  });

  it('a piece on the other edge keeps being one unless the new fade needs its room', () => {
    const [left] = split(stateWith(original), 5).tracks[0].clips; // fade-out piece showing 1s of a 1.5s curve on a 5s clip
    const state = { ...initialState, tracks: [{ id: 1, name: 't', clips: [left] }] } as unknown as TracksState;
    const kept = tracksReducer(state, { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: left.id, side: 'in', seconds: 3 } }).tracks[0].clips[0];
    expect(kept).toMatchObject({ fadeIn: 3, fadeOut: 1.5, fadeOutTail: 1 });
    const pushed = tracksReducer(state, { type: 'SET_CLIP_FADE', payload: { trackIndex: 0, clipId: left.id, side: 'in', seconds: 4.6 } }).tracks[0].clips[0];
    expect(pushed.fadeIn).toBe(4.6);
    expect(pushed.fadeOut).toBeCloseTo(0.4, 6);
    expect(pushed.fadeOutTail).toBeUndefined();
  });
});
