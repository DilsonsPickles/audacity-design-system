import type { Meta, StoryObj } from '@storybook/react';
import { EffectsPanel, TrackControlPanel } from '@audacity-ui/components';
import { useState, useRef } from 'react';

const meta: Meta<typeof EffectsPanel> = {
  title: 'Layout/EffectsPanel',
  component: EffectsPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EffectsPanel>;

/**
 * Default EffectsPanel as sidebar with track and master sections
 */
export const Sidebar: Story = {
  render: () => {
    const [trackEffects, setTrackEffects] = useState([
      { id: '1', name: 'Reverb', enabled: true },
      { id: '2', name: 'Compressor', enabled: true },
      { id: '3', name: 'EQ', enabled: false },
      { id: '4', name: 'Delay', enabled: true },
      { id: '5', name: 'Chorus', enabled: false },
    ]);

    const [masterEffects, setMasterEffects] = useState([
      { id: 'm1', name: 'Limiter', enabled: true },
      { id: 'm2', name: 'Master EQ', enabled: true },
      { id: 'm3', name: 'Stereo Enhancer', enabled: false },
      { id: 'm4', name: 'Final Compressor', enabled: true },
    ]);

    const [allTrackEffectsEnabled, setAllTrackEffectsEnabled] = useState(true);
    const [allMasterEffectsEnabled, setAllMasterEffectsEnabled] = useState(true);

    return (
      <div style={{ display: 'flex', height: '720px', width: '100%' }}>
        <EffectsPanel
          mode="sidebar"
          trackSection={{
            trackName: 'Audio Track 1',
            effects: trackEffects,
            allEnabled: allTrackEffectsEnabled,
            onToggleAll: (enabled) => {
              setAllTrackEffectsEnabled(enabled);
              setTrackEffects(trackEffects.map(e => ({ ...e, enabled })));
            },
            onEffectToggle: (index, enabled) => {
              const newEffects = [...trackEffects];
              newEffects[index] = { ...newEffects[index], enabled };
              setTrackEffects(newEffects);
            },
            onEffectsReorder: (fromIndex, toIndex) => {
              const newEffects = [...trackEffects];
              const [movedEffect] = newEffects.splice(fromIndex, 1);
              newEffects.splice(toIndex, 0, movedEffect);
              setTrackEffects(newEffects);
            },
            onAddEffect: () => {
              const newEffect = {
                id: `${trackEffects.length + 1}`,
                name: `New Effect ${trackEffects.length + 1}`,
                enabled: true,
              };
              setTrackEffects([...trackEffects, newEffect]);
            },
            onContextMenu: (e) => {
              console.log('Track context menu clicked', e);
            },
          }}
          masterSection={{
            effects: masterEffects,
            allEnabled: allMasterEffectsEnabled,
            onToggleAll: (enabled) => {
              setAllMasterEffectsEnabled(enabled);
              setMasterEffects(masterEffects.map(e => ({ ...e, enabled })));
            },
            onEffectToggle: (index, enabled) => {
              const newEffects = [...masterEffects];
              newEffects[index] = { ...newEffects[index], enabled };
              setMasterEffects(newEffects);
            },
            onEffectsReorder: (fromIndex, toIndex) => {
              const newEffects = [...masterEffects];
              const [movedEffect] = newEffects.splice(fromIndex, 1);
              newEffects.splice(toIndex, 0, movedEffect);
              setMasterEffects(newEffects);
            },
            onAddEffect: () => {
              const newEffect = {
                id: `m${masterEffects.length + 1}`,
                name: `Master Effect ${masterEffects.length + 1}`,
                enabled: true,
              };
              setMasterEffects([...masterEffects, newEffect]);
            },
            onContextMenu: (e) => {
              console.log('Master context menu clicked', e);
            },
          }}
          onClose={() => console.log('Close panel')}
        />
        <div style={{ flex: 1, padding: '20px', background: '#f0f0f0' }}>
          <h2>Main Content Area</h2>
          <p>The effects panel appears on the left side of the interface.</p>
        </div>
      </div>
    );
  },
};

/**
 * Overlay mode - triggered by clicking Effects button on track control panel
 */
export const OverlayFromTrackButton: Story = {
  render: () => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);

    const [trackEffects, setTrackEffects] = useState([
      { id: '1', name: 'Reverb', enabled: true },
      { id: '2', name: 'Compressor', enabled: true },
      { id: '3', name: 'EQ', enabled: false },
    ]);

    const handleEffectsClick = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPanelPosition({
          left: rect.right + 8, // 8px gap to the right of track control panel
          top: rect.top,
        });
      }
      setIsPanelOpen(!isPanelOpen);
    };

    return (
      <div style={{ padding: '40px', background: '#e8e8e8', minHeight: '720px', position: 'relative' }}>
        <h2 style={{ marginBottom: '20px' }}>Click "Effects" button on track panel →</h2>

        <div ref={buttonRef} style={{ width: '280px' }}>
          <TrackControlPanel
            trackName="Audio Track 1"
            trackType="mono"
            volume={75}
            pan={0}
            isMuted={false}
            isSolo={false}
            trackHeight={114}
            onEffectsClick={handleEffectsClick}
          />
        </div>

        <EffectsPanel
          isOpen={isPanelOpen}
          mode="overlay"
          left={panelPosition.left}
          top={panelPosition.top}
          trackSection={{
            trackName: 'Audio Track 1',
            effects: trackEffects,
            allEnabled: true,
            onEffectToggle: (index, enabled) => {
              const newEffects = [...trackEffects];
              newEffects[index] = { ...newEffects[index], enabled };
              setTrackEffects(newEffects);
            },
            onAddEffect: () => {
              console.log('Add effect');
            },
          }}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>
    );
  },
};

/**
 * Track section only
 */
export const TrackSectionOnly: Story = {
  render: () => {
    const [trackEffects, setTrackEffects] = useState([
      { id: '1', name: 'Reverb', enabled: true },
      { id: '2', name: 'Compressor', enabled: true },
      { id: '3', name: 'EQ', enabled: false },
    ]);

    return (
      <div style={{ display: 'flex', height: '720px', width: '100%' }}>
        <EffectsPanel
          mode="sidebar"
          trackSection={{
            trackName: 'My Awesome Track',
            effects: trackEffects,
            allEnabled: true,
            onEffectToggle: (index, enabled) => {
              const newEffects = [...trackEffects];
              newEffects[index] = { ...newEffects[index], enabled };
              setTrackEffects(newEffects);
            },
          }}
          onClose={() => console.log('Close panel')}
        />
        <div style={{ flex: 1, padding: '20px', background: '#f0f0f0' }}>
          <h2>Main Content Area</h2>
        </div>
      </div>
    );
  },
};

/**
 * Master section only
 */
export const MasterSectionOnly: Story = {
  render: () => {
    const [masterEffects, setMasterEffects] = useState([
      { id: 'm1', name: 'Limiter', enabled: true },
      { id: 'm2', name: 'Master EQ', enabled: true },
    ]);

    return (
      <div style={{ display: 'flex', height: '720px', width: '100%' }}>
        <EffectsPanel
          mode="sidebar"
          masterSection={{
            effects: masterEffects,
            allEnabled: true,
            onEffectToggle: (index, enabled) => {
              const newEffects = [...masterEffects];
              newEffects[index] = { ...newEffects[index], enabled };
              setMasterEffects(newEffects);
            },
          }}
          onClose={() => console.log('Close panel')}
        />
        <div style={{ flex: 1, padding: '20px', background: '#f0f0f0' }}>
          <h2>Main Content Area</h2>
        </div>
      </div>
    );
  },
};

/**
 * Empty state - no effects
 */
export const EmptyState: Story = {
  render: () => {
    return (
      <div style={{ display: 'flex', height: '720px', width: '100%' }}>
        <EffectsPanel
          mode="sidebar"
          trackSection={{
            trackName: 'Empty Track',
            effects: [],
            allEnabled: false,
            onAddEffect: () => console.log('Add effect'),
          }}
          masterSection={{
            effects: [],
            allEnabled: false,
            onAddEffect: () => console.log('Add master effect'),
          }}
          onClose={() => console.log('Close panel')}
        />
        <div style={{ flex: 1, padding: '20px', background: '#f0f0f0' }}>
          <h2>Main Content Area</h2>
          <p>No effects added yet.</p>
        </div>
      </div>
    );
  },
};

/**
 * All effects disabled
 */
export const AllDisabled: Story = {
  render: () => {
    const trackEffects = [
      { id: '1', name: 'Reverb', enabled: false },
      { id: '2', name: 'Compressor', enabled: false },
      { id: '3', name: 'EQ', enabled: false },
    ];

    const masterEffects = [
      { id: 'm1', name: 'Limiter', enabled: false },
      { id: 'm2', name: 'Master EQ', enabled: false },
    ];

    return (
      <div style={{ display: 'flex', height: '720px', width: '100%' }}>
        <EffectsPanel
          mode="sidebar"
          trackSection={{
            trackName: 'Audio Track 1',
            effects: trackEffects,
            allEnabled: false,
          }}
          masterSection={{
            effects: masterEffects,
            allEnabled: false,
          }}
          onClose={() => console.log('Close panel')}
        />
        <div style={{ flex: 1, padding: '20px', background: '#f0f0f0' }}>
          <h2>Main Content Area</h2>
        </div>
      </div>
    );
  },
};
