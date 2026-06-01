import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar, ToolbarDivider, ToolbarButtonGroup, TransportButton } from '@dilsonspickles/components';

const meta: Meta<typeof ToolbarDivider> = {
  title: 'Layout/ToolbarDivider',
  component: ToolbarDivider,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToolbarDivider>;

/**
 * The bare divider — usually placed inside a `<Toolbar>` between
 * `<ToolbarButtonGroup>`s. Renders as a thin vertical rule.
 */
export const Default: Story = {
  render: () => (
    <Toolbar>
      <ToolbarButtonGroup gap={2}>
        <TransportButton icon="skip-back" />
        <TransportButton icon="play" />
        <TransportButton icon="stop" />
      </ToolbarButtonGroup>
      <ToolbarDivider />
      <ToolbarButtonGroup gap={2}>
        <TransportButton icon="record" />
        <TransportButton icon="loop" />
      </ToolbarButtonGroup>
    </Toolbar>
  ),
};
