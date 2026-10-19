import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { toast } from '@audacity-ui/components';
import { useTimerRecord } from '../useTimerRecord';
import { defaultTimerSchedule } from '../../utils/timerRecord';

afterEach(cleanup);
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useTimerRecord (2026-10-19): armed → recording → idle, the bar told at each step', () => {
  it('arms, starts the recording at the start and stops it at the end', async () => {
    let t = 1_000_000;
    const now = () => t;
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: onStart, onStopRecording: onStop, now }), { initialProps: { isRecording: false } });
    expect(result.current.isArmed).toBe(false);

    const s = { ...defaultTimerSchedule(t + 134_000), endAt: t + 134_000 + 60_000 };
    act(() => { result.current.arm(s); });
    expect(result.current.isArmed).toBe(true);
    expect(onStart).not.toHaveBeenCalled();

    t += 134_000;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('recording');
    expect(result.current.isArmed).toBe(false);
    rerender({ isRecording: true });

    t += 60_000;
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('idle');
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

  it('startNow collapses the wait: the recording begins at once and the end stays as scheduled', async () => {
    let t = 0;
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: onStart, onStopRecording: onStop, now: () => t }), { initialProps: { isRecording: false } });
    act(() => { result.current.arm({ ...defaultTimerSchedule(t + 600_000), endAt: t + 660_000 }); });
    expect(result.current.isArmed).toBe(true);
    act(() => { result.current.startNow(); });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('recording');
    rerender({ isRecording: true });
    t = 660_000;
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('idle');
  });

  it('completion stops, waits for the host to settle, runs the host\'s actions and toasts the recorded length plus what the host did', async () => {
    const success = vi.spyOn(toast, 'success');
    try {
      let t = 0;
      const order: string[] = [];
      const onStop = vi.fn(async () => { order.push('stop'); });
      const onComplete = vi.fn(async () => { order.push('complete'); return ['Project saved to your downloads', 'Exported show.wav to your downloads']; });
      const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: () => {}, onStopRecording: onStop, onComplete, now: () => t }), { initialProps: { isRecording: false } });
      act(() => { result.current.arm({ ...defaultTimerSchedule(t), endAt: t + 1_800_000, saveProject: true, exportAudio: true }); });
      act(() => { vi.advanceTimersByTime(1000); });
      rerender({ isRecording: true });
      t = 1_800_000;
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { vi.advanceTimersByTime(10); });
      expect(order).toEqual(['stop', 'complete']);
      expect(success).toHaveBeenCalledTimes(1);
      expect(success.mock.calls[0][0]).toBe('Timed recording complete');
      expect(success.mock.calls[0][1]).toBe('Recorded 0h 30m 00s\nProject saved to your downloads\nExported show.wav to your downloads');
    } finally {
      success.mockRestore();
    }
  });

  it('a failing action becomes an error toast that still says what was recorded', async () => {
    const error = vi.spyOn(toast, 'error');
    try {
      let t = 0;
      const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: () => {}, onStopRecording: () => {}, onComplete: async () => { throw new Error('No audio clips to mix down'); }, now: () => t }), { initialProps: { isRecording: false } });
      act(() => { result.current.arm({ ...defaultTimerSchedule(t), endAt: t + 60_000, exportAudio: true }); });
      act(() => { vi.advanceTimersByTime(1000); });
      rerender({ isRecording: true });
      t = 60_000;
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { vi.advanceTimersByTime(10); });
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][1]).toBe('Recorded 0h 01m 00s\nNo audio clips to mix down');
    } finally {
      error.mockRestore();
    }
  });

  it('stopNow while recording ends it early and runs the completion; it does nothing while armed', async () => {
    const success = vi.spyOn(toast, 'success');
    try {
      let t = 0;
      const onStop = vi.fn();
      const { result, rerender } = renderHook(({ isRecording }) => useTimerRecord({ isRecording, onStartRecording: () => {}, onStopRecording: onStop, now: () => t }), { initialProps: { isRecording: false } });
      act(() => { result.current.arm({ ...defaultTimerSchedule(t + 60_000), endAt: t + 3_660_000 }); });
      act(() => { result.current.stopNow(); });
      expect(result.current.phase).toBe('armed');
      t = 60_000;
      act(() => { vi.advanceTimersByTime(1000); });
      rerender({ isRecording: true });
      t = 60_000 + 600_000;
      act(() => { vi.advanceTimersByTime(1000); });
      await act(async () => { result.current.stopNow(); });
      await act(async () => { vi.advanceTimersByTime(10); });
      expect(onStop).toHaveBeenCalledTimes(1);
      expect(result.current.phase).toBe('idle');
      expect(success.mock.calls[0][1]).toBe('Recorded 0h 10m 00s');
    } finally {
      success.mockRestore();
    }
  });
});
