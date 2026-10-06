import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">{children}</AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

const visible = (container: HTMLElement, side: 'in' | 'out') =>
  container.querySelector(`[data-fade-curve="${side}"]`)!.hasAttribute('data-fade-line-visible');

describe('the fade curve\'s line shows only for a selected, focused, hovered or edited clip (2026-10-06)', () => {
  it('hidden at rest; shown while the pointer is on the clip; hidden again when it leaves', () => {
    const { container } = render(
      <Providers>
        <TrackNew clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 0.5 }]} width={800} trackIndex={0} pixelsPerSecond={100} />
      </Providers>,
    );
    expect(visible(container, 'in')).toBe(false);
    expect(visible(container, 'out')).toBe(false);
    // The dim is there regardless
    expect(container.querySelector('[data-fade-dim="in"]')).toBeTruthy();
    const clip = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    fireEvent.mouseEnter(clip, { buttons: 0 });
    expect(visible(container, 'in')).toBe(true);
    expect(visible(container, 'out')).toBe(true);
    fireEvent.mouseLeave(clip, { buttons: 0 });
    expect(visible(container, 'in')).toBe(false);
  });

  it('shown for a selected clip and for the clip with focus, without the pointer', () => {
    const { container, rerender } = render(
      <Providers>
        <TrackNew clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, selected: true }, { id: 2, name: 'B', start: 5, duration: 2, fadeOut: 1 }]} width={800} trackIndex={0} pixelsPerSecond={100} />
      </Providers>,
    );
    expect(visible(container, 'in')).toBe(true); // clip 1 is selected
    expect(visible(container, 'out')).toBe(false); // clip 2 is not
    act(() => { (container.querySelector('[data-clip-id="2"]') as HTMLElement).focus(); });
    expect(visible(container, 'out')).toBe(true);
    rerender(
      <Providers>
        <TrackNew clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1 }, { id: 2, name: 'B', start: 5, duration: 2, fadeOut: 1 }]} width={800} trackIndex={0} pixelsPerSecond={100} />
      </Providers>,
    );
    expect(visible(container, 'in')).toBe(false);
  });
});
