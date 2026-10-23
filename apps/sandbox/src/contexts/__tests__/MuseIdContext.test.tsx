// Integration tests for MuseIdContext at the museIdMock network boundary
// (see ../../__tests__/museIdMock.ts). Covers the flows Task 3.1's brief
// calls out explicitly: signup happy path (start -> verify -> complete ->
// both services exchanged+adopted), signin, signOutEverywhere clearing all
// three token stores, and a failed exchange not corrupting state.
//
// Renders the REAL provider tree (MuseHubProvider > AdieuProvider >
// MuseIdProvider) via renderHook so adoptTokens/signOut round-trip through
// the actual context wiring, not a stand-in. No UI is exercised — that's
// Task 3.2; AuthDialog/AdieuAuthDialog render null while their `authDialog`
// state is 'closed', which it stays throughout (MuseIdContext never opens
// them).
import React from 'react';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../MuseHubContext';
import { AdieuProvider, useAdieu } from '../AdieuContext';
import { MuseIdProvider } from '../MuseIdContext';
import { useMuseId } from '../useMuseId';
import { createMuseIdMock, type MuseIdMockControls, ADIEU_BASE, MOOSEHUB_BASE } from '../../__tests__/museIdMock';

afterEach(cleanup);

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MuseHubProvider>
      <AdieuProvider>
        <MuseIdProvider>{children}</MuseIdProvider>
      </AdieuProvider>
    </MuseHubProvider>
  );
}

function renderContexts() {
  return renderHook(
    () => ({ museId: useMuseId(), museHub: useMuseHub(), adieu: useAdieu() }),
    { wrapper: Wrapper },
  );
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

describe('MuseIdContext', () => {
  it('signup happy path: start -> verify -> complete -> both services exchanged + adopted', async () => {
    mock.seedServiceUser('moose-hub', { email: 'a.dawson@mu.se', name: 'A Dawson (MuseHub)' });
    mock.seedServiceUser('adieu', { email: 'a.dawson@mu.se', name: 'A Dawson (adieu)' });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signUpStart('a.dawson@mu.se');
    });

    let verifyResult: Awaited<ReturnType<typeof result.current.museId.signUpVerify>> | undefined;
    await act(async () => {
      verifyResult = await result.current.museId.signUpVerify('000000');
    });
    expect(verifyResult?.status).toBe('new');
    if (verifyResult?.status === 'new') {
      expect(verifyResult.discovery.map((d) => d.service).sort()).toEqual(['adieu', 'moose-hub']);
    }

    await act(async () => {
      await result.current.museId.signUpComplete({
        name: 'A Dawson',
        password: 'hunter22',
        links: [
          { service: 'moose-hub', method: 'email-match' },
          { service: 'adieu', method: 'email-match' },
        ],
      });
    });

    await waitFor(() => expect(result.current.museId.signedIn).toBe(true));
    expect(result.current.museId.profile?.email).toBe('a.dawson@mu.se');
    expect(result.current.museId.linkedServices.sort()).toEqual(['adieu', 'moose-hub']);
    expect(result.current.museId.error).toBeNull();

    await waitFor(() => expect(result.current.museHub.signedIn).toBe(true));
    await waitFor(() => expect(result.current.adieu.signedIn).toBe(true));
    expect(result.current.museHub.user.email).toBe('a.dawson@mu.se');
    expect(result.current.adieu.user.email).toBe('a.dawson@mu.se');

    // Each service adopted its OWN token store, not muse-id's.
    expect(window.localStorage.getItem('muse-id-tokens-v1')).not.toBeNull();
    expect(window.localStorage.getItem('musehub-tokens-v1')).not.toBeNull();
    expect(window.localStorage.getItem('adieu-tokens-v1')).not.toBeNull();
  });

  it('signin: existing Muse ID signs in and exchanges its linked services', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'correct-horse',
      name: 'Returning User',
      linkedServices: ['moose-hub', 'adieu'],
    });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signIn('returning@mu.se', 'correct-horse');
    });

    await waitFor(() => expect(result.current.museId.signedIn).toBe(true));
    expect(result.current.museId.profile?.email).toBe('returning@mu.se');

    await waitFor(() => expect(result.current.museHub.signedIn).toBe(true));
    await waitFor(() => expect(result.current.adieu.signedIn).toBe(true));
    expect(result.current.museId.error).toBeNull();
  });

  it('signin rejects a wrong password without adopting any service tokens', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'correct-horse',
      name: 'Returning User',
      linkedServices: ['moose-hub'],
    });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.museId.signIn('returning@mu.se', 'wrong-password');
      }),
    ).rejects.toThrow();

    expect(result.current.museId.signedIn).toBe(false);
    expect(result.current.museHub.signedIn).toBe(false);
  });

  it('signOutEverywhere clears muse-id, moose-hub, and adieu token stores', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'correct-horse',
      name: 'Returning User',
      linkedServices: ['moose-hub', 'adieu'],
    });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signIn('returning@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(result.current.museHub.signedIn).toBe(true));
    await waitFor(() => expect(result.current.adieu.signedIn).toBe(true));

    await act(async () => {
      await result.current.museId.signOutEverywhere();
    });

    expect(result.current.museId.signedIn).toBe(false);
    expect(result.current.museId.profile).toBeNull();
    expect(result.current.museHub.signedIn).toBe(false);
    expect(result.current.adieu.signedIn).toBe(false);

    expect(window.localStorage.getItem('muse-id-tokens-v1')).toBeNull();
    expect(window.localStorage.getItem('musehub-tokens-v1')).toBeNull();
    expect(window.localStorage.getItem('adieu-tokens-v1')).toBeNull();
  });

  it('a failed exchange for one service does not corrupt the other service or Muse ID state', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'correct-horse',
      name: 'Returning User',
      linkedServices: ['moose-hub', 'adieu'],
    });
    // One-shot failure targeting ONLY adieu's exchange call.
    mock.failNext(`${ADIEU_BASE}/api/auth/muse-exchange`);

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signIn('returning@mu.se', 'correct-horse');
    });

    // Muse ID itself signed in fine — the failure is scoped to adieu's
    // exchange, not the sign-in call.
    await waitFor(() => expect(result.current.museId.signedIn).toBe(true));
    // moose-hub's independent exchange still succeeded and adopted.
    await waitFor(() => expect(result.current.museHub.signedIn).toBe(true));
    // adieu's exchange failed — it stays signed out, not in some half-
    // adopted state.
    expect(result.current.adieu.signedIn).toBe(false);
    expect(window.localStorage.getItem('adieu-tokens-v1')).toBeNull();
    // The failure is surfaced, not swallowed silently.
    expect(result.current.museId.error).toMatch(/adieu/);

    // A retry (e.g. the user pressing "try again") succeeds cleanly and
    // doesn't require re-doing the moose-hub half.
    await act(async () => {
      await result.current.museId.signIn('returning@mu.se', 'correct-horse');
    });
    await waitFor(() => expect(result.current.adieu.signedIn).toBe(true));
  });

  it('signUpVerify with a resetPassword drives the password-reset path and signs in immediately', async () => {
    // Existing Muse ID — the real /api/auth/verify route (and this mock,
    // mirroring it) 400s `password_required` for a correct code on an
    // existing user unless the call also carries a reset password. Passing
    // `resetPassword` to signUpVerify is the only way to reach that branch.
    mock.seedMuseUser({
      email: 'reset-me@mu.se',
      password: 'old-password',
      name: 'Reset Me',
      linkedServices: ['moose-hub'],
    });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signUpStart('reset-me@mu.se');
    });

    let verifyResult: Awaited<ReturnType<typeof result.current.museId.signUpVerify>> | undefined;
    await act(async () => {
      verifyResult = await result.current.museId.signUpVerify('000000', 'brand-new-pw');
    });

    expect(verifyResult?.status).toBe('reset');
    await waitFor(() => expect(result.current.museId.signedIn).toBe(true));
    expect(result.current.museId.profile?.email).toBe('reset-me@mu.se');
    expect(result.current.museId.error).toBeNull();

    // Reset also exchanges + adopts the account's linked services.
    await waitFor(() => expect(result.current.museHub.signedIn).toBe(true));
  });

  it('signUpVerify without a resetPassword still 400s password_required for an existing Muse ID', async () => {
    // Documents the branch this omission guards against: an existing user's
    // correct code, submitted WITHOUT resetPassword, must not silently sign
    // the caller in (that would be the password-bypass Task 1.4 closed).
    mock.seedMuseUser({
      email: 'no-reset@mu.se',
      password: 'old-password',
      name: 'No Reset',
    });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signUpStart('no-reset@mu.se');
    });

    await expect(
      act(async () => {
        await result.current.museId.signUpVerify('000000');
      }),
    ).rejects.toThrow(/password_required/);

    expect(result.current.museId.signedIn).toBe(false);
  });

  it('sends credentials:"include" on start/verify/complete — the caller-binding session cookie handoff', async () => {
    // muse-id's /api/auth/complete is authorized via an iron-session cookie
    // set by /api/auth/verify. The mock ignores cookies entirely, so a
    // client-side regression that drops `credentials:'include'` from any of
    // these three calls would break real-service signup while every other
    // test here kept passing. Assert it directly against the fetch spy.
    mock.seedServiceUser('moose-hub', { email: 'cred-check@mu.se', name: 'Cred Check' });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signUpStart('cred-check@mu.se');
    });
    await act(async () => {
      await result.current.museId.signUpVerify('000000');
    });
    await act(async () => {
      await result.current.museId.signUpComplete({
        name: 'Cred Check',
        password: 'hunter2222',
        links: [{ service: 'moose-hub', method: 'email-match' }],
      });
    });

    const calls = mock.fetchMock.mock.calls as [RequestInfo | URL, RequestInit | undefined][];
    const findCall = (pathIncludes: string) =>
      calls.find(([input]) => String(input).includes(pathIncludes));

    for (const path of ['/api/auth/start', '/api/auth/verify', '/api/auth/complete']) {
      const call = findCall(path);
      expect(call, `expected a fetch call to ${path}`).toBeTruthy();
      expect(call?.[1]?.credentials, `${path} must send credentials:'include'`).toBe('include');
    }
  });

  // ---- Task 5.4 fix regression -------------------------------------------
  //
  // Before the fix: rung 3 ("different email — prove by code") registered
  // the link ONLY in muse-id's own LinkedAccount table. The RP's museId
  // join column was never written, so (1) the sandbox never signed the
  // service in locally (museHub.signedIn stayed false, producing the
  // "$0 · 0 plugins" symptom on an otherwise-linked paid account), and (2)
  // any later exchange for that muse token fell through to JIT-provision,
  // silently creating a DUPLICATE account instead of resolving the real,
  // already-linked one.
  it('rung 3: a different-email link signs the service in locally, and a later exchange museId-MATCHES the same real account instead of creating a duplicate', async () => {
    mock.seedMuseUser({ email: 'rung3@mu.se', password: 'password1', name: 'Rung Three' });
    // The REAL, already-populated MuseHub account — note its email does
    // NOT match the muse account's own email, which is the whole point of
    // rung 3.
    mock.seedServiceUser('moose-hub', { email: 'rung3-alt@mu.se', name: 'Real MuseHub Owner', itemCount: 7 });

    const { result } = renderContexts();
    await waitFor(() => expect(result.current.museId.loading).toBe(false));

    await act(async () => {
      await result.current.museId.signIn('rung3@mu.se', 'password1');
    });
    await waitFor(() => expect(result.current.museId.signedIn).toBe(true));
    expect(result.current.museId.linkedServices).toEqual([]);

    await act(async () => {
      await result.current.museId.linkByEmailStart('moose-hub', 'rung3-alt@mu.se');
    });
    let status: 'linked' | 'no_account' | undefined;
    await act(async () => {
      status = await result.current.museId.linkByEmailVerify('moose-hub', 'rung3-alt@mu.se', '000000');
    });
    expect(status).toBe('linked');
    expect(result.current.museId.linkedServices).toContain('moose-hub');

    // Fix B: linkByEmailVerify now exchanges + adopts moose-hub's own
    // tokens on success — the service is actually signed in locally, not
    // just "linked" in muse-id's directory.
    await waitFor(() => expect(result.current.museHub.signedIn).toBe(true));
    expect(result.current.museId.error).toBeNull();

    // Fix A + mock modeling: a SECOND, independent exchange for the same
    // muse access token must museId-MATCH the real, already-linked
    // account — not JIT-provision a fresh $0/0-plugin duplicate. This is
    // the exact regression the review flagged: rung 3 "linking" was a
    // false signal because nothing durable tied the RP account to the
    // muse account, so every subsequent exchange re-orphaned it.
    const museAccessToken = mock.museAccessTokenFor('rung3@mu.se');
    expect(museAccessToken).toBeTruthy();
    const exchangeRes = await fetch(`${MOOSEHUB_BASE}/api/auth/muse-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ muse_access_token: museAccessToken }),
    });
    const exchangeJson = await exchangeRes.json();
    expect(exchangeJson.accountStatus).toBe('linked');
    expect(exchangeJson.user.email).toBe('rung3-alt@mu.se');
    expect(exchangeJson.display).toEqual({
      name: 'Real MuseHub Owner',
      maskedEmail: 'run•••@mu.se',
      summary: '7 plugins',
    });
  });
});
