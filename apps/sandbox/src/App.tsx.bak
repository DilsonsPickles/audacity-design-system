import React, { useState, useRef, useCallback } from 'react';
import { Clip, TrackControlSidePanel, TrackControlPanel } from '@audacity-ui/components';
import type { Clip as ClipData, ClipTheme } from '@audacity-ui/core';
import './App.css';

// Generate realistic speech-like waveform
const generateWaveform = (duration: number): number[] => {
  const sampleCount = Math.floor(duration * 50000);
  const waveform: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const speechEnvelope =
      Math.abs(Math.sin(t * Math.PI * 3 + Math.random() * 0.5)) *
      (0.3 + Math.abs(Math.sin(t * Math.PI * 0.5)) * 0.7) *
      (0.5 + Math.random() * 0.5);
    const voiceContent =
      Math.sin(t * Math.PI * 200 + Math.random() * 2) * 0.4 +
      Math.sin(t * Math.PI * 500 + Math.random() * 3) * 0.3 +
      Math.sin(t * Math.PI * 1200 + Math.random() * 5) * 0.2 +
      (Math.random() - 0.5) * 0.3;
    const value = voiceContent * speechEnvelope;
    waveform.push(Math.max(-1, Math.min(1, value)));
  }

  return waveform;
};

// Theme definitions
const blueTheme: ClipTheme = {
  clipBackground: '#C4DBFF',
  clipHeaderBackground: '#B4CBEF',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#8FB5E0',
  waveformColor: '#3D3D3D',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  envelopeFillColor: 'rgba(46, 204, 113, 0.1)',
  segmentHoverColor: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
};

const violetTheme: ClipTheme = {
  clipBackground: '#D4CCFF',
  clipHeaderBackground: '#C4B8FF',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#9B8FE0',
  waveformColor: '#3D3D3D',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  envelopeFillColor: 'rgba(46, 204, 113, 0.1)',
  segmentHoverColor: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
};

const magentaTheme: ClipTheme = {
  clipBackground: '#FFCCF5',
  clipHeaderBackground: '#FFBCE5',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#E08FCC',
  waveformColor: '#3D3D3D',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  envelopeFillColor: 'rgba(46, 204, 113, 0.1)',
  segmentHoverColor: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
};

// Initial clips data
const initialClips: ClipData[] = [
  {
    id: 'clip-1',
    trackId: 'track-1',
    name: 'Vocal Take 1',
    startTime: 0,
    duration: 5,
    waveform: generateWaveform(5),
    envelopePoints: [
      { time: 0, db: -60 },
      { time: 1.5, db: 0 },
      { time: 3.5, db: 0 },
      { time: 5, db: -60 },
    ],
  },
  {
    id: 'clip-2',
    trackId: 'track-1',
    name: 'Vocal Take 2',
    startTime: 6,
    duration: 4,
    waveform: generateWaveform(4),
    envelopePoints: [
      { time: 0, db: 0 },
      { time: 1, db: 6 },
      { time: 2, db: -3 },
      { time: 3, db: 3 },
      { time: 4, db: 0 },
    ],
  },
  {
    id: 'clip-3',
    trackId: 'track-2',
    name: 'Guitar',
    startTime: 1,
    duration: 6,
    waveform: generateWaveform(6),
    envelopePoints: [
      { time: 0, db: 0 },
      { time: 3, db: 6 },
      { time: 6, db: 0 },
    ],
  },
  {
    id: 'clip-4',
    trackId: 'track-3',
    name: 'Bass',
    startTime: 0,
    duration: 8,
    waveform: generateWaveform(8),
    envelopePoints: [],
  },
];

interface Track {
  id: string;
  name: string;
  theme: ClipTheme;
  height: number;
}

const TRACK_HEIGHT = 114;
const PIXELS_PER_SECOND = 100;

function App() {
  const [clips, setClips] = useState<ClipData[]>(initialClips);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [envelopeMode, setEnvelopeMode] = useState(false);
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [trackMuteState, setTrackMuteState] = useState<Record<string, boolean>>({});
  const [trackSoloState, setTrackSoloState] = useState<Record<string, boolean>>({});

  const tracks: Track[] = [
    { id: 'track-1', name: 'Track 1 - Vocals', theme: blueTheme, height: TRACK_HEIGHT },
    { id: 'track-2', name: 'Track 2 - Guitar', theme: violetTheme, height: TRACK_HEIGHT },
    { id: 'track-3', name: 'Track 3 - Bass', theme: magentaTheme, height: TRACK_HEIGHT },
  ];

  const handleClipClick = (clipId: string) => {
    setSelectedClipId(clipId);
  };

  const handleTrackClick = (trackId: string) => {
    setSelectedTrackId(trackId);
  };

  const handleTrackMuteToggle = (trackId: string) => {
    setTrackMuteState(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const handleTrackSoloToggle = (trackId: string) => {
    setTrackSoloState(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const handleEnvelopePointDrag = useCallback((clipId: string, pointIndex: number, newDb: number) => {
    setClips(prevClips =>
      prevClips.map(clip => {
        if (clip.id === clipId) {
          const newPoints = [...clip.envelopePoints];
          newPoints[pointIndex] = { ...newPoints[pointIndex], db: newDb };
          return { ...clip, envelopePoints: newPoints };
        }
        return clip;
      })
    );
  }, []);

  const handleAddEnvelopePoint = useCallback((clipId: string, time: number, db: number) => {
    setClips(prevClips =>
      prevClips.map(clip => {
        if (clip.id === clipId) {
          const newPoints = [...clip.envelopePoints, { time, db }].sort((a, b) => a.time - b.time);
          return { ...clip, envelopePoints: newPoints };
        }
        return clip;
      })
    );
  }, []);

  const handleDeleteEnvelopePoint = useCallback((clipId: string, pointIndex: number) => {
    setClips(prevClips =>
      prevClips.map(clip => {
        if (clip.id === clipId) {
          const newPoints = clip.envelopePoints.filter((_, i) => i !== pointIndex);
          return { ...clip, envelopePoints: newPoints };
        }
        return clip;
      })
    );
  }, []);

  return (
    <div className="sandbox">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <h1>Audacity UI Sandbox</h1>
          <span className="version">v0.1.0</span>
        </div>
        <div className="toolbar-center">
          <button className="tool-button">
            <span>⏮</span>
          </button>
          <button className="tool-button">
            <span>⏪</span>
          </button>
          <button className="tool-button play">
            <span>▶</span>
          </button>
          <button className="tool-button">
            <span>⏸</span>
          </button>
          <button className="tool-button">
            <span>⏹</span>
          </button>
          <button className="tool-button">
            <span>⏩</span>
          </button>
          <button className="tool-button">
            <span>⏭</span>
          </button>
        </div>
        <div className="toolbar-right">
          <label className="toggle">
            <input
              type="checkbox"
              checked={envelopeMode}
              onChange={(e) => setEnvelopeMode(e.target.checked)}
            />
            <span>Envelope Mode</span>
          </label>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Track control side panel */}
        <TrackControlSidePanel trackHeights={tracks.map(t => t.height)}>
          {tracks.map(track => (
            <TrackControlPanel
              key={track.id}
              trackName={track.name}
              trackType="mono"
              volume={75}
              pan={0}
              isMuted={trackMuteState[track.id] || false}
              isSolo={trackSoloState[track.id] || false}
              onMuteToggle={() => handleTrackMuteToggle(track.id)}
              onSoloToggle={() => handleTrackSoloToggle(track.id)}
              state={selectedTrackId === track.id ? 'active' : 'idle'}
              height="default"
            />
          ))}
        </TrackControlSidePanel>

        {/* Timeline */}
        <div className="timeline">
          <div className="ruler">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="ruler-mark">
                <span>{i}s</span>
              </div>
            ))}
          </div>

          {/* Tracks */}
          <div className="tracks">
            {tracks.map((track, trackIndex) => (
              <div
                key={track.id}
                className="track"
                style={{
                  height: track.height,
                  backgroundColor: '#2a2a2a',
                  borderBottom: '1px solid #3a3a3a',
                }}
              >
                {clips
                  .filter(clip => clip.trackId === track.id)
                  .map(clip => {
                    const x = clip.startTime * PIXELS_PER_SECOND;
                    const width = clip.duration * PIXELS_PER_SECOND;
                    const isSelected = clip.id === selectedClipId;

                    return (
                      <div
                        key={clip.id}
                        style={{
                          position: 'absolute',
                          left: x,
                          top: 0,
                          width,
                          height: track.height,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleClipClick(clip.id)}
                      >
                        <Clip
                          clip={clip}
                          x={0}
                          y={0}
                          width={width}
                          height={track.height}
                          pixelsPerSecond={PIXELS_PER_SECOND}
                          selected={isSelected}
                          envelopeMode={envelopeMode}
                          theme={isSelected ? { ...track.theme, clipBorder: '#FFFFFF' } : track.theme}
                          hoveredSegmentIndex={hoveredSegmentIndex}
                          draggedPointIndex={draggedPointIndex}
                        />
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <div className="status-item">
          Selected: <strong>{selectedClipId || 'None'}</strong>
        </div>
        <div className="status-item">
          Envelope Mode: <strong>{envelopeMode ? 'ON' : 'OFF'}</strong>
        </div>
        <div className="status-item">
          Clips: <strong>{clips.length}</strong>
        </div>
      </div>
    </div>
  );
}

export default App;
