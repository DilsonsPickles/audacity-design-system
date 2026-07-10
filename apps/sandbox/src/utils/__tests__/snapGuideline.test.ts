import { describe, it, expect } from 'vitest';
import { resolveSnapGuideline } from '../snapGuideline';

describe('resolveSnapGuideline', () => {
  const none = { time: null, kind: null } as const;

  it('drag wins over trim and stretch when all provide a value', () => {
    const result = resolveSnapGuideline(
      { time: 1, kind: 'grid' },
      { time: 2, kind: 'alignment' },
      { time: 3, kind: 'alignment' }
    );
    expect(result).toEqual({ time: 1, kind: 'grid' });
  });

  it('trim wins over stretch when drag has no guideline', () => {
    const result = resolveSnapGuideline(
      none,
      { time: 2, kind: 'alignment' },
      { time: 3, kind: 'grid' }
    );
    expect(result).toEqual({ time: 2, kind: 'alignment' });
  });

  it('falls back to stretch when drag and trim have no guideline', () => {
    const result = resolveSnapGuideline(none, none, { time: 3, kind: 'grid' });
    expect(result).toEqual({ time: 3, kind: 'grid' });
  });

  it('returns nulls when drag, trim, and stretch are all null', () => {
    const result = resolveSnapGuideline(none, none, none);
    expect(result).toEqual({ time: null, kind: null });
  });

  it('resolves time and kind independently, matching the source nullish-coalescing chains', () => {
    // Source resolves `snapGuidelineTime` and `snapGuidelineKind` via two
    // separate ?? chains, not as a single paired source — so a guideline
    // can end up with time from one input and kind from another.
    const result = resolveSnapGuideline(
      { time: 5, kind: null },
      { time: 10, kind: 'alignment' },
      none
    );
    expect(result).toEqual({ time: 5, kind: 'alignment' });
  });

  it('treats time: 0 as a valid (non-nullish) guideline time', () => {
    const result = resolveSnapGuideline(
      { time: 0, kind: 'grid' },
      { time: 10, kind: 'alignment' },
      none
    );
    expect(result).toEqual({ time: 0, kind: 'grid' });
  });
});
