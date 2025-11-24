import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToggleButton } from '@audacity-ui/components';

const meta = {
  title: 'Components/ToggleButton',
  component: ToggleButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    active: {
      control: 'boolean',
      description: 'Whether the button is in active/pressed state',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    children: {
      control: 'text',
      description: 'Button content (typically a single character like M or S)',
    },
    ariaLabel: {
      control: 'text',
      description: 'ARIA label for accessibility',
    },
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'M',
    ariaLabel: 'Mute',
    active: false,
    disabled: false,
  },
};

export const Active: Story = {
  args: {
    children: 'M',
    ariaLabel: 'Mute',
    active: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'M',
    ariaLabel: 'Mute',
    disabled: true,
  },
};

export const Solo: Story = {
  args: {
    children: 'S',
    ariaLabel: 'Solo',
    active: false,
  },
};

export const SoloActive: Story = {
  args: {
    children: 'S',
    ariaLabel: 'Solo',
    active: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [muted, setMuted] = useState(false);
    const [solo, setSolo] = useState(false);

    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <ToggleButton
          active={muted}
          onClick={() => setMuted(!muted)}
          ariaLabel="Mute"
        >
          M
        </ToggleButton>
        <ToggleButton
          active={solo}
          onClick={() => setSolo(!solo)}
          ariaLabel="Solo"
        >
          S
        </ToggleButton>
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ToggleButton ariaLabel="Default">M</ToggleButton>
        <span style={{ fontSize: '12px', color: '#666' }}>Default</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ToggleButton active ariaLabel="Active">M</ToggleButton>
        <span style={{ fontSize: '12px', color: '#666' }}>Active</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ToggleButton disabled ariaLabel="Disabled">M</ToggleButton>
        <span style={{ fontSize: '12px', color: '#666' }}>Disabled</span>
      </div>
    </div>
  ),
};
