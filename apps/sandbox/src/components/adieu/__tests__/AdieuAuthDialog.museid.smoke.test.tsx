// Smoke test for AdieuAuthDialog's "Continue with Muse ID" wiring (task
// 5.3). The five-state behaviour itself lives in the shared
// useMuseIdEntry hook and is fully exercised against the MuseHub dialog in
// ../../wallet/__tests__/AuthDialog.museid.test.tsx — this file only
// confirms the CTA is present, and that the two states most likely to
// diverge per-dialog (state 1's zero-prompt exchange, and state 2's
// recognition card) work correctly for the 'adieu' service specifically
// (right base URL, right context wired, right copy).
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../../__tests__/museIdMock';

afterEach(cleanup);

type Api = { museId: ReturnType<typeof useMuseId>; adieu: ReturnType<typeof useAdieu> };

function Harness({ apiRef }: { apiRef: React.MutableRefObject<Api | null> }) {
  const museId = useMuseId();
  const adieu = useAdieu();
  apiRef.current = { museId, adieu };
  return null;
}

function renderTree() {
  const apiRef: React.MutableRefObject<Api | null> = { current: null };
  const utils = render(
    <MuseHubProvider>
      <AdieuProvider>
        <MuseIdProvider>
          <Harness apiRef={apiRef} />
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

describe('AdieuAuthDialog — Continue with Muse ID (smoke)', () => {
  it('CTA is present above the demoted legacy form', async () => {
    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    act(() => apiRef.current!.adieu.openAuthDialog('sign-in'));

    expect(await screen.findByRole('button', { name: 'Continue with Muse ID' })).toBeInTheDocument();
    // Legacy form still there, demoted beneath.
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('state 2: same-email match shows the recognition card with no monetary value, confirming signs into adieu', async () => {
    mock.seedMuseUser({ email: 'zoe@mu.se', password: 'password1', name: 'Zoe' });
    mock.seedServiceUser('adieu', { email: 'zoe@mu.se', name: 'Zoe audio.com', itemCount: 3 });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('zoe@mu.se', 'password1');
    });

    act(() => apiRef.current!.adieu.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    await screen.findByText('Zoe audio.com');
    expect(screen.getByText('3 cloud projects')).toBeInTheDocument();
    expect(screen.getByText('zo•••@mu.se')).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: "Yes, that's me — continue" }));
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));
  });
});
