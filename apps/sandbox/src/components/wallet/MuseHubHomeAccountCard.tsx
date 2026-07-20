// Sandbox-side MuseHub card for the HomeTab "My accounts" page. Rendered
// beneath the primary Muse ID card, paired with AdieuHomeAccountCard under a
// "Connected services" subheading (App.tsx) — subordinate to Muse ID, not a
// peer of it, so it uses the `--secondary` heading/card modifiers. Mirrors
// the visual structure of the built-in Audio.com card (avatar, title +
// subtitle, action buttons) reusing the home-tab__accounts-* classes shipped
// by @dilsonspickles/components (no new component-level CSS needed).
//
// No "Create account" here (Task 3.2d): creating a standalone MuseHub
// account is exactly what Muse ID SSO replaces — account creation happens
// once, on the Muse ID card above. "Sign in" stays as the entry point for
// existing MuseHub users and the session-proof linking rung (Preferences →
// Accounts' "Link" action needs a live legacy session first).

import React from 'react';
import { Button, Icon } from '@dilsonspickles/components';
import { useMuseHub } from '../../contexts/MuseHubContext';

export const MuseHubHomeAccountCard: React.FC = () => {
  const { signedIn, user, signIn, signOut } = useMuseHub();

  return (
    <div className="home-tab__accounts-section">
      <h3 className="home-tab__accounts-section-title home-tab__accounts-section-title--secondary">MuseHub</h3>
      <div className="home-tab__accounts-card home-tab__accounts-card--secondary">
        <div className="home-tab__accounts-avatar">
          {signedIn && user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="home-tab__accounts-avatar-image"
            />
          ) : (
            <Icon name="user" size={48} />
          )}
        </div>
        <div className="home-tab__accounts-content">
          <div className="home-tab__accounts-text">
            <h4 className="home-tab__accounts-title">
              {signedIn ? user.name : 'Not signed in'}
            </h4>
            <p className="home-tab__accounts-subtitle">
              {signedIn ? user.email : 'musehub.com'}
            </p>
          </div>
          <div className="home-tab__accounts-actions">
            {signedIn ? (
              <>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => window.open(`${(import.meta.env.VITE_MUSEHUB_BASE_URL as string | undefined) ?? 'http://localhost:3000'}/account`, '_blank')}
                >
                  Manage account
                </Button>
                <Button variant="secondary" size="default" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="default"
                onClick={() => { void signIn(); }}
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuseHubHomeAccountCard;
