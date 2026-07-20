// Integration test for MuseHubHomeAccountCard (Task 3.2d). Confirms the
// "Create account" CTA was removed — with Muse ID SSO, account creation
// happens once on the umbrella Muse ID card, not per-service — while
// "Sign in" stays as the legacy entry point / session-proof linking rung.
// Same provider-tree pattern as MuseIdHomeAccountCard.test.tsx, minus the
// Muse ID layer (this card only needs MuseHubContext).
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MuseHubProvider, useMuseHub } from '../../../contexts/MuseHubContext';
import { MuseHubHomeAccountCard } from '../MuseHubHomeAccountCard';

afterEach(cleanup);

function Harness({ apiRef }: { apiRef: React.MutableRefObject<ReturnType<typeof useMuseHub> | null> }) {
  apiRef.current = useMuseHub();
  return null;
}

function renderCard() {
  const apiRef: React.MutableRefObject<ReturnType<typeof useMuseHub> | null> = { current: null };
  const utils = render(
    <MuseHubProvider>
      <Harness apiRef={apiRef} />
      <MuseHubHomeAccountCard />
    </MuseHubProvider>,
  );
  return { ...utils, apiRef };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('MuseHubHomeAccountCard', () => {
  it('signed out: shows "Sign in" and does NOT show "Create account"', () => {
    const { apiRef } = renderCard();

    expect(screen.getByText('Not signed in')).toBeTruthy();
    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    expect(signInButton).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();

    fireEvent.click(signInButton);
    expect(apiRef.current?.authDialog).toBe('sign-in');
  });

  it('renders under a subordinate "MuseHub" heading, not an h2 peer of Muse ID', () => {
    renderCard();
    const heading = screen.getByRole('heading', { name: 'MuseHub' });
    expect(heading.tagName).toBe('H3');
  });
});
