import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useLeavingKeys, useLeaveDelay, handleLeaveMs, HANDLE_LEAVE_MS } from '../useLeavingKeys';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useLeavingKeys — a key lingers after it stops being active (2026-10-01)', () => {
  it('a key that goes is leaving for ms, then gone; one that stays is never leaving', () => {
    const { result, rerender } = renderHook(({ active }) => useLeavingKeys(active, 200), { initialProps: { active: ['a', 'b'] } });
    expect(result.current.size).toBe(0);
    rerender({ active: ['b'] });
    expect([...result.current]).toEqual(['a']);
    act(() => { vi.advanceTimersByTime(199); });
    expect([...result.current]).toEqual(['a']);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.size).toBe(0);
  });

  it('a key that comes back while leaving is active again at once, and its timer is dropped', () => {
    const { result, rerender } = renderHook(({ active }) => useLeavingKeys(active, 200), { initialProps: { active: ['a'] } });
    rerender({ active: [] });
    expect(result.current.has('a')).toBe(true);
    rerender({ active: ['a'] });
    expect(result.current.has('a')).toBe(false);
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.has('a')).toBe(false);
  });

  it('with ms 0 nothing lingers', () => {
    const { result, rerender } = renderHook(({ active }) => useLeavingKeys(active, 0), { initialProps: { active: ['a'] } });
    rerender({ active: [] });
    expect(result.current.size).toBe(0);
  });

  it('useLeaveDelay: mounted through the tail, leaving only in it', () => {
    const { result, rerender } = renderHook(({ shown }) => useLeaveDelay(shown, 200), { initialProps: { shown: true } });
    expect(result.current).toEqual({ mounted: true, leaving: false });
    rerender({ shown: false });
    expect(result.current).toEqual({ mounted: true, leaving: true });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toEqual({ mounted: false, leaving: false });
  });
});

describe('handleLeaveMs — the duration, or none where nothing can animate', () => {
  const original = window.matchMedia;
  afterEach(() => { window.matchMedia = original; });

  it('is under half a second, 0 under reduced motion, and 0 where there is no matchMedia (jsdom)', () => {
    expect(HANDLE_LEAVE_MS).toBeLessThan(500);
    // justified: jsdom has no matchMedia; a minimal stand-in for the one query the hook makes
    (window as any).matchMedia = (q: string) => ({ matches: q.includes('reduce') && reduce }) as MediaQueryList; // justified: minimal MediaQueryList stand-in for the test
    let reduce = false;
    expect(handleLeaveMs()).toBe(HANDLE_LEAVE_MS);
    reduce = true;
    expect(handleLeaveMs()).toBe(0);
    // justified: removing the stand-in to model an environment without matchMedia
    (window as any).matchMedia = undefined; // justified: models jsdom, which has no matchMedia
    expect(handleLeaveMs()).toBe(0);
  });
});
