import { describe, it, expect } from 'vitest';
import { applySplitCut, applyRippleCut, applyCut } from '../cutOperations';

// Helper to create a minimal track with one clip
function makeTrack(clipStart: number, clipDuration: number, id = 1) {
  return {
    id: 0,
    name: 'Track 1',
    clips: [
      {
        id,
        name: 'Clip 1',
        start: clipStart,
        duration: clipDuration,
        envelopePoints: [],
      },
    ],
  };
}

describe('applySplitCut', () => {
  it('Case 1: no overlap — clip unchanged', () => {
    const tracks = [makeTrack(0, 2)];
    const result = applySplitCut(tracks, 3, 4, [0]);
    expect(result[0].clips).toHaveLength(1);
    expect(result[0].clips[0].start).toBe(0);
    expect(result[0].clips[0].duration).toBe(2);
  });

  it('Case 2: deletion fully contains clip — clip deleted', () => {
    const tracks = [makeTrack(1, 2)];
    const result = applySplitCut(tracks, 0, 5, [0]);
    expect(result[0].clips).toHaveLength(0);
  });

  it('Case 3: deletion within clip — splits into 2 clips', () => {
    const tracks = [makeTrack(0, 4)];
    const result = applySplitCut(tracks, 1, 3, [0]);
    expect(result[0].clips).toHaveLength(2);
    // First clip: 0..1
    expect(result[0].clips[0].start).toBe(0);
    expect(result[0].clips[0].duration).toBe(1);
    // Second clip: 3..4
    expect(result[0].clips[1].start).toBe(3);
    expect(result[0].clips[1].duration).toBe(1);
  });

  it('Case 4: deletion overlaps start — trims start', () => {
    const tracks = [makeTrack(2, 4)]; // clip 2..6
    const result = applySplitCut(tracks, 1, 4, [0]); // cut 1..4
    expect(result[0].clips).toHaveLength(1);
    expect(result[0].clips[0].start).toBe(4);
    expect(result[0].clips[0].duration).toBe(2);
  });

  it('Case 5: deletion overlaps end — trims end', () => {
    const tracks = [makeTrack(0, 4)]; // clip 0..4
    const result = applySplitCut(tracks, 3, 5, [0]); // cut 3..5
    expect(result[0].clips).toHaveLength(1);
    expect(result[0].clips[0].start).toBe(0);
    expect(result[0].clips[0].duration).toBe(3);
  });

  it('does not affect unselected tracks', () => {
    const tracks = [makeTrack(0, 4), makeTrack(0, 4, 2)];
    tracks[1].id = 1;
    tracks[1].name = 'Track 2';
    const result = applySplitCut(tracks, 1, 3, [0]); // only track 0 selected
    expect(result[0].clips).toHaveLength(2); // split
    expect(result[1].clips).toHaveLength(1); // unchanged
    expect(result[1].clips[0].duration).toBe(4);
  });
});

describe('applyRippleCut', () => {
  it('shifts clips after deletion left', () => {
    const tracks = [makeTrack(5, 2)]; // clip 5..7
    const result = applyRippleCut(tracks, 1, 3, [0]); // cut 2s from 1..3
    expect(result[0].clips[0].start).toBe(3); // 5 - 2 = 3
    expect(result[0].clips[0].duration).toBe(2);
  });

  it('does not shift clips before deletion', () => {
    const tracks = [makeTrack(0, 2)]; // clip 0..2
    const result = applyRippleCut(tracks, 3, 5, [0]); // cut after clip
    expect(result[0].clips[0].start).toBe(0);
    expect(result[0].clips[0].duration).toBe(2);
  });

  it('removes clip fully contained in deletion', () => {
    const tracks = [makeTrack(1, 2)]; // clip 1..3
    const result = applyRippleCut(tracks, 0, 5, [0]);
    expect(result[0].clips).toHaveLength(0);
  });

  it('shrinks clip when deletion is inside clip', () => {
    const tracks = [makeTrack(0, 6)]; // clip 0..6
    const result = applyRippleCut(tracks, 2, 4, [0]); // cut 2s from middle
    expect(result[0].clips[0].duration).toBe(4); // 6 - 2
  });

  it('Case 4: deletion overlaps start — trims and shifts', () => {
    const tracks = [makeTrack(2, 4)]; // clip 2..6
    const result = applyRippleCut(tracks, 1, 4, [0]); // cut 1..4, overlaps first 2s of clip
    expect(result[0].clips).toHaveLength(1);
    expect(result[0].clips[0].start).toBe(1); // starts where deletion started
    expect(result[0].clips[0].duration).toBe(2); // 4 - (4-2) = 2
  });

  it('Case 5: deletion overlaps end — trims end', () => {
    const tracks = [makeTrack(0, 4)]; // clip 0..4
    const result = applyRippleCut(tracks, 3, 6, [0]); // cut 3..6, overlaps last 1s
    expect(result[0].clips).toHaveLength(1);
    expect(result[0].clips[0].start).toBe(0);
    expect(result[0].clips[0].duration).toBe(3); // 4 - (4-3) = 3
  });

  it('does not affect unselected tracks', () => {
    const tracks = [makeTrack(5, 2), makeTrack(5, 2, 2)];
    tracks[1].id = 1;
    tracks[1].name = 'Track 2';
    const result = applyRippleCut(tracks, 1, 3, [0]); // only track 0 selected
    expect(result[0].clips[0].start).toBe(3); // shifted
    expect(result[1].clips[0].start).toBe(5); // unchanged
  });
});

describe('applyCut', () => {
  it('delegates to applySplitCut for split mode', () => {
    const tracks = [makeTrack(0, 4)];
    const result = applyCut(tracks, 1, 3, 'split', [0]);
    expect(result[0].clips).toHaveLength(2);
  });

  it('delegates to applyRippleCut for ripple mode', () => {
    const tracks = [makeTrack(5, 2)];
    const result = applyCut(tracks, 1, 3, 'ripple', [0]);
    expect(result[0].clips[0].start).toBe(3);
  });
});
