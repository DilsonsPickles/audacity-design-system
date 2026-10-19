/**
 * TimerRecordWaitDialog — the BLOCK while a timed recording waits AND
 * while it records (2026-10-19, "can we try a blocking dialog? … the user
 * would need to specify a track and a time, and if it's deleted then
 * we're in a state where we'd need to prompt that this track was armed.
 * It's getting complex for little extra benefit", then "when it's
 * recording, I think we want to block the interface too, same dialog
 * countdown style"): Audacity 3's waiting and progress dialogs as ONE
 * modal titled "Timed recording". ARMED: the label "Waiting to start",
 * the countdown to the start, "Starts at … · ends at …", CANCEL (Escape
 * too; the schedule is dropped) and START NOW (the wait collapses, the
 * end holds). RECORDING: the label "Recording", the countdown to the end,
 * "Started at … · ends at …", and STOP (the recording ends now and the
 * completion actions run — what was recorded is kept). No × in the title
 * bar: a × on a state is an accidental cancel. While it is up nothing
 * else can change — the target track, the cursor, the transport — so the
 * schedule has nothing to defend. It closes itself when the recording
 * completes.
 */
import { Dialog, DialogFooter, Button } from '@audacity-ui/components';
import { type TimerRecordSchedule, type TimerRecordPhase, formatCountdown, clockTime } from '../utils/timerRecord';

export interface TimerRecordWaitDialogProps {
  phase: TimerRecordPhase;
  /** The live schedule; null (or phase idle) closes the dialog */
  schedule: TimerRecordSchedule | null;
  /** The clock, ticking from the host */
  now: number;
  onStartNow: () => void;
  onCancel: () => void;
  /** Recording: end it now; the completion actions run */
  onStop: () => void;
  os?: 'macos' | 'windows';
}

export function TimerRecordWaitDialog({ phase, schedule, now, onStartNow, onCancel, onStop, os = 'macos' }: TimerRecordWaitDialogProps) {
  const open = schedule !== null && phase !== 'idle';
  const recording = phase === 'recording';
  return (
    <Dialog
      isOpen={open}
      title="Timed recording"
      // Escape cancels the wait; while recording it does nothing (Stop is deliberate)
      onClose={recording ? undefined : onCancel}
      closeOnClickOutside={false}
      hideCloseButton
      os={os}
      className="timer-record-wait-dialog"
      width={400}
      minHeight={0}
      footer={
        recording ? (
          // One button: the footer always draws a secondary, so Stop goes in as the right content
          <DialogFooter rightContent={<Button variant="primary" onClick={onStop}>Stop</Button>} />
        ) : (
          <DialogFooter
            primaryText="Start now"
            secondaryText="Cancel"
            onPrimaryClick={onStartNow}
            onSecondaryClick={onCancel}
          />
        )
      }
    >
      {schedule && (
        <div data-timer-record-wait data-phase={phase} role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px 0 4px', fontSize: '12px' }}>
          <span data-timer-record-label style={{ fontWeight: 600 }}>{recording ? 'Recording' : 'Waiting to start'}</span>
          <span data-timer-record-countdown style={{ fontSize: '32px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {formatCountdown((recording ? schedule.endAt : schedule.startAt) - now)}
          </span>
          <span style={{ color: 'rgba(0, 0, 0, 0.6)', fontVariantNumeric: 'tabular-nums' }}>
            {recording ? 'Started' : 'Starts'} at {clockTime(schedule.startAt)} · ends at {clockTime(schedule.endAt)}
          </span>
        </div>
      )}
    </Dialog>
  );
}
