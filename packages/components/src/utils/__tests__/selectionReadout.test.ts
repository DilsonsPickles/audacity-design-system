import { describe, it, expect } from 'vitest';
import { formatSelectionReadout, placeSelectionReadout } from '../selectionReadout';

describe('formatSelectionReadout (2026-11-19, the ruler readout)', () => {
  it('seconds: the length then the range', () => {
    expect(formatSelectionReadout(1.3, 2.55, { format: 'minutes-seconds' })).toEqual({ full: '1.250 s · 0:01.300 – 0:02.550', short: '1.250 s' });
  });
  it('a range past an hour carries hours', () => {
    expect(formatSelectionReadout(3600, 3725.4, { format: 'minutes-seconds' }).full).toBe('2:05.400 · 1:00:00.000 – 1:02:05.400');
  });
  it('lengths of a minute or more read m:ss.mmm', () => {
    expect(formatSelectionReadout(0, 65, { format: 'minutes-seconds' }).short).toBe('1:05.000');
  });
  it('reversed input reads start-first', () => {
    expect(formatSelectionReadout(2.55, 1.3, { format: 'minutes-seconds' }).full).toBe('1.250 s · 0:01.300 – 0:02.550');
  });
  it('beats and bars: bar.beat positions, the length in beats (120 bpm, 4/4: a beat is 0.5 s)', () => {
    expect(formatSelectionReadout(0.5, 4, { format: 'beats-measures', bpm: 120, beatsPerMeasure: 4, noteValue: 4 })).toEqual({ full: '7 beats · 1.2 – 3.1', short: '7 beats' });
  });
});

describe('placeSelectionReadout', () => {
  it('centred over the selection when the full label fits', () => {
    expect(placeSelectionReadout({ startX: 100, endX: 400, labelWidth: 200, viewportWidth: 1000, fullWidth: 200 })).toEqual({ left: 150, full: true });
  });
  it('a selection narrower than the full label shows the short one', () => {
    expect(placeSelectionReadout({ startX: 100, endX: 160, labelWidth: 60, viewportWidth: 1000, fullWidth: 200 })?.full).toBe(false);
  });
  it('kept inside the ruler when the selection runs off an edge', () => {
    expect(placeSelectionReadout({ startX: -300, endX: 120, labelWidth: 200, viewportWidth: 1000, fullWidth: 200 })?.left).toBe(4);
    expect(placeSelectionReadout({ startX: 900, endX: 1400, labelWidth: 200, viewportWidth: 1000, fullWidth: 200 })?.left).toBe(796);
  });
  it('nothing when the selection is wholly off screen or has no length', () => {
    expect(placeSelectionReadout({ startX: -500, endX: -10, labelWidth: 60, viewportWidth: 1000, fullWidth: 200 })).toBeNull();
    expect(placeSelectionReadout({ startX: 200, endX: 200, labelWidth: 60, viewportWidth: 1000, fullWidth: 200 })).toBeNull();
  });
});
