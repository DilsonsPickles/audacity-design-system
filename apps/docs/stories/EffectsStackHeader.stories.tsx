import type { Meta, StoryObj } from '@storybook/react';
import { EffectsStackHeader, ThemeProvider, darkTheme } from '@audacity-ui/components';

const meta = {
  title: 'Components/EffectsStackHeader',
  component: EffectsStackHeader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider theme={darkTheme}>
        <div style={{ width: '240px' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof EffectsStackHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default track header with effects disabled
 */
export const Inactive: Story = {
  args: {
    name: 'Track name',
    allEnabled: false,
    onToggleAll: (enabled) => console.log('Toggle all:', enabled),
    onContextMenu: (e) => console.log('Context menu clicked'),
  },
};

/**
 * Track header with all effects enabled (active state)
 */
export const Active: Story = {
  args: {
    name: 'Track name',
    allEnabled: true,
    onToggleAll: (enabled) => console.log('Toggle all:', enabled),
    onContextMenu: (e) => console.log('Context menu clicked'),
  },
};

/**
 * Master track header (inactive)
 */
export const MasterInactive: Story = {
  args: {
    name: 'Master track',
    allEnabled: false,
    isMaster: true,
    onToggleAll: (enabled) => console.log('Toggle all master:', enabled),
    onContextMenu: (e) => console.log('Context menu clicked'),
  },
};

/**
 * Master track header (active)
 */
export const MasterActive: Story = {
  args: {
    name: 'Master track',
    allEnabled: true,
    isMaster: true,
    onToggleAll: (enabled) => console.log('Toggle all master:', enabled),
    onContextMenu: (e) => console.log('Context menu clicked'),
  },
};

/**
 * Long track name with overflow
 */
export const LongName: Story = {
  args: {
    name: 'Very Long Track Name That Should Truncate With Ellipsis',
    allEnabled: false,
    onToggleAll: (enabled) => console.log('Toggle all:', enabled),
    onContextMenu: (e) => console.log('Context menu clicked'),
  },
};

/**
 * Interactive example
 */
export const Interactive: Story = {
  args: {
    name: 'Audio Track 1',
    allEnabled: false,
  },
  render: (args) => {
    const [enabled, setEnabled] = React.useState(args.allEnabled);

    return (
      <EffectsStackHeader
        {...args}
        allEnabled={enabled}
        onToggleAll={(newEnabled) => {
          setEnabled(newEnabled);
          console.log('Toggled to:', newEnabled);
        }}
        onContextMenu={(e) => {
          console.log('Context menu clicked at', e.clientX, e.clientY);
        }}
      />
    );
  },
};

// Add React import for Interactive story
import React from 'react';
