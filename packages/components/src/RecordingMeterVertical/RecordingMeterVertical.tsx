/**
 * RecordingMeterVertical — the microphone's meter DOCKED TO THE RIGHT, as
 * the playback meter can be (2026-11-04, "make it so I can dock recording
 * meter to the right, like the playback meter"): the vertical meter's
 * frame (`MasterMeterVertical`) with the mic button at its head, the one
 * microphone read into both rows, the knob the INPUT GAIN — the flyout's
 * knob, so the dock and the flyout move one value. The level is polled a
 * frame at a time while mounted (`useInputLevel`), so the dock re-renders
 * itself alone; the tick is the recent peak, held 3 s.
 */
import React from 'react';
import { MasterMeterVertical } from '../MasterMeterVertical';
import { useInputLevel } from '../MicrophoneLevelFlyout/useInputLevel';

export interface RecordingMeterVerticalProps {
  /** The input level in dB right now (null = no microphone open) — polled each frame */
  getLevelDb?: () => number | null;
  /** The input gain, linear (1 = as the OS delivers it) */
  gain: number;
  onGainChange: (gain: number) => void;
  /** The mic button at the meter's head opens the orientation menu — the
   *  way back to the flyout — on a click (under the button) or a
   *  right-click (at the pointer) */
  onSettingsMenu?: (x: number, y: number) => void;
  className?: string;
}

export function RecordingMeterVertical({
  getLevelDb, gain, onGainChange, onSettingsMenu, className,
}: RecordingMeterVerticalProps) {
  const { level, peak } = useInputLevel(getLevelDb, true);
  return (
    <MasterMeterVertical
      className={`recording-meter-vertical ${className ?? ''}`}
      icon="microphone"
      settingsAriaLabel="Microphone level"
      sliderAriaLabel="Microphone level"
      levelLeft={level}
      levelRight={level}
      clippedLeft={level >= 0}
      clippedRight={level >= 0}
      recentPeakLeft={peak}
      recentPeakRight={peak}
      volume={gain}
      onVolumeChange={onGainChange}
      onSettingsMenu={onSettingsMenu}
    />
  );
}

export default RecordingMeterVertical;
