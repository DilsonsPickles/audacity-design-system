import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClipBody, generateSpeechWaveform } from '@audacity-ui/components';

// Generate sample waveform data for stories
// Use lower sample rate for ClipBody demos - just need ~2x pixel width for smooth rendering
// 224px wide * 4 samples/px = ~900 samples total
const sampleWaveform = generateSpeechWaveform(0.5, 1800); // 1800 samples/sec = 900 samples for 0.5s

// Generate stereo waveform data (slightly different for L and R channels)
const sampleWaveformLeft = generateSpeechWaveform(0.5, 1800);
const sampleWaveformRight = generateSpeechWaveform(0.5, 1800);

const meta = {
  title: 'Audio/ClipBody',
  component: ClipBody,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'],
      description: 'Clip color from the 9-color palette',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the clip is selected',
    },
    variant: {
      control: 'select',
      options: ['waveform', 'spectrogram'],
      description: 'Visualization type',
    },
    channelMode: {
      control: 'select',
      options: ['mono', 'stereo', 'split-mono', 'split-stereo'],
      description: 'Channel display mode',
    },
    height: {
      control: 'number',
      description: 'Height in pixels',
    },
    showEnvelope: {
      control: 'boolean',
      description: 'Whether to show the envelope overlay',
    },
  },
} satisfies Meta<typeof ClipBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
  },
};

export const Selected: Story = {
  args: {
    color: 'blue',
    selected: true,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
  },
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'] as const).map((color) => (
        <div key={color} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ width: '80px', fontSize: '12px' }}>{color}</span>
          <ClipBody color={color} selected={false} height={84} width={224} waveformData={sampleWaveform} />
          <ClipBody color={color} selected={true} height={84} width={224} waveformData={sampleWaveform} />
        </div>
      ))}
    </div>
  ),
};

export const Mono: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
  },
};

export const Stereo: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const SpectrogramMono: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
  },
};

export const SpectrogramStereo: Story = {
  args: {
    color: 'cyan',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const SplitViewMono: Story = {
  args: {
    color: 'violet',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
  },
};

export const SplitViewStereo: Story = {
  args: {
    color: 'magenta',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const WithEnvelope: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    showEnvelope: true,
    envelope: [
      { time: 0.2, db: -6 },
      { time: 0.5, db: 3 },
      { time: 0.8, db: -3 },
    ],
  },
};

export const SplitViewMonoWithEnvelope: Story = {
  args: {
    color: 'violet',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    showEnvelope: true,
    envelope: [
      { time: 0.2, db: -6 },
      { time: 0.5, db: 3 },
      { time: 0.8, db: -3 },
    ],
  },
};

export const SplitViewStereoWithEnvelope: Story = {
  args: {
    color: 'magenta',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    showEnvelope: true,
    envelope: [
      { time: 0.2, db: -6 },
      { time: 0.5, db: 3 },
      { time: 0.8, db: -3 },
    ],
  },
};

/**
 * Time selection (marquee selection) - selecting a range of audio data
 */
export const WithTimeSelection: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    clipStartTime: 0,
    clipDuration: 0.5,
    timeSelection: {
      startTime: 0.1,
      endTime: 0.3,
    },
  },
};

export const TimeSelectionWithEnvelope: Story = {
  args: {
    color: 'violet',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    clipStartTime: 0,
    clipDuration: 0.5,
    showEnvelope: true,
    envelope: [
      { time: 0.2, db: -6 },
      { time: 0.5, db: 3 },
      { time: 0.8, db: -3 },
    ],
    timeSelection: {
      startTime: 0.15,
      endTime: 0.35,
    },
  },
};

export const TimeSelectionSplitView: Story = {
  args: {
    color: 'magenta',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    clipStartTime: 0,
    clipDuration: 0.5,
    timeSelection: {
      startTime: 0.1,
      endTime: 0.4,
    },
  },
};

/**
 * Stereo channel split ratios
 */
export const StereoSplit5050: Story = {
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    channelSplitRatio: 0.5,
  },
};

export const StereoSplit7030: Story = {
  args: {
    color: 'violet',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    channelSplitRatio: 0.7,
  },
};

export const StereoSplit3070: Story = {
  args: {
    color: 'magenta',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    channelSplitRatio: 0.3,
  },
};

/**
 * Different clip heights
 */
export const HeightSmall: Story = {
  args: {
    color: 'green',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 60,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const HeightMedium: Story = {
  args: {
    color: 'teal',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const HeightLarge: Story = {
  args: {
    color: 'orange',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 120,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const HeightXLarge: Story = {
  args: {
    color: 'red',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 200,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};
