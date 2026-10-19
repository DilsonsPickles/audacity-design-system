/**
 * Timer Record — the pure rules (2026-10-19, after the Timer record design
 * review: "build it and we can address the issues").
 *
 * A timed recording is a ONE-SHOT FLOW, not a mode: the dialog arms the
 * recorder with a start, an end and what to do when it completes; the
 * app waits, records, and is back to idle. Nothing here is a preference.
 *
 * The three time fields are COUPLED by Audacity 3's rule (applyTimerEdit):
 * editing START carries END with it (the duration holds), editing END sets
 * the duration, editing DURATION sets END. End never precedes start.
 *
 * Times are epoch milliseconds; the dialog splits them into a LOCAL date
 * ("dd/mm/yyyy") and seconds since local midnight for its fields.
 */

export interface TimerRecordSchedule {
  /** Epoch ms */
  startAt: number;
  /** Epoch ms, after startAt */
  endAt: number;
  saveProject: boolean;
  savePath: string;
  exportAudio: boolean;
  exportPath: string;
  quitWhenComplete: boolean;
}

export type TimerRecordPhase = 'idle' | 'armed' | 'recording';

export type TimerField = 'start' | 'end' | 'duration';

export const DEFAULT_TIMER_DURATION_MS = 60 * 60 * 1000;
export const DEFAULT_SAVE_PATH = 'User/Documents/AudacityProjects/CurrentSavedProject.aup4';
export const DEFAULT_EXPORT_PATH = 'User/Documents/AudacityExports/CurrentSavedProject.wav';

export const defaultTimerSchedule = (now: number): TimerRecordSchedule => ({
  startAt: now,
  endAt: now + DEFAULT_TIMER_DURATION_MS,
  saveProject: false,
  savePath: DEFAULT_SAVE_PATH,
  exportAudio: false,
  exportPath: DEFAULT_EXPORT_PATH,
  quitWhenComplete: false,
});

/** The coupling rule: which field was edited decides what else moves */
export function applyTimerEdit(
  times: { startAt: number; endAt: number },
  field: TimerField,
  value: number,
): { startAt: number; endAt: number } {
  switch (field) {
    case 'start': {
      const duration = Math.max(0, times.endAt - times.startAt);
      return { startAt: value, endAt: value + duration };
    }
    case 'end':
      return { startAt: times.startAt, endAt: Math.max(value, times.startAt) };
    case 'duration':
      return { startAt: times.startAt, endAt: times.startAt + Math.max(0, value) };
  }
}

/** Why the schedule cannot be armed, or null when it can */
export function timerRecordValidation(times: { startAt: number; endAt: number }): string | null {
  if (!Number.isFinite(times.startAt) || !Number.isFinite(times.endAt)) return 'Enter a valid date and time';
  if (times.endAt <= times.startAt) return 'The end must be after the start';
  return null;
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

/** The status bar's line while a timed recording is live; null when idle */
export function timerRecordStatusText(phase: TimerRecordPhase, schedule: TimerRecordSchedule | null, now: number): string | null {
  if (!schedule || phase === 'idle') return null;
  if (phase === 'armed') return `Recording starts in ${formatCountdown(schedule.startAt - now)}`;
  return `Recording ends in ${formatCountdown(schedule.endAt - now)}`;
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
