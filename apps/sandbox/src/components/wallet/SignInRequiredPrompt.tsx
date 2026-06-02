// Unified purchase modal — same checkout-style overlay whether the user is
// signed in or not. Drives a small state machine: sign in (if needed) →
// confirm → processing → success. Always shows the item, total, and a single
// primary CTA whose label reflects the current step.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MarketplaceEffect } from '../MarketplaceModal';
import { useMuseHub, useSignedIn, useWalletBalance } from '../../contexts/MuseHubContext';
import './SignInRequiredPrompt.css';

type Phase = 'idle' | 'processing' | 'success';

export interface SignInRequiredPromptProps {
  effect: MarketplaceEffect;
  /** User backed out without completing the purchase. */
  onCancel: () => void;
  /** Purchase confirmed: parent should deduct the wallet + mark installed. */
  onPurchase: () => void;
  /** After success, parent may want to add the freshly-bought effect to the
   *  destination stack immediately. */
  onAddAfterPurchase?: () => void;
  /** Friendly name for the destination (e.g. "Vocals"). */
  destinationName?: string;
}

export const SignInRequiredPrompt: React.FC<SignInRequiredPromptProps> = ({
  effect,
  onCancel,
  onPurchase,
  onAddAfterPurchase,
  destinationName,
}) => {
  const signedIn = useSignedIn();
  const balance = useWalletBalance();
  const { openAuthDialog } = useMuseHub();
  const [phase, setPhase] = useState<Phase>('idle');

  const price = effect.price ?? 0;
  const canAfford = balance >= price;
  const balanceAfter = Math.max(0, balance - price);

  const handleSignIn = () => {
    openAuthDialog('sign-in');
  };

  const handleConfirm = () => {
    setPhase('processing');
    setTimeout(() => {
      onPurchase();
      setPhase('success');
    }, 600);
  };

  // Escape dismisses (only when nothing is in flight).
  const blocking = phase === 'processing';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !blocking) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, blocking]);

  const titleText = !signedIn ? 'Sign in to continue' : phase === 'success' ? 'Purchase complete' : 'Confirm purchase';
  const subtitleText = !signedIn
    ? 'You need to be signed in before you can make a purchase.'
    : phase === 'success'
      ? `${effect.name} has been added to your library.`
      : `Charging your MuseHub wallet · Balance ${formatUSD(balance)}.`;

  const content = (
    <div
      className="signin-prompt__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !blocking) onCancel();
      }}
    >
      <div className="signin-prompt" role="dialog" aria-modal="true" aria-label={titleText}>
        <header className="signin-prompt__header">
          <h3>{titleText}</h3>
          {phase !== 'success' && (
            <button
              type="button"
              className="signin-prompt__cancel"
              onClick={onCancel}
              disabled={blocking}
            >
              Cancel
            </button>
          )}
        </header>

        <p className="signin-prompt__subtitle">{subtitleText}</p>

        <div className="signin-prompt__divider" />

        <div className="signin-prompt__item">
          <div className="signin-prompt__art" style={{ background: gradientFor(effect.color) }}>
            <span aria-hidden="true">{initials(effect.vendor)}</span>
          </div>
          <div className="signin-prompt__item-meta">
            <div className="signin-prompt__item-name">{effect.name}</div>
            <div className="signin-prompt__item-vendor">{effect.vendor}</div>
          </div>
          <div className="signin-prompt__item-price">{formatUSD(price)}</div>
        </div>

        <div className="signin-prompt__divider" />

        {signedIn && phase !== 'success' ? (
          <dl className="signin-prompt__summary">
            <div>
              <dt>Balance now</dt>
              <dd>{formatUSD(balance)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatUSD(price)}</dd>
            </div>
            <div className="signin-prompt__summary-divider" />
            <div className="signin-prompt__summary-after">
              <dt>Balance after</dt>
              <dd>{formatUSD(balanceAfter)}</dd>
            </div>
          </dl>
        ) : (
          <div className="signin-prompt__total">
            <span>Total</span>
            <strong>{formatUSD(price)}</strong>
          </div>
        )}

        <div className="signin-prompt__cta-row">
          {!signedIn ? (
            <button
              type="button"
              className="signin-prompt__cta"
              onClick={handleSignIn}
            >
              <span>Sign in or Create Account</span>
            </button>
          ) : phase === 'success' ? (
            <div className="signin-prompt__success-actions">
              {onAddAfterPurchase && destinationName && (
                <button
                  type="button"
                  className="signin-prompt__cta"
                  onClick={onAddAfterPurchase}
                >
                  Add to {destinationName}
                </button>
              )}
              <button
                type="button"
                className="signin-prompt__cta signin-prompt__cta--ghost"
                onClick={onCancel}
              >
                Done
              </button>
            </div>
          ) : !canAfford ? (
            <button type="button" className="signin-prompt__cta" disabled>
              Not enough credit — top up at musehub.com
            </button>
          ) : (
            <button
              type="button"
              className="signin-prompt__cta"
              onClick={handleConfirm}
              disabled={blocking}
            >
              {phase === 'processing' ? (
                <>
                  <span className="signin-prompt__spinner" aria-hidden="true" />
                  <span>Processing…</span>
                </>
              ) : (
                <span>Confirm purchase · {formatUSD(price)}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

function formatUSD(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
}

function gradientFor(color: string) {
  return `linear-gradient(135deg, ${color} 0%, ${shade(color, -30)} 100%)`;
}

function initials(vendor: string): string {
  return vendor.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function shade(hex: string, percent: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0xff) + Math.round((percent / 100) * 255);
  let b = (num & 0xff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default SignInRequiredPrompt;
