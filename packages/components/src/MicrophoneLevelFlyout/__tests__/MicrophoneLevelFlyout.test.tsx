import React from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MicrophoneLevelFlyout } from '../MicrophoneLevelFlyout';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

describe('MicrophoneLevelFlyout (2026-11-04, the toolbar mic button\'s flyout)', () => {
  it('shows the title, the meter and the hint', () => {
    render(
      <ThemeProvider>
        <MicrophoneLevelFlyout isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}} />
      </ThemeProvider>,
    );
    const flyout = document.querySelector('.microphone-level-flyout') as HTMLElement;
    expect(flyout.textContent).toContain('Microphone level');
    expect(flyout.textContent).toContain('Note: this control is tied to your computer’s main mic volume');
    expect(flyout.querySelector('[aria-label="Microphone meter"]')).toBeTruthy();
  });

  it('reads the level itself, each frame, while open — both rows show it', async () => {
    const getLevelDb = vi.fn(() => -30);
    render(
      <ThemeProvider>
        <MicrophoneLevelFlyout isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}} getLevelDb={getLevelDb} />
      </ThemeProvider>,
    );
    await act(async () => { await frame(); await frame(); });
    expect(getLevelDb).toHaveBeenCalled();
    const fills = [...document.querySelectorAll<HTMLElement>('.microphone-level-flyout .master-meter__fill')];
    expect(fills.map((f) => f.style.width)).toEqual(['50%', '50%']); // −30 dB on −60…0
  });

  it('the knob sets the gain', () => {
    const onGainChange = vi.fn();
    render(
      <ThemeProvider>
        <MicrophoneLevelFlyout isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={onGainChange} />
      </ThemeProvider>,
    );
    const slider = document.querySelector('.microphone-level-flyout [role="slider"]') as HTMLElement;
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onGainChange).toHaveBeenCalled();
    expect(onGainChange.mock.calls[0][0]).toBeLessThan(1);
  });

  it('its two settings report their changes: input monitoring and mic metering', () => {
    const onInputMonitoringChange = vi.fn();
    const onMicMeteringChange = vi.fn();
    render(
      <ThemeProvider>
        <MicrophoneLevelFlyout
          isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}}
          inputMonitoring={false} onInputMonitoringChange={onInputMonitoringChange}
          micMetering onMicMeteringChange={onMicMeteringChange}
        />
      </ThemeProvider>,
    );
    const flyout = document.querySelector('.microphone-level-flyout') as HTMLElement;
    expect(flyout.textContent).toContain('Note: this control is tied to your computer’s main mic volume');
    const boxes = [...flyout.querySelectorAll<HTMLElement>('[role="checkbox"], input[type="checkbox"]')];
    expect(boxes).toHaveLength(2);
    fireEvent.click(boxes[0]);
    expect(onInputMonitoringChange).toHaveBeenCalledWith(true);
    fireEvent.click(boxes[1]);
    expect(onMicMeteringChange).toHaveBeenCalledWith(false);
  });
});
