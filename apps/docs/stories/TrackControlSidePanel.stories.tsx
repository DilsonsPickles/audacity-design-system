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

export const Default: Story = {
  args: {
    trackHeights: [114, 114, 114],
    onAddTrack: () => alert('Add new track clicked!'),
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1 - Vocals"
          trackType="mono"
          volume={75}
          pan={0}
          isMuted={false}
          isSolo={false}
          height="default"
        />
        <TrackControlPanel
          trackName="Track 2 - Guitar"
          trackType="stereo"
          volume={60}
          pan={-30}
          isMuted={false}
          isSolo={true}
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3 - Bass"
          trackType="mono"
          volume={80}
          pan={0}
          isMuted={true}
          isSolo={false}
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Track Timeline</h2>
        <p>The side panel has a header with "Tracks" label and "Add new" button.</p>
        <p>Default track height: 114px</p>
      </div>
    </div>
  ),
};

export const VariableHeights: Story = {
  args: {
    trackHeights: [80, 114, 150, 100],
    children: (
      <>
        <TrackControlPanel
          trackName="Short Track"
          trackType="mono"
          volume={75}
          pan={0}
          height="default"
        />
        <TrackControlPanel
          trackName="Normal Track"
          trackType="stereo"
          volume={60}
          pan={-30}
          height="default"
        />
        <TrackControlPanel
          trackName="Tall Track"
          trackType="mono"
          volume={80}
          pan={15}
          height="default"
        />
        <TrackControlPanel
          trackName="Medium Track"
          trackType="stereo"
          volume={70}
          pan={0}
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
        <p>Track control panels can adapt to different track heights:</p>
        <ul>
          <li>Track 1: 80px (short)</li>
          <li>Track 2: 114px (normal)</li>
          <li>Track 3: 150px (tall)</li>
          <li>Track 4: 100px (medium)</li>
        </ul>
      </div>
    </div>
  ),
};

export const ManyTracks: Story = {
  args: {
    trackHeights: Array(10).fill(114),
    children: (
      <>
        {Array.from({ length: 10 }, (_, i) => (
          <TrackControlPanel
            key={i}
            trackName={`Track ${i + 1}`}
            trackType={i % 2 === 0 ? 'mono' : 'stereo'}
            volume={70 + (i * 5) % 30}
            pan={((i - 5) * 20) % 100}
            isMuted={i % 5 === 0}
            isSolo={i % 7 === 0}
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
        <p>The side panel is scrollable when content exceeds viewport height.</p>
        <p>Showing 10 tracks with various states.</p>
      </div>
    </div>
  ),
};

export const TruncatedPanels: Story = {
  args: {
    trackHeights: [82, 82, 82, 82],
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          height="truncated"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          height="truncated"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={15}
          height="truncated"
        />
        <TrackControlPanel
          trackName="Track 4"
          trackType="stereo"
          volume={70}
          pan={0}
          height="truncated"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Truncated Panels</h2>
        <p>Track controls in truncated mode (82px height) - Effects button hidden.</p>
      </div>
    </div>
  ),
};

export const CollapsedPanels: Story = {
  args: {
    trackHeights: [44, 44, 44, 44, 44],
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          height="collapsed"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          height="collapsed"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={15}
          height="collapsed"
        />
        <TrackControlPanel
          trackName="Track 4"
          trackType="stereo"
          volume={70}
          pan={0}
          height="collapsed"
        />
        <TrackControlPanel
          trackName="Track 5"
          trackType="mono"
          volume={65}
          pan={-15}
          height="collapsed"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Collapsed Panels</h2>
        <p>Track controls in collapsed mode (44px height) - Only header visible.</p>
        <p>Useful for viewing many tracks at once.</p>
      </div>
    </div>
  ),
};

export const NonResizable: Story = {
  args: {
    trackHeights: [114, 114, 114],
    resizable: false,
    children: (
      <>
        <TrackControlPanel
          trackName="Track 1"
          trackType="mono"
          volume={75}
          pan={0}
          height="default"
        />
        <TrackControlPanel
          trackName="Track 2"
          trackType="stereo"
          volume={60}
          pan={-30}
          height="default"
        />
        <TrackControlPanel
          trackName="Track 3"
          trackType="mono"
          volume={80}
          pan={15}
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <TrackControlSidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Non-Resizable Panel</h2>
        <p>This panel cannot be resized (fixed at 268px).</p>
      </div>
    </div>
  ),
};
