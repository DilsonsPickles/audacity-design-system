import React from 'react';
import { Toolbar, ToolbarButtonGroup, ToolbarDivider, TransportButton, ToolButton, ToggleToolButton, TimeCode, TimeCodeFormat, Button, toast } from '@audacity-ui/components';

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

export function TransportToolbar({
  activeMenuItem, workspace,
  isPlaying, isRecording, onPlay, onStop, onRecord,
  loopRegionEnabled, loopRegionStart, loopRegionEnd,
  setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd,
  timeSelection, bpm, beatsPerMeasure,
  envelopeMode, spectrogramMode, onToggleEnvelope, onToggleSpectrogram,
  onZoomIn, onZoomOut, onZoomToSelection, onZoomToFitProject, onZoomToggle,
  currentTime, timeCodeFormat, onTimeCodeChange, onTimeCodeFormatChange,
  onShareClick, onExportAudioClick, onExportLoopRegionClick,
}: TransportToolbarProps) {
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
    <Toolbar startTabIndex={5} tabGroupId="tool-toolbar">
      {activeMenuItem === 'export' ? (
        <>
          <ToolbarButtonGroup gap={2}>
            <TransportButton icon={isPlaying ? "pause" : "play"} onClick={onPlay} />
            <TransportButton icon="stop" onClick={onStop} />
            <TransportButton
              icon="loop"
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
            <TransportButton icon={isPlaying ? "pause" : "play"} onClick={onPlay} />
            <TransportButton icon="stop" onClick={onStop} />
            <TransportButton
              icon="record"
              active={isRecording}
              disabled={isPlaying}
              onClick={onRecord}
            />
            <TransportButton icon="skip-back" disabled={isPlaying} />
            <TransportButton icon="skip-forward" disabled={isPlaying} />
            <TransportButton
              icon="loop"
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
                  isActive={envelopeMode}
                  onClick={onToggleEnvelope}
                />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="zoom-in" onClick={onZoomIn} />
                <ToolButton icon="zoom-out" onClick={onZoomOut} />
                <ToolButton icon="zoom-to-selection" onClick={onZoomToSelection} />
                <ToolButton icon="zoom-to-fit" onClick={onZoomToFitProject} />
                <ToolButton icon="zoom-toggle" onClick={onZoomToggle} />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton
                  icon="cut"
                  onClick={() => toast.info('Cut', 'Selected audio has been cut to clipboard', undefined, 6000)}
                />
                <ToolButton
                  icon="copy"
                  onClick={() => toast.info('Copy', 'Selected audio has been copied to clipboard', undefined, 6000)}
                />
                <ToolButton
                  icon="paste"
                  onClick={() => toast.info('Paste', 'Audio has been pasted from clipboard', undefined, 6000)}
                />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="trim" />
                <ToolButton icon="silence" />
              </ToolbarButtonGroup>
            </>
          )}

          {workspace === 'spectral-editing' && (
            <>
              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="zoom-in" onClick={onZoomIn} />
                <ToolButton icon="zoom-out" onClick={onZoomOut} />
                <ToolButton icon="zoom-toggle" onClick={onZoomToggle} />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToggleToolButton
                  icon="waveform"
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
