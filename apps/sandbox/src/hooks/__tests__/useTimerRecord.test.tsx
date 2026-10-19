import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useTimerRecord } from '../useTimerRecord';
import { defaultTimerSchedule } from '../../utils/timerRecord';

afterEach(cleanup);
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useTimerRecord (2026-10-19): armed → recording → idle, the bar told at each step', () => {
  it('arms, counts down on the bar, starts the recording at the start and stops it at the end', () => {
    let t = 1_000_000;
    const now = () => t;
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: onStart, onStopRecording: onStop, now }), { initialProps: { isRecording: false } });
    expect(result.current.isArmed).toBe(false);
    expect(result.current.statusText).toBeNull();

    const s = { ...defaultTimerSchedule(t + 134_000), endAt: t + 134_000 + 60_000 };
    act(() => { result.current.arm(s); });
    expect(result.current.isArmed).toBe(true);
    expect(result.current.statusText).toBe('Recording starts in 2:14');
    expect(onStart).not.toHaveBeenCalled();

    t += 134_000;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('recording');
    expect(result.current.isArmed).toBe(false);
    expect(result.current.statusText).toBe('Recording ends in 1:00');
    rerender({ isRecording: true });

    t += 60_000;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('idle');
    expect(result.current.statusText).toBeNull();
    expect(result.current.lastSchedule).toEqual(s);
  });

  it('Stop while armed cancels; a recording stopped by hand ends the timer without a second stop', () => {
    let t = 0;
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: onStart, onStopRecording: onStop, now: () => t }), { initialProps: { isRecording: false } });
    act(() => { result.current.arm({ ...defaultTimerSchedule(t + 10_000), endAt: t + 70_000 }); });
    act(() => { result.current.cancel(); });
    expect(result.current.phase).toBe('idle');
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(onStart).not.toHaveBeenCalled();

    act(() => { result.current.arm({ ...defaultTimerSchedule(t), endAt: t + 70_000 }); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onStart).toHaveBeenCalledTimes(1);
    rerender({ isRecording: true });
    rerender({ isRecording: false }); // the user pressed Stop
    expect(result.current.phase).toBe('idle');
    expect(onStop).not.toHaveBeenCalled();
  });
});
