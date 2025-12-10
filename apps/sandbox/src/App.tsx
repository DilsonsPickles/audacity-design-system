import React from 'react';
import { TracksProvider } from './contexts/TracksContext';
import { Canvas } from './components/Canvas';
import { ProjectToolbar, Toolbar, ToolbarButtonGroup, ToolbarDivider, TransportButton, ToolButton, ToggleToolButton, Icon, TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, TimeCode, TimeCodeFormat } from '@audacity-ui/components';
import { useTracks } from './contexts/TracksContext';

// Generate realistic waveform data
function generateWaveform(durationSeconds: number, samplesPerSecond: number = 100): number[] {
  const totalSamples = Math.floor(durationSeconds * samplesPerSecond);
  const waveform: number[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / samplesPerSecond;
    // Combine multiple frequencies for a more realistic waveform
    const wave1 = Math.sin(2 * Math.PI * 2 * t) * 0.3;  // Low frequency
    const wave2 = Math.sin(2 * Math.PI * 5 * t) * 0.2;  // Mid frequency
    const wave3 = Math.sin(2 * Math.PI * 10 * t) * 0.1; // Higher frequency
    // Add some randomness for noise
    const noise = (Math.random() - 0.5) * 0.1;
    // Envelope for more natural fade in/out
    const envelope = Math.sin((i / totalSamples) * Math.PI) * 0.8 + 0.2;

    waveform.push((wave1 + wave2 + wave3 + noise) * envelope);
  }

  return waveform;
}

// Sample track data
const sampleTracks = [
  {
    id: 1,
    name: 'Track 1',
    height: 114,
    clips: [
      {
        id: 1,
        name: 'Vocal Take 1',
        start: 0.5,
        duration: 4.0,
        waveform: generateWaveform(4.0),
        envelopePoints: [],
      },
      {
        id: 2,
        name: 'Vocal Take 2',
        start: 5.0,
        duration: 3.5,
        waveform: generateWaveform(3.5),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 2,
    name: 'Track 2',
    height: 114,
    clips: [
      {
        id: 3,
        name: 'Guitar',
        start: 2.0,
        duration: 6.0,
        waveform: generateWaveform(6.0),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 3,
    name: 'Track 3',
    height: 114,
    clips: [
      {
        id: 4,
        name: 'Drums',
        start: 1.0,
        duration: 3.0,
        waveform: generateWaveform(3.0),
        envelopePoints: [],
      },
      {
        id: 5,
        name: 'Percussion',
        start: 5.5,
        duration: 1.5,
        waveform: generateWaveform(1.5),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 4,
    name: 'Track 4 (Stereo)',
    height: 114,
    clips: [
      {
        id: 6,
        name: 'Synth Pad',
        start: 1.5,
        duration: 5.0,
        waveformLeft: generateWaveform(5.0),
        waveformRight: generateWaveform(5.0),
        envelopePoints: [],
      },
    ],
  },
];

type Workspace = 'classic' | 'spectral-editing';

function CanvasDemoContent() {
  const { state, dispatch } = useTracks();
  const [scrollX, setScrollX] = React.useState(0);
  const [activeMenuItem, setActiveMenuItem] = React.useState<'home' | 'project' | 'export'>('project');
  const [workspace, setWorkspace] = React.useState<Workspace>('classic');
  const [timeCodeFormat, setTimeCodeFormat] = React.useState<TimeCodeFormat>('hh:mm:ss');
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync playhead position with TimeCode display
  const currentTime = state.playheadPosition;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    console.log('Scroll event:', scrollLeft);
    setScrollX(scrollLeft);
  };

  const handleToggleEnvelope = () => {
    dispatch({ type: 'SET_ENVELOPE_MODE', payload: !state.envelopeMode });
  };

  const handleToggleSpectrogram = () => {
    dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: !state.spectrogramMode });
  };

  // Calculate the effective time selection for the ruler
  // If spectral selection is full-height, show it as a time selection in the ruler
  const rulerTimeSelection = React.useMemo(() => {
    if (state.spectralSelection) {
      const { minFrequency, maxFrequency, startTime, endTime, trackIndex } = state.spectralSelection;

      // Check if it's a stereo track
      const track = state.tracks[trackIndex];
      const clip = track?.clips.find(c => c.id === state.spectralSelection?.clipId);
      const isStereo = clip && (clip as any).waveformLeft && (clip as any).waveformRight;
      const isSpectrogramMode = track?.viewMode === 'spectrogram';

      // Full-height spectral selection cases:
      // 1. Mono/split: full range 0-1
      // 2. Stereo spectrogram: full L channel (0.5-1) or full R channel (0-0.5)
      const isFullHeight = (minFrequency === 0 && maxFrequency === 1) ||
                           (isSpectrogramMode && isStereo && minFrequency === 0.5 && maxFrequency === 1.0) ||
                           (isSpectrogramMode && isStereo && minFrequency === 0.0 && maxFrequency === 0.5);

      if (isFullHeight) {
        return { startTime, endTime };
      }
    }
    // Otherwise show regular time selection
    return state.timeSelection;
  }, [state.spectralSelection, state.timeSelection, state.tracks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <ProjectToolbar
        activeItem={activeMenuItem}
        onMenuItemClick={setActiveMenuItem}
        centerContent={
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3d3e42' }}>
              <Icon name="mixer" size={16} />
              <span style={{ fontSize: '13px' }}>Mixer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3d3e42' }}>
              <Icon name="cog" size={16} />
              <span style={{ fontSize: '13px' }}>Audio setup</span>
            </div>
          </>
        }
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#3d3e42' }}>Workspace</span>
            <select
              style={{ fontSize: '13px', padding: '4px 8px', border: '1px solid #d4d5d9', borderRadius: '4px', backgroundColor: '#fff' }}
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value as Workspace)}
            >
              <option value="classic">Classic</option>
              <option value="spectral-editing">Spectral editing</option>
            </select>
          </div>
        }
      />
      <Toolbar>
        {/* Transport controls - shown in all workspaces */}
        <ToolbarButtonGroup gap={2}>
          <TransportButton icon="play" />
          <TransportButton icon="stop" />
          <TransportButton icon="record" />
          <TransportButton icon="skip-back" />
          <TransportButton icon="skip-forward" />
          <TransportButton icon="loop" />
        </ToolbarButtonGroup>

        {workspace === 'classic' && (
          <>
            <ToolbarDivider />

            <ToolbarButtonGroup gap={2}>
              <ToggleToolButton
                icon="automation"
                isActive={state.envelopeMode}
                onClick={handleToggleEnvelope}
              />
            </ToolbarButtonGroup>

            <ToolbarButtonGroup gap={2}>
              <ToolButton icon="zoom-in" />
              <ToolButton icon="zoom-out" />
            </ToolbarButtonGroup>

            <ToolbarButtonGroup gap={2}>
              <ToolButton icon="cut" />
              <ToolButton icon="copy" />
              <ToolButton icon="paste" />
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
              <ToolButton icon="zoom-in" />
              <ToolButton icon="zoom-out" />
            </ToolbarButtonGroup>

            <ToolbarButtonGroup gap={2}>
              <ToggleToolButton
                icon="waveform"
                isActive={state.spectrogramMode}
                onClick={handleToggleSpectrogram}
              />
            </ToolbarButtonGroup>
          </>
        )}

        <ToolbarDivider />

        {/* TimeCode display */}
        <ToolbarButtonGroup gap={2}>
          <TimeCode
            value={currentTime}
            format={timeCodeFormat}
            onChange={(newTime) => {
              // When user edits TimeCode, update the playhead position
              dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newTime });
            }}
            onFormatChange={setTimeCodeFormat}
          />
        </ToolbarButtonGroup>
      </Toolbar>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Track Control Side Panel - Full Height */}
        <TrackControlSidePanel
          trackHeights={state.tracks.map(t => t.height || 114)}
          trackViewModes={state.tracks.map(t => t.viewMode)}
          focusedTrackIndex={state.focusedTrackIndex}
          onTrackResize={(trackIndex, height) => {
            dispatch({ type: 'UPDATE_TRACK_HEIGHT', payload: { index: trackIndex, height } });
          }}
          onDeleteTrack={(trackIndex) => {
            console.log('Delete track:', trackIndex);
            // TODO: Implement delete track
          }}
          onMoveTrackUp={(trackIndex) => {
            console.log('Move track up:', trackIndex);
            // TODO: Implement move track up
          }}
          onMoveTrackDown={(trackIndex) => {
            console.log('Move track down:', trackIndex);
            // TODO: Implement move track down
          }}
          onTrackViewChange={(trackIndex, viewMode) => {
            dispatch({ type: 'UPDATE_TRACK_VIEW', payload: { index: trackIndex, viewMode } });
          }}
        >
          {state.tracks.map((track, index) => (
            <TrackControlPanel
              key={track.id}
              trackName={track.name}
              trackType="mono"
              volume={75}
              pan={0}
              isMuted={false}
              isSolo={false}
              onMuteToggle={() => {}}
              onSoloToggle={() => {}}
              state={state.selectedTrackIndices.includes(index) ? 'active' : 'idle'}
              height="default"
              onClick={() => dispatch({ type: 'SELECT_TRACK', payload: index })}
            />
          ))}
        </TrackControlSidePanel>

        {/* Timeline Ruler + Canvas Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Timeline Ruler - Fixed at top */}
          <div ref={canvasContainerRef} style={{ position: 'relative', backgroundColor: '#1a1b26', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ transform: `translateX(-${scrollX}px)`, width: '5000px', position: 'relative' }}>
              <TimelineRuler
                pixelsPerSecond={100}
                scrollX={0}
                totalDuration={50}
                width={5000}
                height={40}
                timeSelection={rulerTimeSelection}
                spectralSelection={state.spectralSelection}
                selectionColor="rgba(112, 181, 255, 0.5)"
              />
              {/* Playhead icon only in ruler */}
              <PlayheadCursor
                position={state.playheadPosition}
                pixelsPerSecond={100}
                height={0}
                showTopIcon={true}
                iconTopOffset={24}
                onPositionChange={(newPosition) => {
                  dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
                }}
                minPosition={0} // Allow playhead stalk to touch the 12px gap area
              />
            </div>
          </div>

          {/* Canvas - Scrollable */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            style={{ flex: 1, overflowX: 'scroll', overflowY: 'hidden', backgroundColor: '#212433' }}
          >
            <div style={{ minWidth: '5000px', height: '100%', position: 'relative' }}>
              <Canvas pixelsPerSecond={100} width={5000} leftPadding={12} />
              {/* Playhead stalk only (no icon) */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                <PlayheadCursor
                  position={state.playheadPosition}
                  pixelsPerSecond={100}
                  height={1000}
                  showTopIcon={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8f8f9',
          borderTop: '1px solid #d4d5d9',
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
        }}
      >
        <div>
          <strong>Envelope Mode:</strong> {state.envelopeMode ? 'ON' : 'OFF'}
        </div>
        <div>
          <strong>Selected Tracks:</strong> {state.selectedTrackIndices.join(', ') || 'None'}
        </div>
        <div>
          <strong>Focused Track:</strong> {state.focusedTrackIndex !== null ? state.focusedTrackIndex : 'None'}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TracksProvider initialTracks={sampleTracks}>
      <CanvasDemoContent />
    </TracksProvider>
  );
}
