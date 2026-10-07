/**
 * VarispeedControl — the toolbar's playback-speed control (user request
 * 2026-10-07, "a varispeed playback option"; the chip became a TOGGLE the
 * same day, "try the chip toggle" — Logic's Varispeed button, not AU3's
 * second play button): a split chip reading the remembered speed
 * ("0.50×") whose VALUE half switches varispeed on and off, and whose
 * CARET half opens a popover with a slider from ¼× to 4× (log, 1× in
 * the middle), the value, and ½× / 1× / 2× presets. Off, playback runs
 * at 1× whatever the chip reads; on, the chip is lit. Setting a speed in
 * the popover switches it on; the presets are speeds, nothing more — 1×
 * is a speed like the others, the CHIP is the only switch ("there's some
 * weird logic where 1× turns it off", the same day). Varispeed is
 * tape-style: the pitch follows the speed (the engine scales its tempo
 * and every player's rate). A WHEEL on the value half steps the speed
 * ("what if we scroll on the button?", the same day): one notch is a
 * SEMITONE of pitch, up = faster, on the semitone grid — so twelve
 * notches from ½× land exactly on 1× — and it switches varispeed on,
 * as the slider does. Session state, not a preference.
 */
import React from 'react';
import { ContextMenu } from '../ContextMenu';
import { Icon } from '../Icon';
import { Slider } from '../Slider';
import { useTheme } from '../ThemeProvider';
import './VarispeedControl.css';

export const VARISPEED_MIN = 0.25;
export const VARISPEED_MAX = 4;
/** What the chip switches on to before the user has set a speed — the
 *  transcriber's half speed, so the first press does something useful */
export const VARISPEED_DEFAULT_SPEED = 0.5;
export const VARISPEED_PRESETS: ReadonlyArray<{ label: string; speed: number }> = [
  { label: '½×', speed: 0.5 },
  { label: '1×', speed: 1 },
  { label: '2×', speed: 2 },
];

/** Slider position (0–100) ↔ speed, log-scaled so 1× sits at 50 and each
 *  quarter of the travel is an octave of speed */
export const sliderToSpeed = (v: number) => VARISPEED_MIN * 2 ** (Math.max(0, Math.min(100, v)) / 25);
export const speedToSlider = (speed: number) => Math.round(Math.log2(Math.max(VARISPEED_MIN, Math.min(VARISPEED_MAX, speed)) / VARISPEED_MIN) * 25);
export const formatVarispeed = (speed: number) => `${speed.toFixed(2)}×`;

/** The speed one wheel notch away: a semitone (a twelfth of an octave)
 *  up or down, snapped to the semitone grid from 1× and clamped */
export const stepVarispeed = (speed: number, notches: number) => {
  const semitones = Math.round(12 * Math.log2(speed)) + notches;
  return Math.max(VARISPEED_MIN, Math.min(VARISPEED_MAX, 2 ** (semitones / 12)));
};
/** Wheel travel per notch — trackpads deliver many small deltas, mice one
 *  large one; both accumulate to steps of this many pixels */
const WHEEL_NOTCH_PX = 24;

export interface VarispeedControlProps {
  /** The remembered speed — what the chip reads, and what it switches on to */
  speed: number;
  /** Whether varispeed is on; off, playback runs at 1× whatever `speed` is */
  enabled: boolean;
  /** A speed set in the popover (slider, preset) or by the wheel; the
   *  host stores it and switches varispeed on */
  onChange: (speed: number) => void;
  /** The chip's press (toggle) */
  onEnabledChange: (enabled: boolean) => void;
}

export function VarispeedControl({ speed, enabled, onChange, onEnabledChange }: VarispeedControlProps) {
  const { theme } = useTheme();
  const chipRef = React.useRef<HTMLButtonElement>(null);
  const caretRef = React.useRef<HTMLButtonElement>(null);
  // Ref-mirror (see CLAUDE.md): the wheel listener is native — React's
  // onWheel is passive and cannot preventDefault — bound once, reading
  // the live speed and handler through refs.
  const liveRef = React.useRef({ speed, onChange });
  React.useEffect(() => { liveRef.current = { speed, onChange }; }, [speed, onChange]);
  React.useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    let travel = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaMode 1 = lines (Firefox mice): a line is a notch
      travel += e.deltaMode === 1 ? e.deltaY * WHEEL_NOTCH_PX : e.deltaY;
      const notches = Math.trunc(travel / WHEEL_NOTCH_PX);
      if (notches === 0) return;
      travel -= notches * WHEEL_NOTCH_PX;
      // Wheel up (negative deltaY) = faster
      liveRef.current.onChange(stepVarispeed(liveRef.current.speed, -notches));
    };
    chip.addEventListener('wheel', onWheel, { passive: false });
    return () => chip.removeEventListener('wheel', onWheel);
  }, []);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const close = React.useCallback(() => setOpen(false), []);
  const style = {
    '--varispeed-off-bg': theme.background.control.button.secondary.idle,
    '--varispeed-off-hover-bg': theme.background.control.button.secondary.hover,
    '--varispeed-off-pressed-bg': theme.background.control.button.secondary.active,
    '--varispeed-off-text': theme.foreground.text.primary,
    '--varispeed-on-bg': theme.background.control.button.primary.idle,
    '--varispeed-on-hover-bg': theme.background.control.button.primary.hover,
    '--varispeed-on-text': '#FFFFFF',
  } as React.CSSProperties;
  const presetPressed = (preset: number) => Math.abs(speed - preset) < 0.005;
  return (
    <span
      className="varispeed"
      style={style}
      data-varispeed
      data-varispeed-active={enabled ? 'true' : undefined}
    >
      <button
        ref={chipRef}
        type="button"
        className="varispeed__chip"
        aria-label="Varispeed"
        aria-pressed={enabled}
        onClick={() => onEnabledChange(!enabled)}
      >
        {formatVarispeed(speed)}
      </button>
      <button
        ref={caretRef}
        type="button"
        className="varispeed__caret"
        aria-label="Varispeed options"
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
      <ContextMenu isOpen={open} onClose={close} x={pos.x} y={pos.y} className="varispeed__menu">
        <div className="varispeed__panel" role="group" aria-label="Varispeed" data-varispeed-panel>
          <div className="varispeed__row">
            <span className="varispeed__title">Varispeed</span>
            <span className="varispeed__value" data-varispeed-value>{formatVarispeed(speed)}</span>
          </div>
          <div className="varispeed__slider">
            <Slider value={speedToSlider(speed)} min={0} max={100} onChange={(v) => onChange(sliderToSpeed(v))} />
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

export default VarispeedControl;
