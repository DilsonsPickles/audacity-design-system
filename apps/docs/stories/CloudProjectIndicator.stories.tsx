import type { Meta, StoryObj } from '@storybook/react';
import { CloudProjectIndicator } from '@audacity-ui/components';

const meta = {
  title: 'Components/CloudProjectIndicator',
  component: CloudProjectIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CloudProjectIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithBackground: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f8f8f9',
      border: '1px solid #d4d5d9',
      borderRadius: '4px',
    }}>
      <CloudProjectIndicator />
    </div>
  ),
};

export const InToolbar: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      backgroundColor: '#f8f8f9',
      border: '1px solid #d4d5d9',
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
    }}>
      <span>Home</span>
      <span>Project</span>
      <span>Export</span>
      <CloudProjectIndicator />
    </div>
  ),
};
