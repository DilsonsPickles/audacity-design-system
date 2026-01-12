import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Button variant',
    },
    size: {
      control: 'select',
      options: ['small', 'default', 'large'],
      description: 'Button size (small=24px, default=28px, large=40px)',
    },
    showIcon: {
      control: 'boolean',
      description: 'Show icon',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default secondary button (28px)
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'default',
    children: 'Secondary',
    showIcon: false,
  },
};

// Small secondary button (24px)
export const SecondarySmall: Story = {
  args: {
    variant: 'secondary',
    size: 'small',
    children: 'Secondary',
    showIcon: false,
  },
};

// With icon
export const WithIcon: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
    icon: '🎚️',
    showIcon: true,
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
    disabled: true,
    showIcon: false,
  },
};

// Disabled with icon
export const DisabledWithIcon: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
    icon: '🎚️',
    showIcon: true,
    disabled: true,
  },
};

// Primary variant
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'default',
    children: 'Primary',
    showIcon: false,
  },
};

// Large size (40px) - for CTAs
export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Watch video',
    showIcon: false,
  },
};

// Variant comparison
export const VariantComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div>
        <Button variant="primary" size="default" showIcon={false}>Primary</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Primary
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Secondary</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Secondary
        </div>
      </div>
    </div>
  ),
};

// Size comparison
export const SizeComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div>
        <Button variant="secondary" size="small" showIcon={false}>Small</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Small (24px)
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Default</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Default (28px)
        </div>
      </div>
      <div>
        <Button variant="primary" size="large" showIcon={false}>Large</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Large (40px)
        </div>
      </div>
    </div>
  ),
};

// Interactive states demo
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Default</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Default
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Hover</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Hover (try me)
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false} disabled>Disabled</Button>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Disabled
        </div>
      </div>
    </div>
  ),
};

// With icons demo
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button variant="secondary" icon="🎚️">Mixer</Button>
      <Button variant="secondary" icon="⏪">Rewind</Button>
      <Button variant="secondary" icon="⏸️">Pause</Button>
      <Button variant="secondary" icon="⏯️">Play</Button>
      <Button variant="secondary" icon="⏹️">Stop</Button>
      <Button variant="secondary" icon="⏩">Forward</Button>
    </div>
  ),
};

// Long text
export const LongText: Story = {
  args: {
    variant: 'secondary',
    children: 'This is a longer button text',
    showIcon: false,
  },
};

// Click handler demo
export const Interactive: Story = {
  render: () => {
    const handleClick = () => {
      alert('Button clicked!');
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <Button variant="secondary" onClick={handleClick} showIcon={false}>
          Click Me
        </Button>
        <div style={{ marginTop: '16px', fontSize: '11px', color: '#666' }}>
          Click the button to see the alert
        </div>
      </div>
    );
  },
};
