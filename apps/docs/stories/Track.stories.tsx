import type { Meta, StoryObj } from '@storybook/react';
import { Track, type TrackClip } from '@audacity-ui/components';
import { useState } from 'react';

const meta = {
  title: 'Audio Components/Track',
  component: Track,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'range', min: 44, max: 400, step: 10 },
      description: 'Track height in pixels',
    },
    trackIndex: {
      control: { type: 'select', options: [0, 1, 2] },
      description: 'Track index (determines color scheme)',
    },
    isSelected: {
      control: 'boolean',
      description: 'Whether the track is selected',
    },
    isFocused: {
      control: 'boolean',
      description: 'Whether the track has focus (shows blue borders)',
    },
    pixelsPerSecond: {
      control: { type: 'range', min: 10, max: 200, step: 10 },
      description: 'Zoom level',
    },
    width: {
      control: { type: 'range', min: 800, max: 5000, step: 100 },
      description: 'Track width in pixels',
    },
    backgroundColor: {
      control: 'color',
      description: 'Canvas background color',
    },
  },
} satisfies Meta<typeof Track>;

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

export const Default: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <Track {...args} />
    </div>
  ),
};

export const Selected: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <Track {...args} />
    </div>
  ),
};

export const Focused: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: true,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <Track {...args} />
    </div>
  ),
};

export const WithSelectedClip: Story = {
  args: {
    clips: [
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
        selected: true,
      },
      {
        id: 3,
        name: 'Chorus',
        start: 8,
        duration: 3.5,
        selected: false,
      },
    ],
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <Track {...args} />
    </div>
  ),
};

export const TrackColors: Story = {
  render: () => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ color: 'white', marginBottom: '10px' }}>Track 1 (Blue)</h3>
        <Track
          clips={sampleClips}
          height={114}
          trackIndex={0}
          isSelected={false}
          isFocused={false}
          pixelsPerSecond={100}
          width={2000}
          backgroundColor="#212433"
        />
      </div>
      <div>
        <h3 style={{ color: 'white', marginBottom: '10px' }}>Track 2 (Violet)</h3>
        <Track
          clips={sampleClips}
          height={114}
          trackIndex={1}
          isSelected={false}
          isFocused={false}
          pixelsPerSecond={100}
          width={2000}
          backgroundColor="#212433"
        />
      </div>
      <div>
        <h3 style={{ color: 'white', marginBottom: '10px' }}>Track 3 (Magenta)</h3>
        <Track
          clips={sampleClips}
          height={114}
          trackIndex={2}
          isSelected={false}
          isFocused={false}
          pixelsPerSecond={100}
          width={2000}
          backgroundColor="#212433"
        />
      </div>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    const InteractiveTrack = () => {
      const [selectedClipId, setSelectedClipId] = useState<string | number | null>(null);
      const [isFocused, setIsFocused] = useState(false);

      const clips: TrackClip[] = [
        {
          id: 1,
          name: 'Intro',
          start: 0,
          duration: 2.5,
          selected: selectedClipId === 1,
        },
        {
          id: 2,
          name: 'Verse 1',
          start: 3,
          duration: 4,
          selected: selectedClipId === 2,
        },
        {
          id: 3,
          name: 'Chorus',
          start: 8,
          duration: 3.5,
          selected: selectedClipId === 3,
        },
      ];

      return (
        <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
          <p style={{ color: 'white', marginBottom: '10px' }}>
            Click on clips to select them, click on track background to focus the track
          </p>
          <Track
            clips={clips}
            height={114}
            trackIndex={0}
            isSelected={selectedClipId !== null}
            isFocused={isFocused}
            pixelsPerSecond={100}
            width={2000}
            backgroundColor="#212433"
            onClipClick={(clipId) => setSelectedClipId(clipId)}
            onTrackClick={() => setIsFocused(!isFocused)}
          />
          {selectedClipId && (
            <p style={{ color: 'white', marginTop: '10px' }}>Selected clip: {selectedClipId}</p>
          )}
        </div>
      );
    };

    return <InteractiveTrack />;
  },
};

export const ZoomedIn: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 200,
    width: 4000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px', overflow: 'auto' }}>
      <Track {...args} />
    </div>
  ),
};

export const ZoomedOut: Story = {
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 50,
    width: 1000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <Track {...args} />
    </div>
  ),
};

export const CollapsedHeight: Story = {
  args: {
    clips: sampleClips,
    height: 44,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '200px' }}>
      <Track {...args} />
    </div>
  ),
};

export const ExpandedHeight: Story = {
  args: {
    clips: sampleClips,
    height: 200,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433',
  },
  render: (args) => (
    <div style={{ padding: '20px', backgroundColor: '#212433', minHeight: '300px' }}>
      <Track {...args} />
    </div>
  ),
};
