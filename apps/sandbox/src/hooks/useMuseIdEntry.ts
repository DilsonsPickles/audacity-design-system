// Task 5.3: shared "Continue with Muse ID" state machine for the two
// service sign-in dialogs (wallet/AuthDialog.tsx for MuseHub,
// adieu/AdieuAuthDialog.tsx for audio.com) — the design spec's five-state
// behaviour table (docs/superpowers/specs/2026-07-13-muse-id-sso-design.md,
// "Using Muse ID to enter a service + the linking ladder").
//
// Extracted into one hook (rather than duplicated per dialog) because the
// state machine itself doesn't depend on which service it's entering —
// only the token-adoption/sign-out target and copy differ, and those are
// passed in by the caller. A shared hook can't call BOTH useMuseHub() and
// useAdieu() itself (conditional hook calls are illegal), so each dialog
// still owns its own service-context hook call and passes `adoptTokens`/
// `signOut` through.
//
// ---- How each state is detected --------------------------------------
//
// State 1 (linked, zero prompts), state 2 (same-email match, confirm
// before claiming), and state 3 (no match, create — stated plainly) all
// hinge on knowing, AT CLICK TIME, whether the target service already had
// an account under the Muse profile's email. The real moose-hub/adieu
// `/api/auth/muse-exchange` routes resolve this server-side already
// (museId link -> legacy token -> verified email -> JIT-provision, see
// each RP's route.ts) but don't expose WHICH branch fired — the response
// is tokens + user, nothing else. There is also no client-reachable
// preview/lookup endpoint: `/api/internal/lookup` is S2S-only, RP-secret
// gated, no CORS (by design — anti-enumeration), so it can't be called
// from here even if we wanted to peek before committing.
//
// Rather than add a two-phase preview/commit API to three repos outside
// this task's scope (moose-hub, adieu, muse-id — task 5.3 is sandbox-only
// per its brief), this hook uses an OPTIONAL `accountStatus`/`display`
// pair on the exchange response (added to `ServiceExchangeResult` in
// muse-id-client.ts, populated by museIdMock.ts for full-fidelity tests)
// and an "optimistic exchange, confirm-to-keep, decline-to-revert" flow:
//
//   1. Call exchange. This is the SAME real, atomic resolve-or-create call
//      either way — nothing here makes it any more or less committed than
//      the endpoint already is.
//   2. If `accountStatus === 'email_match'` (a match, not yet linked
//      before this call), hold the tokens WITHOUT adopting them and show
//      the recognition card. Confirming adopts them (state 2, satisfied);
//      declining reverses the just-established link (see declineClaim)
//      instead of leaving a silently-claimed account behind.
//   3. Otherwise (`'created'`, or absent — the real backend today) there
//      is nothing to confirm: adopt immediately and state the outcome
//      (state 3/1).
//
// KNOWN GAP, disclosed rather than silently worked around: against the
// REAL (unenriched) backend, `accountStatus` is always undefined, so an
// already-linked returning sign-in and a fresh JIT-provision are
// indistinguishable here — both take the "state the outcome" branch. The
// copy for that branch is deliberately neutral ("You're connected…")
// rather than claiming a specific outcome, so it's never actually wrong,
// just less informative than the mock-backed demo. See
// ServiceExchangeResult's doc comment in muse-id-client.ts for the
// specific follow-up (add the discriminator to the real exchange routes).
//
// State 4 (different email) is NOT server-detected — the spec frames it as
// user-initiated ("Have an account under a different email? Add it"), so
// it's simply an escape hatch offered alongside states 2 and 3's UI
// (declineClaim / useDifferentEmail) rather than something this hook tries
// to predict. Task 5.3's brief explicitly scopes its real implementation
// to task 5.4 ("here just provide the affordance ... a callback/state is
// fine") — this hook exposes it as the `'different-email'` phase, which
// both dialogs currently render as a placeholder; task 5.4 replaces that
// placeholder with the real rung-3 UI (muse-id's `/api/link/start` +
// `/api/link/verify`, added in task 5.1) without touching this hook's
// state machine.
//
// State 5 (no Muse session) is handled by MuseIdContext.ensureSignedIn —
// opens MuseIdAuthDialog and resolves once sign-up/sign-in completes (or
// rejects on cancel), at which point this hook re-enters the table exactly
// as if a session had existed all along.

import { useCallback, useRef, useState } from 'react';
import {
  exchangeAdieu,
  exchangeMooseHub,
  exchangeResultToTokens,
  getAccessToken as getMuseAccessToken,
  MuseIdAuthError,
  type ServiceExchangeResult,
  type ServiceName,
} from '../lib/muse-id-client';
import { MuseIdSignInCancelledError, useMuseId } from '../contexts/MuseIdContext';

export interface MuseIdEntryTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface MuseIdEntryDisplay {
  name: string;
  maskedEmail: string;
  summary: string;
}

export type MuseIdEntryPhase =
  | { kind: 'idle' }
  | { kind: 'exchanging' }
  /** State 2: recognition card, confirm before claiming. */
  | { kind: 'confirm'; display: MuseIdEntryDisplay }
  /** State 1/3: nothing to confirm — `wasKnownNew` distinguishes the
   *  mock-verified "we just created this" copy from the real backend's
   *  ambiguous (accountStatus absent) case, where the copy stays neutral
   *  rather than asserting an outcome it can't actually verify. */
  | { kind: 'settled'; wasKnownNew: boolean }
  /** State 4 placeholder — see file header. */
  | { kind: 'different-email' }
  | { kind: 'error'; message: string };

export interface UseMuseIdEntryArgs {
  service: ServiceName;
  /** Adopts tokens into this service's own context (MuseHubContext.
   *  adoptTokens / AdieuContext.adoptTokens) — the caller passes its own
   *  service-context hook result through since this shared hook can't call
   *  useMuseHub()/useAdieu() itself (see file header). */
  adoptTokens: (tokens: MuseIdEntryTokens) => Promise<void>;
  /** Fully signs the caller out of this service — used by declineClaim to
   *  reverse an adopted session after a "not me" / "different email"
   *  decline. */
  signOut: () => Promise<void>;
  /** Called once the flow reaches a finalized sign-in (state 1's silent
   *  exchange, or confirmClaim). The dialog closes itself. */
  onDone: () => void;
}

export interface UseMuseIdEntryResult {
  phase: MuseIdEntryPhase;
  /** The CTA handler — call from the "Continue with Muse ID" button. */
  continueWithMuseId: () => Promise<void>;
  /** State 2's "Yes, that's me" action. */
  confirmClaim: () => Promise<void>;
  /** State 2's "Not me" action, and state 3/1's after-the-fact "actually,
   *  different email" link — both reverse whatever was just claimed/
   *  created and land on the state 4 placeholder. */
  declineClaim: () => Promise<void>;
  /** Resets to idle (e.g. a "back"/"try again" affordance on the error
   *  phase). */
  reset: () => void;
}

export function useMuseIdEntry({
  service,
  adoptTokens,
  signOut,
  onDone,
}: UseMuseIdEntryArgs): UseMuseIdEntryResult {
  const museId = useMuseId();
  const [phase, setPhase] = useState<MuseIdEntryPhase>({ kind: 'idle' });

  // Held between exchange and confirmClaim/declineClaim for state 2 — NOT
  // adopted until the user confirms. Cleared once consumed either way.
  const pendingTokensRef = useRef<MuseIdEntryTokens | null>(null);

  const runExchange = useCallback(
    (museAccessToken: string): Promise<ServiceExchangeResult> =>
      service === 'moose-hub' ? exchangeMooseHub(museAccessToken) : exchangeAdieu(museAccessToken),
    [service],
  );

  const continueWithMuseId = useCallback(async () => {
    try {
      if (!museId.signedIn) {
        try {
          await museId.ensureSignedIn('sign-up');
        } catch (err) {
          if (err instanceof MuseIdSignInCancelledError) {
            setPhase({ kind: 'idle' });
            return;
          }
          throw err;
        }
      }

      setPhase({ kind: 'exchanging' });
      const museAccessToken = getMuseAccessToken();
      if (!museAccessToken) throw new Error('Not signed in to Muse ID');
      const result = await runExchange(museAccessToken);
      const tokens = exchangeResultToTokens(result);

      if (result.accountStatus === 'email_match' && result.display) {
        pendingTokensRef.current = tokens;
        setPhase({ kind: 'confirm', display: result.display });
        return;
      }

      await adoptTokens(tokens);
      await museId.hydrate();
      if (result.accountStatus === 'linked') {
        onDone();
        return;
      }
      setPhase({ kind: 'settled', wasKnownNew: result.accountStatus === 'created' });
    } catch (err) {
      const message =
        err instanceof MuseIdAuthError || err instanceof Error ? err.message : 'Something went wrong.';
      setPhase({ kind: 'error', message });
    }
  }, [museId, runExchange, adoptTokens, onDone]);

  const confirmClaim = useCallback(async () => {
    const tokens = pendingTokensRef.current;
    if (!tokens) return;
    pendingTokensRef.current = null;
    try {
      await adoptTokens(tokens);
      await museId.hydrate();
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setPhase({ kind: 'error', message });
    }
  }, [adoptTokens, museId, onDone]);

  const declineClaim = useCallback(async () => {
    const heldTokens = pendingTokensRef.current;
    pendingTokensRef.current = null;
    try {
      // Get a live session adopted first (if not already) so unlinkService's
      // RP-side clear has a token to act on, then fully sign back out —
      // net result is "not linked, not signed in", as if exchange had
      // never run. See file header ("optimistic exchange, confirm-to-keep,
      // decline-to-revert").
      if (heldTokens) await adoptTokens(heldTokens);
      try {
        await museId.unlinkService(service);
      } catch {
        // Best-effort — MuseIdContext.unlinkService already tolerates a
        // failed RP-side clear.
      }
      await signOut();
      setPhase({ kind: 'different-email' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setPhase({ kind: 'error', message });
    }
  }, [adoptTokens, signOut, museId, service]);

  const reset = useCallback(() => setPhase({ kind: 'idle' }), []);

  return { phase, continueWithMuseId, confirmClaim, declineClaim, reset };
}
