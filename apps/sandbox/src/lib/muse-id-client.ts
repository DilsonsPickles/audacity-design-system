// Client for the muse-id backend (http://localhost:3002 by default).
//
// muse-id is the neutral identity provider both moose-hub and adieu link
// into (docs/superpowers/specs/2026-07-13-muse-id-sso-design.md). Unlike
// those two services, Muse ID's own tokens are never used to call moose-hub
// or adieu APIs directly — each service exchanges a Muse access token for
// its OWN opaque token pair via `POST /api/auth/muse-exchange`. This module
// owns both halves: the muse-id auth/profile/link surface, AND the two
// services' muse-exchange/muse-unlink callers (they're one-shot, unauthed-
// by-muse-id-bearer calls that don't warrant their own client files).
//
// Patterns mirror musehub-client.ts / adieu-client.ts: token storage in
// localStorage, refresh-on-401, typed wrappers around the REST API.
//
// credentials: 'include' on start/verify/complete ONLY — those three steps
// share a caller-binding session cookie server-side (verify sets it,
// complete requires it to prove the same browser that verified the code is
// the one completing the signup). signin/link/unlink/token/revoke don't
// participate in that handoff, so they don't need it.

import { MUSEHUB_BASE, adoptTokens as museHubAdoptTokens } from './musehub-client';
import { ADIEU_BASE, adoptTokens as adieuAdoptTokens } from './adieu-client';
import { toast } from '@dilsonspickles/components';

const MUSEID_BASE_URL: string =
  (import.meta.env.VITE_MUSEID_BASE_URL as string | undefined) ??
  'http://localhost:3002';

const CLIENT_ID = 'audacity-web-demo';

const MUSEID_TOKENS_KEY = 'muse-id-tokens-v1';

// ---- Types ------------------------------------------------------------

export type ServiceName = 'moose-hub' | 'adieu';

export interface MuseIdTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. Informational only — refresh is reactive (on 401). */
  expiresAt: number;
}

export interface MuseIdUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface MuseIdUserInfo {
  sub: string;
  email: string;
  name: string;
  avatarUrl?: string;
  linkedServices: ServiceName[];
}

export interface DiscoveryDisplay {
  name: string;
  summary: string;
}

export interface DiscoveryEntry {
  service: ServiceName;
  userId: string;
  display: DiscoveryDisplay;
}

interface TokenBundle {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/** `/api/auth/verify` result. `'new'` carries discovery, no tokens are
 *  minted. `'reset'` is the password-reset path (Task 1.4 — an existing
 *  Muse ID's code was correct AND a new password was supplied) and DOES
 *  mint tokens, signing the caller in immediately. */
export type VerifyResult =
  | { status: 'new'; discovery: DiscoveryEntry[] }
  | ({ status: 'reset'; user: MuseIdUser } & TokenBundle);

export interface CompleteInput {
  email: string;
  name: string;
  password: string;
  avatarChoice?: string;
  links?: { service: ServiceName; method: 'email-match' | 'session'; legacy_access_token?: string }[];
}

export interface CompleteResult extends TokenBundle {
  user: MuseIdUser;
  /** Services muse-id itself linked server-side (email-match links only —
   *  session-proof links are established client-side via the exchange
   *  call's `legacy_access_token`, see exchangeMooseHub/exchangeAdieu). */
  linkedServices: ServiceName[];
}

export interface SignInResult extends TokenBundle {
  user: MuseIdUser;
}

export interface ServiceExchangeResult extends TokenBundle {
  user: { id: string; email: string; name: string };
  /** Task 5.3 (fixed in the 5.3 review follow-up, 2026-07-20): lets
   *  "Continue with Muse ID" (AuthDialog.tsx / AdieuAuthDialog.tsx) tell
   *  which of the four server-side resolution rungs fired — the design
   *  spec's "confirm before claiming" rule for recognition cards requires
   *  knowing whether this was a same-email match, not just that SOME
   *  account was resolved. Mirrors moose-hub's/adieu's `/api/auth/
   *  muse-exchange` route.ts resolution order 1:1:
   *   - 'linked' — (a) existing museId match; caller was already linked.
   *     Zero-prompt exchange (useMuseIdEntry's state 1).
   *   - 'linked-by-session' — (b) a `legacy_access_token` proved a live
   *     legacy session; the RP adopted that user. Not reachable from
   *     useMuseIdEntry's CTA today (it never sends legacy_access_token —
   *     see continueWithMuseId), only from MuseIdContext's signup-time
   *     session-proof links; included for type completeness/correctness.
   *   - 'matched-by-email' — (c) verified email matched an existing,
   *     not-yet-linked account. Confirm-before-claiming card (state 2).
   *   - 'created' — (d) JIT-provisioned a brand-new account. Stated
   *     plainly, no confirm (state 3).
   *  Both moose-hub and adieu now send this field on every response
   *  (verified against ~/Documents/webdev/{moose-hub,adieu}/app/api/auth/
   *  muse-exchange/route.ts, 2026-07-20) — no longer optional in practice,
   *  but kept optional in the type since museIdMock.ts and any future
   *  RP-shape drift shouldn't be a hard client-side assumption. */
  accountStatus?: 'linked' | 'linked-by-session' | 'matched-by-email' | 'created';
  display?: { name: string; maskedEmail: string; summary: string };
}

export class MuseIdAuthError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'MuseIdAuthError';
  }
}

// ---- Token storage ------------------------------------------------------

function readTokens(): MuseIdTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MUSEID_TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MuseIdTokens;
    if (
      typeof parsed?.accessToken === 'string' &&
      typeof parsed?.refreshToken === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: MuseIdTokens): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MUSEID_TOKENS_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(MUSEID_TOKENS_KEY);
}

export function hasToken(): boolean {
  return readTokens() !== null;
}

/** Local-only rollback: clears the muse token store WITHOUT calling the
 *  server-side revoke endpoint (contrast `logout()` below, which is a
 *  deliberate user-initiated sign-out and appropriately revokes
 *  server-side too). Task 6.4 review Bug 2: OAuthCallback.tsx's
 *  handleMuseIdCallback writes muse tokens on a successful code exchange,
 *  then awaits getUserInfo() to establish the session/profile. If THAT
 *  throws, the tokens are still technically valid (the fault is in
 *  establishing the session, not the tokens themselves) but the UI is about
 *  to show "Sign-in failed" — so `hasToken()` must go back to false or the
 *  app is incoherent (error shown, yet signed in on next load). This is the
 *  "clear-tokens/sign-out-local path" that fix calls for. */
export function clearLocalSession(): void {
  clearTokens();
}

/** Current Muse ID access token, if signed in — used by the service
 *  AuthDialogs' "Continue with Muse ID" CTA (task 5.3) to call
 *  exchangeMooseHub/exchangeAdieu directly, without going through
 *  MuseIdContext's own sign-in flows. Mirrors musehub-client.ts's/
 *  adieu-client.ts's getAccessToken. */
export function getAccessToken(): string | null {
  return readTokens()?.accessToken ?? null;
}

function tokensFromBundle(bundle: TokenBundle): MuseIdTokens {
  return {
    accessToken: bundle.access_token,
    refreshToken: bundle.refresh_token,
    expiresAt: Date.now() + bundle.expires_in * 1000,
  };
}

// ---- Auth surface ---------------------------------------------------------

async function postJsonPublic<T>(
  path: string,
  body: unknown,
  opts: { credentials?: RequestCredentials } = {},
): Promise<T> {
  const res = await fetch(`${MUSEID_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: opts.credentials,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new MuseIdAuthError(
      (data as { error?: string }).error ?? 'muse_id_request_failed',
    );
  }
  return data as T;
}

/** Step 1 of sign-up: sends (or mocks) a 6-digit code. Always `{ok:true}` —
 *  anti-enumeration, identical response whether the email is known or not. */
export function start(email: string): Promise<{ ok: true }> {
  return postJsonPublic('/api/auth/start', { email }, { credentials: 'include' });
}

/** Step 2: checks the code. For a brand-new email, returns discovery
 *  (linkable service accounts found by email). For an existing Muse ID,
 *  the code alone is no longer sufficient (Task 1.4) — pass
 *  `{ purpose: 'reset', password }` to reset the password and sign in;
 *  omitting it 400s `password_required`. */
export async function verify(
  email: string,
  code: string,
  reset?: { password: string },
): Promise<VerifyResult> {
  const body: Record<string, string> = { email, code };
  if (reset) {
    body.purpose = 'reset';
    body.password = reset.password;
  }
  const result = await postJsonPublic<VerifyResult>(
    '/api/auth/verify',
    body,
    { credentials: 'include' },
  );
  if (result.status === 'reset') writeTokens(tokensFromBundle(result));
  return result;
}

/** Step 3: creates the Muse ID (requires the session cookie `verify` set
 *  for this email — the caller-binding handoff). Writes tokens on success. */
export async function complete(input: CompleteInput): Promise<CompleteResult> {
  const result = await postJsonPublic<CompleteResult>(
    '/api/auth/complete',
    input,
    { credentials: 'include' },
  );
  writeTokens(tokensFromBundle(result));
  return result;
}

/** Routine sign-in for an existing Muse ID (email + password, no code). */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const result = await postJsonPublic<SignInResult>('/api/auth/signin', {
    client_id: CLIENT_ID,
    email,
    password,
  });
  writeTokens(tokensFromBundle(result));
  return result;
}

async function refreshTokens(): Promise<MuseIdTokens | null> {
  const current = readTokens();
  if (!current) return null;

  const res = await fetch(`${MUSEID_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: current.refreshToken,
    }),
  });
  if (!res.ok) return null;

  const next = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const updated: MuseIdTokens = {
    accessToken: next.access_token,
    refreshToken: next.refresh_token ?? current.refreshToken,
    expiresAt: Date.now() + next.expires_in * 1000,
  };
  writeTokens(updated);
  return updated;
}

/**
 * fetch wrapper that attaches the bearer token and transparently retries once
 * with a refreshed token on 401. A second 401 signs the user out and throws.
 */
export async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const tokens = readTokens();
  if (!tokens) throw new Error('Not signed in');

  const url = path.startsWith('http') ? path : `${MUSEID_BASE_URL}${path}`;
  const doFetch = (access: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${access}`,
      },
    });

  let res = await doFetch(tokens.accessToken);
  if (res.status !== 401) return res;

  const refreshed = await refreshTokens();
  if (!refreshed) {
    clearTokens();
    throw new Error('Session expired');
  }

  res = await doFetch(refreshed.accessToken);
  if (res.status === 401) {
    clearTokens();
    throw new Error('Session expired');
  }
  return res;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(path);
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function postJsonAuthed<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getUserInfo(): Promise<MuseIdUserInfo> {
  return getJson<MuseIdUserInfo>('/api/oauth/userinfo');
}

/** Session-proof / credential-proof linking after account creation (settings
 *  page, deferred "have an existing account?" prompts). muse-id verifies
 *  `legacyAccessToken` itself by calling the service's own userinfo. */
export function link(
  service: ServiceName,
  legacyAccessToken: string,
): Promise<{ ok: true; linked: boolean; service: ServiceName }> {
  return postJsonAuthed('/api/link', { service, legacy_access_token: legacyAccessToken });
}

/** Removes muse-id's own LinkedAccount row for `service`. Idempotent.
 *  Does NOT clear the service's own `museId` join column — call that
 *  service's own muse-unlink (museHubUnlink/adieuUnlink below) for that. */
export function unlink(service: ServiceName): Promise<{ ok: true }> {
  return postJsonAuthed('/api/unlink', { service });
}

/** Revokes the muse-id refresh token and clears the local store. Does NOT
 *  touch moose-hub/adieu tokens — see MuseIdContext.signOutEverywhere for
 *  the all-three-stores sign-out. */
export async function logout(): Promise<void> {
  const tokens = readTokens();
  if (tokens) {
    try {
      await fetch(`${MUSEID_BASE_URL}/api/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: tokens.refreshToken,
          token_type_hint: 'refresh_token',
        }),
      });
    } catch {
      // Network failure on revoke is non-fatal — the local clear still
      // signs the user out of this client.
    }
  }
  clearTokens();
}

// ---- Relying-party exchange callers ---------------------------------------
//
// Each service exchanges a Muse access token for its own opaque token pair.
// These calls are NOT bearer-authenticated against muse-id (the muse access
// token travels in the JSON body, not an Authorization header) — the RP
// introspects it server-side via muse-id's S2S surface. `legacyAccessToken`
// is optional: when present, it's THAT service's own access token, used to
// prove a live legacy session for session-proof linking (the RP validates
// it itself — muse-id and the sandbox never assert a claim the RP doesn't
// independently verify).

async function exchange(
  baseUrl: string,
  museAccessToken: string,
  legacyAccessToken?: string,
): Promise<ServiceExchangeResult> {
  const res = await fetch(`${baseUrl}/api/auth/muse-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_access_token: museAccessToken,
      ...(legacyAccessToken ? { legacy_access_token: legacyAccessToken } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new MuseIdAuthError(
      (data as { error?: string }).error ?? 'exchange_failed',
    );
  }
  return data as ServiceExchangeResult;
}

export function exchangeMooseHub(
  museAccessToken: string,
  legacyAccessToken?: string,
): Promise<ServiceExchangeResult> {
  return exchange(MUSEHUB_BASE, museAccessToken, legacyAccessToken);
}

export function exchangeAdieu(
  museAccessToken: string,
  legacyAccessToken?: string,
): Promise<ServiceExchangeResult> {
  return exchange(ADIEU_BASE, museAccessToken, legacyAccessToken);
}

/** Converts a service-exchange response into the `{accessToken,
 *  refreshToken, expiresAt}` shape each service's own client's
 *  `adoptTokens` expects. */
export function exchangeResultToTokens(result: ServiceExchangeResult): {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} {
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + result.expires_in * 1000,
  };
}

/** Exchanges `museAccessToken` for each of `services`' own token pairs and
 *  writes them via that service's own client-level `adoptTokens` — NOT
 *  through React context. This exists for `OAuthCallback.tsx` (Task 6.4's
 *  browser-first DAW sign-in), which is deliberately rendered OUTSIDE every
 *  provider (see that file's header comment), so it has no
 *  MuseHubContext/AdieuContext to call. Writing straight to each client's
 *  localStorage store is exactly what the existing moose-hub-only
 *  `handleCallback` in musehub-client.ts already does — the redirect to "/"
 *  that follows remounts the provider tree, and each context's own
 *  mount-time `hydrate()` picks the freshly-written tokens up from there.
 *
 *  MuseIdContext.exchangeAndAdoptAll performs the analogous exchange, but
 *  through `museHub.adoptTokens`/`adieu.adoptTokens` (the context methods,
 *  which ALSO call that context's `hydrate()`) — required there because
 *  those callers run while the provider tree is already live-mounted, so
 *  React state must update immediately rather than waiting for a remount.
 *  The two call sites can't share one implementation for that reason; this
 *  is the plain, no-React-state counterpart.
 *
 *  Each service's exchange runs independently (a failure for one never
 *  blocks the other); returns the services that failed so the caller can
 *  decide how to surface that (a failed service exchange still lands the
 *  user signed in to Muse ID + whatever other service succeeded). */
export async function exchangeAndAdoptServices(
  museAccessToken: string,
  services: ServiceName[],
): Promise<ServiceName[]> {
  const failures: ServiceName[] = [];
  for (const service of services) {
    try {
      const result =
        service === 'moose-hub'
          ? await exchangeMooseHub(museAccessToken)
          : await exchangeAdieu(museAccessToken);
      const tokens = exchangeResultToTokens(result);
      if (service === 'moose-hub') museHubAdoptTokens(tokens);
      else adieuAdoptTokens(tokens);
    } catch {
      failures.push(service);
    }
  }
  return failures;
}

const SERVICE_ADOPT_FAILURE_KEY = 'muse-id-pending-service-adopt-failures';

const SERVICE_LABELS: Record<ServiceName, string> = {
  'moose-hub': 'MuseHub',
  adieu: 'audio.com',
};

/** Task 6.4 review Bug 1: OAuthCallback.tsx's handleMuseIdCallback calls
 *  exchangeAndAdoptServices above and, on a non-empty failures list, must
 *  tell the user rather than silently redirecting as if everything
 *  succeeded (the Muse sign-in itself DID succeed, so this is a non-fatal
 *  notice, not a rollback — contrast clearLocalSession/Bug 2 above, which
 *  IS a rollback, for a genuinely different failure). OAuthCallback.tsx
 *  then does `window.location.replace('/')`, a real navigation that wipes
 *  all in-memory state (including the toast singleton's queue) before the
 *  fresh page — and its toast — can render, so the notice has to survive
 *  the round-trip via sessionStorage. `notifyPendingServiceAdoptFailure`
 *  below, called once from App.tsx on mount, reads it back and shows the
 *  toast. Mirrors MuseIdContext.exchangeAndAdoptAll's own `setError`
 *  on failures for the in-app (non-redirect) counterpart. */
export function setPendingServiceAdoptFailureNotice(services: ServiceName[]): void {
  if (typeof window === 'undefined' || services.length === 0) return;
  window.sessionStorage.setItem(SERVICE_ADOPT_FAILURE_KEY, JSON.stringify(services));
}

/** Reads, clears, and surfaces (via `toast.warning`) the notice set by
 *  `setPendingServiceAdoptFailureNotice`, if any. Safe to call
 *  unconditionally on every app mount — a no-op when nothing is pending. */
export function notifyPendingServiceAdoptFailure(): void {
  if (typeof window === 'undefined') return;
  const raw = window.sessionStorage.getItem(SERVICE_ADOPT_FAILURE_KEY);
  window.sessionStorage.removeItem(SERVICE_ADOPT_FAILURE_KEY);
  if (!raw) return;

  let services: ServiceName[];
  try {
    services = JSON.parse(raw) as ServiceName[];
  } catch {
    return;
  }
  if (!Array.isArray(services) || services.length === 0) return;

  const names = services.map((s) => SERVICE_LABELS[s]).join(', ');
  toast.warning(
    'Signed in to Muse ID',
    `Couldn't connect: ${names} — try again from Accounts`,
  );
}

// ---- Browser-first OAuth (authorization code + PKCE) — Task 6.4 -----------
//
// The DAW's own sign-IN step can bounce the whole browser to muse-id's
// /authorize instead of the in-app email/password form (RFC 8252-style
// "browser-first" sign-in — see the design spec's "Auth surface" table and
// Phase 6's "DAW browser-first sign-in" paragraph). This is a genuine
// top-level navigation (`window.location.assign`), not an iframe/popup
// embed like musehub-client.ts's `startAuthorize` — so there is no
// in-memory closure that survives the navigation; the PKCE verifier and
// state live ONLY in sessionStorage, exactly like musehub-client.ts's own
// top-level-fallback branch of `handleCallback`.
//
// Distinguishing this return from moose-hub's OAuth return: both flows
// redirect back to the SAME sandbox route (`<origin>/oauth/callback`) with
// the same `?code&state` query shape — muse-id's `audacity-web-demo` OAuth
// client is seeded with that exact redirect_uri, and muse-id's
// `isAllowedRedirect` (lib/oauth/authorize.ts) requires a byte-exact match
// for non-loopback URIs, so the URL can't carry a distinguishing query
// param without breaking that check. The robust option is the sessionStorage
// marker below (`OAUTH_PENDING_KEY`): `isBrowserAuthorizePending()` is the
// FIRST thing OAuthCallback.tsx checks, before falling back to the existing
// moose-hub handling — moose-hub's own OAuth code (musehub-client.ts) never
// touches this key, so its absence unambiguously means "not a muse-id
// browser-first return."

const OAUTH_VERIFIER_KEY = 'muse-id-oauth-verifier';
const OAUTH_STATE_KEY = 'muse-id-oauth-state';
const OAUTH_PENDING_KEY = 'muse-id-oauth-pending';

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function browserRedirectUri(): string {
  return `${window.location.origin}/oauth/callback`;
}

/** Starts the browser-first sign-in: generates a PKCE verifier/challenge +
 *  random state, stashes them (plus the `OAUTH_PENDING_KEY` marker
 *  OAuthCallback.tsx checks) in sessionStorage, then navigates the whole
 *  window to muse-id's `/authorize`. There is no `complete()` closure to
 *  return, unlike musehub-client.ts's iframe-oriented `startAuthorize` — the
 *  caller unmounts on navigation. `completeBrowserAuthorize` below, called
 *  from OAuthCallback.tsx after the redirect back, finishes the exchange. */
export async function startBrowserAuthorize(): Promise<void> {
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(16);
  const challenge = await sha256Base64Url(verifier);

  window.sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(OAUTH_STATE_KEY, state);
  window.sessionStorage.setItem(OAUTH_PENDING_KEY, '1');

  const url = new URL('/authorize', MUSEID_BASE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', browserRedirectUri());
  url.searchParams.set('scope', 'profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(url.toString());
}

/** True when OAuthCallback.tsx should treat the current `/oauth/callback`
 *  hit as a muse-id browser-first return rather than moose-hub's — see the
 *  section header comment above for why this can't be a redirect_uri query
 *  param. */
export function isBrowserAuthorizePending(): boolean {
  return window.sessionStorage.getItem(OAUTH_PENDING_KEY) === '1';
}

/** Clears the sessionStorage entries `startBrowserAuthorize` wrote, without
 *  exchanging anything. Used by OAuthCallback.tsx on any early failure
 *  (an `error` query param, a missing code/state) so a stale marker can't
 *  wrongly claim a later top-level `/oauth/callback` hit — e.g. a
 *  bookmarked or reloaded callback URL. `completeBrowserAuthorize` below
 *  also calls this internally on every path (success or failure) it
 *  reaches, so callers only need this for the paths that never reach it. */
export function clearBrowserAuthorizeState(): void {
  window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
  window.sessionStorage.removeItem(OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
}

/** Step 2 of the browser-first flow: verifies `returnedState` against what
 *  `startBrowserAuthorize` stored, exchanges `code` + the stored PKCE
 *  verifier for muse tokens (`grant_type=authorization_code`), writes them,
 *  and returns them. Always clears the sessionStorage entries first — the
 *  authorization code is single-use server-side regardless of outcome, and
 *  the DAW's local markers shouldn't survive either a mismatch or a
 *  successful exchange. */
export async function completeBrowserAuthorize(
  code: string,
  returnedState: string,
): Promise<MuseIdTokens> {
  const expectedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = window.sessionStorage.getItem(OAUTH_VERIFIER_KEY);
  clearBrowserAuthorizeState();

  if (!expectedState || returnedState !== expectedState) {
    throw new MuseIdAuthError('oauth_state_mismatch', 'OAuth state mismatch');
  }
  if (!verifier) {
    throw new MuseIdAuthError('oauth_missing_verifier', 'Missing PKCE verifier');
  }

  const res = await fetch(`${MUSEID_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: browserRedirectUri(),
      code_verifier: verifier,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new MuseIdAuthError(
      (data as { error?: string }).error ?? 'exchange_failed',
    );
  }
  const tokens = tokensFromBundle(data as TokenBundle);
  writeTokens(tokens);
  return tokens;
}

export const MUSEID_BASE = MUSEID_BASE_URL;
