/**
 * TimerRecordDialog — the Figma "Timer record" window (2026-10-19, the
 * AU4 redesign of Audacity 3's Timer Record): Start recording (Date,
 * Time) and End recording (Date, Time) side by side, Duration under them,
 * then one group — "Automatic save and export": Save project on
 * completion with its path, Export audio on completion with its path, a
 * divider, Quit Audacity when complete — and Cancel / Schedule recording.
 *
 * The three time fields are coupled by Audacity 3's rule
 * (utils/timerRecord.ts `applyTimerEdit`): a start edit carries the end,
 * an end edit sets the duration, a duration edit sets the end. The
 * dialog opens on NOW for an hour, or on the last schedule's duration
 * and options with a fresh start. Schedule recording hands the host the
 * schedule and closes; the host's useTimerRecord arms the recorder and
 * shows the state on the bar. The dialog itself never records.
 *
 * Open items from the review, deliberately NOT yet built ("build it and
 * we can address the issues"): a Now option for the start, a stated
 * driver among the three fields, inline validation beyond the primary
 * dimming, the group's name vs its Quit row, the folder buttons (stubs).
 */
import React from 'react';
import {
  Dialog, DialogFooter, TimeCode, TextInput, LabeledCheckbox, Button, Icon,
} from '@audacity-ui/components';
import {
  type TimerRecordSchedule, type TimerField, applyTimerEdit, timerRecordValidation, defaultTimerSchedule,
  localDateString, localSecondsOfDay, parseLocalDate, combineLocal, localMidnight,
} from '../utils/timerRecord';

export interface TimerRecordDialogProps {
  isOpen: boolean;
  /** The last schedule armed — its duration and options are the prefill */
  initial?: TimerRecordSchedule | null;
  /** The clock at open (tests); Date.now() otherwise */
  now?: number;
  onSchedule: (schedule: TimerRecordSchedule) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 400 };
const headingStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, margin: 0 };

export function TimerRecordDialog({ isOpen, initial, now, onSchedule, onClose, os = 'macos' }: TimerRecordDialogProps) {
  const [times, setTimes] = React.useState({ startAt: 0, endAt: 0 });
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
    const t = now ?? Date.now();
    const base = defaultTimerSchedule(t);
    const seed = initial
      ? { ...base, endAt: t + Math.max(1000, initial.endAt - initial.startAt), saveProject: initial.saveProject, savePath: initial.savePath, exportAudio: initial.exportAudio, exportPath: initial.exportPath, quitWhenComplete: initial.quitWhenComplete }
      : base;
    setTimes({ startAt: seed.startAt, endAt: seed.endAt });
    setOptions({ saveProject: seed.saveProject, savePath: seed.savePath, exportAudio: seed.exportAudio, exportPath: seed.exportPath, quitWhenComplete: seed.quitWhenComplete });
    setStartDateDraft(null);
    setEndDateDraft(null);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Read at OPEN only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const edit = (field: TimerField, value: number) => setTimes((prev) => applyTimerEdit(prev, field, value));
  const editDate = (field: 'start' | 'end', text: string) => {
    (field === 'start' ? setStartDateDraft : setEndDateDraft)(text);
    const midnight = parseLocalDate(text);
    if (midnight === null) return;
    const current = field === 'start' ? times.startAt : times.endAt;
    edit(field, combineLocal(midnight, localSecondsOfDay(current)));
  };
  const editTime = (field: 'start' | 'end', secondsOfDay: number) => {
    const current = field === 'start' ? times.startAt : times.endAt;
    edit(field, combineLocal(localMidnight(current), secondsOfDay));
  };

  const close = () => {
    onClose();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected) requestAnimationFrame(() => opener.focus());
  };
  const problem = timerRecordValidation(times);
  const canQuit = options.saveProject || options.exportAudio;
  const schedule = () => {
    if (problem) return;
    onSchedule({ startAt: times.startAt, endAt: times.endAt, ...options, quitWhenComplete: canQuit && options.quitWhenComplete });
    close();
  };

  const durationSeconds = Math.max(0, Math.round((times.endAt - times.startAt) / 1000));

  const dateTimePair = (field: 'start' | 'end', heading: string, at: number, draft: string | null) => (
    <div data-timer-record-side={field} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <h3 style={headingStyle}>{heading}</h3>
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
            ariaLabel={`${heading} time`}
            variant="alt"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      title="Timer record"
      onClose={close}
      os={os}
      className="timer-record-dialog"
      width={520}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {dateTimePair('start', 'Start recording', times.startAt, startDateDraft)}
          {dateTimePair('end', 'End recording', times.endAt, endDateDraft)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
          <h3 style={headingStyle}>Duration</h3>
          <TimeCode
            value={durationSeconds}
            format="dd:hh:mm:ss"
            onChange={(seconds) => edit('duration', seconds * 1000)}
            showFormatSelector={false}
            ariaLabel="Duration"
            variant="alt"
          />
          {problem && <span data-timer-record-problem style={{ color: '#B3261E' }}>{problem}</span>}
        </div>
        <fieldset
          data-timer-record-options
          style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '6px', background: 'rgba(0,0,0,0.035)', padding: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <legend style={{ ...headingStyle, padding: '0 4px' }}>Automatic save and export</legend>
          <LabeledCheckbox
            label="Save project on completion"
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
            label="Export audio on completion"
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
          <hr style={{ border: 0, borderTop: '1px solid rgba(0,0,0,0.12)', margin: '2px 0' }} />
          <LabeledCheckbox
            label="Quit Audacity when complete"
            checked={canQuit && options.quitWhenComplete}
            disabled={!canQuit}
            onChange={(checked) => setOptions((o) => ({ ...o, quitWhenComplete: checked }))}
            className="timer-record__quit"
          />
        </fieldset>
      </div>
    </Dialog>
  );
}
