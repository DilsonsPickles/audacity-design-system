/**
 * ManualValueDialog — "Enter value…" for a control you would otherwise
 * drag (user request 2026-10-15, "add right click menu to input controls
 * such as the timecode, sliders, pan knobs etc so the user can right
 * click and say 'enter manual value'"): the design system's Dialog with
 * ONE NumberStepper (the control's unit, range and step), Apply / Cancel;
 * Enter applies, Escape cancels. The host opens it from the control's
 * right-click menu (hooks/useValueContextMenu) and applies the number
 * through the control's own onChange, so the dialog is one more way in,
 * never a second rule.
 */
import React from 'react';
import { Dialog } from '../Dialog/Dialog';
import { DialogFooter } from '../Footer/Footer';
import { NumberStepper } from '../NumberStepper/NumberStepper';

export interface ManualValueDialogProps {
  isOpen: boolean;
  /** The dialog's title: the control's name ("Volume", "Pan", "Playback speed") */
  title: string;
  /** The field's label, under the title; defaults to "Value" */
  label?: string;
  /** The control's current value, prefilled */
  value: number;
  /** The unit the field keeps after the number ("%", "×", "dB") */
  unit?: string;
  min?: number;
  max?: number;
  /** The arrows' step; the typed value is not rounded to it */
  step?: number;
  /** Decimals the prefill is written with (the typed value keeps its own) */
  decimals?: number;
  /** A line under the field — the range, or what the value means */
  hint?: string;
  onApply: (value: number) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

/** The number in a stepper's text — "0,875", "75 %", "1.5×" — or null */
export const parseManualValue = (text: string): number | null => {
  const digits = text.trim().replace(',', '.').replace(/[^0-9.+-]+$/g, '').trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};

export function ManualValueDialog({
  isOpen, title, label = 'Value', value, unit, min, max, step = 1, decimals = 0, hint, onApply, onClose, os = 'macos',
}: ManualValueDialogProps) {
  const format = (v: number) => (unit ? `${+v.toFixed(decimals)} ${unit}` : String(+v.toFixed(decimals)));
  const [text, setText] = React.useState(format(value));
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    setText(format(value));
    // After the Dialog's focus trap has seeded the titlebar (a 10ms timer)
    const id = window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const parsed = parseManualValue(text);
  const clamp = (n: number) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
  const valid = parsed !== null;
  const apply = () => {
    if (parsed === null) return;
    onApply(clamp(parsed));
    onClose();
  };
  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      os={os}
      className="manual-value-dialog"
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
      <div
        data-manual-value-dialog
        style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); apply(); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {label}
          <NumberStepper
            ref={inputRef}
            value={text}
            onChange={setText}
            unit={unit}
            min={min}
            max={max}
            step={step}
            width="100%"
          />
        </label>
        {hint && <span style={{ opacity: 0.7 }}>{hint}</span>}
      </div>
    </Dialog>
  );
}

export default ManualValueDialog;
