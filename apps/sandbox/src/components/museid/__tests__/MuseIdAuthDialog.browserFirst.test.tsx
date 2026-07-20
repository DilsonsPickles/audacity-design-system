// Task 6.4: DAW browser-first Muse ID sign-in — redirect-initiation tests at
// the museIdMock network boundary (see ../../../__tests__/museIdMock.ts).
// Companion to MuseIdAuthDialog.test.tsx (which covers the in-app sign-up/
// sign-in flows this dialog also offers); this file is scoped to the new
// "Continue with Muse ID" browser-first CTA on the sign-in step.
//
// Renders the REAL provider tree exactly like MuseIdAuthDialog.test.tsx so
// the button is wired through the actual context/dialog, but this flow
// itself never calls `fetch` (PKCE generation + `window.location.assign`
// only) — the callback half (code exchange after the browser "returns") is
// covered separately in components/__tests__/OAuthCallback.test.tsx, since
// that's a different component rendered outside the provider tree.
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls, MUSEID_BASE } from '../../../__tests__/museIdMock';

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

function renderDialog() {
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

// Recomputes the S256 PKCE challenge the same way muse-id-client.ts's
// startBrowserAuthorize does, so the test can prove the URL's
// `code_challenge` was actually derived from the verifier it stashed in
// sessionStorage (not just present).
async function expectedChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// jsdom's `window.location.assign` lives on Location.prototype and isn't
// configurable there, so `vi.spyOn(window.location, 'assign')` fails with
// "Cannot redefine property". Redefining the OWN `location` property on
// `window` (supported — jsdom leaves that one configurable) with a plain
// object works instead; everything but `assign` is copied from the real
// location so origin/pathname/etc. stay correct for the redirect_uri the
// dialog builds.
// Captured once and restored in afterEach — a plain-object replacement
// left in place would desync from jsdom's real, `history`-backed Location
// in any later test.
const REAL_LOCATION = window.location;

function mockLocationAssign(): ReturnType<typeof vi.fn> {
  const real = window.location;
  const assign = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { ...real, assign },
    writable: true,
    configurable: true,
  });
  return assign;
}

let mock: MuseIdMockControls;

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

describe('MuseIdAuthDialog — browser-first sign-in (Task 6.4)', () => {
  it('"Continue with Muse ID" builds a correct /authorize redirect and stashes PKCE + state in sessionStorage', async () => {
    const assignSpy = mockLocationAssign();

    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    apiRef.current!.museId.openAuthDialog('sign-in');
    const cta = await screen.findByRole('button', { name: 'Continue with Muse ID' });
    fireEvent.click(cta);

    await waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));

    const url = new URL(assignSpy.mock.calls[0][0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(`${MUSEID_BASE}/authorize`);
    expect(url.searchParams.get('client_id')).toBe('audacity-web-demo');
    expect(url.searchParams.get('redirect_uri')).toBe(`${window.location.origin}/oauth/callback`);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('profile');

    const state = url.searchParams.get('state');
    const challenge = url.searchParams.get('code_challenge');
    expect(state).toBeTruthy();
    expect(challenge).toBeTruthy();

    // sessionStorage carries the verifier + the SAME state, plus the
    // pending marker OAuthCallback.tsx checks to tell this flow apart from
    // moose-hub's own OAuth return.
    const storedVerifier = window.sessionStorage.getItem('muse-id-oauth-verifier');
    expect(storedVerifier).toBeTruthy();
    expect(window.sessionStorage.getItem('muse-id-oauth-state')).toBe(state);
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBe('1');

    // The challenge in the URL is genuinely derived from the stored
    // verifier, not an unrelated random value.
    expect(challenge).toBe(await expectedChallenge(storedVerifier!));

    // No network calls — this step is pure PKCE generation + navigation.
    expect(mock.fetchMock).not.toHaveBeenCalled();
  });

  it('does not offer the browser-first CTA on the sign-up step', async () => {
    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    apiRef.current!.museId.openAuthDialog('sign-up');
    await screen.findByLabelText('Email');
    expect(screen.queryByRole('button', { name: 'Continue with Muse ID' })).not.toBeInTheDocument();
  });
});
