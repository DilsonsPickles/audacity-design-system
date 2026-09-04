import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TrackControlPanel } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/TrackControlPanel',
  component: TrackControlPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    trackName: {
      control: 'text',
      description: 'Name of the track',
    },
    trackType: {
      control: 'radio',
      options: ['mono', 'stereo', 'label'],
      description: 'Type of audio track',
    },
    volume: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Volume level (0-100)',
    },
    pan: {
      control: { type: 'range', min: -100, max: 100, step: 1 },
      description: 'Pan position (-100 to 100)',
    },
    isMuted: {
      control: 'boolean',
      description: 'Mute state',
    },
    isSolo: {
      control: 'boolean',
      description: 'Solo state',
    },
    state: {
      control: 'radio',
      options: ['idle', 'hover', 'active'],
      description: 'Visual state',
    },
    height: {
      control: 'radio',
      options: ['default', 'truncated', 'collapsed'],
      description: 'Height variant',
    },
    meterLevel: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Current meter level (0-100)',
    },
    meterClipped: {
      control: 'boolean',
      description: 'Whether the meter is clipping',
    },
    meterStyle: {
      control: 'select',
      options: ['default', 'rms'],
      description: 'Meter display style',
    },
    meterRecentPeak: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Recent peak level (0-100)',
    },
    meterMaxPeak: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Max peak level (0-100)',
    },
  },
} satisfies Meta<typeof TrackControlPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - matches Figma "Mono/Default/Idle"
export const MonoDefaultIdle: Story = {
  args: {
    trackName: 'Mono track 1',
    trackType: 'mono',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default',
    meterLevel: 66,
    meterClipped: false,
    meterStyle: 'default',
    meterRecentPeak: 66,
    meterMaxPeak: 79,
  },
};

// Hover state - matches Figma "Mono/Default/Hover"
export const MonoDefaultHover: Story = {
  args: {
    ...MonoDefaultIdle.args,
    state: 'hover',
  },
};

// Active state - matches Figma "Mono/Default/Active"
export const MonoDefaultActive: Story = {
  args: {
    ...MonoDefaultIdle.args,
    state: 'active',
  },
};

// Truncated height - matches Figma "Mono/Truncated/Idle"
export const MonoTruncatedIdle: Story = {
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
  },
};

// Truncated hover
export const MonoTruncatedHover: Story = {
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
    state: 'hover',
  },
};

// Truncated active
export const MonoTruncatedActive: Story = {
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
    state: 'active',
  },
};

// Collapsed height - matches Figma "Mono/Collapsed/Idle"
export const MonoCollapsedIdle: Story = {
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
  },
};

// Collapsed hover
export const MonoCollapsedHover: Story = {
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
    state: 'hover',
  },
};

// Collapsed active
export const MonoCollapsedActive: Story = {
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
    state: 'active',
  },
};

// Stereo track - matches Figma "Stereo/Default/Idle"
export const StereoDefaultIdle: Story = {
  args: {
    trackName: 'Stereo track 1',
    trackType: 'stereo',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default',
    meterLevelLeft: 75,
    meterLevelRight: 60,
    meterClippedLeft: false,
    meterClippedRight: false,
    meterStyle: 'default',
    meterRecentPeakLeft: 75,
    meterRecentPeakRight: 60,
    meterMaxPeakLeft: 85,
    meterMaxPeakRight: 72,
  },
};

// Stereo track with RMS meters
export const StereoWithRMS: Story = {
  args: {
    ...StereoDefaultIdle.args,
    meterStyle: 'rms',
  },
};

// Stereo track with clipping on one channel
export const StereoClippingLeft: Story = {
  args: {
    ...StereoDefaultIdle.args,
    meterLevelLeft: 100,
    meterClippedLeft: true,
    meterRecentPeakLeft: 100,
    meterMaxPeakLeft: 100,
  },
};

// Stereo hover
export const StereoDefaultHover: Story = {
  args: {
    ...StereoDefaultIdle.args,
    state: 'hover',
  },
};

// Stereo active
export const StereoDefaultActive: Story = {
  args: {
    ...StereoDefaultIdle.args,
    state: 'active',
  },
};

// Label track - matches Figma "Label/Default/Idle"
export const LabelDefaultIdle: Story = {
  args: {
    trackName: 'Label track 1',
    trackType: 'label',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default',
  },
};

// With muted state
export const Muted: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Muted Track',
    isMuted: true,
  },
};

// With solo state
export const Solo: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Solo Track',
    isSolo: true,
  },
};

// Both muted and solo
export const MutedAndSolo: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Muted & Solo',
    isMuted: true,
    isSolo: true,
  },
};

// Different volume levels
export const LowVolume: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Quiet Track',
    volume: 25,
  },
};

export const HighVolume: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Loud Track',
    volume: 95,
  },
};

// Different pan positions
export const PannedLeft: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Panned Left',
    pan: -75,
  },
};

export const PannedRight: Story = {
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Panned Right',
    pan: 75,
  },
};
