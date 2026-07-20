# Muse ID SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Muse ID — a third house-style Railway service acting as shared identity — plus token-exchange integration in moose-hub and adieu and the full sign-in/linking UX in the sandbox.

**Spec (BINDING — security rules + locked decisions govern every task):** `docs/superpowers/specs/2026-07-13-muse-id-sso-design.md`

**Repos:** muse-id (NEW, `~/Documents/webdev/muse-id`), moose-hub (`~/Documents/webdev/moose-hub`), adieu (`~/Documents/webdev/adieu`), prototype (this repo, branch `feat/muse-id`).

## Global Constraints

- **House style is law for the three services.** Before writing muse-id code, READ the sibling implementations (moose-hub is the richer reference): `lib/oauth/tokens.ts`, `lib/oauth/bearer.ts`, `lib/session.ts`, `lib/cors.ts`, `lib/password.ts` patterns, `prisma/seed.ts`, `vitest.config.ts` + `tests/integration/helpers/db.ts`, `railway.json`, package.json scripts. Mirror them; do not invent new conventions.
- **Service-repo work happens on feature branches** (`feat/muse-exchange` in moose-hub/adieu) — do NOT push service repos to their remotes (Railway auto-deploys on push; deploys happen only at the user-gated rollout step). muse-id's new repo may push freely until it's connected to Railway.
- **Security rules from the spec bind every task**: anti-enumeration (byte-identical `/api/auth/start` responses — integration-tested), verify-then-reveal, server-side legacy-token verification for session-proof linking, hashed codes, S2S routes RP-secret-gated with no CORS, env names only (never values).
- **Legacy auth stays working in all three consumers** — every service task must leave the existing test suite green untouched (that IS the parallel-run proof).
- **Gates:** per service repo: `pnpm test` (existing suite + new tests) + `pnpm build` (runs prisma generate + next build = typecheck). Prototype: the usual four gates + integration net green.
- Prototype product rules + CLAUDE.md conventions apply to sandbox tasks.

---

### Task 1.1: Scaffold muse-id (repo, schema, token/session libs, seed, tests infra)

**Repo:** NEW at `~/Documents/webdev/muse-id`.

- [ ] `git init`; scaffold by MIRRORING moose-hub: package.json (same deps minus resend-optional/plus nothing new; same scripts incl. `start = prisma migrate deploy && tsx prisma/seed.ts && next start -p ${PORT:-3002}`), tsconfig, next.config.ts, vitest.config.ts, `.nvmrc`, `.gitignore`, railway.json (copy moose-hub's), README (accurate: Postgres, port 3002, endpoints table, env names incl. `MOCK_EMAIL_CODES`, `MUSE_RP_SECRET`, `MOOSE_HUB_BASE_URL`, `ADIEU_BASE_URL`).
- [ ] Prisma schema per spec: `User` (NO passwordHash), `PendingVerification`, `LinkedAccount` (both @@unique constraints), `AccessToken`/`RefreshToken`/`OAuthClient` copied from sibling. One init migration. Seed: OAuth client `audacity-web-demo` (redirect URIs matching siblings' pattern incl. :5173); NO users.
- [ ] `lib/`: tokens.ts + bearer.ts + session.ts (cookie `muse-id-session`) + cors.ts adapted verbatim-style from moose-hub; `lib/codes.ts` (6-digit gen, sha256 hash, TTL/attempt policy from moose-hub's signup flow; `MOCK_EMAIL_CODES=1` → fixed `000000`, no email send; else console-log the code — no Resend dependency needed for the mock).
- [ ] Tests: unit for tokens (copy sibling's coverage shape) + codes (mock mode, hashing, expiry, attempts). Test-db isolation copied from sibling `helpers/db.ts` EXACTLY (verify what engine tests use before assuming).
- [ ] `gh repo view` on moose-hub's remote to match visibility; `gh repo create` muse-id accordingly + push main.
- [ ] Gates: `pnpm test` green, `pnpm build` green. Conventional commits as you go.

### Task 1.2: muse-id auth endpoints (start / verify / complete) + enumeration proof

- [ ] `POST /api/auth/start`: upsert PendingVerification, ALWAYS `{ ok: true }` with identical shape/status/headers for existing-vs-unknown emails. Integration test asserts byte-identity of the two responses (spec acceptance item).
- [ ] `POST /api/auth/verify`: code check (attempts/TTL per policy) → existing Muse user: session cookie + tokens (sign-in path); new: `{ status: 'new', discovery: [...] }` — discovery calls both services' `/api/internal/lookup` S2S (feature-flag friendly: if `MOOSE_HUB_BASE_URL`/`ADIEU_BASE_URL` unset or lookup fails, that service is simply omitted — muse-id must work standalone in tests; mock S2S in integration tests with undici MockAgent or route-level fetch mock, mirroring however the sibling tests mock external calls, if they do).
- [ ] `POST /api/auth/complete`: create User + execute `links[]` (email-match links recorded directly — the email was verified; session-method links validated LATER at the RP during exchange, so here they're recorded as pending? NO — keep it simple and honest: `complete` records ONLY email-match links; session-proof links happen via the RP exchange call which then calls muse-id `POST /api/s2s/register-link`. Add that S2S endpoint here.) Returns muse tokens + profile.
- [ ] `GET /api/oauth/userinfo`, `POST /api/oauth/token` (refresh), `POST /api/oauth/revoke` (JSON AND form-encoded — regression test both content types).
- [ ] Integration tests: full happy path, wrong/expired/exhausted codes, sign-in vs new branching, discovery with mocked S2S, revoke both content types.
- [ ] Gates + commits.

### Task 1.3: muse-id linking + S2S surface

- [ ] `POST /api/s2s/introspect` `{ token }` → `{ active, sub, email, name }`; `POST /api/s2s/register-link` `{ museUserId, service, serviceUserId }` (upsert LinkedAccount, honor both uniques → 409 on conflict). Both RP-secret-gated (`Authorization: Bearer $MUSE_RP_SECRET`), NO CORS headers, integration-tested incl. missing/wrong secret → 401.
- [ ] `POST /api/link` (user Bearer) `{ service, legacy_access_token }`: muse-id calls the SERVICE's userinfo with that token to verify it (S2S base URLs), then registers the link. `POST /api/unlink` (user Bearer): remove LinkedAccount + notify service? NO — service-side museId cleanup happens via the service's own unlink handling in Task 2.x exchange lib (keep: muse-id deletes its row; service column cleanup is triggered by the sandbox calling the service, spec'd in Task 2 endpoints). Re-read spec §linking-write before implementing; document the final ownership in the README.
- [ ] `linkedServices` included in userinfo. Integration tests for the ladder pieces muse-id owns.
- [ ] Gates + commits. Update README endpoint table.

### Task 1.4: muse-id passwords + sign-in (spec amendment 2026-07-13)

Muse ID gains a password (siblings both have one; enables password managers + later passkeys). Codes stay for signup verification / reset only. See spec §"Auth surface: where the user signs up vs signs in".

- [ ] Migration: `User.passwordHash String` (**required** — every Muse ID has one; there are no seed users so no backfill problem). Verify no existing rows before making it non-null; if the dev DB has rows from manual testing, wipe rather than backfill.
- [ ] `lib/password.ts`: copy moose-hub's verbatim (bcryptjs cost 10, `hashPassword`/`verifyPassword`). NOTE: `bcryptjs` is already a dependency in muse-id — a prior review flagged it as dead weight; it is now load-bearing, so do NOT prune it.
- [ ] `POST /api/auth/complete`: accept + require `password` (min length 8, house policy — mirror the siblings' `password_too_short` 400 error shape); hash before storing. Keep ALL existing caller-binding (session `pendingEmail` marker + its expiry), P2002 handling, and link recording exactly as-is.
- [ ] `POST /api/auth/signin`: new route mirroring moose-hub's `direct-token` (`{ email, password, client_id }` → validate client, bcrypt compare, mint tokens + set session; `invalid_credentials` 401 for BOTH unknown-email and wrong-password — no enumeration oracle).
- [ ] `/api/auth/verify` existing-user branch: today it signs the user in on a correct code. Keep it (it is now the *password-reset/new-device* path rather than the routine one) — but confirm it cannot be used to bypass the password for a user who has one. If it can, gate it behind an explicit `purpose: 'reset'` param and require a password set in the same call. Report which way you resolved it.
- [ ] Tests: signup-with-password happy path; password too short; signin correct/wrong password/unknown email (identical 401 shape — assert byte-identity like the `start` enumeration test); the verify-branch resolution above; existing 99 tests stay green.
- [ ] Gates: `pnpm test`, `pnpm build`, `npx tsc --noEmit`. Conventional commits; push.

### Task 2.1: moose-hub integration (branch `feat/muse-exchange`)

- [ ] Migration: `museId String? @unique` on User; `passwordHash String?` nullable; guard `direct-token`/login against null-passwordHash users (401 `invalid_credentials` — same as wrong password; test).
- [ ] `POST /api/auth/muse-exchange` `{ muse_access_token, legacy_access_token? }`: introspect S2S → resolve user: (1) `museId` match; (2) legacy token provided → `requireBearer`-style validate it, adopt that user, set museId + `register-link` S2S; (3) email match (verified email from introspection) → set museId + register-link; (4) JIT-provision (null passwordHash) + register-link. Mint standard tokens (default scope `profile library:read wallet:write`). CORS like other public routes.
- [ ] `GET /api/internal/lookup?email=` RP-secret-gated, no CORS: `{ exists, serviceUserId?, display: { name, summary } }` — summary e.g. `wallet $42.50 · 4 plugins` (derive from walletCents + entitlement count).
- [ ] `POST /api/auth/muse-unlink` (Bearer): null museId (sandbox calls it during unlink).
- [ ] RIDER (disclosed in commit): fix `/api/oauth/revoke` to ALSO parse form-urlencoded (the sandbox client sends it; currently silently no-ops) + regression test.
- [ ] Env additions documented in README (`MUSE_ID_BASE_URL`, `MUSE_RP_SECRET`). Integration tests: all four resolution paths, bad muse token, bad secret on lookup, null-hash login guard. Existing suite untouched and green.
- [ ] Gates (`pnpm test`, `pnpm build`) + commits on the feature branch. DO NOT push.

### Task 2.2: adieu integration (branch `feat/muse-exchange`)

- [ ] Same shape as 2.1 (no rider): migration, muse-exchange (default scope `profile projects:write`), internal/lookup (summary from project count, e.g. `3 cloud projects`), muse-unlink, README env, tests, suite green, no push.

### Task 3.1: sandbox — muse-id client + context + token adoption

- [ ] `apps/sandbox/src/lib/muse-id-client.ts` in house client style (storage key `muse-id-tokens-v1`, refresh-on-401, `VITE_MUSEID_BASE_URL` default `http://localhost:3002`): start/verify/complete/userinfo/link/unlink/revoke + each service's `muse-exchange` callers.
- [ ] `MuseIdContext` (value-provider or provider-owns-hook — follow whichever pattern fits App's existing contexts; see LoopRegionContext/MuseHubContext precedents): session, profile, linkedServices, `signIn flow state machine`, `signOutEverywhere()` (revoke muse + both services + clear all three stores).
- [ ] `adoptTokens(tokens)` additions to MuseHubContext + AdieuContext (additive; legacy paths untouched — existing tests must stay green).
- [ ] Unit/integration tests at the mock-network boundary (follow audioMock precedent for a `museIdMock`).
- [ ] Prototype gates + commit.

### Task 3.2: sandbox — Muse ID UX

- [ ] `MuseIdAuthDialog`: email → code → found-your-accounts (email-match card(s) pre-checked; session-rung card when a live legacy session exists in-app; "link later" affordance) → profile-conflict step (only when name/avatar differ) → done. Primary CTA "Continue with Muse ID" replaces legacy sign-in entry points (HomeTab account card, UserMenu, Preferences Accounts page, marketplace sign-in prompts); legacy dialogs behind the Debug panel toggle.
- [ ] Account surfaces: single Muse identity card w/ per-service sections; "Linked services" management (link → session-proof or email flow; unlink → calls service muse-unlink + muse-id unlink). Deferred-link empty-state prompts (marketplace/library, cloud projects).
- [ ] Global sign-out wired. Theme/a11y conventions per CLAUDE.md (real profile ids, roving-tabindex where composite).
- [ ] Prototype gates + commit(s).

### Task 3.3: sandbox — integration net extension

- [ ] `apps/sandbox/src/__tests__/MuseId.integration.test.tsx`: full dialog flow (mocked network at museIdMock boundary): enumeration-safe start, code entry, both linking rungs (stage: museIdMock returns moose-hub discovery; adieu linked via live legacy session), contexts adopt exchanged tokens (assert both service contexts signed in), global sign-out clears everything, deferred-link prompt appears when a service is skipped. Sabotage check (report-only): break the adoptTokens wiring → test reds.
- [ ] Full prototype gates; suite count reported.

### Task 4: E2E, docs, rollout gate

- [ ] Local E2E attempt: run all three services locally (check sibling READMEs/local DB availability; if local Postgres isn't available, document and rely on suites) + sandbox dev server; controller drives the demo script in the preview browser.
- [ ] Docs: prototype codebase-map (muse-id client/context/dialog/tests), backlog.md updates (dead musehub-client projects* methods note gains context), README cross-links in all three service repos.
- [ ] Whole-campaign review (fable) across all four repos' diffs.
- [ ] USER GATE — rollout checklist (spec §Deploy): user creates Railway project+PG, connects muse-id repo, sets env on all three services; THEN service branches get merged/pushed (Railway auto-deploys); deployed demo-script smoke; sandbox merge last.
