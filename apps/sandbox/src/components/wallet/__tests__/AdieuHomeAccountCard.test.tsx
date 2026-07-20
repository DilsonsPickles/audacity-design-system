// Integration test for AdieuHomeAccountCard (Task 3.2d). Confirms the
// "Create account" CTA was removed — with Muse ID SSO, account creation
// happens once on the umbrella Muse ID card, not per-service — while
// "Sign in" stays as the legacy entry point / session-proof linking rung.
// Mirrors MuseHubHomeAccountCard.test.tsx (this card only needs
// AdieuContext).
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdieuProvider, useAdieu } from '../../../contexts/AdieuContext';
import { AdieuHomeAccountCard } from '../AdieuHomeAccountCard';

afterEach(cleanup);

function Harness({ apiRef }: { apiRef: React.MutableRefObject<ReturnType<typeof useAdieu> | null> }) {
  apiRef.current = useAdieu();
  return null;
}

function renderCard() {
  const apiRef: React.MutableRefObject<ReturnType<typeof useAdieu> | null> = { current: null };
  const utils = render(
    <AdieuProvider>
      <Harness apiRef={apiRef} />
      <AdieuHomeAccountCard />
    </AdieuProvider>,
  );
  return { ...utils, apiRef };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('AdieuHomeAccountCard', () => {
  it('signed out: shows "Sign in" and does NOT show "Create account"', () => {
    const { apiRef } = renderCard();

    expect(screen.getByText('Not signed in')).toBeTruthy();
    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    expect(signInButton).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();

    fireEvent.click(signInButton);
    expect(apiRef.current?.authDialog).toBe('sign-in');
  });

  it('renders under a subordinate "audio.com" heading, not an h2 peer of Muse ID', () => {
    renderCard();
    const heading = screen.getByRole('heading', { name: 'audio.com' });
    expect(heading.tagName).toBe('H3');
  });
});
