// Sandbox-side content for the Preferences → Accounts page (Task 3.2b,
// revised Task 3.2c, wording aligned with the HomeTab surface in 3.2d).
//
// One full-width Muse ID card on top (name/email/avatar + global sign-out,
// or "Create a Muse ID" / "Sign in" when signed out) — the umbrella
// identity, not a peer of the services below it — plus a "Connected
// services" group of subordinate rows for MuseHub and audio.com that are
// ALWAYS visible. Legacy sign-in for each service is a first-class part of
// the story (the session-proof linking rung: an existing user signs into
// the legacy service, then links it to their Muse ID), not a debug-only
// path. Each row is one of three states:
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
import type { ServiceName } from '../../lib/muse-id-client';
import { friendlyLinkByEmailError } from '../../hooks/useMuseIdEntry';
import { toast } from '@dilsonspickles/components';
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

// Rung 3 ("different email — prove by code", task 5.4): inline email -> code
// mini-form state for one service row at a time. Lives alongside the
// existing session-proof Link button as a second, always-available path to
// the linking ladder's third rung — the session rung needs a live legacy
// session; this one only needs the Muse session already required to reach
// this page's linked/unlinked rows in the first place.
interface EmailLinkFlowState {
  service: ServiceName;
  step: 'email' | 'code';
  email: string;
  code: string;
  error: string | null;
  submitting: boolean;
}

export const MuseIdAccountsPage: React.FC = () => {
  const museId = useMuseId();
  const museHub = useMuseHub();
  const adieu = useAdieu();
  const [linkingService, setLinkingService] = React.useState<ServiceName | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [emailLinkFlow, setEmailLinkFlow] = React.useState<EmailLinkFlowState | null>(null);

  const hasLegacySession = (service: ServiceName): boolean =>
    service === 'moose-hub' ? museHub.signedIn : adieu.signedIn;

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

  // ---- Rung 3: "different email — prove by code" (task 5.4) ---------------

  const startEmailLinkFlow = (service: ServiceName) => {
    setEmailLinkFlow({ service, step: 'email', email: '', code: '', error: null, submitting: false });
  };
  const cancelEmailLinkFlow = () => setEmailLinkFlow(null);

  const handleEmailLinkEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLinkFlow || emailLinkFlow.submitting) return;
    const { service, email } = emailLinkFlow;
    setEmailLinkFlow({ ...emailLinkFlow, submitting: true, error: null });
    try {
      await museId.linkByEmailStart(service, email.trim());
      setEmailLinkFlow((prev) => (prev ? { ...prev, step: 'code', submitting: false } : prev));
    } catch (err) {
      setEmailLinkFlow((prev) =>
        prev ? { ...prev, submitting: false, error: err instanceof Error ? err.message : 'Something went wrong.' } : prev,
      );
    }
  };

  const handleEmailLinkCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLinkFlow || emailLinkFlow.submitting) return;
    const { service, email, code } = emailLinkFlow;
    setEmailLinkFlow({ ...emailLinkFlow, submitting: true, error: null });
    try {
      const status = await museId.linkByEmailVerify(service, email.trim(), code.trim());
      if (status === 'linked') {
        toast.success('Linked', `${SERVICE_LABELS[service]} is now connected to your Muse ID.`);
        setEmailLinkFlow(null);
      } else {
        // 'no_account' — ownership of the email was proven but there's
        // nothing to link. Neutral copy, no leak beyond what a
        // post-verification result implies (spec's disclosure rule).
        setEmailLinkFlow((prev) => (prev ? { ...prev, submitting: false, error: 'No account found for that email.' } : prev));
      }
    } catch (err) {
      setEmailLinkFlow((prev) =>
        prev ? { ...prev, submitting: false, error: friendlyLinkByEmailError(err) } : prev,
      );
    }
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
        <h4 className="museid-accounts__services-title">Connected services</h4>

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
                ) : museId.signedIn && legacySignedIn ? (
                  <span className="museid-accounts__service-summary">
                    Signed in to {SERVICE_LABELS[service]} as{' '}
                    {service === 'moose-hub' ? museHub.user.email : adieu.user.email} — not linked to
                    your Muse ID.
                  </span>
                ) : museId.signedIn ? (
                  <span className="museid-accounts__service-summary">
                    Not linked. Link it by proving you own the {SERVICE_LABELS[service]} account.
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
                ) : museId.signedIn ? (
                  // Linking is ownership-proven: receive a code at the service
                  // account's email (startEmailLinkFlow). A live service
                  // session is NOT accepted as a linking credential — that was
                  // the shared-computer hijack vector — so this prove-by-code
                  // flow is the ONLY way to link a service to a Muse ID. The
                  // legacy sign-in stays available alongside (an independent
                  // service session is a legitimate, distinct state).
                  <>
                    <button
                      type="button"
                      className="museid-accounts__btn museid-accounts__btn--primary"
                      onClick={() => startEmailLinkFlow(service)}
                    >
                      Link {SERVICE_LABELS[service]}
                    </button>
                    {!legacySignedIn && (
                      <button
                        type="button"
                        className="museid-accounts__btn museid-accounts__btn--ghost"
                        onClick={() => openLegacySignIn(service)}
                      >
                        Sign in to {SERVICE_LABELS[service]}
                      </button>
                    )}
                  </>
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

        {emailLinkFlow && (
          <div className="museid-accounts__email-link">
            <h4 className="museid-accounts__email-link-title">
              Link {SERVICE_LABELS[emailLinkFlow.service]} by email
            </h4>
            {emailLinkFlow.step === 'email' ? (
              <form onSubmit={(e) => void handleEmailLinkEmailSubmit(e)} noValidate>
                <label className="museid-accounts__email-link-field">
                  <span>Email for your {SERVICE_LABELS[emailLinkFlow.service]} account</span>
                  <input
                    type="email"
                    value={emailLinkFlow.email}
                    onChange={(e) => setEmailLinkFlow((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                    autoComplete="email"
                    disabled={emailLinkFlow.submitting}
                    required
                  />
                </label>
                {emailLinkFlow.error && (
                  <p className="museid-accounts__error" role="alert">{emailLinkFlow.error}</p>
                )}
                <div className="museid-accounts__email-link-actions">
                  <button
                    type="submit"
                    className="museid-accounts__btn museid-accounts__btn--primary"
                    disabled={emailLinkFlow.submitting}
                  >
                    {emailLinkFlow.submitting ? 'Sending code…' : 'Send code'}
                  </button>
                  <button
                    type="button"
                    className="museid-accounts__btn museid-accounts__btn--ghost"
                    onClick={cancelEmailLinkFlow}
                    disabled={emailLinkFlow.submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => void handleEmailLinkCodeSubmit(e)} noValidate>
                <p className="museid-accounts__lead">We've sent a code to {emailLinkFlow.email}.</p>
                <label className="museid-accounts__email-link-field">
                  <span>Verification code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={emailLinkFlow.code}
                    onChange={(e) =>
                      setEmailLinkFlow((prev) =>
                        prev ? { ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) } : prev,
                      )
                    }
                    autoComplete="one-time-code"
                    disabled={emailLinkFlow.submitting}
                    required
                    minLength={6}
                    maxLength={6}
                  />
                </label>
                {emailLinkFlow.error && (
                  <p className="museid-accounts__error" role="alert">{emailLinkFlow.error}</p>
                )}
                <div className="museid-accounts__email-link-actions">
                  <button
                    type="submit"
                    className="museid-accounts__btn museid-accounts__btn--primary"
                    disabled={emailLinkFlow.submitting}
                  >
                    {emailLinkFlow.submitting ? 'Verifying…' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="museid-accounts__btn museid-accounts__btn--ghost"
                    onClick={cancelEmailLinkFlow}
                    disabled={emailLinkFlow.submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MuseIdAccountsPage;
