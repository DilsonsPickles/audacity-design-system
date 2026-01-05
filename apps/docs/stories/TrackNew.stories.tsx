import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
// @ts-ignore - Testing new Track component
import { TrackNew, type TrackClip } from '../../../packages/components/src/Track/TrackNew';

const meta = {
  title: 'Audio Components/Track (New)',
  component: TrackNew,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TrackNew>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleClips: TrackClip[] = [
  {
    id: 1,
    name: 'Intro',
    start: 0,
    duration: 2.5,
    selected: false,
  },
  {
    id: 2,
    name: 'Verse 1',
    start: 3,
    duration: 4,
    selected: false,
  },
  {
    id: 3,
    name: 'Chorus',
    start: 8,
    duration: 3.5,
    selected: false,
  },
];

export const Empty: Story = {
  args: {
    clips: [],
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    isMuted: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};

export const Populated: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    isMuted: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};

export const Selected: Story = {
  args: {
    clips: sampleClips.map((clip, idx) => ({
      ...clip,
      selected: idx === 1, // Select middle clip
    })),
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: false,
    isMuted: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};

export const Idle: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    isMuted: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};

export const Muted: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    isMuted: true,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};

export const Focused: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: true,
    isMuted: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};

export const FocusedAndSelected: Story = {
  args: {
    clips: sampleClips.map((clip, idx) => ({
      ...clip,
      selected: idx === 1,
    })),
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: true,
    isMuted: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <TrackNew {...args} />
    </div>
  ),
};
