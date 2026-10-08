import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useThrottledValue } from '../useThrottledValue';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useThrottledValue (2026-10-08, the clip body redraw tempo)', () => {
  it('commits the first change at once, holds changes inside the interval, and lands on the latest when it ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const { result, rerender } = renderHook(({ v }) => useThrottledValue(v, 100), { initialProps: { v: 114 } });
    expect(result.current).toBe(114);
    rerender({ v: 138 });
    expect(result.current).toBe(138); // leading edge
    rerender({ v: 150 });
    rerender({ v: 162 });
    expect(result.current).toBe(138); // inside the interval: held
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(162); // trailing edge: the latest, not 150
  });

  it('after a rest the next change commits at once again', () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    const { result, rerender } = renderHook(({ v }) => useThrottledValue(v, 100), { initialProps: { v: 1 } });
    rerender({ v: 2 });
    expect(result.current).toBe(2);
    act(() => { vi.advanceTimersByTime(500); });
    rerender({ v: 3 });
    expect(result.current).toBe(3);
  });
});
