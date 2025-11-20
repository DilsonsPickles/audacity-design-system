import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Slider } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Current value (0-100)',
    },
    min: {
      control: { type: 'number' },
      description: 'Minimum value',
    },
    max: {
      control: { type: 'number' },
      description: 'Maximum value',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default slider at 50%
export const Default: Story = {
  args: {
    value: 50,
    disabled: false,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Slider {...args} />
    </div>
  ),
};

// Minimum value (0)
export const Min: Story = {
  args: {
    value: 0,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Slider {...args} />
    </div>
  ),
};

// Maximum value (100)
export const Max: Story = {
  args: {
    value: 100,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Slider {...args} />
    </div>
  ),
};

// Low value (25%)
export const Low: Story = {
  args: {
    value: 25,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Slider {...args} />
    </div>
  ),
};

// High value (75%)
export const High: Story = {
  args: {
    value: 75,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Slider {...args} />
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  args: {
    value: 60,
    disabled: true,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Slider {...args} />
    </div>
  ),
};

// Interactive example with live value display
export const Interactive: Story = {
  args: {
    value: 50,
  },
  render: (args) => {
    const [value, setValue] = useState(args.value || 50);

    return (
      <div style={{ width: '300px', textAlign: 'center' }}>
        <Slider
          {...args}
          value={value}
          onChange={(newValue) => setValue(newValue)}
        />
        <div style={{ marginTop: '20px', fontSize: '14px', fontWeight: '500', color: '#14151a' }}>
          Value: {value}
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
          Drag the slider to adjust
        </div>
      </div>
    );
  },
};

// Different widths
export const DifferentWidths: Story = {
  render: () => {
    const [value1, setValue1] = useState(50);
    const [value2, setValue2] = useState(70);
    const [value3, setValue3] = useState(30);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
        <div style={{ width: '200px' }}>
          <Slider value={value1} onChange={setValue1} />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
            200px width
          </div>
        </div>
        <div style={{ width: '300px' }}>
          <Slider value={value2} onChange={setValue2} />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
            300px width
          </div>
        </div>
        <div style={{ width: '400px' }}>
          <Slider value={value3} onChange={setValue3} />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
            400px width
          </div>
        </div>
      </div>
    );
  },
};

// Custom range (0-10)
export const CustomRange: Story = {
  render: () => {
    const [value, setValue] = useState(5);

    return (
      <div style={{ width: '300px', textAlign: 'center' }}>
        <Slider
          value={value}
          min={0}
          max={10}
          onChange={(newValue) => setValue(newValue)}
        />
        <div style={{ marginTop: '20px', fontSize: '14px', fontWeight: '500', color: '#14151a' }}>
          Value: {value} / 10
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
          Custom range (0-10)
        </div>
      </div>
    );
  },
};
