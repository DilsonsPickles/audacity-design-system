// Sandbox-side content for the Preferences → Accounts page (Task 3.2b,
// revised Task 3.2c after design review).
//
// One Muse ID card (name/email/avatar + global sign-out, or "Create a Muse
// ID" / "Sign in" when signed out) plus service rows for MuseHub and
// audio.com that are ALWAYS visible — legacy sign-in for each service is a
// first-class part of the story (the session-proof linking rung: an
// existing user signs into the legacy service, then links it to their Muse
// ID), not a debug-only path. Each row is one of three states:
//   1. Signed into the service AND linked to Muse ID -> real data + Unlink.
//   2. Signed into the service, not linked, Muse ID session exists ->
//      "Link" (session-proof rung via MuseIdContext.linkService).
//   3. Not signed into the service -> "Sign in to <service>" opens that
//      service's own legacy dialog. Works with or without a Muse ID
//      session (with none, it's just legacy sign-in; with one, it unlocks
//      state 2 next).
//
// Link/Unlink call MuseIdContext.linkService/unlinkService (Task 3.1).
// linkService is session-proof only (it needs a live legacy access token) —
// see docs/superpowers/specs/2026-07-13-muse-id-sso-design.md's linking
// ladder.
//
// "Create a Muse ID" (not "Continue with Muse ID") is the primary CTA when
// signed out: "Continue with X" implies an existing account, which nobody
// has yet on first visit to this page.

import React from 'react';
import { useMuseId } from '../../contexts/MuseIdContext';
import { useMuseHub } from '../../contexts/MuseHubContext';
import { useAdieu } from '../../contexts/AdieuContext';
import { getAccessToken as getMuseHubAccessToken } from '../../lib/musehub-client';
import { getAccessToken as getAdieuAccessToken } from '../../lib/adieu-client';
import type { ServiceName } from '../../lib/muse-id-client';
import './MuseIdAccountsPage.css';

const SERVICE_LABELS: Record<ServiceName, string> = {
  'moose-hub': 'MuseHub',
  adieu: 'audio.com',
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

export const MuseIdAccountsPage: React.FC = () => {
  const museId = useMuseId();
  const museHub = useMuseHub();
  const adieu = useAdieu();
  const [linkingService, setLinkingService] = React.useState<ServiceName | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const hasLegacySession = (service: ServiceName): boolean =>
    service === 'moose-hub' ? museHub.signedIn : adieu.signedIn;

  const legacyAccessToken = (service: ServiceName): string | null =>
    service === 'moose-hub' ? getMuseHubAccessToken() : getAdieuAccessToken();

  const handleLink = async (service: ServiceName) => {
    const token = legacyAccessToken(service);
    if (!token) return;
    setLinkError(null);
    setLinkingService(service);
    try {
      await museId.linkService(service, token);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : `Failed to link ${SERVICE_LABELS[service]}.`);
    } finally {
      setLinkingService(null);
    }
  };

  const handleUnlink = async (service: ServiceName) => {
    setLinkError(null);
    setLinkingService(service);
    try {
      await museId.unlinkService(service);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : `Failed to unlink ${SERVICE_LABELS[service]}.`);
    } finally {
      setLinkingService(null);
    }
  };

  const openLegacySignIn = (service: ServiceName) => {
    if (service === 'moose-hub') museHub.openAuthDialog('sign-in');
    else adieu.openAuthDialog('sign-in');
  };

  return (
    <div className="museid-accounts">
      <header className="museid-accounts__header">
        <h3>Muse ID</h3>
        <p className="museid-accounts__lead">
          One account for MuseHub and audio.com. Sign in once, then link or
          unlink each service below.
        </p>
      </header>

      {museId.signedIn && museId.profile ? (
        <div className="museid-accounts__card">
          <div className="museid-accounts__identity">
            <span
              className="museid-accounts__avatar"
              aria-hidden="true"
              style={{
                backgroundImage: museId.profile.avatarUrl ? `url(${museId.profile.avatarUrl})` : undefined,
              }}
            >
              {!museId.profile.avatarUrl && initials(museId.profile.name)}
            </span>
            <div className="museid-accounts__identity-meta">
              <div className="museid-accounts__name">{museId.profile.name}</div>
              <div className="museid-accounts__email">{museId.profile.email}</div>
            </div>
            <button
              type="button"
              className="museid-accounts__btn museid-accounts__btn--ghost"
              onClick={() => { void museId.signOutEverywhere(); }}
            >
              Sign out everywhere
            </button>
          </div>
        </div>
      ) : (
        <div className="museid-accounts__card museid-accounts__card--signed-out">
          <p className="museid-accounts__signed-out-text">
            You're not signed in. Create a Muse ID for one identity across
            MuseHub and audio.com.
          </p>
          <div className="museid-accounts__actions">
            <button
              type="button"
              className="museid-accounts__btn museid-accounts__btn--primary"
              onClick={() => museId.openAuthDialog('sign-up')}
            >
              Create a Muse ID
            </button>
            <button
              type="button"
              className="museid-accounts__btn museid-accounts__btn--ghost"
              onClick={() => museId.openAuthDialog('sign-in')}
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/* Service rows — ALWAYS visible, independent of Muse ID sign-in
          state. Legacy sign-in is a first-class rung of the linking ladder
          (see file header), not a debug-only path, so it must never be
          hidden behind the Debug panel toggle. Each row is one of three
          states: linked (data + Unlink), signed-in-not-linked with a Muse
          ID session (Link), or not signed into the service at all (legacy
          sign-in). */}
      <div className="museid-accounts__services">
        <h4 className="museid-accounts__services-title">Services</h4>

        {(['moose-hub', 'adieu'] as ServiceName[]).map((service) => {
          const linked = museId.signedIn && museId.linkedServices.includes(service);
          const legacySignedIn = hasLegacySession(service);
          const busy = linkingService === service;
          return (
            <div key={service} className="museid-accounts__service-row">
              <div className="museid-accounts__service-meta">
                <span className="museid-accounts__service-name">{SERVICE_LABELS[service]}</span>
                {linked ? (
                  <span className="museid-accounts__service-summary">
                    {service === 'moose-hub'
                      ? `${formatUSD(museHub.balance)} · ${museHub.purchasedEffects.length} plugin${museHub.purchasedEffects.length === 1 ? '' : 's'}`
                      : `${adieu.cloudProjects.length} cloud project${adieu.cloudProjects.length === 1 ? '' : 's'}`}
                  </span>
                ) : legacySignedIn && museId.signedIn ? (
                  <span className="museid-accounts__service-summary">
                    Signed in to {SERVICE_LABELS[service]} as{' '}
                    {service === 'moose-hub' ? museHub.user.email : adieu.user.email} — ready to link.
                  </span>
                ) : legacySignedIn ? (
                  <span className="museid-accounts__service-summary">
                    Signed in to {SERVICE_LABELS[service]} as{' '}
                    {service === 'moose-hub' ? museHub.user.email : adieu.user.email}. Create a Muse ID
                    above to link it.
                  </span>
                ) : (
                  <span className="museid-accounts__service-summary">
                    Not signed in to {SERVICE_LABELS[service]}.
                  </span>
                )}
              </div>
              <div className="museid-accounts__service-actions">
                {linked ? (
                  <button
                    type="button"
                    className="museid-accounts__btn museid-accounts__btn--ghost"
                    onClick={() => { void handleUnlink(service); }}
                    disabled={busy}
                  >
                    {busy ? 'Unlinking…' : 'Unlink'}
                  </button>
                ) : legacySignedIn && museId.signedIn ? (
                  <button
                    type="button"
                    className="museid-accounts__btn museid-accounts__btn--primary"
                    onClick={() => { void handleLink(service); }}
                    disabled={busy}
                  >
                    {busy ? 'Linking…' : 'Link'}
                  </button>
                ) : legacySignedIn ? null : (
                  <button
                    type="button"
                    className="museid-accounts__btn museid-accounts__btn--ghost"
                    onClick={() => openLegacySignIn(service)}
                  >
                    Sign in to {SERVICE_LABELS[service]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {linkError && <p className="museid-accounts__error" role="alert">{linkError}</p>}
      </div>
    </div>
  );
};

export default MuseIdAccountsPage;
