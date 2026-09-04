import type { Meta, StoryObj } from '@storybook/react';
import { SaveProjectModal } from '@audacity-ui/components';
import React from 'react';

const meta = {
  title: 'Components/SaveProjectModal',
  component: SaveProjectModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SaveProjectModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onSaveToCloud: () => console.log('Save to cloud clicked'),
    onSaveToComputer: () => console.log('Save to computer clicked'),
    dontShowAgain: false,
    onDontShowAgainChange: (checked) => console.log('Don\'t show again:', checked),
  },
};

export const WithDontShowAgainChecked: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close clicked'),
    onSaveToCloud: () => console.log('Save to cloud clicked'),
    onSaveToComputer: () => console.log('Save to computer clicked'),
    dontShowAgain: true,
    onDontShowAgainChange: (checked) => console.log('Don\'t show again:', checked),
  },
};

export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = React.useState(true);
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    return (
      <>
        <button onClick={() => setIsOpen(true)}>Open Modal</button>
        <SaveProjectModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSaveToCloud={() => {
            console.log('Save to cloud');
            setIsOpen(false);
          }}
          onSaveToComputer={() => {
            console.log('Save to computer');
            setIsOpen(false);
          }}
          dontShowAgain={dontShowAgain}
          onDontShowAgainChange={setDontShowAgain}
        />
      </>
    );
  },
};
