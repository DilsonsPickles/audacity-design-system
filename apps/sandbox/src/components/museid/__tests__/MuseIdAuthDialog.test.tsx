// Integration tests for MuseIdAuthDialog at the museIdMock network boundary
// (see ../../../__tests__/museIdMock.ts). Renders the REAL provider tree
// (MuseHubProvider > AdieuProvider > MuseIdProvider, which mounts the
// dialog itself — same pattern MuseIdContext.test.tsx uses for the
// context-only flows) and drives the dialog through fireEvent, same as a
// real user would.
//
// The dialog is portal-mounted to document.body (mirrors AuthDialog /
// AdieuAuthDialog), so queries go through `screen` (which is
// `within(document.body)`) rather than a `render()` container — the
// container itself never receives the portaled markup. `afterEach(cleanup)`
// still tears down portaled nodes because RTL tracks everything created by
// a tracked render, portals included.
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from '../../../contexts/MuseIdContext';
import { createMuseIdMock, type MuseIdMockControls } from '../../../__tests__/museIdMock';
import { adoptTokens as adoptAdieuTokens } from '../../../lib/adieu-client';

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

function renderDialog() {
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

describe('MuseIdAuthDialog', () => {
  it('full sign-up walkthrough: email -> code -> profile -> success — creates ONLY the Muse ID (no auto-linking)', async () => {
    // SECURITY regression (session-linking removal): both auto-link inputs
    // are staged — a moose-hub account under the SAME email (the old
    // email-match rung) and a live adieu session under a DIFFERENT email
    // (the old session rung). Signup must link NEITHER: it creates just the
    // Muse ID; linking is an explicit email-code-proven action from
    // Accounts afterwards.
    mock.seedServiceUser('moose-hub', { email: 'new@mu.se', name: 'New MuseHub User' });
    mock.seedMuseUser({
      email: 'prior@mu.se',
      password: 'priorpass1',
      name: 'Prior User',
      linkedServices: ['adieu'],
    });
    mock.seedServiceUser('adieu', { email: 'prior@mu.se', name: 'Prior Adieu User' });

    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    // Scene-setting: a live adieu session under a different email exists in
    // this browser (the shared-computer scenario) before the new signup.
    await act(async () => {
      await apiRef.current!.museId.signIn('prior@mu.se', 'priorpass1');
    });
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));
    await act(async () => {
      await apiRef.current!.museId.signOutEverywhere();
    });
    // signOutEverywhere scopes to linked services — adieu was linked to the
    // prior Muse ID, so re-establish an independent adieu session directly.
    const adieuToken = mock.seedServiceAccessToken('adieu', 'prior@mu.se');
    await act(async () => {
      adoptAdieuTokens({ accessToken: adieuToken, refreshToken: 'irrelevant', expiresAt: Date.now() + 3600_000 });
      await apiRef.current!.adieu.hydrate();
    });
    await waitFor(() => expect(apiRef.current!.adieu.signedIn).toBe(true));

    // Open the dialog for a fresh sign-up.
    act(() => apiRef.current!.museId.openAuthDialog('sign-up'));

    // ---- Email step ----
    const emailInput = await screen.findByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'new@mu.se' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // ---- Code step ----
    const codeInput = await screen.findByLabelText('Verification code', { exact: false });
    expect(screen.getByText("We've sent a code to new@mu.se.")).toBeInTheDocument();
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    // ---- Straight to profile: NO discovery/link step exists anymore ----
    const nameInput = await screen.findByLabelText('Display name');
    expect(screen.queryByText('Found your accounts')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.change(nameInput, { target: { value: 'New Muse User' } });
    fireEvent.change(screen.getByLabelText('Password', { exact: false }), { target: { value: 'brand-new-pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Muse ID' }));

    // ---- Done: Muse ID exists, NOTHING got linked ----
    await screen.findByText("You're all set");
    expect(apiRef.current!.museId.signedIn).toBe(true);
    expect(apiRef.current!.museId.linkedServices).toEqual([]);
    // The bystander adieu session is untouched — still signed in, still NOT
    // linked to the new Muse ID.
    expect(apiRef.current!.adieu.signedIn).toBe(true);
  });

  it('code step surfaces friendly copy for a wrong code', async () => {
    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    act(() => apiRef.current!.museId.openAuthDialog('sign-up'));

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'wrongcode@mu.se' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const codeInput = await screen.findByLabelText('Verification code', { exact: false });
    fireEvent.change(codeInput, { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/doesn.t match/i),
    );
    // Still on the code step — no silent advance past a rejected code.
    expect(screen.getByLabelText('Verification code', { exact: false })).toBeInTheDocument();
  });

  it('email step response copy is identical for an existing account and an unknown one (anti-enumeration)', async () => {
    mock.seedMuseUser({ email: 'existing@mu.se', password: 'whatever1', name: 'Existing' });

    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    for (const email of ['existing@mu.se', 'brand-new@mu.se']) {
      act(() => apiRef.current!.museId.openAuthDialog('sign-up'));
      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: email } });
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await screen.findByLabelText('Verification code', { exact: false });
      expect(screen.getByText(`We've sent a code to ${email}.`)).toBeInTheDocument();
      act(() => apiRef.current!.museId.closeAuthDialog());
    }
  });

  it('sign-in: happy path signs the user (and linked services) in', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'correct-horse',
      name: 'Returning User',
    });

    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    act(() => apiRef.current!.museId.openAuthDialog('sign-in'));

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'returning@mu.se' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText(/You're in as/);
    expect(apiRef.current!.museId.signedIn).toBe(true);
    expect(apiRef.current!.museId.profile?.email).toBe('returning@mu.se');
  });

  it('sign-in: a bad password surfaces friendly copy and does not sign in', async () => {
    mock.seedMuseUser({
      email: 'returning@mu.se',
      password: 'correct-horse',
      name: 'Returning User',
    });

    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    act(() => apiRef.current!.museId.openAuthDialog('sign-in'));

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'returning@mu.se' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/incorrect email or password/i),
    );
    expect(apiRef.current!.museId.signedIn).toBe(false);
  });

  it('forgot password: happy path resets the password and signs the user in', async () => {
    mock.seedMuseUser({
      email: 'reset-me@mu.se',
      password: 'old-password1',
      name: 'Reset Me',
    });

    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    act(() => apiRef.current!.museId.openAuthDialog('sign-in'));

    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'reset-me@mu.se' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));

    const codeInput = await screen.findByLabelText('Verification code', { exact: false });
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.change(screen.getByLabelText('New password', { exact: false }), {
      target: { value: 'brand-new-pw1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password and sign in' }));

    await screen.findByText(/You're in as/);
    expect(apiRef.current!.museId.signedIn).toBe(true);
    expect(apiRef.current!.museId.profile?.email).toBe('reset-me@mu.se');
  });

  it('forgot password: an email with no Muse ID does not show a false "signed in" screen', async () => {
    // No seedMuseUser call — this email has no Muse ID. The mock's
    // /api/auth/verify falls through to its status:'new' branch (see
    // museIdMock.ts) even though this request carries purpose:'reset',
    // exactly like the real muse-id backend (there's no account to reset).
    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    act(() => apiRef.current!.museId.openAuthDialog('sign-in'));

    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'nobody@mu.se' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));

    const codeInput = await screen.findByLabelText('Verification code', { exact: false });
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.change(screen.getByLabelText('New password', { exact: false }), {
      target: { value: 'brand-new-pw1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password and sign in' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/no Muse ID/i),
    );
    // The bug: this used to unconditionally land on the "done" screen and
    // report signed in, regardless of what signUpVerify actually resolved.
    expect(screen.queryByText(/You're in as/)).not.toBeInTheDocument();
    expect(apiRef.current!.museId.signedIn).toBe(false);

    // Offers a way forward instead of a dead end.
    fireEvent.click(screen.getByRole('button', { name: 'Create a Muse ID instead' }));
    await screen.findByText('Create a Muse ID');
  });

  it('focuses the new step\'s first control on a step transition (email -> code)', async () => {
    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));
    act(() => apiRef.current!.museId.openAuthDialog('sign-up'));

    const emailInput = await screen.findByLabelText('Email');
    // Initial-step focus (the [open,mode] reset effect).
    await waitFor(() => expect(document.activeElement).toBe(emailInput));

    fireEvent.change(emailInput, { target: { value: 'focus-check@mu.se' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Step-transition focus (the fix under test) — the email input unmounts
    // and the code step's input must pick up focus, not silently drop to
    // <body>.
    const codeInput = await screen.findByLabelText('Verification code', { exact: false });
    await waitFor(() => expect(document.activeElement).toBe(codeInput));
  });

  it('sign-in and create modes have distinct headings and a switch link between them', async () => {
    // Regression coverage for the "silently dropped into create" bug: both
    // flows used to open on a near-identical "enter your email" screen, so
    // there was nothing on screen telling the user which mode they were in.
    const { apiRef } = renderDialog();
    await waitFor(() => expect(apiRef.current?.museId.loading).toBe(false));

    act(() => apiRef.current!.museId.openAuthDialog('sign-in'));
    expect(await screen.findByRole('heading', { name: 'Sign in to Muse ID' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument();

    act(() => apiRef.current!.museId.closeAuthDialog());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    act(() => apiRef.current!.museId.openAuthDialog('sign-up'));
    expect(await screen.findByRole('heading', { name: 'Create a Muse ID' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
