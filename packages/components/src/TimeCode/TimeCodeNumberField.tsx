/**
 * TimeCodeNumberField — the typed entry of a TimeCodeNumber (2026-11-11,
 * "when we double click to enter specific value, the width and kerning
 * should not change"): the typing is drawn IN THE SAME DIGIT CELLS, in the
 * active tone, and a transparent input over them takes the keys — so the
 * face keeps its width and every character its cell. The draft fills the
 * cells from the left; Enter commits, Escape cancels, leaving the field
 * commits. The input keeps the host's class name, so tests drive it.
 */
import React, { useEffect, useRef } from 'react';
import { TimeCodeDigit } from './TimeCodeDigit';

export interface TimeCodeNumberFieldProps {
  draft: string;
  digits: number;
  onDraftChange: (draft: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  className?: string;
  ariaLabel?: string;
}

export function TimeCodeNumberField({ draft, digits, onDraftChange, onCommit, onCancel, className, ariaLabel }: TimeCodeNumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Next paint, so the input is mounted before it takes the focus
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const shown = draft.slice(0, digits).padEnd(digits, ' ');
  return (
    <span className="timecode-number-field">
      {shown.split('').map((ch, i) => (
        <TimeCodeDigit key={i} value={ch === ' ' ? ' ' : ch} state="active" tabIndex={-1} />
      ))}
      <input
        ref={inputRef}
        className={`timecode-number-field__input${className ? ` ${className}` : ''}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={digits}
        aria-label={ariaLabel}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value.replace(/[^0-9]/g, '').slice(0, digits))}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
        }}
      />
    </span>
  );
}
