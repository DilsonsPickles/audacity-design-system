/**
 * VarispeedControl — the toolbar's playback-speed control (user request
 * 2026-10-07, "a varispeed playback option").
 *
 * SINCE 2026-10-15 IT IS THE FIGMA "1.1 - Simple slider" THIRD ROW
 * (14 - Playback, 36:320 — "build the speed slider one with % readout
 * at fixed width so toolbar doesn't jump around"), placed BEFORE the
 * timecode: three parts on the toolbar, left to right —
 *   - the "Speed" CAPTION, as the Snap label is: a `span`, never
 *     pressable ("I don't want the word to be pressable", 2026-10-14) and
 *     never lit — NOTHING MARKS THE ON STATE (2026-10-15: an amber tint
 *     on the readout and the timecode, "I don't like colour change", then
 *     a 1px outline on the readout, "I don't like" — both dropped the
 *     same day; the thumb off its mark and the number are the state, as
 *     the Figma row draws it) — ON IS THE VALUE NOT
 *     BEING 100% ("the slider is popular because we can say, if it's
 *     different… then it's on", 2026-10-14 — no checkbox, no switch;
 *     the host derives `enabled` from the speed);
 *   - the SLIDER — the design system's Slider, the track header's volume
 *     slider's track, fill and 16px handle, 72px wide, with the 100% MARK
 *     under it a third of the way along: the thumb's place is the state,
 *     off the mark is visibly on, and a mouse DRAG within DETENT_SPEED of
 *     100% lands on 100% (off);
 *   - the READOUT — plain text in PERCENT ("100%"), the unit the clip
 *     properties panel's speed already uses, at a FIXED WIDTH so "87%"
 *     and "300%" take the same room and the timecode after it never
 *     shuffles. It takes keyboard focus: ↑ ↓ step a tenth
 *     (Shift a hundredth), Enter or a double-click opens "Enter value…"
 *     (ManualValueDialog, %), which the right-click menu also offers
 *     beside "Reset to 100%". NO WHEEL ("let's lose the scroll on the
 *     number readout", 2026-10-14): a scroll over the toolbar never
 *     changes the speed.
 * Until then (2026-10-14) the number was the timecode's digit cells on a
 * dark face after the timecode — two LCDs side by side read as one
 * instrument, and the speed is not a time; before that a split chip in
 * the transport group (2026-10-07).
 *
 * THE SLIDER IS AUDACITY 3'S ("in terms of scale being linear or w/e we
 * just stick to Audacity 3", 2026-10-07 — AU3's SPEED_SLIDER in
 * ASlider.cpp): LINEAR from 0.01× to 3.0× in hundredths — whole percents,
 * so the readout is exact. Tape-style, as AU3's: the pitch follows the
 * speed; no preserve-pitch.
 *
 * Session state, not a preference.
 */
import React from 'react';
import { useTheme } from '../ThemeProvider';
import { Slider } from '../Slider';
import { useValueContextMenu } from '../hooks/useValueContextMenu';
import { ManualValueDialog } from '../ManualValueDialog/ManualValueDialog';
import './VarispeedControl.css';

/** AU3's range: SPEED_SLIDER 0.01..3.0 */
export const VARISPEED_MIN = 0.01;
export const VARISPEED_MAX = 3;
/** What a switch would turn on to before the user has set a speed — the
 *  transcriber's half speed (the chip days; kept for hosts) */
export const VARISPEED_DEFAULT_SPEED = 0.5;
export const VARISPEED_PRESETS: ReadonlyArray<{ label: string; speed: number }> = [
  { label: '½×', speed: 0.5 },
  { label: '1×', speed: 1 },
  { label: '2×', speed: 2 },
];

const clampSpeed = (speed: number) => Math.max(VARISPEED_MIN, Math.min(VARISPEED_MAX, speed));
/** The slider is linear in hundredths of a speed (1–300) — whole percents */
export const speedToSlider = (speed: number) => Math.round(clampSpeed(speed) * 100);
export const sliderToSpeed = (v: number) => clampSpeed(v / 100);
/** Where 1× sits along the track, as a fraction — the marker's place */
export const VARISPEED_UNITY_FRACTION = (1 - VARISPEED_MIN) / (VARISPEED_MAX - VARISPEED_MIN);
/** The readout: whole percents — "100%", "87%", "300%" (2026-10-15) */
export const formatVarispeedPercent = (speed: number) => `${speedToSlider(speed)}%`;
/** AU3's "%.3fx" form, for hosts that still say it in × */
export const formatVarispeed = (speed: number) => `${speed.toFixed(3)}×`;
/** The digits alone of the × form */
export const formatVarispeedDigits = (speed: number) => speed.toFixed(3);
/** A typed value: "0.875", "0,875", "0.875×", "87.5%" — null when it is not a number */
export const parseVarispeed = (text: string): number | null => {
  const t = text.trim();
  if (t === '') return null;
  const percent = /%\s*$/.test(t);
  const n = Number(t.replace(',', '.').replace(/\s*[×x%]\s*$/i, ''));
  return Number.isFinite(n) ? clampSpeed(percent ? n / 100 : n) : null;
};

/** The speed one arrow step away: a tenth of a speed, on the tenths grid */
export const stepVarispeed = (speed: number, notches: number) => clampSpeed((Math.round(speed * 10) + notches) / 10);
/** The fine step (Shift+arrow): a hundredth of a speed per step, on the hundredths grid */
export const stepVarispeedFine = (speed: number, notches: number) => clampSpeed((Math.round(speed * 100) + notches) / 100);
/** The detent: a mouse drag this close to 1× lands on 1× (the 0.9–1.1 band) */
export const DETENT_SPEED = 0.1;

export interface VarispeedControlProps {
  /** The speed the engine runs at — what the readout reads */
  speed: number;
  /** Whether play-at-speed is on — the host derives it: the speed is not 1× */
  enabled: boolean;
  /** A speed SET — the slider, a typed value; 1× is off */
  onChange: (speed: number) => void;
  /** A speed turned to by the arrow keys — the same value; a separate
   *  name from the chip days, hosts may pass onChange */
  onDial: (speed: number) => void;
}

export function VarispeedControl({ speed, enabled, onChange, onDial }: VarispeedControlProps) {
  const { theme } = useTheme();
  const draggingRef = React.useRef(false);
  // Right-click anywhere on the control: "Enter value…" (ManualValueDialog,
  // %, the range) / "Reset to 100%" (2026-10-15)
  const [manualOpen, setManualOpen] = React.useState(false);
  const valueMenu = useValueContextMenu({ onEnterValue: () => setManualOpen(true), onReset: () => onChange(1), resetLabel: '100%' });

  const style = {
    '--focus-color': theme.border.focus,
    '--varispeed-text': theme.foreground.text.primary,
    '--varispeed-mark': theme.foreground.text.primary,
    // The 1× mark's x on the 72px Slider: its 16px handle keeps inside the
    // track (left = f·W − f·16), so the handle's centre at 1× is f·(72−16)+8
    '--varispeed-unity': `${Math.round((VARISPEED_UNITY_FRACTION * (72 - 16) + 8) * 10) / 10}px`,
  } as React.CSSProperties;
  const percent = formatVarispeedPercent(speed);
  return (
    <span
      className="varispeed"
      style={style}
      data-varispeed
      data-varispeed-active={enabled ? 'true' : undefined}
      onContextMenu={valueMenu.onContextMenu}
    >
      {valueMenu.menu}
      <ManualValueDialog
        isOpen={manualOpen}
        title="Playback speed"
        label="Speed"
        value={speedToSlider(speed)}
        unit="%"
        min={1}
        max={300}
        step={1}
        decimals={0}
        hint="1% to 300%; 100% is normal"
        onApply={(v) => onChange(sliderToSpeed(v))}
        onClose={() => setManualOpen(false)}
      />
      {/* A CAPTION, NOT A BUTTON, NOT A STATE: the word names the readout;
          the slider and the readout are the controls */}
      <span className="varispeed__label" data-varispeed-label aria-hidden="true">Speed</span>
      {/* THE SLIDER WITH A DETENT: AU3's linear 0.01–3 track with the 100%
          mark a third of the way along; a mouse drag within DETENT_SPEED
          of 1× snaps to it (drag only — the keys step through), so
          letting go near normal lands on normal, which is off. */}
      <span
        className="varispeed__track"
        data-varispeed-track
        onPointerDownCapture={() => { draggingRef.current = true; }}
        onPointerUpCapture={() => { draggingRef.current = false; }}
        onPointerCancelCapture={() => { draggingRef.current = false; }}
      >
        <Slider
          value={speedToSlider(speed)}
          min={1}
          max={300}
          ariaLabel={`Playback speed ${percent}`}
          className="varispeed__slider"
          onChange={(v) => {
            const next = sliderToSpeed(v);
            onChange(draggingRef.current && Math.abs(next - 1) <= DETENT_SPEED ? 1 : next);
          }}
        />
        <span className="varispeed__unity" data-varispeed-unity aria-hidden="true" />
      </span>
      {/* THE READOUT: percent, plain text, fixed width (the Figma third row) */}
      <span
        className="varispeed__readout"
        data-varispeed-display
        role="group"
        aria-label={`Playback speed ${percent}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? stepVarispeedFine : stepVarispeed;
            onDial(step(speed, e.key === 'ArrowUp' ? 1 : -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            setManualOpen(true);
          }
        }}
        onDoubleClick={() => setManualOpen(true)}
      >
        {percent}
      </span>
    </span>
  );
}
