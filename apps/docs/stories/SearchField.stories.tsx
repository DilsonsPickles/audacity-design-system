import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchField } from '@audacity-ui/components';
import { useState } from 'react';

const meta = {
  title: 'Components/SearchField',
  component: SearchField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Current value of the search field',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the field is disabled',
    },
    width: {
      control: 'number',
      description: 'Width of the search field in pixels',
    },
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state
 */
export const Default: Story = {
  args: {
    placeholder: 'Search',
    width: 162,
  },
};

/**
 * With a search term entered
 */
export const WithValue: Story = {
  args: {
    value: 'Search term',
    placeholder: 'Search',
    width: 162,
  },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    placeholder: 'Search',
    disabled: true,
    width: 162,
  },
};

/**
 * Wider search field
 */
export const Wide: Story = {
  args: {
    placeholder: 'Search',
    width: 250,
  },
};

/**
 * Interactive example with state management
 */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState('');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <SearchField
          {...args}
          value={value}
          onChange={setValue}
          onClear={() => {
            setValue('');
            console.log('Cleared');
          }}
          onSubmit={(val) => console.log('Submitted:', val)}
        />
        <div style={{ fontSize: '12px', color: '#666' }}>
          Current value: "{value}"
        </div>
      </div>
    );
  },
  args: {
    placeholder: 'Search',
    width: 200,
  },
};

/**
 * All states showcased together
 */
export const AllStates: Story = {
  render: () => {
    const [value1, setValue1] = useState('');
    const [value2, setValue2] = useState('Search term');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', width: '100px' }}>Empty:</span>
          <SearchField value={value1} onChange={setValue1} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', width: '100px' }}>With value:</span>
          <SearchField value={value2} onChange={setValue2} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', width: '100px' }}>Disabled:</span>
          <SearchField disabled />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', width: '100px' }}>Wide:</span>
          <SearchField width={250} placeholder="Search for something..." />
        </div>
      </div>
    );
  },
};
