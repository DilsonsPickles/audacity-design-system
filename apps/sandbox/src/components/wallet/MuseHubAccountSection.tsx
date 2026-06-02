// Sandbox-side content for the Preferences → Accounts page. Surfaces the
// MuseHub account state (signed in / signed out, profile, wallet balance,
// library size) and gives the user the sign-in / create-account / sign-out
// affordances without leaving Preferences.

import React from 'react';
import { useMuseHub } from '../../contexts/MuseHubContext';
import './MuseHubAccountSection.css';

export const MuseHubAccountSection: React.FC = () => {
  const {
    signedIn,
    user,
    balance,
    purchasedEffects,
    openAuthDialog,
    signOut,
  } = useMuseHub();

  return (
    <div className="musehub-account">
      <header className="musehub-account__header">
        <div className="musehub-account__brand">
          <svg width="32" height="18" viewBox="0 0 32 18" aria-hidden="true">
            <rect x="1" y="8" width="30" height="2" rx="1" fill="currentColor" opacity="0.6" />
            <circle cx="16" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.85" />
            <circle cx="16" cy="9" r="2" fill="currentColor" />
          </svg>
          <h3>MuseHub</h3>
        </div>
        <p className="musehub-account__lead">
          Sign in to your MuseHub account to buy plugins from the marketplace
          and sync your library across devices.
        </p>
      </header>

      {signedIn ? (
        <div className="musehub-account__card musehub-account__card--signed-in">
          <div className="musehub-account__identity">
            <span
              className="musehub-account__avatar"
              aria-hidden="true"
              style={{ backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined }}
            >
              {!user.avatarUrl && initials(user.name)}
            </span>
            <div className="musehub-account__identity-meta">
              <div className="musehub-account__name">{user.name}</div>
              <div className="musehub-account__email">{user.email}</div>
            </div>
            <a
              className="musehub-account__manage-link"
              href="https://musehub.com/account"
              target="_blank"
              rel="noreferrer"
            >
              Manage on musehub.com →
            </a>
          </div>

          <dl className="musehub-account__stats">
            <div>
              <dt>Wallet balance</dt>
              <dd>{formatUSD(balance)}</dd>
            </div>
            <div>
              <dt>Plugins in library</dt>
              <dd>{purchasedEffects.length}</dd>
            </div>
          </dl>

          <div className="musehub-account__actions">
            <button
              type="button"
              className="musehub-account__btn musehub-account__btn--ghost"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="musehub-account__card musehub-account__card--signed-out">
          <p className="musehub-account__signed-out-text">
            You're not signed in. Sign in or create a free account to access
            the marketplace.
          </p>
          <div className="musehub-account__actions">
            <button
              type="button"
              className="musehub-account__btn musehub-account__btn--primary"
              onClick={() => openAuthDialog('sign-in')}
            >
              Sign in
            </button>
            <button
              type="button"
              className="musehub-account__btn musehub-account__btn--ghost"
              onClick={() => openAuthDialog('create-account')}
            >
              Create account
            </button>
          </div>
        </div>
      )}

      <p className="musehub-account__footnote">
        MuseHub accounts are managed by Muse Group. Audacity reads the account
        information shown here from your active session — credentials are
        never stored locally.
      </p>
    </div>
  );
};

function formatUSD(amount: number): string {
  const isWhole = Math.abs(amount - Math.round(amount)) < 0.005;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default MuseHubAccountSection;
