import { describe, it, expect } from 'vitest';
import { snapToClipEdges } from '../snapToClipEdges';

describe('snapToClipEdges', () => {
  it('snaps the moving clip\'s left edge to a target edge within threshold', () => {
    // Moving clip: start=0.04, duration=2 → edges [0.04, 2.04]
    // Targets: [0, 5] (clip ending at 5 has edges 0 and 5)
    // Threshold: 6px / pps; pixelsPerSecond=100 → threshold = 0.06s
    const result = snapToClipEdges({
      proposedStart: 0.04,
      duration: 2,
      targetEdges: [0, 5],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    // Left edge 0.04 within 0.06s of 0 → snap left to 0 → start = 0
    expect(result.snappedStart).toBe(0);
    expect(result.snappedEdge).toBe('left-to-0');
  });

  it('snaps the moving clip\'s right edge to a target edge within threshold', () => {
    // Moving clip start=2.97, duration=2 → right edge=4.97. Target edge at 5.
    // Distance: 0.03 < 0.06 → snap right to 5 → start = 3
    const result = snapToClipEdges({
      proposedStart: 2.97,
      duration: 2,
      targetEdges: [5],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBe(3);
    expect(result.snappedEdge).toBe('right-to-5');
  });

  it('returns proposed start unchanged when no target edge is within threshold', () => {
    const result = snapToClipEdges({
      proposedStart: 1.5,
      duration: 2,
      targetEdges: [10, 20],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBe(1.5);
    expect(result.snappedEdge).toBeNull();
  });

  it('prefers the closest edge when multiple are within threshold', () => {
    // proposedStart=0.05, duration=4.92 → edges [0.05, 4.97]
    // Targets [0, 5]: left distance to 0 = 0.05; right distance to 5 = 0.03
    // Right is closer → snap right.
    const result = snapToClipEdges({
      proposedStart: 0.05,
      duration: 4.92,
      targetEdges: [0, 5],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBeCloseTo(0.08, 5); // start = 5 - 4.92 = 0.08
    expect(result.snappedEdge).toBe('right-to-5');
  });

  it('does not snap below 0 (negative starts are clamped by the caller, but helper still returns a valid value)', () => {
    const result = snapToClipEdges({
      proposedStart: 0,
      duration: 2,
      targetEdges: [],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBe(0);
  });
});
