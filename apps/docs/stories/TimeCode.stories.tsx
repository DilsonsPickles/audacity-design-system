import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimeCode, TimeCodeFormat } from '@audacity-ui/components';

const meta = {
  title: 'Components/TimeCode',
  component: TimeCode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 3600, step: 0.1 },
      description: 'Current time value in seconds',
    },
    format: {
      control: 'select',
      options: [
        'dd:hh:mm:ss',
        'hh:mm:ss',
        'hh:mm:ss+hundredths',
        'hh:mm:ss+milliseconds',
        'hh:mm:ss+samples',
        'hh:mm:ss+frames',
        'samples',
        'seconds',
        'seconds+milliseconds',
        'film-frames',
        'beats:bars',
        'Hz',
      ],
      description: 'Format to display the timecode',
    },
    sampleRate: {
      control: { type: 'number', min: 8000, max: 192000, step: 100 },
      description: 'Sample rate for sample-based formats',
    },
    frameRate: {
      control: { type: 'number', min: 23.976, max: 60, step: 0.001 },
      description: 'Frame rate for frame-based formats',
    },
    showFormatSelector: {
      control: 'boolean',
      description: 'Show format selector dropdown',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
} satisfies Meta<typeof TimeCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 125.5,
    format: 'hh:mm:ss',
    sampleRate: 44100,
    frameRate: 24,
    showFormatSelector: true,
    disabled: false,
  },
};

export const AllFormats: Story = {
  render: () => {
    const [value] = useState(125.5);
    const formats: { format: TimeCodeFormat; label: string }[] = [
      { format: 'dd:hh:mm:ss', label: 'Days, Hours, Minutes, Seconds' },
      { format: 'hh:mm:ss', label: 'Hours, Minutes, Seconds' },
      { format: 'hh:mm:ss+hundredths', label: 'HH:MM:SS + Hundredths' },
      { format: 'hh:mm:ss+milliseconds', label: 'HH:MM:SS + Milliseconds' },
      { format: 'hh:mm:ss+samples', label: 'HH:MM:SS + Samples' },
      { format: 'hh:mm:ss+frames', label: 'HH:MM:SS + Frames' },
      { format: 'samples', label: 'Samples' },
      { format: 'seconds', label: 'Seconds' },
      { format: 'seconds+milliseconds', label: 'Seconds + Milliseconds' },
      { format: 'film-frames', label: 'Film Frames (24fps)' },
      { format: 'beats:bars', label: 'Beats:Bars' },
      { format: 'Hz', label: 'Hz' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        {formats.map(({ format, label }) => (
          <div key={format} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '250px', fontSize: '14px', color: '#666' }}>{label}</div>
            <TimeCode value={value} format={format} showFormatSelector={false} />
          </div>
        ))}
      </div>
    );
  },
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(125.5);
    const [format, setFormat] = useState<TimeCodeFormat>('hh:mm:ss');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>Time Value (seconds):</label>
          <input
            type="range"
            min="0"
            max="3600"
            step="0.1"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            style={{ width: '300px' }}
          />
          <span style={{ fontSize: '12px', color: '#666' }}>{value.toFixed(1)}s</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>TimeCode Component:</label>
          <TimeCode
            value={value}
            format={format}
            onChange={setValue}
            onFormatChange={setFormat}
            showFormatSelector={true}
          />
        </div>
      </div>
    );
  },
};

export const DifferentSampleRates: Story = {
  render: () => {
    const value = 1.5;
    const sampleRates = [8000, 22050, 44100, 48000, 96000, 192000];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        {sampleRates.map((sampleRate) => (
          <div key={sampleRate} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '100px', fontSize: '14px', color: '#666' }}>{sampleRate} Hz</div>
            <TimeCode
              value={value}
              format="samples"
              sampleRate={sampleRate}
              showFormatSelector={false}
            />
          </div>
        ))}
      </div>
    );
  },
};

export const DifferentFrameRates: Story = {
  render: () => {
    const value = 10.5;
    const frameRates = [23.976, 24, 25, 29.97, 30, 50, 60];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        {frameRates.map((frameRate) => (
          <div key={frameRate} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '80px', fontSize: '14px', color: '#666' }}>{frameRate} fps</div>
            <TimeCode
              value={value}
              format="film-frames"
              frameRate={frameRate}
              showFormatSelector={false}
            />
          </div>
        ))}
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    value: 125.5,
    format: 'hh:mm:ss',
    disabled: true,
    showFormatSelector: true,
  },
};

export const WithoutFormatSelector: Story = {
  args: {
    value: 125.5,
    format: 'hh:mm:ss',
    showFormatSelector: false,
  },
};
