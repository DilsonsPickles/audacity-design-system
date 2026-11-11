/**
 * VarispeedTimecode — play-at-speed as a member of the timecode family
 * (2026-11-11, "a timecode version of the play at speed slider… modelled
 * on the bpm timecode. It says 'Speed' in same font as bpm and then uses
 * 000 % format so that when it's changed, the width of the timecode
 * doesn't change"). THE DEFAULT FORM on the toolbar; the slider form
 * (VarispeedControl) is behind a Debug panel toggle.
 *
 * BpmStepper's parts and look, one to one: the dark face, the "Speed"
 * name and the "%" unit in the timecode's unit type (TimeCodeUnit — the
 * font "bpm" is set in), the number in the bold Lato digits ZERO-PADDED TO
 * THREE ("001"–"300", tabular figures) so it never changes width, and the
 * up/down arrow column on the right edge. THE DIGITS ARE THE TIMECODE'S
 * CELLS (the same day, "separate unit containers like the main timecode"):
 * a click on a digit edits that digit, and a DOUBLE-CLICK on the face
 * (not on "Speed") types a new percent (Enter commits, Escape cancels); the arrows step a TENTH (the
 * − / = keys' step, on the tenths grid), with BpmStepper's hold-to-repeat;
 * with the stepper focused ↑ ↓ step a tenth, Shift a hundredth, and Enter
 * types. Right-click: "Enter value…" (the typed field) / "Reset to 100%".
 * A CLICK ON "Speed" IS THE 0 KEY (2026-11-11, "what if clicking on
 * 'Speed' also does the same as the 0 shortcut?"): off 100% it goes to
 * 100%, at 100% back to the last speed that was not — `onToggle`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { TimeCodeUnit } from '../TimeCode/TimeCodeUnit';
import { TimeCodeNumber, padDigits } from '../TimeCode/TimeCodeNumber';
import { TimeCodeNumberField } from '../TimeCode/TimeCodeNumberField';
import { useValueContextMenu } from '../hooks/useValueContextMenu';
import {
  speedToSlider, sliderToSpeed, stepVarispeed, stepVarispeedFine, formatVarispeedPercent,
  VARISPEED_MIN, VARISPEED_MAX,
} from './VarispeedControl';
import '../BpmStepper/BpmStepper.css';
import './VarispeedControl.css';

/** "001"–"300": the percent zero-padded to three, so the face never changes width */
export const formatVarispeedDigits3 = (speed: number) => String(speedToSlider(speed)).padStart(3, '0');

const HOLD_INITIAL_DELAY = 320;
const HOLD_REPEAT_INTERVAL = 65;

export interface VarispeedTimecodeProps {
  /** The speed the engine runs at */
  speed: number;
  /** Whether play-at-speed is on — the speed is not 1× (a marker only) */
  enabled: boolean;
  /** A speed set — typed, stepped, reset; 1× is off */
  onChange: (speed: number) => void;
  /** The 0 key's A/B: 100% ↔ the last speed that was not. A click on
   *  "Speed" calls it; without it the click goes to 100% */
  onToggle?: () => void;
}

export function VarispeedTimecode({ speed, enabled, onChange, onToggle }: VarispeedTimecodeProps) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  // The hold repeats from the speed it has reached, not the one it began at
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // BpmStepper's dark variant, token for token
  const style = {
    '--timecode-bg': '#212433',
    '--timecode-text': '#f4f5f9',
    '--timecode-hover': '#4a5068',
    '--timecode-border': 'transparent',
    '--timecode-unit-bg': '#212433',
    '--timecode-unit-text': '#c5c6cd',
    '--timecode-unit-hover-bg': '#4a5068',
    '--timecode-unit-hover-text': '#f4f5f9',
    '--focus-color': theme.border.focus,
    // THE LAMP (2026-11-11): "Speed" lit in the ACCENT (blue) while the
    // speed is not 100% — a lamp on the LCD (amber first, "perhaps the accent colour instead")
    '--varispeed-lamp': theme.accent.primary,
  } as React.CSSProperties;

  const percent = formatVarispeedPercent(speed);
  const atMin = speed <= VARISPEED_MIN + 0.0005;
  const atMax = speed >= VARISPEED_MAX - 0.0005;

  const beginEdit = () => {
    setDraft(padDigits(speedToSlider(speed), 3));
    setEditing(true);
  };
  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) onChange(sliderToSpeed(parsed));
    setEditing(false);
  };

  const valueMenu = useValueContextMenu({ onEnterValue: beginEdit, onReset: () => onChange(1), resetLabel: '100%' });

  const stepBy = (direction: 1 | -1) => {
    const next = stepVarispeed(speedRef.current, direction);
    speedRef.current = next;
    onChange(next);
  };
  const stopHold = () => {
    if (holdTimerRef.current !== null) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdIntervalRef.current !== null) { window.clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }
  };
  const startHold = (direction: 1 | -1) => {
    stepBy(direction);
    holdTimerRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => stepBy(direction), HOLD_REPEAT_INTERVAL);
    }, HOLD_INITIAL_DELAY);
  };
  useEffect(() => stopHold, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? stepVarispeedFine : stepVarispeed;
      onChange(step(speed, e.key === 'ArrowUp' ? 1 : -1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      beginEdit();
    }
  };

  const arrow = (direction: 1 | -1) => (
    <button
      type="button"
      className={`bpm-stepper__arrow bpm-stepper__arrow--${direction > 0 ? 'up' : 'down'}`}
      aria-label={direction > 0 ? 'Faster' : 'Slower'}
      tabIndex={-1}
      disabled={direction > 0 ? atMax : atMin}
      onPointerDown={(e) => { e.preventDefault(); startHold(direction); }}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
    >
      <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
        <path d={direction > 0 ? 'M4 0L8 6H0L4 0Z' : 'M4 6L0 0H8L4 6Z'} fill="currentColor" />
      </svg>
    </button>
  );

  return (
    <div
      className="bpm-stepper varispeed-timecode"
      style={style}
      data-varispeed
      data-varispeed-timecode
      data-varispeed-active={enabled ? 'true' : undefined}
      role="spinbutton"
      aria-label={`Playback speed ${percent}`}
      aria-valuemin={1}
      aria-valuemax={300}
      aria-valuenow={speedToSlider(speed)}
      aria-valuetext={percent}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={valueMenu.onContextMenu}
    >
      {valueMenu.menu}
      <div className="bpm-stepper__display" data-varispeed-display onDoubleClick={(e) => { e.preventDefault(); beginEdit(); }}>
        <span
          className="varispeed-timecode__toggle"
          data-varispeed-label
          // One toggle per press: the second click of a double-click is not
          // another, and a double-click here is not the text field
          onClick={(e) => { if (e.detail > 1) return; if (onToggle) onToggle(); else onChange(1); }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <TimeCodeUnit unit="speed" className="varispeed-timecode__name" />
        </span>
        {editing ? (
          <TimeCodeNumberField
            className="bpm-stepper__input"
            ariaLabel="Type a speed in percent"
            draft={draft}
            digits={3}
            onDraftChange={setDraft}
            onCommit={commitDraft}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="bpm-stepper__cells varispeed-timecode__digits" aria-hidden="true">
            <TimeCodeNumber value={speedToSlider(speed)} digits={3} min={1} max={300} onChange={(n) => onChange(sliderToSpeed(n))} />
          </span>
        )}
        <TimeCodeUnit unit="percent" />
      </div>
      <div className="bpm-stepper__arrows">
        {arrow(1)}
        {arrow(-1)}
      </div>
    </div>
  );
}

export default VarispeedTimecode;
