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
 *   - the DISPLAY: the remembered speed as bold Lato digits ("0.500") with
 *     a "×" unit chip. A click (or Enter / Space with the focus) TYPES A
 *     VALUE, as the BPM display does ("what if I wanted to enter a very
 *     specific value?", 2026-10-14): Enter commits (clamped to the range)
 *     and switches on, Escape reverts. The wheel over it dials the speed
 *     (a tenth per notch, Shift a hundredth, up = faster) and never
 *     switches on; ↑ ↓ with the focus do the same.
 *   - the CARET: the popover with the slider, the value and ½× / 1× / 2×.
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
 * THE WHEEL turns the DIAL ONLY ("you think scrolling should turn it
 * on?", 2026-10-07 — trackpad inertia or a scroll meant for the canvas
 * would silently engage a playback mode); the UP gesture = faster, a
 * positive deltaY under macOS natural scrolling. Session state, not a
 * preference.
 */
import React from 'react';
import { ContextMenu } from '../ContextMenu';
import { Icon } from '../Icon';
import { Slider } from '../Slider';
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

/** The speed one wheel notch away: a tenth of a speed, on the tenths grid */
export const stepVarispeed = (speed: number, notches: number) => clampSpeed((Math.round(speed * 10) + notches) / 10);
/** The fine step (Shift+wheel, "a fine tune precise change", 2026-10-07):
 *  a hundredth of a speed per notch, on the hundredths grid */
export const stepVarispeedFine = (speed: number, notches: number) => clampSpeed((Math.round(speed * 100) + notches) / 100);
/** Wheel travel per notch — trackpads deliver many small deltas, mice one
 *  large one; both accumulate to steps of this many pixels */
const WHEEL_NOTCH_PX = 24;

export interface VarispeedControlProps {
  /** The remembered speed — what the display reads, and what the switch turns on to */
  speed: number;
  /** Whether play-at-speed is on — the host derives it: the speed is not 1× */
  enabled: boolean;
  /** A speed SET — the popover's slider or a preset, or a value typed into
   *  the display; 1× is off */
  onChange: (speed: number) => void;
  /** A speed turned to by the wheel or the arrow keys — the same value;
   *  a separate name from the chip days, hosts may pass onChange */
  onDial: (speed: number) => void;
}

export function VarispeedControl({ speed, enabled, onChange, onDial }: VarispeedControlProps) {
  const { theme } = useTheme();
  const displayRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const caretRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const close = React.useCallback(() => setOpen(false), []);
  // Ref-mirror (see CLAUDE.md): the wheel listener is native — React's
  // onWheel is passive and cannot preventDefault — bound once, reading
  // the live speed and handler through refs.
  const liveRef = React.useRef({ speed, onDial });
  React.useEffect(() => { liveRef.current = { speed, onDial }; }, [speed, onDial]);
  React.useEffect(() => {
    const display = displayRef.current;
    if (!display) return;
    let travel = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Shift turns a mouse wheel's vertical delta horizontal (Chromium,
      // macOS); read whichever axis carries it
      const delta = e.deltaY !== 0 ? e.deltaY : e.shiftKey ? e.deltaX : 0;
      // deltaMode 1 = lines (Firefox mice): a line is a notch
      travel += e.deltaMode === 1 ? delta * WHEEL_NOTCH_PX : delta;
      const notches = Math.trunc(travel / WHEEL_NOTCH_PX);
      if (notches === 0) return;
      travel -= notches * WHEEL_NOTCH_PX;
      // Shift = the fine step, a hundredth per notch
      const step = e.shiftKey ? stepVarispeedFine : stepVarispeed;
      // The UP gesture = faster: a POSITIVE deltaY under macOS natural
      // scrolling, the default ("you'd think scrolling up would make it
      // faster", 2026-10-07)
      liveRef.current.onDial(step(liveRef.current.speed, notches));
    };
    display.addEventListener('wheel', onWheel, { passive: false });
    return () => display.removeEventListener('wheel', onWheel);
  }, []);
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
    '--varispeed-on-bg': theme.background.control.button.primary.idle,
    '--varispeed-on-hover-bg': theme.background.control.button.primary.hover,
    '--focus-color': theme.border.focus,
    '--varispeed-label-text': theme.foreground.text.primary,
    // The Slider keeps its 16px thumb inside the track (centre at
    // f·(W−16)+8, not f·W), so the mark takes the thumb's formula and
    // sits under it at exactly 1×
    '--varispeed-unity': `calc(${VARISPEED_UNITY_FRACTION * 100}% - ${VARISPEED_UNITY_FRACTION * 16 - 8}px)`,
  } as React.CSSProperties;
  const presetPressed = (preset: number) => Math.abs(speed - preset) < 0.0005;
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
        role="spinbutton"
        aria-label="Playback speed"
        aria-valuemin={VARISPEED_MIN}
        aria-valuemax={VARISPEED_MAX}
        aria-valuenow={speed}
        aria-valuetext={formatVarispeed(speed)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (editing) return;
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? stepVarispeedFine : stepVarispeed;
            onDial(step(speed, e.key === 'ArrowUp' ? 1 : -1));
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            beginEdit();
          }
        }}
      >
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
            tabIndex={-1}
            aria-hidden="true"
            onClick={beginEdit}
          >
            {formatVarispeedDigits(speed)}
          </button>
        )}
        <TimeCodeUnit unit="times" />
      </div>
      <button
        ref={caretRef}
        type="button"
        className="varispeed__caret"
        aria-label="Playback speed options"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          const r = caretRef.current?.parentElement?.getBoundingClientRect();
          if (r) setPos({ x: r.left, y: r.bottom + 4 });
          setOpen((o) => !o);
        }}
      >
        <Icon name="caret-down" size={14} />
      </button>
      </span>
      <ContextMenu isOpen={open} onClose={close} x={pos.x} y={pos.y} className="varispeed__menu">
        <div className="varispeed__panel" role="group" aria-label="Playback speed" data-varispeed-panel>
          <div className="varispeed__row">
            <span className="varispeed__title">Playback speed</span>
            <span className="varispeed__value" data-varispeed-value>{formatVarispeed(speed)}</span>
          </div>
          <div className="varispeed__slider">
            <Slider value={speedToSlider(speed)} min={1} max={300} ariaLabel="Playback speed" onChange={(v) => onChange(sliderToSpeed(v))} />
            <span className="varispeed__unity" data-varispeed-unity aria-hidden="true" />
          </div>
          <div className="varispeed__presets">
            {VARISPEED_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="varispeed__preset"
                data-varispeed-preset={p.speed}
                aria-pressed={presetPressed(p.speed)}
                onClick={() => onChange(p.speed)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </ContextMenu>
    </span>
  );
}
