import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PlaybackMeterFlyout } from '../PlaybackMeterFlyout';
import { DEFAULT_PLAYBACK_METER_LOOK } from '../../utils/meterLook';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const renderFlyout = (extra: Partial<React.ComponentProps<typeof PlaybackMeterFlyout>> = {}) => {
  const onPositionChange = vi.fn();
  const onLookChange = vi.fn();
  const onClose = vi.fn();
  render(
    <ThemeProvider>
      <PlaybackMeterFlyout
        isOpen onClose={onClose} x={200} y={40}
        position="horizontal" onPositionChange={onPositionChange}
        look={DEFAULT_PLAYBACK_METER_LOOK} onLookChange={onLookChange}
        {...extra}
      />
    </ThemeProvider>,
  );
  return { onPositionChange, onLookChange, onClose };
};

const radio = (label: string) => {
  const input = Array.from(document.querySelectorAll('.playback-meter-flyout input[type="radio"]'))
    .find((el) => el.closest('.labeled-radio')?.textContent?.includes(label)) as HTMLInputElement | undefined;
  if (!input) throw new Error(`no radio ${label}`);
  return input;
};

describe('PlaybackMeterFlyout (2026-11-04, the Figma "Playback meter" flyout)', () => {
  it('shows the four groups of the design with the current choices checked', () => {
    renderFlyout();
    const flyout = document.querySelector('.playback-meter-flyout') as HTMLElement;
    for (const text of ['Position', 'In flyout', 'Top bar (horizontal)', 'Side bar (vertical)', 'Meter style', 'Default', 'RMS', 'Gradient', 'Meter type', 'Logarithmic (dB)', 'Linear (dB)', 'Linear (amp)', 'dB range']) {
      expect(flyout.textContent).toContain(text);
    }
    expect(radio('Top bar (horizontal)').checked).toBe(true);
    expect(radio('Default').checked).toBe(true);
    expect(radio('Logarithmic (dB)').checked).toBe(true);
    expect(flyout.textContent).toContain('60');
  });

  it('a position pick reports the position; style and type picks report a new look', () => {
    const { onPositionChange, onLookChange } = renderFlyout();
    fireEvent.click(radio('Side bar (vertical)'));
    expect(onPositionChange).toHaveBeenCalledWith('vertical');
    fireEvent.click(radio('Gradient'));
    expect(onLookChange).toHaveBeenLastCalledWith({ ...DEFAULT_PLAYBACK_METER_LOOK, style: 'gradient' });
    fireEvent.click(radio('Linear (amp)'));
    expect(onLookChange).toHaveBeenLastCalledWith({ ...DEFAULT_PLAYBACK_METER_LOOK, type: 'linear-amp' });
  });

  it('a position pick dismisses the flyout; style and type picks keep it open', () => {
    const { onClose } = renderFlyout();
    fireEvent.click(radio('Gradient'));
    fireEvent.click(radio('Linear (amp)'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(radio('Side bar (vertical)'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the live meter inside the flyout only when the position is "In flyout"', () => {
    const topBar = render(
      <ThemeProvider>
        <PlaybackMeterFlyout
          isOpen onClose={() => {}} x={200} y={40}
          position="horizontal" onPositionChange={() => {}}
          look={DEFAULT_PLAYBACK_METER_LOOK} onLookChange={() => {}}
        />
      </ThemeProvider>,
    );
    expect(topBar.container.querySelector('.master-meter')).toBeNull();
    expect(topBar.container.textContent).not.toContain('Playback level');
    cleanup();

    const inFlyout = render(
      <ThemeProvider>
        <PlaybackMeterFlyout
          isOpen onClose={() => {}} x={200} y={40}
          position="flyout" onPositionChange={() => {}}
          look={DEFAULT_PLAYBACK_METER_LOOK} onLookChange={() => {}}
        />
      </ThemeProvider>,
    );
    expect(inFlyout.container.querySelector('.master-meter')).toBeTruthy();
    expect(inFlyout.container.textContent).toContain('Playback level');
    expect(radio('In flyout').checked).toBe(true);
  });
});
