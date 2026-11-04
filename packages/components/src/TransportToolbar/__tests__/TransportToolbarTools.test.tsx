import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
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

const renderToolbar = (workspace: Workspace, hiddenTools: string[], extra: Partial<TransportToolbarProps> = {}) => render(
  <ThemeProvider>
    <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
      <TransportToolbar {...propsFor(workspace, hiddenTools)} {...extra} />
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

describe('time signature is a Customise-toolbar tool in every workspace (2026-11-04)', () => {
  it.each(['classic', 'spectral-editing', 'modern', 'music'] as Workspace[])('%s: shown when its row is on', (workspace) => {
    const { container } = renderToolbar(workspace, []);
    expect(container.querySelector('[aria-label="Time signature"]')).toBeTruthy();
  });

  it('gone when its row is off', () => {
    const { container } = renderToolbar('music', ['time-signature']);
    expect(container.querySelector('[aria-label="Time signature"]')).toBeNull();
  });
});

describe('the microphone button opens the Microphone level flyout (2026-11-04)', () => {
  it('a press opens it and asks the host to open the mic; a second press closes it', () => {
    const onMicrophoneLevelsOpen = vi.fn();
    const { container } = renderToolbar('classic', [], { onMicrophoneLevelsOpen });
    const button = container.querySelector('button[aria-label="Microphone level"]') as HTMLElement;
    fireEvent.click(button);
    expect(document.querySelector('.microphone-level-flyout')).toBeTruthy();
    expect(onMicrophoneLevelsOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(button);
    expect(document.querySelector('.microphone-level-flyout')).toBeNull();
  });
});

describe('a right-click on the microphone button is the recording meter\'s dock menu (2026-11-04)', () => {
  it('offers "Meter in flyout" / "Vertical meter", the current one checked, and reports the pick', () => {
    const onRecordingMeterOrientationChange = vi.fn();
    const { container } = renderToolbar('classic', [], { recordingMeterOrientation: 'flyout', onRecordingMeterOrientationChange });
    const button = container.querySelector('button[aria-label="Microphone level"]') as HTMLElement;
    fireEvent.contextMenu(button, { clientX: 300, clientY: 40 });
    // The press's flyout is not what opened
    expect(document.querySelector('.microphone-level-flyout')).toBeNull();
    const items = Array.from(document.querySelectorAll('[role="menuitem"], .context-menu-item'))
      .filter((el) => /Meter in flyout|Vertical meter/.test(el.textContent ?? ''));
    expect(items.length).toBe(2);
    const vertical = items.find((el) => el.textContent?.includes('Vertical meter')) as HTMLElement;
    fireEvent.click(vertical);
    expect(onRecordingMeterOrientationChange).toHaveBeenCalledWith('vertical');
  });
});
