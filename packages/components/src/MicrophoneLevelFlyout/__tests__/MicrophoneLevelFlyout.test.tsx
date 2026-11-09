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

  it('the Position picker shows only when wired, and reports the three orientations', () => {
    const noPicker = render(
      <ThemeProvider>
        <MicrophoneLevelFlyout isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}} />
      </ThemeProvider>,
    );
    expect(noPicker.container.querySelector('[aria-label="Position"]')).toBeNull();
    cleanup();

    const onOrientationChange = vi.fn();
    render(
      <ThemeProvider>
        <MicrophoneLevelFlyout
          isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}}
          orientation="flyout" onOrientationChange={onOrientationChange}
        />
      </ThemeProvider>,
    );
    const group = document.querySelector('[aria-label="Position"]') as HTMLElement;
    for (const text of ['In flyout', 'Top bar (horizontal)', 'Side bar (vertical)']) {
      expect(group.textContent).toContain(text);
    }
    const radio = (label: string) => Array.from(group.querySelectorAll('input[type="radio"]'))
      .find((el) => el.closest('.labeled-radio')?.textContent?.includes(label)) as HTMLInputElement;
    expect(radio('In flyout').checked).toBe(true);
    fireEvent.click(radio('Top bar (horizontal)'));
    expect(onOrientationChange).toHaveBeenLastCalledWith('horizontal');
    fireEvent.click(radio('Side bar (vertical)'));
    expect(onOrientationChange).toHaveBeenLastCalledWith('vertical');
  });

  it('drops the meter and its gain knob when the meter lives on the toolbar or docked', () => {
    const inFlyout = render(
      <ThemeProvider>
        <MicrophoneLevelFlyout
          isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}}
          orientation="flyout" onOrientationChange={() => {}}
        />
      </ThemeProvider>,
    );
    expect(inFlyout.container.querySelector('[aria-label="Microphone meter"]')).toBeTruthy();
    expect(inFlyout.container.textContent).toContain('Microphone level');
    cleanup();

    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { container } = render(
        <ThemeProvider>
          <MicrophoneLevelFlyout
            isOpen onClose={() => {}} x={200} y={40} gain={1} onGainChange={() => {}}
            orientation={orientation} onOrientationChange={() => {}}
          />
        </ThemeProvider>,
      );
      // meter + its knob + the title/hint are gone; Position + settings remain
      expect(container.querySelector('[aria-label="Microphone meter"]')).toBeNull();
      expect(container.textContent).not.toContain('Microphone level');
      expect(container.querySelector('[aria-label="Position"]')).toBeTruthy();
      expect(container.querySelectorAll('[role="checkbox"], input[type="checkbox"]')).toHaveLength(2);
      cleanup();
    }
  });

  it('dismisses the flyout on every position change, as the playback meter flyout does', () => {
    const onClose = vi.fn();
    render(
      <ThemeProvider>
        <MicrophoneLevelFlyout
          isOpen onClose={onClose} x={200} y={40} gain={1} onGainChange={() => {}}
          orientation="horizontal" onOrientationChange={() => {}}
        />
      </ThemeProvider>,
    );
    const group = document.querySelector('[aria-label="Position"]') as HTMLElement;
    const radio = (label: string) => Array.from(group.querySelectorAll('input[type="radio"]'))
      .find((el) => el.closest('.labeled-radio')?.textContent?.includes(label)) as HTMLInputElement;
    fireEvent.click(radio('In flyout'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(radio('Side bar (vertical)'));
    expect(onClose).toHaveBeenCalledTimes(2);
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
