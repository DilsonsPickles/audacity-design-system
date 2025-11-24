import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GhostButton } from '@audacity-ui/components';

const meta = {
  title: 'Components/GhostButton',
  component: GhostButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'select',
      options: ['menu', 'mixer', 'undo', 'redo', 'play', 'pause', 'stop', 'record', 'rewind', 'forward'],
      description: 'Icon to display',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    ariaLabel: {
      control: 'text',
      description: 'ARIA label for accessibility',
    },
  },
} satisfies Meta<typeof GhostButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: 'menu',
    ariaLabel: 'Menu',
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    icon: 'menu',
    ariaLabel: 'Menu',
    disabled: true,
  },
};

export const WithMixerIcon: Story = {
  args: {
    icon: 'mixer',
    ariaLabel: 'Mixer',
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <GhostButton icon="menu" ariaLabel="Menu" />
        <span style={{ fontSize: '12px', color: '#666' }}>Default (hover to see background)</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <GhostButton icon="menu" ariaLabel="Menu" disabled />
        <span style={{ fontSize: '12px', color: '#666' }}>Disabled</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <GhostButton icon="mixer" ariaLabel="Mixer" />
        <span style={{ fontSize: '12px', color: '#666' }}>With mixer icon</span>
      </div>
    </div>
  ),
};
