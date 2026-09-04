import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TrackControlSidePanel, TrackControlPanel } from '@audacity-ui/components';

const meta = {
  title: 'Layout/TrackControlSidePanel',
  component: TrackControlSidePanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TrackControlSidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple story matching sandbox exactly
export const Default: Story = {
  render: () => {
    const [focusedTrackIndex, setFocusedTrackIndex] = React.useState<number | null>(null);
    const trackHeights = [114, 114, 114];

    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
        <TrackControlSidePanel
          trackHeights={trackHeights}
          focusedTrackIndex={focusedTrackIndex}
        >
          <TrackControlPanel
            trackName="Track 1"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            onMuteToggle={() => {}}
            onSoloToggle={() => {}}
            state={focusedTrackIndex === 0 ? 'active' : 'idle'}
            height="default"
            onClick={() => setFocusedTrackIndex(0)}
          />
          <TrackControlPanel
            trackName="Track 2"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            onMuteToggle={() => {}}
            onSoloToggle={() => {}}
            state={focusedTrackIndex === 1 ? 'active' : 'idle'}
            height="default"
            onClick={() => setFocusedTrackIndex(1)}
          />
          <TrackControlPanel
            trackName="Track 3"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            onMuteToggle={() => {}}
            onSoloToggle={() => {}}
            state={focusedTrackIndex === 2 ? 'active' : 'idle'}
            height="default"
            onClick={() => setFocusedTrackIndex(2)}
          />
        </TrackControlSidePanel>

        <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
          <h2>Default State</h2>
          <p>Click on a track to select and focus it. Should show 2px gaps between panels.</p>
          <p><strong>Focused Track:</strong> {focusedTrackIndex !== null ? `Track ${focusedTrackIndex + 1}` : 'None'}</p>
        </div>
      </div>
    );
  },
};

// Focused track
export const FocusedTrack: Story = {
  render: () => {
    const [focusedTrackIndex, setFocusedTrackIndex] = React.useState<number | null>(1);
    const trackHeights = [114, 114, 114];

    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
        <TrackControlSidePanel
          trackHeights={trackHeights}
          focusedTrackIndex={focusedTrackIndex}
        >
          <TrackControlPanel
            trackName="Track 1"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            onMuteToggle={() => {}}
            onSoloToggle={() => {}}
            state={focusedTrackIndex === 0 ? 'active' : 'idle'}
            height="default"
            onClick={() => setFocusedTrackIndex(0)}
          />
          <TrackControlPanel
            trackName="Track 2"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            onMuteToggle={() => {}}
            onSoloToggle={() => {}}
            state={focusedTrackIndex === 1 ? 'active' : 'idle'}
            height="default"
            onClick={() => setFocusedTrackIndex(1)}
          />
          <TrackControlPanel
            trackName="Track 3"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            onMuteToggle={() => {}}
            onSoloToggle={() => {}}
            state={focusedTrackIndex === 2 ? 'active' : 'idle'}
            height="default"
            onClick={() => setFocusedTrackIndex(2)}
          />
        </TrackControlSidePanel>

        <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
          <h2>Focused Track</h2>
          <p>Click on a track to change focus. Track 2 starts focused with blue outline.</p>
          <p><strong>Focused Track:</strong> {focusedTrackIndex !== null ? `Track ${focusedTrackIndex + 1}` : 'None'}</p>
        </div>
      </div>
    );
  },
};

// Many tracks
export const ManyTracks: Story = {
  render: () => {
    const [focusedTrackIndex, setFocusedTrackIndex] = React.useState<number | null>(5);
    const trackHeights = Array(12).fill(114);

    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
        <TrackControlSidePanel
          trackHeights={trackHeights}
          focusedTrackIndex={focusedTrackIndex}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <TrackControlPanel
              key={i}
              trackName={`Track ${i + 1}`}
              trackType={i % 2 === 0 ? 'mono' : 'stereo'}
              volume={75}
              pan={0}
              isMuted={false}
              isSolo={false}
              onMuteToggle={() => {}}
              onSoloToggle={() => {}}
              state={i === focusedTrackIndex ? 'active' : 'idle'}
              height="default"
              onClick={() => setFocusedTrackIndex(i)}
            />
          ))}
        </TrackControlSidePanel>

        <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
          <h2>Many Tracks</h2>
          <p>12 tracks - scrollable panel. Click on any track to focus it. Should show 2px gaps between panels.</p>
          <p><strong>Focused Track:</strong> {focusedTrackIndex !== null ? `Track ${focusedTrackIndex + 1}` : 'None'}</p>
        </div>
      </div>
    );
  },
};
