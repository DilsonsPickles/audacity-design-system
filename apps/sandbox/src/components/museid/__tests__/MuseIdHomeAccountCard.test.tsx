// Integration tests for MuseIdHomeAccountCard (Task 3.2b) at the
// museIdMock network boundary. Same provider-tree pattern as
// MuseIdAccountsPage.test.tsx.
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../../__tests__/museIdMock';
import { MuseIdHomeAccountCard } from '../MuseIdHomeAccountCard';

afterEach(cleanup);

type Api = {
  museId: ReturnType<typeof useMuseId>;
  museHub: ReturnType<typeof useMuseHub>;
  adieu: ReturnType<typeof useAdieu>;
};

function Harness({ apiRef }: { apiRef: React.MutableRefObject<Api | null> }) {
  const museId = useMuseId();
  const museHub = useMuseHub();
  const adieu = useAdieu();
  apiRef.current = { museId, museHub, adieu };
  return null;
}

function renderCard() {
  const apiRef: React.MutableRefObject<Api | null> = { current: null };
  const utils = render(
    <MuseHubProvider>
      <AdieuProvider>
        <MuseIdProvider>
          <Harness apiRef={apiRef} />
          <MuseIdHomeAccountCard />
        </MuseIdProvider>
      </AdieuProvider>
    </MuseHubProvider>,
  );
  return { ...utils, apiRef };
}

let mock: MuseIdMockControls;

beforeEach(() => {
  window.localStorage.clear();
  mock = createMuseIdMock();
  vi.stubGlobal('fetch', mock.fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('MuseIdHomeAccountCard', () => {
  it('signed out: "Create a Muse ID" is the primary trigger and opens the sign-up dialog', async () => {
    const { apiRef } = renderCard();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    expect(screen.getByText('Not signed in')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create a Muse ID' }));
    expect(apiRef.current?.museId.authDialog).toBe('sign-up');
  });

  it('renders full width via the --primary modifier (Muse ID is the umbrella identity, not a peer of MuseHub/audio.com)', async () => {
    const { apiRef } = renderCard();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    const heading = screen.getByRole('heading', { name: 'Muse ID' });
    expect(heading.closest('.home-tab__accounts-section--primary')).toBeTruthy();
  });

  it('signed in: shows a combined MuseHub + audio.com summary line', async () => {
    mock.seedMuseUser({
      email: 'combo@mu.se',
      password: 'correct-horse',
      name: 'Combo User',
      linkedServices: ['moose-hub', 'adieu'],
    });

    const { apiRef } = renderCard();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('combo@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));

    expect(screen.getByText('Combo User')).toBeTruthy();
    const summary = screen.getByText(/MuseHub .* audio\.com/);
    expect(summary.textContent).toMatch(/MuseHub/);
    expect(summary.textContent).toMatch(/audio\.com/);
  });

  it('global sign-out: "Sign out everywhere" clears all three contexts', async () => {
    mock.seedMuseUser({
      email: 'signout@mu.se',
      password: 'correct-horse',
      name: 'Sign Out',
      linkedServices: ['moose-hub', 'adieu'],
    });

    const { apiRef } = renderCard();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('signout@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Sign out everywhere' }));

    await waitFor(() => expect(apiRef.current!.museId.signedIn).toBe(false));
    expect(apiRef.current!.museHub.signedIn).toBe(false);
    expect(apiRef.current!.adieu.signedIn).toBe(false);
    expect(await screen.findByText('Not signed in')).toBeTruthy();
  });
});
