import type { Meta, StoryObj } from '@storybook/react';
import { EffectSlot, ThemeProvider, darkTheme } from '@audacity-ui/components';
import React from 'react';

const meta = {
  title: 'Components/EffectSlot',
  component: EffectSlot,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider theme={darkTheme}>
        <div style={{ width: '240px', padding: '8px', background: '#1a1a1a' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof EffectSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Effect slot in enabled state (blue toggle)
 */
export const Enabled: Story = {
  args: {
    effectName: 'Effect name',
    enabled: true,
    onToggle: (enabled) => console.log('Toggle:', enabled),
    onSelectEffect: () => console.log('Select effect clicked'),
    onShowSettings: () => console.log('Settings clicked'),
  },
};

/**
 * Effect slot in disabled state (gray toggle)
 */
export const Disabled: Story = {
  args: {
    effectName: 'Effect name',
    enabled: false,
    onToggle: (enabled) => console.log('Toggle:', enabled),
    onSelectEffect: () => console.log('Select effect clicked'),
    onShowSettings: () => console.log('Settings clicked'),
  },
};

/**
 * With actual effect names
 */
export const WithEffectNames: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      <EffectSlot
        effectName="Reverb"
        enabled={true}
        onToggle={(enabled) => console.log('Reverb toggle:', enabled)}
        onSelectEffect={() => console.log('Select reverb')}
        onShowSettings={() => console.log('Reverb settings')}
      />
      <EffectSlot
        effectName="Compressor"
        enabled={true}
        onToggle={(enabled) => console.log('Compressor toggle:', enabled)}
        onSelectEffect={() => console.log('Select compressor')}
        onShowSettings={() => console.log('Compressor settings')}
      />
      <EffectSlot
        effectName="EQ"
        enabled={false}
        onToggle={(enabled) => console.log('EQ toggle:', enabled)}
        onSelectEffect={() => console.log('Select EQ')}
        onShowSettings={() => console.log('EQ settings')}
      />
    </div>
  ),
};

/**
 * Long effect name with overflow
 */
export const LongEffectName: Story = {
  args: {
    effectName: 'Very Long Effect Name That Should Truncate With Ellipsis',
    enabled: true,
    onToggle: (enabled) => console.log('Toggle:', enabled),
    onSelectEffect: () => console.log('Select effect clicked'),
    onShowSettings: () => console.log('Settings clicked'),
  },
};

/**
 * Interactive example
 */
export const Interactive: Story = {
  args: {
    effectName: 'Compressor',
    enabled: true,
  },
  render: (args) => {
    const [enabled, setEnabled] = React.useState(args.enabled);
    const [effectName, setEffectName] = React.useState(args.effectName);

    return (
      <EffectSlot
        effectName={effectName}
        enabled={enabled}
        onToggle={(newEnabled) => {
          setEnabled(newEnabled);
          console.log('Toggled to:', newEnabled);
        }}
        onSelectEffect={() => {
          console.log('Select effect clicked');
          // In real app, this would open effect selector
        }}
        onShowSettings={() => {
          console.log('Settings clicked');
          // In real app, this would open settings dropdown
        }}
      />
    );
  },
};

/**
 * Stack of effects (how they appear in the panel)
 */
export const EffectStack: Story = {
  render: () => {
    const [effects, setEffects] = React.useState([
      { id: '1', name: 'Reverb', enabled: true },
      { id: '2', name: 'Compressor', enabled: true },
      { id: '3', name: 'EQ', enabled: false },
      { id: '4', name: 'Delay', enabled: true },
    ]);
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

    const toggleEffect = (id: string) => {
      setEffects(effects.map(effect =>
        effect.id === id ? { ...effect, enabled: !effect.enabled } : effect
      ));
    };

    const handleDragStart = (index: number) => (e: React.DragEvent) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      const newEffects = [...effects];
      const draggedEffect = newEffects[draggedIndex];
      newEffects.splice(draggedIndex, 1);
      newEffects.splice(index, 0, draggedEffect);

      setEffects(newEffects);
      setDraggedIndex(index);
    };

    const handleDragEnd = () => {
      setDraggedIndex(null);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {effects.map((effect, index) => (
          <EffectSlot
            key={effect.id}
            effectName={effect.name}
            enabled={effect.enabled}
            isDragging={draggedIndex === index}
            onToggle={() => toggleEffect(effect.id)}
            onSelectEffect={() => console.log('Select:', effect.name)}
            onShowSettings={() => console.log('Settings:', effect.name)}
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    );
  },
};
