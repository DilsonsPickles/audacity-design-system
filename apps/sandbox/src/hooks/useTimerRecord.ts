/**
 * useTimerRecord — the armed recorder (2026-10-19).
 *
 * The Timer record dialog hands over a schedule; this hook keeps the
 * PHASE — idle → armed → recording → idle — ticks once a second while it
 * is live, starts the recording at `startAt` through the host's own
 * Record, stops it at `endAt` through the host's own Stop, and then runs
 * the completion actions (save / export / quit — toasts in the
 * prototype). THE WAIT IS BLOCKED by TimerRecordWaitDialog (2026-10-19,
 * "can we try a blocking dialog?" — the armed-bar model, with its target
 * track to defend, "is getting complex for little extra benefit"), which
 * reads this hook's `clock`, `phase` and `schedule` for BOTH phases (the
 * recording is blocked too, same day: "same dialog countdown style"); no
 * bar state remains — nothing could see it under the modal. Stop cancels either phase; a recording the user stops by any
 * other means ends the timer too.
 *
 * The last schedule is remembered for the dialog's next open (the
 * duration and the completion options, with a fresh start), as
 * Audacity 3 remembers them.
 */
import React from 'react';
import { toast } from '@audacity-ui/components';
import {
  type TimerRecordSchedule, type TimerRecordPhase, formatDurationText,
} from '../utils/timerRecord';

export interface UseTimerRecordOptions {
  /** The host's live recording flag — a recording stopped by hand ends the timer */
  isRecording: boolean;
  onStartRecording: () => void | Promise<void>;
  onStopRecording: () => void | Promise<void>;
  /** THE COMPLETION ACTIONS (2026-10-19, "can we actually save and
   *  export?"): the host does what the schedule asked — save the project,
   *  export the mixdown — and returns one line per thing done for the
   *  success toast; a throw becomes an error toast. Runs after the
   *  recording has stopped and the host's state has caught up. */
  onComplete?: (schedule: TimerRecordSchedule) => Promise<string[]>;
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
  /** Waiting for the start */
  isArmed: boolean;
  /** The hook's clock, ticking once a second while live — the wait dialog's countdown */
  clock: number;
  arm: (schedule: TimerRecordSchedule) => void;
  /** The dialog's Start now: skip the wait, record now — the end stays as scheduled */
  startNow: () => void;
  /** The dialog's Stop while recording: end it now; the completion actions run */
  stopNow: () => void;
  cancel: () => void;
}

export function useTimerRecord({ isRecording, onStartRecording, onStopRecording, onComplete, now = () => Date.now(), tickMs = 1000 }: UseTimerRecordOptions): UseTimerRecordReturn {
  const [phase, setPhase] = React.useState<TimerRecordPhase>('idle');
  const [schedule, setSchedule] = React.useState<TimerRecordSchedule | null>(null);
  const [lastSchedule, setLastSchedule] = React.useState<TimerRecordSchedule | null>(null);
  const [clock, setClock] = React.useState(() => now());
  const startRef = React.useRef(onStartRecording);
  const stopRef = React.useRef(onStopRecording);
  React.useEffect(() => { startRef.current = onStartRecording; }, [onStartRecording]);
  React.useEffect(() => { stopRef.current = onStopRecording; }, [onStopRecording]);
  const completeRef = React.useRef(onComplete);
  React.useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
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

  // Completion: the phase ends at once; the actions run after the host's
  // stop has settled (a macrotask, so the dispatched recording clip is in
  // the host's state before the mixdown reads it). THE SUCCESS TOAST
  // DETAILS WHAT WAS DONE ("if we're saving or exporting, that could be
  // detailed in the success toast"): the recorded length, then the host's
  // own lines — what it REALLY did, not what was asked.
  const complete = React.useCallback((s: TimerRecordSchedule, stop: () => void | Promise<void>) => {
    setPhase('idle');
    setSchedule(null);
    void (async () => {
      const recorded = `Recorded ${formatDurationText(Math.min(s.endAt, nowRef.current()) - s.startAt)}`;
      try {
        await stop();
        await new Promise((r) => setTimeout(r, 0));
        const done = completeRef.current ? await completeRef.current(s) : [];
        toast.success('Timed recording complete', [recorded, ...done].join('\n'));
      } catch (err) {
        toast.error('Timed recording complete, but not everything was done', `${recorded}\n${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, []);

  // The phase machine, driven by the clock
  React.useEffect(() => {
    if (!schedule) return;
    if (phase === 'armed' && clock >= schedule.startAt) {
      setPhase('recording');
      sawRecordingRef.current = false;
      void startRef.current();
    } else if (phase === 'recording' && clock >= schedule.endAt) {
      complete(schedule, () => stopRef.current());
    }
  }, [phase, schedule, clock, complete]);

  // A recording the user stopped by hand ends the timer
  React.useEffect(() => {
    if (phase !== 'recording' || !schedule) return;
    if (isRecording) { sawRecordingRef.current = true; return; }
    if (sawRecordingRef.current) complete(schedule, () => undefined); // already stopped by hand
  }, [isRecording, phase, schedule, complete]);

  const cancel = React.useCallback(() => {
    setPhase('idle');
    setSchedule(null);
  }, []);

  // STOP NOW (2026-10-19, the dialog blocking the recording too): end the
  // recording early — the host's stop, then the completion actions
  const stopNow = React.useCallback(() => {
    if (phase !== 'recording' || !schedule) return;
    complete(schedule, () => stopRef.current());
  }, [phase, schedule, complete]);

  // No arm toast: THE WAIT IS A BLOCKING DIALOG (2026-10-19, after an
  // hour of the armed bar — "can we try a blocking dialog?"), which is
  // its own confirmation; the completion toast stays.
  const arm = React.useCallback((s: TimerRecordSchedule) => {
    setSchedule(s);
    setLastSchedule(s);
    sawRecordingRef.current = false;
    setPhase('armed');
    setClock(nowRef.current());
  }, []);

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
    clock,
    arm,
    startNow,
    stopNow,
    cancel,
  };
}
