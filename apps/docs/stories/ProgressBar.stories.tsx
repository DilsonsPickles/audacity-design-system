import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from '@audacity-ui/components';

const meta = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    value: 0,
    width: 220,
  },
};

export const Quarter: Story = {
  args: {
    value: 25,
    width: 220,
  },
};

export const Half: Story = {
  args: {
    value: 50,
    width: 220,
  },
};

export const ThreeQuarters: Story = {
  args: {
    value: 75,
    width: 220,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    width: 220,
  },
};

export const CustomWidth: Story = {
  args: {
    value: 60,
    width: 400,
  },
};

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            return 0;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(timer);
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <ProgressBar value={progress} width={300} />
        <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
          {progress}%
        </div>
      </div>
    );
  },
};

import React from 'react';
