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
  it('offers "Meter in flyout" / "Horizontal meter" / "Vertical meter", the current one checked, and reports the pick', () => {
    const onRecordingMeterOrientationChange = vi.fn();
    const { container } = renderToolbar('classic', [], { recordingMeterOrientation: 'flyout', onRecordingMeterOrientationChange });
    const button = container.querySelector('button[aria-label="Microphone level"]') as HTMLElement;
    fireEvent.contextMenu(button, { clientX: 300, clientY: 40 });
    // The press's flyout is not what opened
    expect(document.querySelector('.microphone-level-flyout')).toBeNull();
    const items = Array.from(document.querySelectorAll('[role="menuitem"], .context-menu-item'))
      .filter((el) => /Meter in flyout|Horizontal meter|Vertical meter/.test(el.textContent ?? ''));
    expect(items.length).toBe(3);
    const horizontal = items.find((el) => el.textContent?.includes('Horizontal meter')) as HTMLElement;
    fireEvent.click(horizontal);
    expect(onRecordingMeterOrientationChange).toHaveBeenCalledWith('horizontal');
  });
});

describe('opening one toolbar meter flyout closes the other (2026-11-09)', () => {
  it('opening the playback flyout closes the mic flyout, and vice versa', () => {
    const { container } = renderToolbar('classic', []);
    const micButton = container.querySelector('button[aria-label="Microphone level"]') as HTMLElement;
    const volButton = container.querySelector('button[aria-label="Playback volume settings"]') as HTMLElement;

    fireEvent.click(micButton);
    expect(document.querySelector('.microphone-level-flyout')).toBeTruthy();
    expect(document.querySelector('.playback-meter-flyout')).toBeNull();

    fireEvent.click(volButton);
    expect(document.querySelector('.microphone-level-flyout')).toBeNull();
    expect(document.querySelector('.playback-meter-flyout')).toBeTruthy();

    fireEvent.click(micButton);
    expect(document.querySelector('.playback-meter-flyout')).toBeNull();
    expect(document.querySelector('.microphone-level-flyout')).toBeTruthy();
  });
});

describe('the recording meter shows on the toolbar when horizontal (2026-11-09)', () => {
  it('renders the Microphone meter beside the button only when orientation is horizontal', () => {
    const flyoutToolbar = renderToolbar('classic', [], { recordingMeterOrientation: 'flyout' });
    expect(flyoutToolbar.container.querySelector('[aria-label="Microphone meter"]')).toBeNull();
    cleanup();
    const horizontalToolbar = renderToolbar('classic', [], { recordingMeterOrientation: 'horizontal' });
    expect(horizontalToolbar.container.querySelector('[aria-label="Microphone meter"]')).toBeTruthy();
  });

  it('hides with its button when the microphone-levels tool is off', () => {
    const { container } = renderToolbar('classic', ['microphone-levels'], { recordingMeterOrientation: 'horizontal' });
    expect(container.querySelector('button[aria-label="Microphone level"]')).toBeNull();
    expect(container.querySelector('[aria-label="Microphone meter"]')).toBeNull();
  });

  it('hides the mic button from the toolbar when the meter is docked vertical', () => {
    const flyoutToolbar = renderToolbar('classic', [], { recordingMeterOrientation: 'flyout' });
    expect(flyoutToolbar.container.querySelector('button[aria-label="Microphone level"]')).toBeTruthy();
    cleanup();
    const verticalToolbar = renderToolbar('classic', [], { recordingMeterOrientation: 'vertical' });
    expect(verticalToolbar.container.querySelector('button[aria-label="Microphone level"]')).toBeNull();
    expect(verticalToolbar.container.querySelector('[aria-label="Microphone meter"]')).toBeNull();
  });
});

describe('the volume button opens the Playback meter flyout (2026-11-04)', () => {
  it('a press opens it in place of the old two-item menu; a position pick reports through onMeterOrientationChange', () => {
    const onMeterOrientationChange = vi.fn();
    const { container } = renderToolbar('classic', [], { meterOrientation: 'horizontal', onMeterOrientationChange });
    const button = container.querySelector('button[aria-label="Playback volume settings"]') as HTMLElement;
    fireEvent.click(button);
    const flyout = document.querySelector('.playback-meter-flyout') as HTMLElement;
    expect(flyout).toBeTruthy();
    expect(flyout.textContent).toContain('Meter style');
    const vertical = Array.from(flyout.querySelectorAll('input[type="radio"]'))
      .find((el) => el.closest('.labeled-radio')?.textContent?.includes('Side bar (vertical)')) as HTMLElement;
    fireEvent.click(vertical);
    expect(onMeterOrientationChange).toHaveBeenCalledWith('vertical');
  });
});
