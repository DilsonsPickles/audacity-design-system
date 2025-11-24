import { useState } from 'react';
import {
  Button,
  GhostButton,
  Icon,
  PanKnob,
  Slider,
  ToggleButton,
  TrackControlPanel,
  Clip,
  EnvelopePoint,
  EnvelopeCurve,
  ResizablePanel,
  type ClipTheme,
  type ClipData,
} from '@audacity-ui/components';
import type { EnvelopePoint as EnvelopePointData } from '@audacity-ui/core';
import '@audacity-ui/components/style.css';

// Figma-accurate blue clip theme
const clipTheme: ClipTheme = {
  clipBackground: '#C4DBFF',
  clipHeaderBackground: '#B4CBEF',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#8FB5E0',
  waveformColor: '#3D3D3D',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  envelopeFillColor: 'rgba(255, 255, 255, 0.3)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  segmentHoverColor: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
};

// Sample clip data
const generateWaveform = (length: number): number[] => {
  const waveform: number[] = [];
  for (let i = 0; i < length; i++) {
    // Mix multiple frequencies for realistic audio appearance
    const lowFreq = Math.sin(i / 200) * 0.4;
    const midFreq = Math.sin(i / 80) * 0.3;
    const highFreq = Math.sin(i / 30) * 0.15;
    const noise = (Math.random() - 0.5) * 0.15;

    waveform.push(lowFreq + midFreq + highFreq + noise);
  }
  return waveform;
};

const sampleClip: ClipData = {
  id: 1,
  name: 'Audio Clip',
  startTime: 0,
  duration: 3,
  waveform: generateWaveform(600),
  envelopePoints: [
    { time: 0, db: -6 },
    { time: 1, db: 0 },
    { time: 2, db: -3 },
    { time: 3, db: -6 },
  ],
  selected: false,
};

function App() {
  const [pan, setPan] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isToggled, setIsToggled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [panelHeight, setPanelHeight] = useState(200);

  return (
    <div style={{
      padding: '40px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Audacity Component Playground</h1>
      <p style={{ color: '#666', marginTop: '10px' }}>
        Interactive demo of all components from @audacity-ui/components
      </p>

      {/* Buttons */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
          <Button variant="secondary" size="default">Default Button</Button>
          <Button variant="secondary" size="small">Small Button</Button>
          <GhostButton ariaLabel="Ghost button" />
        </div>
      </section>

      {/* Toggle Button */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>Toggle Button</h2>
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
          <ToggleButton active={isToggled} onClick={() => setIsToggled(!isToggled)} ariaLabel="Toggle">
            T
          </ToggleButton>
          <p>Active: {isToggled ? 'Yes' : 'No'}</p>
        </div>
      </section>

      {/* Icon */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>Icons</h2>
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
          <Icon name="mixer" size={16} />
          <Icon name="mixer" size={24} />
          <Icon name="mixer" size={32} />
        </div>
      </section>

      {/* PanKnob */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        display: 'inline-block'
      }}>
        <h2>PanKnob</h2>
        <PanKnob value={pan} onChange={setPan} />
        <p style={{ marginTop: '20px' }}>Value: {pan}</p>
      </section>

      {/* Slider */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '400px'
      }}>
        <h2>Slider</h2>
        <Slider value={volume} onChange={setVolume} />
        <p style={{ marginTop: '20px' }}>Value: {volume}</p>
      </section>

      {/* Track Control Panel */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '400px'
      }}>
        <h2>Track Control Panel</h2>
        <TrackControlPanel
          trackName="Mono Track 1"
          volume={volume}
          pan={pan}
          isMuted={isMuted}
          isSolo={isSolo}
          onVolumeChange={setVolume}
          onPanChange={setPan}
          onMuteToggle={() => setIsMuted(!isMuted)}
          onSoloToggle={() => setIsSolo(!isSolo)}
        />
      </section>

      {/* Resizable Panel */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>Resizable Panel</h2>
        <div style={{ marginTop: '20px' }}>
          <ResizablePanel
            initialHeight={panelHeight}
            minHeight={100}
            maxHeight={400}
            onHeightChange={setPanelHeight}
            resizeEdge="bottom"
          >
            <div style={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
              <p>Resizable content area (drag bottom edge)</p>
              <p>Height: {panelHeight}px</p>
            </div>
          </ResizablePanel>
        </div>
      </section>

      {/* Clip Component */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>Clip Component</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Audio clip with waveform and envelope visualization
        </p>
        <div style={{
          position: 'relative',
          width: '600px',
          height: '150px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <Clip
            clip={sampleClip}
            x={0}
            y={0}
            width={600}
            height={150}
            pixelsPerSecond={200}
            selected={false}
            envelopeMode={true}
            theme={clipTheme}
          />
        </div>
      </section>

      {/* EnvelopePoint Component */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>EnvelopePoint Component</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Individual envelope control point
        </p>
        <div style={{
          position: 'relative',
          width: '400px',
          height: '200px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
        }}>
          <EnvelopePoint
            x={100}
            y={100}
            color="#ffffff"
            hoverColor="#ffaa00"
            strokeColor="#2ecc71"
          />
          <EnvelopePoint
            x={200}
            y={80}
            isHovered={true}
            color="#ffffff"
            hoverColor="#ffaa00"
            strokeColor="#2ecc71"
          />
          <EnvelopePoint
            x={300}
            y={120}
            isDragged={true}
            color="#ffffff"
            hoverColor="#ffaa00"
            strokeColor="#2ecc71"
          />
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: '#fff', fontSize: '11px' }}>
            Left: Default | Middle: Hovered | Right: Dragged
          </div>
        </div>
      </section>

      {/* EnvelopeCurve Component */}
      <section style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h2>EnvelopeCurve Component</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Envelope curve with control points
        </p>
        <div style={{
          position: 'relative',
          width: '600px',
          height: '150px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
        }}>
          <EnvelopeCurve
            points={[
              { time: 0, db: 0 },
              { time: 1, db: 6 },
              { time: 2, db: -6 },
              { time: 3, db: 3 },
            ]}
            x={0}
            y={0}
            width={600}
            height={150}
            startTime={0}
            duration={3}
            pixelsPerSecond={200}
            lineColor="#2ecc71"
            lineColorHover="#ffaa00"
            pointColor="#ffffff"
            pointColorHover="#ffaa00"
            active={true}
          />
        </div>
      </section>

      <div style={{ marginTop: '60px', padding: '20px', textAlign: 'center', color: '#999' }}>
        <p>All components from @audacity-ui/components v0.1.0</p>
      </div>
    </div>
  );
}

export default App;
