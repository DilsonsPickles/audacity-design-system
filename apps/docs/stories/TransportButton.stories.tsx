import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TransportButton } from '@audacity-ui/components';

const meta: Meta<typeof TransportButton> = {
  title: 'Components/TransportButton',
  component: TransportButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'hover', 'pressed', 'disabled'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransportButton>;

/**
 * Skip back button in idle state
 */
export const SkipBackIdle: Story = {
  args: {
    icon: String.fromCharCode(0xF448),
    state: 'idle',
  },
};

/**
 * Skip back button in hover state
 */
export const SkipBackHover: Story = {
  args: {
    icon: String.fromCharCode(0xF448),
    state: 'hover',
  },
};

/**
 * Skip back button in pressed state
 */
export const SkipBackPressed: Story = {
  args: {
    icon: String.fromCharCode(0xF448),
    state: 'pressed',
  },
};

/**
 * Skip back button in disabled state
 */
export const SkipBackDisabled: Story = {
  args: {
    icon: String.fromCharCode(0xF448),
    disabled: true,
  },
};

/**
 * Play button
 */
export const Play: Story = {
  args: {
    icon: String.fromCharCode(0xF446),
  },
};

/**
 * Pause button
 */
export const Pause: Story = {
  args: {
    icon: String.fromCharCode(0xF44B),
  },
};

/**
 * Stop button
 */
export const Stop: Story = {
  args: {
    icon: String.fromCharCode(0xF447),
  },
};

/**
 * Skip forward button
 */
export const SkipForward: Story = {
  args: {
    icon: String.fromCharCode(0xF449),
  },
};

/**
 * Record button
 */
export const Record: Story = {
  args: {
    icon: String.fromCharCode(0xF44A),
  },
};

/**
 * All transport buttons in a row
 */
export const AllButtons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      <TransportButton icon={String.fromCharCode(0xF448)} />
      <TransportButton icon={String.fromCharCode(0xF446)} />
      <TransportButton icon={String.fromCharCode(0xF44B)} />
      <TransportButton icon={String.fromCharCode(0xF447)} />
      <TransportButton icon={String.fromCharCode(0xF449)} />
      <TransportButton icon={String.fromCharCode(0xF44A)} />
    </div>
  ),
};
