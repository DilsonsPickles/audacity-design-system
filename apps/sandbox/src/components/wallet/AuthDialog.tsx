// MuseHub sign-in / create-account dialog. Opened via
// MuseHubContext.openAuthDialog(); both modes share the same panel and the
// user can toggle between them.
//
// Sign-in is a one-shot POST to /api/auth/direct-token via directLogin —
// tokens land in localStorage and hydrate() picks up the new state.
//
// Create-account is a two-step verify-by-email flow because moose-hub's
// direct-token endpoint refuses mode=signup (verification is required):
//   1. "Details" step — collect name / email / password, call startSignup
//      so the server emails a 6-digit code.
//   2. "Verify" step — collect the code, call verifySignup, which confirms
//      the code, creates the user, and signs them in (writing tokens) in
//      a single helper.
// We keep email + password in component state across the two steps so
// verifySignup can issue the signin POST without re-prompting.
//
// Task 5.3: "Continue with Muse ID" primary CTA + divider above this
// legacy form (never a replacement — the form below is unchanged and keeps
// working exactly as before). The CTA's five-state behaviour lives in the
// shared useMuseIdEntry hook (apps/sandbox/src/hooks/useMuseIdEntry.ts —
// see its file header for how each state is detected); this component only
// wires that hook's `adoptTokens`/`signOut` to MuseHubContext and renders
// its phases. Also implements the post-legacy-sign-in prompt: if a Muse
// session is held and this account isn't linked after a successful legacy
// sign-in, offer to link before closing (see handleSubmit/linkPromptPending
// below) — the session-proof rung of the linking ladder, at its natural
// moment, never forced.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMuseHub } from '../../contexts/MuseHubContext';
import { useMuseId } from '../../contexts/MuseIdContext';
import { useMuseIdEntry } from '../../hooks/useMuseIdEntry';
import {
  directLogin,
  getAccessToken,
  resendSignupCode,
  startSignup,
  verifySignup,
} from '../../lib/musehub-client';
import './AuthDialog.css';

export const AuthDialog: React.FC = () => {
  const { authDialog, openAuthDialog, closeAuthDialog, hydrate, adoptTokens, signOut } = useMuseHub();
  const museId = useMuseId();
  const open = authDialog !== 'closed';
  const mode = authDialog === 'create-account' ? 'create-account' : 'sign-in';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  // Create-account is a two-step flow: collect details → verify the 6-digit
  // code the server emails. We bounce back to 'details' whenever the dialog
  // opens or the mode changes so a half-finished signup doesn't linger.
  const [signupStep, setSignupStep] = useState<'details' | 'verify'>('details');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  // Post-legacy-sign-in prompt: set once a legacy sign-in/verify succeeds
  // while a Muse session is held and this service isn't linked yet.
  const [linkPromptPending, setLinkPromptPending] = useState(false);
  const [linking, setLinking] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  // First focusable control in whichever Muse ID entry-flow panel (CTA
  // confirm/settled/different-email/error, or the link prompt) is
  // currently showing — re-pointed per render like MuseIdAuthDialog's
  // focusFirstRef. The effect below focuses it on every phase transition.
  const museFocusRef = useRef<HTMLElement>(null);
  const focusMuseFirstRef = (el: HTMLElement | null) => {
    museFocusRef.current = el;
  };

  const entry = useMuseIdEntry({
    service: 'moose-hub',
    adoptTokens,
    signOut,
    onDone: () => finishAndClose(),
  });

  const finishAndClose = () => {
    closeAuthDialog();
    setEmail('');
    setPassword('');
    setDisplayName('');
    setVerificationCode('');
    setSignupStep('details');
    setLinkPromptPending(false);
    entry.reset();
  };

  // Reset form whenever the dialog opens or the mode changes.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setResendNotice(null);
    setSubmitting(false);
    setSignupStep('details');
    setVerificationCode('');
    setLinkPromptPending(false);
    entry.reset();
    setTimeout(() => firstInputRef.current?.focus(), 50);
    // entry.reset is stable (useCallback, no deps) — omitted to avoid
    // re-running this effect on every entry-hook re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Focus the new panel's first control on every Muse ID entry-flow state
  // change (exchanging -> confirm/settled/different-email/error, and the
  // post-legacy-sign-in link prompt) — same convention as MuseIdAuthDialog's
  // step-transition focus effect.
  useEffect(() => {
    if (!open) return;
    setTimeout(() => museFocusRef.current?.focus(), 50);
  }, [open, entry.phase.kind, linkPromptPending]);

  // When advancing to the verify step, focus the code input.
  useEffect(() => {
    if (mode !== 'create-account' || signupStep !== 'verify') return;
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [mode, signupStep]);

  // Muse ID exchange in flight — blocks dismissal the same way `submitting`
  // (the legacy form's own in-flight flag) already does.
  const museBusy = entry.phase.kind === 'exchanging';

  // Escape to dismiss when nothing's in flight.
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

  // Maps server error codes to user-facing copy. Codes are documented inline
  // on each route handler (signup/start, signup/verify, direct-token).
  const friendlyError = (err: unknown): string => {
    const code = (err as { code?: string }).code ?? '';
    switch (code) {
      case 'invalid_credentials':   return 'Incorrect email or password.';
      case 'email_taken':           return 'That email is already registered. Try signing in.';
      case 'password_too_short':    return 'Password must be at least 8 characters.';
      case 'invalid_request':       return 'Please fill in every field.';
      case 'email_send_failed':     return "We couldn't send the verification email. Try again in a moment.";
      case 'code_invalid':          return 'That code doesn’t match. Check your email and try again.';
      case 'code_expired':          return 'That code has expired. Send a new one.';
      case 'too_many_attempts':     return 'Too many wrong attempts. Send a new code to try again.';
      case 'resend_rate_limited':   return 'Please wait a moment before requesting another code.';
      default:
        return err instanceof Error ? err.message : 'Something went wrong.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setResendNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await directLogin(email.trim(), password);
      } else if (signupStep === 'details') {
        await startSignup(email.trim(), password, displayName.trim());
        setSubmitting(false);
        setSignupStep('verify');
        return;
      } else {
        await verifySignup(email.trim(), password, verificationCode.trim());
      }
      await hydrate();
      // Post-legacy-sign-in prompt (design spec): a Muse session is held
      // but this account isn't linked yet — offer the session-proof rung
      // before closing, instead of closing silently.
      if (museId.signedIn && !museId.linkedServices.includes('moose-hub')) {
        setLinkPromptPending(true);
        setSubmitting(false);
        return;
      }
      finishAndClose();
    } catch (err) {
      setError(friendlyError(err));
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (submitting) return;
    setError(null);
    setResendNotice(null);
    try {
      await resendSignupCode(email.trim());
      setResendNotice('A new code is on its way.');
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  // ---- Post-legacy-sign-in link prompt -------------------------------------

  const handleLinkNow = async () => {
    setLinking(true);
    try {
      const token = getAccessToken();
      if (token) await museId.linkService('moose-hub', token);
    } catch {
      // Best-effort — the account is already signed in either way; a
      // failed link attempt shouldn't strand the user in this dialog.
    } finally {
      setLinking(false);
      finishAndClose();
    }
  };
  const handleSkipLink = () => finishAndClose();

  const title = linkPromptPending
    ? 'Link to your Muse ID?'
    : entry.phase.kind === 'confirm'
      ? 'Is this you?'
      : entry.phase.kind === 'settled'
        ? "You're in"
        : entry.phase.kind === 'different-email'
          ? 'Use a different email'
          : entry.phase.kind === 'error'
            ? 'Something went wrong'
            : entry.phase.kind === 'exchanging'
              ? 'Connecting…'
              : mode === 'sign-in'
                ? 'Sign in to MuseHub'
                : signupStep === 'verify'
                  ? 'Check your email'
                  : 'Create a MuseHub account';
  const submitLabel = (() => {
    if (mode === 'sign-in') return submitting ? 'Signing in…' : 'Sign in';
    if (signupStep === 'verify') return submitting ? 'Verifying…' : 'Verify and sign in';
    return submitting ? 'Sending code…' : 'Continue';
  })();
  const showLegacyPanel = !linkPromptPending && entry.phase.kind === 'idle';

  const content = (
    <div
      className="auth-dialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting && !museBusy) closeAuthDialog();
      }}
    >
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <header className="auth-dialog__header">
          <h2 id="auth-dialog-title">{title}</h2>
          <button
            type="button"
            className="auth-dialog__close"
            onClick={closeAuthDialog}
            disabled={submitting || museBusy}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {linkPromptPending && (
          <div className="auth-dialog__museid-panel">
            <p className="auth-dialog__subtitle">
              Link this MuseHub account to your Muse ID? You'll be able to use "Continue with Muse ID" here next time.
            </p>
            {error && <p className="auth-dialog__error" role="alert">{error}</p>}
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="auth-dialog__cta"
              onClick={handleLinkNow}
              disabled={linking}
            >
              {linking && <span className="auth-dialog__spinner" aria-hidden="true" />}
              <span>{linking ? 'Linking…' : 'Link to my Muse ID'}</span>
            </button>
            <button type="button" className="auth-dialog__link" onClick={handleSkipLink} disabled={linking}>
              Not now
            </button>
          </div>
        )}

        {!linkPromptPending && entry.phase.kind === 'exchanging' && (
          <div className="auth-dialog__museid-panel">
            <p className="auth-dialog__subtitle">
              <span className="auth-dialog__spinner" aria-hidden="true" /> Connecting to your Muse ID…
            </p>
          </div>
        )}

        {!linkPromptPending && entry.phase.kind === 'confirm' && (
          <div className="auth-dialog__museid-panel">
            <p className="auth-dialog__subtitle">
              We found a MuseHub account under your Muse ID's email. Is this you?
            </p>
            <div className="auth-dialog__recognition-card">
              <span className="auth-dialog__recognition-name">{entry.phase.display.name}</span>
              <span className="auth-dialog__recognition-email">{entry.phase.display.maskedEmail}</span>
              <span className="auth-dialog__recognition-summary">{entry.phase.display.summary}</span>
            </div>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="auth-dialog__cta"
              onClick={() => void entry.confirmClaim()}
            >
              Yes, that's me — continue
            </button>
            <button type="button" className="auth-dialog__link" onClick={() => void entry.declineClaim()}>
              Not me — use a different account
            </button>
          </div>
        )}

        {!linkPromptPending && entry.phase.kind === 'settled' && (
          <div className="auth-dialog__museid-panel">
            <p className="auth-dialog__subtitle">
              {entry.phase.wasKnownNew
                ? "We've set up your MuseHub account."
                : "You're connected to MuseHub via Muse ID."}
            </p>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="auth-dialog__cta"
              onClick={finishAndClose}
            >
              Continue to MuseHub
            </button>
            <button type="button" className="auth-dialog__link" onClick={() => void entry.declineClaim()}>
              Actually, I have an account under a different email
            </button>
          </div>
        )}

        {!linkPromptPending && entry.phase.kind === 'different-email' && (
          <div className="auth-dialog__museid-panel">
            <p className="auth-dialog__subtitle">
              Linking an account under a different email is coming soon. For now, use the form below to sign in or create a new MuseHub account.
            </p>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="auth-dialog__link"
              onClick={entry.reset}
            >
              Back
            </button>
          </div>
        )}

        {!linkPromptPending && entry.phase.kind === 'error' && (
          <div className="auth-dialog__museid-panel">
            <p className="auth-dialog__error" role="alert">{entry.phase.message}</p>
            <button
              ref={focusMuseFirstRef as React.Ref<HTMLButtonElement>}
              type="button"
              className="auth-dialog__link"
              onClick={entry.reset}
            >
              Try again
            </button>
          </div>
        )}

        {showLegacyPanel && (
          <>
            <button
              type="button"
              className="auth-dialog__cta auth-dialog__cta--museid"
              onClick={() => void entry.continueWithMuseId()}
            >
              Continue with Muse ID
            </button>
            <div className="auth-dialog__divider" role="separator" aria-orientation="horizontal">
              <span>or</span>
            </div>
          </>
        )}

        {showLegacyPanel && (
        <p className="auth-dialog__subtitle">
          {mode === 'sign-in'
            ? 'Sign in to your MuseHub account to buy and manage effects.'
            : signupStep === 'verify'
              ? `We sent a 6-digit code to ${email.trim()}. Enter it here to finish creating your account.`
              : 'Create a free MuseHub account — needed to buy effects from the marketplace.'}
        </p>
        )}

        {showLegacyPanel && (
        <form className="auth-dialog__form" onSubmit={handleSubmit} noValidate>
          {mode === 'create-account' && signupStep === 'verify' ? (
            <label className="auth-dialog__field">
              <span>Verification code</span>
              <input
                ref={firstInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                disabled={submitting}
                required
                minLength={6}
                maxLength={6}
              />
              <span className="auth-dialog__hint">
                Check your inbox (and spam folder).
              </span>
            </label>
          ) : (
            <>
              {mode === 'create-account' && (
                <label className="auth-dialog__field">
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

              <label className="auth-dialog__field">
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

              <label className="auth-dialog__field">
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
                <span className="auth-dialog__hint">
                  {mode === 'create-account' ? 'At least 8 characters.' : null}
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="auth-dialog__error" role="alert">
              {error}
            </p>
          )}
          {resendNotice && !error && (
            <p className="auth-dialog__hint" role="status">
              {resendNotice}
            </p>
          )}

          <button type="submit" className="auth-dialog__cta" disabled={submitting}>
            {submitting && <span className="auth-dialog__spinner" aria-hidden="true" />}
            <span>{submitLabel}</span>
          </button>

          {mode === 'create-account' && signupStep === 'verify' && (
            <p className="auth-dialog__switch">
              Didn't get it?{' '}
              <button
                type="button"
                className="auth-dialog__link"
                onClick={handleResendCode}
                disabled={submitting}
              >
                Resend code
              </button>
              {' · '}
              <button
                type="button"
                className="auth-dialog__link"
                onClick={() => {
                  setSignupStep('details');
                  setVerificationCode('');
                  setError(null);
                  setResendNotice(null);
                }}
                disabled={submitting}
              >
                Use a different email
              </button>
            </p>
          )}

          {mode === 'sign-in' && (
            <p className="auth-dialog__switch">
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-dialog__link"
                onClick={() => openAuthDialog('create-account')}
                disabled={submitting}
              >
                Create one
              </button>
            </p>
          )}
          {mode === 'create-account' && signupStep === 'details' && (
            <p className="auth-dialog__switch">
              Already have an account?{' '}
              <button
                type="button"
                className="auth-dialog__link"
                onClick={() => openAuthDialog('sign-in')}
                disabled={submitting}
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'sign-in' && (
            <p className="auth-dialog__forgot">
              <a href="https://musehub.com/forgot-password" target="_blank" rel="noreferrer">
                Forgot password?
              </a>
            </p>
          )}
        </form>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default AuthDialog;
