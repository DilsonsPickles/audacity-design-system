import { TransportToolbar, type TransportToolbarProps } from '@dilsonspickles/components';
import { useLoopRegionContext } from '../contexts/LoopRegionContext';
import type { UseMasterMeterReturn } from '../hooks/useMasterMeter';

/**
 * Playback, mode toggles, zoom, and export-action wiring — everything on
 * the transport toolbar that isn't snap, timecode, master meter, or the
 * drag gripper (grouped separately below since each maps to its own
 * hook/concern in App.tsx).
 */
export type TransportToolbarContainerTransport = Pick<TransportToolbarProps,
  | 'activeMenuItem' | 'workspace'
  | 'isPlaying' | 'isRecording' | 'onPlay' | 'onStop' | 'onRecord'
  | 'useSplitRecordButton' | 'rollInTimeEnabled' | 'onToggleRollInTime'
  | 'timeSelection' | 'bpm' | 'onBpmChange' | 'beatsPerMeasure' | 'noteValue' | 'onTimeSignatureChange'
  | 'envelopeMode' | 'spectrogramMode' | 'splitMode' | 'onToggleEnvelope' | 'onToggleSpectrogram' | 'onToggleSplit'
  | 'onZoomIn' | 'onZoomOut' | 'onZoomToSelection' | 'onZoomToFitProject' | 'onZoomToggle'
  | 'onShareClick' | 'onExportAudioClick' | 'onExportLoopRegionClick'
>;

export type TransportToolbarContainerSnap = Pick<TransportToolbarProps,
  | 'snapEnabled' | 'onToggleSnap'
  | 'snapSubdivision' | 'onSnapSubdivisionChange'
  | 'snapTriplet' | 'onToggleSnapTriplet'
  | 'snapMode' | 'onSnapModeChange'
>;

export type TransportToolbarContainerTimecode = Pick<TransportToolbarProps,
  'currentTime' | 'timeCodeFormat' | 'onTimeCodeChange' | 'onTimeCodeFormatChange'
>;

/**
 * The useMasterMeter() hook's return threaded whole, plus meter
 * orientation — owned by App.tsx as local state because it also
 * decides whether the vertical MasterMeterVertical side-panel renders
 * outside the toolbar.
 */
export type TransportToolbarContainerMasterMeter = UseMasterMeterReturn & {
  meterOrientation: NonNullable<TransportToolbarProps['meterOrientation']>;
  onMeterOrientationChange: NonNullable<TransportToolbarProps['onMeterOrientationChange']>;
};

export interface TransportToolbarContainerGripper {
  onGripperMouseDown: NonNullable<TransportToolbarProps['onGripperMouseDown']>;
}

export interface TransportToolbarContainerProps {
  transport: TransportToolbarContainerTransport;
  snap: TransportToolbarContainerSnap;
  timecode: TransportToolbarContainerTimecode;
  masterMeter: TransportToolbarContainerMasterMeter;
  gripper: TransportToolbarContainerGripper;
}

/**
 * Wraps TransportToolbar for App.tsx's three render slots (docked top,
 * docked bottom, floating). Groups the ~40 values App.tsx used to close
 * over into a handful of cohesive object props instead of drilling them
 * individually.
 *
 * Loop-region props (loopRegionEnabled/Start/End + setters) come from
 * LoopRegionContext rather than a prop group — LoopRegionProvider wraps
 * all three render slots in App.tsx, and its value is the exact same
 * `loopRegion` object App.tsx's own state would otherwise destructure,
 * so this is a value-identical read with no behavior change.
 */
export function TransportToolbarContainer({
  transport,
  snap,
  timecode,
  masterMeter,
  gripper,
}: TransportToolbarContainerProps) {
  const {
    loopRegionEnabled, loopRegionStart, loopRegionEnd,
    setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd,
  } = useLoopRegionContext();

  return (
    <TransportToolbar
      {...transport}
      {...snap}
      {...timecode}
      loopRegionEnabled={loopRegionEnabled}
      loopRegionStart={loopRegionStart}
      loopRegionEnd={loopRegionEnd}
      setLoopRegionEnabled={setLoopRegionEnabled}
      setLoopRegionStart={setLoopRegionStart}
      setLoopRegionEnd={setLoopRegionEnd}
      masterLevelLeft={masterMeter.masterLevelLeft}
      masterLevelRight={masterMeter.masterLevelRight}
      masterClippedLeft={masterMeter.masterLevelLeft >= 0}
      masterClippedRight={masterMeter.masterLevelRight >= 0}
      masterVolume={masterMeter.masterVolume}
      onMasterVolumeChange={masterMeter.handleMasterVolumeChange}
      meterOrientation={masterMeter.meterOrientation}
      onMeterOrientationChange={masterMeter.onMeterOrientationChange}
      onGripperMouseDown={gripper.onGripperMouseDown}
    />
  );
}
