import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { PreferencesModal, PreferencesPage } from '@audacity-ui/components';
import { Button } from '@audacity-ui/components';

const meta: Meta<typeof PreferencesModal> = {
  title: 'Components/PreferencesModal',
  component: PreferencesModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PreferencesModal>;

// Interactive wrapper
function PreferencesModalDemo(args: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PreferencesPage>('general');

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Preferences</Button>
      <PreferencesModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export const Default: Story = {
  render: (args) => <PreferencesModalDemo {...args} />,
  args: {},
};

export const GeneralPage: Story = {
  render: (args) => <PreferencesModalDemo {...args} />,
  args: {
    currentPage: 'general',
  },
};

export const AppearancePage: Story = {
  render: (args) => <PreferencesModalDemo {...args} />,
  args: {
    currentPage: 'appearance',
  },
};

// Always open for visual testing
export const AlwaysOpen: Story = {
  render: (args) => {
    const [currentPage, setCurrentPage] = useState<PreferencesPage>('general');

    return (
      <PreferencesModal
        {...args}
        isOpen={true}
        onClose={() => console.log('Close clicked')}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    );
  },
  args: {},
};
