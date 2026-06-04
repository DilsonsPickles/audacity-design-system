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

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdieu } from '../../contexts/AdieuContext';
import { directLogin, directSignup } from '../../lib/adieu-client';
import './AdieuAuthDialog.css';

export const AdieuAuthDialog: React.FC = () => {
  const { authDialog, openAuthDialog, closeAuthDialog, hydrate, completePendingSignIn } = useAdieu();
  const open = authDialog !== 'closed';
  const mode = authDialog === 'create-account' ? 'create-account' : 'sign-in';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open, mode]);

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
      closeAuthDialog();
      setEmail('');
      setPassword('');
      setDisplayName('');
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
  const title = mode === 'sign-in' ? 'Sign in to audio.com' : 'Create your audio.com account';
  const submitLabel =
    submitting
      ? mode === 'sign-in'
        ? 'Signing in…'
        : 'Creating account…'
      : mode === 'sign-in'
        ? 'Sign in'
        : 'Create account';

  const content = (
    <div
      className="adieu-auth-dialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) closeAuthDialog();
      }}
    >
      <div className="adieu-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="adieu-auth-dialog-title">
        <header className="adieu-auth-dialog__header">
          <h2 id="adieu-auth-dialog-title">{title}</h2>
          <button
            type="button"
            className="adieu-auth-dialog__close"
            onClick={closeAuthDialog}
            disabled={submitting}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <p className="adieu-auth-dialog__subtitle">
          {mode === 'sign-in'
            ? 'Sign in to save and access your audio in the cloud.'
            : 'Create a free account to back up your projects.'}
        </p>

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
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default AdieuAuthDialog;
