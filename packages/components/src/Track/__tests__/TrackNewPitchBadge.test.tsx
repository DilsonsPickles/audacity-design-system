import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        {children}
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

describe('a pitched clip wears the header\'s ♪ badge (2026-10-02)', () => {
  it('shows the semitones, signed, only when there is a shift', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 2 },
            { id: 2, name: 'B', start: 3, duration: 2, pitchSemitones: 2 },
            { id: 3, name: 'C', start: 6, duration: 2, pitchSemitones: -1.5 },
          ]}
          width={1000}
          trackIndex={0}
          pixelsPerSecond={100}
        />
      </Providers>,
    );
    const badge = (id: number) => [...container.querySelectorAll(`[data-clip-id="${id}"] .clip-header__badge`)]
      .find((b) => b.querySelector('.clip-header__badge-icon')?.textContent === '♪')?.querySelector('.clip-header__badge-value')?.textContent;
    expect(badge(1)).toBeUndefined();
    expect(badge(2)).toBe('+2');
    expect(badge(3)).toBe('-1.50');
  });
});
