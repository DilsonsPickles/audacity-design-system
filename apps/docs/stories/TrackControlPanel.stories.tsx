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
      options: ['mono', 'stereo'],
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
    isRecording: {
      control: 'boolean',
      description: 'Recording state',
    },
  },
} satisfies Meta<typeof TrackControlPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    trackName: 'Mono track 1',
    trackType: 'mono',
    volume: 75,
    pan: 0,
    isMuted: false,
    isSolo: false,
    isRecording: false,
  },
};

// Muted track
export const Muted: Story = {
  args: {
    ...Default.args,
    trackName: 'Muted Track',
    isMuted: true,
  },
};

// Solo track
export const Solo: Story = {
  args: {
    ...Default.args,
    trackName: 'Solo Track',
    isSolo: true,
  },
};

// Recording
export const Recording: Story = {
  args: {
    ...Default.args,
    trackName: 'Recording Track',
    isRecording: true,
  },
};

// Stereo track
export const StereoTrack: Story = {
  args: {
    ...Default.args,
    trackName: 'Stereo Track',
    trackType: 'stereo',
  },
};

// Low volume
export const LowVolume: Story = {
  args: {
    ...Default.args,
    trackName: 'Quiet Track',
    volume: 25,
  },
};

// High volume
export const HighVolume: Story = {
  args: {
    ...Default.args,
    trackName: 'Loud Track',
    volume: 95,
  },
};

// Multiple states combined
export const MutedAndSolo: Story = {
  args: {
    ...Default.args,
    trackName: 'Muted & Solo',
    isMuted: true,
    isSolo: true,
  },
};
