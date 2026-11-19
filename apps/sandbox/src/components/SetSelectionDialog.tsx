import React from 'react';
import { Dialog, DialogFooter, TimeCode, type TimeCodeFormat } from '@audacity-ui/components';

export interface SelectionRange {
  start: number;
  end: number;
}

/**
 * One field edited: START moves the range (End follows, the length kept),
 * LENGTH moves End, END changes the length. Never below zero.
 */
export function applySelectionField(range: SelectionRange, field: 'start' | 'end' | 'length', value: number): SelectionRange {
  const v = Math.max(0, value);
  if (field === 'start') return { start: v, end: v + (range.end - range.start) };
  if (field === 'length') return { start: range.start, end: range.start + v };
  return { start: range.start, end: v };
}

/** What Set does: the selection over the range on `tracks`, the playhead at
 *  its start — and a ZERO-LENGTH range clears the selection and only parks
 *  the playhead (final review, 2026-11-19: an empty time selection was
 *  stored, and Delete / Copy / Cut on a focused clip then quietly did
 *  nothing) */
export type SetSelectionAction =
  | { type: 'SET_TIME_SELECTION'; payload: { startTime: number; endTime: number; tracks: number[] | undefined } | null }
  | { type: 'SET_PLAYHEAD_POSITION'; payload: number };
export function selectionActionsFor(start: number, end: number, tracks: number[] | undefined): SetSelectionAction[] {
  return [
    { type: 'SET_TIME_SELECTION', payload: end > start ? { startTime: start, endTime: end, tracks } : null },
    { type: 'SET_PLAYHEAD_POSITION', payload: start },
  ];
}

export interface SetSelectionDialogProps {
  isOpen: boolean;
  /** Prefill: the current selection, or the playhead with no length */
  initialStart: number;
  initialEnd: number;
  /** The transport timecode's format, read and set as Go to… does */
  format: TimeCodeFormat;
  onFormatChange?: (format: TimeCodeFormat) => void;
  onSet: (start: number, end: number) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

/**
 * SET SELECTION… (2026-11-19, with the ruler readout: the status bar's
 * selection timecodes went off by default, and precise entry moved here —
 * "the set selection would need to be a … menu action available via the
 * command palette too"): Edit › Set selection…, below Go to…. Start, End and
 * Length in the alt timecode Go to… uses, Start already editing; editing Start
 * or Length moves End, editing End changes Length; Set (or Enter on a field)
 * applies, dimmed while End is before Start; Escape cancels. Focus returns to
 * the opener.
 */
export function SetSelectionDialog({ isOpen, initialStart, initialEnd, format, onFormatChange, onSet, onClose, os = 'macos' }: SetSelectionDialogProps) {
  const [range, setRangeState] = React.useState<SelectionRange>({ start: initialStart, end: initialEnd });
  // THE LATEST RANGE IN A REF (final review, 2026-11-19): a time TYPED into a
  // field commits its change and its Enter in one tick, so Set read the range
  // from before the edit and applied the old values; every edit writes the
  // ref at once and Set reads it
  const rangeRef = React.useRef(range);
  const setRange = (next: SelectionRange | ((r: SelectionRange) => SelectionRange)) => {
    rangeRef.current = typeof next === 'function' ? next(rangeRef.current) : next;
    setRangeState(rangeRef.current);
  };
  const openerRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    setRange({ start: initialStart, end: initialEnd });
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Read at OPEN only, as Go to… does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const valid = range.end >= range.start;
  const close = () => {
    onClose();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected) requestAnimationFrame(() => opener.focus());
  };
  const set = () => {
    const r = rangeRef.current;
    if (r.end < r.start) return;
    onSet(r.start, r.end);
    close();
  };
  const field = (label: string, aria: string, value: number, onChange: (v: number) => void, autoEdit = false) => (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: '12px' }}>{label}</span>
      <TimeCode value={Math.max(0, value)} format={format} onChange={onChange} onFormatChange={onFormatChange} ariaLabel={aria} variant="alt" autoEdit={autoEdit} onCommit={set} />
    </label>
  );

  return (
    <Dialog
      isOpen={isOpen}
      title="Set selection"
      onClose={close}
      os={os}
      className="go-to-dialog"
      width={360}
      minHeight={0}
      footer={<DialogFooter primaryText="Set" secondaryText="Cancel" onPrimaryClick={set} onSecondaryClick={close} primaryDisabled={!valid} />}
    >
      <div
        data-set-selection-dialog
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        onKeyDownCapture={(e) => {
          // Enter on a field AT REST sets (mid-edit the TimeCode's own Enter commits)
          if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.classList.contains('timecode')) {
            e.preventDefault();
            e.stopPropagation();
            set();
          }
        }}
      >
        {field('Start', 'Set start', range.start, (v) => setRange((r) => applySelectionField(r, 'start', v)), true)}
        {field('End', 'Set end', range.end, (v) => setRange((r) => applySelectionField(r, 'end', v)))}
        {field('Length', 'Set length', range.end - range.start, (v) => setRange((r) => applySelectionField(r, 'length', v)))}
        {!valid && <span role="alert" style={{ fontSize: '12px' }}>The end is before the start</span>}
      </div>
    </Dialog>
  );
}
