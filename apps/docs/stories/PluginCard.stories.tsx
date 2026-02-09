import type { Meta, StoryObj } from '@storybook/react';
import { PluginCard } from '@audacity-ui/components';

const meta: Meta<typeof PluginCard> = {
  title: 'Components/PluginCard',
  component: PluginCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PluginCard>;

export const Default: Story = {
  args: {
    name: 'OpenVINO AI Tools',
    description: 'AI-powered audio enhancement and noise reduction using OpenVINO™ toolkit.',
    onActionClick: () => console.log('Get plugin clicked'),
  },
};

export const WithImage: Story = {
  args: {
    name: 'OpenVINO AI Tools',
    description: 'AI-powered audio enhancement and noise reduction using OpenVINO™ toolkit.',
    imageUrl: 'https://via.placeholder.com/120',
    onActionClick: () => console.log('Get plugin clicked'),
  },
};

export const WithVersionRequirement: Story = {
  args: {
    name: 'OpenVINO AI Tools',
    description: 'AI-powered audio enhancement and noise reduction using OpenVINO™ toolkit.',
    requiresVersion: 'Audacity 3.4 or later',
    onActionClick: () => console.log('Get plugin clicked'),
  },
};

export const WithImageAndVersion: Story = {
  args: {
    name: 'OpenVINO AI Tools',
    description: 'AI-powered audio enhancement and noise reduction using OpenVINO™ toolkit.',
    imageUrl: 'https://via.placeholder.com/120',
    requiresVersion: 'Audacity 3.4 or later',
    onActionClick: () => console.log('Get plugin clicked'),
  },
};

export const CustomButtonText: Story = {
  args: {
    name: 'Premium Audio Suite',
    description: 'Professional-grade audio processing tools for mastering and mixing.',
    imageUrl: 'https://via.placeholder.com/120',
    actionButtonText: 'Purchase Now',
    onActionClick: () => console.log('Purchase clicked'),
  },
};

export const LongDescription: Story = {
  args: {
    name: 'Advanced Spectrum Analyzer',
    description:
      'A comprehensive spectrum analysis tool with real-time visualization, multiple display modes, and advanced frequency detection algorithms. Perfect for audio engineers and producers who need detailed frequency analysis.',
    imageUrl: 'https://via.placeholder.com/120',
    requiresVersion: 'Audacity 3.5 or later',
    onActionClick: () => console.log('Get plugin clicked'),
  },
};

export const Disabled: Story = {
  args: {
    name: 'OpenVINO AI Tools',
    description: 'AI-powered audio enhancement and noise reduction using OpenVINO™ toolkit.',
    requiresVersion: 'Audacity 3.7.4 or later',
    disabled: true,
    onActionClick: () => console.log('Get plugin clicked'),
  },
};

export const MultipleCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', maxWidth: '1200px' }}>
      <PluginCard
        name="OpenVINO AI Tools"
        description="AI-powered audio enhancement and noise reduction using OpenVINO™ toolkit."
        onActionClick={() => console.log('Get OpenVINO')}
      />
      <PluginCard
        name="Vocal Remover Pro"
        description="Advanced vocal isolation and removal using machine learning algorithms."
        imageUrl="https://via.placeholder.com/120"
        requiresVersion="Audacity 3.4 or later"
        onActionClick={() => console.log('Get Vocal Remover')}
      />
      <PluginCard
        name="Noise Reducer Ultimate"
        description="Professional noise reduction with spectral editing capabilities."
        onActionClick={() => console.log('Get Noise Reducer')}
      />
      <PluginCard
        name="Mastering Suite"
        description="Complete mastering toolset with dynamics, EQ, and limiting."
        imageUrl="https://via.placeholder.com/120"
        onActionClick={() => console.log('Get Mastering Suite')}
      />
      <PluginCard
        name="OpenVINO AI Tools"
        description="AI-powered audio processing (Disabled)"
        requiresVersion="Audacity 3.7.4 or later"
        disabled={true}
        onActionClick={() => console.log('Get OpenVINO')}
      />
    </div>
  ),
};
