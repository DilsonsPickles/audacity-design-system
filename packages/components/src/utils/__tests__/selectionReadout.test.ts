import { describe, it, expect } from 'vitest';
import { formatSelectionParts, placeSelectionMeasure } from '../selectionReadout';

describe('formatSelectionParts (2026-11-19, the selection measure)', () => {
  it('seconds: the length and each edge', () => {
    expect(formatSelectionParts(1.3, 2.55, { format: 'minutes-seconds' })).toEqual({ length: '1.250 s', start: '0:01.300', end: '0:02.550' });
  });
  it('a range past an hour carries hours; a length past a minute reads m:ss.mmm', () => {
    expect(formatSelectionParts(3600, 3725.4, { format: 'minutes-seconds' })).toEqual({ length: '2:05.400', start: '1:00:00.000', end: '1:02:05.400' });
  });
  it('reversed input reads start-first', () => {
    expect(formatSelectionParts(2.55, 1.3, { format: 'minutes-seconds' }).start).toBe('0:01.300');
  });
  it('beats and bars: bar.beat edges, the length in beats (120 bpm, 4/4: a beat is 0.5 s)', () => {
    expect(formatSelectionParts(0.5, 4, { format: 'beats-measures', bpm: 120, beatsPerMeasure: 4, noteValue: 4 })).toEqual({ length: '7 beats', start: '1.2', end: '3.1' });
  });
  it('a length between whole beats reads to a tenth (final review: 0.3 beats read "0 beats")', () => {
    const opts = { format: 'beats-measures' as const, bpm: 120, beatsPerMeasure: 4, noteValue: 4 };
    expect(formatSelectionParts(0, 0.15, opts).length).toBe('0.3 beats');
    expect(formatSelectionParts(0, 1.75, opts).length).toBe('3.5 beats');
    expect(formatSelectionParts(0, 0.5, opts).length).toBe('1 beat');
  });
});

describe('placeSelectionMeasure', () => {
  const base = { pillWidth: 60, startWidth: 50, endWidth: 50, visibleLeft: 0, visibleRight: 1000 };
  it('the pill centred on the selection, both edge times when there is room', () => {
    expect(placeSelectionMeasure({ ...base, startX: 100, endX: 400 })).toEqual({ pillLeft: 220, showStart: true, showEnd: true });
  });
  it('too narrow for the pill and both times: the times go, the pill stays', () => {
    expect(placeSelectionMeasure({ ...base, startX: 100, endX: 180 })).toEqual({ pillLeft: 110, showStart: false, showEnd: false });
  });
  it('an edge off screen shows no time, and the pill stays over the visible part', () => {
    expect(placeSelectionMeasure({ ...base, startX: -300, endX: 400 })).toEqual({ pillLeft: 170, showStart: false, showEnd: true });
    expect(placeSelectionMeasure({ ...base, startX: 600, endX: 1600 })).toEqual({ pillLeft: 770, showStart: true, showEnd: false });
  });
  it('nothing when the selection is wholly off screen or has no length', () => {
    expect(placeSelectionMeasure({ ...base, startX: -500, endX: -10 })).toBeNull();
    expect(placeSelectionMeasure({ ...base, startX: 200, endX: 200 })).toBeNull();
  });
});
