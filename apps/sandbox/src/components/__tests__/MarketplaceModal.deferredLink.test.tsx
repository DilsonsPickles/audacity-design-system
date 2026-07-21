// Deferred-link prompt tests for MarketplaceModal (Task 3.2b item 4): "Have
// an existing MuseHub account? Link it" only appears when Muse ID is signed
// in AND MuseHub isn't linked yet. Same museIdMock provider-tree pattern as
// the other Task 3.2b tests (see museid/__tests__/MuseIdAccountsPage.test.tsx).
import React from 'react';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../__tests__/museIdMock';
import { MarketplaceModal } from '../MarketplaceModal';

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

function renderModal() {
  const apiRef: React.MutableRefObject<Api | null> = { current: null };
  const utils = render(
    <MuseHubProvider>
      <AdieuProvider>
        <MuseIdProvider>
          <Harness apiRef={apiRef} />
          <MarketplaceModal
            open
            destinationName="Vocals"
            onClose={() => {}}
            onAddEffect={() => {}}
          />
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

const bannerText = /Have an existing MuseHub account\?/;

describe('MarketplaceModal deferred-link prompt', () => {
  it('does not appear when signed out of Muse ID', async () => {
    const { apiRef } = renderModal();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    expect(screen.queryByText(bannerText)).toBeNull();
  });

  it('appears when signed in to Muse ID and MuseHub is unlinked, with a sign-in action (no session-linking)', async () => {
    mock.seedMuseUser({
      email: 'unlinked@mu.se',
      password: 'correct-horse',
      name: 'Unlinked User',
      linkedServices: ['adieu'],
    });

    const { apiRef } = renderModal();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('unlinked@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museId.signedIn).toBe(true));
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    expect(await screen.findByText(bannerText)).toBeTruthy();

    // Session-linking removal: the prompt's action just opens the MuseHub
    // sign-in dialog; ownership-proven linking lives on the Accounts page.
    await act(async () => {
      screen.getByRole('button', { name: 'Sign in to MuseHub' }).click();
    });
    expect(apiRef.current!.museHub.authDialog).toBe('sign-in');
  });

  it('does not appear once MuseHub is linked', async () => {
    mock.seedMuseUser({
      email: 'linked@mu.se',
      password: 'correct-horse',
      name: 'Linked User',
      linkedServices: ['moose-hub'],
    });

    const { apiRef } = renderModal();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('linked@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));

    expect(screen.queryByText(bannerText)).toBeNull();
  });
});
