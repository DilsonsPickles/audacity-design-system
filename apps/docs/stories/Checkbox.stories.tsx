import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Checkbox } from '@audacity-ui/components';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    checked: false,
    'aria-label': 'Unchecked checkbox',
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    'aria-label': 'Checked checkbox',
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
    'aria-label': 'Disabled checkbox',
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
    'aria-label': 'Disabled checked checkbox',
  },
};

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = React.useState(false);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Checkbox
          checked={checked}
          onChange={setChecked}
          aria-label="Interactive checkbox"
        />
        <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
          Status: {checked ? 'Checked' : 'Unchecked'}
        </div>
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Checkbox checked={false} aria-label="Unchecked" />
        <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Unchecked</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Checkbox checked={true} aria-label="Checked" />
        <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Checked</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Checkbox checked={false} disabled aria-label="Disabled unchecked" />
        <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Disabled Unchecked</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Checkbox checked={true} disabled aria-label="Disabled checked" />
        <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Disabled Checked</span>
      </div>
    </div>
  ),
};
