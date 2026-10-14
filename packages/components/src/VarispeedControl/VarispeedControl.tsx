/**
 * VarispeedControl — the toolbar's playback-speed control (user request
 * 2026-10-07, "a varispeed playback option").
 *
 * SINCE 2026-10-14 IT IS A READOUT IN THE TIMECODE'S FAMILY ("our timecode
 * is rendered with a dark black background, perhaps our play-at-speed
 * could join that family?", then "in all other DAWs this is kept away
 * from the play button and more towards timecode" — Logic's Varispeed is
 * a section of its LCD): the dark face the timecode, BPM and time
 * signature share, placed with them after the timecode, not among the
 * transport buttons. Three parts, left to right:
 *   - the "Speed" CAPTION, on the toolbar beside the dark face as the
 *     Snap label is, lit in the primary tone while play-at-speed is on —
 *     and ON IS THE VALUE NOT BEING 1× ("the slider is popular because
 *     we can say, if it's different… then it's on", 2026-10-14, after
 *     an hour with a separate switch segment: "it's so unclear what
 *     button is turning it on" — no checkbox, no switch; the host
 *     derives `enabled` from the speed). The word is NOT pressable
 *     (the same day); back to 1× is the popover's 1× preset, or typing 1.
 *   - the DISPLAY, on the dark face: the MINI SLIDER with its 1× mark —
 *     the thumb's place is the state, off the mark is visibly on, and a
 *     drag near the mark snaps to it (DETENT_SPEED) — then the speed as
 *     the TIMECODE'S DIGIT CELLS ("0.500", one TimeCodeDigit per digit,
 *     a "." and a "×" unit chip — "make the number units like the other
 *     timecode", 2026-10-14): a click on a digit edits THAT digit, as the
 *     timecode does (0–9 set it and move on, ↑ ↓ wrap it, ← → move,
 *     Enter / Escape / a click outside leave), every change committing at
 *     once — which is the "very specific value" (0.875 is three
 *     keystrokes). ↑ ↓ with the box focused and no digit active step a
 *     tenth (Shift a hundredth); the slider's own arrows step a hundredth.
 *     NO WHEEL ("let's lose the scroll on the number readout", 2026-10-14):
 *     the chip's wheel went with the chip — a scroll over the toolbar
 *     should never change the speed.
 *   The popover with the big slider and the ½× / 1× / 2× presets is gone
 *   with the caret (the same day): the slider is on the face now.
 * Until then it was a split CHIP in the transport group (Logic's button
 * model), whose value half was the switch; it read a bare "0.500×" until
 * the "Speed" label of the same day.
 *
 * THE SLIDER IS AUDACITY 3'S ("in terms of scale being linear or w/e we
 * just stick to Audacity 3", 2026-10-07 — AU3's SPEED_SLIDER in
 * ASlider.cpp): LINEAR from 0.01× to 3.0×, continuous, the readout to
 * three decimals ("1.000×", AU3's "%.3fx"), 1× marked on the track.
 * Tape-style, as AU3's: the pitch follows the speed; no preserve-pitch
 * (Dan Fabulich's AU4 branch pr-12271 has one, default off).
 *
 * Session state, not a preference.
 */
import React from 'react';
import { useTheme } from '../ThemeProvider';
import { Slider } from '../Slider';
import { TimeCodeUnit } from '../TimeCode/TimeCodeUnit';
import { TimeCodeDigit } from '../TimeCode/TimeCodeDigit';
import './VarispeedControl.css';

/** AU3's range: SPEED_SLIDER 0.01..3.0 */
export const VARISPEED_MIN = 0.01;
export const VARISPEED_MAX = 3;
/** What the switch turns on to before the user has set a speed — the
 *  transcriber's half speed, so the first press does something useful */
export const VARISPEED_DEFAULT_SPEED = 0.5;
export const VARISPEED_PRESETS: ReadonlyArray<{ label: string; speed: number }> = [
  { label: '½×', speed: 0.5 },
  { label: '1×', speed: 1 },
  { label: '2×', speed: 2 },
];

const clampSpeed = (speed: number) => Math.max(VARISPEED_MIN, Math.min(VARISPEED_MAX, speed));
/** The slider is linear in hundredths of a speed (1–300), so a slider
 *  step is the fine step and the thumb sits where the speed is */
export const speedToSlider = (speed: number) => Math.round(clampSpeed(speed) * 100);
export const sliderToSpeed = (v: number) => clampSpeed(v / 100);
/** Where 1× sits along the track, as a fraction — the marker's place */
export const VARISPEED_UNITY_FRACTION = (1 - VARISPEED_MIN) / (VARISPEED_MAX - VARISPEED_MIN);
export const formatVarispeed = (speed: number) => `${speed.toFixed(3)}×`;
/** The digits alone, the "×" being the unit chip */
export const formatVarispeedDigits = (speed: number) => speed.toFixed(3);
/** A typed value: "0.875", "0,875", "0.875×", "0.875 x" — null when it is not a number */
export const parseVarispeed = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.').replace(/\s*[×x]\s*$/i, ''));
  return Number.isFinite(n) && text.trim() !== '' ? clampSpeed(n) : null;
};

/** The speed one arrow step away: a tenth of a speed, on the tenths grid */
export const stepVarispeed = (speed: number, notches: number) => clampSpeed((Math.round(speed * 10) + notches) / 10);
/** The fine step (Shift+arrow, "a fine tune precise change", 2026-10-07):
 *  a hundredth of a speed per step, on the hundredths grid */
export const stepVarispeedFine = (speed: number, notches: number) => clampSpeed((Math.round(speed * 100) + notches) / 100);
/** The detent: a mouse drag this close to 1× lands on 1× (the 0.9–1.1 band) */
export const DETENT_SPEED = 0.1;

export interface VarispeedControlProps {
  /** The remembered speed — what the display reads, and what the switch turns on to */
  speed: number;
  /** Whether play-at-speed is on — the host derives it: the speed is not 1× */
  enabled: boolean;
  /** A speed SET — the popover's slider or a preset, or a value typed into
   *  the display; 1× is off */
  onChange: (speed: number) => void;
  /** A speed turned to by the arrow keys — the same value; a separate
   *  name from the chip days, hosts may pass onChange */
  onDial: (speed: number) => void;
}

export function VarispeedControl({ speed, enabled, onChange, onDial }: VarispeedControlProps) {
  const { theme } = useTheme();
  const displayRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  // DIGIT-BY-DIGIT EDITING, THE TIMECODE'S (2026-10-14, "make the number
  // units like the other timecode" — one digit per cell, TimeCodeDigit):
  // a click on a digit makes it the active cell; 0–9 set it and move on,
  // ↑ ↓ wrap it 0–9, ← → move, Enter / Escape / a click outside leave;
  // every change commits at once through onChange (the timecode's rule),
  // clamped to the range. The digits are "d.ddd": indices 0..3.
  const [editingDigit, setEditingDigit] = React.useState<number | null>(null);
  const [hoverDigit, setHoverDigit] = React.useState<number | null>(null);
  const digitRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const speedRef = React.useRef(speed);
  React.useEffect(() => { speedRef.current = speed; }, [speed]);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  /** The four digits of "d.ddd" */
  const digitsOf = (v: number) => formatVarispeedDigits(v).replace('.', '').split('');
  const speedFromDigits = (d: string[]) => clampSpeed(Number(`${d[0]}.${d[1]}${d[2]}${d[3]}`));
  const setDigit = (index: number, digit: string) => {
    const d = digitsOf(speedRef.current);
    d[index] = digit;
    onChangeRef.current(speedFromDigits(d));
  };
  const focusDigit = (index: number) => {
    setEditingDigit(index);
    digitRefs.current[index]?.focus();
  };
  React.useEffect(() => {
    if (editingDigit === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') { setEditingDigit(null); return; }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault(); e.stopPropagation();
        setDigit(editingDigit, e.key);
        if (editingDigit < 3) focusDigit(editingDigit + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        const cur = Number(digitsOf(speedRef.current)[editingDigit]);
        setDigit(editingDigit, String(e.key === 'ArrowUp' ? (cur + 1) % 10 : (cur + 9) % 10));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); e.stopPropagation();
        focusDigit((editingDigit + 1) % 4);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); e.stopPropagation();
        focusDigit((editingDigit + 3) % 4);
      } else if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        setEditingDigit(null);
        displayRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (displayRef.current && !displayRef.current.contains(e.target as Node)) setEditingDigit(null);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onClick, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDigit]);

  // The timecode's own tokens, as BpmStepper takes them — the family's face
  const style = {
    '--timecode-bg': theme.background.control.timecode.idle,
    '--timecode-text': '#f4f5f9',
    '--timecode-hover': '#4a5068',
    '--timecode-unit-bg': theme.background.control.timecode.idle,
    '--timecode-unit-text': '#c5c6cd',
    '--timecode-unit-hover-bg': '#4a5068',
    '--timecode-unit-hover-text': '#f4f5f9',
    // THE ON COLOUR IS AMBER (2026-10-14, "while I like the colour change,
    // the blue is awful"): the theme's secondary accent — the master
    // track's gold, the tape machine's varispeed lamp, Logic's orange LCD
    '--varispeed-on-bg': theme.accent.secondary,
    '--varispeed-on-hover-bg': theme.semantic.warning.border,
    '--focus-color': theme.border.focus,
    '--varispeed-label-text': theme.foreground.text.primary,
    '--varispeed-mark': theme.foreground.text.primary,
    // The 1× mark's x on the 72px Slider: its 16px handle keeps inside the
    // track (left = f·W − f·16), so the handle's centre at 1× is f·(72−16)+8
    '--varispeed-unity': `${Math.round((VARISPEED_UNITY_FRACTION * (72 - 16) + 8) * 10) / 10}px`,
  } as React.CSSProperties;
  return (
    <span
      className="varispeed"
      style={style}
      data-varispeed
      data-varispeed-active={enabled ? 'true' : undefined}
    >
      {/* A CAPTION, NOT A BUTTON (2026-10-14, "I don't want the word to be
          pressable"): the word names the readout and lights while a
          speed is on; the value is the only control */}
      <span className="varispeed__label" data-varispeed-label aria-hidden="true">Speed</span>
      {/* THE MINI SLIDER WITH A DETENT, ON THE TOOLBAR beside the caption — not on the dark face, which holds the number alone (2026-10-14, "perhaps the slider ought to be not in the black background, just the text but in the same one input number per box dealio"); "I'm stumped" → "a
          slider with a detent: its position IS the state, off-centre is
          visibly on, and a thumb is unmistakably something you drag" —
          REAPER's Rate slider, the tape machine's varispeed pot with its
          centre click): AU3's linear 0.01–3 track with the 1× mark a
          third of the way along; a mouse drag within DETENT_SPEED of 1×
          snaps to it (Dan's sticky 1×, pr-12271: drag only — the keys and
          the wheel step through), so letting go near normal lands on
          normal, which is off. */}
      <span
        className="varispeed__track"
        data-varispeed-track
        // The detent is a DRAG's: pointer down/up on the slider's input
        onPointerDownCapture={() => { draggingRef.current = true; }}
        onPointerUpCapture={() => { draggingRef.current = false; }}
        onPointerCancelCapture={() => { draggingRef.current = false; }}
      >
        {/* The design system's Slider — the track header's volume slider
            ("make the slider look like the other sliders in app",
            2026-10-14): its track, fill and 16px handle, 72px wide here */}
        <Slider
          value={speedToSlider(speed)}
          min={1}
          max={300}
          ariaLabel={`Playback speed ${formatVarispeed(speed)}`}
          className="varispeed__slider"
          onChange={(v) => {
            const next = sliderToSpeed(v);
            onChange(draggingRef.current && Math.abs(next - 1) <= DETENT_SPEED ? 1 : next);
          }}
        />
        <span className="varispeed__unity" data-varispeed-unity aria-hidden="true" />
      </span>
      <span className="varispeed__face">
      <div
        ref={displayRef}
        className="varispeed__display"
        data-varispeed-display
        role="group"
        aria-label={`Playback speed ${formatVarispeed(speed)}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (editingDigit !== null) return;
          // With the box focused and no digit active: ↑ ↓ step a tenth
          // (Shift a hundredth), Enter starts editing at the first digit
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? stepVarispeedFine : stepVarispeed;
            onDial(step(speed, e.key === 'ArrowUp' ? 1 : -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            focusDigit(0);
          }
        }}
      >
        {digitsOf(speed).map((digit, i) => (
          <React.Fragment key={i}>
            {i === 1 && <TimeCodeUnit unit="period" />}
            <TimeCodeDigit
              ref={(el) => { digitRefs.current[i] = el; }}
              value={digit}
              state={editingDigit === i ? 'active' : hoverDigit === i ? 'hover' : 'default'}
              onClick={() => focusDigit(i)}
              onMouseEnter={() => setHoverDigit(i)}
              onMouseLeave={() => setHoverDigit(null)}
              tabIndex={-1}
              className="varispeed__digit"
            />
          </React.Fragment>
        ))}
        <TimeCodeUnit unit="times" />
      </div>
      </span>
    </span>
  );
}
