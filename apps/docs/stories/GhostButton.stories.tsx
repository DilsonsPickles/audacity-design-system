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
      options: ['menu', 'mixer', 'undo', 'redo', 'play', 'pause', 'stop', 'record', 'rewind', 'forward', 'chevron-left', 'chevron-right'],
      description: 'Icon to display',
    },
    size: {
      control: 'select',
      options: ['small', 'large'],
      description: 'Button size (small=20px, large=48px)',
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

// Large size (48px) - for carousel navigation
export const Large: Story = {
  args: {
    icon: 'chevron-left',
    ariaLabel: 'Previous',
    size: 'large',
  },
};

// Size comparison
export const SizeComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div>
        <GhostButton icon="menu" ariaLabel="Menu" size="small" />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Small (20px)
        </div>
      </div>
      <div>
        <GhostButton icon="chevron-left" ariaLabel="Previous" size="large" />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Large (48px)
        </div>
      </div>
    </div>
  ),
};

// Chevron icons (for carousel)
export const ChevronIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <GhostButton icon="chevron-left" ariaLabel="Previous" size="large" />
      <GhostButton icon="chevron-right" ariaLabel="Next" size="large" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <GhostButton icon="menu" ariaLabel="Menu" size="small" />
        <span style={{ fontSize: '12px', color: '#666' }}>Default (hover to see background)</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <GhostButton icon="menu" ariaLabel="Menu" size="small" disabled />
        <span style={{ fontSize: '12px', color: '#666' }}>Disabled</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <GhostButton icon="mixer" ariaLabel="Mixer" size="small" />
        <span style={{ fontSize: '12px', color: '#666' }}>With mixer icon</span>
      </div>
    </div>
  ),
};
