'use client';

import { useState } from 'react';
import { TrackControlPanel } from '../../../../../packages/components/src/TrackControlPanel/TrackControlPanel';
import '../../../../../packages/components/src/TrackControlPanel/TrackControlPanel.css';

export default function ComponentsDemo() {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div style={{ padding: '40px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '32px', fontSize: '32px', fontWeight: 'bold' }}>
        TrackControlPanel Component Demo
      </h1>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
          Interactive Demo
        </h2>
        <TrackControlPanel
          trackName="Mono track 1"
          trackType="mono"
          volume={volume}
          pan={0}
          isMuted={isMuted}
          isSolo={isSolo}
          state="idle"
          height="default"
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
          Current State:
        </h3>
        <pre style={{
          background: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'monospace'
        }}>
{JSON.stringify({
  volume,
  isMuted,
  isSolo,
  isRecording
}, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
          Multiple Tracks
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TrackControlPanel
            trackName="Vocal Track"
            trackType="mono"
            volume={80}
            isMuted={false}
            isSolo={false}
            onVolumeChange={(v) => console.log('Vocal volume:', v)}
          />
          <TrackControlPanel
            trackName="Guitar Track"
            trackType="stereo"
            volume={65}
            isMuted={true}
            isSolo={false}
            onVolumeChange={(v) => console.log('Guitar volume:', v)}
          />
          <TrackControlPanel
            trackName="Drums Track"
            trackType="stereo"
            volume={90}
            isMuted={false}
            isSolo={true}
            onVolumeChange={(v) => console.log('Drums volume:', v)}
          />
        </div>
      </div>
    </div>
  );
}
