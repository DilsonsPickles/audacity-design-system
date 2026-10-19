/**
 * TimerRecordWaitDialog — the BLOCK while a timed recording waits
 * (2026-10-19, "can we try a blocking dialog? … the user would need to
 * specify a track and a time, and if it's deleted then we're in a state
 * where we'd need to prompt that this track was armed. It's getting
 * complex for little extra benefit"): Audacity 3's "Waiting to start"
 * dialog, in the design system's modal. While it is up nothing else can
 * change — the target track, the cursor, the transport — so the schedule
 * has nothing to defend. It shows the countdown large, the start and end
 * clock times under it, and two buttons: CANCEL (the schedule is dropped;
 * Escape too) and START NOW (the wait collapses, the end holds). The
 * dialog closes itself when the recording begins; from there the app is
 * the app, with the status bar counting down to the end and Stop ending
 * it early. (The bar's armed state — the clock in the ring, the status
 * line — still exists behind the modal and carries the recording phase.)
 */
import { Dialog, DialogFooter } from '@audacity-ui/components';
import { type TimerRecordSchedule, formatCountdown, clockTime } from '../utils/timerRecord';

export interface TimerRecordWaitDialogProps {
  /** The armed schedule; null closes the dialog */
  schedule: TimerRecordSchedule | null;
  /** The clock, ticking from the host */
  now: number;
  onStartNow: () => void;
  onCancel: () => void;
  os?: 'macos' | 'windows';
}

export function TimerRecordWaitDialog({ schedule, now, onStartNow, onCancel, os = 'macos' }: TimerRecordWaitDialogProps) {
  const open = schedule !== null;
  return (
    <Dialog
      isOpen={open}
      title="Waiting to start recording"
      onClose={onCancel}
      closeOnClickOutside={false}
      os={os}
      className="timer-record-wait-dialog"
      width={400}
      minHeight={0}
      footer={
        <DialogFooter
          primaryText="Start now"
          secondaryText="Cancel"
          onPrimaryClick={onStartNow}
          onSecondaryClick={onCancel}
        />
      }
    >
      {schedule && (
        <div data-timer-record-wait role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px 0 4px', fontSize: '12px' }}>
          <span data-timer-record-countdown style={{ fontSize: '32px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {formatCountdown(schedule.startAt - now)}
          </span>
          <span style={{ color: 'rgba(0, 0, 0, 0.6)', fontVariantNumeric: 'tabular-nums' }}>
            Starts at {clockTime(schedule.startAt)} · ends at {clockTime(schedule.endAt)}
          </span>
        </div>
      )}
    </Dialog>
  );
}
