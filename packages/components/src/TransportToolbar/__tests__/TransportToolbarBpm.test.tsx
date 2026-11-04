import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { TransportToolbar, type TransportToolbarProps, type Workspace } from '../TransportToolbar';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';

afterEach(cleanup);

const noop = () => {};
const propsFor = (workspace: Workspace, hiddenTools: string[]): TransportToolbarProps => ({
  activeMenuItem: 'project',
  workspace,
  hiddenTools,
  isPlaying: false,
  isRecording: false,
  onPlay: noop,
  onStop: noop,
  onRecord: noop,
  loopRegionEnabled: false,
  loopRegionStart: null,
  loopRegionEnd: null,
  setLoopRegionEnabled: noop,
  setLoopRegionStart: noop,
  setLoopRegionEnd: noop,
  timeSelection: null,
  bpm: 120,
  onBpmChange: noop,
  beatsPerMeasure: 4,
  envelopeMode: false,
  spectrogramMode: false,
  onToggleEnvelope: noop,
  onToggleSpectrogram: noop,
  onZoomIn: noop,
  onZoomOut: noop,
  onZoomToSelection: noop,
  onZoomToFitProject: noop,
  onZoomToggle: noop,
  currentTime: 0,
  timeCodeFormat: 'mm:ss+milliseconds',
  onTimeCodeChange: noop,
  onTimeCodeFormatChange: noop,
  onShareClick: noop,
  onExportAudioClick: noop,
  onExportLoopRegionClick: noop,
});

const renderToolbar = (workspace: Workspace, hiddenTools: string[]) => render(
  <ThemeProvider>
    <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
      <TransportToolbar {...propsFor(workspace, hiddenTools)} />
    </AccessibilityProfileProvider>
  </ThemeProvider>,
);

describe('BPM is a Customise-toolbar tool in every workspace (2026-11-04)', () => {
  it.each(['classic', 'spectral-editing', 'modern', 'music'] as Workspace[])('%s: shown when its row is on', (workspace) => {
    const { container } = renderToolbar(workspace, []);
    expect(container.querySelector('[aria-label="Increase BPM"]')).toBeTruthy();
  });

  it.each(['classic', 'music'] as Workspace[])('%s: gone when its row is off', (workspace) => {
    const { container } = renderToolbar(workspace, ['bpm']);
    expect(container.querySelector('[aria-label="Increase BPM"]')).toBeNull();
  });
});
