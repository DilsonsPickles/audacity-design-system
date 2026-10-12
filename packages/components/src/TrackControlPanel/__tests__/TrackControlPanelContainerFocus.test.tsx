import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TrackControlPanel } from '../TrackControlPanel';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">{children}</AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

describe('TrackControlPanel — reports its own keyboard focus (2026-10-12, the black-and-white bars)', () => {
  it('the panel itself taking focus by keyboard reports true; a child taking it, or leaving, reports false', () => {
    const onContainerFocusChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackControlPanel trackName="Track 1" isFocused tabIndex={0} onContainerFocusChange={onContainerFocusChange} />
      </Providers>,
    );
    const panel = container.querySelector<HTMLElement>('.track-control-panel')!;
    // keyboard mode: a Tab press was the last input
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => { panel.focus(); });
    expect(onContainerFocusChange).toHaveBeenLastCalledWith(true);
    expect(panel.classList.contains('track-control-panel--focused')).toBe(true);

    const button = panel.querySelector<HTMLElement>('button')!;
    act(() => { button.focus(); });
    expect(onContainerFocusChange).toHaveBeenLastCalledWith(false);

    act(() => { panel.focus(); });
    expect(onContainerFocusChange).toHaveBeenLastCalledWith(true);
    act(() => { panel.blur(); });
    expect(onContainerFocusChange).toHaveBeenLastCalledWith(false);
  });

  it('a mouse press before the focus is not keyboard focus', () => {
    const onContainerFocusChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackControlPanel trackName="Track 1" isFocused tabIndex={0} onContainerFocusChange={onContainerFocusChange} />
      </Providers>,
    );
    const panel = container.querySelector<HTMLElement>('.track-control-panel')!;
    fireEvent.mouseDown(document);
    act(() => { panel.focus(); });
    expect(onContainerFocusChange).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(document, { key: 'Tab' }); // leave the mode as the other tests expect
  });
});
