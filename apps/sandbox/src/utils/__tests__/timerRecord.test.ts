import { describe, it, expect } from 'vitest';
import {
  resolveTimerTimes, timerRecordValidation, formatDurationText, formatCountdown, timerRecordStatusText,
  localDateString, localSecondsOfDay, parseLocalDate, combineLocal, localMidnight, defaultTimerSchedule,
} from '../timerRecord';

describe('Timer Record rules (2026-10-19)', () => {
  const t0 = new Date(2026, 9, 19, 11, 14, 34).getTime(); // 19/10/2026 11:14:34 local
  const hour = 3600_000;

  it('resolves the two choices into a start and an end: Now follows the clock, For adds to the start, Until is typed', () => {
    const base = { startMode: 'now' as const, startAt: t0 - hour, endMode: 'for' as const, durationMs: hour, endAt: t0 + 3 * hour };
    expect(resolveTimerTimes(base, t0)).toEqual({ startAt: t0, endAt: t0 + hour });
    expect(resolveTimerTimes({ ...base, startMode: 'at' }, t0)).toEqual({ startAt: t0 - hour, endAt: t0 });
    expect(resolveTimerTimes({ ...base, endMode: 'until' }, t0)).toEqual({ startAt: t0, endAt: t0 + 3 * hour });
    // Under Now an Until end gets shorter as the clock runs
    expect(resolveTimerTimes({ ...base, endMode: 'until' }, t0 + hour).endAt - (t0 + hour)).toBe(2 * hour);
  });

  it('refuses an empty duration, an end before the start, and unreadable dates', () => {
    const base = { startMode: 'now' as const, startAt: t0, endMode: 'for' as const, durationMs: hour, endAt: t0 + hour };
    expect(timerRecordValidation(base, t0)).toBeNull();
    expect(timerRecordValidation({ ...base, durationMs: 0 }, t0)).toBe('Set a duration');
    expect(timerRecordValidation({ ...base, endMode: 'until', endAt: t0 - 1 }, t0)).toBe('The end is before the start');
    expect(timerRecordValidation({ ...base, startMode: 'at', startAt: NaN }, t0)).toBe('Enter a valid start date and time');
    expect(timerRecordValidation({ ...base, endMode: 'until', endAt: NaN }, t0)).toBe('Enter a valid end date and time');
  });

  it('formats the duration readout', () => {
    expect(formatDurationText(hour)).toBe('1h 00m 00s');
    expect(formatDurationText(2530_000)).toBe('0h 42m 10s');
  });

  it('formats the countdown as m:ss, h:mm:ss above an hour, rounding up so the last second is 0:01', () => {
    expect(formatCountdown(134_000)).toBe('2:14');
    expect(formatCountdown(2530_000)).toBe('42:10');
    expect(formatCountdown(3734_000)).toBe('1:02:14');
    expect(formatCountdown(400)).toBe('0:01');
    expect(formatCountdown(-5000)).toBe('0:00');
  });

  it('says what the bar shows: the countdown leads under an hour, the clock time over it; nothing idle', () => {
    const s = defaultTimerSchedule(t0); // starts 11:14:34, ends 12:14:34
    expect(timerRecordStatusText('idle', s, t0)).toBeNull();
    expect(timerRecordStatusText('armed', null, t0)).toBeNull();
    expect(timerRecordStatusText('armed', s, t0 - 134_000)).toBe('Recording starts in 2:14 (at 11:14:34)');
    expect(timerRecordStatusText('armed', s, t0 - 9 * hour - 2530_000)).toBe('Recording starts at 11:14:34 (in 9:42:10)');
    expect(timerRecordStatusText('recording', s, t0 + hour - 2530_000)).toBe('Recording ends in 42:10 (at 12:14:34)');
    expect(timerRecordStatusText('recording', s, t0)).toBe('Recording ends at 12:14:34 (in 1:00:00)');
  });

  it('splits and rejoins a local date and time of day', () => {
    expect(localDateString(t0)).toBe('19/10/2026');
    expect(localSecondsOfDay(t0)).toBe(11 * 3600 + 14 * 60 + 34);
    expect(parseLocalDate('19/10/2026')).toBe(localMidnight(t0));
    expect(parseLocalDate('1/1/2027')).toBe(new Date(2027, 0, 1).getTime());
    expect(parseLocalDate('31/02/2026')).toBeNull();
    expect(parseLocalDate('2026-10-19')).toBeNull();
    expect(combineLocal(localMidnight(t0), localSecondsOfDay(t0))).toBe(t0);
  });

  it('defaults to starting now for an hour, with nothing automatic', () => {
    const s = defaultTimerSchedule(t0);
    expect(s.startAt).toBe(t0);
    expect(s.endAt).toBe(t0 + hour);
    expect(s.saveProject).toBe(false);
    expect(s.exportAudio).toBe(false);
    expect(s.quitWhenComplete).toBe(false);
  });
});
