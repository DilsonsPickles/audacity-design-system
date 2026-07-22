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
// email-match), userinfo, link/unlink, revoke, and (task 5.4) the rung-3
// link-by-email pair link/start -> link/verify.
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
  /** Task 5.4 fix: models the REAL relying party's own `User.museId`
   *  join column (moose-hub's/adieu's schema.prisma) — the muse user's
   *  `id` this service account is bound to, if any. This is deliberately a
   *  property of the SERVICE record (keyed by the service account's OWN
   *  email), not a lookup keyed by the muse account's email — the whole
   *  point of rung 3 ("different email") is that those two emails differ,
   *  so a muse-email-keyed lookup can never model it correctly. Set by:
   *  `/api/link/verify` and `/api/link` on a successful link (modeling
   *  muse-id's `/api/internal/set-museid` write-back call to the RP), and
   *  by muse-exchange itself on its own (b)/(c)/(d) resolution rungs
   *  (modeling lib/museResolution.ts, which sets it directly). Read by
   *  muse-exchange's rung (a) museId-match — this is the field whose
   *  absence produced the task 5.4 bug: before the fix, nothing ever set
   *  it for a rung-3 link, so exchange always fell through to (d)
   *  JIT-provision, silently creating a duplicate. */
  museId?: string;
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
  /** Task 5.4 rung 3: `/api/link/start` -> `/api/link/verify` pending rows,
   *  keyed `${museEmail}:${service}` (one live attempt per service per
   *  caller, mirrors muse-id's `@@unique([userId, service])`) -> the
   *  candidate "email B" a code was sent to. */
  pendingLinkVerification: Map<string, string>;
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
    pendingLinkVerification: new Map(),
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
        // Discovery display shape mirrors muse-exchange's disclosure rule
        // (task 5.2/5.4): masked email + a non-financial summary, never a
        // bare email or a monetary value — see maskEmailMock/
        // summaryForService above.
        const discovery = (['moose-hub', 'adieu'] as ServiceName[])
          .map((service) => {
            const su = state.serviceUsers[service].get(email);
            return su
              ? {
                  service,
                  userId: su.id,
                  display: {
                    name: su.name,
                    maskedEmail: maskEmailMock(su.email),
                    summary: summaryForService(service, su.itemCount),
                  },
                }
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
          const su = state.serviceUsers[l.service].get(email);
          if (l.method === 'email-match' && su) {
            user.linkedServices.add(l.service);
            linkedServices.push(l.service);
            // Two-sided link: set the RP's own museId join column too, so a
            // later muse-exchange DISCOVERS this as already-linked (returns
            // tokens) rather than a tokenless email-match. This models
            // muse-id's set-museid write-back when it registers the link —
            // the consent rewrite means the exchange itself no longer links
            // on the fly.
            su.museId = user.id;
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

      // Session-proof linking (rung 2): mirrors the real /api/link route —
      // verifies the caller-supplied legacy_access_token by resolving it
      // against THIS mock's own service access-token store (the mock's
      // stand-in for "the RP validates its own token"), then links that
      // resolved service account and writes back its museId (task 5.4 fix)
      // exactly like /api/link/verify below.
      if (path === '/api/link' && method === 'POST') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        const { service, legacy_access_token } = jsonBody<{ service: ServiceName; legacy_access_token: string }>(init);

        const legacyOwner = state.accessTokens.get(legacy_access_token);
        const su = legacyOwner && legacyOwner.kind === service ? state.serviceUsers[service].get(legacyOwner.email) : undefined;
        if (!su) return jsonResponse({ error: 'invalid_legacy_token' }, 400);

        if (su.museId && su.museId !== user.id) {
          return jsonResponse({ error: 'service_account_already_linked' }, 409);
        }
        if (user.linkedServices.has(service) && su.museId !== user.id) {
          return jsonResponse({ error: 'user_already_linked' }, 409);
        }

        su.museId = user.id; // write-back (models muse-id's /api/internal/set-museid call)
        user.linkedServices.add(service);
        return jsonResponse({ ok: true, linked: true, service, rpSynced: true });
      }

      if (path === '/api/unlink' && method === 'POST') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        const { service } = jsonBody<{ service: ServiceName }>(init);
        user.linkedServices.delete(service);
        return jsonResponse({ ok: true });
      }

      // ---- Rung 3 (task 5.4): link-by-email start/verify -----------------
      // Anti-enumeration, mirrors /api/auth/start: ALWAYS {ok:true}, never
      // looks at whether a service account exists at `email` — that only
      // happens at verify time, after ownership is proven.
      if (path === '/api/link/start' && method === 'POST') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        const { service, email: targetEmail } = jsonBody<{ service: ServiceName; email: string }>(init);
        state.pendingLinkVerification.set(`${email}:${service}`, targetEmail.toLowerCase());
        return jsonResponse({ ok: true });
      }

      if (path === '/api/link/verify' && method === 'POST') {
        const email = bearerEmail(state, 'muse', init);
        const user = email ? state.museUsers.get(email) : undefined;
        if (!email || !user) return jsonResponse({ error: 'invalid_token' }, 401);
        const { service, email: targetEmail, code } = jsonBody<{
          service: ServiceName;
          email: string;
          code: string;
        }>(init);
        const key = `${email}:${service}`;
        const pendingTarget = state.pendingLinkVerification.get(key);
        // Terminal in one request either way (T5.1), unlike /api/auth/verify's
        // new-user branch which stays alive for a later /complete.
        state.pendingLinkVerification.delete(key);
        const normalizedTarget = targetEmail.toLowerCase();
        if (!pendingTarget || pendingTarget !== normalizedTarget || code !== FIXED_CODE) {
          return jsonResponse({ error: 'code_invalid' }, 400);
        }

        const su = state.serviceUsers[service].get(normalizedTarget);
        if (!su) return jsonResponse({ ok: true, status: 'no_account', service });

        if (su.museId === user.id) {
          // Idempotent: already linked to THIS muse user via this exact
          // service account. Still re-runs the write-back (harmless no-op,
          // and self-heals a previous write-back failure) — mirrors the
          // real /api/link/verify calling setRpMuseId on 'already_linked'
          // too.
          user.linkedServices.add(service);
          return jsonResponse({ ok: true, status: 'linked', service, rpSynced: true });
        }
        if (user.linkedServices.has(service)) {
          return jsonResponse({ error: 'user_already_linked' }, 409);
        }
        if (su.museId) {
          return jsonResponse({ error: 'service_account_already_linked' }, 409);
        }

        su.museId = user.id; // write-back (models muse-id's /api/internal/set-museid call)
        user.linkedServices.add(service);
        return jsonResponse({ ok: true, status: 'linked', service, rpSynced: true });
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
        const body = jsonBody<{ muse_access_token: string; intent?: string; legacy_access_token?: string }>(init);
        // Session-linking removal: the REAL RPs reject the field outright.
        if (body.legacy_access_token !== undefined) {
          return jsonResponse({ error: 'session_linking_removed' }, 400);
        }
        if (body.intent !== undefined && body.intent !== 'link-existing' && body.intent !== 'create') {
          return jsonResponse({ error: 'invalid_request' }, 400);
        }
        const museOwner = state.accessTokens.get(body.muse_access_token);
        const museUser = museOwner && museOwner.kind === 'muse' ? state.museUsers.get(museOwner.email) : undefined;
        if (!museOwner || !museUser) return jsonResponse({ error: 'invalid_muse_token' }, 401);

        // Linking-consent contract (2026-07-22 rewrite) — mirrors the REAL
        // moose-hub/adieu route.ts 1:1: a call WITHOUT `intent` is
        // DISCOVERY (read-only; tokens only for an already-linked Muse
        // ID); linking an email-matched account or JIT-provisioning
        // happens ONLY on an explicit intent.
        //
        // Sign-in helper: mints the token under the RESOLVED account's own
        // email, not the muse account's — they can genuinely differ
        // (that's rung 3's whole reason for existing). Minting at
        // museOwner.email would silently orphan the session: every
        // subsequent bearerEmail lookup (userinfo/wallet/library) keys off
        // the token owner's email into `state.serviceUsers[service]`,
        // which is keyed by the SERVICE account's own email.
        const signedInResponse = (su: ServiceUserRecord, accountStatus: 'linked' | 'linked-existing' | 'created') => {
          museUser.linkedServices.add(service);
          return jsonResponse({
            ...mintTokens(service, su.email),
            token_type: 'Bearer',
            scope: service === 'moose-hub' ? 'profile library:read wallet:write' : 'profile projects:write',
            user: { id: su.id, email: su.email, name: su.name },
            accountStatus,
            display: { name: su.name, maskedEmail: maskEmailMock(su.email), summary: summaryForService(service, su.itemCount) },
          });
        };

        // Already linked — scans every service account for one whose
        // `museId` equals THIS muse user's id (deliberately NOT keyed by
        // the muse account's own email; a rung-3 link is a DIFFERENT
        // email). The existing link wins regardless of intent.
        const linked = Array.from(state.serviceUsers[service].values()).find((s) => s.museId === museUser.id);
        if (linked) return signedInResponse(linked, 'linked');

        const emailMatch = state.serviceUsers[service].get(museOwner.email);

        if (body.intent === undefined) {
          // DISCOVERY — mutates NOTHING. Tokenless email-match/no-account.
          if (emailMatch) {
            return jsonResponse({
              accountStatus: 'email-match',
              display: {
                name: emailMatch.name,
                maskedEmail: maskEmailMock(emailMatch.email),
                summary: summaryForService(service, emailMatch.itemCount),
              },
            });
          }
          return jsonResponse({ accountStatus: 'no-account' });
        }

        if (body.intent === 'link-existing') {
          if (!emailMatch) return jsonResponse({ error: 'no_account_to_link' }, 409);
          emailMatch.museId = museUser.id;
          return signedInResponse(emailMatch, 'linked-existing');
        }

        // intent === 'create': JIT-provision (refusing an email collision,
        // like the real route's email_conflict).
        if (emailMatch) return jsonResponse({ error: 'email_conflict' }, 409);
        const su: ServiceUserRecord = { id: nextId(`${service}-user`), email: museOwner.email, name: museUser.name, avatarUrl: museUser.avatarUrl, itemCount: 0, museId: museUser.id };
        state.serviceUsers[service].set(museOwner.email, su);
        return signedInResponse(su, 'created');
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
      const museId = nextId('muse-user');
      const linkedServices = input.linkedServices ?? [];
      state.museUsers.set(email, {
        id: museId,
        email,
        name: input.name,
        password: input.password,
        avatarUrl: input.avatarUrl,
        linkedServices: new Set(linkedServices),
      });
      // A declared link is two-sided: muse-id's directory row AND the RP's
      // own `museId` join column both point at each other (see
      // ServiceUserRecord.museId). Establish the RP side so a later
      // muse-exchange DISCOVERS an already-linked account (returns tokens)
      // rather than a tokenless email-match — the linking-consent contract
      // means discovery never links on the fly anymore, so the link has to
      // pre-exist. Upsert at the muse email, setting museId; an existing
      // record (a test that also seedServiceUser'd this email) just gets
      // its museId set.
      for (const service of linkedServices) {
        const existing = state.serviceUsers[service].get(email);
        if (existing) existing.museId = museId;
        else state.serviceUsers[service].set(email, { id: nextId(`${service}-user`), email, name: input.name, avatarUrl: input.avatarUrl, itemCount: 0, museId });
      }
    },
    seedServiceUser(service, input) {
      const email = input.email.toLowerCase();
      // Preserve an already-established link (seedMuseUser may have wired
      // museId onto this email first) — re-seeding the account's display
      // data must not silently unlink it.
      const prior = state.serviceUsers[service].get(email);
      state.serviceUsers[service].set(email, {
        id: input.id ?? prior?.id ?? nextId(`${service}-user`),
        email,
        name: input.name,
        itemCount: input.itemCount ?? 0,
        museId: prior?.museId,
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
