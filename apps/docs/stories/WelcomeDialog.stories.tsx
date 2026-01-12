import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { WelcomeDialog } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/WelcomeDialog',
  component: WelcomeDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WelcomeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// macOS style
export const macOS: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#677ce4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Open Welcome Dialog (macOS)
        </button>
        <WelcomeDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  },
};

// Windows style
export const Windows: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#677ce4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Open Welcome Dialog (Windows)
        </button>
        <WelcomeDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  },
};
