import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PanKnob } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';
import figma from '@figma/code-connect';

const meta = {
  title: 'Components/PanKnob',
  component: PanKnob,
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/8rgC6MOTSEY1MHO4wWnucb/01---Audacity-Component-library?node-id=111-1383',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: -100, max: 100, step: 1 },
      description: 'Pan value: -100 (full left) to 100 (full right)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
} satisfies Meta<typeof PanKnob>;

export default meta;
type Story = StoryObj<typeof meta>;

// Center position (0) - default state
export const Center: Story = {
  args: {
    value: 0,
    disabled: false,
  },
};

// Full left position (-100)
export const FullLeft: Story = {
  args: {
    value: -100,
  },
};

// Full right position (100)
export const FullRight: Story = {
  args: {
    value: 100,
  },
};

// Panned left
export const PannedLeft: Story = {
  args: {
    value: -50,
  },
};

// Panned right
export const PannedRight: Story = {
  args: {
    value: 50,
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    value: 25,
    disabled: true,
  },
};

// Interactive example with live value display
export const Interactive: Story = {
  args: {
    value: 0,
  },
  render: (args) => {
    const [value, setValue] = useState(args.value || 0);

    // Format pan value for display (e.g., "50L", "0C", "50R")
    const formatPanValue = (val: number): string => {
      if (val === 0) return '0 (Center)';
      if (val < 0) return `${Math.abs(val)}L`;
      return `${val}R`;
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <PanKnob
          {...args}
          value={value}
          onChange={(newValue) => setValue(newValue)}
        />
        <div style={{ marginTop: '16px', fontSize: '14px', fontWeight: '500', color: '#14151a' }}>
          Pan: {formatPanValue(value)}
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
          Drag vertically to adjust • Arrow keys • '0' to center
        </div>
      </div>
    );
  },
};

// Multiple knobs demo
export const MultipleKnobs: Story = {
  render: () => {
    const [pan1, setPan1] = useState(0);
    const [pan2, setPan2] = useState(-50);
    const [pan3, setPan3] = useState(50);

    return (
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <PanKnob value={pan1} onChange={setPan1} />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            Track 1
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PanKnob value={pan2} onChange={setPan2} />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            Track 2
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PanKnob value={pan3} onChange={setPan3} />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            Track 3
          </div>
        </div>
      </div>
    );
  },
};
