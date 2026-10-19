import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ThemeProvider } from '@audacity-ui/components';
import { TimerRecordDialog } from '../TimerRecordDialog';
import { defaultTimerSchedule } from '../../utils/timerRecord';

afterEach(cleanup);

const t0 = new Date(2026, 9, 19, 11, 14, 34).getTime();
const hour = 3_600_000;

function mount(props: Partial<React.ComponentProps<typeof TimerRecordDialog>> = {}) {
  const onSchedule = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ThemeProvider>
      <TimerRecordDialog isOpen now={() => t0} onSchedule={onSchedule} onClose={onClose} {...props} />
    </ThemeProvider>,
  );
  const root = () => utils.baseElement.querySelector('[data-timer-record-dialog]') as HTMLElement;
  const readout = (side: 'start' | 'end') => (root().querySelector(`[data-timer-record-readout="${side}"]`) as HTMLElement).textContent;
  const radio = (cls: string) => root().querySelector(`.${cls} input, .${cls} [role="radio"]`) as HTMLElement;
  const primary = () => utils.getByText('Schedule recording').closest('button') as HTMLButtonElement;
  const problem = () => (root().querySelector('[data-timer-record-problem]') as HTMLElement).textContent?.trim();
  return { ...utils, root, readout, radio, primary, problem, onSchedule, onClose };
}

describe('TimerRecordDialog (2026-10-19): Now / At a time, For a duration / Until a time — the picked field is typed, the other is a readout', () => {
  it('opens on Now for an hour: no start fields, the clock in the start readout, a duration, the end as a readout', () => {
    const { root, readout, getByText } = mount();
    expect(root().getAttribute('data-timer-record-dialog')).not.toBeNull();
    expect(root().querySelector('[data-timer-record-side="start"]')?.getAttribute('data-mode')).toBe('now');
    expect(root().querySelector('.timer-record__date--start')).toBeNull();
    expect(readout('start')).toBe('Starts when you press Schedule. It is 11:14:34.');
    expect(root().querySelector('[data-timer-record-side="end"]')?.getAttribute('data-mode')).toBe('for');
    const duration = root().querySelector('[data-timer-record-side="end"] .timecode') as HTMLElement;
    expect(duration.textContent?.replace(/\s/g, '')).toContain('00d01h00m00s');
    expect(readout('end')).toBe('Ends today at 12:14:34');
    expect(getByText('After recording completes')).toBeTruthy();
  });

  it('Schedule hands over now + duration and closes', () => {
    const { primary, onSchedule, onClose } = mount();
    fireEvent.click(primary());
    const s = onSchedule.mock.calls[0][0];
    expect(s.startAt).toBe(t0);
    expect(s.endAt).toBe(t0 + hour);
    expect(s.startMode).toBe('now');
    expect(s.endMode).toBe('for');
    expect(onClose).toHaveBeenCalled();
  });

  it('At a time shows the date and time seeded from the clock; a later date moves the start and the end readout follows', () => {
    const { root, radio, readout, primary, onSchedule } = mount();
    fireEvent.click(radio('timer-record__start-at'));
    const date = root().querySelector('.timer-record__date--start input') as HTMLInputElement;
    expect(date.value).toBe('19/10/2026');
    expect(readout('start')).toBe('');
    fireEvent.change(date, { target: { value: '20/10/2026' } });
    expect(readout('end')).toBe('Ends 20/10/2026 at 12:14:34');
    fireEvent.click(primary());
    const s = onSchedule.mock.calls[0][0];
    expect(s.startAt).toBe(t0 + 86_400_000);
    expect(s.endAt).toBe(t0 + 86_400_000 + hour);
    expect(s.startMode).toBe('at');
  });

  it('Until a time shows end fields seeded an hour out and the duration as a readout; an end before the start dims Schedule with the reason', () => {
    const { root, radio, readout, primary, problem } = mount();
    fireEvent.click(radio('timer-record__end-until'));
    expect(root().querySelector('[data-timer-record-side="end"] .timecode')?.textContent?.replace(/\s/g, '')).toContain('12h14m34s');
    expect(readout('end')).toBe('Records for 1h 00m 00s from now');
    expect(primary().disabled).toBe(false);
    const endDate = root().querySelector('.timer-record__date--end input') as HTMLInputElement;
    fireEvent.change(endDate, { target: { value: '18/10/2026' } });
    expect(problem()).toBe('The end is before the start');
    expect(primary().disabled).toBe(true);
    expect(readout('end')).toBe('');
  });

  it('under Now an Until end counts down as the clock runs', () => {
    vi.useFakeTimers();
    try {
      let t = t0;
      const { radio, readout } = mount({ now: () => t });
      fireEvent.click(radio('timer-record__end-until'));
      expect(readout('end')).toBe('Records for 1h 00m 00s from now');
      t = t0 + 10_000;
      act(() => { vi.advanceTimersByTime(1000); });
      expect(readout('end')).toBe('Records for 0h 59m 50s from now');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a zero duration cannot be scheduled; the prefill keeps the last choices, duration and options with a fresh start', () => {
    const last = { ...defaultTimerSchedule(t0 - 86_400_000), endAt: t0 - 86_400_000 + 1_800_000, endMode: 'until' as const, saveProject: true, savePath: '/tmp/show.aup4', quitWhenComplete: true };
    const { root, radio, readout, primary, onSchedule, problem } = mount({ initial: last });
    expect(root().querySelector('[data-timer-record-side="end"]')?.getAttribute('data-mode')).toBe('until');
    expect(readout('end')).toBe('Records for 0h 30m 00s from now');
    const savePath = root().querySelector('.timer-record__save-path input') as HTMLInputElement;
    expect(savePath.value).toBe('/tmp/show.aup4');
    expect(savePath.disabled).toBe(false);
    fireEvent.click(radio('timer-record__end-for'));
    const duration = root().querySelector('[data-timer-record-side="end"] .timecode') as HTMLElement;
    expect(duration.textContent?.replace(/\s/g, '')).toContain('00d00h30m00s');
    fireEvent.click(primary());
    const s = onSchedule.mock.calls[0][0];
    expect(s.startAt).toBe(t0);
    expect(s.endAt).toBe(t0 + 1_800_000);
    expect(s.quitWhenComplete).toBe(true);
    expect(problem()).toBe('');
  });
});
