/**
 * PlaybackMeterFlyout — the toolbar's volume button opens it (the Figma
 * "Playback meter" flyout, 01 - Audacity Component library 5128:18161;
 * 2026-11-04, "we need to build this flyout for the playback meter"): a
 * 360-wide `Flyout` of radio groups in bordered form wells — POSITION
 * (Top bar (horizontal) / Side bar (vertical)), then METER STYLE (Default
 * / RMS / Gradient) and METER TYPE (Logarithmic (dB) / Linear (dB) /
 * Linear (amp)) side by side, and a dB RANGE dropdown (36…144). It
 * replaces the volume button's two-item context menu; the docked vertical
 * meter's volume button opens the same flyout, to its left (the design's
 * vertical variant, the arrow on the right edge).
 *
 * Figma's strokes are inside the shape, so the card pads 11 within its 1px
 * border (the mic flyout's measure) and the wells carry their own border.
 */
import React from 'react';
import { useTheme } from '../ThemeProvider';
import { Flyout, type FlyoutDirection } from '../Flyout';
import { LabeledRadio } from '../LabeledRadio';
import { Dropdown } from '../Dropdown';
import { MasterMeter } from '../MasterMeter';
import {
  PLAYBACK_METER_DB_RANGES,
  type PlaybackMeterLook,
  type PlaybackMeterDbRange,
  type PlaybackMeterStyle,
  type PlaybackMeterType,
} from '../utils/meterLook';
import './PlaybackMeterFlyout.css';

/** Where the playback meter lives — the 'flyout' home (meter inside this
 *  popover) matches the mic meter; 'horizontal' is the top-bar meter,
 *  'vertical' the right-hand dock. */
export type PlaybackMeterPosition = 'flyout' | 'horizontal' | 'vertical';

export interface PlaybackMeterFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  /** The anchor in viewport px — for 'down' the button's middle and bottom,
   *  for 'left' the button's left edge and middle */
  x: number;
  y: number;
  direction?: FlyoutDirection;
  /** The button, for focus to return to on Escape */
  triggerRef?: React.RefObject<HTMLElement>;
  position: PlaybackMeterPosition;
  onPositionChange: (position: PlaybackMeterPosition) => void;
  look: PlaybackMeterLook;
  onLookChange: (look: PlaybackMeterLook) => void;
  /** The live meter, shown in the flyout only while position === 'flyout'
   *  (on the toolbar or docked, that meter carries these itself) */
  levelLeft?: number;
  levelRight?: number;
  clippedLeft?: boolean;
  clippedRight?: boolean;
  recentPeakLeft?: number;
  recentPeakRight?: number;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

const STYLES: Array<{ value: PlaybackMeterStyle; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'rms', label: 'RMS' },
  { value: 'gradient', label: 'Gradient' },
];
const TYPES: Array<{ value: PlaybackMeterType; label: string }> = [
  { value: 'log-db', label: 'Logarithmic (dB)' },
  { value: 'linear-db', label: 'Linear (dB)' },
  { value: 'linear-amp', label: 'Linear (amp)' },
];
const POSITIONS: Array<{ value: PlaybackMeterPosition; label: string }> = [
  { value: 'flyout', label: 'In flyout' },
  { value: 'horizontal', label: 'Top bar (horizontal)' },
  { value: 'vertical', label: 'Side bar (vertical)' },
];

export function PlaybackMeterFlyout({
  isOpen, onClose, x, y, direction = 'down', triggerRef, position, onPositionChange, look, onLookChange,
  levelLeft = -60, levelRight = -60, clippedLeft = false, clippedRight = false,
  recentPeakLeft, recentPeakRight, volume = 1, onVolumeChange,
}: PlaybackMeterFlyoutProps) {
  const { theme } = useTheme();
  const style = {
    '--pmf-text': theme.foreground.text.primary,
    '--pmf-border': theme.border.default,
    '--pmf-well': theme.background.surface.inset,
  } as React.CSSProperties;

  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      x={x}
      y={y}
      direction={direction}
      triggerRef={triggerRef}
      ariaLabel="Playback meter"
      className="playback-meter-flyout"
      style={style}
    >
      <div className="playback-meter-flyout__body">
        <div className="playback-meter-flyout__group" role="radiogroup" aria-label="Position">
          <div className="playback-meter-flyout__label">Position</div>
          <div className="playback-meter-flyout__well">
            {POSITIONS.map((p) => (
              <LabeledRadio
                key={p.value}
                name="playback-meter-position"
                value={p.value}
                label={p.label}
                checked={position === p.value}
                onChange={() => { onPositionChange(p.value); onClose(); }}
              />
            ))}
          </div>
        </div>
        {/* The live meter lives here only while the meter is 'In flyout';
            on the toolbar or docked it carries its own slider. */}
        {position === 'flyout' && (
          <div className="playback-meter-flyout__group">
            <div className="playback-meter-flyout__label">Playback level</div>
            <div className="playback-meter-flyout__meter-well">
              <MasterMeter
                levelLeft={levelLeft}
                levelRight={levelRight}
                clippedLeft={clippedLeft}
                clippedRight={clippedRight}
                recentPeakLeft={recentPeakLeft}
                recentPeakRight={recentPeakRight}
                volume={volume}
                onVolumeChange={onVolumeChange}
                look={look}
                resizable={false}
              />
            </div>
          </div>
        )}
        <div className="playback-meter-flyout__columns">
          <div className="playback-meter-flyout__group" role="radiogroup" aria-label="Meter style">
            <div className="playback-meter-flyout__label">Meter style</div>
            <div className="playback-meter-flyout__well">
              {STYLES.map((s) => (
                <LabeledRadio
                  key={s.value}
                  name="playback-meter-style"
                  value={s.value}
                  label={s.label}
                  checked={look.style === s.value}
                  onChange={() => onLookChange({ ...look, style: s.value })}
                />
              ))}
            </div>
          </div>
          <div className="playback-meter-flyout__group" role="radiogroup" aria-label="Meter type">
            <div className="playback-meter-flyout__label">Meter type</div>
            <div className="playback-meter-flyout__well">
              {TYPES.map((t) => (
                <LabeledRadio
                  key={t.value}
                  name="playback-meter-type"
                  value={t.value}
                  label={t.label}
                  checked={look.type === t.value}
                  onChange={() => onLookChange({ ...look, type: t.value })}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="playback-meter-flyout__group">
          <div className="playback-meter-flyout__label" id="playback-meter-db-range-label">dB range</div>
          <Dropdown
            options={PLAYBACK_METER_DB_RANGES.map((r) => ({ value: String(r), label: String(r) }))}
            value={String(look.dbRange)}
            onChange={(value) => onLookChange({ ...look, dbRange: Number(value) as PlaybackMeterDbRange })}
            width="100%"
          />
        </div>
      </div>
    </Flyout>
  );
}

export default PlaybackMeterFlyout;
