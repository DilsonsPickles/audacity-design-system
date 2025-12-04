import type { Meta, StoryObj } from '@storybook/react';
import { TimelineRuler } from '@audacity-ui/components';

const meta = {
  title: 'Layout/TimelineRuler',
  component: TimelineRuler,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    pixelsPerSecond: {
      control: { type: 'range', min: 10, max: 200, step: 10 },
      description: 'Zoom level - pixels per second',
    },
    totalDuration: {
      control: { type: 'range', min: 10, max: 120, step: 10 },
      description: 'Total duration in seconds',
    },
    width: {
      control: { type: 'range', min: 800, max: 5000, step: 100 },
      description: 'Width of the ruler in pixels',
    },
    height: {
      control: { type: 'range', min: 30, max: 80, step: 5 },
      description: 'Height of the ruler',
    },
    scrollX: {
      control: { type: 'range', min: 0, max: 1000, step: 10 },
      description: 'Horizontal scroll offset (use 0 for native CSS scrolling)',
    },
    backgroundColor: {
      control: 'color',
      description: 'Background color',
    },
    textColor: {
      control: 'color',
      description: 'Text color',
    },
    lineColor: {
      control: 'color',
      description: 'Divider and major tick color',
    },
    tickColor: {
      control: 'color',
      description: 'Minor tick color',
    },
  },
} satisfies Meta<typeof TimelineRuler>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pixelsPerSecond: 100,
    scrollX: 0,
    totalDuration: 50,
    width: 5000,
    height: 40,
    leftPadding: 12,
  },
  render: (args) => (
    <div style={{ width: '100%', height: '100vh', overflow: 'auto', backgroundColor: '#212433' }}>
      <div style={{ minWidth: `${args.width}px` }}>
        <TimelineRuler {...args} />
      </div>
    </div>
  ),
};

export const Zoomed: Story = {
  args: {
    pixelsPerSecond: 200,
    scrollX: 0,
    totalDuration: 30,
    width: 6000,
    height: 40,
    leftPadding: 12,
  },
  render: (args) => (
    <div style={{ width: '100%', height: '100vh', overflow: 'auto', backgroundColor: '#212433' }}>
      <div style={{ minWidth: `${args.width}px` }}>
        <TimelineRuler {...args} />
      </div>
    </div>
  ),
};

export const ZoomedOut: Story = {
  args: {
    pixelsPerSecond: 50,
    scrollX: 0,
    totalDuration: 100,
    width: 5000,
    height: 40,
    leftPadding: 12,
  },
  render: (args) => (
    <div style={{ width: '100%', height: '100vh', overflow: 'auto', backgroundColor: '#212433' }}>
      <div style={{ minWidth: `${args.width}px` }}>
        <TimelineRuler {...args} />
      </div>
    </div>
  ),
};

export const Compact: Story = {
  args: {
    pixelsPerSecond: 100,
    scrollX: 0,
    totalDuration: 50,
    width: 5000,
    height: 30,
    leftPadding: 12,
  },
  render: (args) => (
    <div style={{ width: '100%', height: '100vh', overflow: 'auto', backgroundColor: '#212433' }}>
      <div style={{ minWidth: `${args.width}px` }}>
        <TimelineRuler {...args} />
      </div>
    </div>
  ),
};

export const CustomColors: Story = {
  args: {
    pixelsPerSecond: 100,
    scrollX: 0,
    totalDuration: 50,
    width: 5000,
    height: 40,
    leftPadding: 12,
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
    lineColor: '#16213e',
    tickColor: '#0f3460',
  },
  render: (args) => (
    <div style={{ width: '100%', height: '100vh', overflow: 'auto', backgroundColor: '#0f0e17' }}>
      <div style={{ minWidth: `${args.width}px` }}>
        <TimelineRuler {...args} />
      </div>
    </div>
  ),
};
