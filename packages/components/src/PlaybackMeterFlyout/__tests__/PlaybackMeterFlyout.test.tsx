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
  render(
    <ThemeProvider>
      <PlaybackMeterFlyout
        isOpen onClose={() => {}} x={200} y={40}
        position="horizontal" onPositionChange={onPositionChange}
        look={DEFAULT_PLAYBACK_METER_LOOK} onLookChange={onLookChange}
        {...extra}
      />
    </ThemeProvider>,
  );
  return { onPositionChange, onLookChange };
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
    for (const text of ['Position', 'Top bar (horizontal)', 'Side bar (vertical)', 'Meter style', 'Default', 'RMS', 'Gradient', 'Meter type', 'Logarithmic (dB)', 'Linear (dB)', 'Linear (amp)', 'dB range']) {
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
});
