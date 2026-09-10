// Muse ID auth dialog — the single sign-on identity layer moose-hub and
// adieu both link into (docs/superpowers/specs/2026-07-13-muse-id-sso-design.md,
// Task 3.2a; auth surface superseded 2026-09-10). Mirrors the wallet
// AuthDialog / AdieuAuthDialog: a portal-mounted modal, plain HTML, BEM-ish
// CSS, opened/closed via context state owned by MuseIdContext
// (authDialog/openAuthDialog/closeAuthDialog).
//
// BROWSER-FIRST (2026-09-10, MuseHub team constraint): login and account
// creation always happen in the user's browser, never in an in-app form —
// shared Muse-family identity, third-party sign-in, passkeys, phishing
// resistance, one signup implementation. So this dialog collects nothing.
// It is a launcher plus a waiting room:
//
//   idle       "Continue in browser" — opens muse-id in a new browser
//              context (popup/tab on the web; the system browser in
//              Electron, via setWindowOpenHandler → shell.openExternal).
//              The mode only picks the landing page: 'sign-in' → /authorize
//              (→ /login, which links to sign-up), 'sign-up' → /signup with
//              a `next` back into /authorize.
//   waiting    The app stays put. We listen for the authorization code to
//              come back: a `postMessage` from the popup's /oauth/callback
//              (web) or `window.electronOAuth.onCallback` (Electron's
//              loopback relay). "Open it again" re-opens the same URL;
//              Cancel clears the PKCE state and returns to idle.
//   completing MuseIdContext.completeBrowserSignIn exchanges the code (PKCE
//              verifier lives in THIS window's sessionStorage), establishes
//              the profile, adopts linked services.
//   done       "You're in as …" → Continue to Audacity.
//
// The PKCE/state plumbing lives in lib/muse-id-client.ts ("Browser-first
// OAuth"); OAuthCallback.tsx is the popup half.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMuseId } from '../../contexts/MuseIdContext';
import {
  beginBrowserAuthorize,
  clearBrowserAuthorizeState,
  electronOAuth,
  MUSE_ID_CALLBACK_MESSAGE_TYPE,
  type MuseIdCallbackPayload,
  type MuseIdCallbackMessage,
} from '../../lib/muse-id-client';
import './MuseIdAuthDialog.css';

type Step = 'idle' | 'waiting' | 'completing' | 'done';

function friendlyError(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  switch (code) {
    case 'oauth_state_mismatch':
    case 'oauth_missing_verifier':
      return 'That sign-in didn’t match this window. Try again.';
    case 'exchange_failed':
      return 'Muse ID couldn’t confirm the sign-in. Try again.';
    case 'access_denied':
      return 'Sign-in was cancelled in the browser.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong.';
  }
}

export const MuseIdAuthDialog: React.FC = () => {
  const museId = useMuseId();
  const { authDialog, openAuthDialog, closeAuthDialog, completeBrowserSignIn } = museId;
  const open = authDialog !== 'closed';
  const mode: 'sign-up' | 'sign-in' = authDialog === 'sign-in' ? 'sign-in' : 'sign-up';

  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  // The URL we opened, so "Open it again" reuses the same PKCE state.
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  const busy = step === 'completing';

  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Reset whenever the dialog opens or the mode switches — mirrors
  // AuthDialog/AdieuAuthDialog's own open/mode reset effect. A mode switch
  // mid-wait abandons the previous PKCE state deliberately.
  useEffect(() => {
    if (!open) return;
    clearBrowserAuthorizeState();
    setStep('idle');
    setError(null);
    setBrowserUrl(null);
    setTimeout(() => firstFocusRef.current?.focus(), 50);
  }, [open, mode]);

  // Escape to dismiss when nothing's in flight.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        closeAuthDialog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, closeAuthDialog]);

  // The authorization code arriving back in this window, from either
  // transport. Only honoured while we're actually waiting for one.
  const handleCallbackPayload = useCallback(
    async (payload: MuseIdCallbackPayload) => {
      if (payload.error) {
        clearBrowserAuthorizeState();
        setError(friendlyError({ code: payload.error }));
        setStep('idle');
        return;
      }
      if (!payload.code || !payload.state) {
        clearBrowserAuthorizeState();
        setError('The browser came back without a sign-in code. Try again.');
        setStep('idle');
        return;
      }
      setStep('completing');
      setError(null);
      try {
        await completeBrowserSignIn(payload.code, payload.state);
        setStep('done');
      } catch (err) {
        setError(friendlyError(err));
        setStep('idle');
      }
    },
    [completeBrowserSignIn],
  );

  useEffect(() => {
    if (!open || step !== 'waiting') return;

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as Partial<MuseIdCallbackMessage> | null;
      if (!data || data.type !== MUSE_ID_CALLBACK_MESSAGE_TYPE) return;
      void handleCallbackPayload(data);
    };
    window.addEventListener('message', onMessage);
    const offElectron = electronOAuth()?.onCallback((payload) => {
      void handleCallbackPayload(payload);
    });
    return () => {
      window.removeEventListener('message', onMessage);
      offElectron?.();
    };
  }, [open, step, handleCallbackPayload]);

  // Focus the step's control on each transition (idle CTA / done CTA).
  useEffect(() => {
    if (!open) return;
    setTimeout(() => firstFocusRef.current?.focus(), 50);
  }, [open, step]);

  if (!open) return null;

  const openBrowser = (url: string) => {
    // Named target so a second click re-uses the same popup instead of
    // stacking tabs. In Electron the window-open handler denies this and
    // hands the URL to the system browser instead (returns null — fine).
    window.open(url, 'muse-id-auth');
  };

  const handleContinue = async () => {
    setError(null);
    const url = await beginBrowserAuthorize(mode);
    setBrowserUrl(url);
    setStep('waiting');
    openBrowser(url);
  };

  const handleOpenAgain = () => {
    if (browserUrl) openBrowser(browserUrl);
  };

  const handleCancelWait = () => {
    clearBrowserAuthorizeState();
    setBrowserUrl(null);
    setStep('idle');
  };

  const header = (() => {
    if (step === 'done') {
      return { title: "You're signed in", subtitle: 'Your Muse ID is connected to MuseHub and audio.com.' };
    }
    if (step === 'waiting' || step === 'completing') {
      return {
        title: 'Check your browser',
        subtitle:
          mode === 'sign-up'
            ? 'Create your Muse ID in the browser window we opened, then come back here.'
            : 'Sign in to Muse ID in the browser window we opened, then come back here.',
      };
    }
    return mode === 'sign-up'
      ? { title: 'Create a Muse ID', subtitle: 'One account for MuseHub and audio.com. Account creation happens in your browser, so your password never enters Audacity.' }
      : { title: 'Sign in to Muse ID', subtitle: 'One account for MuseHub and audio.com. Sign-in happens in your browser, so your password never enters Audacity.' };
  })();

  const content = (
    <div
      className="museid-auth-dialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) closeAuthDialog();
      }}
    >
      <div
        className="museid-auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="museid-auth-dialog-title"
      >
        <header className="museid-auth-dialog__header">
          <h2 id="museid-auth-dialog-title">{header.title}</h2>
          <button
            type="button"
            className="museid-auth-dialog__close"
            onClick={closeAuthDialog}
            disabled={busy}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {header.subtitle && <p className="museid-auth-dialog__subtitle">{header.subtitle}</p>}

        {step === 'idle' && (
          <div className="museid-auth-dialog__form">
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <button
              type="button"
              ref={firstFocusRef}
              className="museid-auth-dialog__cta"
              onClick={() => { void handleContinue(); }}
            >
              Continue in browser
            </button>
            <p className="museid-auth-dialog__switch">
              {mode === 'sign-up' ? (
                <>
                  Already have a Muse ID?{' '}
                  <button type="button" className="museid-auth-dialog__link" onClick={() => openAuthDialog('sign-in')}>
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have a Muse ID?{' '}
                  <button type="button" className="museid-auth-dialog__link" onClick={() => openAuthDialog('sign-up')}>
                    Create one
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        {(step === 'waiting' || step === 'completing') && (
          <div className="museid-auth-dialog__form">
            <p className="museid-auth-dialog__waiting" role="status" aria-live="polite">
              <span className="museid-auth-dialog__spinner museid-auth-dialog__spinner--light" aria-hidden="true" />
              <span>{step === 'completing' ? 'Finishing sign-in…' : 'Waiting for your browser…'}</span>
            </p>
            <p className="museid-auth-dialog__actions">
              <button
                type="button"
                className="museid-auth-dialog__link"
                onClick={handleOpenAgain}
                disabled={busy || !browserUrl}
              >
                Didn't open? Open it again
              </button>
              <button
                type="button"
                className="museid-auth-dialog__link"
                onClick={handleCancelWait}
                disabled={busy}
              >
                Cancel
              </button>
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="museid-auth-dialog__form">
            <p className="museid-auth-dialog__done">You're in as {museId.profile?.name ?? museId.profile?.email ?? 'your Muse ID'}.</p>
            <button type="button" ref={firstFocusRef} className="museid-auth-dialog__cta" onClick={closeAuthDialog}>
              Continue to Audacity
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default MuseIdAuthDialog;
