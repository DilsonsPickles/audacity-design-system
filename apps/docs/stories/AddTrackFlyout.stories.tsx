import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AddTrackFlyout } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';
import { useState } from 'react';

const meta = {
  title: 'Components/AddTrackFlyout',
  component: AddTrackFlyout,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the flyout is open',
    },
    showMidiOption: {
      control: 'boolean',
      description: 'Whether to show the MIDI option (default: false)',
    },
    x: {
      control: 'number',
      description: 'X position for the flyout (in pixels)',
    },
    y: {
      control: 'number',
      description: 'Y position for the flyout (in pixels)',
    },
  },
} satisfies Meta<typeof AddTrackFlyout>;

export default meta;
type Story = StoryObj<typeof meta>;

// Three options (Mono, Stereo, Label)
export const ThreeOptions: Story = {
  args: {
    isOpen: true,
    x: 200,
    y: 100,
    showMidiOption: false,
    onSelectTrackType: (type) => {
      console.log('Selected track type:', type);
    },
    onClose: () => {
      console.log('Flyout closed');
    },
  },
};

// Four options (includes MIDI)
export const FourOptions: Story = {
  args: {
    isOpen: true,
    x: 200,
    y: 100,
    showMidiOption: true,
    onSelectTrackType: (type) => {
      console.log('Selected track type:', type);
    },
    onClose: () => {
      console.log('Flyout closed');
    },
  },
};

// Interactive example with button
export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [lastSelected, setLastSelected] = useState<string>('');

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2 - 96, // Center the flyout under the button (192px / 2 = 96)
        y: rect.bottom + 8, // 8px gap below button
      });
      setIsOpen(!isOpen);
    };

    const handleSelectTrackType = (type: string) => {
      setLastSelected(type);
      setIsOpen(false);
    };

    return (
      <div style={{ padding: '100px', textAlign: 'center' }}>
        <button
          onClick={handleButtonClick}
          style={{
            padding: '8px 16px',
            background: 'rgba(194, 196, 207, 0.7)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Add Track
        </button>

        {lastSelected && (
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#14151a' }}>
            Last selected: <strong>{lastSelected}</strong>
          </div>
        )}

        <AddTrackFlyout
          isOpen={isOpen}
          x={position.x}
          y={position.y}
          showMidiOption={false}
          onSelectTrackType={handleSelectTrackType}
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  },
};

// Interactive with MIDI option
export const InteractiveWithMidi: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [lastSelected, setLastSelected] = useState<string>('');

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2 - 96, // Center the flyout under the button
        y: rect.bottom + 8,
      });
      setIsOpen(!isOpen);
    };

    const handleSelectTrackType = (type: string) => {
      setLastSelected(type);
      setIsOpen(false);
    };

    return (
      <div style={{ padding: '100px', textAlign: 'center' }}>
        <button
          onClick={handleButtonClick}
          style={{
            padding: '8px 16px',
            background: 'rgba(194, 196, 207, 0.7)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Add Track
        </button>

        {lastSelected && (
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#14151a' }}>
            Last selected: <strong>{lastSelected}</strong>
          </div>
        )}

        <AddTrackFlyout
          isOpen={isOpen}
          x={position.x}
          y={position.y}
          showMidiOption={true}
          onSelectTrackType={handleSelectTrackType}
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  },
};

// Side by side comparison
export const Comparison: Story = {
  render: () => {
    return (
      <div style={{ display: 'flex', gap: '100px', padding: '100px' }}>
        <div>
          <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
            3 Options
          </div>
          <AddTrackFlyout
            isOpen={true}
            x={0}
            y={0}
            showMidiOption={false}
            onSelectTrackType={(type) => console.log('Selected:', type)}
            onClose={() => {}}
          />
        </div>

        <div>
          <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
            4 Options (with MIDI)
          </div>
          <AddTrackFlyout
            isOpen={true}
            x={0}
            y={0}
            showMidiOption={true}
            onSelectTrackType={(type) => console.log('Selected:', type)}
            onClose={() => {}}
          />
        </div>
      </div>
    );
  },
};
