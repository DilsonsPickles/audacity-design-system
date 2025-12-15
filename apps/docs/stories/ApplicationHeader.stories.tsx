import type { Meta, StoryObj } from '@storybook/react';
import { ApplicationHeader } from '@audacity-ui/components';

const meta = {
  title: 'Components/ApplicationHeader',
  component: ApplicationHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ApplicationHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Windows: Story = {
  args: {
    os: 'windows',
    appName: 'Audacity',
  },
};

export const MacOS: Story = {
  args: {
    os: 'macos',
    appName: 'Audacity',
  },
};

export const WindowsWithCallbacks: Story = {
  args: {
    os: 'windows',
    appName: 'Audacity',
    onMenuItemClick: (item) => console.log('Menu clicked:', item),
    onWindowControl: (action) => console.log('Window control:', action),
  },
};

export const MacOSWithCallbacks: Story = {
  args: {
    os: 'macos',
    appName: 'Audacity',
    onWindowControl: (action) => console.log('Window control:', action),
  },
};

export const CustomMenuItems: Story = {
  args: {
    os: 'windows',
    appName: 'Audacity',
    menuItems: ['File', 'Edit', 'View', 'Help'],
  },
};

export const Comparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>Windows</h3>
        <ApplicationHeader os="windows" />
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>macOS</h3>
        <ApplicationHeader os="macos" />
      </div>
    </div>
  ),
};
