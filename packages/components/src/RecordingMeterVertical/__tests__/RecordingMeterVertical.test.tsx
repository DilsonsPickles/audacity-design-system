import React from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { RecordingMeterVertical } from '../RecordingMeterVertical';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

describe('RecordingMeterVertical (2026-11-04, the recording meter docked to the right)', () => {
  it('is the vertical meter with the mic button at its head and the gain as its knob', () => {
    const { container } = render(
      <ThemeProvider>
        <RecordingMeterVertical gain={0.5} onGainChange={() => {}} />
      </ThemeProvider>,
    );
    expect(container.querySelector('.master-meter-vertical')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Microphone level"]')).toBeTruthy();
    const knob = container.querySelector('[role="slider"][aria-label="Microphone level"]') as HTMLElement;
    expect(knob.getAttribute('aria-valuenow')).toBe('50');
  });

  it('reads the level itself, each frame — both rows show the one mic', async () => {
    const getLevelDb = vi.fn(() => -30);
    const { container } = render(
      <ThemeProvider>
        <RecordingMeterVertical gain={1} onGainChange={() => {}} getLevelDb={getLevelDb} />
      </ThemeProvider>,
    );
    await act(async () => { await frame(); await frame(); });
    expect(getLevelDb).toHaveBeenCalled();
    const fills = container.querySelectorAll('.master-meter-vertical__bar-fill') as NodeListOf<HTMLElement>;
    expect(fills.length).toBe(2);
    // −30 dB on a −60…0 scale is half the bar
    expect(fills[0].style.height).toBe('50%');
    expect(fills[1].style.height).toBe('50%');
  });

  it('its mic button opens the orientation menu: a click under the button, a right-click at the pointer', () => {
    const onSettingsMenu = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <RecordingMeterVertical gain={1} onGainChange={() => {}} onSettingsMenu={onSettingsMenu} />
      </ThemeProvider>,
    );
    const button = container.querySelector('button[aria-label="Microphone level"]') as HTMLElement;
    fireEvent.click(button);
    expect(onSettingsMenu).toHaveBeenCalledTimes(1);
    fireEvent.contextMenu(button, { clientX: 123, clientY: 456 });
    expect(onSettingsMenu).toHaveBeenLastCalledWith(123, 456);
  });
});
