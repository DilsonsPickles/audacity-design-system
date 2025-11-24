import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ResizablePanel, TrackControlPanel } from '@audacity-ui/components';

const meta = {
  title: 'Layout & Behavior/ResizablePanel',
  component: ResizablePanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    minHeight: {
      control: { type: 'number', min: 20, max: 200, step: 1 },
      description: 'Minimum height the panel can be resized to',
    },
    maxHeight: {
      control: { type: 'number', min: 100, max: 500, step: 10 },
      description: 'Maximum height the panel can be resized to',
    },
    resizeEdge: {
      control: 'select',
      options: ['top', 'bottom', 'both'],
      description: 'Which edge(s) can be used to resize',
    },
    resizeThreshold: {
      control: { type: 'number', min: 4, max: 16, step: 2 },
      description: 'Size of the resize zone in pixels',
    },
  },
} satisfies Meta<typeof ResizablePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [height, setHeight] = useState(114);

    return (
      <div style={{ width: '300px' }}>
        <ResizablePanel
          initialHeight={height}
          minHeight={44}
          resizeEdge="bottom"
          onHeightChange={setHeight}
        >
          <div style={{
            backgroundColor: '#EEEEF1',
            padding: '12px',
            height: '100%',
            border: '1px solid #CDCED7',
            borderRadius: '4px',
          }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Resizable Content</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Height: {height}px
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
              Drag the bottom edge to resize
            </div>
          </div>
        </ResizablePanel>
      </div>
    );
  },
};

export const WithTrackControlPanel: Story = {
  render: () => {
    const [height, setHeight] = useState(114);

    const getHeightVariant = (): 'default' | 'truncated' | 'collapsed' => {
      if (height < 44) return 'collapsed';
      if (height < 80) return 'truncated';
      return 'default';
    };

    return (
      <div style={{ width: '240px', backgroundColor: '#f5f5f5', padding: '16px' }}>
        <ResizablePanel
          initialHeight={height}
          minHeight={44}
          resizeEdge="bottom"
          onHeightChange={setHeight}
        >
          <TrackControlPanel
            trackName="Audio Track"
            height={getHeightVariant()}
            state="idle"
          />
        </ResizablePanel>
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
          Current height: {height}px ({getHeightVariant()})
        </div>
      </div>
    );
  },
};

export const MinMaxConstraints: Story = {
  render: () => {
    const [height, setHeight] = useState(100);

    return (
      <div style={{ width: '300px' }}>
        <ResizablePanel
          initialHeight={height}
          minHeight={60}
          maxHeight={200}
          resizeEdge="bottom"
          onHeightChange={setHeight}
        >
          <div style={{
            backgroundColor: '#EEEEF1',
            padding: '12px',
            height: '100%',
            border: '1px solid #CDCED7',
            borderRadius: '4px',
          }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Constrained Resize</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Height: {height}px
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
              Min: 60px, Max: 200px
            </div>
          </div>
        </ResizablePanel>
      </div>
    );
  },
};

export const BottomEdge: Story = {
  args: {
    minHeight: 60,
    resizeEdge: 'bottom',
    resizeThreshold: 8,
  },
  render: (args) => {
    const [height, setHeight] = useState(100);

    return (
      <div style={{ width: '300px' }}>
        <ResizablePanel
          {...args}
          initialHeight={height}
          onHeightChange={setHeight}
        >
          <div style={{
            backgroundColor: '#E3F2FD',
            padding: '12px',
            height: '100%',
            border: '1px solid #90CAF9',
            borderRadius: '4px',
          }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Bottom Edge Resize</div>
            <div style={{ fontSize: '12px', color: '#1976D2' }}>
              Drag bottom edge ({args.resizeThreshold}px zone)
            </div>
          </div>
        </ResizablePanel>
      </div>
    );
  },
};

export const MultipleResizablePanels: Story = {
  render: () => {
    const [height1, setHeight1] = useState(80);
    const [height2, setHeight2] = useState(120);
    const [height3, setHeight3] = useState(100);

    return (
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <ResizablePanel
          initialHeight={height1}
          minHeight={44}
          resizeEdge="bottom"
          onHeightChange={setHeight1}
          isFirstPanel={true}
        >
          <div style={{
            backgroundColor: '#E3F2FD',
            padding: '12px',
            height: '100%',
            border: '1px solid #90CAF9',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Panel 1</div>
            <div style={{ fontSize: '12px', color: '#1976D2' }}>Height: {height1}px</div>
          </div>
        </ResizablePanel>

        <ResizablePanel
          initialHeight={height2}
          minHeight={44}
          resizeEdge="bottom"
          onHeightChange={setHeight2}
        >
          <div style={{
            backgroundColor: '#F3E5F5',
            padding: '12px',
            height: '100%',
            border: '1px solid #CE93D8',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Panel 2</div>
            <div style={{ fontSize: '12px', color: '#7B1FA2' }}>Height: {height2}px</div>
          </div>
        </ResizablePanel>

        <ResizablePanel
          initialHeight={height3}
          minHeight={44}
          resizeEdge="bottom"
          onHeightChange={setHeight3}
        >
          <div style={{
            backgroundColor: '#E8F5E9',
            padding: '12px',
            height: '100%',
            border: '1px solid #A5D6A7',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Panel 3</div>
            <div style={{ fontSize: '12px', color: '#388E3C' }}>Height: {height3}px</div>
          </div>
        </ResizablePanel>
      </div>
    );
  },
};
