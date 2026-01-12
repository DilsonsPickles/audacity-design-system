import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SwipeyDots } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/SwipeyDots',
  component: SwipeyDots,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    totalDots: {
      control: 'number',
      description: 'Total number of dots',
    },
    activeDot: {
      control: 'number',
      description: 'Active dot index (0-based)',
    },
  },
} satisfies Meta<typeof SwipeyDots>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default with 3 dots
export const Default: Story = {
  args: {
    totalDots: 3,
    activeDot: 0,
  },
};

// 5 dots
export const FiveDots: Story = {
  args: {
    totalDots: 5,
    activeDot: 2,
  },
};

// Interactive
export const Interactive: Story = {
  render: () => {
    const [activeDot, setActiveDot] = useState(0);

    return (
      <div>
        <SwipeyDots
          totalDots={4}
          activeDot={activeDot}
          onDotClick={setActiveDot}
        />
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          Click dots to change active slide
        </div>
      </div>
    );
  },
};

// Different states
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <SwipeyDots totalDots={4} activeDot={0} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          First dot active
        </div>
      </div>
      <div>
        <SwipeyDots totalDots={4} activeDot={1} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Second dot active
        </div>
      </div>
      <div>
        <SwipeyDots totalDots={4} activeDot={2} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Third dot active
        </div>
      </div>
      <div>
        <SwipeyDots totalDots={4} activeDot={3} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Fourth dot active
        </div>
      </div>
    </div>
  ),
};
