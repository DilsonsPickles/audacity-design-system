import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ExportModal, ExportSettings, ThemeProvider } from '@audacity-ui/components';
import { Button } from '@audacity-ui/components';

const meta: Meta<typeof ExportModal> = {
  title: 'Components/ExportModal',
  component: ExportModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExportModal>;

// Interactive wrapper
function ExportModalDemo(args: any) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (settings: ExportSettings) => {
    console.log('Export settings:', settings);
  };

  const handleEditMetadata = () => {
    console.log('Edit metadata clicked');
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Export Dialog</Button>
      <ExportModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onExport={handleExport}
        onEditMetadata={handleEditMetadata}
      />
    </div>
  );
}

export const Default: Story = {
  render: (args) => <ExportModalDemo {...args} />,
  args: {},
};

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    onExport: (settings: ExportSettings) => console.log('Export:', settings),
    onEditMetadata: () => console.log('Edit metadata'),
  },
};
