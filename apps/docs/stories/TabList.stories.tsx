import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TabList, Icon } from '@audacity-ui/components';

// Helper function to get icon for each preference tab
const getIconForTab = (tabId: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    general: <Icon name="cog" size={16} />,
    appearance: <Icon name="brush" size={16} />,
    'audio-settings': <Icon name="volume" size={16} />,
    'playback-recording': <Icon name="microphone" size={16} />,
    'audio-editing': <Icon name="waveform" size={16} />,
    'spectral-display': <Icon name="spectrogram" size={16} />,
    plugins: <Icon name="plug" size={16} />,
    music: <Icon name="metronome" size={16} />,
    cloud: <Icon name="cloud" size={16} />,
    shortcuts: <Icon name="keyboard" size={16} />,
    'advanced-options': <Icon name="cog" size={16} />,
  };
  return iconMap[tabId];
};

const meta = {
  title: 'Components/TabList',
  component: TabList,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedTabId: {
      control: 'text',
      description: 'Currently selected tab ID',
    },
    ariaLabel: {
      control: 'text',
      description: 'ARIA label for the tab list',
    },
  },
} satisfies Meta<typeof TabList>;

export default meta;
type Story = StoryObj<typeof meta>;

const preferenceTabs = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'audio-settings', label: 'Audio settings' },
  { id: 'playback-recording', label: 'Playback/Recording' },
  { id: 'audio-editing', label: 'Audio editing' },
  { id: 'spectral-display', label: 'Spectral display' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'music', label: 'Music' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'advanced-options', label: 'Advanced options' },
];

export const Default: Story = {
  args: {
    tabs: preferenceTabs,
    selectedTabId: 'general',
  },
};

export const WithIcons: Story = {
  args: {
    tabs: preferenceTabs.map((tab) => ({
      ...tab,
      icon: getIconForTab(tab.id),
    })),
    selectedTabId: 'general',
  },
};

export const WithDisabledItems: Story = {
  args: {
    tabs: preferenceTabs.map((tab) => ({
      ...tab,
      icon: getIconForTab(tab.id),
      disabled: tab.id === 'cloud' || tab.id === 'music',
    })),
    selectedTabId: 'general',
  },
};

export const Interactive: Story = {
  render: () => {
    const [selectedTab, setSelectedTab] = useState('general');

    return (
      <div style={{ width: '300px' }}>
        <TabList
          tabs={preferenceTabs.map((tab) => ({
            ...tab,
            icon: getIconForTab(tab.id),
          }))}
          selectedTabId={selectedTab}
          onTabSelect={(tabId) => setSelectedTab(tabId)}
          ariaLabel="Preferences navigation"
        />
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <strong>Selected:</strong> {selectedTab}
        </div>
      </div>
    );
  },
};

export const PreferencesSidebar: Story = {
  render: () => {
    const [selectedTab, setSelectedTab] = useState('general');

    return (
      <div style={{ display: 'flex', gap: '20px', width: '700px' }}>
        <div style={{ width: '250px', flexShrink: 0 }}>
          <TabList
            tabs={preferenceTabs.map((tab) => ({
              ...tab,
              icon: getIconForTab(tab.id),
            }))}
            selectedTabId={selectedTab}
            onTabSelect={(tabId) => setSelectedTab(tabId)}
            ariaLabel="Preferences navigation"
          />
        </div>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
            {preferenceTabs.find((t) => t.id === selectedTab)?.label || ''}
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#666' }}>
            Content for the {preferenceTabs.find((t) => t.id === selectedTab)?.label.toLowerCase()} preferences would go here.
          </p>
        </div>
      </div>
    );
  },
};
