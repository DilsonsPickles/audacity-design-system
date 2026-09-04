import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LabelMarker } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Audio/LabelMarker',
  component: LabelMarker,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'track',
      values: [
        { name: 'track', value: '#eeeef1' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'Label text to display',
    },
    type: {
      control: 'select',
      options: ['point', 'region'],
      description: 'Type of label marker',
    },
    state: {
      control: 'select',
      options: ['idle', 'hover', 'active'],
      description: 'Visual state of the label',
    },
    width: {
      control: 'number',
      description: 'Width in pixels (for region labels)',
    },
    stalkHeight: {
      control: 'number',
      description: 'Height of the stalk in pixels',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the label is selected',
    },
  },
} satisfies Meta<typeof LabelMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Point marker - Idle
export const PointIdle: Story = {
  args: {
    text: 'Label 1',
    type: 'point',
    state: 'idle',
    stalkHeight: 60,
    selected: false,
  },
};

// Point marker - Hover
export const PointHover: Story = {
  args: {
    text: 'Label 1',
    type: 'point',
    state: 'hover',
    stalkHeight: 60,
    selected: false,
  },
};

// Point marker - Active/Selected
export const PointActive: Story = {
  args: {
    text: 'Label 1',
    type: 'point',
    state: 'active',
    stalkHeight: 60,
    selected: true,
  },
};

// Region marker - Idle
export const RegionIdle: Story = {
  args: {
    text: 'Label 1',
    type: 'region',
    state: 'idle',
    width: 225,
    stalkHeight: 60,
    selected: false,
  },
};

// Region marker - Hover
export const RegionHover: Story = {
  args: {
    text: 'Label 1',
    type: 'region',
    state: 'hover',
    width: 225,
    stalkHeight: 60,
    selected: false,
  },
};

// Region marker - Active/Selected
export const RegionActive: Story = {
  args: {
    text: 'Label 1',
    type: 'region',
    state: 'active',
    width: 225,
    stalkHeight: 60,
    selected: true,
  },
};

// Different widths for region markers
export const RegionWidths: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'flex-start' }}>
      <div>
        <LabelMarker text="Short" type="region" width={100} stalkHeight={60} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>100px</div>
      </div>
      <div>
        <LabelMarker text="Medium Label" type="region" width={225} stalkHeight={60} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>225px</div>
      </div>
      <div>
        <LabelMarker text="Very Long Label Name" type="region" width={350} stalkHeight={60} />
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>350px</div>
      </div>
    </div>
  ),
};

// All states comparison
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
      <div>
        <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
          Point Markers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div>
            <LabelMarker text="Label 1" type="point" state="idle" stalkHeight={60} />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>Idle</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="point" state="hover" stalkHeight={60} />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>Hover</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="point" state="active" stalkHeight={60} selected={true} />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>Active</div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
          Region Markers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div>
            <LabelMarker text="Label 1" type="region" width={225} state="idle" stalkHeight={60} />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>Idle</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="region" width={225} state="hover" stalkHeight={60} />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>Hover</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="region" width={225} state="active" stalkHeight={60} selected={true} />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>Active</div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const [selectedPoint, setSelectedPoint] = React.useState<number | null>(null);
    const [selectedRegion, setSelectedRegion] = React.useState<number | null>(null);

    return (
      <div style={{ padding: '40px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Point Markers (Click to select)</h3>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            <LabelMarker
              text="Intro"
              type="point"
              stalkHeight={60}
              selected={selectedPoint === 0}
              onClick={() => setSelectedPoint(selectedPoint === 0 ? null : 0)}
            />
            <LabelMarker
              text="Verse"
              type="point"
              stalkHeight={60}
              selected={selectedPoint === 1}
              onClick={() => setSelectedPoint(selectedPoint === 1 ? null : 1)}
            />
            <LabelMarker
              text="Chorus"
              type="point"
              stalkHeight={60}
              selected={selectedPoint === 2}
              onClick={() => setSelectedPoint(selectedPoint === 2 ? null : 2)}
            />
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: '16px' }}>Region Markers (Click to select)</h3>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            <LabelMarker
              text="Section A"
              type="region"
              width={180}
              stalkHeight={60}
              selected={selectedRegion === 0}
              onClick={() => setSelectedRegion(selectedRegion === 0 ? null : 0)}
            />
            <LabelMarker
              text="Section B"
              type="region"
              width={200}
              stalkHeight={60}
              selected={selectedRegion === 1}
              onClick={() => setSelectedRegion(selectedRegion === 1 ? null : 1)}
            />
          </div>
        </div>
      </div>
    );
  },
};
