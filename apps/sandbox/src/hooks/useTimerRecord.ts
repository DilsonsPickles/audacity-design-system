/**
 * useTimerRecord — the armed recorder (2026-10-19).
 *
 * The Timer record dialog hands over a schedule; this hook keeps the
 * PHASE — idle → armed → recording → idle — ticks once a second while it
 * is live, starts the recording at `startAt` through the host's own
 * Record, stops it at `endAt` through the host's own Stop, and then runs
 * the completion actions (save / export / quit — toasts in the
 * prototype). THE STATE SHOWS ON THE BAR, not in a panel ("The Record
 * button in an armed look, and a line in the status bar reading
 * 'Recording starts in 2:14' — this is exactly what I wanted to do"):
 * `isArmed` for the Record button and `statusText` for the status bar.
 * Stop cancels either phase; a recording the user stops by any other
 * means ends the timer too.
 *
 * The last schedule is remembered for the dialog's next open (the
 * duration and the completion options, with a fresh start), as
 * Audacity 3 remembers them.
 */
import React from 'react';
import { toast } from '@audacity-ui/components';
import {
  type TimerRecordSchedule, type TimerRecordPhase, timerRecordStatusText, clockTime,
} from '../utils/timerRecord';

export interface UseTimerRecordOptions {
  /** The host's live recording flag — a recording stopped by hand ends the timer */
  isRecording: boolean;
  onStartRecording: () => void | Promise<void>;
  onStopRecording: () => void | Promise<void>;
  /** The clock (tests) */
  now?: () => number;
  /** The tick in ms (tests) */
  tickMs?: number;
}

export interface UseTimerRecordReturn {
  phase: TimerRecordPhase;
  schedule: TimerRecordSchedule | null;
  /** The schedule last armed — the dialog's prefill */
  lastSchedule: TimerRecordSchedule | null;
  /** The Record button's armed look: waiting for the start */
  isArmed: boolean;
  /** The status bar's line, null when idle */
  statusText: string | null;
  arm: (schedule: TimerRecordSchedule) => void;
  /** A press on the armed Record button: skip the wait, record now — the end stays as scheduled */
  startNow: () => void;
  cancel: () => void;
}

export function useTimerRecord({ isRecording, onStartRecording, onStopRecording, now = () => Date.now(), tickMs = 1000 }: UseTimerRecordOptions): UseTimerRecordReturn {
  const [phase, setPhase] = React.useState<TimerRecordPhase>('idle');
  const [schedule, setSchedule] = React.useState<TimerRecordSchedule | null>(null);
  const [lastSchedule, setLastSchedule] = React.useState<TimerRecordSchedule | null>(null);
  const [clock, setClock] = React.useState(() => now());
  const startRef = React.useRef(onStartRecording);
  const stopRef = React.useRef(onStopRecording);
  React.useEffect(() => { startRef.current = onStartRecording; }, [onStartRecording]);
  React.useEffect(() => { stopRef.current = onStopRecording; }, [onStopRecording]);
  const nowRef = React.useRef(now);
  React.useEffect(() => { nowRef.current = now; }, [now]);
  /** Whether the host's recording was seen running during the recording phase */
  const sawRecordingRef = React.useRef(false);

  // The tick, while live
  React.useEffect(() => {
    if (phase === 'idle') return;
    setClock(nowRef.current());
    const id = window.setInterval(() => setClock(nowRef.current()), tickMs);
    return () => window.clearInterval(id);
  }, [phase, tickMs]);

  const complete = React.useCallback((s: TimerRecordSchedule) => {
    setPhase('idle');
    setSchedule(null);
    const done: string[] = [];
    if (s.saveProject) done.push(`Project saved to ${s.savePath}`);
    if (s.exportAudio) done.push(`Audio exported to ${s.exportPath}`);
    if (s.quitWhenComplete) done.push('Audacity would quit now');
    toast.info('Timed recording complete', done.length ? done.join(' · ') : undefined);
  }, []);

  // The phase machine, driven by the clock
  React.useEffect(() => {
    if (!schedule) return;
    if (phase === 'armed' && clock >= schedule.startAt) {
      setPhase('recording');
      sawRecordingRef.current = false;
      void startRef.current();
    } else if (phase === 'recording' && clock >= schedule.endAt) {
      void stopRef.current();
      complete(schedule);
    }
  }, [phase, schedule, clock, complete]);

  // A recording the user stopped by hand ends the timer
  React.useEffect(() => {
    if (phase !== 'recording' || !schedule) return;
    if (isRecording) { sawRecordingRef.current = true; return; }
    if (sawRecordingRef.current) complete(schedule);
  }, [isRecording, phase, schedule, complete]);

  const cancel = React.useCallback(() => {
    setPhase('idle');
    setSchedule(null);
  }, []);

  // THE ARM TOAST (2026-10-19, "so we don't get a toast when it's
  // scheduled?"): the EVENT — the dialog closed and something must say it
  // worked — with Cancel to hand; the countdown itself is STATE and stays
  // on the bar, never in a toast (a toast is dismissed and then there is
  // nothing). The completion toast brackets the other end.
  const arm = React.useCallback((s: TimerRecordSchedule) => {
    setSchedule(s);
    setLastSchedule(s);
    sawRecordingRef.current = false;
    setPhase('armed');
    const t = nowRef.current();
    const id = toast.info(
      'Recording scheduled',
      s.startAt <= t ? `Starts now, ends at ${clockTime(s.endAt)}` : `Starts at ${clockTime(s.startAt)}, ends at ${clockTime(s.endAt)}`,
      [{ label: 'Cancel', onClick: () => { cancel(); toast.dismiss(id); } }],
    );
  }, [cancel]);

  // START NOW (2026-10-19, with the clock glyph): the armed button's press
  // collapses the wait — the schedule's start becomes now, the end holds,
  // and the clock effect above starts the recording on its next tick
  const startNow = React.useCallback(() => {
    const t = nowRef.current();
    setSchedule((s) => (s ? { ...s, startAt: Math.min(s.startAt, t) } : s));
    setClock(t);
  }, []);

  return {
    phase,
    schedule,
    lastSchedule,
    isArmed: phase === 'armed',
    statusText: timerRecordStatusText(phase, schedule, clock),
    arm,
    startNow,
    cancel,
  };
}
