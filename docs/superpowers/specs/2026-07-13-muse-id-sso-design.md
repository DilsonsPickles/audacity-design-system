# Muse ID — Single Sign-On for audio.com + MuseHub — Design

**Date:** 2026-07-13
**Status:** Approved direction (user); spec pending user review
**Branch:** `feat/muse-id` (prototype repo) + changes in the two service repos

## Problem

The prototype talks to two real mock services, each with its own account, sign-in, and session: **moose-hub** (MuseHub spoof: wallet, plugin purchases, library) and **adieu** (audio.com spoof: cloud projects). Users sign in twice and hold two identities. We are introducing **Muse ID** — one neutral identity both services trust — without either service giving up its name.

**Decisions locked with the user:**
- **Symmetric-new**: Muse ID is a genuinely new account; existing service accounts LINK into it (no upgrade-in-place, no brand merger).
- **Verify-then-reveal**: nothing about existing accounts is disclosed until email ownership is proven (anti-enumeration; the email-entry response is identical whether accounts exist or not).
- **Linking ladder**: email match → linked in the same verification (free). Live service session → one-tap link (session is proof). Neither → deferred, contextual prompt (marketplace/library empty-state, account settings), never forced mid-flow.
- **Sign-out is global** (Muse session ends → both services' sandbox sessions end). **Unlink** is separate account surgery in settings.

## Repos involved

| Repo | Path | Role |
|---|---|---|
| `muse-id` (NEW) | `~/Documents/webdev/muse-id` | identity provider service (Railway) |
| `moose-hub` | `~/Documents/webdev/moose-hub` | relying party: +exchange +internal lookup +migration |
| `adieu` | `~/Documents/webdev/adieu` | relying party: same additions |
| prototype | this repo, `feat/muse-id` | client: MuseIdContext, new auth UI, session plumbing |

House style (from recon, both services identical): Next.js 16 App Router + Prisma 6/Postgres + iron-session + bcryptjs + opaque DB tokens minted in `lib/oauth/tokens.ts`, validated per-route via `lib/oauth/bearer.ts::requireBearer`; vitest 2 unit+integration with per-file DB isolation; Railway NIXPACKS auto-deploy on push, `start = prisma migrate deploy && tsx prisma/seed.ts && next start`. **muse-id clones this style exactly.**

## Architecture

### Token model: exchange, not federation-by-JWT

Muse ID issues its own opaque tokens (same `tokens.ts` pattern). Services never validate Muse tokens per-request; instead each service adds ONE endpoint:

```
POST /api/auth/muse-exchange   { muse_access_token, legacy_access_token? }
```

Flow: introspect `muse_access_token` server-side against muse-id (S2S) → resolve the local user (by museId link → by legacy token if provided [live-session linking] → by verified-email match → JIT-provision) → mint the service's OWN opaque access+refresh pair via existing `tokens.ts` → return the service's standard token payload. Everything downstream (scopes, refresh rotation, revocation, both sandbox clients post-exchange) is untouched.

### Auth surface: where the user signs up vs signs in (amended 2026-07-13)

Muse ID has a **password** (the siblings both do; it makes password managers and the later passkey upgrade coherent). Emailed codes remain for signup verification, password reset, and future new-device checks — NOT for routine sign-in.

The app uses different mechanisms for the two moments, because the trade-off inverts between them:

| Moment | Mechanism | Why |
|---|---|---|
| **Sign-up** (no account yet) | **In-app** — the existing `start`→`verify`→`complete` flow, password set at `complete` | A first-time user has no browser session to leverage, so a bounce is pure cost at the highest-drop-off moment (auth appears mid-task: saving to cloud / buying a plugin, not at launch). No existing credential to phish. First-party app ↔ first-party IdP is the recognised exception to "never collect credentials in-app", and is exactly what moose-hub/adieu already do with their direct-token grants. |
| **Sign-in** (returning) | **Browser-first** (`/authorize` + loopback per RFC 8252), with a visible "sign in here instead" in-app fallback | This is where SSO stickiness pays: a live muse-id cookie from audio.com/musehub.com turns sign-in into one click, no typing. Password managers fill it. The fallback guarantees nobody is stranded if the browser round-trip fails. |

Consequences: the 30-day refresh token means a signed-up user re-authenticates rarely, so the browser path naturally gets *better* over time (they'll have picked up a web session by then) without anyone being forced through it early. `/authorize` must exist for the **passkey** upgrade path later — passkeys are bound to the browser/OS credential store and cannot be collected in-app.

Note: moose-hub already seeds an `audacity-electron` OAuth client with a `127.0.0.1/callback` loopback redirect (RFC 8252), so the desktop bounce is pre-anticipated on the RP side.

### muse-id service surface

Public (consumed by the sandbox):
- `POST /api/auth/start` `{ email }` → always `{ ok: true }` (sends/mocks a 6-digit code; identical response whether accounts exist — anti-enumeration). Fixed code `000000` when `MOCK_EMAIL_CODES=1`.
- `POST /api/auth/verify` `{ email, code }` → on success: if Muse ID exists → session + tokens (sign-in); if not → `{ status: 'new', discovery }` where `discovery` lists linkable service accounts found by email (safe: email is now proven). Max 5 attempts, 15-min TTL (PendingSignup pattern from moose-hub).
- `POST /api/auth/complete` `{ email, name, password, avatarChoice?, links: [{service, method: 'email-match'|'session', legacy_access_token?}] }` → creates the Muse ID **with a password** (bcrypt, cost 10, min length 8 — house policy from the siblings), executes links, returns muse tokens + profile. Caller-bound to the verify step by the `pendingEmail` session marker.
- `POST /api/auth/signin` `{ email, password, client_id }` → email+password grant → tokens + session (mirrors the siblings' `direct-token` route). **No code required on sign-in** — codes are for signup, password reset, and (future) new-device only.
- `GET /api/oauth/userinfo` (Bearer) → `{ sub, email, name, avatarUrl, linkedServices: [...] }`.
- `POST /api/link` (Bearer) `{ service, legacy_access_token }` → session-proof or credential-proof linking after creation (settings / deferred prompts).
- `POST /api/unlink` (Bearer) `{ service }`.
- `POST /api/oauth/token` (refresh rotation) + `POST /api/oauth/revoke` — same shapes as the siblings. **Revoke parses JSON AND form-urlencoded** (learning from moose-hub's revoke bug).

Server-to-server (RP secret per service via env, `Authorization: Bearer <RP_SECRET>`):
- `POST /api/s2s/introspect` `{ token }` → `{ active, sub, email, name }` (RFC 7662-ish).
- muse-id → services: `GET /api/internal/lookup?email=` on each service (new internal route there, same RP secret) → `{ exists, userId?, display: { name, summary } }` where `summary` is the found-your-accounts card copy (e.g. `"wallet $12.40 · 5 plugins"` / `"7 cloud projects"`). Called only after verification, from `/api/auth/verify`.

Data model (Prisma): `User` (id cuid, email unique, name, avatarUrl?, **passwordHash** (bcryptjs cost 10, as siblings), createdAt), `PendingVerification` (email PK, codeHash, expiresAt, attempts, lastSentAt), `LinkedAccount` (id, userId, service enum('moose-hub','adieu'), serviceUserId, linkedAt, @@unique([userId, service]), @@unique([service, serviceUserId])), `AccessToken`/`RefreshToken`/`OAuthClient` (as siblings). Seed: OAuth client `audacity-web-demo`; NO seed users (creation is the demo).

### Relying-party changes (each of moose-hub, adieu)

1. Migration: `User.museId String? @unique`; `passwordHash` → nullable (Muse-born users have none; guard password sign-in against null).
2. `POST /api/auth/muse-exchange` (above; grants the service's standard default scope — moose-hub `profile library:read wallet:write`, adieu `profile projects:write`).
3. `GET /api/internal/lookup` (RP-secret-gated; returns existence + card summary; NEVER exposed to browsers — no CORS).
4. Env: `MUSE_ID_BASE_URL`, `MUSE_RP_SECRET`. `ALLOWED_ORIGINS` unchanged (exchange is called by the sandbox, same origins).
5. Linking write = set `museId` on the local user (exchange/link paths); unlink = null it. muse-id's `LinkedAccount` is the authoritative directory for the account-settings UI; the `museId` column is the service-side join.
6. Legacy auth untouched and parallel-running (real-migration realism).

### Sandbox (prototype app)

- `lib/muse-id-client.ts` (house client style: token storage `muse-id-tokens-v1`, refresh-on-401 against muse-id).
- `MuseIdContext` — owns the Muse session + profile + linkedServices. On successful Muse sign-in/creation: calls each linked service's `/api/auth/muse-exchange`, hands the resulting service tokens to the EXISTING `MuseHubContext`/`AdieuContext` (they keep their own token stores and all downstream behavior — additive shim, e.g. `adoptTokens(tokens)` added to each).
- New UI: `MuseIdAuthDialog` (email → code → found-your-accounts cards [email-match rung pre-checked; session rung shown when a legacy in-app session exists] → profile step only on name/avatar conflict → done). Account surfaces (HomeTab account card, UserMenu, Preferences Accounts page) show ONE Muse identity with per-service sections + "Linked services" management (link/unlink). Marketplace/library and cloud empty-states gain the deferred "Have an existing account? Link it" prompt.
- Global sign-out: Muse sign-out revokes muse tokens AND calls both services' existing revoke/clears both legacy stores.
- Legacy dialogs (`AdieuAuthDialog`, wallet `AuthDialog`) remain reachable behind a debug toggle (regression path + demo contrast) but the primary CTA everywhere becomes "Continue with Muse ID".

## Security rules (bind all tasks)

- No account existence/details disclosure before email verification (identical `/api/auth/start` responses; discovery only in `/api/auth/verify` success).
- Session-proof linking requires a VALID legacy access token, verified server-side by the RP during exchange/link (the RP validates its own token — no trust in client claims).
- Verification codes: hashed at rest (sha256, house style), TTL 15 min, 5 attempts; `MOCK_EMAIL_CODES=1` fixes the code for demos, real Resend path optional.
- S2S routes: RP-secret gated, no CORS headers, never callable from browsers.
- No secrets in code or specs; env names only.

## Demo script (staged by EXISTING seeds — no contrivance)

moose-hub seeds `a.dawson@mu.se` (wallet 4250¢, 4 plugins); adieu seeds `a.dawson@adieu.com` (3 projects). Demo: sign into adieu the old way (or arrive with the session) → "Continue with Muse ID" → enter `a.dawson@mu.se` → code `000000` → found-your-accounts shows **moose-hub card (email match)** + **adieu card (offered via live session, different email)** → confirm both → one account card in Home with wallet AND projects → global sign-out kills everything.

## Non-goals

- Real email delivery in demos (mock code), real OAuth consent hardening, brand/name changes to either service, migrating legacy auth off (parallel-run is the point), production-grade key management, account deletion/GDPR flows, the sandbox's dead musehub-client `projects*` methods (backlog), fixing moose-hub's revoke content-type bug is IN scope only as a rider (one-line, disclosed) since the exchange work touches that area.

## Testing

- muse-id: full vitest suite in house style (unit: codes, tokens, linking invariants incl. the two @@unique constraints; integration: start/verify/complete happy + enumeration-response-identity + attempt limits + both linking rungs + unlink).
- Each RP: integration tests for `muse-exchange` (museId hit, legacy-token link, email match, JIT provision, bad muse token, null-passwordHash sign-in guard) + `internal/lookup` (secret required).
- Sandbox: extend the integration net — `MuseId.integration.test.tsx` with the muse-id client mocked at the same boundary style as audioMock (the services are network mocks in jsdom): full dialog flow, both rungs, global sign-out, contexts adopting exchanged tokens. Existing 372-test suite stays green (legacy paths untouched).
- Deployed smoke: the demo script run manually against Railway once everything ships.

## Deploy checklist (user does the dashboard parts)

1. I create `~/Documents/webdev/muse-id` repo + GitHub remote (`gh`).
2. You: Railway → new project + Postgres → connect the GitHub repo (NIXPACKS; it'll pick up railway.json like moose-hub's).
3. You: set env on muse-id (`DATABASE_URL` via Railway PG, `SESSION_SECRET`, `MOCK_EMAIL_CODES=1`, `ALLOWED_ORIGINS` incl. the sandbox origins, `MUSE_RP_SECRET`) and add to BOTH services (`MUSE_ID_BASE_URL`, `MUSE_RP_SECRET` — same value).
4. Sandbox env: `VITE_MUSEID_BASE_URL` (localhost:3002 default; Railway URL for deployed demo).
5. Ports locally: moose-hub 3000, adieu 3001, muse-id 3002.

## Acceptance

- Demo script works end-to-end against local services AND deployed Railway.
- All four repos' suites green (prototype 372+ / both services' existing suites + new tests / muse-id new suite); prototype gates (tsc, guard, CI) green.
- Enumeration check: `/api/auth/start` responses byte-identical for existing vs unknown emails (integration-tested).
- Legacy sign-in still works in both services (parallel-run proven by existing tests staying green).
