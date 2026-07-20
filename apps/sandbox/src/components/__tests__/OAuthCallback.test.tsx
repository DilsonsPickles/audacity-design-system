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
import { toast } from '@dilsonspickles/components';
import { OAuthCallback } from '../OAuthCallback';
import {
  createMuseIdMock,
  type MuseIdMockControls,
  MUSEID_BASE,
  MOOSEHUB_BASE,
} from '../../__tests__/museIdMock';
import {
  hasToken as museIdHasToken,
  notifyPendingServiceAdoptFailure,
} from '../../lib/muse-id-client';
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

// Task 6.4 adversarial review follow-up: three failure paths the original
// tests above didn't exercise (see .superpowers/sdd/task-6.4-fix-report.md
// for the full writeup of each bug and its fix).
describe('OAuthCallback — Task 6.4 review fixes', () => {
  it('Bug 1: a service-exchange failure still completes Muse sign-in but queues a non-fatal notice (not a silent full success)', async () => {
    mock.seedMuseUser({
      email: 'a.dawson@mu.se',
      password: 'irrelevant',
      name: 'Alex',
      linkedServices: ['moose-hub', 'adieu'],
    });
    mock.seedServiceUser('moose-hub', { email: 'a.dawson@mu.se', name: 'Alex' });
    mock.seedServiceUser('adieu', { email: 'a.dawson@mu.se', name: 'Alex' });
    mock.seedAuthCode('good-code', 'a.dawson@mu.se');
    // Only moose-hub's exchange fails — adieu's must still succeed
    // independently (exchangeAndAdoptServices runs each service on its own).
    mock.failNext(`${MOOSEHUB_BASE}/api/auth/muse-exchange`);

    seedPendingBrowserAuthorize('expected-state');
    setCallbackUrl('?code=good-code&state=expected-state');
    const replaceSpy = mockLocationReplace();

    render(<OAuthCallback />);

    // Muse sign-in itself succeeded (tokens valid, session established)
    // despite the partial service-adopt failure — it still redirects as a
    // completed sign-in, not an error screen.
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/'));
    expect(museIdHasToken()).toBe(true);
    expect(adieuHasToken()).toBe(true);
    // The service whose exchange failed must NOT silently look signed-in.
    expect(museHubHasToken()).toBe(false);

    // Not a silent success: a notice was queued (sessionStorage-backed, to
    // survive the window.location.replace('/') reload) for App.tsx to
    // surface via toast.warning on mount.
    const warnSpy = vi.spyOn(toast, 'warning').mockImplementation(() => 'toast-id');
    notifyPendingServiceAdoptFailure();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[1]).toContain('MuseHub');
    expect(warnSpy.mock.calls[0]?.[1]).not.toContain('audio.com');

    // One-shot: the notice is consumed, so a second call surfaces nothing.
    warnSpy.mockClear();
    notifyPendingServiceAdoptFailure();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("Bug 2: a getUserInfo failure after tokens are written rolls the muse tokens back (distinct from Bug 1's notify-only)", async () => {
    mock.seedMuseUser({ email: 'a.dawson@mu.se', password: 'irrelevant', name: 'Alex' });
    mock.seedAuthCode('good-code', 'a.dawson@mu.se');
    // completeBrowserAuthorize (code -> muse tokens) succeeds and writes
    // tokens; the NEXT step, establishing the session/profile, fails.
    mock.failNext(`${MUSEID_BASE}/api/oauth/userinfo`);

    seedPendingBrowserAuthorize('expected-state');
    setCallbackUrl('?code=good-code&state=expected-state');
    const replaceSpy = mockLocationReplace();

    render(<OAuthCallback />);

    await screen.findByText('Sign-in failed');
    expect(replaceSpy).not.toHaveBeenCalled();

    // "Sign-in failed" must mean actually-not-signed-in: the tokens
    // completeBrowserAuthorize already wrote are rolled back because the
    // session was never established (contrast Bug 1, where the Muse
    // session DID get established and tokens are correctly kept).
    expect(museIdHasToken()).toBe(false);
  });

  it('Bug 3: a stale muse-id pending marker does not misroute a legitimate moose-hub callback into a spurious muse-id failure', async () => {
    // Simulates an ABANDONED earlier muse-id browser-first attempt: the
    // pending marker plus a state that belongs to that abandoned attempt
    // (not to the callback that's about to arrive) are still sitting in
    // sessionStorage — e.g. the user closed the muse-id tab or hit Back.
    seedPendingBrowserAuthorize('stale-muse-id-state');

    // A legitimate, independent moose-hub OAuth return lands on the same
    // shared /oauth/callback route.
    window.sessionStorage.setItem('musehub-oauth-verifier', 'hub-verifier');
    window.sessionStorage.setItem('musehub-oauth-state', 'hub-state');
    setCallbackUrl('?code=hub-code&state=hub-state');

    // museIdMock doesn't model moose-hub's own /api/oauth/token route —
    // force a clean failure there (mirrors the existing "falls through...
    // when no muse-id flow is pending" test above) so this test asserts
    // ROUTING, not a mock gap.
    mock.failNext(`${MOOSEHUB_BASE}/api/oauth/token`);
    const replaceSpy = mockLocationReplace();

    render(<OAuthCallback />);

    await screen.findByText('Sign-in failed');
    expect(replaceSpy).not.toHaveBeenCalled();

    // The failure must be moose-hub's own (a 500 from its token endpoint),
    // NOT muse-id's "OAuth state mismatch" — proving the callback fell
    // through to musehub-client's handleCallback rather than hard-failing
    // inside the muse-id handler.
    expect(screen.getByText(/Token exchange failed/)).toBeTruthy();
    expect(screen.queryByText(/state mismatch/i)).toBeNull();

    // Proves the request actually reached moose-hub's own token endpoint...
    expect(
      mock.fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith(`${MOOSEHUB_BASE}/api/oauth/token`),
      ),
    ).toBe(true);
    // ...and never redeemed the code against muse-id's.
    expect(
      mock.fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith(`${MUSEID_BASE}/api/oauth/token`),
      ),
    ).toBe(false);

    // The stale marker is gone either way (completeBrowserAuthorize clears
    // it unconditionally before the mismatch is even detected).
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBeNull();
    expect(museIdHasToken()).toBe(false);
    expect(museHubHasToken()).toBe(false);
  });
});
