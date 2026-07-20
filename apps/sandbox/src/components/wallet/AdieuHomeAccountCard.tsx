// Sandbox-side audio.com card for the HomeTab "My accounts" page (Task
// 3.2c). Mirrors MuseHubHomeAccountCard's structure (avatar, title +
// subtitle, action buttons) using the home-tab__accounts-* classes shipped
// by @dilsonspickles/components — no new component-level CSS needed.
//
// Replaces HomeTab's built-in Audio.com card, which renders hardcoded
// placeholder copy ("Service name / URL") instead of real state. App.tsx
// hides that built-in card via HomeTab's `hideBuiltInAccountCard` prop and
// renders this one (reading real AdieuContext state) in its place.

import React from 'react';
import { Button, Icon } from '@dilsonspickles/components';
import { useAdieu } from '../../contexts/AdieuContext';
import { ADIEU_BASE } from '../../lib/adieu-client';

export const AdieuHomeAccountCard: React.FC = () => {
  const { signedIn, user, cloudProjects, signIn, signOut } = useAdieu();

  return (
    <div className="home-tab__accounts-section">
      <h2 className="home-tab__accounts-section-title">audio.com</h2>
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
              {signedIn
                ? `${cloudProjects.length} cloud project${cloudProjects.length === 1 ? '' : 's'}`
                : 'audio.com'}
            </p>
          </div>
          <div className="home-tab__accounts-actions">
            {signedIn ? (
              <>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => window.open(`${ADIEU_BASE}/account`, '_blank', 'noopener,noreferrer')}
                >
                  Manage account
                </Button>
                <Button variant="secondary" size="default" onClick={() => { void signOut(); }}>
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

export default AdieuHomeAccountCard;
