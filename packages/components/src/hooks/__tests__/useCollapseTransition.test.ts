import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { GROUP_COLLAPSE_MS } from '@audacity-ui/core';
import { useCollapseTransition } from '../useCollapseTransition';

afterEach(cleanup);

const ids = [1, 10, 2, 3, 4];

describe('useCollapseTransition', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useCollapseTransition([false, false, false, false, false], ids));
    expect(result.current.animating).toBe(false);
    expect(result.current.hiding.size).toBe(0);
  });

  it('captures the rows that just hid, in the same render they hid', () => {
    const { result, rerender } = renderHook(
      ({ hidden }) => useCollapseTransition(hidden, ids),
      { initialProps: { hidden: [false, false, false, false, false] } },
    );
    rerender({ hidden: [false, false, true, true, false] });
    expect(result.current.animating).toBe(true);
    expect([...result.current.hiding]).toEqual([2, 3]);
    expect(result.current.revealing.size).toBe(0);
  });

  it('captures the rows that just appeared', () => {
    const { result, rerender } = renderHook(
      ({ hidden }) => useCollapseTransition(hidden, ids),
      { initialProps: { hidden: [false, false, true, true, false] } },
    );
    rerender({ hidden: [false, false, false, false, false] });
    expect([...result.current.revealing]).toEqual([2, 3]);
    expect(result.current.hiding.size).toBe(0);
  });

  it('holds the sets across an unrelated re-render mid-tween', () => {
    const { result, rerender } = renderHook(
      ({ hidden }) => useCollapseTransition(hidden, ids),
      { initialProps: { hidden: [false, false, false, false, false] } },
    );
    rerender({ hidden: [false, false, true, true, false] });
    rerender({ hidden: [false, false, true, true, false] }); // fresh array, same values
    expect([...result.current.hiding]).toEqual([2, 3]);
    expect(result.current.animating).toBe(true);
  });

  it('clears itself after the tween', () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ hidden }) => useCollapseTransition(hidden, ids),
        { initialProps: { hidden: [false, false, false, false, false] } },
      );
      rerender({ hidden: [false, false, true, true, false] });
      expect(result.current.animating).toBe(true);
      act(() => { vi.advanceTimersByTime(GROUP_COLLAPSE_MS + 50); });
      expect(result.current.animating).toBe(false);
      expect(result.current.hiding.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a delete that shifts indices is not a hide or a reveal', () => {
    // Row 0 deleted: the hidden members move from indices 2,3 to 1,2.
    // By index that looks like 1 hid and 3 appeared; by id nothing did.
    const { result, rerender } = renderHook(
      ({ hidden, ids }) => useCollapseTransition(hidden, ids),
      { initialProps: { hidden: [false, false, true, true, false], ids: [1, 10, 2, 3, 4] } },
    );
    rerender({ hidden: [false, true, true, false], ids: [10, 2, 3, 4] });
    expect(result.current.animating).toBe(false);
  });
});
