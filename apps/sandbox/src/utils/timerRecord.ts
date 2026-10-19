/**
 * Timer Record — the pure rules (2026-10-19, after the Timer record design
 * review: "build it and we can address the issues"; the START and END
 * CHOICES the same day, "how do we set a precise end time?" → "let me see
 * the mock" → "build it into the prototype").
 *
 * A timed recording is a ONE-SHOT FLOW, not a mode: the dialog arms the
 * recorder with a start, an end and what to do when it completes; the
 * app waits, records, and is back to idle. Nothing here is a preference.
 *
 * THE START IS A CHOICE — NOW, or AT A TIME — and so is THE END — FOR A
 * DURATION, or UNTIL A TIME. Whichever is picked is the field that is
 * typed; the other is a READOUT. That replaces Audacity 3's three coupled
 * fields (where the last keystroke decided what moved) with a stated
 * driver: `resolveTimerTimes` turns the choices into a start and an end,
 * and under NOW the derived side moves with the clock (an "until" end
 * gets shorter the longer you wait to press Schedule).
 *
 * Times are epoch milliseconds; the dialog splits them into a LOCAL date
 * ("dd/mm/yyyy") and seconds since local midnight for its fields.
 */

export type TimerStartMode = 'now' | 'at';
export type TimerEndMode = 'for' | 'until';

export interface TimerRecordSchedule {
  /** Epoch ms */
  startAt: number;
  /** Epoch ms, after startAt */
  endAt: number;
  /** How the start was chosen (the dialog reopens on the same choice); 'now' when unsaid */
  startMode?: TimerStartMode;
  /** How the end was chosen; 'for' when unsaid */
  endMode?: TimerEndMode;
  saveProject: boolean;
  savePath: string;
  exportAudio: boolean;
  exportPath: string;
  quitWhenComplete: boolean;
}

export type TimerRecordPhase = 'idle' | 'armed' | 'recording';

export const DEFAULT_TIMER_DURATION_MS = 60 * 60 * 1000;
export const DEFAULT_SAVE_PATH = 'User/Documents/AudacityProjects/CurrentSavedProject.aup4';
export const DEFAULT_EXPORT_PATH = 'User/Documents/AudacityExports/CurrentSavedProject.wav';

export const defaultTimerSchedule = (now: number): TimerRecordSchedule => ({
  startAt: now,
  endAt: now + DEFAULT_TIMER_DURATION_MS,
  startMode: 'now',
  endMode: 'for',
  saveProject: false,
  savePath: DEFAULT_SAVE_PATH,
  exportAudio: false,
  exportPath: DEFAULT_EXPORT_PATH,
  quitWhenComplete: false,
});

/** What the dialog holds: the two choices and the three values behind them */
export interface TimerChoices {
  startMode: TimerStartMode;
  /** The typed start (epoch ms), read when startMode is 'at' */
  startAt: number;
  endMode: TimerEndMode;
  /** The typed duration (ms), read when endMode is 'for' */
  durationMs: number;
  /** The typed end (epoch ms), read when endMode is 'until' */
  endAt: number;
}

/** The choices → the start and end they mean at `now` */
export function resolveTimerTimes(c: TimerChoices, now: number): { startAt: number; endAt: number } {
  const startAt = c.startMode === 'now' ? now : c.startAt;
  const endAt = c.endMode === 'for' ? startAt + Math.max(0, c.durationMs) : c.endAt;
  return { startAt, endAt };
}

/** Why the choices cannot be armed, or null when they can */
export function timerRecordValidation(c: TimerChoices, now: number): string | null {
  if (c.startMode === 'at' && !Number.isFinite(c.startAt)) return 'Enter a valid start date and time';
  if (c.endMode === 'until' && !Number.isFinite(c.endAt)) return 'Enter a valid end date and time';
  if (c.endMode === 'for' && c.durationMs <= 0) return 'Set a duration';
  const { startAt, endAt } = resolveTimerTimes(c, now);
  if (endAt <= startAt) return 'The end is before the start';
  return null;
}

/** "1h 00m 00s" — the duration readout */
export function formatDurationText(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/** "2:14", "42:10", "1:02:14" — whole seconds, rounded up so the last
 *  second reads "0:01" rather than "0:00" while still waiting */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** "14:00:00" — the clock time, local */
export const clockTime = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

/** Under an hour the countdown leads; over it the clock time does
 *  (2026-10-19, "it would be great if I could see when the timer will
 *  start": "9:41:05" is a number nobody reads, "14:00" is what you check) */
const LEAD_WITH_COUNTDOWN_MS = 60 * 60 * 1000;

const whenLine = (verb: string, at: number, now: number): string => {
  const remaining = at - now;
  const countdown = formatCountdown(remaining);
  const time = clockTime(at);
  return remaining < LEAD_WITH_COUNTDOWN_MS
    ? `Recording ${verb} in ${countdown} (at ${time})`
    : `Recording ${verb} at ${time} (in ${countdown})`;
};

/** The status bar's line while a timed recording RUNS; null when idle —
 *  and null while armed, since the wait is behind the blocking dialog
 *  (2026-10-19, "do we remove the record arming?" — yes: a state nobody
 *  can see is not a state) */
export function timerRecordStatusText(phase: TimerRecordPhase, schedule: TimerRecordSchedule | null, now: number): string | null {
  if (!schedule || phase !== 'recording') return null;
  return whenLine('ends', schedule.endAt, now);
}

// ---- Local date / time splitting for the dialog's fields ----

export const localDateString = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const localSecondsOfDay = (ms: number): number => {
  const d = new Date(ms);
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
};

/** "dd/mm/yyyy" (also "d/m/yyyy") → a local midnight in epoch ms, or null */
export function parseLocalDate(text: string): number | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
}

/** A local date's midnight plus seconds of day → epoch ms */
export const combineLocal = (dateMidnight: number, secondsOfDay: number): number =>
  dateMidnight + Math.max(0, Math.min(86399, Math.floor(secondsOfDay))) * 1000;

/** The midnight of the day `ms` falls on, local time */
export const localMidnight = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
