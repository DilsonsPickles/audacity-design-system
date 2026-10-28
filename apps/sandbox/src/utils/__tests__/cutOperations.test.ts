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

describe('applyRippleCut — envelope & deletedRegions handling', () => {
  it('Case 4: shifts envelope points when deletion overlaps start', () => {
    const tracks = [{
      id: 0, name: 'Track 1',
      clips: [{
        id: 1, name: 'Clip 1', start: 2, duration: 4,
        envelopePoints: [{ time: 0, db: -6 }, { time: 1, db: -3 }, { time: 3, db: 0 }],
      }],
    }];
    // cut 1..4, overlaps first 2s of clip (2..4)
    const result = applyRippleCut(tracks, 1, 4, [0]);
    const clip = result[0].clips[0];
    // Only the point at time=3 survives (shifted by 2): time=1
    expect(clip.envelopePoints).toEqual([{ time: 1, db: 0 }]);
  });

  it('Case 4: shifts deletedRegions when deletion overlaps start', () => {
    const tracks = [{
      id: 0, name: 'Track 1',
      clips: [{
        id: 1, name: 'Clip 1', start: 2, duration: 6,
        envelopePoints: [],
        deletedRegions: [{ startTime: 3, duration: 0.5 }],
      }],
    }];
    // cut 1..4, overlaps first 2s of clip
    const result = applyRippleCut(tracks, 1, 4, [0]);
    const clip = result[0].clips[0];
    // deletedRegion at 3 shifted by 2 = 1
    expect(clip.deletedRegions).toEqual([{ startTime: 1, duration: 0.5 }]);
  });

  it('Case 4: drops deletedRegions that shift below 0', () => {
    const tracks = [{
      id: 0, name: 'Track 1',
      clips: [{
        id: 1, name: 'Clip 1', start: 2, duration: 6,
        envelopePoints: [],
        deletedRegions: [{ startTime: 1, duration: 0.5 }],
      }],
    }];
    // cut 1..4, overlaps first 2s of clip; region at 1 shifted by 2 = -1, dropped
    const result = applyRippleCut(tracks, 1, 4, [0]);
    const clip = result[0].clips[0];
    expect(clip.deletedRegions).toBeUndefined();
  });

  it('Case 5: filters envelope points when deletion overlaps end', () => {
    const tracks = [{
      id: 0, name: 'Track 1',
      clips: [{
        id: 1, name: 'Clip 1', start: 0, duration: 4,
        envelopePoints: [{ time: 1, db: -6 }, { time: 3.5, db: 0 }],
      }],
    }];
    // cut 3..6, overlaps last 1s of clip
    const result = applyRippleCut(tracks, 3, 6, [0]);
    const clip = result[0].clips[0];
    // Only points before relativeStart (3) survive
    expect(clip.envelopePoints).toEqual([{ time: 1, db: -6 }]);
  });

  it('Case 5: filters deletedRegions when deletion overlaps end', () => {
    const tracks = [{
      id: 0, name: 'Track 1',
      clips: [{
        id: 1, name: 'Clip 1', start: 0, duration: 4,
        envelopePoints: [],
        deletedRegions: [{ startTime: 1, duration: 0.5 }, { startTime: 3.5, duration: 0.2 }],
      }],
    }];
    // cut 3..6, overlaps last 1s of clip
    const result = applyRippleCut(tracks, 3, 6, [0]);
    const clip = result[0].clips[0];
    // Only regions before relativeStart (3) survive
    expect(clip.deletedRegions).toEqual([{ startTime: 1, duration: 0.5 }]);
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

// A cut through a fade (2026-10-28): the split's rule — a fade belongs to
// its edge, shortened to fit — for range cuts, which copied both fades
// onto both halves until then.
describe('a range cut through a fade', () => {
  // A 6 s clip with a 4 s fade-in (shaped) and a 1 s fade-out
  const faded = () => [{
    id: 0,
    name: 'Track 1',
    clips: [{
      id: 1, name: 'Clip 1', start: 0, duration: 6, envelopePoints: [],
      fadeIn: 4, fadeOut: 1, fadeInShape: 'linear' as const, fadeOutShape: 1,
    }],
  }];

  it('split cut from the middle of the fade-in: the left half keeps a fitted fade-in and no fade-out; the right half keeps the fade-out and no fade-in', () => {
    const [left, right] = applySplitCut(faded(), 1, 2, [0])[0].clips;
    expect(left.duration).toBe(1);
    expect(left.fadeIn).toBe(1);
    expect(left.fadeInShape).toBe('linear');
    expect(left.fadeOut).toBeUndefined();
    expect(left.fadeOutShape).toBeUndefined();
    expect(right.fadeIn).toBeUndefined();
    expect(right.fadeInShape).toBeUndefined();
    expect(right.fadeOut).toBe(1);
    expect(right.fadeOutShape).toBe(1);
  });

  it('split cut leaving a sliver too short for a fade keeps none, nor its shape', () => {
    const [left] = applySplitCut(faded(), 0.01, 2, [0])[0].clips;
    expect(left.fadeIn).toBeUndefined();
    expect(left.fadeInShape).toBeUndefined();
  });

  it('a cut over the clip\'s start keeps the fade-out and gives the fade-in the room that is left', () => {
    // 3 s cut from the head: 3 s left, the 1 s fade-out stays, the fade-in fits into 2 s
    const [clip] = applySplitCut(faded(), 0, 3, [0])[0].clips;
    expect(clip.duration).toBe(3);
    expect(clip.fadeOut).toBe(1);
    expect(clip.fadeIn).toBe(2);
  });

  it('a cut over the clip\'s end keeps the fade-in to what fits and drops a fade-out with no room', () => {
    const [clip] = applySplitCut(faded(), 4, 6, [0])[0].clips;
    expect(clip.duration).toBe(4);
    expect(clip.fadeIn).toBe(4);
    expect(clip.fadeOut).toBeUndefined();
    expect(clip.fadeOutShape).toBeUndefined();
  });

  it('ripple cut inside the fade-in shortens it by what was taken out; the fade-out is untouched', () => {
    const [clip] = applyRippleCut(faded(), 1, 2, [0])[0].clips;
    expect(clip.duration).toBe(5);
    expect(clip.fadeIn).toBe(3);
    expect(clip.fadeOut).toBe(1);
  });

  it('ripple cut in the flat middle keeps both fades', () => {
    const tracks = faded();
    tracks[0].clips[0].fadeIn = 1;
    const [clip] = applyRippleCut(tracks, 2, 3, [0])[0].clips;
    expect(clip.fadeIn).toBe(1);
    expect(clip.fadeOut).toBe(1);
  });

  it('ripple cut over the clip\'s end shortens the fades to fit', () => {
    const [clip] = applyRippleCut(faded(), 3, 6, [0])[0].clips;
    expect(clip.duration).toBe(3);
    expect(clip.fadeIn).toBe(3);
    expect(clip.fadeOut).toBeUndefined();
  });
});
