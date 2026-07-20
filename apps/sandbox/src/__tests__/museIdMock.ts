// Network-boundary mock for muse-id + the two relying parties' Muse-related
// routes (moose-hub, adieu). Mirrors audioMock.ts's spirit — a small,
// self-contained fake standing in for infrastructure this repo doesn't own
// — but the boundary here is `fetch()` itself, not a package import: unlike
// '@audacity-ui/audio', muse-id-client.ts/musehub-client.ts/adieu-client.ts
// call `fetch` directly against hardcoded base URLs (localhost:3002/3000/
// 3001, the same defaults the real services use), so stubbing global fetch
// IS the network boundary for this module.
//
// Deliberately NOT a faithful re-implementation of the three real Next.js
// route handlers — just enough state (users, tokens, links) and enough of
// their request/response shapes to drive the flows MuseIdContext exercises:
// start -> verify -> complete, signin, muse-exchange (+ JIT-provision /
// email-match), userinfo, link/unlink, revoke.
//
// Usage: call `createMuseIdMock()` once per test file, `vi.stubGlobal
// ('fetch', mock.fetchMock)` in a beforeEach, and `mock.reset()` in
// afterEach (clears all in-memory state AND the spy's call history — do NOT
// reuse a mock instance's state across tests).
import { vi, type Mock } from 'vitest';
// Base URLs are re-exported from the real client modules (NOT hardcoded
// localhost defaults) so this mock stays correct even when
// apps/sandbox/.env pins VITE_MUSEHUB_BASE_URL/VITE_ADIEU_BASE_URL to the
// deployed Railway origins (as it does today) — the clients read those env
// vars at import time, so the mock must route to whatever they actually
// resolved to, not what a fresh checkout's defaults would be.
import { MUSEID_BASE } from '../lib/muse-id-client';
import { MUSEHUB_BASE } from '../lib/musehub-client';
import { ADIEU_BASE } from '../lib/adieu-client';

export type ServiceName = 'moose-hub' | 'adieu';

export { MUSEID_BASE, MUSEHUB_BASE as MOOSEHUB_BASE, ADIEU_BASE };

const FIXED_CODE = '000000';

interface MuseUserRecord {
  id: string;
  email: string;
  name: string;
  password: string;
  avatarUrl?: string;
  linkedServices: Set<ServiceName>;
}

interface ServiceUserRecord {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  /** Non-financial "recognition card" item count (task 5.3's disclosure
   *  rule: masked email + a non-financial summary, NEVER a monetary
   *  value). Defaults to 0 when not seeded. */
  itemCount: number;
}

interface TokenOwner {
  kind: 'muse' | ServiceName;
  email: string;
}

interface MockState {
  museUsers: Map<string, MuseUserRecord>;
  serviceUsers: Record<ServiceName, Map<string, ServiceUserRecord>>;
  accessTokens: Map<string, TokenOwner>;
  refreshTokens: Map<string, TokenOwner>;
  pendingVerification: Map<string, { verified: boolean }>;
  /** Task 6.4: muse-id `/authorize` authorization codes, seeded by tests via
   *  `seedAuthCode` to simulate a completed browser round-trip (the mock
   *  never actually serves the `/authorize` page — the sandbox never fetches
   *  it, it navigates the browser there). Single-use, consumed by
   *  `/api/oauth/token`'s `grant_type=authorization_code` branch. */
  authCodes: Map<string, { email: string }>;
  /** One-shot: the next request whose URL contains this substring 500s. */
  failing: Set<string>;
}

function freshState(): MockState {
  return {
    museUsers: new Map(),
    serviceUsers: { 'moose-hub': new Map(), adieu: new Map() },
    accessTokens: new Map(),
    refreshTokens: new Map(),
    pendingVerification: new Map(),
    authCodes: new Map(),
    failing: new Set(),
  };
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// Simplified mock of each real RP's lib/maskEmail.ts (task 5.2): keeps at
// most 3 leading local-part characters visible, never the whole local part.
// Not required to be byte-identical to the real helper — this mock only
// needs to prove the sandbox never renders a bare/unmasked email or a
// monetary value on a pre-link recognition card.
function maskEmailMock(email: string): string {
  const at = email.indexOf('@');
  const local = at === -1 ? email : email.slice(0, at);
  const domain = at === -1 ? '' : email.slice(at);
  const visible = local.slice(0, Math.max(0, Math.min(3, local.length - 1)));
  return `${visible}•••${domain}`;
}

function summaryForService(service: ServiceName, itemCount: number): string {
  const noun = service === 'moose-hub' ? 'plugin' : 'cloud project';
  return `${itemCount} ${noun}${itemCount === 1 ? '' : 's'}`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getHeader(init: RequestInit | undefined, name: string): string | undefined {
  const headers = init?.headers;
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  const rec = headers as Record<string, string>;
  const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? rec[key] : undefined;
}

function bearerEmail(state: MockState, kind: TokenOwner['kind'], init: RequestInit | undefined): string | null {
  const auth = getHeader(init, 'authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const owner = state.accessTokens.get(auth.slice('Bearer '.length));
  if (!owner || owner.kind !== kind) return null;
  return owner.email;
}

export interface MuseIdMockControls {
  fetchMock: Mock;
  /** Pre-seeds an existing Muse ID (for sign-in / password-reset tests). */
  seedMuseUser(input: {
    email: string;
    password: string;
    name: string;
    avatarUrl?: string;
    linkedServices?: ServiceName[];
  }): void;
  /** Pre-seeds an existing service account so discovery/email-match linking
   *  has something to find. `itemCount` drives the recognition card's
   *  non-financial summary (e.g. "4 plugins") — task 5.3/5.2's disclosure
   *  rule. */
  seedServiceUser(
    service: ServiceName,
    input: { email: string; id?: string; name: string; itemCount?: number },
  ): void;
  /** Mints a valid `service`-kind access token for `email` WITHOUT going
   *  through `/api/auth/muse-exchange` — i.e. without marking the service
   *  linked at muse-id. Simulates "the user already has a live legacy
   *  {service} session" (as a real OAuth/password sign-in would produce)
   *  so tests can exercise the session-proof Link button (MuseIdAccountsPage
   *  Task 3.2b) starting from an unlinked-but-signed-in state. Creates the
   *  service user record if one doesn't already exist. */
  seedServiceAccessToken(service: ServiceName, email: string): string;
  /** Forces the NEXT request whose URL contains `urlIncludes` to 500. One-
   *  shot — consumed on first match. */
  failNext(urlIncludes: string): void;
  /** Test-side lookup of the Muse access token most recently minted for an
   *  email (signIn/verify/complete all mint one) — lets a test call the
   *  client directly without threading the token through context state. */
  museAccessTokenFor(email: string): string | undefined;
  /** Task 6.4: registers `code` as a valid, single-use authorization code
   *  for `email` — simulates muse-id's `/authorize` having minted an
   *  AuthCode after the user approved consent. A test drives the browser-
   *  first callback by calling `completeBrowserAuthorize(code, state)` (or
   *  rendering OAuthCallback with a matching `?code&state` URL) with a code
   *  seeded here. Does not validate PKCE/client_id/redirect_uri (the mock's
   *  scope is "enough to drive the flow", not a faithful reimplementation —
   *  see this file's header comment); the real muse-id service does. */
  seedAuthCode(code: string, email: string): void;
  /** Clears ALL in-memory state and the spy's call history. */
  reset(): void;
}

export function createMuseIdMock(): MuseIdMockControls {
  let state = freshState();

  function mintTokens(kind: TokenOwner['kind'], email: string) {
    const access_token = nextId(`${kind}-access`);
    const refresh_token = nextId(`${kind}-refresh`);
    state.accessTokens.set(access_token, { kind, email });
    state.refreshTokens.set(refresh_token, { kind, email });
    return { access_token, refresh_token, expires_in: 3600 };
  }

  function jsonBody<T>(init: RequestInit | undefined): T {
    return typeof init?.body === 'string' ? (JSON.parse(init.body) as T) : ({} as T);
  }

  function formBody(init: RequestInit | undefined): URLSearchParams {
    const body = init?.body;
    // Callers construct form bodies both ways in this codebase (a raw
    // `new URLSearchParams(...)`, which real `fetch` stringifies over the
    // wire — see muse-id-client.ts's refreshTokens/logout/
    // completeBrowserAuthorize — and pre-stringified via `.toString()`).
    // Since this mock replaces `fetch` entirely, no such serialization
    // happens; both forms must be accepted directly.
    if (typeof body === 'string') return new URLSearchParams(body);
    if (body instanceof URLSearchParams) return new URLSearchParams(body);
    return new URLSearchParams();
  }

  async function router(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();

    for (const substr of state.failing) {
      if (url.includes(substr)) {
        state.failing.delete(substr);
        return jsonResponse({ error: 'mock_forced_failure' }, 500);
      }
    }

    const { pathname: path } = new URL(url);

    // ---- muse-id ------------------------------------------------------
    if (url.startsWith(MUSEID_BASE)) {
      if (path === '/api/auth/start' && method === 'POST') {
        const { email } = jsonBody<{ email: string }>(init);
        state.pendingVerification.set(email.toLowerCase(), { verified: false });
        return jsonResponse({ ok: true });
      }

      if (path === '/api/auth/verify' && method === 'POST') {
        const body = jsonBody<{ email: string; code: string; purpose?: string; password?: string }>(init);
        const email = body.email.toLowerCase();
        const pending = state.pendingVerification.get(email);
        if (!pending || body.code !== FIXED_CODE) return jsonResponse({ error: 'code_invalid' }, 400);

        const existing = state.museUsers.get(email);
        if (existing) {
          if (body.purpose !== 'reset') return jsonResponse({ error: 'password_required' }, 400);
          if (!body.password) return jsonResponse({ error: 'invalid_request' }, 400);
          existing.password = body.password;
          state.pendingVerification.delete(email);
          return jsonResponse({
            status: 'reset',
            ...mintTokens('muse', email),
            token_type: 'Bearer',
            scope: 'profile',
            user: { id: existing.id, email, name: existing.name, avatarUrl: existing.avatarUrl },
          });
        }

        pending.verified = true;
        const discovery = (['moose-hub', 'adieu'] as ServiceName[])
          .map((service) => {
            const su = state.serviceUsers[service].get(email);
            return su
              ? { service, userId: su.id, display: { name: su.name, summary: `${service} account` } }
              : null;
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        return jsonResponse({ status: 'new', discovery });
      }

      if (path === '/api/auth/complete' && method === 'POST') {
        const body = jsonBody<{
          email: string;
          name: string;
          password: string;
          avatarChoice?: string;
          links?: { service: ServiceName; method: string }[];
        }>(init);
        const email = body.email.toLowerCase();
        const pending = state.pendingVerification.get(email);
        if (!pending || !pending.verified) return jsonResponse({ error: 'not_verified' }, 400);
        if (state.museUsers.has(email)) return jsonResponse({ error: 'email_taken' }, 409);

        const user: MuseUserRecord = {
          id: nextId('muse-user'),
          email,
          name: body.name,
          password: body.password,
          avatarUrl: body.avatarChoice,
          linkedServices: new Set(),
        };
        const linkedServices: ServiceName[] = [];
        for (const l of body.links ?? []) {
          if (l.method === 'email-match' && state.serviceUsers[l.service].has(email)) {
            user.linkedServices.add(l.service);
            linkedServices.push(l.service);
          }
        }
        state.museUsers.set(email, user);
        state.pendingVerification.delete(email);
        return jsonResponse({
          ...mintTokens('muse', email),
          token_type: 'Bearer',
          scope: 'profile',
          user: { id: user.id, email, name: user.name, avatarUrl: user.avatarUrl },
          linkedServices,
        });
      }

      if (path === '/api/auth/signin' && method === 'POST') {
        const body = jsonBody<{ email: string; password: string; client_id: string }>(init);
        const email = body.email.toLowerCase();
        const user = state.museUsers.get(email);
        if (!user || user.password !== body.password) return jsonResponse({ error: 'invalid_credentials' }, 401);
        return jsonResponse({
          ...mintTokens('muse', email),
          token_type: 'Bearer',
          scope: 'profile',
          user: { id: user.id, email, name: user.name, avatarUrl: user.avatarUrl },
        });
      }

      if (path === '/api/oauth/userinfo' && method === 'GET') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        return jsonResponse({
          sub: user.id,
          email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          linkedServices: Array.from(user.linkedServices),
        });
      }

      if (path === '/api/link' && method === 'POST') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        const { service } = jsonBody<{ service: ServiceName }>(init);
        user.linkedServices.add(service);
        return jsonResponse({ ok: true, linked: true, service });
      }

      if (path === '/api/unlink' && method === 'POST') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        const { service } = jsonBody<{ service: ServiceName }>(init);
        user.linkedServices.delete(service);
        return jsonResponse({ ok: true });
      }

      if (path === '/api/oauth/revoke' && method === 'POST') {
        const contentType = getHeader(init, 'content-type') ?? '';
        const token = contentType.includes('application/json')
          ? jsonBody<{ token?: string }>(init).token
          : formBody(init).get('token');
        if (token) state.refreshTokens.delete(token);
        return jsonResponse({ ok: true });
      }

      if (path === '/api/oauth/token' && method === 'POST') {
        const form = formBody(init);
        if (form.get('grant_type') === 'authorization_code') {
          const code = form.get('code') ?? '';
          const entry = state.authCodes.get(code);
          if (!entry) return jsonResponse({ error: 'invalid_grant' }, 400);
          state.authCodes.delete(code); // single-use, mirrors the real service.
          return jsonResponse({ ...mintTokens('muse', entry.email), token_type: 'Bearer', scope: 'profile' });
        }
        const owner = state.refreshTokens.get(form.get('refresh_token') ?? '');
        if (!owner) return jsonResponse({ error: 'invalid_grant' }, 400);
        return jsonResponse({ ...mintTokens(owner.kind, owner.email), token_type: 'Bearer', scope: 'profile' });
      }
    }

    // ---- moose-hub / adieu (shared route shapes) -----------------------
    for (const [base, service] of [
      [MUSEHUB_BASE, 'moose-hub'],
      [ADIEU_BASE, 'adieu'],
    ] as [string, ServiceName][]) {
      if (!url.startsWith(base)) continue;

      // Legacy first-party sign-in — needed for task 5.3's post-legacy-
      // sign-in prompt test (AuthDialog.tsx/AdieuAuthDialog.tsx's legacy
      // form calls this via musehub-client.ts/adieu-client.ts's
      // directLogin). Not a faithful password check (this mock doesn't
      // track ServiceUserRecord passwords at all) — any password succeeds
      // for a seeded service user, matching this file's existing "just
      // enough to drive the flow under test" scope.
      if (path === '/api/auth/direct-token' && method === 'POST') {
        const body = jsonBody<{ mode?: string; email?: string }>(init);
        const email = (body.email ?? '').toLowerCase();
        const su = state.serviceUsers[service].get(email);
        if (!su) return jsonResponse({ error: 'invalid_credentials' }, 401);
        return jsonResponse({
          ...mintTokens(service, email),
          token_type: 'Bearer',
          user: { id: su.id, email: su.email, name: su.name },
        });
      }

      if (path === '/api/auth/muse-exchange' && method === 'POST') {
        const body = jsonBody<{ muse_access_token: string; legacy_access_token?: string }>(init);
        const museOwner = state.accessTokens.get(body.muse_access_token);
        const museUser = museOwner && museOwner.kind === 'muse' ? state.museUsers.get(museOwner.email) : undefined;
        if (!museOwner || !museUser) return jsonResponse({ error: 'invalid_muse_token' }, 401);

        // Task 5.3 (fixed in the 5.3 review follow-up, 2026-07-20): capture
        // the resolution rung BEFORE mutating state, mirroring the REAL
        // moose-hub/adieu `/api/auth/muse-exchange` route.ts's four-rung
        // order (museId match -> legacy_access_token -> email match ->
        // JIT-provision) 1:1, so the mock's accountStatus can't drift from
        // what production actually sends — see ServiceExchangeResult's
        // doc comment in muse-id-client.ts.
        const alreadyLinked = museUser.linkedServices.has(service);
        let su = state.serviceUsers[service].get(museOwner.email);
        let accountStatus: 'linked' | 'linked-by-session' | 'matched-by-email' | 'created';
        if (alreadyLinked) {
          accountStatus = 'linked';
        } else if (su) {
          accountStatus = 'matched-by-email';
        } else if (body.legacy_access_token) {
          const legacyOwner = state.accessTokens.get(body.legacy_access_token);
          const legacySu = legacyOwner && legacyOwner.kind === service
            ? state.serviceUsers[service].get(legacyOwner.email)
            : undefined;
          if (legacySu) {
            su = legacySu;
            accountStatus = 'linked-by-session';
          } else {
            accountStatus = 'created';
          }
        } else {
          accountStatus = 'created';
        }
        if (!su) {
          su = { id: nextId(`${service}-user`), email: museOwner.email, name: museUser.name, avatarUrl: museUser.avatarUrl, itemCount: 0 };
          state.serviceUsers[service].set(museOwner.email, su);
        }
        museUser.linkedServices.add(service);

        return jsonResponse({
          ...mintTokens(service, museOwner.email),
          token_type: 'Bearer',
          scope: service === 'moose-hub' ? 'profile library:read wallet:write' : 'profile projects:write',
          user: { id: su.id, email: su.email, name: su.name },
          accountStatus,
          display: { name: su.name, maskedEmail: maskEmailMock(su.email), summary: summaryForService(service, su.itemCount) },
        });
      }

      if (path === '/api/oauth/userinfo' && method === 'GET') {
        const email = bearerEmail(state, service, init);
        const su = email ? state.serviceUsers[service].get(email) : undefined;
        if (!email || !su) return jsonResponse({ error: 'invalid_token' }, 401);
        return jsonResponse({ id: su.id, email: su.email, name: su.name, avatarUrl: su.avatarUrl });
      }

      if (path === '/api/me/wallet' && method === 'GET' && service === 'moose-hub') {
        const email = bearerEmail(state, service, init);
        if (!email) return jsonResponse({ error: 'invalid_token' }, 401);
        return jsonResponse({ balanceCents: 0 });
      }

      if (path === '/api/me/library' && method === 'GET' && service === 'moose-hub') {
        const email = bearerEmail(state, service, init);
        if (!email) return jsonResponse({ error: 'invalid_token' }, 401);
        return jsonResponse({ entitlements: [] });
      }

      if (path === '/api/projects' && method === 'GET' && service === 'adieu') {
        const email = bearerEmail(state, service, init);
        if (!email) return jsonResponse({ error: 'invalid_token' }, 401);
        return jsonResponse({ projects: [] });
      }

      if (path === '/api/auth/muse-unlink' && method === 'POST') {
        const email = bearerEmail(state, service, init);
        if (!email) return jsonResponse({ error: 'invalid_token' }, 401);
        return jsonResponse({ ok: true });
      }

      if (path === '/api/oauth/revoke' && method === 'POST') {
        return jsonResponse({ ok: true });
      }
    }

    throw new Error(`museIdMock: unhandled request ${method} ${url}`);
  }

  const fetchMock = vi.fn(router);

  return {
    fetchMock,
    seedMuseUser(input) {
      const email = input.email.toLowerCase();
      state.museUsers.set(email, {
        id: nextId('muse-user'),
        email,
        name: input.name,
        password: input.password,
        avatarUrl: input.avatarUrl,
        linkedServices: new Set(input.linkedServices ?? []),
      });
    },
    seedServiceUser(service, input) {
      const email = input.email.toLowerCase();
      state.serviceUsers[service].set(email, {
        id: input.id ?? nextId(`${service}-user`),
        email,
        name: input.name,
        itemCount: input.itemCount ?? 0,
      });
    },
    seedServiceAccessToken(service, email) {
      const normalized = email.toLowerCase();
      if (!state.serviceUsers[service].has(normalized)) {
        state.serviceUsers[service].set(normalized, { id: nextId(`${service}-user`), email: normalized, name: normalized, itemCount: 0 });
      }
      return mintTokens(service, normalized).access_token;
    },
    failNext(urlIncludes) {
      state.failing.add(urlIncludes);
    },
    seedAuthCode(code, email) {
      state.authCodes.set(code, { email: email.toLowerCase() });
    },
    museAccessTokenFor(email) {
      const target = email.toLowerCase();
      for (const [token, owner] of state.accessTokens) {
        if (owner.kind === 'muse' && owner.email === target) return token;
      }
      return undefined;
    },
    reset() {
      state = freshState();
      fetchMock.mockClear();
    },
  };
}
