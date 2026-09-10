// Integration tests for the browser-first MuseIdAuthDialog at the
// museIdMock network boundary (see ../../../__tests__/museIdMock.ts).
// Renders the REAL provider tree (MuseHubProvider > AdieuProvider >
// MuseIdProvider, which mounts the dialog itself) and drives the dialog
// through fireEvent, same as a real user would.
//
// The browser half — muse-id's /login, /signup and /authorize pages — is
// never fetched by the app (it opens them in a new browser context), so
// tests assert the URL handed to `window.open`, then simulate the popup's
// /oauth/callback posting the authorization code back with a `message`
// event (the exact envelope OAuthCallback.tsx sends). museIdMock's
// `seedAuthCode` stands in for muse-id having issued that code.
//
// The dialog is portal-mounted to document.body, so queries go through
// `screen`. `afterEach(cleanup)` still tears down portaled nodes.
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../../__tests__/museIdMock';
import { MUSE_ID_CALLBACK_MESSAGE_TYPE, MUSE_ID_STATE_PREFIX } from '../../../lib/muse-id-client';

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

async function openDialog(mode: 'sign-in' | 'sign-up') {
  const { apiRef } = renderDialog();
  await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
  act(() => apiRef.current!.museId.openAuthDialog(mode));
  return apiRef;
}

/** Clicks "Continue in browser" and returns the URL the dialog opened. */
async function continueInBrowser(): Promise<URL> {
  fireEvent.click(await screen.findByRole('button', { name: 'Continue in browser' }));
  await screen.findByText('Waiting for your browser…');
  expect(openSpy).toHaveBeenCalledTimes(1);
  return new URL(openSpy.mock.calls[0][0] as string);
}

/** Simulates the popup's /oauth/callback handing the code back. */
function postCallback(payload: { code?: string; state?: string; error?: string }) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: MUSE_ID_CALLBACK_MESSAGE_TYPE, ...payload },
        origin: window.location.origin,
      }),
    );
  });
}

let mock: MuseIdMockControls;
let openSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  mock = createMuseIdMock();
  vi.stubGlobal('fetch', mock.fetchMock);
  openSpy = vi.fn(() => null);
  vi.stubGlobal('open', openSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('MuseIdAuthDialog (browser-first)', () => {
  it('collects no credentials — one "Continue in browser" CTA in both modes', async () => {
    await openDialog('sign-in');
    expect(screen.getByRole('heading', { name: 'Sign in to Muse ID' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue in browser' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Password')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
    await screen.findByRole('heading', { name: 'Create a Muse ID' });
    expect(screen.getByRole('button', { name: 'Continue in browser' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('sign-in opens muse-id /authorize with PKCE and a mid.-prefixed state, then waits', async () => {
    await openDialog('sign-in');
    const url = await continueInBrowser();

    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe('audacity-web-demo');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('redirect_uri')).toMatch(/\/oauth\/callback$/);
    expect(url.searchParams.get('state')!.startsWith(MUSE_ID_STATE_PREFIX)).toBe(true);
    // PKCE state stashed for the exchange in THIS window
    expect(window.sessionStorage.getItem('muse-id-oauth-state')).toBe(url.searchParams.get('state'));
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBe('1');
    expect(screen.getByRole('heading', { name: 'Check your browser' })).toBeInTheDocument();
  });

  it('sign-up opens muse-id /signup with next= pointing back into /authorize', async () => {
    await openDialog('sign-up');
    const url = await continueInBrowser();

    expect(url.pathname).toBe('/signup');
    const next = url.searchParams.get('next')!;
    expect(next.startsWith('/authorize?')).toBe(true);
    const authorize = new URL(next, url.origin);
    expect(authorize.searchParams.get('client_id')).toBe('audacity-web-demo');
    expect(authorize.searchParams.get('state')).toBe(window.sessionStorage.getItem('muse-id-oauth-state'));
  });

  it('completes sign-in (and linked services) when the popup posts the code back', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'irrelevant',
      name: 'Returning User',
      linkedServices: ['moose-hub'],
    });
    mock.seedServiceUser('moose-hub', { email: 'returning@mu.se', name: 'Returning User' });
    mock.seedAuthCode('good-code', 'returning@mu.se');

    const apiRef = await openDialog('sign-in');
    const url = await continueInBrowser();

    postCallback({ code: 'good-code', state: url.searchParams.get('state')! });

    await screen.findByText(/You're in as Returning User/);
    expect(apiRef.current!.museId.signedIn).toBe(true);
    expect(apiRef.current!.museId.profile?.email).toBe('returning@mu.se');
    expect(apiRef.current!.museHub.signedIn).toBe(true);
    // PKCE state consumed
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Audacity' }));
    await waitFor(() => expect(apiRef.current!.museId.authDialog).toBe('closed'));
  });

  it('a state that does not match this window is rejected and returns to idle', async () => {
    mock.seedMuseUser({ email: 'x@mu.se', password: 'p', name: 'X' });
    mock.seedAuthCode('some-code', 'x@mu.se');
    const apiRef = await openDialog('sign-in');
    await continueInBrowser();

    postCallback({ code: 'some-code', state: `${MUSE_ID_STATE_PREFIX}not-ours` });

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Continue in browser' })).toBeInTheDocument();
    expect(apiRef.current!.museId.signedIn).toBe(false);
  });

  it('an error from the browser (e.g. access_denied) surfaces and returns to idle', async () => {
    await openDialog('sign-in');
    await continueInBrowser();
    postCallback({ error: 'access_denied' });
    expect((await screen.findByRole('alert')).textContent).toMatch(/cancelled in the browser/);
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBeNull();
  });

  it('ignores messages that are not the callback envelope, or come from another origin', async () => {
    await openDialog('sign-in');
    await continueInBrowser();
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'moosehub-auth', code: 'x' }, origin: window.location.origin }));
      window.dispatchEvent(new MessageEvent('message', { data: { type: MUSE_ID_CALLBACK_MESSAGE_TYPE, code: 'x', state: 'y' }, origin: 'https://evil.example' }));
    });
    expect(screen.getByText('Waiting for your browser…')).toBeInTheDocument();
  });

  it('"Open it again" re-opens the same URL; Cancel clears the PKCE state and returns to idle', async () => {
    await openDialog('sign-in');
    const url = await continueInBrowser();

    fireEvent.click(screen.getByRole('button', { name: "Didn't open? Open it again" }));
    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(openSpy.mock.calls[1][0]).toBe(url.toString());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Continue in browser' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('muse-id-oauth-pending')).toBeNull();
    expect(window.sessionStorage.getItem('muse-id-oauth-state')).toBeNull();
  });

  it('closing the dialog rejects ensureSignedIn with the cancelled error', async () => {
    const apiRef = await openDialog('sign-in');
    act(() => apiRef.current!.museId.closeAuthDialog());
    await waitFor(() => expect(apiRef.current!.museId.authDialog).toBe('closed'));
    expect(apiRef.current!.museId.signedIn).toBe(false);
  });
});
