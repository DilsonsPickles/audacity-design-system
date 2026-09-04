import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { LabeledCheckbox } from '@audacity-ui/components';

const meta = {
  title: 'Components/LabeledCheckbox',
  component: LabeledCheckbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LabeledCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Don't show this again",
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    label: "Don't show this again",
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Don't show this again",
    checked: false,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: "Don't show this again",
    checked: true,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = React.useState(false);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <LabeledCheckbox
          label="Don't show this again"
          checked={checked}
          onChange={setChecked}
        />
        <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
          Status: {checked ? 'Checked' : 'Unchecked'}
        </div>
      </div>
    );
  },
};

export const VariousLabels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <LabeledCheckbox label="Don't show this again" checked={false} />
      <LabeledCheckbox label="I agree to the terms and conditions" checked={false} />
      <LabeledCheckbox label="Remember me" checked={true} />
      <LabeledCheckbox label="Send me notifications" checked={false} />
    </div>
  ),
};
