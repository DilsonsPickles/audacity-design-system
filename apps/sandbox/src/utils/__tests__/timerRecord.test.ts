import { describe, it, expect } from 'vitest';
import {
  applyTimerEdit, timerRecordValidation, formatCountdown, timerRecordStatusText,
  localDateString, localSecondsOfDay, parseLocalDate, combineLocal, localMidnight, defaultTimerSchedule,
} from '../timerRecord';

describe('Timer Record rules (2026-10-19)', () => {
  const t0 = new Date(2026, 9, 19, 11, 14, 34).getTime(); // 19/10/2026 11:14:34 local
  const hour = 3600_000;

  it("couples the three fields by Audacity 3's rule: start carries end, end sets duration, duration sets end", () => {
    const times = { startAt: t0, endAt: t0 + hour };
    expect(applyTimerEdit(times, 'start', t0 + 10 * 60_000)).toEqual({ startAt: t0 + 10 * 60_000, endAt: t0 + 10 * 60_000 + hour });
    expect(applyTimerEdit(times, 'end', t0 + 2 * hour)).toEqual({ startAt: t0, endAt: t0 + 2 * hour });
    expect(applyTimerEdit(times, 'duration', 30 * 60_000)).toEqual({ startAt: t0, endAt: t0 + 30 * 60_000 });
    // End never precedes start
    expect(applyTimerEdit(times, 'end', t0 - hour).endAt).toBe(t0);
    expect(applyTimerEdit(times, 'duration', -5).endAt).toBe(t0);
  });

  it('refuses an end at or before the start', () => {
    expect(timerRecordValidation({ startAt: t0, endAt: t0 + 1 })).toBeNull();
    expect(timerRecordValidation({ startAt: t0, endAt: t0 })).toBe('The end must be after the start');
    expect(timerRecordValidation({ startAt: t0, endAt: NaN })).toBe('Enter a valid date and time');
  });

  it('formats the countdown as m:ss, h:mm:ss above an hour, rounding up so the last second is 0:01', () => {
    expect(formatCountdown(134_000)).toBe('2:14');
    expect(formatCountdown(2530_000)).toBe('42:10');
    expect(formatCountdown(3734_000)).toBe('1:02:14');
    expect(formatCountdown(400)).toBe('0:01');
    expect(formatCountdown(-5000)).toBe('0:00');
  });

  it('says what the bar shows: starts in… while armed, ends in… while recording, nothing idle', () => {
    const s = defaultTimerSchedule(t0);
    expect(timerRecordStatusText('idle', s, t0)).toBeNull();
    expect(timerRecordStatusText('armed', null, t0)).toBeNull();
    expect(timerRecordStatusText('armed', s, t0 - 134_000)).toBe('Recording starts in 2:14');
    expect(timerRecordStatusText('recording', s, t0 + hour - 2530_000)).toBe('Recording ends in 42:10');
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
