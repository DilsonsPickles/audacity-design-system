// Sandbox-side MuseHub card for the HomeTab "My accounts" page. Mirrors
// the visual structure of the built-in Audio.com card (avatar, title +
// subtitle, action buttons) so the two services live side-by-side without
// any new component-level CSS — we reuse the home-tab__accounts-* classes
// shipped by @dilsonspickles/components.

import React from 'react';
import { Button, Icon } from '@dilsonspickles/components';
import { useMuseHub } from '../../contexts/MuseHubContext';

export const MuseHubHomeAccountCard: React.FC = () => {
  const { signedIn, user, signIn, signOut } = useMuseHub();

  return (
    <div className="home-tab__accounts-section">
      <h2 className="home-tab__accounts-section-title">MuseHub</h2>
      <div className="home-tab__accounts-card">
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
            <h3 className="home-tab__accounts-title">
              {signedIn ? user.name : 'Not signed in'}
            </h3>
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
              <>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => { void signIn(); }}
                >
                  Sign in
                </Button>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => { void signIn(); }}
                >
                  Create account
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuseHubHomeAccountCard;
