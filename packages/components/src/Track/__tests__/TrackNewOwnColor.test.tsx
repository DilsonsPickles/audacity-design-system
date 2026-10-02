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

describe('a clip\'s OWN colour (2026-10-02)', () => {
  it('a clip wears the track\'s colour unless it has its own; classic style overrides both', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 2 },
            { id: 2, name: 'B', start: 3, duration: 2, ownColor: 'red' },
          ]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          color="blue"
        />
      </Providers>,
    );
    expect(container.querySelector('[data-clip-id="1"] [data-color]')?.getAttribute('data-color')).toBe('blue');
    expect(container.querySelector('[data-clip-id="2"] [data-color]')?.getAttribute('data-color')).toBe('red');
    cleanup();

    const classic = render(
      <Providers>
        <TrackNew
          clips={[{ id: 2, name: 'B', start: 3, duration: 2, ownColor: 'red' }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          color="blue"
          clipStyle="classic"
        />
      </Providers>,
    );
    expect(classic.container.querySelector('[data-clip-id="2"] [data-color]')?.getAttribute('data-color')).toBe('classic');
  });
});
