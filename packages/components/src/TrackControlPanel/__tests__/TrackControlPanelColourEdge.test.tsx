import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
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

describe('TrackControlPanel — the track colour on its left edge (2026-11-19, "Make it muted if it\'s deselected and bright if it is selected")', () => {
  it('draws the edge in the track colour', () => {
    const { container } = render(<Providers><TrackControlPanel trackName="Mono 1" trackColor="#50A5FF" /></Providers>);
    const edge = container.querySelector<HTMLElement>('[data-track-colour-edge]');
    expect(edge).not.toBeNull();
    expect(edge!.style.getPropertyValue('--tcp-colour-edge')).toBe('#50A5FF');
  });

  it('muted while the track is not selected, bright while it is', () => {
    const { container, rerender } = render(<Providers><TrackControlPanel trackName="Mono 1" trackColor="#50A5FF" state="idle" /></Providers>);
    expect(container.querySelector('[data-track-colour-edge]')!.getAttribute('data-track-colour-edge')).toBe('muted');
    rerender(<Providers><TrackControlPanel trackName="Mono 1" trackColor="#50A5FF" state="active" /></Providers>);
    expect(container.querySelector('[data-track-colour-edge]')!.getAttribute('data-track-colour-edge')).toBe('bright');
  });

  it('no colour, no edge', () => {
    const { container } = render(<Providers><TrackControlPanel trackName="Mono 1" /></Providers>);
    expect(container.querySelector('[data-track-colour-edge]')).toBeNull();
  });
});
