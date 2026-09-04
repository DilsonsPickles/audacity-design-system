import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SidePanel, TrackControlPanel } from '@audacity-ui/components';

const meta = {
  title: 'Layout/SidePanel',
  component: SidePanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleContent = () => (
  <div style={{ padding: '16px' }}>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#fff' }}>Panel Content</h3>
    {Array.from({ length: 10 }, (_, i) => (
      <div
        key={i}
        style={{
          padding: '12px',
          marginBottom: '8px',
          background: '#2a2a2a',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '13px',
        }}
      >
        Item {i + 1}
      </div>
    ))}
  </div>
);

export const LeftPanel: Story = {
  args: {
    position: 'left',
    width: 200,
    resizable: true,
    children: <SampleContent />,
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <SidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Main Content Area</h2>
        <p>The side panel can be resized by dragging its edge.</p>
      </div>
    </div>
  ),
};

export const RightPanel: Story = {
  args: {
    position: 'right',
    width: 250,
    resizable: true,
    children: <SampleContent />,
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Main Content Area</h2>
        <p>The side panel can be resized by dragging its edge.</p>
      </div>
      <SidePanel {...args} />
    </div>
  ),
};

export const NonResizable: Story = {
  args: {
    position: 'left',
    width: 200,
    resizable: false,
    children: <SampleContent />,
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <SidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Main Content Area</h2>
        <p>This panel cannot be resized.</p>
      </div>
    </div>
  ),
};

export const WidePanel: Story = {
  args: {
    position: 'left',
    width: 400,
    resizable: true,
    minWidth: 300,
    maxWidth: 600,
    children: <SampleContent />,
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <SidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Main Content Area</h2>
        <p>This panel is wider and has custom min/max width constraints (300-600px).</p>
      </div>
    </div>
  ),
};

export const WithScrollableContent: Story = {
  args: {
    position: 'left',
    width: 200,
    resizable: true,
    children: (
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#fff' }}>Long List</h3>
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            style={{
              padding: '12px',
              marginBottom: '8px',
              background: '#2a2a2a',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
            }}
          >
            Item {i + 1}
          </div>
        ))}
      </div>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <SidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Main Content Area</h2>
        <p>The panel content is scrollable when it exceeds the panel height.</p>
      </div>
    </div>
  ),
};

export const WithTrackControlPanels: Story = {
  args: {
    position: 'left',
    width: 240,
    resizable: true,
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
        <TrackControlPanel
          trackName="Track 4 - Drums"
          trackType="stereo"
          volume={70}
          pan={15}
          isMuted={false}
          isSolo={false}
          height="default"
        />
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <SidePanel {...args} />
      <div style={{ flex: 1, padding: '20px', color: '#fff' }}>
        <h2>Track List</h2>
        <p>Side panel containing multiple track control panels, similar to an Audacity-style layout.</p>
      </div>
    </div>
  ),
};
