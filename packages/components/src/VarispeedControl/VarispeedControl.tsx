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
 *     bold Lato digits ("0.500") with a "×" unit chip. A click on the
 *     digits TYPES A VALUE, as the BPM display does ("what if I wanted to
 *     enter a very specific value?", 2026-10-14): Enter commits (clamped
 *     to the range), Escape reverts. ↑ ↓ with the digits focused step a
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
import { TimeCodeUnit } from '../TimeCode/TimeCodeUnit';
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
  const inputRef = React.useRef<HTMLInputElement>(null);
  const sliderRef = React.useRef<HTMLInputElement>(null);
  const draggingRef = React.useRef(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  // Typing: the input mounts, then takes the focus with its text selected
  React.useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
    return () => cancelAnimationFrame(id);
  }, [editing]);
  const beginEdit = () => { setDraft(formatVarispeedDigits(speed)); setEditing(true); };
  const commitDraft = () => {
    const parsed = parseVarispeed(draft);
    if (parsed !== null) onChange(parsed);
    setEditing(false);
  };
  const cancelEdit = () => setEditing(false);

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
    // The 1× mark's x on the 72px mini slider: the native 10px thumb keeps
    // inside the track, so its centre at 1× is f·(72−10)+5
    '--varispeed-unity': `${Math.round((VARISPEED_UNITY_FRACTION * (72 - 10) + 5) * 10) / 10}px`,
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
      <span className="varispeed__face">
      <div
        ref={displayRef}
        className="varispeed__display"
        data-varispeed-display
        role="group"
        aria-label="Playback speed"
        onKeyDown={(e) => {
          // ↑ ↓ with the digits focused step a tenth (the slider's own
          // arrows step it a hundredth)
          if (editing || e.target === sliderRef.current) return;
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? stepVarispeedFine : stepVarispeed;
            onDial(step(speed, e.key === 'ArrowUp' ? 1 : -1));
          }
        }}
      >
        {/* THE MINI SLIDER WITH A DETENT (2026-10-14, "I'm stumped" → "a
            slider with a detent: its position IS the state, off-centre is
            visibly on, and a thumb is unmistakably something you drag" —
            REAPER's Rate slider, the tape machine's varispeed pot with its
            centre click): AU3's linear 0.01–3 track with the 1× mark a
            third of the way along; a mouse drag within DETENT_SPEED of 1×
            snaps to it (Dan's sticky 1×, pr-12271: drag only — the keys and
            the wheel step through), so letting go near normal lands on
            normal, which is off. */}
        <span className="varispeed__track" data-varispeed-track>
          <input
            ref={sliderRef}
            type="range"
            className="varispeed__slider"
            data-varispeed-slider
            min={1}
            max={300}
            step={1}
            value={speedToSlider(speed)}
            aria-label="Playback speed"
            aria-valuetext={formatVarispeed(speed)}
            onPointerDown={() => { draggingRef.current = true; }}
            onPointerUp={() => { draggingRef.current = false; }}
            onPointerCancel={() => { draggingRef.current = false; }}
            onChange={(e) => {
              const v = sliderToSpeed(Number(e.target.value));
              onChange(draggingRef.current && Math.abs(v - 1) <= DETENT_SPEED ? 1 : v);
            }}
          />
          <span className="varispeed__unity" data-varispeed-unity aria-hidden="true" />
        </span>
        {editing ? (
          <input
            ref={inputRef}
            className="varispeed__input"
            data-varispeed-input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commitDraft(); }
              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
            }}
          />
        ) : (
          <button
            type="button"
            className="varispeed__digits"
            data-varispeed-readout
            aria-label={`Playback speed ${formatVarispeed(speed)}, type a value`}
            onClick={beginEdit}
          >
            {formatVarispeedDigits(speed)}
          </button>
        )}
        <TimeCodeUnit unit="times" />
      </div>
      </span>
    </span>
  );
}
