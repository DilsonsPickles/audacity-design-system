import type { Meta, StoryObj } from '@storybook/react';
import { ContextMenu, ContextMenuItem } from '@audacity-ui/components';
import { useState } from 'react';

const meta: Meta<typeof ContextMenuItem> = {
  title: 'Components/ContextMenuItem',
  component: ContextMenuItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '200px' }}>
        <ContextMenu isOpen={true} position={{ x: 0, y: 0 }} onClose={() => {}}>
          <Story />
        </ContextMenu>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ContextMenuItem>;

export const Basic: Story = {
  args: {
    label: 'Menu item',
    onClick: () => console.log('Clicked'),
  },
};

export const WithCheckmark: Story = {
  args: {
    label: 'Menu item',
    checked: true,
    onClick: () => console.log('Clicked'),
  },
};

export const WithCheckmarkUnchecked: Story = {
  args: {
    label: 'Menu item',
    checked: false,
    onClick: () => console.log('Clicked'),
  },
};

export const WithShortcut: Story = {
  args: {
    label: 'Menu item',
    shortcut: '⌘C',
    onClick: () => console.log('Clicked'),
  },
};

export const WithCheckmarkAndShortcut: Story = {
  args: {
    label: 'Menu item',
    checked: true,
    shortcut: '⌘C',
    onClick: () => console.log('Clicked'),
  },
};

export const Disabled: Story = {
  args: {
    label: 'Menu item',
    disabled: true,
    onClick: () => console.log('Clicked'),
  },
};

export const WithSubmenu: Story = {
  args: {
    label: 'Menu item',
    hasSubmenu: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <>
      <ContextMenuItem label="Basic menu item" onClick={() => console.log('Basic')} />
      <ContextMenuItem label="With checkmark" checked={true} onClick={() => console.log('Checked')} />
      <ContextMenuItem label="Without checkmark" checked={false} onClick={() => console.log('Unchecked')} />
      <ContextMenuItem label="With shortcut" shortcut="⌘C" onClick={() => console.log('Shortcut')} />
      <ContextMenuItem label="Checked + Shortcut" checked={true} shortcut="⌘V" onClick={() => console.log('Both')} />
      <ContextMenuItem label="Disabled" disabled={true} onClick={() => console.log('Disabled')} />
      <ContextMenuItem label="Has submenu" hasSubmenu={true} />
    </>
  ),
};

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [checked, setChecked] = useState(false);

    return (
      <ContextMenuItem
        label="Toggle me"
        checked={checked}
        onClick={() => setChecked(!checked)}
      />
    );
  },
};
