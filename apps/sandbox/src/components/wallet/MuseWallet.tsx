// MuseHub wallet chip + popover for the app chrome. The chip lives in the
// project toolbar; clicking it reveals the wallet card with the brand mark,
// current balance, and a "Top Up" CTA that hands users off to musehub.com
// (we keep all card entry off the desktop).

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMuseHub, useSignedIn, useWalletBalance } from '../../contexts/MuseHubContext';
import './MuseWallet.css';

const POPOVER_WIDTH = 300;
const POPOVER_GAP = 10;
const VIEWPORT_PAD = 12;

export interface MuseWalletProps {
  /** ISO currency code — defaults to USD to match the rest of the marketplace. */
  currency?: 'USD' | 'GBP' | 'EUR';
  /** Where "Top Up" should send the user. Defaults to the real musehub.com host. */
  topUpUrl?: string;
}

export const MuseWallet: React.FC<MuseWalletProps> = ({
  currency = 'USD',
  topUpUrl = 'https://musehub.com/wallet/top-up',
}) => {
  const balance = useWalletBalance();
  const signedIn = useSignedIn();
  const { signIn } = useMuseHub();
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; notchLeft: number } | null>(null);

  // Compute popover position from the chip's bounding rect — rendered through
  // a portal so it can never be clipped by the modal it's hosted inside.
  useLayoutEffect(() => {
    if (!open || !chipRef.current) return;
    const update = () => {
      const rect = chipRef.current!.getBoundingClientRect();
      const top = rect.bottom + POPOVER_GAP;
      // Right-align the popover to the chip, then clamp into the viewport.
      let left = rect.right - POPOVER_WIDTH;
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PAD) {
        left = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PAD;
      }
      // Notch sits over the centre of the chip, relative to the popover's left.
      const chipCentre = rect.left + rect.width / 2;
      const notchLeft = Math.max(16, Math.min(POPOVER_WIDTH - 16, chipCentre - left));
      setPos({ top, left, notchLeft });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (chipRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const popover = open && pos ? (
    <div
      ref={popoverRef}
      className="muse-wallet__popover"
      role="dialog"
      aria-label="Muse wallet"
      style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
    >
      <span
        className="muse-wallet__notch"
        aria-hidden="true"
        style={{ left: pos.notchLeft, right: 'auto' }}
      />

          <header className="muse-wallet__brand">
            <div className="muse-wallet__brandmark" aria-hidden="true">
              <svg width="36" height="20" viewBox="0 0 36 20">
                {/* Eye-like glyph that loosely mirrors the MuseHub mark in the
                    screenshot — a horizontal bar with a centred dot. */}
                <rect x="1" y="9" width="34" height="2" rx="1" fill="#FFFFFF" />
                <circle cx="18" cy="10" r="5.4" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="18" cy="10" r="2.2" fill="#FFFFFF" />
              </svg>
            </div>
            <span className="muse-wallet__wordmark">muse wallet</span>
            <button type="button" className="muse-wallet__help" aria-label="Help">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M6.6 6.8c0-1.4 1.1-2.3 2.4-2.3 1.3 0 2.4.8 2.4 2.1 0 1.2-1 1.7-1.7 2.2-.5.4-.7.8-.7 1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="13.2" r="0.9" fill="currentColor" />
              </svg>
            </button>
          </header>

          <div className="muse-wallet__balance-block">
            <span className="muse-wallet__balance-label">Balance</span>
            <span className="muse-wallet__balance-value">{formatCurrency(balance, currency)}</span>
          </div>

      <a
        className="muse-wallet__topup"
        href={topUpUrl}
        target="_blank"
        rel="noreferrer"
      >
        <span>Top Up</span>
      </a>
    </div>
  ) : null;

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    await signIn();
    setSigningIn(false);
  };

  if (!signedIn) {
    // Signed-out: render a low-key sign-in button instead of the wallet chip.
    return (
      <button
        ref={chipRef}
        type="button"
        className={`muse-wallet__signin ${signingIn ? 'muse-wallet__signin--busy' : ''}`}
        onClick={handleSignIn}
        disabled={signingIn}
      >
        {signingIn ? (
          <>
            <span className="muse-wallet__spinner" aria-hidden="true" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="7" cy="5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1.8 12.5C2.7 9.9 4.7 8.6 7 8.6s4.3 1.3 5.2 3.9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span>Sign in</span>
          </>
        )}
      </button>
    );
  }

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        className={`muse-wallet__chip ${open ? 'muse-wallet__chip--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`MuseHub wallet, balance ${formatCurrency(balance, currency)}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1.5" y="5.6" width="13" height="1.4" fill="currentColor" />
          <circle cx="11.2" cy="9.6" r="1.1" fill="currentColor" />
        </svg>
        <span className="muse-wallet__chip-balance">{formatCurrency(balance, currency)}</span>
      </button>
      {popover && createPortal(popover, document.body)}
    </>
  );
};

function formatCurrency(amount: number, currency: 'USD' | 'GBP' | 'EUR'): string {
  // Whole values render without trailing .00 (matches the screenshot's "£0");
  // anything with cents/pence keeps two decimals.
  const isWhole = Math.abs(amount - Math.round(amount)) < 0.005;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export default MuseWallet;
