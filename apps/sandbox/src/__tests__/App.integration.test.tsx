// Integration seam suite — renders the real App tree end-to-end (full
// provider stack, real reducer, real DOM) instead of a single unit in
// isolation. See docs/superpowers/specs/2026-07-11-integration-net-design.md
// (§2) for the seams this suite is meant to cover; this file lands the
// boot test only (Task 1) — later tasks add the rest.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';

// audioMockFactory MUST come from './audioMock' (not './integrationHarness')
// — see audioMock.ts's header comment for the circular-import deadlock this
// avoids.
import { audioMockFactory } from './audioMock';
import { renderApp } from './integrationHarness';

vi.mock('@audacity-ui/audio', () => audioMockFactory());

afterEach(cleanup);

describe('App boot', () => {
  it('boots: renders project chrome without crashing', async () => {
    const { container, findByLabelText, getByText } = renderApp();

    // App boots on the Home tab. TransportToolbar (packages/components)
    // early-returns null while activeMenuItem === 'home', so Play/Stop and
    // the rest of the project chrome (timeline ruler, tracks panel) only
    // exist once the user navigates to Project via the real nav button.
    fireEvent.click(getByText('Project'));

    await findByLabelText('Play');
    await findByLabelText('Stop');

    await waitFor(() => {
      expect(container.querySelector('.timeline-ruler')).toBeTruthy();
    });
  });
});
