import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToolButton } from '@audacity-ui/components';

const meta: Meta<typeof ToolButton> = {
  title: 'Components/ToolButton',
  component: ToolButton,
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
type Story = StoryObj<typeof ToolButton>;

/**
 * Tool button in idle state
 */
export const Idle: Story = {
  args: {
    icon: String.fromCharCode(0xF41B), // Mixer icon
    state: 'idle',
  },
};

/**
 * Tool button in hover state
 */
export const Hover: Story = {
  args: {
    icon: String.fromCharCode(0xF41B),
    state: 'hover',
  },
};

/**
 * Tool button in pressed state
 */
export const Pressed: Story = {
  args: {
    icon: String.fromCharCode(0xF41B),
    state: 'pressed',
  },
};

/**
 * Tool button in disabled state
 */
export const Disabled: Story = {
  args: {
    icon: String.fromCharCode(0xF41B),
    disabled: true,
  },
};

/**
 * Different tool buttons
 */
export const AllTools: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <ToolButton icon={String.fromCharCode(0xF41B)} />
      <ToolButton icon={String.fromCharCode(0xEF13)} />
      <ToolButton icon={String.fromCharCode(0xE001)} />
      <ToolButton icon={String.fromCharCode(0xE002)} />
      <ToolButton icon={String.fromCharCode(0xEF2A)} />
    </div>
  ),
};
