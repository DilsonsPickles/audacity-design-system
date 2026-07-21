// Integration tests for MuseIdAccountsPage (Task 3.2b) at the museIdMock
// network boundary (see ../../../__tests__/museIdMock.ts). Renders the REAL
// provider tree (MuseHubProvider > AdieuProvider > MuseIdProvider), same
// pattern as MuseIdContext.test.tsx / MuseIdAuthDialog.test.tsx.
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../../__tests__/museIdMock';
import { MuseIdAccountsPage } from '../MuseIdAccountsPage';
import { adoptTokens as adoptMuseHubTokens } from '../../../lib/musehub-client';

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

function renderPage() {
  const apiRef: React.MutableRefObject<Api | null> = { current: null };
  const utils = render(
    <MuseHubProvider>
      <AdieuProvider>
        <MuseIdProvider>
          <Harness apiRef={apiRef} />
          <MuseIdAccountsPage />
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

describe('MuseIdAccountsPage', () => {
  it('signed out: shows "Create a Muse ID" (primary) which opens the sign-up dialog', async () => {
    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    expect(apiRef.current?.museId.authDialog).toBe('closed');
    fireEvent.click(screen.getByRole('button', { name: 'Create a Muse ID' }));
    expect(apiRef.current?.museId.authDialog).toBe('sign-up');
  });

  it('signed out: "Sign in" is a separate secondary action that opens the sign-in dialog', async () => {
    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(apiRef.current?.museId.authDialog).toBe('sign-in');
  });

  it('no Muse ID session: both service rows are visible with legacy sign-in actions (not hidden behind the debug toggle)', async () => {
    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    expect(apiRef.current?.museId.legacyAuthDialogsEnabled).toBe(false);
    expect(apiRef.current?.museId.signedIn).toBe(false);

    expect(screen.getByText('MuseHub')).toBeTruthy();
    expect(screen.getByText('audio.com')).toBeTruthy();

    const museHubSignIn = screen.getByRole('button', { name: 'Sign in to MuseHub' });
    const adieuSignIn = screen.getByRole('button', { name: 'Sign in to audio.com' });
    expect(apiRef.current?.museHub.authDialog).toBe('closed');
    fireEvent.click(museHubSignIn);
    expect(apiRef.current?.museHub.authDialog).toBe('sign-in');

    expect(apiRef.current?.adieu.authDialog).toBe('closed');
    fireEvent.click(adieuSignIn);
    expect(apiRef.current?.adieu.authDialog).toBe('sign-in');
  });

  it('groups MuseHub and audio.com under a "Connected services" subheading, with no "Create account" CTA anywhere on the page (Task 3.2d)', async () => {
    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    expect(screen.getByRole('heading', { name: 'Connected services' })).toBeTruthy();
    expect(screen.queryByText('Create account')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();
  });

  it('legacy session with no Muse ID session: row shows signed-in state but no Link action', async () => {
    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    const legacyToken = mock.seedServiceAccessToken('moose-hub', 'legacy-only@mu.se');
    await act(async () => {
      adoptMuseHubTokens({ accessToken: legacyToken, refreshToken: 'irrelevant', expiresAt: Date.now() + 3600_000 });
      await apiRef.current!.museHub.hydrate();
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));

    expect(screen.getByText(/Signed in to MuseHub as legacy-only@mu\.se/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Link MuseHub' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in to MuseHub' })).toBeNull();
  });

  it('signed in with both services linked: shows both services\' data', async () => {
    mock.seedMuseUser({
      email: 'both@mu.se',
      password: 'correct-horse',
      name: 'Both Services',
      linkedServices: ['moose-hub', 'adieu'],
    });

    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('both@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));

    // Identity card.
    expect(screen.getByText('Both Services')).toBeTruthy();
    expect(screen.getByText('both@mu.se')).toBeTruthy();

    // Both services show as linked with Unlink actions (not "Sign in to link").
    const unlinkButtons = screen.getAllByRole('button', { name: 'Unlink' });
    expect(unlinkButtons).toHaveLength(2);
    // MuseHub's stat line (balance/plugins) and adieu's project count both render.
    expect(screen.getByText(/plugins?$/)).toBeTruthy();
    expect(screen.getByText(/cloud projects?$/)).toBeTruthy();
  });

  it('SECURITY regression: a live legacy session is NOT a linking credential — linking requires the email-code proof', async () => {
    // Shared-computer hijack scenario: someone else's MuseHub session is
    // live in this browser. Creating/signing into a Muse ID must not be
    // able to convert that session into a permanent link. The only linking
    // path is proving ownership of the service account's email by code.
    mock.seedMuseUser({
      email: 'linker@mu.se',
      password: 'correct-horse',
      name: 'Linker',
      linkedServices: [],
    });

    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('linker@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museId.signedIn).toBe(true));
    expect(apiRef.current!.museId.linkedServices).toEqual([]);

    // A live legacy MuseHub session (someone's — not necessarily ours).
    const legacyToken = mock.seedServiceAccessToken('moose-hub', 'victim@example.com');
    await act(async () => {
      adoptMuseHubTokens({ accessToken: legacyToken, refreshToken: 'irrelevant', expiresAt: Date.now() + 3600_000 });
      await apiRef.current!.museHub.hydrate();
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));

    // Nothing auto-linked, and no one-click session-proof Link exists.
    expect(apiRef.current!.museId.linkedServices).toEqual([]);

    // "Link MuseHub" opens the email-code proof flow instead of linking.
    fireEvent.click(await screen.findByRole('button', { name: 'Link MuseHub' }));
    expect(await screen.findByLabelText(/Email for your MuseHub account/)).toBeInTheDocument();
    // Still not linked — opening the flow proves nothing by itself.
    expect(apiRef.current!.museId.linkedServices).toEqual([]);

    // Completing the proof for an email we can receive codes at DOES link.
    fireEvent.change(screen.getByLabelText(/Email for your MuseHub account/), {
      target: { value: 'victim@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(apiRef.current!.museId.linkedServices).toContain('moose-hub'));
    expect(await screen.findByRole('button', { name: 'Unlink' })).toBeTruthy();
  });

  it('unlink flow clears BOTH sides: muse-id\'s LinkedAccount and the service\'s museId column', async () => {
    mock.seedMuseUser({
      email: 'unlinker@mu.se',
      password: 'correct-horse',
      name: 'Unlinker',
      linkedServices: ['moose-hub'],
    });

    const { apiRef } = renderPage();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    await act(async () => {
      await apiRef.current!.museId.signIn('unlinker@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    expect(apiRef.current!.museId.linkedServices).toContain('moose-hub');

    mock.fetchMock.mockClear();
    const unlinkButton = await screen.findByRole('button', { name: 'Unlink' });
    fireEvent.click(unlinkButton);

    // Side 1: muse-id's own LinkedAccount directory no longer lists it.
    await waitFor(() => expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub'));
    // The row re-renders off the cleared state: the local MuseHub session
    // is untouched by unlink (it's a separate piece of state), so the row
    // now offers to re-link (email-code proof) rather than "Sign in to link".
    expect(await screen.findByRole('button', { name: 'Link MuseHub' })).toBeTruthy();

    // Side 2: the service's own museId column was cleared via its
    // muse-unlink endpoint — assert the call actually happened.
    const calls = mock.fetchMock.mock.calls as [RequestInfo | URL, RequestInit | undefined][];
    const unlinkCall = calls.find(([input]) => String(input).includes('/api/auth/muse-unlink'));
    expect(unlinkCall, 'expected a POST to the service muse-unlink endpoint').toBeTruthy();
  });

  // ---- Rung 3: "different email — prove by code" (task 5.4) ---------------

  describe('link by email-code proof ("Link <service>")', () => {
    it('is offered for an unlinked service with no live session, only once a Muse session exists', async () => {
      const { apiRef } = renderPage();
      await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

      // No Muse session yet — no Bearer available, so the affordance must
      // not appear (it would 401 immediately if clicked).
      expect(screen.queryByRole('button', { name: 'Link MuseHub' })).toBeNull();

      mock.seedMuseUser({ email: 'p@mu.se', password: 'password1', name: 'Page' });
      await act(async () => {
        await apiRef.current!.museId.signIn('p@mu.se', 'password1');
      });

      // Now offered, alongside (not instead of) the legacy sign-in button.
      expect(await screen.findByRole('button', { name: 'Link MuseHub' })).toBeTruthy();
      expect(await screen.findByRole('button', { name: 'Link audio.com' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Sign in to MuseHub' })).toBeTruthy();
    });

    it('happy path: email -> code -> linked, and the row now offers Unlink', async () => {
      mock.seedMuseUser({ email: 'q@mu.se', password: 'password1', name: 'Quinn' });
      mock.seedServiceUser('moose-hub', { email: 'q-alt@mu.se', name: 'Real Quinn', itemCount: 2 });

      const { apiRef } = renderPage();
      await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
      await act(async () => {
        await apiRef.current!.museId.signIn('q@mu.se', 'password1');
      });

      fireEvent.click(await screen.findByRole('button', { name: 'Link MuseHub' }));

      const emailInput = await screen.findByLabelText(/Email for your MuseHub account/);
      fireEvent.change(emailInput, { target: { value: 'q-alt@mu.se' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      const codeInput = await screen.findByLabelText('Verification code');
      expect(screen.getByText(/We've sent a code to q-alt@mu\.se/)).toBeInTheDocument();
      fireEvent.change(codeInput, { target: { value: '000000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

      await waitFor(() => expect(apiRef.current!.museId.linkedServices).toContain('moose-hub'));
      expect(await screen.findByRole('button', { name: 'Unlink' })).toBeTruthy();
      // The inline form closed itself on success.
      expect(screen.queryByLabelText('Verification code')).toBeNull();
    });

    it('no_account: shows an inline neutral error and stays open for another attempt', async () => {
      mock.seedMuseUser({ email: 'r@mu.se', password: 'password1', name: 'Rae' });
      // No moose-hub account seeded at 'r-alt@mu.se'.

      const { apiRef } = renderPage();
      await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
      await act(async () => {
        await apiRef.current!.museId.signIn('r@mu.se', 'password1');
      });

      fireEvent.click(await screen.findByRole('button', { name: 'Link MuseHub' }));

      fireEvent.change(await screen.findByLabelText(/Email for your MuseHub account/), {
        target: { value: 'r-alt@mu.se' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '000000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

      await waitFor(() =>
        expect(screen.getByRole('alert').textContent).toMatch(/no account found/i),
      );
      expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');
      // Form stayed open — not silently dismissed.
      expect(screen.getByLabelText('Verification code')).toBeInTheDocument();
    });
  });
});
