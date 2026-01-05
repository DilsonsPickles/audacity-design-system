import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClipDisplay, generateSpeechWaveform } from '@audacity-ui/components';

// Generate sample waveform data for stories
const sampleWaveform = generateSpeechWaveform(0.5, 1800);

// Generate stereo waveform data (slightly different for L and R channels)
const sampleWaveformLeft = generateSpeechWaveform(0.5, 1800);
const sampleWaveformRight = generateSpeechWaveform(0.5, 1800);

// Sample envelope data
const sampleEnvelope = [
  { time: 0.2, db: -6 },
  { time: 0.5, db: 3 },
  { time: 0.8, db: -3 },
];

const meta: Meta<typeof ClipDisplay> = {
  title: 'Audio/ClipDisplay',
  component: ClipDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
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
    state: {
      control: 'select',
      options: ['default', 'headerHover'],
      description: 'Interaction state',
    },
    name: {
      control: 'text',
      description: 'Clip name displayed in header',
    },
    width: {
      control: 'number',
      description: 'Width in pixels',
    },
    height: {
      control: 'number',
      description: 'Height in pixels',
    },
    envelope: {
      control: false,
      description: 'Envelope points for automation curve',
    },
    showEnvelope: {
      control: 'boolean',
      description: 'Whether to show the envelope overlay',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClipDisplay>;

export const Default: Story = {
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Clip',
    width: 224,
    height: 104,
    waveformData: sampleWaveform,
    envelope: undefined,
    showEnvelope: false,
  },
};

export const Selected: Story = {
  args: {
    ...Default.args,
    selected: true,
  },
};

export const HeaderHover: Story = {
  args: {
    ...Default.args,
    state: 'headerHover',
  },
};

export const SelectedHeaderHover: Story = {
  args: {
    ...Default.args,
    selected: true,
    state: 'headerHover',
  },
};

export const Stereo: Story = {
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Stereo Clip',
    width: 224,
    height: 104,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

export const StereoSelected: Story = {
  args: {
    color: 'violet',
    selected: true,
    state: 'default',
    name: 'Stereo Selected',
    width: 224,
    height: 104,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

/**
 * Spectrogram view (mono)
 */
export const SpectrogramMono: Story = {
  args: {
    color: 'cyan',
    selected: false,
    state: 'default',
    name: 'Spectrogram',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'mono',
    waveformData: sampleWaveform,
  },
};

/**
 * Spectrogram view (stereo)
 */
export const SpectrogramStereo: Story = {
  args: {
    color: 'violet',
    selected: false,
    state: 'default',
    name: 'Stereo Spectrogram',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'stereo',
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

/**
 * Split view (mono) - spectrogram on top, waveform on bottom
 */
export const SplitViewMono: Story = {
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Split View Mono',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    waveformData: sampleWaveform,
  },
};

/**
 * Split view (stereo) - stereo spectrogram on top, stereo waveform on bottom
 */
export const SplitViewStereo: Story = {
  args: {
    color: 'magenta',
    selected: false,
    state: 'default',
    name: 'Split View Stereo',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'split-stereo',
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
  },
};

/**
 * Truncated view - all body types at minimum height (44px)
 * Header is hidden until hover
 */
export const TruncatedViews: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Mono Waveform (44px height)</div>
        <ClipDisplay
          color="blue"
          name="Mono"
          width={224}
          height={44}
          variant="waveform"
          channelMode="mono"
          waveformData={sampleWaveform}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Stereo Waveform (44px height)</div>
        <ClipDisplay
          color="violet"
          name="Stereo"
          width={224}
          height={44}
          variant="waveform"
          channelMode="stereo"
          waveformLeft={sampleWaveformLeft}
          waveformRight={sampleWaveformRight}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Spectrogram Mono (44px height)</div>
        <ClipDisplay
          color="cyan"
          name="Spectro"
          width={224}
          height={44}
          variant="spectrogram"
          channelMode="mono"
          waveformData={sampleWaveform}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Spectrogram Stereo (44px height)</div>
        <ClipDisplay
          color="magenta"
          name="Spectro Stereo"
          width={224}
          height={44}
          variant="spectrogram"
          channelMode="stereo"
          waveformLeft={sampleWaveformLeft}
          waveformRight={sampleWaveformRight}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Split View Mono (44px height)</div>
        <ClipDisplay
          color="green"
          name="Split Mono"
          width={224}
          height={44}
          variant="spectrogram"
          channelMode="split-mono"
          waveformData={sampleWaveform}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Split View Stereo (44px height)</div>
        <ClipDisplay
          color="orange"
          name="Split Stereo"
          width={224}
          height={44}
          variant="spectrogram"
          channelMode="split-stereo"
          waveformLeft={sampleWaveformLeft}
          waveformRight={sampleWaveformRight}
        />
      </div>
    </div>
  ),
};

/**
 * Clips with envelope automation curves
 */
export const WithEnvelope: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Mono Waveform with Envelope</div>
        <ClipDisplay
          color="blue"
          name="Envelope Clip"
          width={224}
          height={104}
          variant="waveform"
          channelMode="mono"
          waveformData={sampleWaveform}
          envelope={sampleEnvelope}
          showEnvelope={true}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Stereo Waveform with Envelope</div>
        <ClipDisplay
          color="violet"
          name="Stereo Envelope"
          width={224}
          height={104}
          variant="waveform"
          channelMode="stereo"
          waveformLeft={sampleWaveformLeft}
          waveformRight={sampleWaveformRight}
          envelope={sampleEnvelope}
          showEnvelope={true}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Spectrogram with Envelope</div>
        <ClipDisplay
          color="cyan"
          name="Spectral Envelope"
          width={224}
          height={104}
          variant="spectrogram"
          channelMode="mono"
          waveformData={sampleWaveform}
          envelope={sampleEnvelope}
          showEnvelope={true}
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Split View with Envelope</div>
        <ClipDisplay
          color="magenta"
          name="Split Envelope"
          width={224}
          height={104}
          variant="spectrogram"
          channelMode="split-mono"
          waveformData={sampleWaveform}
          envelope={sampleEnvelope}
          showEnvelope={true}
        />
      </div>
    </div>
  ),
};

/**
 * Complete color matrix showing all combinations
 */
export const ColorMatrix: Story = {
  render: () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>All Clip States</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'].map((color) => (
          <React.Fragment key={color}>
            <ClipDisplay
              color={color as any}
              name={`${color} default`}
              width={180}
              height={80}
              waveformData={sampleWaveform}
            />
            <ClipDisplay
              color={color as any}
              name={`${color} hover`}
              state="headerHover"
              width={180}
              height={80}
              waveformData={sampleWaveform}
            />
            <ClipDisplay
              color={color as any}
              name={`${color} selected`}
              selected
              width={180}
              height={80}
              waveformData={sampleWaveform}
            />
            <ClipDisplay
              color={color as any}
              name={`${color} sel+hover`}
              selected
              state="headerHover"
              width={180}
              height={80}
              waveformData={sampleWaveform}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  ),
};
