import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { TrackControlSidePanel } from '../TrackControlSidePanel';
import { TrackControlPanel } from '../../TrackControlPanel';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">{children}</AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

describe("TrackControlSidePanel — the wheel's target is locked for the gesture (2026-10-08)", () => {
  const mount = () => {
    const onTrackResize = vi.fn();
    const { container } = render(
      <Providers>
        <TrackControlSidePanel trackHeights={[114, 114]} onTrackResize={onTrackResize}>
          <TrackControlPanel key="a" trackName="Track 0" trackIndex={0} />
          <TrackControlPanel key="b" trackName="Track 1" trackIndex={1} />
        </TrackControlSidePanel>
      </Providers>,
    );
    const panels = () => container.querySelectorAll<HTMLElement>('.track-control-side-panel__track');
    return { container, panels, onTrackResize };
  };

  it('a wheel aimed at another header while the pointer has not moved goes to the header that started the gesture', () => {
    const { panels, onTrackResize } = mount();
    expect(panels().length).toBe(2);
    // Start on track 1
    fireEvent.wheel(panels()[1], { deltaY: 50, metaKey: true });
    expect(onTrackResize).toHaveBeenLastCalledWith(1, 90, 'wheel');
    // The header shrank and track 0's header is now under the still
    // pointer: the next wheel lands on panel 0 — and still resizes track 1
    fireEvent.wheel(panels()[0], { deltaY: 50, metaKey: true });
    expect(onTrackResize).toHaveBeenLastCalledWith(1, 66, 'wheel');
    expect(onTrackResize.mock.calls.every(([index]) => index === 1)).toBe(true);
  });

  it('the pointer moving releases the lock: the next wheel goes to the header under it', () => {
    const { panels, onTrackResize } = mount();
    fireEvent.wheel(panels()[1], { deltaY: 50, metaKey: true });
    fireEvent.mouseMove(panels()[0], { clientX: 10, clientY: 10 });
    fireEvent.wheel(panels()[0], { deltaY: 50, metaKey: true });
    expect(onTrackResize).toHaveBeenLastCalledWith(0, 90, 'wheel');
  });

  it('a rest of over 300ms releases the lock too', () => {
    vi.useFakeTimers();
    try {
      const { panels, onTrackResize } = mount();
      fireEvent.wheel(panels()[1], { deltaY: 50, metaKey: true });
      vi.advanceTimersByTime(500);
      fireEvent.wheel(panels()[0], { deltaY: 50, metaKey: true });
      expect(onTrackResize).toHaveBeenLastCalledWith(0, 90, 'wheel');
    } finally {
      vi.useRealTimers();
    }
  });
});
