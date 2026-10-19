import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '@audacity-ui/components';
import { TimerRecordWaitDialog } from '../TimerRecordWaitDialog';
import { defaultTimerSchedule } from '../../utils/timerRecord';

afterEach(cleanup);

describe('TimerRecordWaitDialog (2026-10-19): the block while a timed recording waits', () => {
  const t0 = new Date(2026, 9, 19, 14, 0, 0).getTime();

  it('shows the countdown and the clock times; Cancel and Start now call back; nothing when there is no schedule', () => {
    const onStartNow = vi.fn();
    const onCancel = vi.fn();
    const s = { ...defaultTimerSchedule(t0), endAt: t0 + 3_600_000 };
    const { baseElement, getByText, rerender } = render(
      <ThemeProvider><TimerRecordWaitDialog phase="armed" schedule={s} now={t0 - 134_000} onStartNow={onStartNow} onCancel={onCancel} onStop={() => {}} /></ThemeProvider>,
    );
    expect(getByText('Timed recording')).toBeTruthy();
    expect(getByText('Waiting to start')).toBeTruthy();
    expect(baseElement.querySelector('.dialog-header__close, [aria-label="Close"]')).toBeNull(); // no ×
    expect(baseElement.querySelector('[data-timer-record-countdown]')?.textContent).toBe('2:14');
    expect(getByText('Starts at 14:00:00 · ends at 15:00:00')).toBeTruthy();
    fireEvent.click(getByText('Start now'));
    expect(onStartNow).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    rerender(<ThemeProvider><TimerRecordWaitDialog phase="idle" schedule={null} now={t0} onStartNow={onStartNow} onCancel={onCancel} onStop={() => {}} /></ThemeProvider>);
    expect(baseElement.querySelector('[data-timer-record-wait]')).toBeNull();
  });

  it('while recording: the label reads Recording, the countdown runs to the end, and the one button is Stop', () => {
    const onStop = vi.fn();
    const s = { ...defaultTimerSchedule(t0), endAt: t0 + 3_600_000 };
    const { baseElement, getByText, queryByText } = render(
      <ThemeProvider><TimerRecordWaitDialog phase="recording" schedule={s} now={t0 + 3_600_000 - 2530_000} onStartNow={() => {}} onCancel={() => {}} onStop={onStop} /></ThemeProvider>,
    );
    expect(getByText('Recording')).toBeTruthy();
    expect(baseElement.querySelector('[data-timer-record-countdown]')?.textContent).toBe('42:10');
    expect(getByText('Started at 14:00:00 · ends at 15:00:00')).toBeTruthy();
    expect(queryByText('Cancel')).toBeNull();
    expect(queryByText('Start now')).toBeNull();
    fireEvent.click(getByText('Stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
