import React from 'react';
import { Dialog, DialogFooter } from '@audacity-ui/components';

export interface FadeDurationDialogProps {
  isOpen: boolean;
  side: 'in' | 'out';
  /** How many clips the fade will apply to (the title says so when > 1) */
  targetCount: number;
  /** Prefill: the clicked clip's current fade on this side, if any */
  initialSeconds: number | undefined;
  /** The longest fade any target can take — the shortest target's duration */
  maxSeconds: number;
  onApply: (seconds: number) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

/**
 * Typed fade duration — for when the corner handle is too coarse, or
 * several clips want exactly the same fade. Mirrors NewMacroDialog's
 * one-field shape. Enter applies, Escape cancels; a value above the
 * shortest target clip's length is clamped to it on apply.
 */
export function FadeDurationDialog({ isOpen, side, targetCount, initialSeconds, maxSeconds, onApply, onClose, os = 'macos' }: FadeDurationDialogProps) {
  const [text, setText] = React.useState('');
  React.useEffect(() => {
    if (isOpen) setText(initialSeconds && initialSeconds > 0 ? String(+initialSeconds.toFixed(3)) : '1');
  }, [isOpen, initialSeconds]);

  const parsed = Number(text.trim().replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;
  const apply = () => {
    if (!valid) return;
    onApply(Math.min(parsed, maxSeconds));
    onClose();
  };
  const label = side === 'in' ? 'Fade in' : 'Fade out';
  const title = targetCount > 1 ? `${label} — ${targetCount} clips` : label;

  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      os={os}
      // The design-system Dialog floors at 480px (Dialog.css); this is a
      // one-field entry and wants 320 — index.css lifts the floor for
      // exactly this class.
      className="fade-duration-dialog"
      width={320}
      minHeight={0}
      footer={
        <DialogFooter
          primaryText="Apply"
          secondaryText="Cancel"
          primaryDisabled={!valid}
          onPrimaryClick={apply}
          onSecondaryClick={onClose}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="fade-duration-input" style={{ fontSize: '12px', fontWeight: 400 }}>
          Duration (seconds)
        </label>
        <input
          id="fade-duration-input"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
            else if (e.key === 'Escape') onClose();
          }}
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          style={{ padding: '7px 8px', fontSize: '12px', border: '1px solid #D2D6DD', borderRadius: '3px', outline: 'none' }}
        />
        <div style={{ fontSize: '12px', opacity: 0.6 }}>
          {targetCount > 1 ? `Applied to ${targetCount} selected clips. ` : ''}Up to {+maxSeconds.toFixed(2)}s. 0 removes the fade.
        </div>
      </div>
    </Dialog>
  );
}
