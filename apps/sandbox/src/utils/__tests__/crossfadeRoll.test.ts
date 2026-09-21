import { describe, it, expect } from 'vitest';
import { computeCrossfadeRoll } from '../crossfadeRoll';
import type { Clip } from '../../contexts/TracksContext';

const clip = (overrides: Partial<Clip>): Clip => ({
  id: 1,
  name: 'Clip',
  start: 0,
  duration: 5,
  envelopePoints: [],
  ...overrides,
});

describe('computeCrossfadeRoll', () => {
  // outgoing: 0..5 with 3s of hidden tail (full 8, trimStart 0)
  // incoming: 3..7 with 2s of hidden head (trimStart 2)
  const outgoing = clip({ id: 1, start: 0, duration: 5, trimStart: 0, fullDuration: 8 });
  const incoming = clip({ id: 2, start: 3, duration: 4, trimStart: 2 });

  it('rolls right: outgoing extends, incoming shrinks from the left', () => {
    const r = computeCrossfadeRoll(outgoing, incoming, 1);
    expect(r).not.toBeNull();
    expect(r!.appliedDelta).toBe(1);
    expect(r!.outgoing.duration).toBe(6);
    expect(r!.incoming).toMatchObject({ start: 4, trimStart: 3, duration: 3 });
  });

  it('rolls left: outgoing shrinks, incoming reveals hidden head material', () => {
    const r = computeCrossfadeRoll(outgoing, incoming, -1.5);
    expect(r!.appliedDelta).toBe(-1.5);
    expect(r!.outgoing.duration).toBe(3.5);
    expect(r!.incoming).toMatchObject({ start: 1.5, trimStart: 0.5, duration: 5.5 });
  });

  it('clamps right to the outgoing clip\'s hidden tail', () => {
    // hidden tail = 8 - 0 - 5 = 3s; incoming can shrink to 0.1 (3.9s) → cap 3
    const r = computeCrossfadeRoll(outgoing, incoming, 10);
    expect(r!.appliedDelta).toBe(3);
  });

  it('clamps left to the incoming clip\'s trimStart', () => {
    // incoming has 2s of head material; outgoing can shrink 4.9 → cap 2
    const r = computeCrossfadeRoll(outgoing, incoming, -10);
    expect(r!.appliedDelta).toBe(-2);
  });

  it('returns null when fully clamped', () => {
    const noTail = clip({ id: 1, start: 0, duration: 5, trimStart: 0, fullDuration: 5 });
    expect(computeCrossfadeRoll(noTail, incoming, 1)).toBeNull();
    const noHead = clip({ id: 2, start: 3, duration: 4, trimStart: 0 });
    expect(computeCrossfadeRoll(outgoing, noHead, -1)).toBeNull();
  });

  it('keeps authored quick fades within their clips', () => {
    const fadedOut = clip({ id: 1, start: 0, duration: 5, trimStart: 0, fullDuration: 8, fadeOut: 4.5 });
    const fadedIn = clip({ id: 2, start: 3, duration: 4, trimStart: 2, fadeIn: 3.9 });
    const r = computeCrossfadeRoll(fadedOut, fadedIn, 1);
    expect(r!.outgoing.fadeOut).toBe(4.5); // fits the grown 6s clip
    expect(r!.incoming.fadeIn).toBe(3);    // clamped to the shrunk 3s clip
  });
});
