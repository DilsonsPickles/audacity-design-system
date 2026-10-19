/**
 * TimerRecordDialog — the "Timer record" window (2026-10-19, the AU4
 * redesign of Audacity 3's Timer Record, revised the same day after
 * "how do we set a precise end time?"):
 *
 *   Start recording            End recording
 *   (•) Now  ( ) At a time     (•) For a duration  ( ) Until a time
 *   [Date] [Time]  — or —      [dd hh mm ss]  — or —  [Date] [Time]
 *   readout                    readout
 *
 * THE FIELD YOU PICK IS THE ONE YOU TYPE; THE OTHER IS A READOUT. Under
 * Now the start readout names the clock and the end readout follows it
 * (an Until end's duration counts down until Schedule is pressed). That
 * is the stated driver the first build lacked: two inputs on screen, two
 * readouts, nothing to guess. Below: "After recording completes" — Save
 * project (+ path), Export audio (+ path), Quit Audacity (enabled with
 * Save or Export) — and Cancel / Schedule recording, which dims with the
 * reason beside it while the choices cannot be armed.
 *
 * It opens on Now for an hour, or on the LAST schedule's choices,
 * duration and options with a fresh start. The dialog never records: it
 * hands the host the resolved schedule and the host's useTimerRecord
 * arms the recorder and shows the state on the bar.
 */
import React from 'react';
import {
  Dialog, DialogFooter, TimeCode, TextInput, LabeledCheckbox, LabeledRadio, Button, Icon,
} from '@audacity-ui/components';
import {
  type TimerRecordSchedule, type TimerChoices, type TimerStartMode, type TimerEndMode,
  resolveTimerTimes, timerRecordValidation, formatDurationText, defaultTimerSchedule, DEFAULT_TIMER_DURATION_MS,
  localDateString, localSecondsOfDay, parseLocalDate, combineLocal, localMidnight,
} from '../utils/timerRecord';

export interface TimerRecordDialogProps {
  isOpen: boolean;
  /** The last schedule armed — its choices, duration and options are the prefill */
  initial?: TimerRecordSchedule | null;
  /** The clock (tests); Date.now() otherwise */
  now?: () => number;
  onSchedule: (schedule: TimerRecordSchedule) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 400 };
const headingStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, margin: 0 };
const readoutStyle: React.CSSProperties = { fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)', minHeight: '16px', fontVariantNumeric: 'tabular-nums' };

const timeOfDay = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

export function TimerRecordDialog({ isOpen, initial, now, onSchedule, onClose, os = 'macos' }: TimerRecordDialogProps) {
  const clockFn = React.useRef(now ?? (() => Date.now()));
  React.useEffect(() => { clockFn.current = now ?? (() => Date.now()); }, [now]);
  const [clock, setClock] = React.useState(() => clockFn.current());
  const [choices, setChoices] = React.useState<TimerChoices>({ startMode: 'now', startAt: 0, endMode: 'for', durationMs: DEFAULT_TIMER_DURATION_MS, endAt: 0 });
  const [options, setOptions] = React.useState({
    saveProject: false, savePath: '', exportAudio: false, exportPath: '', quitWhenComplete: false,
  });
  // A date field holds a DRAFT while it is being typed; null shows the
  // date of the time it stands for
  const [startDateDraft, setStartDateDraft] = React.useState<string | null>(null);
  const [endDateDraft, setEndDateDraft] = React.useState<string | null>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const t = clockFn.current();
    setClock(t);
    const base = defaultTimerSchedule(t);
    const duration = initial ? Math.max(1000, initial.endAt - initial.startAt) : DEFAULT_TIMER_DURATION_MS;
    setChoices({
      startMode: initial?.startMode ?? 'now',
      startAt: t,
      endMode: initial?.endMode ?? 'for',
      durationMs: duration,
      endAt: t + duration,
    });
    setOptions({
      saveProject: initial?.saveProject ?? base.saveProject,
      savePath: initial?.savePath ?? base.savePath,
      exportAudio: initial?.exportAudio ?? base.exportAudio,
      exportPath: initial?.exportPath ?? base.exportPath,
      quitWhenComplete: initial?.quitWhenComplete ?? base.quitWhenComplete,
    });
    setStartDateDraft(null);
    setEndDateDraft(null);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Read at OPEN only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // The clock, while open: Now's readouts follow it
  React.useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setClock(clockFn.current()), 1000);
    return () => window.clearInterval(id);
  }, [isOpen]);

  const setStartMode = (startMode: TimerStartMode) => setChoices((c) => ({ ...c, startMode, startAt: startMode === 'at' && c.startMode === 'now' ? clockFn.current() : c.startAt }));
  const setEndMode = (endMode: TimerEndMode) => setChoices((c) => {
    if (endMode === 'until' && c.endMode === 'for') {
      const { startAt } = resolveTimerTimes(c, clockFn.current());
      return { ...c, endMode, endAt: startAt + c.durationMs };
    }
    return { ...c, endMode };
  });
  const editDate = (field: 'start' | 'end', text: string) => {
    (field === 'start' ? setStartDateDraft : setEndDateDraft)(text);
    const midnight = parseLocalDate(text);
    if (midnight === null) return;
    setChoices((c) => field === 'start'
      ? { ...c, startAt: combineLocal(midnight, localSecondsOfDay(c.startAt)) }
      : { ...c, endAt: combineLocal(midnight, localSecondsOfDay(c.endAt)) });
  };
  const editTime = (field: 'start' | 'end', secondsOfDay: number) => {
    setChoices((c) => field === 'start'
      ? { ...c, startAt: combineLocal(localMidnight(c.startAt), secondsOfDay) }
      : { ...c, endAt: combineLocal(localMidnight(c.endAt), secondsOfDay) });
  };

  const close = () => {
    onClose();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected) requestAnimationFrame(() => opener.focus());
  };
  const problem = timerRecordValidation(choices, clock);
  const resolved = resolveTimerTimes(choices, clock);
  const canQuit = options.saveProject || options.exportAudio;
  const schedule = () => {
    if (problem) return;
    const { startAt, endAt } = resolveTimerTimes(choices, clockFn.current());
    onSchedule({ startAt, endAt, startMode: choices.startMode, endMode: choices.endMode, ...options, quitWhenComplete: canQuit && options.quitWhenComplete });
    close();
  };

  const dateTimeFields = (field: 'start' | 'end', at: number, draft: string | null) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...labelStyle }}>
        Date
        <TextInput
          value={draft ?? localDateString(at)}
          onChange={(text) => editDate(field, text)}
          onBlur={() => (field === 'start' ? setStartDateDraft : setEndDateDraft)(null)}
          placeholder="dd/mm/yyyy"
          error={draft !== null && parseLocalDate(draft) === null}
          width="100%"
          className={`timer-record__date timer-record__date--${field}`}
        />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...labelStyle }}>
        Time
        <TimeCode
          value={localSecondsOfDay(at)}
          format="hh:mm:ss"
          onChange={(seconds) => editTime(field, seconds)}
          showFormatSelector={false}
          ariaLabel={field === 'start' ? 'Start time' : 'End time'}
          variant="alt"
        />
      </div>
    </div>
  );

  const endReadout = problem && choices.endMode === 'until' && problem !== 'The end is before the start'
    ? ''
    : choices.endMode === 'for'
      ? (problem ? '' : `Ends ${localMidnight(resolved.endAt) === localMidnight(clock) ? 'today' : localDateString(resolved.endAt)} at ${timeOfDay(resolved.endAt)}`)
      : (resolved.endAt > resolved.startAt ? `Records for ${formatDurationText(resolved.endAt - resolved.startAt)}${choices.startMode === 'now' ? ' from now' : ''}` : '');

  return (
    <Dialog
      isOpen={isOpen}
      title="Timer record"
      onClose={close}
      os={os}
      className="timer-record-dialog"
      width={560}
      minHeight={0}
      footer={
        <DialogFooter
          primaryText="Schedule recording"
          secondaryText="Cancel"
          primaryDisabled={problem !== null}
          onPrimaryClick={schedule}
          onSecondaryClick={close}
        />
      }
    >
      <div data-timer-record-dialog style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div data-timer-record-side="start" data-mode={choices.startMode} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            <h3 style={headingStyle}>Start recording</h3>
            <div role="radiogroup" aria-label="Start" style={{ display: 'flex', gap: '12px' }}>
              <LabeledRadio label="Now" name="timer-start" value="now" checked={choices.startMode === 'now'} onChange={(on) => on && setStartMode('now')} className="timer-record__start-now" />
              <LabeledRadio label="At a time" name="timer-start" value="at" checked={choices.startMode === 'at'} onChange={(on) => on && setStartMode('at')} className="timer-record__start-at" />
            </div>
            {choices.startMode === 'at' && dateTimeFields('start', choices.startAt, startDateDraft)}
            <span data-timer-record-readout="start" style={readoutStyle}>
              {choices.startMode === 'now' ? `Starts when you press Schedule. It is ${timeOfDay(clock)}.` : ''}
            </span>
          </div>
          <div data-timer-record-side="end" data-mode={choices.endMode} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            <h3 style={headingStyle}>End recording</h3>
            <div role="radiogroup" aria-label="End" style={{ display: 'flex', gap: '12px' }}>
              <LabeledRadio label="For a duration" name="timer-end" value="for" checked={choices.endMode === 'for'} onChange={(on) => on && setEndMode('for')} className="timer-record__end-for" />
              <LabeledRadio label="Until a time" name="timer-end" value="until" checked={choices.endMode === 'until'} onChange={(on) => on && setEndMode('until')} className="timer-record__end-until" />
            </div>
            {choices.endMode === 'for' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', ...labelStyle }}>
                Duration
                <TimeCode
                  value={Math.round(choices.durationMs / 1000)}
                  format="dd:hh:mm:ss"
                  onChange={(seconds) => setChoices((c) => ({ ...c, durationMs: Math.max(0, seconds) * 1000 }))}
                  showFormatSelector={false}
                  ariaLabel="Duration"
                  variant="alt"
                />
              </div>
            ) : dateTimeFields('end', choices.endAt, endDateDraft)}
            <span data-timer-record-readout="end" style={readoutStyle}>{endReadout}</span>
          </div>
        </div>
        <fieldset
          data-timer-record-options
          style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '6px', background: 'rgba(0,0,0,0.035)', padding: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <legend style={{ ...headingStyle, padding: '0 4px' }}>After recording completes</legend>
          <LabeledCheckbox
            label="Save project"
            checked={options.saveProject}
            onChange={(checked) => setOptions((o) => ({ ...o, saveProject: checked }))}
            className="timer-record__save"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
            <TextInput
              value={options.savePath}
              onChange={(text) => setOptions((o) => ({ ...o, savePath: text }))}
              disabled={!options.saveProject}
              width="100%"
              className="timer-record__save-path"
            />
            <Button variant="secondary" ariaLabel="Choose where to save the project" disabled={!options.saveProject} icon={<Icon name="folder" size={14} />} showIcon>{''}</Button>
          </div>
          <LabeledCheckbox
            label="Export audio"
            checked={options.exportAudio}
            onChange={(checked) => setOptions((o) => ({ ...o, exportAudio: checked }))}
            className="timer-record__export"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
            <TextInput
              value={options.exportPath}
              onChange={(text) => setOptions((o) => ({ ...o, exportPath: text }))}
              disabled={!options.exportAudio}
              width="100%"
              className="timer-record__export-path"
            />
            <Button variant="secondary" ariaLabel="Choose where to export the audio" disabled={!options.exportAudio} icon={<Icon name="folder" size={14} />} showIcon>{''}</Button>
          </div>
          <LabeledCheckbox
            label="Quit Audacity"
            checked={canQuit && options.quitWhenComplete}
            disabled={!canQuit}
            onChange={(checked) => setOptions((o) => ({ ...o, quitWhenComplete: checked }))}
            className="timer-record__quit"
          />
        </fieldset>
        <span data-timer-record-problem style={{ minHeight: '16px', textAlign: 'right', color: problem ? '#B3261E' : 'transparent' }}>{problem ?? ' '}</span>
      </div>
    </Dialog>
  );
}
