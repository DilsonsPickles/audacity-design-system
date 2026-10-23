/**
 * The MuseID context OBJECT and its hook, apart from the provider so
 * that `MuseIdContext.tsx` exports only `MuseIdProvider`, a component:
 * Vite's Fast Refresh patches a module in place only when every export
 * is a component — a hook or a context export in the provider's file
 * ("useMuseId export is incompatible") made every hot update touching
 * it re-mount the whole provider subtree instead (2026-10-23).
 */
import { createContext, useContext } from 'react';
import type { MuseIdProfile } from './MuseIdContext';
import type { ServiceName, VerifyResult, CompleteInput } from '../lib/muse-id-client';

export interface MuseIdContextValue {
  signedIn: boolean;
  /** True while a hydrate (or any flow step that re-hydrates) is in flight. */
  loading: boolean;
  /** Last error message from a sign-up/sign-in/link/unlink step, or an
   *  exchange failure. Cleared at the start of every new flow step. */
  error: string | null;
  profile: MuseIdProfile | null;
  linkedServices: ServiceName[];

  /** Re-fetch profile + linkedServices from muse-id. Called on mount + tab
   *  focus, and internally after every flow step that can change them. */
  hydrate: () => Promise<void>;

  // ---- Sign-up flow: start -> verify -> complete -------------------------
  /** Step 1: sends/mocks a verification code. Remembers `email` for the
   *  subsequent verify/complete calls. */
  signUpStart: (email: string) => Promise<void>;
  /** Step 2: checks the code entered for the email passed to signUpStart.
   *  For a brand-new email, resolves `{status:'new', discovery}` (no
   *  sign-in yet — call signUpComplete next). For an existing Muse ID, the
   *  real muse-id `/api/auth/verify` route 400s `password_required` unless
   *  the call ALSO carries `purpose:'reset'` plus a new password — so a
   *  reset can only be triggered by passing `resetPassword` here. When
   *  provided (and the email belongs to an existing Muse ID), this
   *  overwrites that account's password and resolves `{status:'reset',...}`,
   *  signing the caller in immediately (services get exchanged too). Omit
   *  it for the ordinary new-signup flow. */
  signUpVerify: (code: string, resetPassword?: string) => Promise<VerifyResult>;
  /** Step 3: creates the Muse ID for the email passed to signUpStart.
   *  Session-linking removal: signup creates ONLY the Muse ID — `links` is
   *  always empty now; linking is an explicit, ownership-proven action
   *  (email + code) from the Accounts page afterwards. */
  signUpComplete: (input: Omit<CompleteInput, 'email'>) => Promise<void>;

  // ---- Routine sign-in ----------------------------------------------------
  /** Email + password sign-in for an existing Muse ID. No code involved —
   *  see the design spec's "Auth surface" section. Exchanges + adopts every
   *  currently-linked service on success. */
  signIn: (email: string, password: string) => Promise<void>;

  /** Revokes Muse ID tokens AND calls both services' existing sign-out
   *  (revoke + local clear), then clears local Muse state. All three
   *  stores end up empty regardless of whether any individual revoke call
   *  succeeds server-side. */
  signOutEverywhere: () => Promise<void>;

  /** Unlinks `service`: clears muse-id's own LinkedAccount row (the
   *  authoritative directory) AND that service's own museId join column
   *  (best-effort — see muse-id README's "Link ownership boundary": these
   *  are two independently-owned pieces of state, so a failure clearing
   *  the RP side doesn't roll back the muse-id side). */
  unlinkService: (service: ServiceName) => Promise<void>;

  // ---- Linking-ladder rung 3: "different email — prove by code" (Task 5.4)
  /** Step 1: sends/mocks a 6-digit code to `email` to prove ownership of a
   *  `service` account under an address OTHER than this Muse ID's own —
   *  reachable from useMuseIdEntry's 'different-email' phase (both service
   *  AuthDialogs) and MuseIdAccountsPage. Requires an existing Muse
   *  session (this is post-creation linking, not part of signup). */
  linkByEmailStart: (service: ServiceName, email: string) => Promise<void>;
  /** Step 2: checks the code. Resolves `'linked'` (and re-hydrates
   *  linkedServices) or `'no_account'` (ownership proven, nothing to
   *  link — nothing created). Throws MuseIdAuthError on a bad code or
   *  either of the two already-linked conflicts (see muse-id-client.ts's
   *  linkVerify doc comment) — callers map the error code to copy.
   *
   *  Task 5.4 fix: on `'linked'`, also exchanges + adopts this service's
   *  own tokens (same exchange signup/signin run) so the service is actually
   *  signed in locally with real data — without this, a rung-3 link (no
   *  live legacy session on this device at all) left the service
   *  perpetually signed out locally despite muse-id considering it linked,
   *  which is what produced the "$0 · 0 plugins" symptom for an otherwise
   *  correctly-linked paid account. A failed exchange is surfaced via
   *  `error`, not thrown. */
  linkByEmailVerify: (service: ServiceName, email: string, code: string) => Promise<'linked' | 'no_account'>;

  // ---- Globally-mounted MuseIdAuthDialog (Task 3.2a) ---------------------
  /** State of the globally-mounted MuseIdAuthDialog. Both modes are
   *  browser-first (2026-09-10): the mode only decides which muse-id page
   *  the browser opens on — `/signup` for 'sign-up', `/authorize` (→
   *  `/login`) for 'sign-in'. The dialog itself is a launcher + waiting
   *  state; see MuseIdAuthDialog.tsx's file header. */
  authDialog: 'closed' | 'sign-up' | 'sign-in';
  /** Finishes a browser-first sign-in once the authorization code is back
   *  in this window: exchanges it (PKCE), establishes the profile, and
   *  adopts tokens for every linked service. Throws on state mismatch or a
   *  failed exchange; nothing is left half-signed-in. */
  completeBrowserSignIn: (code: string, state: string) => Promise<void>;
  /** Open the MuseIdAuthDialog in a given mode. */
  openAuthDialog: (mode: 'sign-up' | 'sign-in') => void;
  /** Close the MuseIdAuthDialog. No-op if already closed. */
  closeAuthDialog: () => void;
  /** Task 5.3, state 5 of the service-dialog CTA table ("No Muse session →
   *  open the Muse ID dialog, then re-enter the table"). If already signed
   *  in, resolves immediately with no dialog. Otherwise opens
   *  MuseIdAuthDialog in `mode` and returns a Promise that resolves once
   *  sign-up/sign-in completes (tokens written), or rejects with
   *  MuseIdSignInCancelledError if the dialog is closed first (Escape,
   *  backdrop, the × button) — mirrors AdieuContext.signIn/
   *  SignInCancelledError exactly, but keyed off `hasToken()` at close time
   *  instead of a separate explicit "complete" call, since this dialog's
   *  own closeAuthDialog is the single place every exit path (including
   *  the 'done' step's "Continue to Audacity" button) already funnels
   *  through. */
  ensureSignedIn: (mode?: 'sign-up' | 'sign-in') => Promise<void>;

  // ---- Task 3.2b: legacy-dialog debug toggle ------------------------------
  /** Debug-only escape hatch (Debug panel → "Muse ID" section). "Continue
   *  with Muse ID" is the primary CTA everywhere per the design spec; when
   *  this is true, account surfaces ALSO surface the pre-Muse-ID legacy
   *  sign-in entry points (wallet AuthDialog / AdieuAuthDialog) as a visible
   *  alternative — regression path + demo contrast. Session-only (not
   *  persisted), defaults to false so Muse ID stays primary out of the box.
   *  Linking flows that inherently need a live legacy session (session-proof
   *  linking) are NOT gated by this — they open the legacy dialog regardless,
   *  since that IS the linking mechanism, not a legacy fallback. */
  legacyAuthDialogsEnabled: boolean;
  setLegacyAuthDialogsEnabled: (value: boolean) => void;
}

export const MuseIdContext = createContext<MuseIdContextValue | null>(null);

export function useMuseId(): MuseIdContextValue {
  const ctx = useContext(MuseIdContext);
  if (!ctx) {
    throw new Error('useMuseId must be used inside <MuseIdProvider>');
  }
  return ctx;
}
