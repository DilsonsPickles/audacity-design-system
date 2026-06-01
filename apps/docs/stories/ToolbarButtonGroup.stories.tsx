import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar, ToolbarButtonGroup, TransportButton, ToolButton } from '@dilsonspickles/components';

const meta: Meta<typeof ToolbarButtonGroup> = {
  title: 'Layout/ToolbarButtonGroup',
  component: ToolbarButtonGroup,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToolbarButtonGroup>;

/**
 * Group transport buttons with a tight 2px gap (default for transport
 * clusters).
 */
export const Transport: Story = {
  render: () => (
    <Toolbar>
      <ToolbarButtonGroup gap={2}>
        <TransportButton icon="skip-back" />
        <TransportButton icon="play" />
        <TransportButton icon="stop" />
        <TransportButton icon="record" />
        <TransportButton icon="skip-forward" />
        <TransportButton icon="loop" />
      </ToolbarButtonGroup>
    </Toolbar>
  ),
};

/**
 * Tool buttons with a roomier 4px gap.
 */
export const Tools: Story = {
  render: () => (
    <Toolbar>
      <ToolbarButtonGroup gap={4}>
        <ToolButton icon="cog" ariaLabel="Settings" />
        <ToolButton icon="trim" ariaLabel="Trim" />
        <ToolButton icon="cut" ariaLabel="Cut" />
        <ToolButton icon="copy" ariaLabel="Copy" />
        <ToolButton icon="paste" ariaLabel="Paste" />
      </ToolbarButtonGroup>
    </Toolbar>
  ),
};

/**
 * A single ToolbarButtonGroup works outside of a Toolbar too, but
 * Toolbar is the usual host. Set any custom `gap` value to taste.
 */
export const Standalone: Story = {
  render: () => (
    <ToolbarButtonGroup gap={8}>
      <ToolButton icon="play" ariaLabel="Play" />
      <ToolButton icon="stop" ariaLabel="Stop" />
    </ToolbarButtonGroup>
  ),
};
