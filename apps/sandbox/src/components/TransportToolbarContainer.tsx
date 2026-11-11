import React from 'react';
import { TransportTools, usePreferences, type TransportToolbarProps } from '@audacity-ui/components';
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
  | 'layoutEditing' | 'onLayoutEditingChange' | 'onResetLayout' | 'layoutCustomised'
  | 'isPlaying' | 'isRecording' | 'onPlay' | 'onStop' | 'onRecord' | 'onSkipToStart' | 'onSkipToEnd'
  | 'useSplitRecordButton' | 'rollInTimeEnabled' | 'onToggleRollInTime'
  | 'timeSelection' | 'bpm' | 'onBpmChange' | 'beatsPerMeasure' | 'noteValue' | 'onTimeSignatureChange'
  | 'envelopeMode' | 'spectrogramMode' | 'splitMode' | 'onToggleEnvelope' | 'onToggleSpectrogram' | 'onToggleSplit'
  | 'onZoomIn' | 'onZoomOut' | 'onZoomToSelection' | 'onZoomToFitProject' | 'onZoomToggle' | 'onCollapseTracks' | 'onExpandTracks' | 'onFitTracksToHeight'
  | 'onShareClick' | 'onExportAudioClick' | 'onExportLoopRegionClick'
  | 'varispeed' | 'varispeedOn' | 'onVarispeedChange' | 'onVarispeedDial' | 'onVarispeedToggle' | 'varispeedStyle' | 'preservePitch' | 'onPreservePitchChange'
  | 'getMicrophoneLevelDb' | 'microphoneGain' | 'onMicrophoneGainChange' | 'onMicrophoneLevelsOpen'
  | 'recordingMeterOrientation' | 'onRecordingMeterOrientationChange'
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
  meterLook: NonNullable<TransportToolbarProps['meterLook']>;
  onMeterLookChange: NonNullable<TransportToolbarProps['onMeterLookChange']>;
};

export interface TransportToolbarContainerProps {
  transport: TransportToolbarContainerTransport;
  snap: TransportToolbarContainerSnap;
  timecode: TransportToolbarContainerTimecode;
  masterMeter: TransportToolbarContainerMasterMeter;
  /** The editor, whose ToolbarDocks draw the tools (2026-11-09) */
  children?: React.ReactNode;
}

/**
 * Wraps TransportTools — the toolbar's state, flyouts and TOOL REGISTRY —
 * around the editor, whose ToolbarDocks draw the tools wherever the
 * layout puts them (2026-11-09, custom toolbars; it wrapped the one
 * TransportToolbar for App's docked / floating slots until then). Groups
 * the ~40 values App.tsx used to close over into a handful of cohesive
 * object props instead of drilling them individually.
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
  children,
}: TransportToolbarContainerProps) {
  const {
    loopRegionEnabled, loopRegionStart, loopRegionEnd,
    setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd,
  } = useLoopRegionContext();

  // The cog's Customise toolbar popover: which tools are hidden lives in
  // the preferences blob (2026-10-07)
  const { preferences, updatePreference } = usePreferences();
  const hiddenTools = preferences.toolbarHiddenTools;
  const toggleTool = (id: string) => updatePreference(
    'toolbarHiddenTools',
    hiddenTools.includes(id) ? hiddenTools.filter((t) => t !== id) : [...hiddenTools, id],
  );

  return (
    <TransportTools
      hiddenTools={hiddenTools}
      onToggleToolVisibility={toggleTool}
      // The mic flyout's two settings ARE the preferences (2026-11-04) — the
      // same two as Preferences › Playback & recording and the track menu
      microphoneInputMonitoring={preferences.enableInputMonitoring}
      onMicrophoneInputMonitoringChange={(on) => updatePreference('enableInputMonitoring', on)}
      microphoneMetering={preferences.showMicMetering}
      onMicrophoneMeteringChange={(on) => updatePreference('showMicMetering', on)}
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
      masterRecentPeakLeft={masterMeter.masterRecentPeak}
      masterRecentPeakRight={masterMeter.masterRecentPeak}
      masterVolume={masterMeter.masterVolume}
      onMasterVolumeChange={masterMeter.handleMasterVolumeChange}
      meterOrientation={masterMeter.meterOrientation}
      onMeterOrientationChange={masterMeter.onMeterOrientationChange}
      meterLook={masterMeter.meterLook}
      onMeterLookChange={masterMeter.onMeterLookChange}
    >
      {children}
    </TransportTools>
  );
}
