// Sandbox-side Muse ID card for the HomeTab "My accounts" page (Task 3.2b,
// revised Task 3.2c, restructured Task 3.2d). Shows ONE Muse identity
// (name/email/avatar) with a combined MuseHub + audio.com summary line when
// signed in, or "Create a Muse ID" (primary) + "Sign in" (secondary) when
// signed out. Reuses the home-tab__accounts-* classes shipped by
// @dilsonspickles/components (same pattern MuseHubHomeAccountCard /
// AdieuHomeAccountCard use) so no new component-level CSS is needed here.
//
// Muse ID is the umbrella identity, not a peer of MuseHub/audio.com — this
// card renders full width via the `home-tab__accounts-section--primary`
// modifier (grid-column: 1 / -1). App.tsx renders MuseHubHomeAccountCard and
// AdieuHomeAccountCard beneath it, grouped under a "Connected services"
// subheading with subordinate card styling (`--secondary` modifiers). Both
// service cards stay visible independent of Muse ID sign-in state — legacy
// sign-in is a first-class part of the linking story, not a fallback.
// App.tsx always hides the design system's own built-in audio.com card
// (HomeTab's `hideBuiltInAccountCard` prop) since it renders hardcoded
// placeholder copy instead of real state.

import React from 'react';
import { Button, Icon } from '@dilsonspickles/components';
import { useMuseId } from '../../contexts/MuseIdContext';
import { useMuseHub } from '../../contexts/MuseHubContext';
import { useAdieu } from '../../contexts/AdieuContext';

function formatUSD(amount: number): string {
  const isWhole = Math.abs(amount - Math.round(amount)) < 0.005;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const MuseIdHomeAccountCard: React.FC = () => {
  const museId = useMuseId();
  const museHub = useMuseHub();
  const adieu = useAdieu();

  const linkedSummary = (() => {
    const parts: string[] = [];
    if (museId.linkedServices.includes('moose-hub')) {
      parts.push(`MuseHub ${formatUSD(museHub.balance)} · ${museHub.purchasedEffects.length} plugins`);
    }
    if (museId.linkedServices.includes('adieu')) {
      parts.push(`audio.com ${adieu.cloudProjects.length} projects`);
    }
    return parts.length > 0 ? parts.join('  ·  ') : 'No services linked yet';
  })();

  return (
    <div className="home-tab__accounts-section home-tab__accounts-section--primary">
      <h2 className="home-tab__accounts-section-title">Muse ID</h2>
      <div className="home-tab__accounts-card">
        <div className="home-tab__accounts-avatar">
          {museId.signedIn && museId.profile?.avatarUrl ? (
            <img
              src={museId.profile.avatarUrl}
              alt={museId.profile.name}
              className="home-tab__accounts-avatar-image"
            />
          ) : (
            <Icon name="user" size={48} />
          )}
        </div>
        <div className="home-tab__accounts-content">
          <div className="home-tab__accounts-text">
            <h3 className="home-tab__accounts-title">
              {museId.signedIn && museId.profile ? museId.profile.name : 'Not signed in'}
            </h3>
            <p className="home-tab__accounts-subtitle">
              {museId.signedIn && museId.profile ? linkedSummary : 'MuseHub + audio.com'}
            </p>
          </div>
          <div className="home-tab__accounts-actions">
            {museId.signedIn ? (
              <Button
                variant="secondary"
                size="default"
                onClick={() => { void museId.signOutEverywhere(); }}
              >
                Sign out everywhere
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => museId.openAuthDialog('sign-up')}
                >
                  Create a Muse ID
                </Button>
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => museId.openAuthDialog('sign-in')}
                >
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuseIdHomeAccountCard;
