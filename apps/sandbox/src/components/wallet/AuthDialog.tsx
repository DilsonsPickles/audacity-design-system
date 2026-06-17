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

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMuseHub } from '../../contexts/MuseHubContext';
import {
  directLogin,
  resendSignupCode,
  startSignup,
  verifySignup,
} from '../../lib/musehub-client';
import './AuthDialog.css';

export const AuthDialog: React.FC = () => {
  const { authDialog, openAuthDialog, closeAuthDialog, hydrate } = useMuseHub();
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
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset form whenever the dialog opens or the mode changes.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setResendNotice(null);
    setSubmitting(false);
    setSignupStep('details');
    setVerificationCode('');
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open, mode]);

  // When advancing to the verify step, focus the code input.
  useEffect(() => {
    if (mode !== 'create-account' || signupStep !== 'verify') return;
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [mode, signupStep]);

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
      closeAuthDialog();
      setEmail('');
      setPassword('');
      setDisplayName('');
      setVerificationCode('');
      setSignupStep('details');
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

  const title = mode === 'sign-in'
    ? 'Sign in to MuseHub'
    : signupStep === 'verify'
      ? 'Check your email'
      : 'Create a MuseHub account';
  const submitLabel = (() => {
    if (mode === 'sign-in') return submitting ? 'Signing in…' : 'Sign in';
    if (signupStep === 'verify') return submitting ? 'Verifying…' : 'Verify and sign in';
    return submitting ? 'Sending code…' : 'Continue';
  })();

  const content = (
    <div
      className="auth-dialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) closeAuthDialog();
      }}
    >
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <header className="auth-dialog__header">
          <h2 id="auth-dialog-title">{title}</h2>
          <button
            type="button"
            className="auth-dialog__close"
            onClick={closeAuthDialog}
            disabled={submitting}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <p className="auth-dialog__subtitle">
          {mode === 'sign-in'
            ? 'Sign in to your MuseHub account to buy and manage effects.'
            : signupStep === 'verify'
              ? `We sent a 6-digit code to ${email.trim()}. Enter it here to finish creating your account.`
              : 'Create a free MuseHub account — needed to buy effects from the marketplace.'}
        </p>

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
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default AuthDialog;
