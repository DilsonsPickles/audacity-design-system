// Single source of truth for the Muse ID identity layer.
//
// Muse ID (http://localhost:3002) is the neutral IdP moose-hub and adieu
// both link into (docs/superpowers/specs/2026-07-13-muse-id-sso-design.md).
// This context owns ONLY the Muse session + profile + linkedServices — it
// does not duplicate wallet/library/project state, which stay owned by
// MuseHubContext/AdieuContext respectively.
//
// Pattern: provider-owns-hook (like MuseHubContext/AdieuContext), NOT
// value-provider (like PlaybackContext/LoopRegionContext). The
// value-provider pattern exists in App.tsx specifically for contexts whose
// hooks must run at the top of App() to share refs/ordering with other
// App-level hooks (see CLAUDE.md's "App.tsx hook order is a dependency
// chain" note — usePlaybackControls creates audioManagerRef that
// useRecording/useLoopRegion depend on). MuseIdContext has no such
// App.tsx-level coupling: its only dependencies are useMuseHub()/useAdieu(),
// which are themselves ordinary React context hooks only callable from
// inside the provider tree. So it's structurally identical to
// MuseHubContext/AdieuContext (self-contained auth+profile domain context,
// hydrate-on-mount, own loading/error state) and follows that pattern.
//
// On successful sign-up/sign-in, this context exchanges the fresh Muse
// access token for each of the user's LINKED services' own token pairs
// (`POST {service}/api/auth/muse-exchange`) and hands them to that
// service's context via its additive `adoptTokens` — MuseHubContext/
// AdieuContext then look, to every other consumer, exactly as if the user
// had signed in through the legacy dialog. Exchanges run independently
// (Promise per service, errors caught per-service) so one service being
// unreachable never corrupts state for the other or for Muse ID itself.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  hasToken,
  start as museIdStart,
  verify as museIdVerify,
  complete as museIdComplete,
  signIn as museIdSignInRequest,
  getUserInfo,
  getAccessToken,
  unlink as museIdUnlink,
  linkStart as museIdLinkStart,
  linkVerify as museIdLinkVerify,
  logout as museIdLogout,
  exchangeMooseHub,
  exchangeAdieu,
  exchangeResultToTokens,
  isExchangeSignedIn,
  type ServiceName,
  type CompleteInput,
  type VerifyResult,
  type MuseIdUserInfo,
} from '../lib/muse-id-client';
import { museUnlink as museHubMuseUnlink } from '../lib/musehub-client';
import { museUnlink as adieuMuseUnlink } from '../lib/adieu-client';
import { useMuseHub } from './MuseHubContext';
import { useAdieu } from './AdieuContext';
import { MuseIdAuthDialog } from '../components/museid/MuseIdAuthDialog';
// Task 5.3: the wallet/adieu AuthDialogs now need useMuseId() too (the
// "Continue with Muse ID" CTA), so they mount here instead of inside their
// own MuseHubProvider/AdieuProvider — this is the one place in the tree
// that's a descendant of all three providers. See MuseHubContext.tsx's/
// AdieuContext.tsx's file-header notes for why they can't self-mount
// anymore.
import { AuthDialog } from '../components/wallet/AuthDialog';
import { AdieuAuthDialog } from '../components/adieu/AdieuAuthDialog';

export interface MuseIdProfile {
  sub: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/** Thrown by `ensureSignedIn()` when the MuseIdAuthDialog closes without
 *  completing sign-up/sign-in — mirrors AdieuContext's SignInCancelledError. */
export class MuseIdSignInCancelledError extends Error {
  constructor() {
    super('muse_id_sign_in_cancelled');
    this.name = 'MuseIdSignInCancelledError';
  }
}

interface MuseIdContextValue {
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
  /** State of the globally-mounted MuseIdAuthDialog. 'sign-up' is the
   *  primary in-app entry point (email -> code -> discovery -> profile);
   *  'sign-in' is the secondary email+password path for a returning user.
   *  See the design spec's "Auth surface" section for why sign-up stays
   *  in-app while sign-in is meant to eventually prefer a browser bounce
   *  (deferred — see MuseIdAuthDialog.tsx's file header). */
  authDialog: 'closed' | 'sign-up' | 'sign-in';
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

const MuseIdContext = createContext<MuseIdContextValue | null>(null);

function toProfile(info: MuseIdUserInfo): MuseIdProfile {
  return { sub: info.sub, email: info.email, name: info.name, avatarUrl: info.avatarUrl };
}

export const MuseIdProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // MuseIdProvider must be rendered inside BOTH MuseHubProvider and
  // AdieuProvider — see App.tsx's provider tree — so its exchange/sign-out
  // flows can call their adoptTokens/signOut directly via these hooks
  // rather than reaching into their token stores itself.
  const museHub = useMuseHub();
  const adieu = useAdieu();

  const [signedIn, setSignedIn] = useState<boolean>(() => hasToken());
  const [profile, setProfile] = useState<MuseIdProfile | null>(null);
  const [linkedServices, setLinkedServices] = useState<ServiceName[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Binds signUpVerify/signUpComplete to the email signUpStart began with.
  // A ref (not state) — nothing renders off it, and a UI step component
  // (Task 3.2) reading it back mid-flow would rather call the flow methods
  // in order than re-derive this.
  const pendingSignUpEmailRef = useRef<string | null>(null);

  // Fetches profile + linkedServices and returns them, so callers within
  // the SAME async flow (signIn, signUpComplete, ...) can act on the fresh
  // linkedServices list without racing a stale closure over `linkedServices`
  // state (setState here wouldn't be visible to this function's own
  // remaining statements). `hydrate` (below) is the void-returning, effect-
  // facing wrapper exposed on the context.
  const fetchProfile = useCallback(async (): Promise<MuseIdUserInfo | null> => {
    if (!hasToken()) {
      setSignedIn(false);
      setProfile(null);
      setLinkedServices([]);
      return null;
    }
    setLoading(true);
    try {
      const info = await getUserInfo();
      setProfile(toProfile(info));
      setLinkedServices(info.linkedServices);
      setSignedIn(true);
      setError(null);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const isAuthError = /session expired|not signed in/i.test(message);
      if (isAuthError) {
        setSignedIn(false);
        setProfile(null);
        setLinkedServices([]);
      }
      // Otherwise: keep last-known state and try again on the next focus,
      // same convention as MuseHubContext/AdieuContext.hydrate.
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const hydrate = useCallback(async (): Promise<void> => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrate();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // Refetch when the tab becomes visible / regains focus — mirrors
  // MuseHubContext/AdieuContext so a link/unlink made in another tab (or
  // directly against muse-id) shows up here on tab switch.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === 'visible') void hydrate();
    };
    document.addEventListener('visibilitychange', refetch);
    window.addEventListener('focus', refetch);
    return () => {
      document.removeEventListener('visibilitychange', refetch);
      window.removeEventListener('focus', refetch);
    };
  }, [hydrate]);

  // Exchanges one service and adopts the result. Failures are caught by the
  // caller (exchangeAndAdoptAll) — this never throws past that boundary on
  // its own; it's a plain rethrow here so the caller can attribute the
  // failure to a specific service.
  const adoptForService = useCallback(
    async (service: ServiceName, museAccessToken: string) => {
      const result =
        service === 'moose-hub'
          ? await exchangeMooseHub(museAccessToken)
          : await exchangeAdieu(museAccessToken);
      // Callers only pass services muse-id's directory says are linked, so
      // discovery should return tokens ('linked'). A tokenless discovery
      // means the RP side disagrees (desync) — never auto-commit here (the
      // consent contract); fail this service so the user resolves it
      // deliberately from Accounts.
      if (!isExchangeSignedIn(result)) throw new Error(`${service} is not linked on the service side`);
      const tokens = exchangeResultToTokens(result);
      if (service === 'moose-hub') await museHub.adoptTokens(tokens);
      else await adieu.adoptTokens(tokens);
    },
    [museHub, adieu],
  );

  // Runs one exchange per service independently — a failure for one
  // service is recorded in `error` but never prevents the others from
  // succeeding, and never touches a service that already adopted tokens
  // (each adoptForService call is fully self-contained: exchange THEN
  // adopt, so a failed exchange for service B leaves service A's already-
  // adopted tokens exactly as they were).
  const exchangeAndAdoptAll = useCallback(
    async (museAccessToken: string, services: ServiceName[]) => {
      const failures: ServiceName[] = [];
      for (const service of services) {
        try {
          await adoptForService(service, museAccessToken);
        } catch {
          failures.push(service);
        }
      }
      if (failures.length > 0) {
        setError(`Failed to link: ${failures.join(', ')}`);
      }
    },
    [adoptForService],
  );

  const signUpStart = useCallback(async (email: string): Promise<void> => {
    setError(null);
    await museIdStart(email);
    pendingSignUpEmailRef.current = email;
  }, []);

  const signUpVerify = useCallback(
    async (code: string, resetPassword?: string): Promise<VerifyResult> => {
      const email = pendingSignUpEmailRef.current;
      if (!email) throw new Error('signUpStart must be called before signUpVerify');
      setError(null);
      const result = await museIdVerify(
        email,
        code,
        resetPassword ? { password: resetPassword } : undefined,
      );
      if (result.status === 'reset') {
        // Existing Muse ID, password just reset — signed in immediately.
        pendingSignUpEmailRef.current = null;
        const info = await fetchProfile();
        if (info) await exchangeAndAdoptAll(result.access_token, info.linkedServices);
      }
      return result;
    },
    [fetchProfile, exchangeAndAdoptAll],
  );

  const signUpComplete = useCallback(
    async (input: Omit<CompleteInput, 'email'>): Promise<void> => {
      const email = pendingSignUpEmailRef.current;
      if (!email) throw new Error('signUpStart/signUpVerify must run before signUpComplete');
      setError(null);
      const result = await museIdComplete({ email, ...input });
      pendingSignUpEmailRef.current = null;

      // Session-linking removal: signup creates only the Muse ID (`links` is
      // always empty), so there is nothing to exchange/adopt here beyond any
      // linkedServices the server reports (always [] for a fresh account).
      await exchangeAndAdoptAll(result.access_token, result.linkedServices);
      await fetchProfile();
    },
    [fetchProfile, exchangeAndAdoptAll],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      const result = await museIdSignInRequest(email, password);
      const info = await fetchProfile();
      await exchangeAndAdoptAll(result.access_token, info?.linkedServices ?? []);
    },
    [fetchProfile, exchangeAndAdoptAll],
  );

  const signOutEverywhere = useCallback(async (): Promise<void> => {
    setError(null);
    // "Everywhere" = everywhere THIS Muse ID is signed in: the Muse ID itself
    // plus only the services actually linked to it. Service accounts signed
    // in independently (never linked to this Muse ID — e.g. a direct MuseHub
    // login under a different email) are left alone; a Muse ID sign-out must
    // not reach into sessions it never authorized.
    const ops: Array<Promise<unknown>> = [museIdLogout()];
    if (linkedServices.includes('moose-hub')) ops.push(museHub.signOut());
    if (linkedServices.includes('adieu')) ops.push(adieu.signOut());
    await Promise.allSettled(ops);
    setSignedIn(false);
    setProfile(null);
    setLinkedServices([]);
    pendingSignUpEmailRef.current = null;
  }, [museHub, adieu, linkedServices]);

  const unlinkService = useCallback(
    async (service: ServiceName): Promise<void> => {
      setError(null);
      await museIdUnlink(service);
      try {
        if (service === 'moose-hub') await museHubMuseUnlink();
        else await adieuMuseUnlink();
      } catch {
        // Best-effort: muse-id's own LinkedAccount row (the authoritative
        // directory) is already cleared above. The RP-side museId column
        // is a separately-owned piece of state per the design's two-step
        // ownership boundary — a failure here (e.g. the RP session already
        // expired) doesn't roll back the muse-id-side unlink.
      }
      await fetchProfile();
    },
    [fetchProfile],
  );

  const linkByEmailStart = useCallback(
    async (service: ServiceName, email: string): Promise<void> => {
      setError(null);
      await museIdLinkStart(service, email);
    },
    [],
  );

  const linkByEmailVerify = useCallback(
    async (service: ServiceName, email: string, code: string): Promise<'linked' | 'no_account'> => {
      setError(null);
      const result = await museIdLinkVerify(service, email, code);
      if (result.status === 'linked') {
        if (result.rpSynced === false) {
          setError(
            `Linked to Muse ID, but couldn't finish connecting ${service} — try again from Accounts.`,
          );
        }
        const museAccessToken = getAccessToken();
        if (museAccessToken) {
          try {
            await adoptForService(service, museAccessToken);
          } catch {
            setError(`Linked, but couldn't connect ${service} — try again from Accounts.`);
          }
        }
        await fetchProfile();
      }
      return result.status;
    },
    [fetchProfile, adoptForService],
  );

  // Globally-mounted MuseIdAuthDialog state — mirrors MuseHubContext's/
  // AdieuContext's own authDialog + openAuthDialog/closeAuthDialog.
  const [authDialog, setAuthDialog] = useState<'closed' | 'sign-up' | 'sign-in'>('closed');

  // Pending ensureSignedIn() promise resolver — set when ensureSignedIn
  // opens the dialog, cleared (and resolved/rejected) the next time
  // closeAuthDialog runs. See ensureSignedIn's doc comment above.
  const pendingSignInRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  const openAuthDialog = useCallback((mode: 'sign-up' | 'sign-in') => {
    setAuthDialog(mode);
  }, []);
  const closeAuthDialog = useCallback(() => {
    setAuthDialog('closed');
    const pending = pendingSignInRef.current;
    if (pending) {
      pendingSignInRef.current = null;
      if (hasToken()) pending.resolve();
      else pending.reject(new MuseIdSignInCancelledError());
    }
  }, []);
  const ensureSignedIn = useCallback((mode: 'sign-up' | 'sign-in' = 'sign-in'): Promise<void> => {
    if (hasToken()) return Promise.resolve();
    if (pendingSignInRef.current) {
      pendingSignInRef.current.reject(new MuseIdSignInCancelledError());
      pendingSignInRef.current = null;
    }
    return new Promise<void>((resolve, reject) => {
      pendingSignInRef.current = { resolve, reject };
      setAuthDialog(mode);
    });
  }, []);

  const [legacyAuthDialogsEnabled, setLegacyAuthDialogsEnabled] = useState(false);

  const value = useMemo<MuseIdContextValue>(
    () => ({
      signedIn,
      loading,
      error,
      profile,
      linkedServices,
      hydrate,
      signUpStart,
      signUpVerify,
      signUpComplete,
      signIn,
      signOutEverywhere,
      unlinkService,
      linkByEmailStart,
      linkByEmailVerify,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      ensureSignedIn,
      legacyAuthDialogsEnabled,
      setLegacyAuthDialogsEnabled,
    }),
    [
      signedIn,
      loading,
      error,
      profile,
      linkedServices,
      hydrate,
      signUpStart,
      signUpVerify,
      signUpComplete,
      signIn,
      signOutEverywhere,
      unlinkService,
      linkByEmailStart,
      linkByEmailVerify,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      ensureSignedIn,
      legacyAuthDialogsEnabled,
    ],
  );

  return (
    <MuseIdContext.Provider value={value}>
      {children}
      <MuseIdAuthDialog />
      <AuthDialog />
      <AdieuAuthDialog />
    </MuseIdContext.Provider>
  );
};

export function useMuseId(): MuseIdContextValue {
  const ctx = useContext(MuseIdContext);
  if (!ctx) {
    throw new Error('useMuseId must be used inside <MuseIdProvider>');
  }
  return ctx;
}
