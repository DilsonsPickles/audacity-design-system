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
  link as museIdLink,
  unlink as museIdUnlink,
  logout as museIdLogout,
  exchangeMooseHub,
  exchangeAdieu,
  exchangeResultToTokens,
  type ServiceName,
  type CompleteInput,
  type VerifyResult,
  type MuseIdUserInfo,
} from '../lib/muse-id-client';
import { museUnlink as museHubMuseUnlink } from '../lib/musehub-client';
import { museUnlink as adieuMuseUnlink } from '../lib/adieu-client';
import { useMuseHub } from './MuseHubContext';
import { useAdieu } from './AdieuContext';

export interface MuseIdProfile {
  sub: string;
  email: string;
  name: string;
  avatarUrl?: string;
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
  /** Step 3: creates the Muse ID for the email passed to signUpStart, then
   *  exchanges + adopts every linked service (server-registered
   *  email-match links from the `complete` response, plus any
   *  session-proof links the caller included with a `legacy_access_token`). */
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

  /** Post-creation linking (settings / deferred prompts). Calls muse-id's
   *  own `/api/link` (which verifies `legacyAccessToken` against the
   *  service itself) then re-hydrates. Does NOT itself adopt tokens for
   *  that service — call signIn/hydrate again, or rely on the next
   *  exchange, to pick up the newly-linked service's session. */
  linkService: (service: ServiceName, legacyAccessToken: string) => Promise<void>;
  /** Unlinks `service`: clears muse-id's own LinkedAccount row (the
   *  authoritative directory) AND that service's own museId join column
   *  (best-effort — see muse-id README's "Link ownership boundary": these
   *  are two independently-owned pieces of state, so a failure clearing
   *  the RP side doesn't roll back the muse-id side). */
  unlinkService: (service: ServiceName) => Promise<void>;
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
    async (service: ServiceName, museAccessToken: string, legacyAccessToken?: string) => {
      const result =
        service === 'moose-hub'
          ? await exchangeMooseHub(museAccessToken, legacyAccessToken)
          : await exchangeAdieu(museAccessToken, legacyAccessToken);
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
    async (
      museAccessToken: string,
      services: ServiceName[],
      legacyTokensByService: Partial<Record<ServiceName, string>> = {},
    ) => {
      const failures: ServiceName[] = [];
      for (const service of services) {
        try {
          await adoptForService(service, museAccessToken, legacyTokensByService[service]);
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

      // Union of server-registered email-match links (already live on
      // muse-id) and any session-proof links the caller supplied — those
      // need the exchange call's `legacy_access_token` to actually
      // establish the RP-side link (muse-id's /api/auth/complete only
      // executes email-match links itself; see its file-header comment).
      const legacyByService: Partial<Record<ServiceName, string>> = {};
      for (const l of input.links ?? []) {
        if (l.method === 'session' && l.legacy_access_token) {
          legacyByService[l.service] = l.legacy_access_token;
        }
      }
      const services = Array.from(
        new Set<ServiceName>([...result.linkedServices, ...(Object.keys(legacyByService) as ServiceName[])]),
      );

      await exchangeAndAdoptAll(result.access_token, services, legacyByService);
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
    await Promise.allSettled([museIdLogout(), museHub.signOut(), adieu.signOut()]);
    setSignedIn(false);
    setProfile(null);
    setLinkedServices([]);
    pendingSignUpEmailRef.current = null;
  }, [museHub, adieu]);

  const linkService = useCallback(
    async (service: ServiceName, legacyAccessToken: string): Promise<void> => {
      setError(null);
      await museIdLink(service, legacyAccessToken);
      await fetchProfile();
    },
    [fetchProfile],
  );

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
      linkService,
      unlinkService,
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
      linkService,
      unlinkService,
    ],
  );

  return <MuseIdContext.Provider value={value}>{children}</MuseIdContext.Provider>;
};

export function useMuseId(): MuseIdContextValue {
  const ctx = useContext(MuseIdContext);
  if (!ctx) {
    throw new Error('useMuseId must be used inside <MuseIdProvider>');
  }
  return ctx;
}
