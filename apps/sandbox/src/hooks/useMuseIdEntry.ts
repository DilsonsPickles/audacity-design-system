// Task 5.3 (rewritten for linking consent, 2026-07-22): shared "Continue
// with Muse ID" state machine for the two service sign-in dialogs
// (wallet/AuthDialog.tsx for MuseHub, adieu/AdieuAuthDialog.tsx for
// audio.com) — the design spec's five-state behaviour table
// (docs/superpowers/specs/2026-07-13-muse-id-sso-design.md, "Using Muse ID
// to enter a service + the linking ladder"), amended by the consent
// contract: entering a service via Muse ID must NEVER silently link a
// pre-existing account or silently create a fresh one.
//
// Extracted into one hook (rather than duplicated per dialog) because the
// state machine itself doesn't depend on which service it's entering —
// only the token-adoption/sign-out target and copy differ, and those are
// passed in by the caller. A shared hook can't call BOTH useMuseHub() and
// useAdieu() itself (conditional hook calls are illegal), so each dialog
// still owns its own service-context hook call and passes `adoptTokens`/
// `signOut` through.
//
// ---- The discover -> consent -> commit flow ---------------------------
//
// The RPs' `/api/auth/muse-exchange` is now two-phase (see each repo's
// route.ts): a call WITHOUT `intent` is DISCOVERY — read-only, returns
// tokens only for an already-linked Muse ID, and reports 'email-match' /
// 'no-account' tokenlessly otherwise, mutating nothing. Linking or
// creating happens only on a second call carrying the intent the USER
// chose. This hook is where that choice is collected:
//
//   1. continueWithMuseId runs discovery.
//   2. 'linked'      -> adopt and finish with ZERO prompts (state 1 — the
//                       link decision was already made, once, in the past).
//   3. 'email-match' -> recognition card ("Is this you?"). NOTHING has
//                       been linked yet — confirmClaim re-calls the
//                       exchange with intent 'link-existing' and only THAT
//                       call links + signs in. Declining is pure
//                       navigation (there is nothing to reverse — contrast
//                       the old optimistic-exchange design, which linked
//                       first and unlinked on decline).
//   4. 'no-account'  -> explicit choice card (the `choose` phase): create
//                       a fresh account here, or connect an existing one
//                       under a different email (rung 3). No account
//                       exists until the user picks — the old flow's
//                       silent JIT-create-and-adopt (which could swap a
//                       signed-in user off their real, purchased-on
//                       account with no warning) is gone.
//
// State 4 (different email) is user-initiated, reachable from both the
// recognition card's "Not me" and the choice card's "connect existing" —
// rung 3 (email B -> code -> linked/no_account) is wired here as the
// `different-email*` phases, delegating to MuseIdContext.linkByEmailStart/
// linkByEmailVerify so MuseIdAccountsPage's own rung-3 UI shares one
// implementation. Rung 3 is Bearer-gated (post-account-creation linking),
// which is satisfied here: by every path into `different-email`,
// `museId.signedIn` is true.
//
// State 5 (no Muse session) is handled by MuseIdContext.ensureSignedIn —
// opens MuseIdAuthDialog and resolves once sign-up/sign-in completes (or
// rejects on cancel), at which point this hook re-enters the table exactly
// as if a session had existed all along.

import { useCallback, useState } from 'react';
import {
  exchangeAdieu,
  exchangeMooseHub,
  exchangeResultToTokens,
  getAccessToken as getMuseAccessToken,
  isExchangeSignedIn,
  MuseIdAuthError,
  type MuseExchangeIntent,
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
  /** State 2: recognition card — an existing account matches the Muse
   *  email but NOTHING has been linked yet; confirmClaim commits. */
  | { kind: 'confirm'; display: MuseIdEntryDisplay }
  /** The no-account choice card: nothing exists at this service for this
   *  Muse ID, and nothing will until the user picks create-new
   *  (chooseCreate) or connect-existing-under-another-email
   *  (chooseDifferentEmail). */
  | { kind: 'choose' }
  /** State 1/3 landing: signed in. `wasKnownNew` is true when the account
   *  was just created via an explicit 'create' commit; false covers the
   *  ambiguous (accountStatus absent) case, where the copy stays neutral
   *  rather than asserting an outcome it can't actually verify. */
  | { kind: 'settled'; wasKnownNew: boolean }
  /** State 4, step 1: enter the candidate "email B". `error` renders
   *  inline (e.g. a transient failure sending the code) without losing the
   *  step — see file header. */
  | { kind: 'different-email'; error?: string }
  /** State 4, step 2: enter the code sent to `email`. `error` covers a bad/
   *  expired/exhausted code AND the two already-linked conflicts — all
   *  recoverable in place (retry the code, or go back and use another
   *  email), so none of them bounce out to the generic `error` phase. */
  | { kind: 'different-email-code'; email: string; error?: string }
  /** State 4, step 3 (terminal): `'linked'` — the service account at
   *  `email` is now linked; `'no_account'` — ownership was proven but
   *  there was nothing to link (nothing created, per the design's "rung 3
   *  only links existing accounts" rule). */
  | { kind: 'different-email-result'; status: 'linked' | 'no_account' }
  | { kind: 'error'; message: string };

export interface UseMuseIdEntryArgs {
  service: ServiceName;
  /** Adopts tokens into this service's own context (MuseHubContext.
   *  adoptTokens / AdieuContext.adoptTokens) — the caller passes its own
   *  service-context hook result through since this shared hook can't call
   *  useMuseHub()/useAdieu() itself (see file header). */
  adoptTokens: (tokens: MuseIdEntryTokens) => Promise<void>;
  /** Fully signs the caller out of this service — used by declineClaim
   *  when leaving an already-signed-in `settled` state for the
   *  different-email rung. */
  signOut: () => Promise<void>;
  /** Called once the flow reaches a finalized sign-in (state 1's silent
   *  exchange, or confirmClaim). The dialog closes itself. */
  onDone: () => void;
}

export interface UseMuseIdEntryResult {
  phase: MuseIdEntryPhase;
  /** The CTA handler — call from the "Continue with Muse ID" button. Runs
   *  DISCOVERY only; never links or creates anything by itself. */
  continueWithMuseId: () => Promise<void>;
  /** State 2's "Yes, that's me" action — THE consent moment for linking an
   *  email-matched account: re-calls the exchange with intent
   *  'link-existing', which is when the link is actually made. */
  confirmClaim: () => Promise<void>;
  /** "Not me" / "use a different account": from `confirm` this is pure
   *  navigation (nothing was linked); from `settled` it first signs back
   *  out of the just-entered service. Lands on state 4's first step. */
  declineClaim: () => Promise<void>;
  /** The choice card's "Create a new account" — THE consent moment for
   *  JIT-provisioning: re-calls the exchange with intent 'create'. */
  chooseCreate: () => Promise<void>;
  /** The choice card's "connect an existing account" — jumps to state 4's
   *  email step. Pure navigation. */
  chooseDifferentEmail: () => void;
  /** Resets to idle (e.g. a "back"/"try again" affordance on the error
   *  phase). */
  reset: () => void;
  /** State 4 step 1 -> 2: sends the link-by-email code to `email`. Always
   *  succeeds from the caller's perspective (anti-enumeration) unless the
   *  request itself fails, in which case the `different-email` phase's
   *  `error` is set and the phase doesn't advance. */
  startLinkByEmail: (email: string) => Promise<void>;
  /** State 4 step 2 -> 3: checks `code` against `email`. Advances to
   *  `different-email-result` on success; on a bad code or an already-
   *  linked conflict, sets `different-email-code`'s `error` and stays put
   *  so the user can retry the code without re-entering the email. */
  verifyLinkByEmail: (email: string, code: string) => Promise<void>;
  /** State 4 step 2 -> 1: "use a different email" — back to the email
   *  field, discarding the in-flight code attempt. */
  backToEmailStep: () => void;
}

export function useMuseIdEntry({
  service,
  adoptTokens,
  signOut,
  onDone,
}: UseMuseIdEntryArgs): UseMuseIdEntryResult {
  const museId = useMuseId();
  const [phase, setPhase] = useState<MuseIdEntryPhase>({ kind: 'idle' });

  const runExchange = useCallback(
    (museAccessToken: string, intent?: MuseExchangeIntent): Promise<ServiceExchangeResult> =>
      service === 'moose-hub'
        ? exchangeMooseHub(museAccessToken, intent)
        : exchangeAdieu(museAccessToken, intent),
    [service],
  );

  /** Shared commit half: exchange with an explicit intent, adopt, land. */
  const commitWithIntent = useCallback(
    async (intent: MuseExchangeIntent) => {
      setPhase({ kind: 'exchanging' });
      const museAccessToken = getMuseAccessToken();
      if (!museAccessToken) throw new Error('Not signed in to Muse ID');
      const result = await runExchange(museAccessToken, intent);
      if (!isExchangeSignedIn(result)) {
        // A commit always mints tokens on success — a pending shape here is
        // a server-contract violation, not a user-recoverable state.
        throw new Error('Exchange did not complete');
      }
      await adoptTokens(exchangeResultToTokens(result));
      await museId.hydrate();
      if (intent === 'link-existing') {
        onDone();
        return;
      }
      setPhase({ kind: 'settled', wasKnownNew: result.accountStatus === 'created' });
    },
    [runExchange, adoptTokens, museId, onDone],
  );

  const continueWithMuseId = useCallback(async () => {
    try {
      if (!museId.signedIn) {
        try {
          await museId.ensureSignedIn('sign-in');
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

      // Discovery — read-only on the RP. Tokens come back ONLY for an
      // already-linked Muse ID.
      const result = await runExchange(museAccessToken);

      if (!isExchangeSignedIn(result)) {
        if (result.accountStatus === 'email-match') {
          setPhase({ kind: 'confirm', display: result.display });
        } else {
          setPhase({ kind: 'choose' });
        }
        return;
      }

      // Already linked: zero prompts (state 1). An absent accountStatus
      // (mock/RP-shape drift) degrades to the neutral settled copy.
      await adoptTokens(exchangeResultToTokens(result));
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
    try {
      await commitWithIntent('link-existing');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setPhase({ kind: 'error', message });
    }
  }, [commitWithIntent]);

  const chooseCreate = useCallback(async () => {
    try {
      await commitWithIntent('create');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setPhase({ kind: 'error', message });
    }
  }, [commitWithIntent]);

  const chooseDifferentEmail = useCallback(() => setPhase({ kind: 'different-email' }), []);

  const declineClaim = useCallback(async () => {
    try {
      // From `confirm` there is nothing to reverse — discovery linked
      // nothing (the consent contract). From `settled` the user IS signed
      // in to the service (they just entered it), so leaving for the
      // different-email rung signs that session back out first.
      if (phase.kind === 'settled') {
        try {
          await museId.unlinkService(service);
        } catch {
          // Best-effort — MuseIdContext.unlinkService already tolerates a
          // failed RP-side clear.
        }
        await signOut();
      }
      setPhase({ kind: 'different-email' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setPhase({ kind: 'error', message });
    }
  }, [phase.kind, museId, service, signOut]);

  const reset = useCallback(() => setPhase({ kind: 'idle' }), []);

  const startLinkByEmail = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      try {
        await museId.linkByEmailStart(service, trimmed);
        setPhase({ kind: 'different-email-code', email: trimmed });
      } catch (err) {
        const message =
          err instanceof MuseIdAuthError || err instanceof Error ? err.message : 'Something went wrong.';
        setPhase({ kind: 'different-email', error: message });
      }
    },
    [museId, service],
  );

  const verifyLinkByEmail = useCallback(
    async (email: string, code: string) => {
      try {
        const status = await museId.linkByEmailVerify(service, email, code.trim());
        setPhase({ kind: 'different-email-result', status });
      } catch (err) {
        setPhase({ kind: 'different-email-code', email, error: friendlyLinkByEmailError(err) });
      }
    },
    [museId, service],
  );

  const backToEmailStep = useCallback(() => setPhase({ kind: 'different-email' }), []);

  return {
    phase,
    continueWithMuseId,
    confirmClaim,
    declineClaim,
    chooseCreate,
    chooseDifferentEmail,
    reset,
    startLinkByEmail,
    verifyLinkByEmail,
    backToEmailStep,
  };
}

// Friendly copy for the rung-3 codes muse-id's `/api/link/verify` defines
// (see muse-id-client.ts's `linkVerify` doc comment) — kept service-neutral
// since this hook is shared between MuseHub and audio.com. Exported so
// MuseIdAccountsPage's own rung-3 UI (task 5.4, same task — Preferences ->
// Accounts, which drives MuseIdContext.linkByEmailStart/linkByEmailVerify
// directly rather than through this hook) doesn't need a second copy of
// the same mapping.
export function friendlyLinkByEmailError(err: unknown): string {
  const code = err instanceof MuseIdAuthError ? err.code : '';
  switch (code) {
    case 'code_invalid':
      return 'That code doesn’t match. Check your email and try again.';
    case 'code_expired':
      return 'That code has expired. Request a new one.';
    case 'too_many_attempts':
      return 'Too many wrong attempts. Request a new code to try again.';
    case 'user_already_linked':
      return 'Your Muse ID already has a different account linked for this service.';
    case 'service_account_already_linked':
      return 'That account is already linked to a different Muse ID.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong.';
  }
}
