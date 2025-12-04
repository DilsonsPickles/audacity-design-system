import React from 'react';
import { TracksProvider } from '../contexts/TracksContext';
import { Canvas } from '../components/Canvas';
import { Toolbar, ToolbarButtonGroup, ToolbarDivider, GhostButton, ToggleButton, Icon, TrackControlSidePanel, TrackControlPanel, TimelineRuler } from '@audacity-ui/components';
import { useTracks } from '../contexts/TracksContext';

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
        waveform: [],
        envelopePoints: [],
      },
      {
        id: 2,
        name: 'Vocal Take 2',
        start: 5.0,
        duration: 3.5,
        waveform: [],
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
        waveform: [],
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
        waveform: [],
        envelopePoints: [],
      },
      {
        id: 5,
        name: 'Percussion',
        start: 5.5,
        duration: 1.5,
        waveform: [],
        envelopePoints: [],
      },
    ],
  },
];

function CanvasDemoContent() {
  const { state, dispatch } = useTracks();
  const [canvasWidth, setCanvasWidth] = React.useState(800);
  const [scrollX, setScrollX] = React.useState(0);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateWidth = () => {
      if (canvasContainerRef.current) {
        setCanvasWidth(canvasContainerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    console.log('Scroll event:', scrollLeft);
    setScrollX(scrollLeft);
  };

  const handleToggleEnvelope = () => {
    dispatch({ type: 'SET_ENVELOPE_MODE', payload: !state.envelopeMode });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <Toolbar>
        <ToolbarButtonGroup gap={4}>
          <GhostButton>
            <Icon name="fa-bars" size={16} />
          </GhostButton>
          <GhostButton>
            <Icon name="fa-folder-open" size={16} />
          </GhostButton>
        </ToolbarButtonGroup>

        <ToolbarDivider />

        <ToolbarButtonGroup gap={2}>
          <GhostButton>
            <Icon name="fa-backward-step" size={16} />
          </GhostButton>
          <GhostButton>
            <Icon name="fa-play" size={16} />
          </GhostButton>
          <GhostButton>
            <Icon name="fa-forward-step" size={16} />
          </GhostButton>
        </ToolbarButtonGroup>

        <ToolbarDivider />

        <ToolbarButtonGroup gap={4}>
          <ToggleButton isActive={state.envelopeMode} onClick={handleToggleEnvelope}>
            <Icon name="fa-wave-square" size={16} />
          </ToggleButton>
        </ToolbarButtonGroup>
      </Toolbar>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Track Control Side Panel - Full Height */}
        <TrackControlSidePanel
          trackHeights={state.tracks.map(t => t.height || 114)}
          focusedTrackIndex={state.focusedTrackIndex}
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

        {/* Timeline Ruler + Canvas Area (same scroll container) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowX: 'scroll', overflowY: 'auto', backgroundColor: '#212433' }}
        >
          <div style={{ minWidth: '5000px' }}>
            {/* Timeline Ruler */}
            <div ref={canvasContainerRef}>
              <TimelineRuler
                pixelsPerSecond={100}
                scrollX={0}
                totalDuration={50}
                width={5000}
                height={40}
                timeSelection={state.timeSelection}
                selectionColor="rgba(112, 181, 255, 0.5)"
              />
            </div>

            {/* Canvas */}
            <Canvas pixelsPerSecond={100} width={5000} />
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

export default function CanvasDemo() {
  return (
    <TracksProvider initialTracks={sampleTracks}>
      <CanvasDemoContent />
    </TracksProvider>
  );
}
