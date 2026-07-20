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

import { MUSEHUB_BASE } from './musehub-client';
import { ADIEU_BASE } from './adieu-client';

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
  /** Task 5.3: lets "Continue with Muse ID" (AuthDialog.tsx /
   *  AdieuAuthDialog.tsx) tell a fresh JIT-provisioned account apart from
   *  one matched by email — the design spec's "confirm before claiming"
   *  rule for recognition cards requires knowing which happened. 'linked'
   *  = the caller was already linked (should not normally reach the
   *  client in the not-linked CTA flow, but included for completeness).
   *  KNOWN GAP: the real moose-hub/adieu `/api/auth/muse-exchange` routes
   *  do not send `accountStatus`/`display` yet (verified against
   *  ~/Documents/webdev/{moose-hub,adieu}/app/api/auth/muse-exchange/
   *  route.ts, 2026-07-20) — only museIdMock.ts populates them today, so
   *  both fields MUST be treated as optional/absent-safe by every caller.
   *  Follow-up: add the same discriminator + `display` (reusing each RP's
   *  existing maskEmail/summary helpers from task 5.2's
   *  /api/internal/lookup) to the real exchange route, in a dedicated
   *  task against those repos. */
  accountStatus?: 'linked' | 'email_match' | 'created';
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

export const MUSEID_BASE = MUSEID_BASE_URL;
