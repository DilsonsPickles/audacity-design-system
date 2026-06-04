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
// adieu does NOT expose the marketplace OAuth (/authorize + PKCE) flow here —
// the demo only ever uses the direct-token grant against adieu.

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
