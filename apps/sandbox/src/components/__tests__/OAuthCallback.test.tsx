// Task 6.4: DAW browser-first Muse ID sign-in — callback-handling tests at
// the museIdMock network boundary (see ../../__tests__/museIdMock.ts).
//
// OAuthCallback.tsx is deliberately rendered OUTSIDE every context provider
// (see its own header comment / App.tsx), so these tests render it bare —
// no MuseHubProvider/AdieuProvider/MuseIdProvider — and assert on each
// client module's own `hasToken()` (localStorage-backed) rather than on
// React context state, mirroring how the component itself only ever talks
// to the client modules directly.
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthCallback } from '../OAuthCallback';
import { createMuseIdMock, type MuseIdMockControls } from '../../__tests__/museIdMock';
import { hasToken as museIdHasToken } from '../../lib/muse-id-client';
import { hasToken as museHubHasToken } from '../../lib/musehub-client';
import { hasToken as adieuHasToken } from '../../lib/adieu-client';

afterEach(cleanup);

let mock: MuseIdMockControls;

function setCallbackUrl(search: string) {
  window.history.pushState({}, '', `/oauth/callback${search}`);
}

// jsdom's `window.location.replace` lives on Location.prototype and isn't
// configurable there, so `vi.spyOn(window.location, 'replace')` fails with
// "Cannot redefine property". Redefining the OWN `location` property on
// `window` (jsdom leaves that one configurable) with a plain object works
// instead; everything but `replace` is copied from the real location — call
// this AFTER setCallbackUrl so the copy carries the URL that pushState set.
// The real Location is captured once at module load and restored in
// afterEach below — otherwise the plain-object replacement from one test
// would stick around and desync from later tests' `pushState` calls (which
// only update the REAL, jsdom-internal Location).
const REAL_LOCATION = window.location;

function mockLocationReplace(): ReturnType<typeof vi.fn> {
  const real = window.location;
  const replace = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { ...real, replace },
    writable: true,
    configurable: true,
  });
  return replace;
}

// Simulates startBrowserAuthorize() having already run (the "browser left
// and came back" half we can't drive through an actual navigation in
// jsdom) — stashes the same three sessionStorage entries it would have.
function seedPendingBrowserAuthorize(state: string) {
  window.sessionStorage.setItem('muse-id-oauth-verifier', 'test-verifier');
  window.sessionStorage.setItem('muse-id-oauth-state', state);
  window.sessionStorage.setItem('muse-id-oauth-pending', '1');
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  mock = createMuseIdMock();
  vi.stubGlobal('fetch', mock.fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
  Object.defineProperty(window, 'location', {
    value: REAL_LOCATION,
    writable: true,
    configurable: true,
  });
});

describe('OAuthCallback — muse-id browser-first return (Task 6.4)', () => {
  it('exchanges code -> muse tokens, establishes the Muse session, and adopts both linked services', async () => {
    mock.seedMuseUser({
      email: 'a.dawson@mu.se',
      password: 'irrelevant',
      name: 'Alex',
      linkedServices: ['moose-hub', 'adieu'],
    });
    mock.seedServiceUser('moose-hub', { email: 'a.dawson@mu.se', name: 'Alex' });
    mock.seedServiceUser('adieu', { email: 'a.dawson@mu.se', name: 'Alex' });
    mock.seedAuthCode('good-code', 'a.dawson@mu.se');

    seedPendingBrowserAuthorize('expected-state');
    setCallbackUrl('?code=good-code&state=expected-state');
    const replaceSpy = mockLocationReplace();

    render(<OAuthCallback />);

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/'));

    expect(museIdHasToken()).toBe(true);
    expect(museHubHasToken()).toBe(true);
    expect(adieuHasToken()).toBe(true);

    // Cleared on success too — no stale markers for a future top-level hit.
    expect(window.sessionStorage.getItem('muse-id-oauth-verifier')).toBeNull();
    expect(window.sessionStorage.getItem('muse-id-oauth-state')).toBeNull();
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBeNull();
  });

  it('rejects a state mismatch: no session established, sessionStorage cleared, error shown, no redirect', async () => {
    mock.seedMuseUser({ email: 'a.dawson@mu.se', password: 'irrelevant', name: 'Alex' });
    mock.seedAuthCode('good-code', 'a.dawson@mu.se');

    seedPendingBrowserAuthorize('expected-state');
    setCallbackUrl('?code=good-code&state=WRONG-STATE');
    const replaceSpy = mockLocationReplace();

    render(<OAuthCallback />);

    await screen.findByText('Sign-in failed');
    expect(replaceSpy).not.toHaveBeenCalled();

    expect(museIdHasToken()).toBe(false);
    expect(museHubHasToken()).toBe(false);
    expect(adieuHasToken()).toBe(false);

    expect(window.sessionStorage.getItem('muse-id-oauth-verifier')).toBeNull();
    expect(window.sessionStorage.getItem('muse-id-oauth-state')).toBeNull();
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBeNull();

    // The authorization code must never have been redeemed.
    expect(
      mock.fetchMock.mock.calls.some(([input]) => String(input).includes('/api/oauth/token')),
    ).toBe(false);
  });

  it('falls through to the existing moose-hub handling when no muse-id browser-first flow is pending', async () => {
    // No 'muse-id-oauth-pending' marker set, so isBrowserAuthorizePending()
    // is false — this must route to musehub-client's own handleCallback
    // (its top-level-fallback branch, keyed off ITS OWN sessionStorage
    // namespace, untouched by Task 6.4).
    window.sessionStorage.setItem('musehub-oauth-verifier', 'hub-verifier');
    window.sessionStorage.setItem('musehub-oauth-state', 'hub-state');
    setCallbackUrl('?code=hub-code&state=hub-state');

    // museIdMock doesn't model moose-hub's /api/oauth/token route (only
    // muse-id's) — force it to fail cleanly rather than hit the mock's
    // "unhandled request" throw, so this test asserts routing, not a mock
    // gap.
    mock.failNext('/api/oauth/token');
    const replaceSpy = mockLocationReplace();

    render(<OAuthCallback />);

    await screen.findByText('Sign-in failed');
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(museIdHasToken()).toBe(false);
    // Proves the request actually went out (through musehub-client.ts),
    // i.e. this test exercised real code, not a silent no-op.
    expect(mock.fetchMock).toHaveBeenCalled();
  });
});
