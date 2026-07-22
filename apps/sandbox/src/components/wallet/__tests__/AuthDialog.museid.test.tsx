// Integration tests for AuthDialog's "Continue with Muse ID" CTA (task 5.3)
// at the museIdMock network boundary (see ../../../__tests__/museIdMock.ts).
// Renders the REAL provider tree (MuseHubProvider > AdieuProvider >
// MuseIdProvider, which now mounts AuthDialog itself — see
// MuseIdContext.tsx/MuseHubContext.tsx's file-header notes on why) and
// drives it through fireEvent, same pattern as MuseIdAuthDialog.test.tsx /
// MuseIdContext.test.tsx.
//
// Covers the design spec's five-state table (docs/superpowers/specs/
// 2026-07-13-muse-id-sso-design.md) for the MuseHub dialog specifically —
// AdieuAuthDialog.museid.smoke.test.tsx smoke-tests that the same CTA is
// wired there, since the state machine itself is the shared
// useMuseIdEntry hook, not per-dialog logic.
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../../__tests__/museIdMock';

afterEach(cleanup);

type Api = {
  museId: ReturnType<typeof useMuseId>;
  museHub: ReturnType<typeof useMuseHub>;
  adieu: ReturnType<typeof useAdieu>;
};

function Harness({ apiRef }: { apiRef: React.MutableRefObject<Api | null> }) {
  const museId = useMuseId();
  const museHub = useMuseHub();
  const adieu = useAdieu();
  apiRef.current = { museId, museHub, adieu };
  return null;
}

function renderTree() {
  const apiRef: React.MutableRefObject<Api | null> = { current: null };
  const utils = render(
    <MuseHubProvider>
      <AdieuProvider>
        <MuseIdProvider>
          <Harness apiRef={apiRef} />
        </MuseIdProvider>
      </AdieuProvider>
    </MuseHubProvider>,
  );
  return { ...utils, apiRef };
}

let mock: MuseIdMockControls;

beforeEach(() => {
  window.localStorage.clear();
  mock = createMuseIdMock();
  vi.stubGlobal('fetch', mock.fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('AuthDialog — Continue with Muse ID', () => {
  it('state 1: Muse session + already linked -> exchanges and signs in with NO prompts, NO typing', async () => {
    mock.seedMuseUser({ email: 'a@mu.se', password: 'password1', name: 'Ada', linkedServices: ['moose-hub'] });
    mock.seedServiceUser('moose-hub', { email: 'a@mu.se', name: 'Ada' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    // Establish a Muse session (already linked -> signIn's own exchange
    // adopts MuseHub tokens immediately); then drop the local MuseHub
    // session to simulate "MuseHub's own token expired/was cleared while
    // muse-id still considers it linked" — the scenario state 1 exists for.
    await act(async () => {
      await apiRef.current!.museId.signIn('a@mu.se', 'password1');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    await act(async () => {
      await apiRef.current!.museHub.signOut();
    });
    expect(apiRef.current!.museHub.signedIn).toBe(false);
    expect(apiRef.current!.museId.linkedServices).toContain('moose-hub');

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    const cta = await screen.findByRole('button', { name: 'Continue with Muse ID' });

    // No typing anywhere — click is the only interaction.
    fireEvent.click(cta);

    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    // Dialog closed immediately — no confirm/created panel ever appeared.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(/set up your MuseHub account/i)).toBeNull();
    expect(screen.queryByText(/Is this you/i)).toBeNull();
  });

  it('state 1: closes with NO extra click — the exchange response alone (accountStatus "linked") is enough, no Continue button ever renders', async () => {
    // 5.3 review follow-up (2026-07-20): before the RP muse-exchange fix,
    // accountStatus was absent from every real response, so this exact
    // scenario fell through to the 'settled' phase and required a second
    // "Continue to MuseHub" click — the bug this test guards against.
    mock.seedMuseUser({ email: 'zc@mu.se', password: 'password1', name: 'Zoe', linkedServices: ['moose-hub'] });
    mock.seedServiceUser('moose-hub', { email: 'zc@mu.se', name: 'Zoe' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('zc@mu.se', 'password1');
    });
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    await act(async () => {
      await apiRef.current!.museHub.signOut();
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    // Signed in and the dialog is gone — no "Continue to MuseHub" (state
    // 3) or "Yes, that's me" (state 2) button ever appeared in between.
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue to MuseHub' })).toBeNull();
    expect(screen.queryByRole('button', { name: "Yes, that's me — continue" })).toBeNull();
  });

  it('state 2: same-email match -> recognition card with NO monetary value, confirm links + signs in', async () => {
    mock.seedMuseUser({ email: 'bea@mu.se', password: 'password1', name: 'Bea' });
    mock.seedServiceUser('moose-hub', { email: 'bea@mu.se', name: 'Bea MuseHub', itemCount: 4 });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('bea@mu.se', 'password1');
    });
    expect(apiRef.current!.museHub.signedIn).toBe(false);
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    await screen.findByText('Is this you?', { exact: false, selector: 'p' });
    expect(screen.getByText('Bea MuseHub')).toBeInTheDocument();
    expect(screen.getByText('4 plugins')).toBeInTheDocument();
    // Masked email shown, not the raw one — and never a dollar amount.
    expect(screen.getByText('be•••@mu.se')).toBeInTheDocument();
    expect(screen.queryByText('bea@mu.se')).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
    // Consent invariant (2026-07-22 rewrite): while the card is showing,
    // NOTHING has been linked or signed in — discovery is read-only; the
    // link happens only on the confirm click below.
    expect(apiRef.current!.museHub.signedIn).toBe(false);
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    fireEvent.click(screen.getByRole('button', { name: "Yes, that's me — continue" }));

    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    await waitFor(() => expect(apiRef.current!.museId.linkedServices).toContain('moose-hub'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('state 2 decline ("not me") reverses the claim instead of leaving it silently linked, and offers the different-email hand-off', async () => {
    mock.seedMuseUser({ email: 'c@mu.se', password: 'password1', name: 'Cy' });
    mock.seedServiceUser('moose-hub', { email: 'c@mu.se', name: 'Not Cy', itemCount: 2 });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('c@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
    await screen.findByText('Not Cy');

    fireEvent.click(screen.getByRole('button', { name: 'Not me — use a different account' }));

    // Lands on rung 3's email step (task 5.4) — not a placeholder anymore.
    await screen.findByText(/Have a MuseHub account under a different email/i);
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(false));
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    // "Back" returns to the CTA + legacy form — never a replacement.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('button', { name: 'Continue with Muse ID' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('focus restoration: returning to idle via "Back" (from different-email) lands focus on the Continue-with-Muse-ID CTA, not <body>', async () => {
    // 5.3 review follow-up (2026-07-20): the phase-transition focus effect
    // fired on every entry.phase.kind change, but idle's CTA was never
    // wired to the shared focus ref — every other transition refocused
    // correctly, but Back/Try again silently stranded focus on <body>
    // inside a still-open modal.
    mock.seedMuseUser({ email: 'h@mu.se', password: 'password1', name: 'Hana' });
    mock.seedServiceUser('moose-hub', { email: 'h@mu.se', name: 'Not Hana', itemCount: 1 });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('h@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
    await screen.findByText('Not Hana');
    fireEvent.click(screen.getByRole('button', { name: 'Not me — use a different account' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));

    const cta = await screen.findByRole('button', { name: 'Continue with Muse ID' });
    await waitFor(() => expect(document.activeElement).toBe(cta));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('focus restoration: returning to idle via "Try again" (from a failed exchange) lands focus on the Continue-with-Muse-ID CTA, not <body>', async () => {
    mock.seedMuseUser({ email: 'i@mu.se', password: 'password1', name: 'Ira' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('i@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    mock.failNext('muse-exchange');
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    const cta = await screen.findByRole('button', { name: 'Continue with Muse ID' });
    await waitFor(() => expect(document.activeElement).toBe(cta));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('state 3: no matching account -> explicit choice card; choosing "create" provisions and signs in', async () => {
    // Linking-consent rewrite (2026-07-22): discovery no longer silently
    // JIT-creates an account. The user is shown a choice — create new vs
    // connect an existing account under a different email — and creation
    // happens only on the explicit create click.
    mock.seedMuseUser({ email: 'd@mu.se', password: 'password1', name: 'Dee' });
    // No moose-hub service user seeded at all.

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('d@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    // The choice card — and the consent invariant: nothing exists yet.
    await screen.findByText(/No MuseHub account is connected to your Muse ID yet/i);
    expect(apiRef.current!.museHub.signedIn).toBe(false);
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    fireEvent.click(screen.getByRole('button', { name: 'Create a new MuseHub account' }));

    await screen.findByText("We've set up your MuseHub account.");
    fireEvent.click(screen.getByRole('button', { name: 'Continue to MuseHub' }));

    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    expect(apiRef.current!.museId.linkedServices).toContain('moose-hub');
  });

  it("state 3 choice card: 'I already have an account' hands off to the different-email link rung, creating nothing", async () => {
    mock.seedMuseUser({ email: 'dx@mu.se', password: 'password1', name: 'Dex' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('dx@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
    await screen.findByText(/No MuseHub account is connected to your Muse ID yet/i);

    fireEvent.click(screen.getByRole('button', { name: 'I already have a MuseHub account — connect it' }));

    // Lands on rung 3's email step; still nothing created or signed in.
    await screen.findByText(/Have a MuseHub account under a different email/i);
    expect(apiRef.current!.museHub.signedIn).toBe(false);
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');
  });

  it('state 5: no Muse session -> "Continue with Muse ID" opens the Muse ID dialog in SIGN-IN mode (not create), with a switch link to create one', async () => {
    // Regression test: ensureSignedIn used to default to 'sign-up', so an
    // existing Muse ID holder clicking "Continue with Muse ID" to sign IN
    // was silently dropped into the create flow. It must default to
    // sign-in — creation is the exception, reachable only via the switch
    // link — mirroring how "Continue with Google" signs into an existing
    // identity rather than registering a new one.
    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    expect(apiRef.current!.museId.signedIn).toBe(false);

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    // Muse ID dialog opened ON TOP of the still-open wallet dialog (which
    // has its own Email field) — scope every query to MuseIdAuthDialog's
    // own dialog element specifically.
    const museIdDialog = () =>
      within(document.getElementById('museid-auth-dialog-title')!.closest('[role="dialog"]') as HTMLElement);

    await waitFor(() => expect(apiRef.current!.museId.authDialog).toBe('sign-in'));
    // Sign-in's first (and only) step asks for email + password together —
    // sign-up's first step asks only for an email, so the Password field's
    // presence is itself proof this landed on sign-in, not create.
    expect(museIdDialog().getByRole('heading', { name: 'Sign in to Muse ID' })).toBeInTheDocument();
    expect(museIdDialog().getByLabelText('Password')).toBeInTheDocument();
    expect(museIdDialog().getByRole('button', { name: 'Create one' })).toBeInTheDocument();
  });

  it('state 5: signing in via the Muse ID dialog resumes the table on completion', async () => {
    mock.seedMuseUser({ email: 'e@mu.se', password: 'password1', name: 'Evan' });
    // No moose-hub service user seeded -> lands on state 3 (create) after
    // the Muse ID sign-in resolves.

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    const museIdDialog = () =>
      within(document.getElementById('museid-auth-dialog-title')!.closest('[role="dialog"]') as HTMLElement);

    const emailInput = await waitFor(() => museIdDialog().getByLabelText('Email'));
    fireEvent.change(emailInput, { target: { value: 'e@mu.se' } });
    fireEvent.change(museIdDialog().getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.click(museIdDialog().getByRole('button', { name: 'Sign in' }));

    fireEvent.click(await waitFor(() => museIdDialog().getByRole('button', { name: 'Continue to Audacity' })));

    // Muse ID dialog closed -> the CTA table resumed automatically (no
    // second click needed) and landed on state 3's choice card (no
    // moose-hub account at e@mu.se yet). Choosing create finishes.
    await screen.findByText(/No MuseHub account is connected to your Muse ID yet/i);
    fireEvent.click(screen.getByRole('button', { name: 'Create a new MuseHub account' }));
    await screen.findByText("We've set up your MuseHub account.");
    fireEvent.click(screen.getByRole('button', { name: 'Continue to MuseHub' }));
    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
  });

  it('state 5: cancelling the Muse ID dialog quietly returns to the CTA + legacy form, no crash', async () => {
    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    const museIdDialog = () =>
      within(document.getElementById('museid-auth-dialog-title')!.closest('[role="dialog"]') as HTMLElement);
    await waitFor(() => museIdDialog().getByLabelText('Email'));
    fireEvent.click(museIdDialog().getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByText('Sign in to Muse ID', { selector: 'h2' })).toBeNull());
    // Back on the wallet dialog's own idle state — CTA + legacy form intact.
    expect(await screen.findByRole('button', { name: 'Continue with Muse ID' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(apiRef.current!.museHub.signedIn).toBe(false);
  });

  it('SECURITY regression: a legacy sign-in with an unlinked Muse session held just closes — no link offer, nothing linked', async () => {
    // Session-linking removal: the old post-legacy-sign-in "Link to my Muse
    // ID?" prompt converted a live session into a permanent link (shared-
    // computer hijack vector). Signing into MuseHub while holding someone's
    // (or your own) unlinked Muse session must simply sign in and close.
    mock.seedMuseUser({ email: 'f@mu.se', password: 'password1', name: 'Fin' });
    mock.seedServiceUser('moose-hub', { email: 'legacy@musehub.example', name: 'Legacy Fin' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('f@mu.se', 'password1');
    });
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    const emailInput = await screen.findByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'legacy@musehub.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'anything' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    // Dialog closes on success — no "Link to my Muse ID?" interstitial.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiRef.current!.museHub.signedIn).toBe(true);
    // And nothing got linked as a side effect.
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');
    expect(screen.queryByText('Link this MuseHub account to your Muse ID?', { exact: false })).toBeNull();
  });


  it('the legacy form still renders and works, demoted beneath the CTA (never a replacement)', async () => {
    mock.seedServiceUser('moose-hub', { email: 'plain@musehub.example', name: 'Plain' });
    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    expect(await screen.findByRole('button', { name: 'Continue with Muse ID' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'plain@musehub.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'anything' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    // No Muse session was ever held, so no link prompt — closes normally.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // ---- Rung 3: "different email — prove by code" (task 5.4) ---------------

  describe('rung 3 — different email, prove by code', () => {
    it('happy path: linking a MuseHub account under a verified different email connects it, with no legacy session needed', async () => {
      mock.seedMuseUser({ email: 'rung3@mu.se', password: 'password1', name: 'Rung Three' });
      // The user's REAL MuseHub account lives under a DIFFERENT email —
      // neither the email-match nor the session rung can find it.
      mock.seedServiceUser('moose-hub', { email: 'rung3-alt@mu.se', name: 'Real Rung Three', itemCount: 3 });

      const { apiRef } = renderTree();
      await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
      await act(async () => {
        await apiRef.current!.museId.signIn('rung3@mu.se', 'password1');
      });

      act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
      fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
      // State 3's choice card fires first (no account under the Muse ID's
      // OWN email) — pick "connect an existing account" to reach the
      // rung-3 hand-off, exactly as a real user would ("my MuseHub account
      // is under a different email"). Nothing is created along the way.
      await screen.findByText(/No MuseHub account is connected to your Muse ID yet/i);
      fireEvent.click(screen.getByRole('button', { name: 'I already have a MuseHub account — connect it' }));

      const emailInput = await screen.findByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'rung3-alt@mu.se' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      const codeInput = await screen.findByLabelText('Verification code', { exact: false });
      expect(screen.getByText("We've sent a code to rung3-alt@mu.se.")).toBeInTheDocument();
      fireEvent.change(codeInput, { target: { value: '000000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

      await screen.findByText('That MuseHub account is now connected to your Muse ID.');
      await waitFor(() => expect(apiRef.current!.museId.linkedServices).toContain('moose-hub'));

      fireEvent.click(screen.getByRole('button', { name: 'Continue to MuseHub' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('no_account: proves ownership of the email but nothing exists there — neutral message, nothing created or linked', async () => {
      mock.seedMuseUser({ email: 'rung3b@mu.se', password: 'password1', name: 'Rung Three B' });
      // No moose-hub service user seeded at 'rung3b-alt@mu.se' anywhere.

      const { apiRef } = renderTree();
      await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
      await act(async () => {
        await apiRef.current!.museId.signIn('rung3b@mu.se', 'password1');
      });

      act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
      fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
      await screen.findByText(/No MuseHub account is connected to your Muse ID yet/i);
      fireEvent.click(screen.getByRole('button', { name: 'I already have a MuseHub account — connect it' }));

      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'rung3b-alt@mu.se' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      fireEvent.change(await screen.findByLabelText('Verification code', { exact: false }), { target: { value: '000000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

      await screen.findByText('No account found for that email.');
      expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

      // Recoverable, not a dead end — offers another attempt.
      fireEvent.click(screen.getByRole('button', { name: 'Try another email' }));
      expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    });

    it('already-linked conflict: a service account already linked to a DIFFERENT Muse ID shows a clear message and stays on the code step', async () => {
      mock.seedMuseUser({ email: 'owner@mu.se', password: 'password1', name: 'Owner' });
      mock.seedServiceUser('moose-hub', { email: 'shared-alt@mu.se', name: 'Shared Account', itemCount: 5 });

      const { apiRef } = renderTree();
      await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

      // Scene-setting via direct context calls (not the UI): the owner
      // already linked the shared account through rung 3.
      await act(async () => {
        await apiRef.current!.museId.signIn('owner@mu.se', 'password1');
        await apiRef.current!.museId.linkByEmailStart('moose-hub', 'shared-alt@mu.se');
        await apiRef.current!.museId.linkByEmailVerify('moose-hub', 'shared-alt@mu.se', '000000');
      });
      await waitFor(() => expect(apiRef.current!.museId.linkedServices).toContain('moose-hub'));
      await act(async () => {
        await apiRef.current!.museId.signOutEverywhere();
      });

      // A second, unrelated Muse ID tries to claim the SAME account.
      mock.seedMuseUser({ email: 'rival@mu.se', password: 'password1', name: 'Rival' });
      await act(async () => {
        await apiRef.current!.museId.signIn('rival@mu.se', 'password1');
      });

      act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
      fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));
      await screen.findByText(/No MuseHub account is connected to your Muse ID yet/i);
      fireEvent.click(screen.getByRole('button', { name: 'I already have a MuseHub account — connect it' }));

      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'shared-alt@mu.se' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      fireEvent.change(await screen.findByLabelText('Verification code', { exact: false }), { target: { value: '000000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

      await waitFor(() =>
        expect(screen.getByRole('alert').textContent).toMatch(/already linked to a different Muse ID/i),
      );
      // Stayed on the code step (recoverable) rather than bounced to a dead
      // end — the user can still try a different email.
      expect(screen.getByLabelText('Verification code', { exact: false })).toBeInTheDocument();
      expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');
    });
  });
});
