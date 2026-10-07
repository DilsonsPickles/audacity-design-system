import React from 'react';
import { Toolbar, ToolbarButtonGroup } from '../Toolbar/Toolbar';
import { TransportButton } from '../TransportButton';
import { ToolButton } from '../ToolButton';
import { ToggleToolButton } from '../ToggleToolButton';
import { TimeCode, type TimeCodeFormat } from '../TimeCode';
import { BpmStepper } from '../BpmStepper';
import { TimeSignatureSelector, type TimeSignature } from '../TimeSignatureSelector';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { CustomiseToolbarMenu } from '../CustomiseToolbarMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { Checkbox } from '../Checkbox';
import { MasterMeter } from '../MasterMeter';
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

  /**
   * Current orientation of the master meter. When 'vertical' the toolbar
   * hides the meter (the consumer renders it elsewhere, e.g. as a side
   * panel) but the volume settings button + its context menu remain.
   * @default 'horizontal'
   */
  meterOrientation?: 'horizontal' | 'vertical';
  /** Called when the user picks a new orientation from the volume menu. */
  onMeterOrientationChange?: (orientation: 'horizontal' | 'vertical') => void;
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

export function TransportToolbar({
  activeMenuItem, workspace,
  hiddenTools = [], onToggleToolVisibility,
  isPlaying, isRecording, onPlay, onStop, onRecord, onSkipToStart, onSkipToEnd, useSplitRecordButton = false, rollInTimeEnabled = false, onToggleRollInTime, snapEnabled = false, onToggleSnap, snapSubdivision = 1, onSnapSubdivisionChange, snapTriplet = false, onToggleSnapTriplet, snapMode = 'musical', onSnapModeChange,
  loopRegionEnabled, loopRegionStart, loopRegionEnd,
  setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd,
  timeSelection, bpm, onBpmChange, beatsPerMeasure, noteValue = 4, onTimeSignatureChange,
  onGripperMouseDown,
  envelopeMode, spectrogramMode, splitMode = false, onToggleEnvelope, onToggleSpectrogram, onToggleSplit,
  onZoomIn, onZoomOut, onZoomToSelection, onZoomToFitProject, onZoomToggle,
  currentTime, timeCodeFormat, onTimeCodeChange, onTimeCodeFormatChange,
  onShareClick, onExportAudioClick, onExportLoopRegionClick,
  masterLevelLeft = -60, masterLevelRight = -60, masterClippedLeft = false, masterClippedRight = false,
  masterRecentPeakLeft, masterRecentPeakRight, masterVolume = 1, onMasterVolumeChange,
  meterOrientation: meterOrientationProp, onMeterOrientationChange,
}: TransportToolbarProps) {
  const { theme } = useTheme();
  const [recordMenuOpen, setRecordMenuOpen] = React.useState(false);
  const [recordMenuPos, setRecordMenuPos] = React.useState({ x: 0, y: 0 });
  const caretRef = React.useRef<HTMLButtonElement>(null);
  const [snapMenuOpen, setSnapMenuOpen] = React.useState(false);
  const [snapMenuPos, setSnapMenuPos] = React.useState({ x: 0, y: 0 });
  const snapButtonRef = React.useRef<HTMLButtonElement>(null);

  // Volume settings menu — drives meter orientation choice. Kept as internal
  // state since the orientation is a presentation concern of this toolbar.
  const [volumeMenuOpen, setVolumeMenuOpen] = React.useState(false);
  const [volumeMenuPos, setVolumeMenuPos] = React.useState({ x: 0, y: 0 });
  const volumeButtonRef = React.useRef<HTMLDivElement>(null);
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
  const [internalOrientation, setInternalOrientation] = React.useState<'horizontal' | 'vertical'>('horizontal');
  const meterOrientation = meterOrientationProp ?? internalOrientation;
  const setMeterOrientation = (next: 'horizontal' | 'vertical') => {
    if (onMeterOrientationChange) onMeterOrientationChange(next);
    else setInternalOrientation(next);
  };

  const handleVolumeButtonClick = () => {
    if (volumeButtonRef.current) {
      const rect = volumeButtonRef.current.getBoundingClientRect();
      setVolumeMenuPos({ x: rect.left, y: rect.bottom + 2 });
    }
    setVolumeMenuOpen(true);
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
          const secondsPerBeat = 60 / bpm;
          const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
          const loopDuration = secondsPerMeasure * 4;
          setLoopRegionStart(0);
          setLoopRegionEnd(loopDuration);
        }
      }
    }
    setLoopRegionEnabled(!loopRegionEnabled);
  };

  if (activeMenuItem === 'home') return null;

  // The cog opens the Customise toolbar popover, hung under it;
  // `show(id)` gates each tool on the hidden list
  const settingsCog = (
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
      />
    </ToolbarButtonGroup>
  );

  return (
    <Toolbar
      tabGroupId="tool-toolbar"
      enableTabGroup
      showGripper
      onGripperMouseDown={onGripperMouseDown}
      rightContent={activeMenuItem === 'export' ? undefined : settingsCog}
      className="transport-toolbar"
    >
      {activeMenuItem === 'export' ? (
        <>
          <ToolbarButtonGroup gap={2}>
            {show('play') && <TransportButton icon={isPlaying ? "pause" : "play"} iconColor="#74BE59" ariaLabel={isPlaying ? "Pause" : "Play"} onClick={onPlay} />}
            {show('stop') && <TransportButton icon="stop" ariaLabel="Stop" onClick={onStop} />}
            {show('loop') && (
            <TransportButton
              icon="loop"
              ariaLabel="Loop"
              active={loopRegionEnabled}
              onClick={handleToggleLoop}
            />
            )}
          </ToolbarButtonGroup>


          <ToolbarButtonGroup gap={8}>
            <Button
              variant="secondary"
              size="default"
              icon={'\uEF25'}
              onClick={onShareClick}
            >
              Share on audio.com
            </Button>
          </ToolbarButtonGroup>


          <ToolbarButtonGroup gap={8}>
            <Button
              variant="secondary"
              size="default"
              icon={'\uEF24'}
              onClick={onExportAudioClick}
            >
              Export audio
            </Button>
            <Button
              variant="secondary"
              size="default"
              icon={'\uEF1F'}
              onClick={onExportLoopRegionClick}
            >
              Export loop region
            </Button>
          </ToolbarButtonGroup>
        </>
      ) : (
        <>
          <ToolbarButtonGroup gap={2}>
            {show('play') && <TransportButton icon={isPlaying ? "pause" : "play"} iconColor="#74BE59" ariaLabel={isPlaying ? "Pause" : "Play"} onClick={onPlay} />}
            {show('stop') && <TransportButton icon="stop" ariaLabel="Stop" onClick={onStop} />}
            {show('record') && (useSplitRecordButton ? (
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
            ))}
            {show('step-back') && <TransportButton icon="skip-back" ariaLabel="Skip to start" disabled={isPlaying} onClick={onSkipToStart} />}
            {show('step-forward') && <TransportButton icon="skip-forward" ariaLabel="Skip to end" disabled={isPlaying} onClick={onSkipToEnd} />}
            {show('loop') && (
            <TransportButton
              icon="loop"
              ariaLabel="Loop"
              active={loopRegionEnabled}
              onClick={handleToggleLoop}
            />
            )}
          </ToolbarButtonGroup>

          {workspace === 'classic' && (
            <>

              <ToolbarButtonGroup gap={2}>
                {show('automation') && (
                <ToggleToolButton
                  icon="automation"
                  ariaLabel="Clip envelope"
                  isActive={envelopeMode}
                  onClick={onToggleEnvelope}
                />
                )}
                {show('cut') && (
                <ToggleToolButton
                  icon="split"
                  ariaLabel="Cut / Split"
                  isActive={splitMode}
                  onClick={onToggleSplit}
                />
                )}
                {show('spectral-editing') && (
                <ToggleToolButton
                  icon="spectrogram"
                  ariaLabel="Spectral view"
                  isActive={spectrogramMode}
                  onClick={onToggleSpectrogram}
                />
                )}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('zoom-in') && <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} />}
                {show('zoom-out') && <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} />}
                {show('fit-selection') && <ToolButton icon="zoom-to-selection" ariaLabel="Fit selection" onClick={onZoomToSelection} />}
                {show('fit-project') && <ToolButton icon="zoom-to-fit" ariaLabel="Fit project" onClick={onZoomToFitProject} />}
                {show('zoom-toggle') && <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} />}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('cut') && (
                <ToolButton
                  icon="cut"
                  ariaLabel="Cut"
                  onClick={() => {}}
                />
                )}
                {show('copy') && (
                <ToolButton
                  icon="copy"
                  ariaLabel="Copy"
                  onClick={() => {}}
                />
                )}
                {show('paste') && (
                <ToolButton
                  icon="paste"
                  ariaLabel="Paste"
                  onClick={() => {}}
                />
                )}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('trim') && <ToolButton icon="trim" ariaLabel="Trim" />}
                {show('silence') && <ToolButton icon="silence" ariaLabel="Silence" />}
              </ToolbarButtonGroup>
            </>
          )}

          {workspace === 'spectral-editing' && (
            <>
              <ToolbarButtonGroup gap={2}>
                {show('zoom-in') && <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} />}
                {show('zoom-out') && <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} />}
                {show('zoom-toggle') && <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} />}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToggleToolButton
                  icon="waveform"
                  ariaLabel="Waveform"
                  isActive={spectrogramMode}
                  onClick={onToggleSpectrogram}
                />
              </ToolbarButtonGroup>
            </>
          )}

          {workspace === 'modern' && (
            <>
              <ToolbarButtonGroup gap={2}>
                {show('automation') && (
                <ToggleToolButton
                  icon="automation"
                  ariaLabel="Clip envelope"
                  isActive={envelopeMode}
                  onClick={onToggleEnvelope}
                />
                )}
                {show('cut') && <ToggleToolButton icon="split" ariaLabel="Cut / Split" isActive={splitMode} onClick={onToggleSplit} />}
                {show('spectral-editing') && (
                <ToggleToolButton
                  icon="spectrogram"
                  ariaLabel="Spectral view"
                  isActive={spectrogramMode}
                  onClick={onToggleSpectrogram}
                />
                )}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('zoom-in') && <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} />}
                {show('zoom-out') && <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} />}
                {show('zoom-toggle') && <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} />}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('trim') && <ToolButton icon="trim" ariaLabel="Trim" />}
                {show('silence') && <ToolButton icon="silence" ariaLabel="Silence" />}
              </ToolbarButtonGroup>
            </>
          )}

          {workspace === 'music' && (
            <>
              <ToolbarButtonGroup gap={2}>
                {show('automation') && (
                <ToggleToolButton
                  icon="automation"
                  ariaLabel="Clip envelope"
                  isActive={envelopeMode}
                  onClick={onToggleEnvelope}
                />
                )}
                {show('cut') && <ToggleToolButton icon="split" ariaLabel="Cut / Split" isActive={splitMode} onClick={onToggleSplit} />}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('zoom-in') && <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} />}
                {show('zoom-out') && <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} />}
                {show('zoom-toggle') && <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} />}
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                {show('trim') && <ToolButton icon="trim" ariaLabel="Trim" />}
                {show('silence') && <ToolButton icon="silence" ariaLabel="Silence" />}
              </ToolbarButtonGroup>
            </>
          )}


          {show('timecode') && (
          <ToolbarButtonGroup gap={2}>
            <TimeCode
              value={currentTime}
              format={timeCodeFormat}
              onChange={onTimeCodeChange}
              onFormatChange={onTimeCodeFormatChange}
            />
          </ToolbarButtonGroup>
          )}

          {workspace === 'music' && (
            <>
              {show('bpm') && (
              <ToolbarButtonGroup gap={2}>
                <BpmStepper
                  value={bpm}
                  onChange={(next) => onBpmChange?.(next)}
                  min={20}
                  max={300}
                />
              </ToolbarButtonGroup>
              )}

              {show('time-signature') && (
              <ToolbarButtonGroup gap={2}>
                <TimeSignatureSelector
                  value={{ numerator: beatsPerMeasure, denominator: noteValue }}
                  onChange={(next) => onTimeSignatureChange?.(next)}
                />
              </ToolbarButtonGroup>
              )}
            </>
          )}


          {show('snapping') && (
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
              {snapMode === 'musical'
                ? { 1: 'Bar', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16', 32: '1/32', 64: '1/64', 128: '1/128' }[snapSubdivision]
                : { seconds: 'Seconds', deciseconds: 'Deciseconds', centiseconds: 'Centiseconds', milliseconds: 'Milliseconds', samples: 'Samples', 'video-24fps': 'Video Frames (24 fps)', 'video-29.97fps': 'NTSC (29.97 fps)', 'video-30fps': 'NTSC (30 fps)', 'video-25fps': 'PAL (25 fps)', 'cdda-75fps': 'CDDA (75 fps)' }[snapMode]
              }
              <Icon name="caret-down" size={10} />
            </button>
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
          </ToolbarButtonGroup>
          )}


          <ToolbarButtonGroup gap={2}>
            {show('microphone-levels') && <ToolButton icon="microphone" ariaLabel="Microphone settings" onClick={() => {}} />}
          </ToolbarButtonGroup>

          {/* Playback meter cluster: the volume settings button hosts the
              meter's controls, so it must stay glued to the meter — they
              wrap together as a single unit. */}
          {show('playback-meter') && (
          <ToolbarButtonGroup gap={6}>
            <div ref={volumeButtonRef} style={{ display: 'inline-flex' }}>
              <ToolButton
                icon="volume"
                ariaLabel="Playback volume settings"
                onClick={handleVolumeButtonClick}
              />
            </div>
            {meterOrientation === 'horizontal' && (
              <MasterMeter
                levelLeft={masterLevelLeft}
                levelRight={masterLevelRight}
                clippedLeft={masterClippedLeft}
                clippedRight={masterClippedRight}
                recentPeakLeft={masterRecentPeakLeft}
                recentPeakRight={masterRecentPeakRight}
                volume={masterVolume}
                onVolumeChange={onMasterVolumeChange}
              />
            )}
          </ToolbarButtonGroup>
          )}

          <ContextMenu
            isOpen={volumeMenuOpen}
            onClose={() => setVolumeMenuOpen(false)}
            x={volumeMenuPos.x}
            y={volumeMenuPos.y}
          >
            <ContextMenuItem
              label="Horizontal meter"
              checked={meterOrientation === 'horizontal'}
              onClick={() => {
                setMeterOrientation('horizontal');
                setVolumeMenuOpen(false);
              }}
            />
            <ContextMenuItem
              label="Vertical meter"
              checked={meterOrientation === 'vertical'}
              onClick={() => {
                setMeterOrientation('vertical');
                setVolumeMenuOpen(false);
              }}
            />
          </ContextMenu>

        </>
      )}
    </Toolbar>
  );
}
