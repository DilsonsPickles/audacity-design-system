// adieu sign-in / create-account dialog. Mirror of MuseHub's AuthDialog —
// same form layout, same first-party password-grant flow — but pointed at
// the adieu backend (a separate service from moose-hub) and visually tinted
// rose-500 so the user can tell the two sign-in surfaces apart at a glance.
//
// Opened via AdieuContext.openAuthDialog(); submit hits adieu's
// /api/auth/direct-token, which writes tokens to localStorage under
// `adieu-tokens-v1` (independent from the `musehub-tokens-v1` key). The
// dialog then calls hydrate() so the surrounding context picks up the new
// user + project list.
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
import { directLogin, directSignup } from '../../lib/adieu-client';
import './AdieuAuthDialog.css';

export const AdieuAuthDialog: React.FC = () => {
  const { authDialog, openAuthDialog, closeAuthDialog, hydrate, completePendingSignIn, adoptTokens, signOut } =
    useAdieu();
  const open = authDialog !== 'closed';
  const mode = authDialog === 'create-account' ? 'create-account' : 'sign-in';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    onDone: () => finishAndClose(),
  });

  const finishAndClose = () => {
    closeAuthDialog();
    setEmail('');
    setPassword('');
    setDisplayName('');
    setLinkEmail('');
    setLinkCode('');
    setLinkSubmitting(false);
    entry.reset();
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await directLogin(email.trim(), password);
      } else {
        await directSignup(email.trim(), password, displayName.trim());
      }
      await hydrate();
      // Resolve any awaiting signIn() promise BEFORE closing the dialog,
      // so closeAuthDialog doesn't see a still-pending resolver and reject it.
      completePendingSignIn();
      // No post-sign-in link offer — see file header (session-linking removal).
      finishAndClose();
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      const message =
        code === 'invalid_credentials' ? 'Incorrect email or password.' :
        code === 'email_taken'         ? 'That email is already registered. Try signing in.' :
        code === 'password_too_short'  ? 'Password must be at least 8 characters.' :
        code === 'invalid_request'     ? 'Please fill in every field.' :
        err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setSubmitting(false);
    }
  };

  // User-facing branding is audio.com — the demo's external positioning.
  // The "adieu" name is reserved for the internal codename / repo.
  const title = entry.phase.kind === 'confirm'
      ? 'Is this you?'
      : entry.phase.kind === 'settled'
        ? "You're in"
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
  const submitLabel =
    submitting
      ? mode === 'sign-in'
        ? 'Signing in…'
        : 'Creating account…'
      : mode === 'sign-in'
        ? 'Sign in'
        : 'Create account';
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

        {entry.phase.kind === 'settled' && (
          <div className="adieu-auth-dialog__museid-panel">
            <p className="adieu-auth-dialog__subtitle">
              {entry.phase.wasKnownNew
                ? "We've set up your audio.com account."
                : "You're connected to audio.com via Muse ID."}
            </p>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="adieu-auth-dialog__cta"
              onClick={finishAndClose}
            >
              Continue to audio.com
            </button>
            <button type="button" className="adieu-auth-dialog__link" onClick={() => void entry.declineClaim()}>
              Actually, I have an account under a different email
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
        <form className="adieu-auth-dialog__form" onSubmit={handleSubmit} noValidate>
          {mode === 'create-account' && (
            <label className="adieu-auth-dialog__field">
              <span>Display name</span>
              <input
                ref={firstInputRef}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
                required
              />
            </label>
          )}

          <label className="adieu-auth-dialog__field">
            <span>Email</span>
            <input
              ref={mode === 'sign-in' ? firstInputRef : undefined}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
              required
            />
          </label>

          <label className="adieu-auth-dialog__field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              disabled={submitting}
              required
              minLength={mode === 'create-account' ? 8 : undefined}
            />
            <span className="adieu-auth-dialog__hint">
              {mode === 'create-account' ? 'At least 8 characters.' : null}
            </span>
          </label>

          {error && (
            <p className="adieu-auth-dialog__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="adieu-auth-dialog__cta" disabled={submitting}>
            {submitting && <span className="adieu-auth-dialog__spinner" aria-hidden="true" />}
            <span>{submitLabel}</span>
          </button>

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
        </form>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default AdieuAuthDialog;
