import React from 'react';
import { Dialog, DialogFooter, TimeCode, type TimeCodeFormat } from '@audacity-ui/components';

export interface GoToDialogProps {
  isOpen: boolean;
  /** Prefill: where the playhead is now */
  initialSeconds: number;
  /** The transport timecode's format — the dialog reads and sets the same one */
  format: TimeCodeFormat;
  onFormatChange?: (format: TimeCodeFormat) => void;
  onGo: (seconds: number) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

/**
 * GO TO (user decision 2026-10-13, "a 'Go to…' or 'Move playhead to…'
 * action/dialog that can be summoned to set playhead pos"): ⌘P (Edit
 * › Go to…) opens it with the playhead's position in the transport's
 * own TimeCode control, in the transport's format; Go (or Enter on the
 * control) parks the playhead there, Escape leaves it. The control is
 * the toolbar's: Space, a click or an arrow edits a digit, Enter
 * finishes the digit edit — so the dialog takes Enter only from the
 * control at REST (its wrapper, in the capture phase), never from a
 * digit mid-edit. Focus returns to whatever had it when the dialog
 * opened (the clip, the handle, the toolbar). The real build has no
 * such dialog — its "Playback position" is the typed toolbar timecode,
 * which we also have (F6 to it); this is the modal, one-chord form.
 */
export function GoToDialog({ isOpen, initialSeconds, format, onFormatChange, onGo, onClose, os = 'macos' }: GoToDialogProps) {
  const [seconds, setSeconds] = React.useState(initialSeconds);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    setSeconds(initialSeconds);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Onto the control, once the dialog is up
    const id = requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('.timecode')?.focus());
    return () => cancelAnimationFrame(id);
    // Read at OPEN only: the playhead moving while the dialog is up must
    // not overwrite a half-typed position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const close = () => {
    onClose();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected) requestAnimationFrame(() => opener.focus());
  };
  const go = () => {
    onGo(Math.max(0, seconds));
    close();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Go to"
      onClose={close}
      os={os}
      // The design-system Dialog floors at 480px (Dialog.css); this is a
      // one-control entry and wants 360 — index.css lifts the floor for
      // exactly this class.
      className="go-to-dialog"
      width={360}
      minHeight={0}
      footer={
        <DialogFooter
          primaryText="Go"
          secondaryText="Cancel"
          onPrimaryClick={go}
          onSecondaryClick={close}
        />
      }
    >
      <div
        ref={rootRef}
        data-go-to-dialog
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        onKeyDownCapture={(e) => {
          // Enter on the control AT REST goes; a digit mid-edit keeps the
          // TimeCode's own Enter (it finishes the edit and never reaches here)
          if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.classList.contains('timecode')) {
            e.preventDefault();
            e.stopPropagation();
            go();
          }
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 400 }}>Playhead position</span>
        <TimeCode
          value={seconds}
          format={format}
          onChange={setSeconds}
          onFormatChange={onFormatChange}
          ariaLabel="Playhead position"
          variant="light"
        />
        <span style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.55)' }}>Space or a click edits the digits · Enter goes</span>
      </div>
    </Dialog>
  );
}
