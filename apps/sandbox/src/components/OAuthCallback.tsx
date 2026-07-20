import React from 'react';
import { handleCallback } from '../lib/musehub-client';
import {
  isBrowserAuthorizePending,
  completeBrowserAuthorize,
  clearBrowserAuthorizeState,
  getUserInfo,
  exchangeAndAdoptServices,
} from '../lib/muse-id-client';

type Status = 'pending' | 'error';

// Rendered outside the providers (see App.tsx) because the rest of the app
// expects a hydrated MuseHubContext/AdieuContext/MuseIdContext, which can't
// run until tokens land. This page handles BOTH OAuth returns that land on
// the sandbox's `/oauth/callback` route:
//   - moose-hub's own OAuth (musehub-client.ts's `handleCallback`, the
//     original/only flow here before Task 6.4) — untouched below.
//   - muse-id's browser-first DAW sign-in (Task 6.4) — code lives in
//     muse-id-client.ts's "Browser-first OAuth" section; see that file's
//     header comment for how the two returns, which share the exact same
//     redirect_uri and query shape, are told apart (a sessionStorage
//     marker set at initiation, checked FIRST below).
async function handleMuseIdCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const error = params.get('error');

  if (error) {
    clearBrowserAuthorizeState();
    throw new Error(`OAuth error: ${error}`);
  }
  if (!code || !returnedState) {
    clearBrowserAuthorizeState();
    throw new Error('Missing code or state in callback URL');
  }

  // Verifies state, exchanges code->muse tokens, writes them. Throws (and
  // has already cleared sessionStorage) on state mismatch or a failed
  // exchange — no partial Muse session is left behind.
  const tokens = await completeBrowserAuthorize(code, returnedState);

  // Establishes the Muse session's profile/linkedServices, then runs the
  // same exchange-and-adopt-both-services flow MuseIdContext uses after an
  // in-app sign-in — see exchangeAndAdoptServices's doc comment for why
  // this is the plain (non-context) counterpart.
  const info = await getUserInfo();
  await exchangeAndAdoptServices(tokens.accessToken, info.linkedServices);
}

export function OAuthCallback() {
  const [status, setStatus] = React.useState<Status>('pending');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isBrowserAuthorizePending()) {
          await handleMuseIdCallback();
        } else {
          await handleCallback();
        }
        if (cancelled) return;
        window.location.replace('/');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1116',
        color: '#f4f5f9',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
      }}
    >
      {status === 'pending' ? (
        <span>Signing you in…</span>
      ) : (
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Sign-in failed
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginBottom: 16,
              wordBreak: 'break-word',
            }}
          >
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => window.location.replace('/')}
            style={{
              background: '#677ce4',
              color: '#f4f5f9',
              border: 0,
              borderRadius: 2,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Back to app
          </button>
        </div>
      )}
    </div>
  );
}

export default OAuthCallback;
