import React, { useState } from 'react';
import { VerticalRulerPanel, type TrackRulerConfig } from '@audacity-ui/components';

/**
 * VerticalRulerPanel component demo
 *
 * Shows the full vertical ruler panel as it appears on the right side of the canvas
 */
export const VerticalRulerPanelDemo: React.FC = () => {
  const [tracks, setTracks] = useState<TrackRulerConfig[]>([
    { id: 'track1', height: 114, selected: false, stereo: false },
    { id: 'track2', height: 114, selected: true, stereo: false },
    { id: 'track3', height: 114, selected: false, stereo: true },
  ]);

  const toggleSelection = (id: string) => {
    setTracks(prev =>
      prev.map(track =>
        track.id === id ? { ...track, selected: !track.selected } : track
      )
    );
  };

  const toggleStereo = (id: string) => {
    setTracks(prev =>
      prev.map(track =>
        track.id === id ? { ...track, stereo: !track.stereo } : track
      )
    );
  };

  const adjustHeight = (id: string, delta: number) => {
    setTracks(prev =>
      prev.map(track =>
        track.id === id
          ? { ...track, height: Math.max(44, Math.min(342, track.height + delta)) }
          : track
      )
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1b1e' }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>
        Vertical Ruler Panel
      </h1>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Panel preview */}
        <div style={{ border: '1px solid #444', height: '600px' }}>
          <VerticalRulerPanel tracks={tracks} />
        </div>

        {/* Controls */}
        <div style={{ color: '#fff', flex: 1 }}>
          <h3>Track Controls</h3>
          {tracks.map((track, index) => (
            <div
              key={track.id}
              style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: track.selected ? '#2a3447' : '#25262b',
                borderRadius: '4px',
                border: track.selected ? '2px solid #677ce4' : '2px solid transparent',
              }}
            >
              <h4>Track {index + 1}</h4>
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Height: {track.height}px
                </label>
                <button
                  onClick={() => adjustHeight(track.id, -10)}
                  style={{ marginRight: '5px' }}
                >
                  -10px
                </button>
                <button
                  onClick={() => adjustHeight(track.id, 10)}
                  style={{ marginRight: '5px' }}
                >
                  +10px
                </button>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={track.selected}
                    onChange={() => toggleSelection(track.id)}
                    style={{ marginRight: '5px' }}
                  />
                  Selected
                </label>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={track.stereo}
                    onChange={() => toggleStereo(track.id)}
                    style={{ marginRight: '5px' }}
                  />
                  Stereo
                </label>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '40px', color: '#ccc' }}>
            <h3>Panel Features:</h3>
            <ul>
              <li>Lives on the right side of the canvas</li>
              <li>Header matches timeline ruler height (40px)</li>
              <li>Syncs with track heights and layout</li>
              <li>Shows selection state with blue border</li>
              <li>Supports mono and stereo tracks</li>
              <li>Stereo tracks show two stacked rulers</li>
              <li>Enabled via "Show vertical rulers" context menu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerticalRulerPanelDemo;
