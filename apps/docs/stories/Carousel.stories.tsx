import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Carousel } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/Carousel',
  component: Carousel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    initialSlide: {
      control: 'number',
      description: 'Initial slide index (0-based)',
    },
    showArrows: {
      control: 'boolean',
      description: 'Show navigation arrows',
    },
    showDots: {
      control: 'boolean',
      description: 'Show pagination dots',
    },
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default carousel with 3 slides
export const Default: Story = {
  args: {
    initialSlide: 0,
    showArrows: true,
    showDots: true,
  },
  render: (args) => (
    <Carousel {...args}>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#8B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 1
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#6B8FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 2
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#5B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 3
      </div>
    </Carousel>
  ),
};

// Without arrows
export const WithoutArrows: Story = {
  args: {
    initialSlide: 0,
    showArrows: false,
    showDots: true,
  },
  render: (args) => (
    <Carousel {...args}>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#8B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 1
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#6B8FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 2
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#5B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 3
      </div>
    </Carousel>
  ),
};

// Without dots
export const WithoutDots: Story = {
  args: {
    initialSlide: 0,
    showArrows: true,
    showDots: false,
  },
  render: (args) => (
    <Carousel {...args}>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#8B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 1
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#6B8FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 2
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#5B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 3
      </div>
    </Carousel>
  ),
};

// Minimal (no navigation)
export const Minimal: Story = {
  args: {
    initialSlide: 0,
    showArrows: false,
    showDots: false,
  },
  render: (args) => (
    <Carousel {...args}>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#8B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 1
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#6B8FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 2
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#5B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 3
      </div>
    </Carousel>
  ),
};

// Start on slide 2
export const StartOnSecondSlide: Story = {
  args: {
    initialSlide: 1,
    showArrows: true,
    showDots: true,
  },
  render: (args) => (
    <Carousel {...args}>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#8B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 1
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#6B8FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 2 (Initial)
      </div>
      <div
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#5B7FBF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
        }}
      >
        Slide 3
      </div>
    </Carousel>
  ),
};
