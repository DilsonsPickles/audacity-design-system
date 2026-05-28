import { describe, it, expect } from 'vitest';
import { resolveOverlap, ResolverTrack, ClipPlacement } from '../resolveOverlap';

const track = (clips: Array<{ id: number; start: number; duration: number; trimStart?: number }>): ResolverTrack => ({
  clips: clips.map(c => ({ trimStart: 0, ...c })),
});

describe('resolveOverlap', () => {
  it('returns no mutations when intent does not overlap any clip', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 10, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
    expect(result.placements).toEqual(intent);
  });

  it('returns no mutations when intent is exactly adjacent (touching but not overlapping)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 5, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
  });

  it('does not produce a mutation against a clip in movingClipIds (selected clips do not eat each other)', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 5 },
        { id: 2, start: 3, duration: 4 },
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 1, trackIndex: 0, start: 0, duration: 5 },
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([1, 2]));
    expect(result.mutations).toEqual([]);
  });

  it('trims the underlying clip when moving clip overlaps its right portion', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 }, // moving clip 3..7, underlying 0..5
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 0,
        newDuration: 3,
        newTrimStart: 0,
      },
    ]);
  });

  it('right-side trim: mEnd exactly equals uEnd is still right-side trim (single trim)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 2, duration: 3 }, // moving 2..5, underlying 0..5
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    // mStart > uStart and mEnd >= uEnd → right-side trim
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 0,
        newDuration: 2,
        newTrimStart: 0,
      },
    ]);
  });

  it('right-side trim preserves trimStart of the underlying clip', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5, trimStart: 1.5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 4, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 0,
        newDuration: 4,
        newTrimStart: 1.5,
      },
    ]);
  });

  it('trims the underlying clip when moving clip overlaps its left portion', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 5, duration: 5, trimStart: 0 }]), // underlying 5..10
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 }, // moving 3..7
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 7,        // mEnd
        newDuration: 3,     // uEnd - mEnd = 10 - 7
        newTrimStart: 2,    // 0 + (mEnd - uStart) = 0 + (7 - 5)
      },
    ]);
  });

  it('left-side trim adjusts trimStart by overlap amount when underlying already had trimStart', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 5, duration: 5, trimStart: 1 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 4, duration: 3 }, // moving 4..7, underlying 5..10
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 7,
        newDuration: 3,
        newTrimStart: 3,    // 1 + (7 - 5)
      },
    ]);
  });

  it('left-side trim: mStart exactly equals uStart still treated as left-side', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 5, duration: 5, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 5, duration: 3 }, // moving 5..8, underlying 5..10
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 8,
        newDuration: 2,
        newTrimStart: 3,
      },
    ]);
  });

  it('splits the underlying clip when moving clip is fully inside it', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 10, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 }, // moving 3..7, underlying 0..10
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'split',
        clipId: 1,
        trackIndex: 0,
        leftEnd: 3,
        rightStart: 7,
      },
    ]);
  });

  it('split is emitted as a single mutation regardless of the underlying clip duration', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 2, duration: 20, trimStart: 0.5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 99, trackIndex: 0, start: 10, duration: 2 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([99]));
    expect(result.mutations).toEqual([
      {
        type: 'split',
        clipId: 1,
        trackIndex: 0,
        leftEnd: 10,
        rightStart: 12,
      },
    ]);
  });

  it('deletes the underlying clip when moving clip fully obscures it', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 2, duration: 3 }]), // underlying 2..5
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 1, duration: 6 }, // moving 1..7
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      { type: 'delete', clipId: 1, trackIndex: 0 },
    ]);
  });

  it('deletes when boundaries match exactly (mStart=uStart and mEnd=uEnd)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 0, duration: 5 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      { type: 'delete', clipId: 1, trackIndex: 0 },
    ]);
  });

  it('handles multi-clip intent: each moving clip eats independently against non-moving clips', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 4 },   // underlying A
        { id: 2, start: 6, duration: 4 },   // underlying B
        { id: 10, start: 0, duration: 4 },  // moving X (initially at 0..4, will move)
        { id: 11, start: 6, duration: 4 },  // moving Y (initially at 6..10, will move)
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 10, trackIndex: 0, start: 2, duration: 4 }, // X lands on right of A
      { clipId: 11, trackIndex: 0, start: 8, duration: 4 }, // Y lands on right of B
    ];
    const result = resolveOverlap(tracks, intent, new Set([10, 11]));
    expect(result.mutations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'trim', clipId: 1, newDuration: 2 }),
      expect.objectContaining({ type: 'trim', clipId: 2, newDuration: 2 }),
    ]));
    expect(result.mutations).toHaveLength(2);
  });

  it('cross-track: mutations only target the destination track', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),  // track 0
      track([{ id: 2, start: 0, duration: 5 }]),  // track 1
    ];
    const intent: ClipPlacement[] = [
      { clipId: 99, trackIndex: 1, start: 2, duration: 4 }, // moving lands on track 1 only
    ];
    const result = resolveOverlap(tracks, intent, new Set([99]));
    expect(result.mutations).toEqual([
      expect.objectContaining({ type: 'trim', clipId: 2, trackIndex: 1, newDuration: 2 }),
    ]);
  });

  it('handles multiple underlying clips overlapping a single placement', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 3 },  // underlying A: 0..3
        { id: 2, start: 4, duration: 3 },  // underlying B: 4..7
        { id: 3, start: 8, duration: 3 },  // underlying C: 8..11
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 99, trackIndex: 0, start: 2, duration: 7 }, // moving 2..9 — eats A's right, all of B, C's left
    ];
    const result = resolveOverlap(tracks, intent, new Set([99]));
    expect(result.mutations).toHaveLength(3);
    expect(result.mutations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'trim', clipId: 1, newDuration: 2 }),
      expect.objectContaining({ type: 'delete', clipId: 2 }),
      expect.objectContaining({ type: 'trim', clipId: 3, newStart: 9, newDuration: 2 }),
    ]));
  });

  it('ignores tracks that do not exist (out-of-bounds trackIndex)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 99, start: 0, duration: 5 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
  });
});
