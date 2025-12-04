import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar, ToolbarDivider, ToolbarButtonGroup, GhostButton, ToggleButton, Icon, TransportButton } from '@audacity-ui/components';

const meta: Meta<typeof Toolbar> = {
  title: 'Layout/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

/**
 * Basic toolbar with simple text content
 */
export const Basic: Story = {
  args: {
    children: 'Toolbar content',
  },
};

/**
 * Toolbar with button groups and dividers matching Figma design
 */
export const WithButtonGroups: Story = {
  render: () => (
    <Toolbar>
      <ToolbarButtonGroup gap={4}>
        <GhostButton>
          <Icon name="fa-bars" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-folder-open" size={16} />
        </GhostButton>
      </ToolbarButtonGroup>

      <ToolbarDivider />

      <ToolbarButtonGroup gap={2}>
        <TransportButton icon={String.fromCharCode(0xF448)} />
        <TransportButton icon={String.fromCharCode(0xF446)} />
        <TransportButton icon={String.fromCharCode(0xF44B)} />
        <TransportButton icon={String.fromCharCode(0xF447)} />
        <TransportButton icon={String.fromCharCode(0xF449)} />
        <TransportButton icon={String.fromCharCode(0xF44A)} />
      </ToolbarButtonGroup>

      <ToolbarDivider />

      <ToolbarButtonGroup gap={4}>
        <ToggleButton>
          <Icon name="fa-magnet" size={16} />
        </ToggleButton>
        <ToggleButton isActive>
          <Icon name="fa-wave-square" size={16} />
        </ToggleButton>
      </ToolbarButtonGroup>
    </Toolbar>
  ),
};

/**
 * Toolbar with content in both left and right sections
 */
export const WithRightContent: Story = {
  render: () => (
    <Toolbar
      rightContent={
        <ToolbarButtonGroup gap={4}>
          <GhostButton>
            <Icon name="fa-gear" size={16} />
          </GhostButton>
          <GhostButton>
            <Icon name="fa-question-circle" size={16} />
          </GhostButton>
        </ToolbarButtonGroup>
      }
    >
      <ToolbarButtonGroup gap={4}>
        <GhostButton>
          <Icon name="fa-play" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-pause" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-stop" size={16} />
        </GhostButton>
      </ToolbarButtonGroup>
    </Toolbar>
  ),
};

/**
 * Custom height toolbar
 */
export const CustomHeight: Story = {
  render: () => (
    <Toolbar height={64}>
      <ToolbarButtonGroup gap={4}>
        <GhostButton>
          <Icon name="fa-file" size={20} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-folder" size={20} />
        </GhostButton>
      </ToolbarButtonGroup>
    </Toolbar>
  ),
};
