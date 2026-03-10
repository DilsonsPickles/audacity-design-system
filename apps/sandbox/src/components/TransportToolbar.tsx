import React from 'react';
import { Toolbar, ToolbarButtonGroup, ToolbarDivider, TransportButton, ToolButton, ToggleToolButton, TimeCode, TimeCodeFormat, Button, Icon, ContextMenu, ContextMenuItem, useTheme } from '@audacity-ui/components';

type Workspace = 'classic' | 'spectral-editing';

export interface TransportToolbarProps {
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';
  workspace: Workspace;

  // Playback
  isPlaying: boolean;
  isRecording: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  useSplitRecordButton?: boolean;
  rollInTimeEnabled?: boolean;
  onToggleRollInTime?: () => void;

  // Loop
  loopRegionEnabled: boolean;
  loopRegionStart: number | null;
  loopRegionEnd: number | null;
  setLoopRegionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setLoopRegionStart: React.Dispatch<React.SetStateAction<number | null>>;
  setLoopRegionEnd: React.Dispatch<React.SetStateAction<number | null>>;
  timeSelection: { startTime: number; endTime: number } | null;
  bpm: number;
  beatsPerMeasure: number;

  // Mode toggles
  envelopeMode: boolean;
  spectrogramMode: boolean;
  onToggleEnvelope: () => void;
  onToggleSpectrogram: () => void;

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
  caretRef: React.RefObject<HTMLButtonElement | null>;
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
          backgroundColor: isRecording ? bg('pressed') : bg(mainState),
          color: theme.audio.transport.record,
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
  isPlaying, isRecording, onPlay, onStop, onRecord, useSplitRecordButton = false, rollInTimeEnabled = false, onToggleRollInTime,
  loopRegionEnabled, loopRegionStart, loopRegionEnd,
  setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd,
  timeSelection, bpm, beatsPerMeasure,
  envelopeMode, spectrogramMode, onToggleEnvelope, onToggleSpectrogram,
  onZoomIn, onZoomOut, onZoomToSelection, onZoomToFitProject, onZoomToggle,
  currentTime, timeCodeFormat, onTimeCodeChange, onTimeCodeFormatChange,
  onShareClick, onExportAudioClick, onExportLoopRegionClick,
}: TransportToolbarProps) {
  const [recordMenuOpen, setRecordMenuOpen] = React.useState(false);
  const [recordMenuPos, setRecordMenuPos] = React.useState({ x: 0, y: 0 });
  const caretRef = React.useRef<HTMLButtonElement>(null);

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

  return (
    <Toolbar tabGroupId="tool-toolbar">
      {activeMenuItem === 'export' ? (
        <>
          <ToolbarButtonGroup gap={2}>
            <TransportButton icon={isPlaying ? "pause" : "play"} ariaLabel={isPlaying ? "Pause" : "Play"} onClick={onPlay} />
            <TransportButton icon="stop" ariaLabel="Stop" onClick={onStop} />
            <TransportButton
              icon="loop"
              ariaLabel="Loop"
              active={loopRegionEnabled}
              onClick={handleToggleLoop}
            />
          </ToolbarButtonGroup>

          <ToolbarDivider />

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

          <ToolbarDivider />

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
            <TransportButton icon={isPlaying ? "pause" : "play"} ariaLabel={isPlaying ? "Pause" : "Play"} onClick={onPlay} />
            <TransportButton icon="stop" ariaLabel="Stop" onClick={onStop} />
            {useSplitRecordButton ? (
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
                    label="Enable roll in time"
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
                ariaLabel="Record"
                active={isRecording}
                disabled={isPlaying}
                onClick={onRecord}
              />
            )}
            <TransportButton icon="skip-back" ariaLabel="Step backward" disabled={isPlaying} />
            <TransportButton icon="skip-forward" ariaLabel="Step forward" disabled={isPlaying} />
            <TransportButton
              icon="loop"
              ariaLabel="Loop"
              active={loopRegionEnabled}
              onClick={handleToggleLoop}
            />
          </ToolbarButtonGroup>

          {workspace === 'classic' && (
            <>
              <ToolbarDivider />

              <ToolbarButtonGroup gap={2}>
                <ToggleToolButton
                  icon="automation"
                  ariaLabel="Automation"
                  isActive={envelopeMode}
                  onClick={onToggleEnvelope}
                />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} />
                <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} />
                <ToolButton icon="zoom-to-selection" ariaLabel="Fit selection" onClick={onZoomToSelection} />
                <ToolButton icon="zoom-to-fit" ariaLabel="Fit project" onClick={onZoomToFitProject} />
                <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton
                  icon="cut"
                  ariaLabel="Cut"
                  onClick={() => {}}
                />
                <ToolButton
                  icon="copy"
                  ariaLabel="Copy"
                  onClick={() => {}}
                />
                <ToolButton
                  icon="paste"
                  ariaLabel="Paste"
                  onClick={() => {}}
                />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="trim" ariaLabel="Trim" />
                <ToolButton icon="silence" ariaLabel="Silence" />
              </ToolbarButtonGroup>
            </>
          )}

          {workspace === 'spectral-editing' && (
            <>
              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={onZoomIn} />
                <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={onZoomOut} />
                <ToolButton icon="zoom-toggle" ariaLabel="Zoom toggle" onClick={onZoomToggle} />
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

          <ToolbarDivider />

          <ToolbarButtonGroup gap={2}>
            <TimeCode
              value={currentTime}
              format={timeCodeFormat}
              onChange={onTimeCodeChange}
              onFormatChange={onTimeCodeFormatChange}
            />
          </ToolbarButtonGroup>
        </>
      )}
    </Toolbar>
  );
}
