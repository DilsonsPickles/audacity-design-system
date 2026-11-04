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
    expect(flyout.textContent).toContain('Adjust the level of your OS configured microphone');
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
});
