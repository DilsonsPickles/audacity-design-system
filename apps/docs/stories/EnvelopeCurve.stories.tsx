import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EnvelopeCurve } from '@audacity-ui/components';
import type { EnvelopePoint as EnvelopePointData } from '@audacity-ui/core';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Audio/EnvelopeCurve',
  component: EnvelopeCurve,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '600px', height: '200px', position: 'relative', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EnvelopeCurve>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple curve with 3 points
export const SimpleCurve: Story = {
  args: {
    points: [
      { time: 0, db: 0 },
      { time: 2, db: 6 },
      { time: 4, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    lineColorHover: '#ffaa00',
    pointColor: '#ffffff',
    pointColorHover: '#ffaa00',
    active: true,
  },
};

// Fade in curve
export const FadeIn: Story = {
  args: {
    points: [
      { time: 0, db: -60 },
      { time: 2, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    pointColor: '#ffffff',
    active: true,
  },
};

// Fade out curve
export const FadeOut: Story = {
  args: {
    points: [
      { time: 2, db: 0 },
      { time: 4, db: -60 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    pointColor: '#ffffff',
    active: true,
  },
};

// Complex curve
export const ComplexCurve: Story = {
  args: {
    points: [
      { time: 0, db: 0 },
      { time: 0.5, db: 3 },
      { time: 1, db: -6 },
      { time: 2, db: 6 },
      { time: 2.5, db: 0 },
      { time: 3, db: -3 },
      { time: 4, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    pointColor: '#ffffff',
    active: true,
  },
};

// Extreme range
export const ExtremeRange: Story = {
  args: {
    points: [
      { time: 0, db: -60 },
      { time: 1, db: 12 },
      { time: 2, db: -30 },
      { time: 3, db: 6 },
      { time: 4, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    pointColor: '#ffffff',
    active: true,
  },
};

// Segment hover effect
export const SegmentHover: Story = {
  args: {
    points: [
      { time: 0, db: 0 },
      { time: 1, db: 6 },
      { time: 2, db: -6 },
      { time: 3, db: 3 },
      { time: 4, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    lineColorHover: '#ffaa00',
    pointColor: '#ffffff',
    hoveredSegmentIndex: 1,
    active: true,
  },
};

// Point dragging
export const PointDragging: Story = {
  args: {
    points: [
      { time: 0, db: 0 },
      { time: 1, db: 6 },
      { time: 2, db: -6 },
      { time: 3, db: 3 },
      { time: 4, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    pointColor: '#ffffff',
    pointColorHover: '#ffaa00',
    draggedPointIndex: 2,
    active: true,
  },
};

// Inactive state
export const Inactive: Story = {
  args: {
    points: [
      { time: 0, db: 0 },
      { time: 2, db: 6 },
      { time: 4, db: 0 },
    ],
    x: 0,
    y: 0,
    width: 600,
    height: 200,
    startTime: 0,
    duration: 4,
    pixelsPerSecond: 150,
    lineColor: '#2ecc71',
    pointColor: '#ffffff',
    active: false,
  },
};

// Multiple curves showcase
export const MultipleCurves: Story = {
  render: () => (
    <div style={{ width: '1200px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
      <div>
        <div style={{ color: '#ffffff', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
          Fade In
        </div>
        <div style={{ position: 'relative', background: '#1a1a1a', borderRadius: '4px', height: '150px' }}>
          <EnvelopeCurve
            points={[
              { time: 0, db: -60 },
              { time: 2, db: 0 },
            ]}
            x={0}
            y={0}
            width={560}
            height={150}
            startTime={0}
            duration={4}
            pixelsPerSecond={140}
            lineColor="#2ecc71"
            pointColor="#ffffff"
            active={true}
          />
        </div>
      </div>

      <div>
        <div style={{ color: '#ffffff', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
          Fade Out
        </div>
        <div style={{ position: 'relative', background: '#1a1a1a', borderRadius: '4px', height: '150px' }}>
          <EnvelopeCurve
            points={[
              { time: 2, db: 0 },
              { time: 4, db: -60 },
            ]}
            x={0}
            y={0}
            width={560}
            height={150}
            startTime={0}
            duration={4}
            pixelsPerSecond={140}
            lineColor="#2ecc71"
            pointColor="#ffffff"
            active={true}
          />
        </div>
      </div>

      <div>
        <div style={{ color: '#ffffff', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
          Complex Curve
        </div>
        <div style={{ position: 'relative', background: '#1a1a1a', borderRadius: '4px', height: '150px' }}>
          <EnvelopeCurve
            points={[
              { time: 0, db: 0 },
              { time: 1, db: 6 },
              { time: 2, db: -6 },
              { time: 3, db: 3 },
              { time: 4, db: 0 },
            ]}
            x={0}
            y={0}
            width={560}
            height={150}
            startTime={0}
            duration={4}
            pixelsPerSecond={140}
            lineColor="#2ecc71"
            pointColor="#ffffff"
            active={true}
          />
        </div>
      </div>

      <div>
        <div style={{ color: '#ffffff', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
          Segment Hover
        </div>
        <div style={{ position: 'relative', background: '#1a1a1a', borderRadius: '4px', height: '150px' }}>
          <EnvelopeCurve
            points={[
              { time: 0, db: 0 },
              { time: 1, db: 6 },
              { time: 2, db: -6 },
              { time: 3, db: 3 },
              { time: 4, db: 0 },
            ]}
            x={0}
            y={0}
            width={560}
            height={150}
            startTime={0}
            duration={4}
            pixelsPerSecond={140}
            lineColor="#2ecc71"
            lineColorHover="#ffaa00"
            pointColor="#ffffff"
            hoveredSegmentIndex={1}
            active={true}
          />
        </div>
      </div>
    </div>
  ),
};
