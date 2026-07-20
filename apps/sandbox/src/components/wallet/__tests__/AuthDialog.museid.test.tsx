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

    await screen.findByText(/different email is coming soon/i);
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

  it('state 3: no matching account -> creates one, stated plainly, then signs in', async () => {
    mock.seedMuseUser({ email: 'd@mu.se', password: 'password1', name: 'Dee' });
    // No moose-hub service user seeded at all.

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('d@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Muse ID' }));

    await screen.findByText("We've set up your MuseHub account.");
    fireEvent.click(screen.getByRole('button', { name: 'Continue to MuseHub' }));

    await waitFor(() => expect(apiRef.current!.museHub.signedIn).toBe(true));
    expect(apiRef.current!.museId.linkedServices).toContain('moose-hub');
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
    // second click needed) and landed on state 3 (no moose-hub account at
    // e@mu.se yet).
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

  it('post-legacy-sign-in prompt: signing in via the legacy form while holding an unlinked Muse session offers to link', async () => {
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

    await screen.findByText('Link this MuseHub account to your Muse ID?', { exact: false });
    // Legacy sign-in already succeeded — the dialog stayed open only for
    // this prompt, not because sign-in failed.
    expect(apiRef.current!.museHub.signedIn).toBe(true);
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');

    fireEvent.click(screen.getByRole('button', { name: 'Link to my Muse ID' }));

    await waitFor(() => expect(apiRef.current!.museId.linkedServices).toContain('moose-hub'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('post-legacy-sign-in prompt: "Not now" skips linking and still closes', async () => {
    mock.seedMuseUser({ email: 'g@mu.se', password: 'password1', name: 'Gus' });
    mock.seedServiceUser('moose-hub', { email: 'legacy2@musehub.example', name: 'Legacy Gus' });

    const { apiRef } = renderTree();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    await act(async () => {
      await apiRef.current!.museId.signIn('g@mu.se', 'password1');
    });

    act(() => apiRef.current!.museHub.openAuthDialog('sign-in'));
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'legacy2@musehub.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'anything' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('Link this MuseHub account to your Muse ID?', { exact: false });
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiRef.current!.museHub.signedIn).toBe(true);
    expect(apiRef.current!.museId.linkedServices).not.toContain('moose-hub');
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
});
