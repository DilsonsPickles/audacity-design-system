/**
 * MicrophoneLevelFlyout — the toolbar's microphone button opens it (the
 * Figma "MicrophoneLevel", 04 - Main toolbar 2072:26892; 2026-11-04, "it's a
 * flyout when you click on the microphone levels button in the toolbar"):
 * "Microphone level", the input meter with its level knob in a bordered
 * well, and "Adjust the level of your OS configured microphone" — a
 * `Flyout` hung under the button, its arrow on the button's middle, 360
 * wide. The meter is the toolbar's own `MasterMeter`, fixed width.
 *
 * The level is READ, not passed: `getLevelDb` is polled once a frame while
 * the flyout is open, so a live meter re-renders the flyout alone, never
 * the toolbar it hangs from. The mic is one channel, so both rows read it;
 * the tick is the recent peak, held 3 s.
 *
 * UNDER IT, THE MIC'S TWO SETTINGS (the same day, "and now we have the
 * following options"): the hint reads "Note: this control is tied to your
 * computer's main mic volume", then a divider and two checkboxes — "Turn on
 * input monitoring (hear yourself while recording)" and "Show mic metering
 * when not recording" — the preferences `enableInputMonitoring` and
 * `showMicMetering`, the same two the track menu's Meters & monitoring and
 * Preferences › Playback & recording show.
 */
import React from 'react';
import { useTheme } from '../ThemeProvider';
import { Flyout } from '../Flyout';
import { MasterMeter } from '../MasterMeter';
import { LabeledCheckbox } from '../LabeledCheckbox';
import { LabeledRadio } from '../LabeledRadio';
import { useInputLevel } from './useInputLevel';
import './MicrophoneLevelFlyout.css';

/** Where the microphone meter lives — mirrors the playback meter, with an
 *  extra 'flyout' home (the meter stays in this popover, nothing persists
 *  on the toolbar). 'horizontal' puts it on the toolbar beside the mic
 *  button; 'vertical' docks it to the right as RecordingMeterVertical. */
export type MicrophoneMeterOrientation = 'flyout' | 'horizontal' | 'vertical';

const POSITIONS: Array<{ value: MicrophoneMeterOrientation; label: string }> = [
  { value: 'flyout', label: 'In flyout' },
  { value: 'horizontal', label: 'Top bar (horizontal)' },
  { value: 'vertical', label: 'Side bar (vertical)' },
];

export interface MicrophoneLevelFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  /** Anchor — the button's horizontal middle and its bottom edge, viewport px */
  x: number;
  y: number;
  /** The button, for focus to return to on Escape */
  triggerRef?: React.RefObject<HTMLElement>;
  /** The input level in dB right now (null = no microphone open) — polled each frame */
  getLevelDb?: () => number | null;
  /** The input gain, linear (1 = as the OS delivers it) */
  gain: number;
  onGainChange: (gain: number) => void;
  /** Where the meter lives (default 'flyout') and the picker's callback */
  orientation?: MicrophoneMeterOrientation;
  onOrientationChange?: (orientation: MicrophoneMeterOrientation) => void;
  /** Hear yourself while recording */
  inputMonitoring?: boolean;
  onInputMonitoringChange?: (on: boolean) => void;
  /** Meter the mic when not recording */
  micMetering?: boolean;
  onMicMeteringChange?: (on: boolean) => void;
}

export function MicrophoneLevelFlyout({
  isOpen, onClose, x, y, triggerRef, getLevelDb, gain, onGainChange,
  orientation = 'flyout', onOrientationChange,
  inputMonitoring = false, onInputMonitoringChange, micMetering = true, onMicMeteringChange,
}: MicrophoneLevelFlyoutProps) {
  const { theme } = useTheme();
  // Polled only while the meter is actually shown here (open AND in the
  // flyout) — when it lives on the toolbar or docked, that meter polls
  const { level, peak } = useInputLevel(getLevelDb, isOpen && orientation === 'flyout');

  // Changing the position dismisses the flyout — the playback meter
  // flyout's rule, every pick (the meter then lives where you chose it).
  const pickOrientation = (next: MicrophoneMeterOrientation) => {
    onOrientationChange?.(next);
    onClose();
  };

  const style = {
    '--mlf-text': theme.foreground.text.primary,
    '--mlf-border': theme.border.default,
    '--mlf-well': theme.background.surface.inset,
  } as React.CSSProperties;

  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      x={x}
      y={y}
      direction="down"
      triggerRef={triggerRef}
      ariaLabel="Microphone level"
      className="microphone-level-flyout"
      style={style}
    >
      <div className="microphone-level-flyout__body">
        {onOrientationChange && (
          <div className="microphone-level-flyout__group" role="radiogroup" aria-label="Position">
            <div className="microphone-level-flyout__label">Position</div>
            <div className="microphone-level-flyout__position">
              {POSITIONS.map((p) => (
                <LabeledRadio
                  key={p.value}
                  name="microphone-meter-position"
                  value={p.value}
                  label={p.label}
                  checked={orientation === p.value}
                  onChange={() => pickOrientation(p.value)}
                />
              ))}
            </div>
          </div>
        )}
        {/* The meter and its gain knob live HERE only when the meter is in
            the flyout; on the toolbar or docked, the meter carries its own
            slider, so the popover is just the Position picker and the
            settings below (the playback meter flyout's shape). */}
        {orientation === 'flyout' && (
          <>
            <div className="microphone-level-flyout__title">Microphone level</div>
            <div className="microphone-level-flyout__well">
              <MasterMeter
                levelLeft={level}
                levelRight={level}
                clippedLeft={level >= 0}
                clippedRight={level >= 0}
                recentPeakLeft={peak}
                recentPeakRight={peak}
                volume={gain}
                onVolumeChange={onGainChange}
                resizable={false}
                ariaLabel="Microphone meter"
                sliderAriaLabel="Microphone level"
              />
            </div>
            <div className="microphone-level-flyout__hint">Note: this control is tied to your computer’s main mic volume</div>
          </>
        )}
        <div className="microphone-level-flyout__divider" role="separator" />
        <div className="microphone-level-flyout__options">
          <LabeledCheckbox
            label="Turn on input monitoring (hear yourself while recording — use headphones)"
            checked={inputMonitoring}
            onChange={(checked) => onInputMonitoringChange?.(checked)}
          />
          <LabeledCheckbox
            label="Show mic metering when not recording"
            checked={micMetering}
            onChange={(checked) => onMicMeteringChange?.(checked)}
          />
        </div>
      </div>
    </Flyout>
  );
}

export default MicrophoneLevelFlyout;
