// Client for the moose-hub backend (http://localhost:3000 by default).
//
// Handles OAuth 2.0 + PKCE login, token storage, refresh-on-401, and typed
// wrappers around the moose-hub REST API.
//
// Tokens live in localStorage under MUSEHUB_TOKENS_KEY; the OAuth dance uses
// sessionStorage for the per-attempt verifier and state. Both are acceptable
// for a prototype but should be hardened (HttpOnly cookies, server-side
// session) for production.

const MUSEHUB_BASE_URL: string =
  (import.meta.env.VITE_MUSEHUB_BASE_URL as string | undefined) ??
  'http://localhost:3000';

const CLIENT_ID = 'audacity-web-demo';
const SCOPE = 'profile projects:write library:read wallet:write';

const MUSEHUB_TOKENS_KEY = 'musehub-tokens-v1';
const OAUTH_VERIFIER_KEY = 'musehub-oauth-verifier';
const OAUTH_STATE_KEY = 'musehub-oauth-state';

// ---- Types ----------------------------------------------------------------

export interface MuseHubTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. Informational only — refresh is reactive (on 401). */
  expiresAt: number;
}

export interface MuseHubUserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface MuseHubWallet {
  balanceCents: number;
}

export interface MuseHubEntitlement {
  pluginId: string;
  name: string;
  vendor: string;
  category?: string;
  purchasedAt: string;
}

export interface MuseHubLibrary {
  entitlements: MuseHubEntitlement[];
}

export interface MuseHubPlugin {
  id: string;
  name: string;
  vendor: string;
  category: string;
  priceCents: number;
  color?: string;
  blurb?: string;
}

export interface MuseHubProjectSummary {
  id: string;
  title: string;
  thumbnailUrl?: string;
  updatedAt: string;
}

export interface MuseHubProject extends MuseHubProjectSummary {
  data: unknown;
}

// ---- Token storage --------------------------------------------------------

function readTokens(): MuseHubTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MUSEHUB_TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MuseHubTokens;
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

function writeTokens(tokens: MuseHubTokens): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MUSEHUB_TOKENS_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(MUSEHUB_TOKENS_KEY);
}

export function hasToken(): boolean {
  return readTokens() !== null;
}

// ---- PKCE helpers ---------------------------------------------------------

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

// ---- First-party direct auth ---------------------------------------------

interface DirectTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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
  const res = await fetch(`${MUSEHUB_BASE_URL}/api/auth/direct-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `include` so the browser stores moose-hub's Set-Cookie response under
    // the moose-hub origin. When the user later opens moose-hub.com directly,
    // that cookie is sent and they land already-signed-in ("View on web"
    // pattern).
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

// ---- OAuth (authorization code + PKCE) ------------------------------------
// Retained for non-first-party clients that need the full OAuth dance.

const AUTH_MESSAGE_TYPE = 'moosehub-auth';

export class SignInCancelledError extends Error {
  constructor() {
    super('sign_in_cancelled');
    this.name = 'SignInCancelledError';
  }
}

export interface AuthorizeFlow {
  /** URL to load (in an iframe or new window) to drive the OAuth dance. */
  authorizeUrl: string;
  /**
   * Call with the code+state received from the callback page (via postMessage
   * or otherwise). Resolves once tokens are exchanged and written to local
   * storage. Throws on PKCE mismatch or token-exchange failure.
   */
  complete: (code: string, returnedState: string) => Promise<void>;
}

/**
 * Begin a PKCE-protected authorization-code flow. The caller is responsible
 * for presenting `authorizeUrl` to the user (typically by loading it in an
 * iframe inside an in-app modal) and for relaying the code+state from the
 * callback page back to `complete()`.
 *
 * The PKCE verifier never leaves this window's memory — `complete()` closes
 * over it, so iframes/popups can't see it even if they share sessionStorage.
 */
export async function startAuthorize(): Promise<AuthorizeFlow> {
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(16);
  const challenge = await sha256Base64Url(verifier);

  // Also stash in sessionStorage so a top-level callback page (the bookmark
  // fallback) can recover them on reload.
  window.sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const redirectUri = `${window.location.origin}/oauth/callback`;
  const url = new URL(`${MUSEHUB_BASE_URL}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return {
    authorizeUrl: url.toString(),
    complete: async (code, returnedState) => {
      if (returnedState !== state) throw new Error('OAuth state mismatch');
      window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
      window.sessionStorage.removeItem(OAUTH_STATE_KEY);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });
      const res = await fetch(`${MUSEHUB_BASE_URL}/api/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Token exchange failed (${res.status}): ${text}`);
      }
      const tokens = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      writeTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      });
    },
  };
}

/** Message shape posted from the callback page to its embedder. */
export interface AuthCallbackMessage {
  type: typeof AUTH_MESSAGE_TYPE;
  code?: string;
  state?: string;
  error?: string;
}

export const AUTH_CALLBACK_MESSAGE_TYPE = AUTH_MESSAGE_TYPE;

/**
 * Called from the /oauth/callback page when moose-hub redirects back.
 *
 * Detects whether we're inside an iframe (`window.parent !== window`) or a
 * popup (`window.opener`). In either case, postMessage the code+state back
 * to the embedder — the embedder holds the PKCE verifier and does the token
 * exchange.
 *
 * If neither parent nor opener is present (top-level navigation, e.g. the
 * user bookmarked the callback URL), we fall back to exchanging here using
 * the verifier from sessionStorage, then navigate to "/".
 */
export async function handleCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const error = params.get('error');

  const embedder: Window | null =
    window.parent && window.parent !== window
      ? window.parent
      : window.opener && window.opener !== window
        ? window.opener
        : null;

  if (embedder) {
    const payload: AuthCallbackMessage = error
      ? { type: AUTH_MESSAGE_TYPE, error }
      : { type: AUTH_MESSAGE_TYPE, code: code ?? undefined, state: returnedState ?? undefined };
    embedder.postMessage(payload, window.location.origin);
    // For popup mode only — iframes ignore close().
    try { window.close(); } catch { /* swallow */ }
    return;
  }

  // Top-level fallback: do the exchange here using the verifier we stashed
  // before navigating. This handles bookmarked callback URLs / reloads.
  if (error) throw new Error(`OAuth error: ${error}`);
  if (!code || !returnedState) throw new Error('Missing code or state in callback URL');

  const expectedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = window.sessionStorage.getItem(OAUTH_VERIFIER_KEY);
  window.sessionStorage.removeItem(OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY);

  if (!expectedState || returnedState !== expectedState) throw new Error('OAuth state mismatch');
  if (!verifier) throw new Error('Missing PKCE verifier');

  const redirectUri = `${window.location.origin}/oauth/callback`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  const res = await fetch(`${MUSEHUB_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  writeTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  window.history.replaceState({}, '', '/');
}

/**
 * Per-surface sign-out: revokes this client's refresh token on the server and
 * clears local state. Does NOT touch the moose-hub.com browser session
 * cookie — that's an independent session, matching how desktop apps and
 * their web counterparts work (Dropbox, Spotify, Slack, etc.).
 */
export async function logout(): Promise<void> {
  const tokens = readTokens();
  if (tokens) {
    try {
      await fetch(`${MUSEHUB_BASE_URL}/api/oauth/revoke`, {
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

async function refreshTokens(): Promise<MuseHubTokens | null> {
  const current = readTokens();
  if (!current) return null;

  const res = await fetch(`${MUSEHUB_BASE_URL}/api/oauth/token`, {
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
  const updated: MuseHubTokens = {
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

  const url = path.startsWith('http') ? path : `${MUSEHUB_BASE_URL}${path}`;
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

async function postJson<T>(path: string, body: unknown): Promise<T> {
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

// ---- Typed API ------------------------------------------------------------

export function getUserInfo(): Promise<MuseHubUserInfo> {
  return getJson<MuseHubUserInfo>('/api/oauth/userinfo');
}

export function getWallet(): Promise<MuseHubWallet> {
  return getJson<MuseHubWallet>('/api/me/wallet');
}

export function spendWallet(
  amountCents: number,
  pluginId: string,
): Promise<MuseHubWallet> {
  return postJson<MuseHubWallet>('/api/me/wallet/spend', {
    amountCents,
    pluginId,
  });
}

export function getLibrary(): Promise<MuseHubLibrary> {
  return getJson<MuseHubLibrary>('/api/me/library');
}

export function buyPlugin(
  pluginId: string,
): Promise<{ balanceCents: number; entitlement: MuseHubEntitlement }> {
  return postJson('/api/me/library', { pluginId });
}

export function getPlugins(): Promise<{ plugins: MuseHubPlugin[] }> {
  return getJson<{ plugins: MuseHubPlugin[] }>('/api/plugins');
}

export function listProjects(): Promise<{ projects: MuseHubProjectSummary[] }> {
  return getJson<{ projects: MuseHubProjectSummary[] }>('/api/projects');
}

export function getProject(id: string): Promise<MuseHubProject> {
  return getJson<MuseHubProject>(`/api/projects/${encodeURIComponent(id)}`);
}

export function saveProject(
  id: string,
  body: { title: string; data: unknown; thumbnailDataUrl?: string },
): Promise<MuseHubProject> {
  return postJson<MuseHubProject>(
    `/api/projects/${encodeURIComponent(id)}`,
    body,
  );
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

/** Build a full URL for a relative moose-hub asset path (e.g. a thumbnail). */
export function assetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${MUSEHUB_BASE_URL}${path}`;
}

export const MUSEHUB_BASE = MUSEHUB_BASE_URL;
