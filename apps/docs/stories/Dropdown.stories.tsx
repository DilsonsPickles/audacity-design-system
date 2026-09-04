import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Dropdown } from '@audacity-ui/components';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    width: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const languageOptions = [
  { value: 'en', label: 'System (English)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

// Interactive component wrapper for controlled state
function DropdownDemo(args: any) {
  const [value, setValue] = useState(args.value || '');

  return (
    <Dropdown
      {...args}
      value={value}
      onChange={(newValue) => {
        setValue(newValue);
        args.onChange?.(newValue);
      }}
    />
  );
}

export const Default: Story = {
  render: (args) => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    placeholder: 'Select language',
    width: '290px',
  },
};

export const WithValue: Story = {
  render: (args) => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    value: 'en',
    width: '290px',
  },
};

export const Disabled: Story = {
  render: (args) => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    value: 'en',
    disabled: true,
    width: '290px',
  },
};

export const Narrow: Story = {
  render: (args) => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    placeholder: 'Select',
    width: '162px',
  },
};

export const LongList: Story = {
  render: (args) => <DropdownDemo {...args} />,
  args: {
    options: [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
      { value: '4', label: 'Option 4' },
      { value: '5', label: 'Option 5' },
      { value: '6', label: 'Option 6' },
      { value: '7', label: 'Option 7' },
      { value: '8', label: 'Option 8' },
      { value: '9', label: 'Option 9' },
      { value: '10', label: 'Option 10' },
      { value: '11', label: 'Option 11' },
      { value: '12', label: 'Option 12' },
      { value: '13', label: 'Option 13' },
      { value: '14', label: 'Option 14' },
      { value: '15', label: 'Option 15' },
    ],
    placeholder: 'Select option',
    width: '200px',
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontFamily: 'Inter' }}>
          Idle
        </div>
        <Dropdown
          options={languageOptions}
          placeholder="Select option"
          width="200px"
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontFamily: 'Inter' }}>
          With Value
        </div>
        <DropdownDemo
          options={languageOptions}
          value="en"
          width="200px"
        />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontFamily: 'Inter' }}>
          Disabled
        </div>
        <Dropdown
          options={languageOptions}
          value="en"
          disabled={true}
          width="200px"
        />
      </div>
    </div>
  ),
};
