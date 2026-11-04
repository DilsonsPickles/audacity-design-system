import { describe, it, expect } from 'vitest';
import { quarterSeconds, beatSeconds, barSeconds, noteSeconds } from '../musicalTime';

describe('musical durations — tempo counts quarters, a beat is the lower note (2026-11-04)', () => {
  it('4/4 at 120: a beat is a quarter, half a second; a bar is two seconds', () => {
    expect(quarterSeconds(120)).toBe(0.5);
    expect(beatSeconds(120, 4)).toBe(0.5);
    expect(barSeconds(120, 4, 4)).toBe(2);
  });

  it('6/8 at 120: a beat is an eighth, a quarter-second; a bar is six of them', () => {
    expect(beatSeconds(120, 8)).toBe(0.25);
    expect(barSeconds(120, 6, 8)).toBe(1.5);
  });

  it('2/2 at 120: a beat is a half note, a second', () => {
    expect(beatSeconds(120, 2)).toBe(1);
    expect(barSeconds(120, 2, 2)).toBe(2);
  });

  it('a snap value is a note whatever the signature: 1/4 is a quarter, 1/8 an eighth', () => {
    expect(noteSeconds(120, 4)).toBe(0.5);
    expect(noteSeconds(120, 8)).toBe(0.25);
  });
});
