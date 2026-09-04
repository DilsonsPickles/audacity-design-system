import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EnvelopePoint } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Audio/EnvelopePoint',
  component: EnvelopePoint,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '200px', height: '200px', position: 'relative', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EnvelopePoint>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default point
export const Default: Story = {
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: false,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 4,
  },
};

// Hovered point
export const Hovered: Story = {
  args: {
    x: 100,
    y: 100,
    isHovered: true,
    isDragged: false,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 4,
  },
};

// Dragged point
export const Dragged: Story = {
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: true,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 4,
  },
};

// Larger point
export const Large: Story = {
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: false,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 8,
  },
};

// Custom colors
export const CustomColors: Story = {
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: false,
    color: '#ff6b6b',
    hoverColor: '#ffd43b',
    strokeColor: '#4dabf7',
    radius: 6,
  },
};

// Multiple points showcase
export const MultiplePoints: Story = {
  render: () => (
    <div style={{ width: '400px', height: '300px', position: 'relative', background: '#1a1a1a' }}>
      {/* Default */}
      <EnvelopePoint
        x={100}
        y={100}
        color="#ffffff"
        hoverColor="#ffaa00"
        strokeColor="#2ecc71"
      />

      {/* Hovered */}
      <EnvelopePoint
        x={200}
        y={100}
        isHovered={true}
        color="#ffffff"
        hoverColor="#ffaa00"
        strokeColor="#2ecc71"
      />

      {/* Dragged */}
      <EnvelopePoint
        x={300}
        y={100}
        isDragged={true}
        color="#ffffff"
        hoverColor="#ffaa00"
        strokeColor="#2ecc71"
      />

      {/* Different positions */}
      <EnvelopePoint x={50} y={200} color="#ffffff" strokeColor="#2ecc71" />
      <EnvelopePoint x={150} y={150} color="#ffffff" strokeColor="#2ecc71" />
      <EnvelopePoint x={250} y={200} color="#ffffff" strokeColor="#2ecc71" />
      <EnvelopePoint x={350} y={150} color="#ffffff" strokeColor="#2ecc71" />

      {/* Labels */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#fff', fontSize: '12px' }}>
        <div>White: Default</div>
        <div>Orange: Hovered/Dragged</div>
      </div>
    </div>
  ),
};

// Interactive demo
export const Interactive: Story = {
  render: () => {
    const [position, setPosition] = React.useState({ x: 200, y: 150 });
    const [isHovered, setIsHovered] = React.useState(false);

    return (
      <div style={{ width: '400px', height: '300px', position: 'relative', background: '#1a1a1a' }}>
        <EnvelopePoint
          x={position.x}
          y={position.y}
          isHovered={isHovered}
          color="#ffffff"
          hoverColor="#ffaa00"
          strokeColor="#2ecc71"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: '#fff', fontSize: '12px' }}>
          Hover over the point to see interaction
        </div>
      </div>
    );
  },
};
