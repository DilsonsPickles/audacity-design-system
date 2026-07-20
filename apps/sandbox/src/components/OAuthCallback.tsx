import React from 'react';
import { handleCallback } from '../lib/musehub-client';
import {
  isBrowserAuthorizePending,
  completeBrowserAuthorize,
  clearBrowserAuthorizeState,
  clearLocalSession,
  getUserInfo,
  exchangeAndAdoptServices,
  setPendingServiceAdoptFailureNotice,
  MuseIdAuthError,
  type MuseIdTokens,
  type MuseIdUserInfo,
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
  let tokens: MuseIdTokens;
  try {
    tokens = await completeBrowserAuthorize(code, returnedState);
  } catch (err) {
    // Bug 3 (Task 6.4 review): a state mismatch or missing PKCE verifier
    // means this callback can't actually be a valid muse-id browser-first
    // return. The most likely real-world cause is a STALE
    // `muse-id-oauth-pending` marker: the user started a muse-id sign-in,
    // abandoned it (closed the tab, hit Back) before returning here, and
    // this `/oauth/callback` hit is actually moose-hub's own OAuth return
    // sharing the same route. completeBrowserAuthorize has already cleared
    // the marker by this point regardless of outcome, so falling through to
    // moose-hub's own handler — instead of hard-failing with a muse-id
    // error a moose-hub sign-in had nothing to do with — is the robust
    // move. (See musehub-client.ts's startAuthorize for the other half of
    // this fix: it also proactively clears a stale marker before a moose-hub
    // flow even begins.) Any other completeBrowserAuthorize failure (e.g.
    // `exchange_failed`, a real muse-id token-exchange error) is a genuine
    // muse-id failure and must propagate as-is.
    if (
      err instanceof MuseIdAuthError &&
      (err.code === 'oauth_state_mismatch' || err.code === 'oauth_missing_verifier')
    ) {
      await handleCallback();
      return;
    }
    throw err;
  }

  // Establishes the Muse session's profile/linkedServices. Bug 2 (Task 6.4
  // review): muse tokens are already written at this point (by
  // completeBrowserAuthorize above) — if THIS step fails, the session/
  // profile was never established, so roll the just-written tokens back
  // before letting the error propagate (OAuthCallback shows "Sign-in
  // failed"). Without this, hasToken() would report signed-in even though
  // the UI just told the user sign-in failed.
  let info: MuseIdUserInfo;
  try {
    info = await getUserInfo();
  } catch (err) {
    clearLocalSession();
    throw err;
  }

  // Runs the same exchange-and-adopt-both-services flow MuseIdContext uses
  // after an in-app sign-in — see exchangeAndAdoptServices's doc comment
  // for why this is the plain (non-context) counterpart. Bug 1 (Task 6.4
  // review): the Muse sign-in above already succeeded (tokens are valid,
  // the session is established), so a partial/total failure to adopt a
  // LINKED service's own tokens must NOT look like a silent full success —
  // but it also shouldn't roll back or block the Muse sign-in that did
  // work. Queue a non-fatal notice (surfaced by App.tsx after the redirect
  // below) instead; contrast the getUserInfo failure above, which DOES roll
  // back, because that failure means the Muse session itself was never
  // established.
  const failures = await exchangeAndAdoptServices(tokens.accessToken, info.linkedServices);
  if (failures.length > 0) {
    setPendingServiceAdoptFailureNotice(failures);
  }
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
