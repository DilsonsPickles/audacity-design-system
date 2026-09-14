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
  it('CTA is present above the demoted browser sign-in', async () => {
    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    act(() => apiRef.current!.adieu.openAuthDialog('sign-in'));

    expect(await screen.findByRole('button', { name: 'Continue with Muse ID' })).toBeInTheDocument();
    // The adieu-native path is browser-first now: no in-app password form,
    // a single hand-off CTA beneath the divider.
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue on audio.com' })).toBeInTheDocument();
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

  it('state 1: already-linked closes with NO extra click (accountStatus "linked" alone is enough)', async () => {
    mock.seedMuseUser({ email: 'zl@mu.se', password: 'password1', name: 'Zoe', linkedServices: ['adieu'] });
    mock.seedServiceUser('adieu', { email: 'zl@mu.se', name: 'Zoe' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('zl@mu.se', 'password1');
    });
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));
    await act(async () => {
      await apiRef.current!.adieu.signOut();
    });

    act(() => apiRef.current!.adieu.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue to audio.com' })).toBeNull();
    expect(screen.queryByRole('button', { name: "Yes, that's me — continue" })).toBeNull();
  });

  it('focus restoration: "Back" and "Try again" both return focus to the Continue-with-Muse-ID CTA, not <body>', async () => {
    mock.seedMuseUser({ email: 'zb@mu.se', password: 'password1', name: 'Zoe' });
    mock.seedServiceUser('adieu', { email: 'zb@mu.se', name: 'Not Zoe', itemCount: 1 });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('zb@mu.se', 'password1');
    });

    act(() => apiRef.current!.adieu.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
    await screen.findByText('Not Zoe');
    fireEvent.click(screen.getByRole('button', { name: 'Not me — use a different account' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));

    let cta = await screen.findByRole('button', { name: 'Continue with Muse ID' });
    await waitFor(() => expect(document.activeElement).toBe(cta));

    mock.failNext('muse-exchange');
    fireEvent.click(cta);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    cta = await screen.findByRole('button', { name: 'Continue with Muse ID' });
    await waitFor(() => expect(document.activeElement).toBe(cta));
    expect(document.activeElement).not.toBe(document.body);
  });
});
