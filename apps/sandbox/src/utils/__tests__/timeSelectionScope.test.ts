import { describe, it, expect } from 'vitest';
import { resolveTimeSelectionScope } from '../timeSelectionScope';

describe('resolveTimeSelectionScope', () => {
  it('tier 1: returns the time-selection scope when non-empty', () => {
    expect(
      resolveTimeSelectionScope({ tracks: [2, 3] }, [0, 1], [9]),
    ).toEqual([2, 3]);
  });

  it('tier 1b: an explicitly EMPTY scope means act on NO tracks — no fallback (2026-09-10)', () => {
    expect(resolveTimeSelectionScope({ tracks: [] }, [0, 1], [9])).toEqual([]);
  });

  it('tier 2: falls back to selectedTrackIndices when scope is absent', () => {
    expect(resolveTimeSelectionScope({}, [0, 1], [9])).toEqual([0, 1]);
    expect(resolveTimeSelectionScope(null, [0, 1], [9])).toEqual([0, 1]);
  });

  it('tier 3: falls back to the caller fallback when both are empty', () => {
    expect(resolveTimeSelectionScope(null, [], [0, 1, 2])).toEqual([0, 1, 2]);
    expect(resolveTimeSelectionScope(undefined, [], [])).toEqual([]);
  });
});
