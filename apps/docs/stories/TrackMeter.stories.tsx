import type { Meta, StoryObj } from '@storybook/react';
import { TrackMeter } from '@audacity-ui/components';

const meta: Meta<typeof TrackMeter> = {
  title: 'Audio/TrackMeter',
  component: TrackMeter,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A vertical audio level meter for track control panels. Displays volume level with optional RMS overlay, clipping indicator, and peak markers.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    volume: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Current volume level (0-100)',
    },
    clipped: {
      control: 'boolean',
      description: 'Whether the meter is clipping (shows red clipping region)',
    },
    meterStyle: {
      control: 'select',
      options: ['default', 'rms'],
      description: 'Meter display style - RMS shows a lighter overlay region',
    },
    recentPeak: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Recent peak level (0-100) - shown as a blue line',
    },
    maxPeak: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Max peak level (0-100) - shown as a black line',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '144px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TrackMeter>;

export const Silent: Story = {
  args: {
    volume: 0,
    clipped: false,
    meterStyle: 'default',
  },
};

export const Low: Story = {
  args: {
    volume: 33,
    clipped: false,
    meterStyle: 'default',
    recentPeak: 33,
    maxPeak: 33,
  },
};

export const Medium: Story = {
  args: {
    volume: 50,
    clipped: false,
    meterStyle: 'default',
    recentPeak: 62,
    maxPeak: 55,
  },
};

export const High: Story = {
  args: {
    volume: 66,
    clipped: false,
    meterStyle: 'default',
    recentPeak: 66,
    maxPeak: 79,
  },
};

export const HighWithRMS: Story = {
  args: {
    volume: 66,
    clipped: false,
    meterStyle: 'rms',
    recentPeak: 66,
    maxPeak: 79,
  },
};

export const Clipping: Story = {
  args: {
    volume: 100,
    clipped: true,
    meterStyle: 'default',
    recentPeak: 100,
    maxPeak: 100,
  },
};

export const ClippingWithPeaks: Story = {
  args: {
    volume: 66,
    clipped: true,
    meterStyle: 'default',
    recentPeak: 66,
    maxPeak: 92,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', height: '144px' }}>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={0} />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>0%</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={33} recentPeak={33} maxPeak={33} />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>33%</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={50} recentPeak={62} maxPeak={55} />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>50%</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={66} recentPeak={66} maxPeak={79} />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>66%</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={66} meterStyle="rms" recentPeak={66} maxPeak={79} />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>66% RMS</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={100} clipped />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>Clip</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TrackMeter volume={66} clipped recentPeak={66} maxPeak={92} />
        <div style={{ fontSize: '10px', marginTop: '4px' }}>Clip 66%</div>
      </div>
    </div>
  ),
};
