import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Clip } from '@audacity-ui/components';
import type { Clip as ClipData, ClipTheme } from '@audacity-ui/core';
import '@audacity-ui/components/style.css';

// Generate realistic speech-like waveform (matching prototype)
const generateWaveform = (duration: number): number[] => {
  const sampleCount = Math.floor(duration * 50000); // 50k samples/sec for solid appearance
  const waveform: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;

    // Speech envelope: syllable-like patterns with sentence-level variation
    const speechEnvelope =
      Math.abs(Math.sin(t * Math.PI * 3 + Math.random() * 0.5)) *
      (0.3 + Math.abs(Math.sin(t * Math.PI * 0.5)) * 0.7) *
      (0.5 + Math.random() * 0.5);

    // High-frequency content (voice formants)
    const voiceContent =
      Math.sin(t * Math.PI * 200 + Math.random() * 2) * 0.4 +
      Math.sin(t * Math.PI * 500 + Math.random() * 3) * 0.3 +
      Math.sin(t * Math.PI * 1200 + Math.random() * 5) * 0.2 +
      (Math.random() - 0.5) * 0.3;

    const value = voiceContent * speechEnvelope;
    waveform.push(Math.max(-1, Math.min(1, value)));
  }

  return waveform;
};

// Figma-accurate theme colors for different track colors
const violetTheme: ClipTheme = {
  clipBackground: '#D4CCFF',
  clipHeaderBackground: '#C4B8FF',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#9B8FE0',
  waveformColor: '#3D3D3D',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
  segmentHoverColor: '#ffaa00',
};

const blueTheme: ClipTheme = {
  clipBackground: '#C4DBFF',
  clipHeaderBackground: '#B4CBEF',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#8FB5E0',
  waveformColor: '#3D3D3D',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
  segmentHoverColor: '#ffaa00',
};

const magentaTheme: ClipTheme = {
  clipBackground: '#FFCCF5',
  clipHeaderBackground: '#FFBCE5',
  clipHeaderText: '#3D3D3D',
  clipBorder: '#E08FCC',
  waveformColor: '#3D3D3D',
  automationOverlayActive: 'rgba(255, 255, 255, 0.5)',
  automationOverlayIdle: 'rgba(255, 255, 255, 0.6)',
  timeSelectionOverlay: 'rgba(255, 255, 255, 0.3)',
  envelopeLineColor: '#2ecc71',
  envelopeLineColorHover: '#ffaa00',
  envelopePointColor: '#ffffff',
  envelopePointColorHover: '#ffaa00',
  segmentHoverOverlay: 'rgba(255, 170, 0, 0.1)',
  segmentHoverColor: '#ffaa00',
};

// Base clip data
const baseClip: ClipData = {
  id: 'clip-1',
  trackId: 'track-1',
  name: 'Audio Clip',
  startTime: 0,
  duration: 4,
  waveform: generateWaveform(4), // Pass duration, generates 50k samples/sec
  envelopePoints: [],
};

const meta = {
  title: 'Audio/Clip',
  component: Clip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '600px', height: '114px', position: 'relative', background: '#1a1a1a', display: 'flex', flex: '1' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Clip>;

export default meta;
type Story = StoryObj<typeof meta>;

// Violet clip (idle)
export const VioletIdle: Story = {
  args: {
    clip: baseClip,
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: false,
    theme: violetTheme,
  },
};

// Blue clip (idle)
export const BlueIdle: Story = {
  args: {
    clip: baseClip,
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: false,
    theme: blueTheme,
  },
};

// Violet clip (selected)
export const VioletSelected: Story = {
  args: {
    clip: baseClip,
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: true,
    envelopeMode: false,
    theme: { ...violetTheme, clipBorder: '#FFFFFF' },
  },
};

// Magenta clip (idle)
export const MagentaIdle: Story = {
  args: {
    clip: baseClip,
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: false,
    theme: magentaTheme,
  },
};

// Clip with envelope points
export const WithEnvelope: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: 0 },
        { time: 1, db: 6 },
        { time: 2, db: -6 },
        { time: 3, db: 3 },
        { time: 4, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: true,
    theme: blueTheme,
  },
};

// Clip with envelope in idle mode (not editing)
export const EnvelopeIdle: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: 0 },
        { time: 1, db: 6 },
        { time: 2, db: -6 },
        { time: 3, db: 3 },
        { time: 4, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: false,
    theme: blueTheme,
  },
};

// Clip with time selection
export const WithTimeSelection: Story = {
  args: {
    clip: baseClip,
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: false,
    timeSelection: {
      startTime: 1,
      endTime: 3,
    },
    theme: blueTheme,
  },
};

// Clip with envelope and time selection
export const EnvelopeWithSelection: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: 0 },
        { time: 1, db: 6 },
        { time: 2, db: -6 },
        { time: 3, db: 3 },
        { time: 4, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: true,
    envelopeMode: true,
    timeSelection: {
      startTime: 1,
      endTime: 3,
    },
    theme: blueTheme,
  },
};

// Segment hover effect
export const SegmentHover: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: 0 },
        { time: 1, db: 6 },
        { time: 2, db: -6 },
        { time: 3, db: 3 },
        { time: 4, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: true,
    hoveredSegmentIndex: 1,
    theme: blueTheme,
  },
};

// Point drag effect
export const PointDrag: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: 0 },
        { time: 1, db: 6 },
        { time: 2, db: -6 },
        { time: 3, db: 3 },
        { time: 4, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: true,
    envelopeMode: true,
    draggedPointIndex: 2,
    theme: blueTheme,
  },
};

// Extreme envelope curve (wide range)
export const ExtremeEnvelope: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: -60 },
        { time: 1, db: 12 },
        { time: 2, db: -30 },
        { time: 3, db: 6 },
        { time: 4, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: true,
    theme: blueTheme,
  },
};

// Fade in envelope
export const FadeIn: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 0, db: -60 },
        { time: 2, db: 0 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: true,
    theme: blueTheme,
  },
};

// Fade out envelope
export const FadeOut: Story = {
  args: {
    clip: {
      ...baseClip,
      envelopePoints: [
        { time: 2, db: 0 },
        { time: 4, db: -60 },
      ],
    },
    x: 0,
    y: 0,
    width: 600,
    height: 114,
    pixelsPerSecond: 150,
    selected: false,
    envelopeMode: true,
    theme: blueTheme,
  },
};

// Multiple clips showcase
export const MultipleClips: Story = {
  render: () => (
    <div style={{ width: '600px', height: '400px', position: 'relative', background: '#1a1a1a' }}>
      {/* Clip 1: Basic */}
      <Clip
        clip={baseClip}
        x={0}
        y={0}
        width={280}
        height={114}
        pixelsPerSecond={70}
        selected={false}
        envelopeMode={false}
        theme={blueTheme}
      />

      {/* Clip 2: With envelope */}
      <Clip
        clip={{
          ...baseClip,
          id: 'clip-2',
          name: 'Clip with Envelope',
          envelopePoints: [
            { time: 0, db: 0 },
            { time: 2, db: 6 },
            { time: 4, db: 0 },
          ],
        }}
        x={300}
        y={0}
        width={280}
        height={114}
        pixelsPerSecond={70}
        selected={false}
        envelopeMode={true}
        theme={blueTheme}
      />

      {/* Clip 3: Selected with time selection */}
      <Clip
        clip={{
          ...baseClip,
          id: 'clip-3',
          name: 'Selected Clip',
        }}
        x={0}
        y={134}
        width={280}
        height={114}
        pixelsPerSecond={70}
        selected={true}
        envelopeMode={false}
        timeSelection={{ startTime: 1, endTime: 3 }}
        theme={blueTheme}
      />

      {/* Clip 4: Fade in/out */}
      <Clip
        clip={{
          ...baseClip,
          id: 'clip-4',
          name: 'Fade In/Out',
          envelopePoints: [
            { time: 0, db: -60 },
            { time: 1, db: 0 },
            { time: 3, db: 0 },
            { time: 4, db: -60 },
          ],
        }}
        x={300}
        y={134}
        width={280}
        height={114}
        pixelsPerSecond={70}
        selected={false}
        envelopeMode={true}
        theme={blueTheme}
      />
    </div>
  ),
};

// Interactive demo with all states
export const AllStates: Story = {
  render: () => {
    const states = [
      { label: 'Basic', selected: false, envelopeMode: false, points: [] },
      { label: 'Selected', selected: true, envelopeMode: false, points: [] },
      { label: 'Envelope Active', selected: false, envelopeMode: true, points: [
        { time: 0, db: 0 }, { time: 2, db: 6 }, { time: 4, db: 0 }
      ]},
      { label: 'Envelope Idle', selected: false, envelopeMode: false, points: [
        { time: 0, db: 0 }, { time: 2, db: 6 }, { time: 4, db: 0 }
      ]},
    ];

    return (
      <div style={{ width: '1200px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {states.map((state, idx) => (
          <div key={idx}>
            <div style={{
              color: '#ffffff',
              fontSize: '12px',
              marginBottom: '8px',
              fontWeight: 500
            }}>
              {state.label}
            </div>
            <div style={{ position: 'relative', background: '#1a1a1a', borderRadius: '4px' }}>
              <Clip
                clip={{
                  ...baseClip,
                  envelopePoints: state.points,
                }}
                x={0}
                y={0}
                width={560}
                height={114}
                pixelsPerSecond={140}
                selected={state.selected}
                envelopeMode={state.envelopeMode}
                theme={blueTheme}
              />
            </div>
          </div>
        ))}
      </div>
    );
  },
};
