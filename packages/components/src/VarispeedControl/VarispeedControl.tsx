/**
 * VarispeedControl — the toolbar's playback-speed control (user request
 * 2026-10-07, "a varispeed playback option"; the chip became a TOGGLE the
 * same day, "try the chip toggle" — Logic's Varispeed button, not AU3's
 * second play button): a split chip reading the remembered speed
 * ("0.50×") whose VALUE half switches varispeed on and off, and whose
 * CARET half opens a popover with a slider from ¼× to 4× (log, 1× in
 * the middle), the value, and ½× / 1× / 2× presets. Off, playback runs
 * at 1× whatever the chip reads; on, the chip is lit. Setting a speed in
 * the popover switches it on; the 1× preset switches it off and keeps
 * the remembered speed, so the next press brings it back. Varispeed is
 * tape-style: the pitch follows the speed (the engine scales its tempo
 * and every player's rate). Session state, not a preference.
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
const isUnity = (speed: number) => Math.abs(speed - 1) < 0.005;

export interface VarispeedControlProps {
  /** The remembered speed — what the chip reads, and what it switches on to */
  speed: number;
  /** Whether varispeed is on; off, playback runs at 1× whatever `speed` is */
  enabled: boolean;
  /** A speed set in the popover (slider or ½× / 2× preset); the host
   *  stores it and switches varispeed on */
  onChange: (speed: number) => void;
  /** The chip's press (toggle) and the 1× preset (off) */
  onEnabledChange: (enabled: boolean) => void;
}

export function VarispeedControl({ speed, enabled, onChange, onEnabledChange }: VarispeedControlProps) {
  const { theme } = useTheme();
  const caretRef = React.useRef<HTMLButtonElement>(null);
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
  /** The presets name states, not just amounts: ½× and 2× are "on at
   *  that speed", 1× is "off" (or on at 1×, which sounds the same) */
  const presetPressed = (preset: number) => (isUnity(preset) ? !enabled || isUnity(speed) : enabled && Math.abs(speed - preset) < 0.005);
  return (
    <span
      className="varispeed"
      style={style}
      data-varispeed
      data-varispeed-active={enabled ? 'true' : undefined}
    >
      <button
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
            <span className="varispeed__value" data-varispeed-value>{enabled ? formatVarispeed(speed) : 'Off'}</span>
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
                onClick={() => (isUnity(p.speed) ? onEnabledChange(false) : onChange(p.speed))}
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
