import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ThemeProvider } from '@audacity-ui/components';
import { TimerRecordDialog } from '../TimerRecordDialog';
import { defaultTimerSchedule } from '../../utils/timerRecord';

afterEach(cleanup);

const t0 = new Date(2026, 9, 19, 11, 14, 34).getTime();

function mount(props: Partial<React.ComponentProps<typeof TimerRecordDialog>> = {}) {
  const onSchedule = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ThemeProvider>
      <TimerRecordDialog isOpen now={t0} onSchedule={onSchedule} onClose={onClose} {...props} />
    </ThemeProvider>,
  );
  const dates = () => Array.from(utils.baseElement.querySelectorAll('.timer-record__date input')) as HTMLInputElement[];
  const primary = () => utils.getByText('Schedule recording').closest('button') as HTMLButtonElement;
  return { ...utils, dates, primary, onSchedule, onClose };
}

describe('TimerRecordDialog (2026-10-19, the Figma "Timer record" window)', () => {
  it('opens on now for an hour: start and end dates, the times, a 1h duration, nothing automatic, Quit disabled', () => {
    const { baseElement, dates, getByText } = mount();
    expect(getByText('Start recording')).toBeTruthy();
    expect(getByText('End recording')).toBeTruthy();
    expect(dates().map((i) => i.value)).toEqual(['19/10/2026', '19/10/2026']);
    const timecodes = Array.from(baseElement.querySelectorAll('.timecode')).map((el) => el.textContent?.replace(/\s/g, ''));
    expect(timecodes[0]).toContain('11h14m34s');
    expect(timecodes[1]).toContain('12h14m34s');
    expect(timecodes[2]).toContain('00d01h00m00s');
    const quit = baseElement.querySelector('.timer-record__quit .checkbox, .timer-record__quit [role="checkbox"], .timer-record__quit input') as HTMLElement;
    expect(quit).toBeTruthy();
    expect(getByText('Schedule recording')).toBeTruthy();
  });

  it('a later start date carries the end with it; Schedule recording hands over the schedule and closes', () => {
    const { dates, primary, onSchedule, onClose } = mount();
    fireEvent.change(dates()[0], { target: { value: '20/10/2026' } });
    expect(dates()[1].value).toBe('20/10/2026');
    fireEvent.click(primary());
    expect(onSchedule).toHaveBeenCalledTimes(1);
    const s = onSchedule.mock.calls[0][0];
    expect(s.startAt).toBe(t0 + 86_400_000);
    expect(s.endAt).toBe(t0 + 86_400_000 + 3_600_000);
    expect(s.saveProject).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('an invalid date is marked and does not move the time; Cancel closes without scheduling', () => {
    const { dates, baseElement, getByText, onSchedule, onClose } = mount();
    fireEvent.change(dates()[0], { target: { value: '31/02/2026' } });
    expect(baseElement.querySelector('.timer-record__date--start[class*="error"]')).toBeTruthy();
    expect(dates()[1].value).toBe('19/10/2026');
    fireEvent.click(getByText('Cancel'));
    expect(onSchedule).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('prefills the last schedule\'s duration and options with a fresh start; the path fields follow their checkboxes', () => {
    const last = { ...defaultTimerSchedule(t0 - 86_400_000), endAt: t0 - 86_400_000 + 1_800_000, saveProject: true, savePath: '/tmp/show.aup4', quitWhenComplete: true };
    const { baseElement, primary, onSchedule } = mount({ initial: last });
    const timecodes = Array.from(baseElement.querySelectorAll('.timecode')).map((el) => el.textContent?.replace(/\s/g, ''));
    expect(timecodes[2]).toContain('00d00h30m00s');
    const savePath = baseElement.querySelector('.timer-record__save-path input') as HTMLInputElement;
    expect(savePath.value).toBe('/tmp/show.aup4');
    expect(savePath.disabled).toBe(false);
    const exportPath = baseElement.querySelector('.timer-record__export-path input') as HTMLInputElement;
    expect(exportPath.disabled).toBe(true);
    fireEvent.click(primary());
    const s = onSchedule.mock.calls[0][0];
    expect(s.startAt).toBe(t0);
    expect(s.endAt).toBe(t0 + 1_800_000);
    expect(s.saveProject).toBe(true);
    expect(s.quitWhenComplete).toBe(true);
  });
});
