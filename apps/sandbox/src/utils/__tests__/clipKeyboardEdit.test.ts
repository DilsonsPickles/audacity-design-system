import { describe, it, expect } from 'vitest';
import {
  computeKeyboardTrim,
  computeKeyboardTrimAnnouncement,
  computeKeyboardTrimBatch,
  computeKeyboardStretch,
  computeKeyboardStretchAnnouncement,
  type KeyboardTrimTarget,
} from '../clipKeyboardEdit';
import type { Clip } from '../../contexts/TracksContext';

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 1,
    name: 'Clip 1',
    start: 0,
    duration: 5,
    envelopePoints: [],
    trimStart: 0,
    fullDuration: 5,
    ...overrides,
  };
}

describe('computeKeyboardTrim', () => {
  it('trim right edge shrinks duration by the step', () => {
    const clip = makeClip({ duration: 5, trimStart: 0, fullDuration: 5, start: 0 });
    const result = computeKeyboardTrim({ clip, edge: 'right', deltaSeconds: 0.5 });
    expect(result).not.toBeNull();
    expect(result!.newDuration).toBeCloseTo(4.5);
    // trimStart is unaffected by a right-edge trim
    expect(result!.newTrimStart).toBeCloseTo(0);
    // right edge never moves clip.start
    expect(result!.newStart).toBeUndefined();
  });

  it('shrinking a right edge that would cross below the minimum clamps duration to 0.1 instead of overshooting', () => {
    // duration 0.3, step 1 — shrinking by the full delta would go
    // below MIN_CLIP_DURATION (0.1), so it clamps instead of going null.
    const clip = makeClip({ duration: 0.3, trimStart: 0, fullDuration: 0.3, start: 0 });
    const result = computeKeyboardTrim({ clip, edge: 'right', deltaSeconds: 1 });
    expect(result).not.toBeNull();
    expect(result!.newDuration).toBeCloseTo(0.1);
  });

  it('trim past the minimum duration (already at the floor) is a no-op — returns null', () => {
    const clip = makeClip({ duration: 0.1, trimStart: 0, fullDuration: 5, start: 0 });
    const result = computeKeyboardTrim({ clip, edge: 'right', deltaSeconds: 0.5 });
    expect(result).toBeNull();
  });

  it('trim right edge past the maximum (extending into non-existent source) returns null', () => {
    // Already at max duration (fullDuration - trimStart) — extending
    // right (negative delta) has nothing to reveal.
    const clip = makeClip({ duration: 5, trimStart: 0, fullDuration: 5, start: 0 });
    const result = computeKeyboardTrim({ clip, edge: 'right', deltaSeconds: -0.5 });
    expect(result).toBeNull();
  });

  it('trim left edge past the minimum (extending beyond trimStart=0) returns null', () => {
    const clip = makeClip({ duration: 5, trimStart: 0, fullDuration: 5, start: 2 });
    const result = computeKeyboardTrim({ clip, edge: 'left', deltaSeconds: -0.5 });
    expect(result).toBeNull();
  });

  it('trim left edge shrinks duration, advances trimStart, and moves start forward', () => {
    const clip = makeClip({ duration: 5, trimStart: 0, fullDuration: 5, start: 2 });
    const result = computeKeyboardTrim({ clip, edge: 'left', deltaSeconds: 0.5 });
    expect(result).not.toBeNull();
    expect(result!.newTrimStart).toBeCloseTo(0.5);
    expect(result!.newDuration).toBeCloseTo(4.5);
    expect(result!.newStart).toBeCloseTo(2.5);
  });

  it('trim left edge extends left, pulling trimStart down and start backward', () => {
    const clip = makeClip({ duration: 4, trimStart: 1, fullDuration: 5, start: 3 });
    const result = computeKeyboardTrim({ clip, edge: 'left', deltaSeconds: -0.5 });
    expect(result).not.toBeNull();
    expect(result!.newTrimStart).toBeCloseTo(0.5);
    expect(result!.newDuration).toBeCloseTo(4.5);
    expect(result!.newStart).toBeCloseTo(2.5);
  });

  it('a delta that rounds to zero change is a no-op (null)', () => {
    const clip = makeClip({ duration: 5, trimStart: 0, fullDuration: 5, start: 0 });
    const result = computeKeyboardTrim({ clip, edge: 'right', deltaSeconds: 0.0001 });
    expect(result).toBeNull();
  });

  it('applies stretchFactor when mapping canvas delta to source trimStart delta', () => {
    const clip = { ...makeClip({ duration: 4, trimStart: 1, fullDuration: 5, start: 0 }), stretchFactor: 2 } as Clip;
    // Extending left by 1 canvas-second = 0.5 source-seconds of trimStart.
    const result = computeKeyboardTrim({ clip, edge: 'left', deltaSeconds: -1 });
    expect(result).not.toBeNull();
    expect(result!.newTrimStart).toBeCloseTo(0.5);
    expect(result!.newDuration).toBeCloseTo(5);
  });
});

describe('computeKeyboardTrimAnnouncement', () => {
  it('announces the resulting duration from the raw delta, independent of clamping', () => {
    expect(computeKeyboardTrimAnnouncement({ duration: 5 }, 0.5)).toBe('Clip is now 4.5 seconds long');
  });

  it('floors to the minimum duration when the raw delta would go negative', () => {
    expect(computeKeyboardTrimAnnouncement({ duration: 0.3 }, 5)).toBe('Clip is now 0.1 seconds long');
  });
});

describe('computeKeyboardTrimBatch', () => {
  it('dispatches a trim update for a single selected clip', () => {
    const clip = makeClip({ id: 1, duration: 5, start: 0, trimStart: 0, fullDuration: 5, selected: true });
    const targets: KeyboardTrimTarget[] = [{ trackIndex: 0, clip }];
    const result = computeKeyboardTrimBatch(targets, 'right', 0.5);
    expect(result.updates).toEqual([
      { trackIndex: 0, clipId: 1, newTrimStart: 0, newDuration: 4.5, newStart: undefined },
    ]);
  });

  it('skips a target whose trim is a no-op', () => {
    const maxedClip = makeClip({ id: 1, duration: 5, start: 0, trimStart: 0, fullDuration: 5, selected: true });
    const neighbor = makeClip({ id: 2, duration: 3, start: 6, trimStart: 0, fullDuration: 5, selected: true });
    const targets: KeyboardTrimTarget[] = [
      { trackIndex: 0, clip: maxedClip },
      { trackIndex: 0, clip: neighbor },
    ];
    // Extending right (negative delta) on a clip already at max duration
    // is a no-op for maxedClip; neighbor still trims normally (its own
    // extend has room).
    const result = computeKeyboardTrimBatch(targets, 'right', -0.5);
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].clipId).toBe(2);
  });

  it('extends across a neighbour without mutating it — overlap is legal', () => {
    const moving = makeClip({ id: 1, duration: 5, start: 0, trimStart: 0, fullDuration: 10, selected: true });
    const targets: KeyboardTrimTarget[] = [{ trackIndex: 0, clip: moving }];
    // Extend right by 3: 0..5 -> 0..8, overlapping a neighbour at 6..9.
    // The batch is ONLY the mover's own trim — the neighbour overlaps.
    const result = computeKeyboardTrimBatch(targets, 'right', -3);
    expect(result.updates).toEqual([
      { trackIndex: 0, clipId: 1, newTrimStart: 0, newDuration: 8, newStart: undefined },
    ]);
  });
});

describe('computeKeyboardStretch', () => {
  it('shrinking duration reduces stretchFactor proportionally', () => {
    const clip = makeClip({ duration: 4, start: 0 });
    const result = computeKeyboardStretch({ clip, edge: 'right', deltaSeconds: 1 });
    expect(result).not.toBeNull();
    // newDuration = 3, ratio = 3/4 = 0.75, newStretchFactor = 1 * 0.75
    expect(result!.newDuration).toBeCloseTo(3);
    expect(result!.newStretchFactor).toBeCloseTo(0.75);
    expect(result!.newStart).toBeUndefined();
  });

  it('extending duration on the left edge grows stretchFactor and moves start', () => {
    const clip = makeClip({ duration: 4, start: 2 });
    const result = computeKeyboardStretch({ clip, edge: 'left', deltaSeconds: -1 });
    expect(result).not.toBeNull();
    // newDuration = 5, ratio = 5/4 = 1.25, newStretchFactor = 1 * 1.25
    expect(result!.newDuration).toBeCloseTo(5);
    expect(result!.newStretchFactor).toBeCloseTo(1.25);
    expect(result!.newStart).toBeCloseTo(1);
  });

  it('clamps stretchFactor to the [0.1, 10] range', () => {
    const clip = { ...makeClip({ duration: 4, start: 0 }), stretchFactor: 9 } as Clip;
    const result = computeKeyboardStretch({ clip, edge: 'right', deltaSeconds: -20 });
    expect(result).not.toBeNull();
    expect(result!.newStretchFactor).toBe(10);
  });

  it('returns null when the computed stretch factor does not change', () => {
    const clip = makeClip({ duration: 4, start: 0 });
    const result = computeKeyboardStretch({ clip, edge: 'right', deltaSeconds: 0 });
    expect(result).toBeNull();
  });

  it('applies an existing stretchFactor multiplicatively', () => {
    const clip = { ...makeClip({ duration: 4, start: 0 }), stretchFactor: 2 } as Clip;
    const result = computeKeyboardStretch({ clip, edge: 'right', deltaSeconds: 1 });
    expect(result).not.toBeNull();
    // ratio = 3/4 = 0.75, newStretchFactor = 2 * 0.75 = 1.5
    expect(result!.newStretchFactor).toBeCloseTo(1.5);
  });
});

describe('computeKeyboardStretchAnnouncement', () => {
  it('announces the resulting duration from the raw delta', () => {
    expect(computeKeyboardStretchAnnouncement({ duration: 4 }, 1)).toBe('Clip stretched to 3 seconds');
  });
});
