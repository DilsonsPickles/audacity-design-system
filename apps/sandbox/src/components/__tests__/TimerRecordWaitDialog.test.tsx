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
      <ThemeProvider><TimerRecordWaitDialog schedule={s} now={t0 - 134_000} onStartNow={onStartNow} onCancel={onCancel} /></ThemeProvider>,
    );
    expect(getByText('Waiting to start recording')).toBeTruthy();
    expect(baseElement.querySelector('[data-timer-record-countdown]')?.textContent).toBe('2:14');
    expect(getByText('Starts at 14:00:00 · ends at 15:00:00')).toBeTruthy();
    fireEvent.click(getByText('Start now'));
    expect(onStartNow).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    rerender(<ThemeProvider><TimerRecordWaitDialog schedule={null} now={t0} onStartNow={onStartNow} onCancel={onCancel} /></ThemeProvider>);
    expect(baseElement.querySelector('[data-timer-record-wait]')).toBeNull();
  });
});
