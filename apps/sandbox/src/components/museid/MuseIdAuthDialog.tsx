// Muse ID auth dialog — the single sign-on identity layer moose-hub and
// adieu both link into (docs/superpowers/specs/2026-07-13-muse-id-sso-design.md,
// Task 3.2a). Mirrors the wallet AuthDialog / AdieuAuthDialog: a portal-
// mounted modal, plain HTML fields (no design-system Dialog component —
// neither precedent uses one), BEM-ish CSS, opened/closed via context state
// owned by MuseIdContext (authDialog/openAuthDialog/closeAuthDialog).
//
// Two entry modes:
//   - Sign-up (primary, in-app): email -> code -> found-your-accounts
//     (skipped when nothing to link) -> profile (name + password) -> done.
//     Per the design spec's amended "Auth surface" section, sign-up is
//     in-app because a first-time user has no browser session to leverage.
//   - Sign-in (secondary): in-app email + password, plus "Create one" /
//     "Forgot password?". This dialog signs into Muse ID ITSELF, so it does
//     NOT offer a "Continue with Muse ID" button — that identity-provider
//     control only makes sense on the MuseHub / audio.com service dialogs
//     (wallet/AuthDialog, adieu/AdieuAuthDialog), where using a Muse ID to
//     ENTER a service is the whole point. Offering it here was circular
//     ("use your Muse ID to sign into Muse ID" — a door that needs the key
//     on its far side), so the browser-first redirect path (Task 6.4) was
//     removed from this dialog. (The client-side browser-first helpers in
//     muse-id-client.ts are now unused by the app — kept for now, safe to
//     prune later.)
//
// Forgot-password (sign-in mode only) reuses the same primitive the reset
// path already needed for Task 1.4: signUpVerify(code, resetPassword). It
// turned out cheap (one extra pair of steps sharing the email/code step
// shapes already built for sign-up), so it's implemented rather than
// TODO'd — see the 'forgot-email' / 'forgot-code' branches below.
//
// Session-rung detection (the "different-email" linking rung): a service is
// offered as a linkable card via live session ONLY if discovery (the
// email-match rung) didn't already surface it — avoids showing the same
// service twice when the signed-in legacy email happens to match the new
// Muse ID's email.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMuseId } from '../../contexts/MuseIdContext';
import './MuseIdAuthDialog.css';

// Friendly copy for muse-id's error codes. Codes are documented inline on
// muse-id's route handlers (start/verify/complete/signin) and surfaced here
// as MuseIdAuthError.code (see lib/muse-id-client.ts).
function friendlyError(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  switch (code) {
    case 'code_invalid':
      return 'That code doesn’t match. Check your email and try again.';
    case 'code_expired':
      return 'That code has expired. Request a new one.';
    case 'too_many_attempts':
      return 'Too many wrong attempts. Request a new code to try again.';
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'password_too_short':
      return 'Password must be at least 8 characters.';
    case 'email_taken':
      return 'That email already has a Muse ID. Try signing in instead.';
    case 'password_required':
      return 'That email already has a Muse ID — sign in instead, or use "Forgot password?".';
    case 'invalid_request':
      return 'Please fill in every field.';
    case 'not_verified':
      return 'Please verify your email again.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong.';
  }
}

type SignUpStep = 'email' | 'code' | 'profile' | 'done';
type SignInStep = 'form' | 'forgot-email' | 'forgot-code' | 'done';

export const MuseIdAuthDialog: React.FC = () => {
  const museId = useMuseId();
  const { authDialog, openAuthDialog, closeAuthDialog } = museId;
  const open = authDialog !== 'closed';
  const mode: 'sign-up' | 'sign-in' = authDialog === 'sign-in' ? 'sign-in' : 'sign-up';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [signInStep, setSignInStep] = useState<SignInStep>('form');

  // Set when handleForgotCodeSubmit's verify resolves status:'new' — i.e.
  // the reset target has no Muse ID to reset. Drives the "Create a Muse ID
  // instead" link on the forgot-code step (see handleForgotCodeSubmit).
  const [forgotAccountMissing, setForgotAccountMissing] = useState(false);

  // Shared "first meaningful control" ref — only one step's markup is
  // mounted at a time, so this gets re-pointed (via focusFirstRef below) at
  // whichever step is currently rendered: an input, a checkbox, or a
  // button. Typed HTMLElement (not HTMLInputElement) to cover all three.
  // The [open,mode] effect focuses it for a flow's initial step; the two
  // step-transition effects below (one per step enum) refocus it on every
  // subsequent step. This generalizes AuthDialog's own pattern — a single
  // post-'verify' focus effect (see wallet/AuthDialog.tsx) — to this
  // dialog's larger set of steps across both the sign-up and sign-in/
  // forgot-password step enums.
  const firstFocusRef = useRef<HTMLElement>(null);
  const focusFirstRef = (el: HTMLElement | null) => {
    firstFocusRef.current = el;
  };

  // Reset all local state whenever the dialog opens or the mode switches —
  // mirrors AuthDialog/AdieuAuthDialog's own open/mode reset effect.
  useEffect(() => {
    if (!open) return;
    setEmail('');
    setPassword('');
    setName('');
    setCode('');
    setNewPassword('');
    setError(null);
    setSubmitting(false);
    setSignUpStep('email');
    setSignInStep('form');
    setForgotAccountMissing(false);
    setTimeout(() => firstFocusRef.current?.focus(), 50);
  }, [open, mode]);

  // Escape to dismiss when nothing's in flight.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        e.preventDefault();
        closeAuthDialog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, closeAuthDialog]);

  // Focus the new step's first meaningful control on every sign-up step
  // transition (email -> code -> discovery -> profile -> done). The
  // [open,mode] effect above only covers the flow's initial step ('email').
  useEffect(() => {
    if (!open || mode !== 'sign-up') return;
    setTimeout(() => firstFocusRef.current?.focus(), 50);
  }, [open, mode, signUpStep]);

  // Same as above for the sign-in/forgot-password step enum (form ->
  // forgot-email -> forgot-code -> done, or form -> done directly).
  useEffect(() => {
    if (!open || mode !== 'sign-in') return;
    setTimeout(() => firstFocusRef.current?.focus(), 50);
  }, [open, mode, signInStep]);

  if (!open) return null;

  // ---- Sign-up handlers ---------------------------------------------------

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await museId.signUpStart(email.trim());
      setSignUpStep('code');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await museId.signUpVerify(code.trim());
      if (result.status === 'new') {
        // Signup creates ONLY the Muse ID. No auto-linking of discovered or
        // signed-in service accounts — linking is a separate, explicit,
        // ownership-proven action from the Accounts page (link by email +
        // code). See the removal of the discovery/session-card step below.
        setSignUpStep('profile');
      } else {
        // 'reset' can't happen on this path (no resetPassword was passed),
        // but if it ever does, MuseIdContext has already signed the caller
        // in — just land on 'done' rather than surfacing a confusing step.
        setSignUpStep('done');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setSignUpStep('email');
    setCode('');
    setError(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await museId.signUpComplete({
        name: name.trim(),
        password,
        links: [],
      });
      setSignUpStep('done');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Sign-in handlers -----------------------------------------------------

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await museId.signIn(email.trim(), password);
      setSignInStep('done');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await museId.signUpStart(email.trim());
      setSignInStep('forgot-code');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setForgotAccountMissing(false);
    setSubmitting(true);
    try {
      const result = await museId.signUpVerify(code.trim(), newPassword);
      if (result.status === 'reset') {
        setSignInStep('done');
      } else {
        // status === 'new': signUpVerify only signs the caller in on
        // 'reset' (MuseIdContext.signUpVerify) — this email has no Muse ID
        // to reset a password for. Previously this branch was unhandled
        // and execution fell through to the unconditional "done" screen,
        // falsely claiming success while museId.signedIn stayed false.
        // The code step is already past the anti-enumeration boundary
        // (mirrors handleCodeSubmit's equivalent 'new' branch above), so
        // it's fine to say so plainly rather than pretend the reset
        // worked — offer sign-up instead of a dead-end retry.
        setForgotAccountMissing(true);
        setError('There’s no Muse ID for that email yet.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Header copy ---------------------------------------------------------

  const header = (() => {
    if (mode === 'sign-in') {
      if (signInStep === 'forgot-email') {
        return { title: 'Reset your password', subtitle: "Enter your Muse ID email and we'll send a reset code." };
      }
      if (signInStep === 'forgot-code') {
        return {
          title: 'Check your email',
          subtitle: `We've sent a code to ${email.trim()}. Enter it with a new password to finish resetting.`,
        };
      }
      if (signInStep === 'done') {
        return { title: "You're signed in", subtitle: 'Your Muse ID is connected to MuseHub and audio.com.' };
      }
      return { title: 'Sign in to Muse ID', subtitle: 'One account for MuseHub and audio.com.' };
    }
    switch (signUpStep) {
      case 'email':
        return { title: 'Create a Muse ID', subtitle: 'One account for MuseHub and audio.com.' };
      case 'code':
        return {
          title: 'Check your email',
          // Anti-enumeration: identical copy whether or not an account
          // exists for this address — matches /api/auth/start's response.
          subtitle: `We've sent a code to ${email.trim()}.`,
        };
      case 'profile':
        return { title: 'Finish creating your Muse ID', subtitle: 'Choose a display name and password.' };
      case 'done':
        return { title: "You're all set", subtitle: 'Connect MuseHub and audio.com any time from Accounts.' };
      default:
        return { title: 'Create a Muse ID', subtitle: '' };
    }
  })();

  const content = (
    <div
      className="museid-auth-dialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) closeAuthDialog();
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
            disabled={submitting}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {header.subtitle && <p className="museid-auth-dialog__subtitle">{header.subtitle}</p>}

        {mode === 'sign-up' && signUpStep === 'email' && (
          <form className="museid-auth-dialog__form" onSubmit={handleEmailSubmit} noValidate>
            <label className="museid-auth-dialog__field">
              <span>Email</span>
              <input
                ref={focusFirstRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
                required
              />
            </label>
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <button type="submit" className="museid-auth-dialog__cta" disabled={submitting}>
              {submitting && <span className="museid-auth-dialog__spinner" aria-hidden="true" />}
              <span>{submitting ? 'Sending code…' : 'Continue'}</span>
            </button>
            <p className="museid-auth-dialog__switch">
              Already have a Muse ID?{' '}
              <button
                type="button"
                className="museid-auth-dialog__link"
                onClick={() => openAuthDialog('sign-in')}
                disabled={submitting}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'sign-up' && signUpStep === 'code' && (
          <form className="museid-auth-dialog__form" onSubmit={handleCodeSubmit} noValidate>
            <label className="museid-auth-dialog__field">
              <span>Verification code</span>
              <input
                ref={focusFirstRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                disabled={submitting}
                required
                minLength={6}
                maxLength={6}
              />
              {import.meta.env.DEV && (
                <span className="museid-auth-dialog__hint">Dev hint: the mock code is 000000.</span>
              )}
            </label>
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <button type="submit" className="museid-auth-dialog__cta" disabled={submitting}>
              {submitting && <span className="museid-auth-dialog__spinner" aria-hidden="true" />}
              <span>{submitting ? 'Verifying…' : 'Verify'}</span>
            </button>
            <p className="museid-auth-dialog__switch">
              <button
                type="button"
                className="museid-auth-dialog__link"
                onClick={handleUseDifferentEmail}
                disabled={submitting}
              >
                Use a different email
              </button>
            </p>
          </form>
        )}

        {mode === 'sign-up' && signUpStep === 'profile' && (
          <form className="museid-auth-dialog__form" onSubmit={handleProfileSubmit} noValidate>
            <label className="museid-auth-dialog__field">
              <span>Display name</span>
              <input
                ref={focusFirstRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
                required
              />
            </label>
            <label className="museid-auth-dialog__field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                required
                minLength={8}
              />
              <span className="museid-auth-dialog__hint">At least 8 characters.</span>
            </label>
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <button type="submit" className="museid-auth-dialog__cta" disabled={submitting}>
              {submitting && <span className="museid-auth-dialog__spinner" aria-hidden="true" />}
              <span>{submitting ? 'Creating your Muse ID…' : 'Create Muse ID'}</span>
            </button>
          </form>
        )}

        {mode === 'sign-up' && signUpStep === 'done' && (
          <div className="museid-auth-dialog__form">
            <p className="museid-auth-dialog__done">You're in as {museId.profile?.name ?? name}.</p>
            <button type="button" ref={focusFirstRef} className="museid-auth-dialog__cta" onClick={closeAuthDialog}>
              Continue to Audacity
            </button>
          </div>
        )}

        {mode === 'sign-in' && signInStep === 'form' && (
          <div className="museid-auth-dialog__form">
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <form className="museid-auth-dialog__form" onSubmit={handleSignInSubmit} noValidate>
              <label className="museid-auth-dialog__field">
                <span>Email</span>
                <input
                  ref={focusFirstRef as React.Ref<HTMLInputElement>}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
              </label>
              <label className="museid-auth-dialog__field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={submitting}
                  required
                />
              </label>
              <button type="submit" className="museid-auth-dialog__cta" disabled={submitting}>
                {submitting && <span className="museid-auth-dialog__spinner" aria-hidden="true" />}
                <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
              </button>
              <p className="museid-auth-dialog__switch">
                Don't have a Muse ID?{' '}
                <button
                  type="button"
                  className="museid-auth-dialog__link"
                  onClick={() => openAuthDialog('sign-up')}
                  disabled={submitting}
                >
                  Create one
                </button>
              </p>
              <p className="museid-auth-dialog__forgot">
                <button
                  type="button"
                  className="museid-auth-dialog__link"
                  onClick={() => {
                    setSignInStep('forgot-email');
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Forgot password?
                </button>
              </p>
            </form>
          </div>
        )}

        {mode === 'sign-in' && signInStep === 'forgot-email' && (
          <form className="museid-auth-dialog__form" onSubmit={handleForgotEmailSubmit} noValidate>
            <label className="museid-auth-dialog__field">
              <span>Email</span>
              <input
                ref={focusFirstRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
                required
              />
            </label>
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <button type="submit" className="museid-auth-dialog__cta" disabled={submitting}>
              {submitting && <span className="museid-auth-dialog__spinner" aria-hidden="true" />}
              <span>{submitting ? 'Sending code…' : 'Send reset code'}</span>
            </button>
            <p className="museid-auth-dialog__switch">
              <button
                type="button"
                className="museid-auth-dialog__link"
                onClick={() => {
                  setSignInStep('form');
                  setError(null);
                }}
                disabled={submitting}
              >
                Back to sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'sign-in' && signInStep === 'forgot-code' && (
          <form className="museid-auth-dialog__form" onSubmit={handleForgotCodeSubmit} noValidate>
            <label className="museid-auth-dialog__field">
              <span>Verification code</span>
              <input
                ref={focusFirstRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                disabled={submitting}
                required
                minLength={6}
                maxLength={6}
              />
              {import.meta.env.DEV && (
                <span className="museid-auth-dialog__hint">Dev hint: the mock code is 000000.</span>
              )}
            </label>
            <label className="museid-auth-dialog__field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                required
                minLength={8}
              />
              <span className="museid-auth-dialog__hint">At least 8 characters.</span>
            </label>
            {error && <p className="museid-auth-dialog__error" role="alert">{error}</p>}
            <button type="submit" className="museid-auth-dialog__cta" disabled={submitting}>
              {submitting && <span className="museid-auth-dialog__spinner" aria-hidden="true" />}
              <span>{submitting ? 'Resetting…' : 'Reset password and sign in'}</span>
            </button>
            {forgotAccountMissing && (
              <p className="museid-auth-dialog__switch">
                <button
                  type="button"
                  className="museid-auth-dialog__link"
                  onClick={() => openAuthDialog('sign-up')}
                  disabled={submitting}
                >
                  Create a Muse ID instead
                </button>
              </p>
            )}
          </form>
        )}

        {mode === 'sign-in' && signInStep === 'done' && (
          <div className="museid-auth-dialog__form">
            <p className="museid-auth-dialog__done">You're in as {museId.profile?.name ?? email}.</p>
            <button type="button" ref={focusFirstRef} className="museid-auth-dialog__cta" onClick={closeAuthDialog}>
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
