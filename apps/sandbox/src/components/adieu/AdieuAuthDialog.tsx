// adieu sign-in / create-account dialog, visually tinted rose-500 so the
// two sign-in surfaces read apart at a glance.
//
// The adieu-native path is browser-first (mirroring MuseIdAuthDialog): the
// CTA opens adieu's hosted /authorize in the system browser (Electron:
// loopback relay; web: popup relayed by /oauth/callback with
// ADIEU_CALLBACK_MESSAGE_TYPE), and the exchange lands tokens in
// localStorage under `adieu-tokens-v1`. The in-app password form this
// replaced lives on in adieu-client's direct-token functions for tests.
// The dialog then calls hydrate() so the surrounding context picks up the
// new user + project list.
//
// Task 5.3: "Continue with Muse ID" primary CTA + divider above this legacy
// form (never a replacement). Mirrors wallet/AuthDialog.tsx's wiring — see
// that file's header and apps/sandbox/src/hooks/useMuseIdEntry.ts for the
// five-state CTA behaviour; this file only swaps the service context
// (AdieuContext) and copy. Like wallet/AuthDialog.tsx, a legacy sign-in no
// longer offers session-proof linking (shared-computer hijack vector) —
// linking is an explicit, ownership-proven action from Accounts.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdieu } from '../../contexts/AdieuContext';
import { useMuseIdEntry } from '../../hooks/useMuseIdEntry';
import {
  beginBrowserAuthorize,
  completeBrowserAuthorize,
  clearBrowserAuthorizeState,
  adieuElectronOAuth,
  ADIEU_CALLBACK_MESSAGE_TYPE,
  type AdieuCallbackMessage,
  type AdieuCallbackPayload,
} from '../../lib/adieu-client';
import './AdieuAuthDialog.css';

export const AdieuAuthDialog: React.FC = () => {
  const { authDialog, openAuthDialog, closeAuthDialog, hydrate, completePendingSignIn, adoptTokens, signOut } =
    useAdieu();
  const open = authDialog !== 'closed';
  const mode = authDialog === 'create-account' ? 'create-account' : 'sign-in';

  const [error, setError] = useState<string | null>(null);
  // Browser-first flow state for the adieu-native path: idle shows the CTA,
  // waiting means the system browser holds the flow, completing means the
  // code came back and the exchange is in flight.
  const [browserStep, setBrowserStep] = useState<'idle' | 'waiting' | 'completing'>('idle');
  const submitting = browserStep !== 'idle';
  // Rung 3 ("different email — prove by code", task 5.4) — see
  // wallet/AuthDialog.tsx's identical state for the rationale.
  const [linkEmail, setLinkEmail] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  // See wallet/AuthDialog.tsx's identical ref for the rationale.
  const museFocusRef = useRef<HTMLElement>(null);
  const focusMuseFirstRef = (el: HTMLElement | null) => {
    museFocusRef.current = el;
  };
  // See wallet/AuthDialog.tsx's identical ref for the rationale (guards
  // the phase-transition focus effect against double-focusing on the
  // initial open, now that idle's CTA is also wired to focusMuseFirstRef).
  const justOpenedRef = useRef(false);

  const entry = useMuseIdEntry({
    service: 'adieu',
    adoptTokens,
    signOut,
    // Product call (14 Sep 2026): a Muse ID with no audio.com account
    // creates one seamlessly instead of stopping at the create-or-connect
    // fork; the settled card's "different email" link is the escape hatch.
    autoCreate: true,
    onDone: () => finishAndClose(),
  });

  const finishAndClose = () => {
    closeAuthDialog();
    setBrowserStep('idle');
    setLinkEmail('');
    setLinkCode('');
    setLinkSubmitting(false);
    entry.reset();
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBrowserStep('idle');
    clearBrowserAuthorizeState();
    setLinkEmail('');
    setLinkCode('');
    setLinkSubmitting(false);
    entry.reset();
    justOpenedRef.current = true;
    setTimeout(() => firstInputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const museBusy = entry.phase.kind === 'exchanging' || linkSubmitting;

  // Focus the new panel's first control on every Muse ID entry-flow state
  // change, including idle (Back/Try again) — see wallet/AuthDialog.tsx's
  // identical effect for the full rationale.
  useEffect(() => {
    if (!open) return;
    if (justOpenedRef.current) {
      justOpenedRef.current = false;
      return;
    }
    setTimeout(() => museFocusRef.current?.focus(), 50);
  }, [open, entry.phase.kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !museBusy) {
        e.preventDefault();
        closeAuthDialog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, museBusy, closeAuthDialog]);

  // The authorization code arriving back in this window, from either
  // transport (web popup postMessage, or Electron's loopback IPC).
  const handleCallbackPayload = React.useCallback(
    async (payload: AdieuCallbackPayload) => {
      if (payload.error) {
        clearBrowserAuthorizeState();
        setError('Sign-in was cancelled in the browser.');
        setBrowserStep('idle');
        return;
      }
      if (!payload.code || !payload.state) {
        clearBrowserAuthorizeState();
        setError('The browser came back without a sign-in code. Try again.');
        setBrowserStep('idle');
        return;
      }
      setBrowserStep('completing');
      setError(null);
      try {
        await completeBrowserAuthorize(payload.code, payload.state);
        await hydrate();
        completePendingSignIn();
        finishAndClose();
      } catch (err) {
        const code = (err as { code?: string }).code ?? '';
        setError(
          code === 'oauth_state_mismatch'
            ? 'That sign-in attempt was stale. Try again.'
            : err instanceof Error ? err.message : 'Something went wrong.',
        );
        setBrowserStep('idle');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrate, completePendingSignIn],
  );

  useEffect(() => {
    if (!open || browserStep !== 'waiting') return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as Partial<AdieuCallbackMessage> | null;
      if (!data || data.type !== ADIEU_CALLBACK_MESSAGE_TYPE) return;
      void handleCallbackPayload(data);
    };
    window.addEventListener('message', onMessage);
    const offElectron = adieuElectronOAuth()?.onCallback((payload) => {
      void handleCallbackPayload(payload);
    });
    return () => {
      window.removeEventListener('message', onMessage);
      offElectron?.();
    };
  }, [open, browserStep, handleCallbackPayload]);

  if (!open) return null;

  // ---- Rung 3: "different email — prove by code" (task 5.4) ---------------

  const handleLinkEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (linkSubmitting) return;
    setLinkSubmitting(true);
    await entry.startLinkByEmail(linkEmail);
    setLinkSubmitting(false);
  };

  const handleLinkCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (linkSubmitting || entry.phase.kind !== 'different-email-code') return;
    setLinkSubmitting(true);
    await entry.verifyLinkByEmail(entry.phase.email, linkCode);
    setLinkSubmitting(false);
  };

  const handleUseAnotherLinkEmail = () => {
    setLinkCode('');
    entry.backToEmailStep();
  };

  const handleBrowserContinue = async () => {
    setError(null);
    const url = await beginBrowserAuthorize(mode === 'create-account' ? 'sign-up' : 'sign-in');
    setBrowserStep('waiting');
    // Named target so a second click re-uses the popup; Electron's
    // window-open handler denies this and hands the URL to the system
    // browser instead (returns null — fine).
    window.open(url, 'adieu-auth');
  };

  // User-facing branding is audio.com — the demo's external positioning.
  // The "adieu" name is reserved for the internal codename / repo.
  const title = entry.phase.kind === 'confirm'
      ? 'Is this you?'
      : entry.phase.kind === 'choose'
        ? 'New to audio.com?'
      : entry.phase.kind === 'settled'
        ? "You're signed in"
        : entry.phase.kind === 'different-email'
          ? 'Add an account by email'
          : entry.phase.kind === 'different-email-code'
            ? 'Check your email'
            : entry.phase.kind === 'different-email-result'
              ? entry.phase.status === 'linked'
                ? "You're connected"
                : 'No account found'
              : entry.phase.kind === 'error'
                ? 'Something went wrong'
                : entry.phase.kind === 'exchanging'
                  ? 'Connecting…'
                  : mode === 'sign-in'
                    ? 'Sign in to audio.com'
                    : 'Create your audio.com account';
  const showLegacyPanel = entry.phase.kind === 'idle';

  const content = (
    <div
      className="adieu-auth-dialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting && !museBusy) closeAuthDialog();
      }}
    >
      <div className="adieu-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="adieu-auth-dialog-title">
        <header className="adieu-auth-dialog__header">
          <h2 id="adieu-auth-dialog-title">{title}</h2>
          <button
            type="button"
            className="adieu-auth-dialog__close"
            onClick={closeAuthDialog}
            disabled={submitting || museBusy}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {entry.phase.kind === 'exchanging' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">
              <span className="adieu-auth-dialog__spinner" aria-hidden="true" /> Connecting to your Muse ID…
            </p>
          </div>
        )}

        {entry.phase.kind === 'confirm' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">
              We found an audio.com account under your Muse ID's email. Is this you?
            </p>
            <div className="adieu-auth-dialog__recognition-card">
              <span className="adieu-auth-dialog__recognition-name">{entry.phase.display.name}</span>
              <span className="adieu-auth-dialog__recognition-email">{entry.phase.display.maskedEmail}</span>
              <span className="adieu-auth-dialog__recognition-summary">{entry.phase.display.summary}</span>
            </div>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="adieu-auth-dialog__cta"
              onClick={() => void entry.confirmClaim()}
            >
              Yes, that's me — continue
            </button>
            <button type="button" className="adieu-auth-dialog__link" onClick={() => void entry.declineClaim()}>
              Not me — use a different account
            </button>
          </div>
        )}

        {entry.phase.kind === 'choose' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">
              No audio.com account is connected to your Muse ID yet. Nothing has been created —
              choose what you'd like to do.
            </p>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="adieu-auth-dialog__cta"
              onClick={() => void entry.chooseCreate()}
            >
              Create a new audio.com account
            </button>
            <button type="button" className="adieu-auth-dialog__link" onClick={entry.chooseDifferentEmail}>
              I already have an audio.com account — connect it
            </button>
          </div>
        )}

        {entry.phase.kind === 'settled' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">
              {entry.phase.wasKnownNew
                ? "We've set up your audio.com account."
                : "You're connected to audio.com via Muse ID."}
            </p>
            {/* No escape hatch here (product call, 14 Sep 2026): the user
                just authenticated with their Muse ID, so this card only
                confirms. Connecting a different-email account remains an
                explicit, ownership-proven action from Accounts. The button
                closes the dialog — it deliberately does NOT open
                audio.com, hence no destination in the label. */}
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="adieu-auth-dialog__cta"
              onClick={finishAndClose}
            >
              Done
            </button>
          </div>
        )}

        {entry.phase.kind === 'different-email' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">
              Have an audio.com account under a different email? Enter it and we'll send a code to prove it's yours.
            </p>
            <form className="adieu-auth-dialog__form" onSubmit={(e) => void handleLinkEmailSubmit(e)} noValidate>
              <label className="adieu-auth-dialog__field">
                <span>Email</span>
                <input
                  ref={focusMuseFirstRef as React.Ref<HTMLInputElement>}
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  autoComplete="email"
                  disabled={linkSubmitting}
                  required
                />
              </label>
              {entry.phase.error && <p className="adieu-auth-dialog__error" role="alert">{entry.phase.error}</p>}
              <button type="submit" className="adieu-auth-dialog__cta" disabled={linkSubmitting}>
                {linkSubmitting && <span className="adieu-auth-dialog__spinner" aria-hidden="true" />}
                <span>{linkSubmitting ? 'Sending code…' : 'Send code'}</span>
              </button>
            </form>
            <button type="button" className="adieu-auth-dialog__link" onClick={entry.reset} disabled={linkSubmitting}>
              Back
            </button>
          </div>
        )}

        {entry.phase.kind === 'different-email-code' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">We've sent a code to {entry.phase.email}.</p>
            <form className="adieu-auth-dialog__form" onSubmit={(e) => void handleLinkCodeSubmit(e)} noValidate>
              <label className="adieu-auth-dialog__field">
                <span>Verification code</span>
                <input
                  ref={focusMuseFirstRef as React.Ref<HTMLInputElement>}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                  disabled={linkSubmitting}
                  required
                  minLength={6}
                  maxLength={6}
                />
                {import.meta.env.DEV && (
                  <span className="adieu-auth-dialog__hint">Dev hint: the mock code is 000000.</span>
                )}
              </label>
              {entry.phase.error && <p className="adieu-auth-dialog__error" role="alert">{entry.phase.error}</p>}
              <button type="submit" className="adieu-auth-dialog__cta" disabled={linkSubmitting}>
                {linkSubmitting && <span className="adieu-auth-dialog__spinner" aria-hidden="true" />}
                <span>{linkSubmitting ? 'Verifying…' : 'Verify'}</span>
              </button>
            </form>
            <button
              type="button"
              className="adieu-auth-dialog__link"
              onClick={handleUseAnotherLinkEmail}
              disabled={linkSubmitting}
            >
              Use a different email
            </button>
          </div>
        )}

        {entry.phase.kind === 'different-email-result' && (
          <div className="adieu-auth-dialog__museid-panel">
            {entry.phase.status === 'linked' ? (
              <>
                <p className="adieu-auth-dialog__subtitle">That audio.com account is now connected to your Muse ID.</p>
                <button
                  ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
                  type="button"
                  className="adieu-auth-dialog__cta"
                  onClick={finishAndClose}
                >
                  Continue to audio.com
                </button>
              </>
            ) : (
              <>
                <p className="adieu-auth-dialog__subtitle">No account found for that email.</p>
                <button
                  ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
                  type="button"
                  className="adieu-auth-dialog__link"
                  onClick={handleUseAnotherLinkEmail}
                >
                  Try another email
                </button>
              </>
            )}
          </div>
        )}

        {entry.phase.kind === 'error' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__error" role="alert">{entry.phase.message}</p>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="adieu-auth-dialog__link"
              onClick={entry.reset}
            >
              Try again
            </button>
          </div>
        )}

        {showLegacyPanel && (
          <>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="adieu-auth-dialog__cta adieu-auth-dialog__cta--museid"
              onClick={() => void entry.continueWithMuseId()}
            >
              Continue with Muse ID
            </button>
            <div className="adieu-auth-dialog__divider" role="separator" aria-orientation="horizontal">
              <span>or</span>
            </div>
          </>
        )}

        {showLegacyPanel && (
        <p className="adieu-auth-dialog__subtitle">
          {mode === 'sign-in'
            ? 'Sign in to save and access your audio in the cloud.'
            : 'Create a free account to back up your projects.'}
        </p>
        )}

        {showLegacyPanel && (
        <div className="adieu-auth-dialog__form">
          {browserStep === 'idle' ? (
            <>
              <button
                type="button"
                className="adieu-auth-dialog__cta"
                onClick={() => void handleBrowserContinue()}
              >
                <span>{mode === 'create-account' ? 'Create an account on audio.com' : 'Continue on audio.com'}</span>
              </button>
              <span className="adieu-auth-dialog__hint">
                Your browser opens to sign in securely; you'll come straight back here.
              </span>
            </>
          ) : (
            <>
              <button type="button" className="adieu-auth-dialog__cta" disabled>
                <span className="adieu-auth-dialog__spinner" aria-hidden="true" />
                <span>{browserStep === 'completing' ? 'Finishing sign-in…' : 'Waiting for your browser…'}</span>
              </button>
              {browserStep === 'waiting' && (
                <button
                  type="button"
                  className="adieu-auth-dialog__link"
                  onClick={() => {
                    clearBrowserAuthorizeState();
                    setBrowserStep('idle');
                  }}
                >
                  Cancel
                </button>
              )}
            </>
          )}

          {error && (
            <p className="adieu-auth-dialog__error" role="alert">
              {error}
            </p>
          )}

          {mode === 'sign-in' ? (
            <p className="adieu-auth-dialog__switch">
              Don't have an account?{' '}
              <button
                type="button"
                className="adieu-auth-dialog__link"
                onClick={() => openAuthDialog('create-account')}
                disabled={submitting}
              >
                Create one
              </button>
            </p>
          ) : (
            <p className="adieu-auth-dialog__switch">
              Already have an account?{' '}
              <button
                type="button"
                className="adieu-auth-dialog__link"
                onClick={() => openAuthDialog('sign-in')}
                disabled={submitting}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default AdieuAuthDialog;
