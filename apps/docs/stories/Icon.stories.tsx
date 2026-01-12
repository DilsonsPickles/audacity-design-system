import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from '@audacity-ui/components';

const meta = {
  title: 'Components/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: ['mixer', 'menu', 'undo', 'redo', 'play', 'pause', 'stop', 'record', 'rewind', 'forward', 'chevron-left', 'chevron-right'],
      description: 'Icon name from MusescoreIcon font',
    },
    size: {
      control: { type: 'number', min: 8, max: 48, step: 2 },
      description: 'Icon size in pixels',
    },
    color: {
      control: 'color',
      description: 'Icon color',
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'mixer',
    size: 16,
    color: '#14151a',
  },
};

export const Menu: Story = {
  args: {
    name: 'menu',
    size: 16,
    color: '#949494',
  },
};

export const Large: Story = {
  args: {
    name: 'mixer',
    size: 32,
    color: '#14151a',
  },
};

export const Colored: Story = {
  args: {
    name: 'mixer',
    size: 24,
    color: '#677ce4',
  },
};

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="mixer" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>mixer</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="menu" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>menu</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="undo" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>undo</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="redo" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>redo</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="play" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>play</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="pause" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>pause</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="stop" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>stop</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="record" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>record</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="rewind" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>rewind</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="forward" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>forward</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="chevron-left" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>chevron-left</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="chevron-right" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>chevron-right</span>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="mixer" size={12} />
        <span style={{ fontSize: '12px', color: '#666' }}>12px</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="mixer" size={16} />
        <span style={{ fontSize: '12px', color: '#666' }}>16px</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="mixer" size={20} />
        <span style={{ fontSize: '12px', color: '#666' }}>20px</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="mixer" size={24} />
        <span style={{ fontSize: '12px', color: '#666' }}>24px</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Icon name="mixer" size={32} />
        <span style={{ fontSize: '12px', color: '#666' }}>32px</span>
      </div>
    </div>
  ),
};
