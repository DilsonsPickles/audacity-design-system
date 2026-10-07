/**
 * VarispeedControl — the toolbar's playback-speed control (user request
 * 2026-10-07, "a varispeed playback option"): a chip reading the speed
 * ("1.00×") that opens a popover with a slider from ¼× to 4× (log, 1×
 * in the middle), the value, and ½× / 1× / 2× presets. Varispeed is
 * tape-style: the pitch follows the speed (the engine scales its tempo
 * and every player's rate). Session state, not a preference.
 */
import React from 'react';
import { Button } from '../Button';
import { ContextMenu } from '../ContextMenu';
import { Slider } from '../Slider';
import './VarispeedControl.css';

export const VARISPEED_MIN = 0.25;
export const VARISPEED_MAX = 4;
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

export interface VarispeedControlProps {
  speed: number;
  onChange: (speed: number) => void;
}

export function VarispeedControl({ speed, onChange }: VarispeedControlProps) {
  const chipRef = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const close = React.useCallback(() => setOpen(false), []);
  const atSpeed = Math.abs(speed - 1) < 0.005;
  return (
    <span ref={chipRef} className="varispeed" data-varispeed data-varispeed-active={atSpeed ? undefined : 'true'}>
      <Button
        variant="secondary"
        size="default"
        className="varispeed__chip"
        onClick={() => {
          const r = chipRef.current?.getBoundingClientRect();
          if (r) setPos({ x: r.left, y: r.bottom + 4 });
          setOpen((o) => !o);
        }}
      >
        {formatVarispeed(speed)}
      </Button>
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
                aria-pressed={Math.abs(speed - p.speed) < 0.005}
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
