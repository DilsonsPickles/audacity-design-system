import React from 'react';
import { ToolbarButtonGroup } from '../Toolbar/Toolbar';
import { ToolbarDock, type ToolMeta } from '../ToolbarDock';
import { defaultToolbarLayout, EXPORT_TOOLBAR_LAYOUT, type BarPlacement, type ToolbarLayout, type ToolbarOrientation } from '../utils/toolbarLayout';
import { TransportButton } from '../TransportButton';
import { ToolButton } from '../ToolButton';
import { ToggleToolButton } from '../ToggleToolButton';
import { TimeCode, type TimeCodeFormat } from '../TimeCode';
import { BpmStepper } from '../BpmStepper';
import { barSeconds } from '../utils/musicalTime';
import { TimeSignatureSelector, type TimeSignature } from '../TimeSignatureSelector';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { CustomiseToolbarMenu } from '../CustomiseToolbarMenu';
import { VarispeedControl } from '../VarispeedControl';
import { ContextMenuItem } from '../ContextMenuItem';
import { Checkbox } from '../Checkbox';
import { MasterMeter } from '../MasterMeter';
import { MasterMeterVertical } from '../MasterMeterVertical';
import type { FlyoutDirection } from '../Flyout';
import { MicrophoneLevelFlyout, type MicrophoneMeterOrientation } from '../MicrophoneLevelFlyout';
import { useInputLevel } from '../MicrophoneLevelFlyout/useInputLevel';
import { PlaybackMeterFlyout, type PlaybackMeterPosition } from '../PlaybackMeterFlyout';
import { DEFAULT_PLAYBACK_METER_LOOK, type PlaybackMeterLook } from '../utils/meterLook';
import { useTheme } from '../ThemeProvider';
import type { SnapGrid } from '@audacity-ui/core';

export type SnapMode =
  | 'musical'
  | 'seconds'
  | 'deciseconds'
  | 'centiseconds'
  | 'milliseconds'
  | 'samples'
  | 'video-24fps'
  | 'video-29.97fps'
  | 'video-30fps'
  | 'video-25fps'
  | 'cdda-75fps';

export type Workspace = 'classic' | 'spectral-editing' | 'modern' | 'music';

export interface TransportToolbarProps {
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';
  workspace: Workspace;
  /** Tools hidden from the toolbar (CustomiseToolbarMenu ids — the
   *  cog's popover, 2026-10-07); absent = every tool shows */
  hiddenTools?: ReadonlyArray<string>;
  /** A row of the cog's popover was pressed: show or hide that tool */
  onToggleToolVisibility?: (id: string) => void;
  /** The remembered varispeed, what the chip reads (2026-10-07) */
  varispeed?: number;
  /** Whether play-at-speed is on (the speed is not 1×) — marks the control; nothing changes colour */
  varispeedOn?: boolean;
  /** A speed set in the chip's popover; the host stores it and switches on */
  onVarispeedChange?: (speed: number) => void;
  /** A speed turned to by the wheel on the chip; stored, the switch untouched */
  onVarispeedDial?: (speed: number) => void;
  /** The chip's press and the 1× preset */
  onVarispeedToggle?: (on: boolean) => void;

  // Playback
  isPlaying: boolean;
  isRecording: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  /** Skip-to-start transport button (playhead to 0) */
  onSkipToStart?: () => void;
  /** Skip-to-end transport button (playhead to the end of the project) */
  onSkipToEnd?: () => void;
  useSplitRecordButton?: boolean;
  rollInTimeEnabled?: boolean;
  onToggleRollInTime?: () => void;
  snapEnabled?: boolean;
  onToggleSnap?: () => void;
  snapSubdivision?: SnapGrid['subdivision'];
  onSnapSubdivisionChange?: (subdivision: SnapGrid['subdivision']) => void;
  snapTriplet?: boolean;
  onToggleSnapTriplet?: () => void;
  snapMode?: SnapMode;
  onSnapModeChange?: (mode: SnapMode) => void;

  // Loop
  loopRegionEnabled: boolean;
  loopRegionStart: number | null;
  loopRegionEnd: number | null;
  setLoopRegionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setLoopRegionStart: React.Dispatch<React.SetStateAction<number | null>>;
  setLoopRegionEnd: React.Dispatch<React.SetStateAction<number | null>>;
  timeSelection: { startTime: number; endTime: number } | null;
  bpm: number;
  onBpmChange?: (bpm: number) => void;
  beatsPerMeasure: number;
  noteValue?: number;
  onTimeSignatureChange?: (signature: TimeSignature) => void;
  onGripperMouseDown?: (event: React.MouseEvent, toolbarRect: DOMRect) => void;

  // Mode toggles
  envelopeMode: boolean;
  spectrogramMode: boolean;
  /** Split-tool toggle (S key); when on, clicking a clip splits it. */
  splitMode?: boolean;
  onToggleEnvelope: () => void;
  onToggleSpectrogram: () => void;
  onToggleSplit?: () => void;

  // Zoom
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToSelection: () => void;
  onZoomToFitProject: () => void;
  onZoomToggle: () => void;
  /** TRACK HEIGHT BUTTONS (2026-10-20, "new toolbar buttons for expand/collapse track height" — "it should be ALL tracks"): the keyboard's ⌘⇧C / ⌘⇧X as buttons — EVERY track to 44 / 114 */
  onCollapseTracks?: () => void;
  onExpandTracks?: () => void;
  /** Fit tracks to height — with Collapse / Expand in the track-height group, not the zoom tools (2026-10-22) */
  onFitTracksToHeight?: () => void;

  // TimeCode
  currentTime: number;
  timeCodeFormat: TimeCodeFormat;
  onTimeCodeChange: (newTime: number) => void;
  onTimeCodeFormatChange: (format: TimeCodeFormat) => void;

  // Export actions
  onShareClick: () => void;
  onExportAudioClick: () => void;
  onExportLoopRegionClick: () => void;

  // Master meter
  masterLevelLeft?: number;
  masterLevelRight?: number;
  masterClippedLeft?: boolean;
  masterClippedRight?: boolean;
  masterRecentPeakLeft?: number;
  masterRecentPeakRight?: number;
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;

  /** The microphone button's flyout (2026-11-04): the input level in dB right
   *  now, polled each frame while the flyout is open (null = no mic open) */
  getMicrophoneLevelDb?: () => number | null;
  /** The microphone's input gain, linear (1 = as the OS delivers it) */
  microphoneGain?: number;
  onMicrophoneGainChange?: (gain: number) => void;
  /** The flyout opened — the host opens the microphone if it is not */
  onMicrophoneLevelsOpen?: () => void;
  /** The flyout's two settings (2026-11-04): hear yourself while recording,
   *  and meter the mic when not recording */
  microphoneInputMonitoring?: boolean;
  onMicrophoneInputMonitoringChange?: (on: boolean) => void;
  microphoneMetering?: boolean;
  onMicrophoneMeteringChange?: (on: boolean) => void;

  /**
   * Current orientation of the master meter. 'horizontal' = button + meter
   * on the toolbar; 'flyout' = the meter lives inside the volume button's
   * flyout, so the toolbar shows the button alone; 'vertical' = the whole
   * cluster leaves the toolbar (button included), the consumer rendering
   * the meter as a side panel with its own button and flyout.
   * @default 'horizontal'
   */
  meterOrientation?: PlaybackMeterPosition;
  /** Called when the user picks a new orientation from the volume menu. */
  onMeterOrientationChange?: (orientation: PlaybackMeterPosition) => void;
  /** The playback meter's LOOK (2026-11-04, the Playback meter flyout):
   *  style, type, dB range — uncontrolled when absent */
  meterLook?: PlaybackMeterLook;
  onMeterLookChange?: (look: PlaybackMeterLook) => void;

  /**
   * Where the RECORDING meter shows (2026-11-04, "dock recording meter to
   * the right, like the playback meter"): 'flyout' = the microphone
   * button's flyout alone; 'horizontal' = on the toolbar beside the mic
   * button, as the playback meter's top-bar meter; 'vertical' = docked at
   * the right too, the host rendering `RecordingMeterVertical` beside the
   * playback meter's dock. Picked from the flyout's Position radios (or
   * the mic button's right-click menu — the flyout's press is the flyout).
   * @default 'flyout'
   */
  recordingMeterOrientation?: MicrophoneMeterOrientation;
  onRecordingMeterOrientationChange?: (orientation: MicrophoneMeterOrientation) => void;

  /** THE LAYOUT'S EDIT MODE (2026-11-10, custom toolbars): on, the tools
   *  are inert and can be dragged between bars; the cog gives way to Done */
  layoutEditing?: boolean;
  onLayoutEditingChange?: (editing: boolean) => void;
  /** Back to the workspace's own layout; absent = no such item */
  onResetLayout?: () => void;
  /** The user has rearranged this workspace (Reset is live) */
  layoutCustomised?: boolean;
}

/** TransportTools: the toolbar's state and flyouts around `children`,
 *  which place ToolbarDocks anywhere and draw the tools by id through
 *  `useTransportTools()` (2026-11-09, custom toolbars) */
export interface TransportToolsProps extends TransportToolbarProps {
  children?: React.ReactNode;
}

export interface TransportToolsContextValue {
  /** The tool with this id for this orientation; null when hidden or unknown */
  renderTool: (id: string, orientation: ToolbarOrientation) => React.ReactNode;
  toolMeta: (id: string, orientation?: ToolbarOrientation) => ToolMeta | undefined;
  /** The cog's Customise toolbar button, for the top dock's end */
  settingsCog: React.ReactNode;
  /** The Home tab: nothing to draw */
  hidden: boolean;
}

const TransportToolsContext = React.createContext<TransportToolsContextValue | null>(null);

/** Which tools have a VERTICAL form (a left / right dock stacks them as
 *  icons): the buttons; not the readouts, the sliders, the snap control,
 *  nor a meter cluster carrying its horizontal meter. Static, so a host
 *  can ask before a drop without the registry. */
/** The meter tools' least size: the button, the group's 6px, a 120px meter */
const METER_TOOL_MIN = 28 + 6 + 120;

/** A meter's slot in its cluster: 360px at rest (the meter's old default
 *  width), growing with a sized bar and shrinking to 120 */
const METER_SLOT_STYLE: React.CSSProperties = { display: 'flex', flex: '1 1 360px', width: 360, minWidth: 120 };

function meterMeta(onBar: boolean, orientation: ToolbarOrientation): ToolMeta {
  if (!onBar) return { vertical: true };
  return orientation === 'vertical'
    ? { vertical: true, grow: true, minSize: METER_TOOL_MIN }
    : { vertical: true, stretch: true, minSize: METER_TOOL_MIN };
}

/** Where a toolbar flyout opens from its button: toward the canvas — down
 *  from the top dock, up from the bottom, sideways from a side dock */
function flyoutAnchor(el: HTMLElement | null): { x: number; y: number; direction: FlyoutDirection } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const region = el.closest('[data-toolbar-dock]')?.getAttribute('data-toolbar-dock');
  if (region === 'left') return { x: r.right + 4, y: r.top + r.height / 2, direction: 'right' };
  if (region === 'right') return { x: r.left - 4, y: r.top + r.height / 2, direction: 'left' };
  if (region === 'bottom') return { x: r.left + r.width / 2, y: r.top - 4, direction: 'up' };
  return { x: r.left + r.width / 2, y: r.bottom + 4, direction: 'down' };
}

/** A vertical meter's slot: 240px at rest, growing to fill a side dock's
 *  column (or a sized bar) and shrinking to 120 */
const VERTICAL_METER_SLOT_STYLE: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: '1 1 240px', height: 240, minHeight: 120 };

export function transportToolMeta(
  id: string,
  meters: { recordingMeterOrientation?: MicrophoneMeterOrientation; meterOrientation?: PlaybackMeterPosition } = {},
  orientation: ToolbarOrientation = 'horizontal',
): ToolMeta | undefined {
  switch (id) {
    case 'play': case 'stop': case 'record': case 'step-back': case 'step-forward': case 'loop':
    case 'automation': case 'split': case 'spectral-editing': case 'waveform-view':
    case 'zoom-in': case 'zoom-out': case 'fit-selection': case 'fit-project': case 'zoom-toggle':
    case 'collapse-tracks': case 'expand-tracks': case 'fit-tracks-height':
    case 'cut': case 'copy': case 'paste': case 'trim': case 'silence':
      return { vertical: true };
    // THE METERS ARE IN THE DOCK SYSTEM (2026-11-10, "pull the horizontal
    // and vertical layouts of the meters into the same system"): a meter
    // shown on its toolbar (anything but 'flyout') takes the form of the
    // dock it is in — a horizontal meter in the top / bottom dock, which
    // STRETCHES with a sized bar; a vertical one in a side dock, which
    // GROWS to fill the column as the old docked column did. Either way it
    // gives way down to its button + 6 + a 120px meter before anything
    // overflows. Both have a vertical form, so a side dock takes them.
    case 'microphone-levels':
      return meterMeta(meters.recordingMeterOrientation !== 'flyout', orientation);
    case 'playback-meter':
      return meterMeta(meters.meterOrientation !== 'flyout', orientation);
    default: return { vertical: false };
  }
}

export function useTransportTools(): TransportToolsContextValue {
  const ctx = React.useContext(TransportToolsContext);
  if (!ctx) throw new Error('useTransportTools must be used inside <TransportTools>');
  return ctx;
}

function SplitRecordButton({
  isRecording,
  disabled,
  onRecord,
  onCaretClick,
  caretRef,
}: {
  isRecording: boolean;
  disabled: boolean;
  onRecord: () => void;
  onCaretClick: () => void;
  caretRef: React.Ref<HTMLButtonElement>;
}) {
  const { theme } = useTheme();
  const [mainState, setMainState] = React.useState<'idle' | 'hover' | 'pressed'>('idle');
  const [caretState, setCaretState] = React.useState<'idle' | 'hover' | 'pressed'>('idle');

  const bg = (state: 'idle' | 'hover' | 'pressed') => {
    if (state === 'pressed') return theme.background.control.button.secondary.active;
    if (state === 'hover') return theme.background.control.button.secondary.hover;
    return theme.background.control.button.secondary.idle;
  };

  const sharedStyle: React.CSSProperties = {
    height: 32,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background-color 0.1s ease',
  };

  return (
    <>
      <button
        type="button"
        aria-label="Record"
        disabled={disabled}
        onClick={() => { if (!disabled) onRecord(); }}
        onMouseEnter={() => { if (!disabled) setMainState('hover'); }}
        onMouseLeave={() => setMainState('idle')}
        onMouseDown={() => { if (!disabled) setMainState('pressed'); }}
        onMouseUp={() => { if (!disabled) setMainState('hover'); }}
        style={{
          ...sharedStyle,
          width: 32,
          borderRadius: 0,
          backgroundColor: isRecording ? theme.audio.transport.record : bg(mainState),
          color: isRecording ? '#FFFFFF' : '#F08080',
        }}
      >
        <Icon name="record" size={14} />
      </button>
      <button
        ref={caretRef}
        type="button"
        aria-label="Record options"
        aria-haspopup="true"
        disabled={disabled}
        onClick={() => { if (!disabled) onCaretClick(); }}
        onMouseEnter={() => { if (!disabled) setCaretState('hover'); }}
        onMouseLeave={() => setCaretState('idle')}
        onMouseDown={() => { if (!disabled) setCaretState('pressed'); }}
        onMouseUp={() => { if (!disabled) setCaretState('hover'); }}
        style={{
          ...sharedStyle,
          width: 16,
          borderRadius: 0,
          backgroundColor: bg(caretState),
          marginLeft: 1,
        }}
      >
        <Icon name="caret-down" size={14} />
      </button>
    </>
  );
}

export function TransportTools({
  activeMenuItem, workspace,
  hiddenTools = [], onToggleToolVisibility,
  varispeed = 1, varispeedOn = false, onVarispeedChange, onVarispeedDial, onVarispeedToggle,
  isPlaying, isRecording, onPlay, onStop, onRecord, onSkipToStart, onSkipToEnd, useSplitRecordButton = false, rollInTimeEnabled = false, onToggleRollInTime, snapEnabled = false, onToggleSnap, snapSubdivision = 1, onSnapSubdivisionChange, snapTriplet = false, onToggleSnapTriplet, snapMode = 'musical', onSnapModeChange,
  loopRegionEnabled, loopRegionStart, loopRegionEnd,
  setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd,
  timeSelection, bpm, onBpmChange, beatsPerMeasure, noteValue = 4, onTimeSignatureChange,
  onGripperMouseDown,
  envelopeMode, spectrogramMode, splitMode = false, onToggleEnvelope, onToggleSpectrogram, onToggleSplit,
  onZoomIn, onZoomOut, onZoomToSelection, onZoomToFitProject, onZoomToggle,
  onCollapseTracks, onExpandTracks, onFitTracksToHeight,
  currentTime, timeCodeFormat, onTimeCodeChange, onTimeCodeFormatChange,
  onShareClick, onExportAudioClick, onExportLoopRegionClick,
  masterLevelLeft = -60, masterLevelRight = -60, masterClippedLeft = false, masterClippedRight = false,
  masterRecentPeakLeft, masterRecentPeakRight, masterVolume = 1, onMasterVolumeChange,
  getMicrophoneLevelDb, microphoneGain = 1, onMicrophoneGainChange, onMicrophoneLevelsOpen,
  microphoneInputMonitoring, onMicrophoneInputMonitoringChange, microphoneMetering, onMicrophoneMeteringChange,
  meterOrientation: meterOrientationProp, onMeterOrientationChange,
  meterLook: meterLookProp, onMeterLookChange,
  recordingMeterOrientation = 'flyout', onRecordingMeterOrientationChange,
  layoutEditing = false, onLayoutEditingChange, onResetLayout, layoutCustomised = false,
  children,
}: TransportToolsProps) {
  const { theme } = useTheme();
  const [recordMenuOpen, setRecordMenuOpen] = React.useState(false);
  const [recordMenuPos, setRecordMenuPos] = React.useState({ x: 0, y: 0 });
  const caretRef = React.useRef<HTMLButtonElement>(null);
  const [snapMenuOpen, setSnapMenuOpen] = React.useState(false);
  const [snapMenuPos, setSnapMenuPos] = React.useState({ x: 0, y: 0 });
  const snapButtonRef = React.useRef<HTMLButtonElement>(null);

  // The volume button's flyout (2026-11-04, the Figma "Playback meter"
  // flyout, replacing its two-item menu): position, style, type, dB range
  const [volumeFlyout, setVolumeFlyout] = React.useState<{ x: number; y: number; direction: FlyoutDirection } | null>(null);
  const volumeButtonRef = React.useRef<HTMLDivElement>(null);
  const volumeClosedAtRef = React.useRef(0);
  const closeVolumeFlyout = () => { volumeClosedAtRef.current = performance.now(); setVolumeFlyout(null); };
  // The microphone button's flyout (2026-11-04) — anchored on the button's
  // middle, just under it
  const micButtonRef = React.useRef<HTMLSpanElement>(null);
  const [micFlyout, setMicFlyout] = React.useState<{ x: number; y: number; direction: FlyoutDirection } | null>(null);
  // A press on the button while the flyout is open closes it as an outside
  // press first; the click that follows must not open it again
  const micClosedAtRef = React.useRef(0);
  const closeMicFlyout = () => { micClosedAtRef.current = performance.now(); setMicFlyout(null); };
  // A RIGHT-CLICK on the mic button: the recording meter's orientation
  // menu — the volume button's pair for the input
  const [micMenu, setMicMenu] = React.useState<{ x: number; y: number } | null>(null);
  const closeMicMenu = React.useCallback(() => setMicMenu(null), []);
  // The toolbar's own recording meter (orientation 'horizontal') reads the
  // input a frame at a time, like the flyout and the vertical dock do.
  const { level: micLevel, peak: micPeak } = useInputLevel(
    getMicrophoneLevelDb,
    recordingMeterOrientation !== 'flyout',
  );
  const toggleMicFlyout = () => {
    if (micFlyout) { setMicFlyout(null); return; }
    if (performance.now() - micClosedAtRef.current < 300) return;
    const anchor = flyoutAnchor(micButtonRef.current);
    if (!anchor) return;
    // Only one toolbar flyout open at a time — opening this closes the
    // playback meter's (and its menu)
    setVolumeFlyout(null);
    setMicFlyout(anchor);
    onMicrophoneLevelsOpen?.();
  };
  // The cog's Customise toolbar popover (2026-10-07) — hooks ABOVE the
  // Home-tab early return, with the rest
  const cogRef = React.useRef<HTMLSpanElement>(null);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);
  const [customiseAnchor, setCustomiseAnchor] = React.useState<{ left: number; right: number; bottom: number } | null>(null);
  const hiddenSet = React.useMemo(() => new Set(hiddenTools), [hiddenTools]);
  const show = (id: string) => !hiddenSet.has(id);
  // STABLE: the toolbar re-renders with every meter tick, and a fresh
  // onClose each render made ContextMenu tear down and re-add its
  // outside-click listener (after a timeout) on every one of them —
  // clicks fell in the gaps
  const closeCustomise = React.useCallback(() => setCustomiseOpen(false), []);
  // Uncontrolled fallback so the menu still works if the consumer hasn't
  // wired up `meterOrientation` / `onMeterOrientationChange` yet.
  const [internalOrientation, setInternalOrientation] = React.useState<PlaybackMeterPosition>('horizontal');
  const meterOrientation = meterOrientationProp ?? internalOrientation;
  const setMeterOrientation = (next: PlaybackMeterPosition) => {
    if (onMeterOrientationChange) onMeterOrientationChange(next);
    else setInternalOrientation(next);
  };

  const handleVolumeButtonClick = () => {
    if (volumeFlyout) { setVolumeFlyout(null); return; }
    if (performance.now() - volumeClosedAtRef.current < 300) return;
    const anchor = flyoutAnchor(volumeButtonRef.current);
    if (!anchor) return;
    // Only one toolbar flyout open at a time — opening this closes the
    // microphone level flyout (and its menu)
    setMicFlyout(null);
    setMicMenu(null);
    setVolumeFlyout(anchor);
  };
  // Uncontrolled fallback for the look, as for the orientation
  const [internalLook, setInternalLook] = React.useState<PlaybackMeterLook>(DEFAULT_PLAYBACK_METER_LOOK);
  const meterLook = meterLookProp ?? internalLook;
  const setMeterLook = (next: PlaybackMeterLook) => {
    if (onMeterLookChange) onMeterLookChange(next);
    else setInternalLook(next);
  };


  const handleRecordCaretClick = () => {
    if (caretRef.current) {
      const rect = caretRef.current.getBoundingClientRect();
      setRecordMenuPos({ x: rect.left, y: rect.bottom + 2 });
    }
    setRecordMenuOpen(true);
  };

  const handleToggleLoop = () => {
    if (!loopRegionEnabled) {
      if (loopRegionStart === null || loopRegionEnd === null) {
        if (timeSelection) {
          setLoopRegionStart(timeSelection.startTime);
          setLoopRegionEnd(timeSelection.endTime);
        } else {
          const loopDuration = barSeconds(bpm, beatsPerMeasure, noteValue) * 4;
          setLoopRegionStart(0);
          setLoopRegionEnd(loopDuration);
        }
      }
    }
    setLoopRegionEnabled(!loopRegionEnabled);
  };

  const hidden = activeMenuItem === 'home';

  // The cog opens the Customise toolbar popover, hung under it;
  // `show(id)` gates each tool on the hidden list
  const settingsCog = layoutEditing ? (
    // While the layout is being edited the cog gives way to DONE
    <ToolbarButtonGroup gap={2}>
      <Button variant="primary" size="small" onClick={() => onLayoutEditingChange?.(false)}>Done</Button>
    </ToolbarButtonGroup>
  ) : (
    <ToolbarButtonGroup gap={2}>
      <span ref={cogRef} style={{ display: 'inline-flex' }} data-customise-toolbar-cog>
        <ToolButton
          icon="cog"
          ariaLabel="Customise toolbar"
          onClick={() => {
            const r = cogRef.current?.getBoundingClientRect();
            setCustomiseAnchor(r ? { left: r.left, right: r.right, bottom: r.bottom } : null);
            setCustomiseOpen((open) => !open);
          }}
        />
      </span>
      <CustomiseToolbarMenu
        isOpen={customiseOpen}
        onClose={closeCustomise}
        anchor={customiseAnchor}
        hiddenTools={hiddenTools}
        onToggleTool={(id) => onToggleToolVisibility?.(id)}
        onRearrange={onLayoutEditingChange ? () => { setCustomiseOpen(false); onLayoutEditingChange(true); } : undefined}
        onResetLayout={onResetLayout ? () => { setCustomiseOpen(false); onResetLayout(); } : undefined}
        resetLayoutDisabled={!layoutCustomised}
      />
    </ToolbarButtonGroup>
  );

  const snapLabel = snapMode === 'musical'
    ? { 1: 'Bar', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16', 32: '1/32', 64: '1/64', 128: '1/128' }[snapSubdivision]
    : { seconds: 'Seconds', deciseconds: 'Deciseconds', centiseconds: 'Centiseconds', milliseconds: 'Milliseconds', samples: 'Samples', 'video-24fps': 'Video Frames (24 fps)', 'video-29.97fps': 'NTSC (29.97 fps)', 'video-30fps': 'NTSC (30 fps)', 'video-25fps': 'PAL (25 fps)', 'cdda-75fps': 'CDDA (75 fps)' }[snapMode];

  // THE TOOL REGISTRY (2026-11-09, the custom toolbars design): every tool
  // by id, drawn wherever a dock puts it. The hidden list gates each; a
  // tool the toolbar had no counterpart for draws nothing. The ids are the
  // Customise toolbar's, plus 'split' (the Cut / Split toggle, which the
  // Customise row 'cut' hides with the Cut tool) and the Export tab's.
  const renderTool = (id: string, orientation: ToolbarOrientation): React.ReactNode => {
    if (hidden) return null;
    switch (id) {
      case 'play': return show('play') ? <TransportButton icon={isPlaying ? 'pause' : 'play'} iconColor="#74BE59" ariaLabel={isPlaying ? 'Pause' : 'Play'} onClick={onPlay} /> : null;
      case 'stop': return show('stop') ? <TransportButton icon="stop" ariaLabel="Stop" onClick={onStop} /> : null;
      case 'record':
        if (!show('record')) return null;
        return useSplitRecordButton ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 3, overflow: 'hidden' }}>
            <SplitRecordButton
              isRecording={isRecording}
              disabled={isPlaying}
              onRecord={onRecord}
              onCaretClick={handleRecordCaretClick}
              caretRef={caretRef}
            />
            <ContextMenu
              isOpen={recordMenuOpen}
              onClose={() => setRecordMenuOpen(false)}
              x={recordMenuPos.x}
              y={recordMenuPos.y}
            >
              <ContextMenuItem
                label="Enable lead in time"
                checked={rollInTimeEnabled}
                onClick={() => {
                  onToggleRollInTime?.();
                  setRecordMenuOpen(false);
                }}
              />
            </ContextMenu>
          </div>
        ) : (
          <TransportButton
            icon="record"
            iconColor="#F08080"
            ariaLabel="Record"
            active={isRecording}
            recording={isRecording}
            disabled={isPlaying}
            onClick={onRecord}
          />
        );
      case 'step-back': return show('step-back') ? <TransportButton icon="skip-back" ariaLabel="Skip to start" disabled={isPlaying} onClick={onSkipToStart} /> : null;
      case 'step-forward': return show('step-forward') ? <TransportButton icon="skip-forward" ariaLabel="Skip to end" disabled={isPlaying} onClick={onSkipToEnd} /> : null;
      case 'loop': return show('loop') ? <TransportButton icon="loop" ariaLabel="Loop" active={loopRegionEnabled} onClick={handleToggleLoop} /> : null;

      case 'automation': return show('automation') ? <ToggleToolButton icon="automation" ariaLabel="Clip envelope" isActive={envelopeMode} onClick={onToggleEnvelope} /> : null;
      case 'split': return show('cut') ? <ToggleToolButton icon="split" ariaLabel="Cut / Split" isActive={splitMode} onClick={onToggleSplit} /> : null;
      case 'spectral-editing': return show('spectral-editing') ? <ToggleToolButton icon="spectrogram" ariaLabel="Spectral view" isActive={spectrogramMode} onClick={onToggleSpectrogram} /> : null;
      case 'waveform-view': return <ToggleToolButton icon="waveform" ariaLabel="Waveform" isActive={spectrogramMode} onClick={onToggleSpectrogram} />;

      case 'zoom-in': return show('zoom-in') ? <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} /> : null;
      case 'zoom-out': return show('zoom-out') ? <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} /> : null;
      case 'fit-selection': return show('fit-selection') ? <ToolButton icon="zoom-to-selection" ariaLabel="Fit selection" onClick={onZoomToSelection} /> : null;
      case 'fit-project': return show('fit-project') ? <ToolButton icon="zoom-to-fit" ariaLabel="Fit project" onClick={onZoomToFitProject} /> : null;
      case 'zoom-toggle': return show('zoom-toggle') ? <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} /> : null;
      case 'collapse-tracks': return show('collapse-tracks') ? <ToolButton icon="track-collapse" ariaLabel="Collapse tracks" onClick={onCollapseTracks} /> : null;
      case 'expand-tracks': return show('expand-tracks') ? <ToolButton icon="track-expand" ariaLabel="Expand collapsed tracks" onClick={onExpandTracks} /> : null;
      case 'fit-tracks-height': return show('fit-tracks-height') ? <ToolButton icon="track-fit-height" ariaLabel="Fit tracks to height" onClick={onFitTracksToHeight} /> : null;

      case 'cut': return show('cut') ? <ToolButton icon="cut" ariaLabel="Cut" /> : null;
      case 'copy': return show('copy') ? <ToolButton icon="copy" ariaLabel="Copy" /> : null;
      case 'paste': return show('paste') ? <ToolButton icon="paste" ariaLabel="Paste" /> : null;
      case 'trim': return show('trim') ? <ToolButton icon="trim" ariaLabel="Trim" /> : null;
      case 'silence': return show('silence') ? <ToolButton icon="silence" ariaLabel="Silence" /> : null;

      // Play-at-speed sits BEFORE the timecode, with the readouts and not
      // among the transport buttons (the Figma "1.1 - Simple slider"
      // third row, 2026-10-15)
      case 'varispeed': return show('varispeed') && onVarispeedChange
        ? <VarispeedControl speed={varispeed} enabled={varispeedOn} onChange={onVarispeedChange} onDial={onVarispeedDial ?? onVarispeedChange} />
        : null;
      case 'timecode': return show('timecode')
        ? <TimeCode value={currentTime} format={timeCodeFormat} onChange={onTimeCodeChange} ariaLabel="Playhead position" onFormatChange={onTimeCodeFormatChange} />
        : null;
      // BPM and TIME SIGNATURE are tools of their own, in every workspace
      // (2026-11-04), off by default as the real build has them
      case 'bpm': return show('bpm') ? <BpmStepper value={bpm} onChange={(next) => onBpmChange?.(next)} min={20} max={300} /> : null;
      case 'time-signature': return show('time-signature')
        ? <TimeSignatureSelector value={{ numerator: beatsPerMeasure, denominator: noteValue }} onChange={(next) => onTimeSignatureChange?.(next)} />
        : null;

      case 'snapping':
        if (!show('snapping')) return null;
        return (
          <ToolbarButtonGroup gap={8}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: theme.foreground.text.primary, whiteSpace: 'nowrap', userSelect: 'none' }}>
              Snap
              <Checkbox
                checked={snapEnabled}
                onChange={() => onToggleSnap?.()}
                aria-label="Snap to grid"
              />
            </label>
            <button
              ref={snapButtonRef}
              type="button"
              aria-label="Snap subdivision"
              aria-haspopup="true"
              disabled={!snapEnabled}
              onClick={() => {
                if (!snapEnabled) return;
                if (snapButtonRef.current) {
                  const rect = snapButtonRef.current.getBoundingClientRect();
                  setSnapMenuPos({ x: rect.left, y: rect.bottom + 2 });
                }
                setSnapMenuOpen(true);
              }}
              style={{
                height: 24,
                fontSize: 12,
                padding: '0 8px',
                borderRadius: 2,
                border: 'none',
                backgroundColor: theme.background.control.button.secondary.idle,
                color: snapEnabled ? theme.foreground.text.primary : theme.foreground.text.secondary,
                cursor: snapEnabled ? 'pointer' : 'not-allowed',
                opacity: snapEnabled ? 1 : 0.5,
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {snapLabel}
              <Icon name="caret-down" size={10} />
            </button>
          </ToolbarButtonGroup>
        );

      case 'microphone-levels':
        if (!show('microphone-levels')) return null;
        return (
          <ToolbarButtonGroup gap={6}>
            <span
              ref={micButtonRef}
              style={{ display: 'inline-flex' }}
              onContextMenu={(e) => { e.preventDefault(); setMicFlyout(null); setMicMenu({ x: e.clientX, y: e.clientY }); }}
            >
              <ToolButton
                icon="microphone"
                ariaLabel="Microphone level"
                state={micFlyout ? 'pressed' : undefined}
                onClick={toggleMicFlyout}
              />
            </span>
            {/* The recording meter on the toolbar (orientation 'horizontal'),
                the mic's own top-bar meter beside the button — its slider is
                the input gain, the flyout's knob, so the two move one value. */}
            {recordingMeterOrientation !== 'flyout' && orientation === 'vertical' && (
              <div style={VERTICAL_METER_SLOT_STYLE}><MasterMeterVertical
                bare
                levelLeft={micLevel}
                levelRight={micLevel}
                clippedLeft={micLevel >= 0}
                clippedRight={micLevel >= 0}
                recentPeakLeft={micPeak}
                recentPeakRight={micPeak}
                volume={microphoneGain}
                onVolumeChange={onMicrophoneGainChange}
                sliderAriaLabel="Microphone level"
              /></div>
            )}
            {recordingMeterOrientation !== 'flyout' && orientation === 'horizontal' && (
              <div style={METER_SLOT_STYLE}><MasterMeter
                resizable={false}
                levelLeft={micLevel}
                levelRight={micLevel}
                clippedLeft={micLevel >= 0}
                clippedRight={micLevel >= 0}
                recentPeakLeft={micPeak}
                recentPeakRight={micPeak}
                volume={microphoneGain}
                onVolumeChange={onMicrophoneGainChange}
                ariaLabel="Microphone meter"
                sliderAriaLabel="Microphone level"
              /></div>
            )}
          </ToolbarButtonGroup>
        );

      // Playback meter cluster: the volume settings button hosts the
      // meter's controls, so it stays glued to the meter — they wrap as
      // one unit. The button shows unless the meter is docked to the side
      // (vertical), where the whole cluster leaves the toolbar.
      case 'playback-meter':
        if (!show('playback-meter')) return null;
        return (
          <ToolbarButtonGroup gap={6}>
            <div ref={volumeButtonRef} style={{ display: 'inline-flex' }}>
              <ToolButton
                icon="volume"
                ariaLabel="Playback volume settings"
                state={volumeFlyout ? 'pressed' : undefined}
                onClick={handleVolumeButtonClick}
              />
            </div>
            {meterOrientation !== 'flyout' && orientation === 'vertical' && (
              <div style={VERTICAL_METER_SLOT_STYLE}><MasterMeterVertical
                bare
                levelLeft={masterLevelLeft}
                levelRight={masterLevelRight}
                clippedLeft={masterClippedLeft}
                clippedRight={masterClippedRight}
                recentPeakLeft={masterRecentPeakLeft}
                recentPeakRight={masterRecentPeakRight}
                volume={masterVolume}
                onVolumeChange={onMasterVolumeChange}
                look={meterLook}
              /></div>
            )}
            {meterOrientation !== 'flyout' && orientation === 'horizontal' && (
              <div style={METER_SLOT_STYLE}><MasterMeter
                resizable={false}
                levelLeft={masterLevelLeft}
                levelRight={masterLevelRight}
                clippedLeft={masterClippedLeft}
                clippedRight={masterClippedRight}
                recentPeakLeft={masterRecentPeakLeft}
                recentPeakRight={masterRecentPeakRight}
                volume={masterVolume}
                onVolumeChange={onMasterVolumeChange}
                look={meterLook}
              /></div>
            )}
          </ToolbarButtonGroup>
        );

      // The Export tab's own tools
      case 'export-share': return <Button variant="secondary" size="default" icon={''} onClick={onShareClick}>Share on audio.com</Button>;
      case 'export-audio': return <Button variant="secondary" size="default" icon={''} onClick={onExportAudioClick}>Export audio</Button>;
      case 'export-loop-region': return <Button variant="secondary" size="default" icon={''} onClick={onExportLoopRegionClick}>Export loop region</Button>;

      default: return null;
    }
  };

  const toolMeta = (id: string, o?: ToolbarOrientation): ToolMeta | undefined => transportToolMeta(id, { recordingMeterOrientation, meterOrientation }, o);

  const contextValue: TransportToolsContextValue = { renderTool, toolMeta, settingsCog, hidden };

  return (
    <TransportToolsContext.Provider value={contextValue}>
      {children}
      {!hidden && (
        <>
          <ContextMenu
            isOpen={snapMenuOpen}
            onClose={() => setSnapMenuOpen(false)}
            x={snapMenuPos.x}
            y={snapMenuPos.y}
          >
            {([1, 2, 4, 8, 16, 32, 64, 128] as const).map((val) => (
              <ContextMenuItem
                key={val}
                label={val === 1 ? 'Bar' : `1/${val}`}
                checked={snapMode === 'musical' && snapSubdivision === val}
                onClick={() => {
                  onSnapModeChange?.('musical');
                  onSnapSubdivisionChange?.(val);
                  setSnapMenuOpen(false);
                }}
              />
            ))}
            <div className="context-menu-separator" />
            <ContextMenuItem
              label="Enable triplets"
              checked={snapTriplet}
              onClick={() => {
                onToggleSnapTriplet?.();
              }}
            />
            <div className="context-menu-separator" />
            <ContextMenuItem label="Seconds samples" hasSubmenu checked={['seconds', 'deciseconds', 'centiseconds', 'milliseconds', 'samples'].includes(snapMode)}>
              {(['seconds', 'deciseconds', 'centiseconds', 'milliseconds', 'samples'] as const).map((mode) => (
                <ContextMenuItem
                  key={mode}
                  label={{ seconds: 'Seconds', deciseconds: 'Deciseconds', centiseconds: 'Centiseconds', milliseconds: 'Milliseconds', samples: 'Samples' }[mode]}
                  checked={snapMode === mode}
                  onClick={() => { onSnapModeChange?.(mode); setSnapMenuOpen(false); }}
                />
              ))}
            </ContextMenuItem>
            <ContextMenuItem label="Video frames" hasSubmenu checked={['video-24fps', 'video-29.97fps', 'video-30fps', 'video-25fps'].includes(snapMode)}>
              {(['video-24fps', 'video-29.97fps', 'video-30fps', 'video-25fps'] as const).map((mode) => (
                <ContextMenuItem
                  key={mode}
                  label={{ 'video-24fps': 'Video Frames (24 fps)', 'video-29.97fps': 'NTSC Frames (29.97 fps)', 'video-30fps': 'NTSC Frames (30 fps)', 'video-25fps': 'PAL Frames (25 fps)' }[mode]}
                  checked={snapMode === mode}
                  onClick={() => { onSnapModeChange?.(mode); setSnapMenuOpen(false); }}
                />
              ))}
            </ContextMenuItem>
            <ContextMenuItem label="CD frames" hasSubmenu checked={snapMode === 'cdda-75fps'}>
              <ContextMenuItem
                label="CDDA Frames (75 fps)"
                checked={snapMode === 'cdda-75fps'}
                onClick={() => { onSnapModeChange?.('cdda-75fps'); setSnapMenuOpen(false); }}
              />
            </ContextMenuItem>
          </ContextMenu>

          <MicrophoneLevelFlyout
            isOpen={micFlyout !== null}
            onClose={closeMicFlyout}
            x={micFlyout?.x ?? 0}
            y={micFlyout?.y ?? 0}
            direction={micFlyout?.direction ?? 'down'}
            triggerRef={micButtonRef}
            getLevelDb={getMicrophoneLevelDb}
            gain={microphoneGain}
            onGainChange={(next) => onMicrophoneGainChange?.(next)}
            orientation={recordingMeterOrientation}
            onOrientationChange={onRecordingMeterOrientationChange}
            inputMonitoring={microphoneInputMonitoring}
            onInputMonitoringChange={onMicrophoneInputMonitoringChange}
            micMetering={microphoneMetering}
            onMicMeteringChange={onMicrophoneMeteringChange}
          />

          <ContextMenu
            isOpen={micMenu !== null}
            onClose={closeMicMenu}
            x={micMenu?.x ?? 0}
            y={micMenu?.y ?? 0}
          >
            <ContextMenuItem
              label="Meter in flyout"
              checked={recordingMeterOrientation === 'flyout'}
              onClick={() => { onRecordingMeterOrientationChange?.('flyout'); setMicMenu(null); }}
            />
            <ContextMenuItem
              label="Horizontal meter"
              checked={recordingMeterOrientation === 'horizontal'}
              onClick={() => { onRecordingMeterOrientationChange?.('horizontal'); setMicMenu(null); }}
            />
            <ContextMenuItem
              label="Vertical meter"
              checked={recordingMeterOrientation === 'vertical'}
              onClick={() => { onRecordingMeterOrientationChange?.('vertical'); setMicMenu(null); }}
            />
          </ContextMenu>

          <PlaybackMeterFlyout
            isOpen={volumeFlyout !== null}
            onClose={closeVolumeFlyout}
            x={volumeFlyout?.x ?? 0}
            y={volumeFlyout?.y ?? 0}
            direction={volumeFlyout?.direction ?? 'down'}
            triggerRef={volumeButtonRef}
            position={meterOrientation}
            onPositionChange={setMeterOrientation}
            look={meterLook}
            onLookChange={setMeterLook}
            levelLeft={masterLevelLeft}
            levelRight={masterLevelRight}
            clippedLeft={masterClippedLeft}
            clippedRight={masterClippedRight}
            recentPeakLeft={masterRecentPeakLeft}
            recentPeakRight={masterRecentPeakRight}
            volume={masterVolume}
            onVolumeChange={onMasterVolumeChange}
          />
        </>
      )}
    </TransportToolsContext.Provider>
  );
}

export interface TransportToolbarLayoutProps extends TransportToolbarProps {
  /** The top dock's rows; absent = the workspace's seed (the Export tab
   *  always draws its own) */
  layout?: ToolbarLayout;
  /** A press on a bar's grip — the host's drag */
  onBarGripMouseDown?: (barId: string, event: React.MouseEvent, barRect: DOMRect) => void;
  draggingBarId?: string | null;
  insert?: BarPlacement | null;
  insertRefused?: boolean;
}

/**
 * The TOP DOCK alone, for hosts that want the one bar: TransportTools
 * around a ToolbarDock drawing the workspace's seed layout (or the
 * host's). The sandbox places its own docks inside TransportTools instead.
 */
export function TransportToolbar(props: TransportToolbarLayoutProps) {
  const { layout, onBarGripMouseDown, draggingBarId, insert, insertRefused, ...rest } = props;
  const rows = (rest.activeMenuItem === 'export' ? EXPORT_TOOLBAR_LAYOUT : (layout ?? defaultToolbarLayout(rest.workspace))).top;
  return (
    <TransportTools {...rest}>
      <TransportTopDock
        rows={rows}
        onBarGripMouseDown={onBarGripMouseDown}
        draggingBarId={draggingBarId}
        insert={insert}
        insertRefused={insertRefused}
      />
    </TransportTools>
  );
}

/** The top dock drawn from the context: the tools, the cog at its end */
export function TransportTopDock({ rows, onBarGripMouseDown, draggingBarId, insert, insertRefused }: {
  rows: ToolbarLayout['top'];
  onBarGripMouseDown?: (barId: string, event: React.MouseEvent, barRect: DOMRect) => void;
  draggingBarId?: string | null;
  insert?: BarPlacement | null;
  insertRefused?: boolean;
}) {
  const { renderTool, toolMeta, settingsCog, hidden } = useTransportTools();
  if (hidden) return null;
  return (
    <ToolbarDock
      region="top"
      rows={rows}
      renderTool={renderTool}
      toolMeta={toolMeta}
      onGripMouseDown={onBarGripMouseDown}
      draggingBarId={draggingBarId}
      insert={insert}
      insertRefused={insertRefused}
      trailing={settingsCog}
      className="transport-toolbar"
      tabGroupId="tool-toolbar"
      ariaLabel="Tool toolbar"
    />
  );
}
