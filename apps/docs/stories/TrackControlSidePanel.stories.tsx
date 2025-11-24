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

// Default state: 3 tracks, none selected or focused
export const Default: Story = {
  args: {
    trackHeights: [114, 114, 114],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          isMuted={false}
          isSolo={false}
          state="idle"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          isMuted={false}
          isSolo={false}
          state="idle"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={0}
          isMuted={false}
          isSolo={false}
          state="idle"
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Default State</h2>
        <p>3 tracks, all idle (no selection, no focus)</p>
      </div>
    </div>
  ),
};

// Single track selected
export const SingleSelection: Story = {
  args: {
    trackHeights: [114, 114, 114],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          state="idle"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          state="selected"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={0}
          state="idle"
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Single Selection</h2>
        <p>Track 2 is selected</p>
      </div>
    </div>
  ),
};

// Multiple tracks selected
export const MultipleSelection: Story = {
  args: {
    trackHeights: [114, 114, 114, 114],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          state="selected"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          state="idle"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={0}
          state="selected"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 4"
          trackType="stereo"
          volume={70}
          pan={15}
          state="selected"
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Multiple Selection</h2>
        <p>Tracks 1, 3, and 4 are selected</p>
      </div>
    </div>
  ),
};

// Focused track (active state)
export const FocusedTrack: Story = {
  args: {
    trackHeights: [114, 114, 114],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          state="idle"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          state="active"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={0}
          state="idle"
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Focused Track</h2>
        <p>Track 2 is focused (active state)</p>
      </div>
    </div>
  ),
};

// Variable track heights
export const VariableHeights: Story = {
  args: {
    trackHeights: [80, 114, 150, 100],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          state="idle"
          height="truncated"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          state="idle"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={15}
          state="selected"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 4"
          trackType="stereo"
          volume={70}
          pan={0}
          state="idle"
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Variable Track Heights</h2>
        <p>Heights: 80px, 114px, 150px, 100px. Track 3 is selected.</p>
      </div>
    </div>
  ),
};

// Single track
export const SingleTrack: Story = {
  args: {
    trackHeights: [114],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="stereo"
          volume={75}
          pan={0}
          state="active"
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Single Track</h2>
        <p>One focused track at 114px height</p>
      </div>
    </div>
  ),
};

// Many tracks scrollable
export const ManyTracks: Story = {
  args: {
    trackHeights: Array(12).fill(114),
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <TrackControlPanel
            key={i}
            trackName={`Track ${i + 1}`}
            trackType={i % 2 === 0 ? 'mono' : 'stereo'}
            volume={70 + (i * 5) % 30}
            pan={((i - 5) * 20) % 100}
            state={i === 5 ? 'active' : i === 2 || i === 7 ? 'selected' : 'idle'}
            height="default"
          />
        ))}
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Many Tracks</h2>
        <p>12 tracks - scrollable panel. Track 6 focused, tracks 3 and 8 selected.</p>
      </div>
    </div>
  ),
};

// Mixed heights with selection
export const MixedHeights: Story = {
  args: {
    trackHeights: [44, 82, 114, 150, 82, 44],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          state="idle"
          height="collapsed"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          state="selected"
          height="truncated"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={15}
          state="active"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 4"
          trackType="stereo"
          volume={70}
          pan={0}
          state="selected"
          height="default"
        />
        <TrackControlPanel
          trackName="Track 5"
          trackType="mono"
          volume={65}
          pan={-15}
          state="idle"
          height="truncated"
        />
        <TrackControlPanel
          trackName="Track 6"
          trackType="stereo"
          volume={55}
          pan={20}
          state="idle"
          height="collapsed"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Mixed Heights</h2>
        <p>Heights: 44px, 82px, 114px, 150px, 82px, 44px</p>
        <p>Track 3 focused, tracks 2 and 4 selected</p>
      </div>
    </div>
  ),
};
