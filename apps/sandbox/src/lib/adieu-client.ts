// Client for the adieu backend (http://localhost:3001 by default).
//
// adieu handles cloud project storage (with thumbnails) for the Audacity web
// demo. It runs as a separate service from moose-hub: the user signs in to
// each independently (different accounts, different tokens, different
// localStorage keys), mirroring how a DAW user would sign in to MuseHub and
// audio.com separately in real life.
//
// Patterns mirror musehub-client.ts: token storage in localStorage, refresh
// on 401, typed wrappers around the REST API. adieu's auth surface is the
// same first-party password-grant + bearer + refresh trio, so the client
// shape is intentionally familiar.
//
// Sign-in is browser-first (authorization code + PKCE against adieu's
// /authorize, like muse-id and moose-hub); the direct-token grant below is
// retained for the legacy in-app dialog path and for tests.

import { APP_BASE_PATH, oauthCallbackUri } from './appBase';

const ADIEU_BASE_URL: string =
  (import.meta.env.VITE_ADIEU_BASE_URL as string | undefined) ??
  'http://localhost:3001';

const CLIENT_ID = 'audacity-web-demo';

const ADIEU_TOKENS_KEY = 'adieu-tokens-v1';

// ---- Types ----------------------------------------------------------------

export interface AdieuTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. Informational only — refresh is reactive (on 401). */
  expiresAt: number;
}

export interface AdieuUserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface AdieuProjectSummary {
  id: string;
  title: string;
  thumbnailUrl?: string;
  updatedAt: string;
}

export interface AdieuProject extends AdieuProjectSummary {
  data: unknown;
}

// ---- Token storage --------------------------------------------------------

function readTokens(): AdieuTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADIEU_TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdieuTokens;
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

function writeTokens(tokens: AdieuTokens): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADIEU_TOKENS_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADIEU_TOKENS_KEY);
}

export function hasToken(): boolean {
  return readTokens() !== null;
}

/**
 * Adopts tokens obtained elsewhere (e.g. a Muse ID `/api/auth/muse-exchange`
 * response) as this client's own signed-in session — writes them to the
 * same store `directLogin`/`directSignup` would, so every downstream
 * behavior (`fetchWithAuth`, refresh-on-401, `hasToken`) is identical to a
 * native adieu sign-in. Purely additive: it's just `writeTokens` under a
 * name that documents the calling context; no existing auth path is
 * touched.
 */
export function adoptTokens(tokens: AdieuTokens): void {
  writeTokens(tokens);
}

/** Current adieu access token, if signed in — used by Muse ID's session-
 *  proof linking (the "found your accounts" step lets you link this service
 *  via your live legacy session instead of re-verifying by email). Reading
 *  this token client-side is not itself a trust boundary: the RP validates
 *  it server-side during the muse-exchange/link call before honoring it. */
export function getAccessToken(): string | null {
  return readTokens()?.accessToken ?? null;
}


// ---- Browser-first sign-in (authorization code + PKCE) --------------------
//
// Mirrors muse-id-client.ts's browser-first flow: the app opens adieu's
// hosted /authorize in the system browser (Electron: RFC 8252 loopback
// relay; web: a tab on the shared /oauth/callback route) and finishes the
// exchange when the code arrives back in this window. States are prefixed
// 'adu.' so OAuthCallback.tsx can route a multi-provider return to the
// right client; a sessionStorage pending marker is the belt to that
// suspender, exactly like muse-id's. Per the established convention the
// client files don't import each other, so the PKCE helpers are this
// file's own copies.

const OAUTH_VERIFIER_KEY = 'adieu-oauth-verifier';
const OAUTH_STATE_KEY = 'adieu-oauth-state';
const OAUTH_PENDING_KEY = 'adieu-oauth-pending';

export const ADIEU_STATE_PREFIX = 'adu.';

export function isAdieuOAuthState(state: string | null | undefined): boolean {
  return typeof state === 'string' && state.startsWith(ADIEU_STATE_PREFIX);
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

interface ElectronOAuthBridgeLite {
  callbackOrigin: string | null;
}

function adieuBrowserRedirectUri(): string {
  // Same reasoning as muse-id-client's browserRedirectUri: under Electron
  // the system browser must land on the loopback relay's 127.0.0.1 origin
  // (registered adieu-side as an any-port template), not the renderer's.
  const bridge =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { electronOAuth?: ElectronOAuthBridgeLite }).electronOAuth;
  if (bridge?.callbackOrigin) {
    return `${bridge.callbackOrigin}${APP_BASE_PATH}oauth/callback`;
  }
  return oauthCallbackUri();
}

/** postMessage type for adieu returns relayed from /oauth/callback popups —
 *  the adieu twin of MUSE_ID_CALLBACK_MESSAGE_TYPE. */
export const ADIEU_CALLBACK_MESSAGE_TYPE = 'adieu-oauth-callback';

export interface AdieuCallbackMessage {
  type: typeof ADIEU_CALLBACK_MESSAGE_TYPE;
  code?: string;
  state?: string;
  error?: string;
}

export interface AdieuCallbackPayload {
  code?: string;
  state?: string;
  error?: string;
}

interface ElectronOAuthBridgeFull extends ElectronOAuthBridgeLite {
  onCallback: (cb: (payload: AdieuCallbackPayload) => void) => () => void;
}

/** The Electron loopback relay bridge, when running in the desktop shell.
 *  Provider-agnostic on the main-process side: every loopback return is
 *  relayed, and listeners discriminate by their own stashed state. */
export function adieuElectronOAuth(): ElectronOAuthBridgeFull | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { electronOAuth?: ElectronOAuthBridgeFull }).electronOAuth;
}

export type AdieuBrowserAuthIntent = 'sign-in' | 'sign-up';

/** Step 1: stash PKCE material + the pending marker, return the URL to open
 *  in a new browser context. 'sign-up' routes through adieu's /signup with
 *  the /authorize path as next, so a new user flows back into the code
 *  grant after creating the account. */
export async function beginBrowserAuthorize(intent: AdieuBrowserAuthIntent): Promise<string> {
  const verifier = randomBase64Url(32);
  const state = ADIEU_STATE_PREFIX + randomBase64Url(16);
  const challenge = await sha256Base64Url(verifier);

  window.sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(OAUTH_STATE_KEY, state);
  window.sessionStorage.setItem(OAUTH_PENDING_KEY, '1');

  const authorize = new URL('/authorize', ADIEU_BASE_URL);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', CLIENT_ID);
  authorize.searchParams.set('redirect_uri', adieuBrowserRedirectUri());
  authorize.searchParams.set('scope', 'profile projects:write');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  if (intent === 'sign-up') {
    const signup = new URL('/signup', ADIEU_BASE_URL);
    signup.searchParams.set('next', authorize.pathname + authorize.search);
    return signup.toString();
  }
  return authorize.toString();
}

/** True when the current /oauth/callback hit belongs to an adieu
 *  browser-first flow started in this tab. */
export function isBrowserAuthorizePending(): boolean {
  return window.sessionStorage.getItem(OAUTH_PENDING_KEY) === '1';
}

/** Clears the stashed PKCE material without exchanging — for early-failure
 *  paths in OAuthCallback.tsx; completeBrowserAuthorize clears internally
 *  on every path it reaches. */
export function clearBrowserAuthorizeState(): void {
  window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
  window.sessionStorage.removeItem(OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
}

/** Step 2: verify state, exchange code + verifier for adieu tokens, write
 *  them. Clears the stash first regardless of outcome — the code is
 *  single-use server-side either way. */
export async function completeBrowserAuthorize(code: string, returnedState: string): Promise<void> {
  const expectedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = window.sessionStorage.getItem(OAUTH_VERIFIER_KEY);
  clearBrowserAuthorizeState();

  if (!expectedState || returnedState !== expectedState) {
    throw makeAuthError('oauth_state_mismatch', 'OAuth state mismatch');
  }
  if (!verifier) {
    throw makeAuthError('oauth_missing_verifier', 'Missing PKCE verifier');
  }

  const res = await fetch(`${ADIEU_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: adieuBrowserRedirectUri(),
      code_verifier: verifier,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw makeAuthError((data as { error?: string }).error ?? 'exchange_failed');
  }
  const tokens = data as { access_token: string; refresh_token: string; expires_in: number };
  writeTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
}

// ---- First-party direct auth ---------------------------------------------

interface DirectTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  user: { id: string; email: string; name: string };
}

interface DirectAuthError extends Error {
  code: string;
}

function makeAuthError(code: string, message?: string): DirectAuthError {
  const e = new Error(message ?? code) as DirectAuthError;
  e.code = code;
  return e;
}

async function directAuth(body: Record<string, string>): Promise<DirectTokenResponse> {
  const res = await fetch(`${ADIEU_BASE_URL}/api/auth/direct-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `include` so the browser stores adieu's Set-Cookie response under the
    // adieu origin. When the user later opens adieu.com directly, that cookie
    // is sent and they land already-signed-in ("View on web" pattern).
    credentials: 'include',
    body: JSON.stringify({ client_id: CLIENT_ID, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw makeAuthError(
      (data as { error?: string }).error ?? 'auth_failed',
      (data as { error_description?: string }).error_description,
    );
  }
  const tokens = data as DirectTokenResponse;
  writeTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  return tokens;
}

/** Sign in with email + password as a first-party client. Writes tokens on success. */
export function directLogin(email: string, password: string): Promise<DirectTokenResponse> {
  return directAuth({ mode: 'signin', email, password });
}

/** Create an account + sign in in a single round-trip. Writes tokens on success. */
export function directSignup(
  email: string,
  password: string,
  name: string,
): Promise<DirectTokenResponse> {
  return directAuth({ mode: 'signup', email, password, name });
}

/**
 * Per-surface sign-out: revokes this client's refresh token on the server and
 * clears local state. Does NOT touch the adieu.com browser session cookie —
 * that's an independent session, matching how desktop apps and their web
 * counterparts work (Dropbox, Spotify, Slack, etc.).
 */
export async function logout(): Promise<void> {
  const tokens = readTokens();
  if (tokens) {
    try {
      await fetch(`${ADIEU_BASE_URL}/api/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokens.refreshToken }),
      });
    } catch {
      // Network failure on revoke is non-fatal — the local clear still
      // signs the user out of this client.
    }
  }
  clearTokens();
}

/**
 * Clears this service's side of the Muse ID join column (`User.museId`).
 * Bearer-authenticated as the adieu user — does NOT touch muse-id's own
 * `LinkedAccount` row; that's a separate call the caller makes to muse-id's
 * `/api/unlink`. Idempotent server-side (unlinking an already-unlinked
 * account is still a clean 200).
 */
export async function museUnlink(): Promise<void> {
  const res = await fetchWithAuth('/api/auth/muse-unlink', { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Muse unlink failed: ${res.status}`);
  }
}

async function refreshTokens(): Promise<AdieuTokens | null> {
  const current = readTokens();
  if (!current) return null;

  const res = await fetch(`${ADIEU_BASE_URL}/api/oauth/token`, {
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
  const updated: AdieuTokens = {
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

  const url = path.startsWith('http') ? path : `${ADIEU_BASE_URL}${path}`;
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
    await logout();
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

// ---- Typed API ------------------------------------------------------------

export function getUserInfo(): Promise<AdieuUserInfo> {
  return getJson<AdieuUserInfo>('/api/oauth/userinfo');
}

export function listProjects(): Promise<{ projects: AdieuProjectSummary[] }> {
  return getJson<{ projects: AdieuProjectSummary[] }>('/api/projects');
}

export function getProject(id: string): Promise<AdieuProject> {
  return getJson<AdieuProject>(`/api/projects/${encodeURIComponent(id)}`);
}

/**
 * Upsert a project by id. adieu uses PUT for upsert (creates if id is new,
 * overwrites if it exists); POST /api/projects is reserved for server-id
 * create when the client doesn't yet have an id to commit to.
 */
export async function saveProject(
  id: string,
  body: { title: string; data: unknown; thumbnailDataUrl?: string },
): Promise<AdieuProject> {
  const res = await fetchWithAuth(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Save failed: ${res.status}`);
  }
  return (await res.json()) as AdieuProject;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetchWithAuth(
    `/api/projects/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}

/** Build a full URL for a relative adieu asset path (e.g. a thumbnail). */
export function assetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${ADIEU_BASE_URL}${path}`;
}

export const ADIEU_BASE = ADIEU_BASE_URL;
