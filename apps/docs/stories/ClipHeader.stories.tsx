import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClipHeader } from '@audacity-ui/components';

const meta: Meta<typeof ClipHeader> = {
  title: 'Audio/ClipHeader',
  component: ClipHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    color: {
      control: 'select',
      options: ['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'],
      description: 'Clip color from the 9-color palette',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the parent clip is selected',
    },
    state: {
      control: 'select',
      options: ['default', 'hover'],
      description: 'Interaction state',
    },
    name: {
      control: 'text',
      description: 'Clip name displayed in header',
    },
    width: {
      control: 'number',
      description: 'Width in pixels',
    },
    showPitch: {
      control: 'boolean',
      description: 'Show pitch indicator',
    },
    pitchValue: {
      control: 'text',
      description: 'Pitch value to display',
    },
    showSpeed: {
      control: 'boolean',
      description: 'Show speed indicator',
    },
    speedValue: {
      control: 'text',
      description: 'Speed value to display',
    },
    showMenu: {
      control: 'boolean',
      description: 'Show menu button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClipHeader>;

export const Default: Story = {
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Clip',
    width: 272,
    showPitch: false,
    showSpeed: false,
    showMenu: true,
  },
};

export const WithPitchAndSpeed: Story = {
  args: {
    ...Default.args,
    name: 'Audio Track',
    showPitch: true,
    pitchValue: '4.04',
    showSpeed: true,
    speedValue: '112%',
  },
};

export const Selected: Story = {
  args: {
    ...Default.args,
    selected: true,
  },
};

export const Hover: Story = {
  args: {
    ...Default.args,
    state: 'hover',
  },
};

export const SelectedHover: Story = {
  args: {
    ...Default.args,
    selected: true,
    state: 'hover',
  },
};

/**
 * Complete state matrix showing all combinations
 */
export const StateMatrix: Story = {
  render: () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>All Clip Header States</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 280px)', gap: '8px' }}>
        {['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'].map((color) => (
          <React.Fragment key={color}>
            <ClipHeader
              color={color as any}
              name={`${color} default`}
              width={272}
            />
            <ClipHeader
              color={color as any}
              name={`${color} hover`}
              state="hover"
              width={272}
            />
            <ClipHeader
              color={color as any}
              name={`${color} selected`}
              selected
              width={272}
            />
            <ClipHeader
              color={color as any}
              name={`${color} sel+hover`}
              selected
              state="hover"
              width={272}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  ),
};

/**
 * Interactive example with pitch and speed
 */
export const Interactive: Story = {
  render: () => {
    const [selected, setSelected] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);

    return (
      <div style={{ padding: '20px' }}>
        <p style={{ marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>
          Click to toggle selection, hover to see hover state
        </p>
        <ClipHeader
          color="blue"
          name="Interactive Clip"
          selected={selected}
          state={hovered ? 'hover' : 'default'}
          showPitch
          pitchValue="4.04"
          showSpeed
          speedValue="112%"
          onClick={() => setSelected(!selected)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMenuClick={() => alert('Menu clicked!')}
          width={272}
        />
      </div>
    );
  },
};
