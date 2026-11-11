/**
 * TimeCodeNumber — a whole number drawn as the timecode's DIGIT CELLS
 * (2026-11-11, "both the speed and bpm units need to be separate unit
 * containers like the main timecode. Also, when you double click on units
 * it then becomes text entry field"): one TimeCodeDigit per digit, the
 * number zero-padded to `digits` so the face never changes width, edited
 * DIGIT BY DIGIT as the main timecode is — a click on a digit makes it the
 * active cell; while one is active, 0–9 set it and move on (leaving after
 * the last), ↑ ↓ wrap it 0–9, ← → move (wrapping), Enter / Escape / a
 * press anywhere else leave. Every change commits at once through
 * `onChange`, clamped to min–max. The keys are taken in the WINDOW's
 * capture phase so no app shortcut (− = 0, the seek arrows) also runs.
 * The host draws the free-text field on a double-click (BpmStepper,
 * VarispeedTimecode), as the main timecode does.
 */
import React, { useEffect, useRef, useState } from 'react';
import { TimeCodeDigit } from './TimeCodeDigit';

export interface TimeCodeNumberProps {
  value: number;
  /** How many cells — the value is zero-padded to this */
  digits: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Told when digit editing starts and stops */
  onActiveChange?: (active: boolean) => void;
}

export const padDigits = (value: number, digits: number) =>
  String(Math.max(0, Math.round(value))).padStart(digits, '0').slice(-digits);

export function TimeCodeNumber({ value, digits, min, max, onChange, disabled = false, onActiveChange }: TimeCodeNumberProps) {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const cellsRef = useRef<Array<HTMLSpanElement | null>>([]);
  // Live mirrors for the window listener, bound once per activation
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; onActiveChange?.(active !== null); }, [active, onActiveChange]);

  const text = padDigits(value, digits);

  const setDigit = (index: number, digit: number) => {
    const chars = padDigits(valueRef.current, digits).split('');
    chars[index] = String(digit);
    const next = Math.max(min, Math.min(max, Number.parseInt(chars.join(''), 10)));
    valueRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      const i = activeRef.current;
      if (i === null) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const take = () => { e.preventDefault(); e.stopPropagation(); };
      if (/^[0-9]$/.test(e.key)) {
        take();
        setDigit(i, Number(e.key));
        setActive(i + 1 < digits ? i + 1 : null);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        take();
        const current = Number(padDigits(valueRef.current, digits)[i]);
        setDigit(i, (current + (e.key === 'ArrowUp' ? 1 : 9)) % 10);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        take();
        setActive((i + (e.key === 'ArrowRight' ? 1 : digits - 1)) % digits);
      } else if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
        if (e.key !== 'Tab') take();
        setActive(null);
      }
    };
    const onPress = (e: PointerEvent) => {
      if (!cellsRef.current.some((cell) => cell && cell.contains(e.target as Node))) setActive(null);
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPress, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPress, true);
    };
    // setDigit reads only refs and props that the activation does not outlive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active === null, digits, min, max, onChange]);

  return (
    <>
      {text.split('').map((digit, i) => (
        <TimeCodeDigit
          key={i}
          ref={(el) => { cellsRef.current[i] = el; }}
          value={digit}
          state={active === i ? 'active' : hover === i && !disabled ? 'hover' : 'default'}
          editable={!disabled}
          onClick={() => setActive(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          tabIndex={-1}
        />
      ))}
    </>
  );
}
