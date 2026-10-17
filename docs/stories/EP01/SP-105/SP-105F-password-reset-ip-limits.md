# SP-105F: Password Reset — Shared Per-IP Limits

**Story ID:** SP-105F
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer:** Backend
**Priority:** High / P0
**Status:** Implemented 2026-10-15 — awaiting parent review (see [execution queue](./README.md#execution-queue)); scope/limits approved 2026-10-14 (SD8); sized 2026-10-15 after A/B/E implementation
**Dependencies:** SP-105A/B contracts (implemented); SP-102 public-route wiring
**Jira key:** STUDY-27
**Refined:** 2026-10-14 (plan); 2026-10-15 (sized, grounded in code)

## Summary and decision provenance

Original SP-105 AC7 and rate-limiting TR require per-account **and per-IP** protection. The user approved retaining IP protection in a separate child (“approve as sep”) and approved the proposed initial limits (“yes”): 10 forgot-password requests and 30 reset submissions per IP per minute, with account-independent 429 responses (2026-10-14 conversation). This is a release requirement, not an unspecified API-wide deferral. Target one focused backend session; J constructs live multi-client tests using H fixtures; D executes them for integrated verification.

## Acceptance criteria

1. Before DTO/service execution, admit at most 10 requests to `/auth/forgot-password` and 30 to `/auth/reset-password` per normalized source IP in the preceding 60 seconds. The two endpoints have separate buckets. Count admitted attempts regardless of email/token validity or account existence; malformed-body handling before Nest guards is a transport limitation to document. Per-account email cooldown remains A's separate control.
2. Enforce shared limits across service instances using PostgreSQL, not a process-local map. Concurrent requests near the limit cannot overshoot. A denied attempt creates no reset token, sends no email and performs no password/session mutation.
3. Return `429` with the same actionable message and IP-bucket-derived retry guidance for every account state: “Too many recovery requests. Wait and try again.” Emit integer delta-seconds `Retry-After` using the [shared retry wire contract](./SP-105-password-reset.md#retry-wire-contract-f-emits-c-consumes-d-verifies); set it before throwing so the global filter preserves it. Own `apps/api/src/main.ts` CORS exposure of `Retry-After`, retaining origin/credentials. Never expose account cooldown or existence via headers/body. Allowed requests retain A/B's normal contracts.
4. Use Nest `@Ip()` or a guard's framework request context to resolve the actual source address. Never trust a client-supplied `X-Forwarded-For` by default. Document explicitly trusted proxy hops/networks for deployed topology; default to direct peer addresses. Do not add `@Req()` to controllers. Normalize IPv4-mapped IPv6 consistently; document shared-NAT limits.
5. Keep only endpoint/IP bucket keys and admitted timestamps required for the window; no emails, tokens, passwords or request bodies. Expire stale buckets with bounded cleanup. Storage failures return a sanitized, account-independent 503 before recovery mutations (fail closed), rather than silently disabling limits.

## Proposed persistence/mechanism

Introduce an additive Prisma recovery-limit bucket model with unique `(endpoint, normalizedIp)` key and a bounded `DateTime[]` of admitted timestamps (maximum 30 per endpoint/IP). This is rate-limit state, not a student academic-data query; never return bucket keys or log raw source addresses in errors. No new secret values are required.

For each request, use a short transaction: insert the bucket if missing with conflict handling, lock it `FOR UPDATE`, obtain a fresh post-lock database time, prune entries at or before `checkedAt - 60 seconds`, and admit/append only when fewer than the endpoint's limit remain. Otherwise reject with retry time derived from the earliest retained entry. Release the bucket lock **before** calling A/B and before any user/credential lock. Every replica uses this storage and key normalization. A bucket disappearing during cleanup must be recreated/retried with a bounded policy; don't treat it as unlimited admission. Cleanup obtains the row lock and rechecks staleness before deletion, and never deletes a recently updated bucket.

Register the proposed guard/store in the auth module. Concrete filenames such as `recovery-rate-limit.guard.ts` and `recovery-rate-limit.store.ts` are proposals, not existing symbols. Preserve existing applied migrations; deploy the new limiter migration before enabling the guard. Do not claim a fixed-window counter meets the rolling-window AC above.

### Implementation grounding (2026-10-15)

Grounded against the codebase as it exists after A/B/E. The proposed symbols become the concrete list in the sizing block below; the mechanism is unchanged.

- **Storage type verified:** the repo runs Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`, `prisma.config.ts`). A scratch generate + typecheck on 2026-10-15 confirmed the v7 client accepts `DateTime[] @default([])` (input `Date[] | string[]`, output `Date[]`) — the proposed `admittedAt` array works as planned; no `Json` fallback is needed.
- **Wiring points (existing files):** the two recovery routes live in `apps/api/src/modules/auth/auth.controller.ts` (`POST forgot-password` / `POST reset-password`, both already in `public-routes.ts`); the global `APP_GUARD` (`JwtAuthGuard`, default-deny) passes these public routes before the route-level limiter guard runs; `auth.module.ts` is the registration point. Guards execute before the global `ValidationPipe`, so the limiter counts attempts before DTO/service execution (AC1); malformed JSON bodies are rejected earlier by body parsing — the documented transport limitation.
- **Header preservation verified:** `apps/api/src/common/filters/all-exceptions.filter.ts` writes `response.status(...).json(body)` and never clears headers, so a `Retry-After` set on the response before throwing the 429 survives the filter (PR-001 contract).
- **Lock/time primitives:** reuse the `databaseNow` (`clock_timestamp()`) pattern from `owner-lock.ts`; the bucket lock is a parameterized `SELECT ... FOR UPDATE` on the unique `(endpoint, normalizedIp)` key.
- **CORS seam:** `main.ts` currently calls `app.enableCors({ origin, credentials })` with no `exposedHeaders`. A small shared options function (`src/common/cors.ts`) is used by both `main.ts` and the test helper (`src/test/test-http.ts`, which mirrors `main.ts` parity) so the integration spec asserts the real configuration rather than a copy.
- **Test infrastructure:** unit specs follow the fake-`tx` pattern of `password-reset.service.spec.ts`; the HTTP-level spec uses `createIntegrationApp` and the `describeIntegration` self-skip pattern (`DATABASE_URL` present → runs; absent → skips; CI always provides Postgres, as does the `test-http` documented dev flow).
- **Deployment topology (for AC4):** `docker-compose.yml` has no reverse proxy — the browser talks to the API container directly (`web:3000 → api:4000`), so the direct peer address is the real client address. Production topologies that add a proxy must explicitly configure `trust proxy` with trusted networks (documented in the implementation artifact); the default remains direct-peer, `X-Forwarded-For` inert.

### Decisions (settled at refinement)

| # | Decision |
|---|---|
| F-D1 | Storage: `RecoveryRateLimitBucket { id, endpoint, normalizedIp, admittedAt DateTime[] @default([]), updatedAt }`, `@@unique([endpoint, normalizedIp])`, table `recovery_rate_limit_buckets` (list support verified — grounding above). No relation to `User`: this is IP-scoped rate-limit state, not academic data (DoD 3 N/A). |
| F-D2 | Admission, in one interactive transaction: `upsert` (create `admittedAt: []`) → lock the row `FOR UPDATE` by unique key → fresh `clock_timestamp()` → prune entries `<= checkedAt - 60s` (an admission exactly 60s old frees its slot) → admit + append when fewer than the endpoint limit remain, otherwise deny with **no write** (denials never prolong the window). Stale windows (empty after prune) delete the row and create a fresh one — bounded cleanup; a row that disappears between upsert and lock retries once, then fails closed. |
| F-D3 | Guard resolves the bucket from `req.method` + `req.path` (only the two recovery routes; any other path fails closed) and the source address from Express `req.ip` (direct peer; `trust proxy` off). `::ffff:a.b.c.d` maps to `a.b.c.d`; malformed or missing addresses fail closed with the sanitized 503 — never pooled into a shared bucket. No `@Req()`/`X-Forwarded-For` in controllers. |
| F-D4 | 429: set `Retry-After: N` on the response, then throw `TooManyRequestsException('Too many recovery requests. Wait and try again.')`; `N = max(1, ceil(earliestRetained + 60s - checkedAt))`, 1–60, per the parent [retry wire contract](./SP-105-password-reset.md#retry-wire-contract-f-emits-c-consumes-d-verifies). 503: sanitized, account-independent `ServiceUnavailableException` for storage failure, unresolvable IP, or failed retry. Allowed requests keep A/B's contracts untouched. |
| F-D5 | Migration `20261015060000_recovery_rate_limit_buckets`: additive `CREATE TABLE` + unique index, SQL rendered by `prisma migrate diff --from-schema --to-schema` (offline; the v7 CLI removed `--to-schema-datamodel`). Generated client stays gitignored (`apps/api/src/generated/`); `db:generate` runs locally and in CI. Deploy the migration before enabling the guard (CI order: generate → lint → typecheck → `migrate deploy` → test). Rollback drops the table, which turns the guard into a fail-closed 503 — the feature cannot be silently left unprotected; the operator decision is recorded in the implementation artifact. |

## Tests and verification

- Stateful unit tests: first L requests admitted, L+1 denied; exactly-60-second expiry; denied attempts do not prolong the window; endpoint independence; unknown/known/malformed requests follow the same IP limit; no mutation on rejection; normalized-IP parity; spoofed forwarding headers ignored; shared-NAT behavior.
- Store/guard HTTP tests: rolling-window boundary burst, fake clocks plus real post-lock time behavior, generic filtered HTTP 429, exact Retry-After rounding/range at subsecond boundaries and CORS exposedHeaders, fail-closed 503 with sanitized errors, no email/token identifiers stored or logged, cleanup racing a request.
- J (using H; D executes): real PostgreSQL with two independent store instances racing the last slot; exactly one admitted, one 429; service restart keeps limits; exercise both endpoints and verify allowed-request generic responses, blocked mutation, and real-browser actionable retry.
- Document topology, thresholds, retention/cleanup, migration/rollback and operator verification in the eventual child implementation artifact. Rollback must not silently release an unprotected feature.

Test files (grounded): `recovery-rate-limit.store.spec.ts` and `recovery-rate-limit.guard.spec.ts` (new, unit — the stateful and guard cases above, including subsecond `Retry-After` rounding, spoofed-header parity, and fail-closed paths) and `recovery-rate-limit.http.spec.ts` (new, `describeIntegration` self-skip — filtered 429 envelope, `Retry-After` value/range, CORS `exposedHeaders`, seeded-window admission, no email/token identifiers stored, endpoint independence over real HTTP).

## Sizing block (2026-10-15)

- **Outcome:** shared PostgreSQL-backed per-IP rolling-window admission (10 forgot-password / 30 reset-password per 60s) on both public recovery endpoints — generic 429 with `Retry-After` when over limit, sanitized fail-closed 503 on storage failure, no mutation on denial — one security invariant across AC1–AC5.
- **Time estimate:** cohesive multi-window task, **~3–3.5 hours total** in four bounded milestones: M1 schema + migration + client generate + typecheck (~45 min); M2 store + store spec (~60 min); M3 guard + controller/module wiring + shared CORS options + guard spec (~60 min); M4 HTTP integration spec + full-suite/lint/typecheck verification + artifacts (~60 min). Justified against the 30–90 min default: the admission decision, fail-closed behavior, and no-mutation-on-denial are one atomic invariant that must ship together (story-sizing rule), and the guard cannot be verified at HTTP level without the store. The production footprint (~8 files) exceeds the 1–3 default because four of the files are additive one-to-few-line wirings of the single mechanism; splitting the guard from the store would strand a half-wired, unverifiable control. No fixed context cost is promised; the checkpoints bound context use.
- **Files:** production — `apps/api/prisma/schema.prisma` (add model), `apps/api/prisma/migrations/20261015060000_recovery_rate_limit_buckets/migration.sql` (new), `apps/api/src/modules/auth/recovery-rate-limit.store.ts` (new), `apps/api/src/modules/auth/recovery-rate-limit.guard.ts` (new), `apps/api/src/modules/auth/auth.controller.ts` (`@UseGuards` on the two routes), `apps/api/src/modules/auth/auth.module.ts` (providers), `apps/api/src/common/cors.ts` (new shared options), `apps/api/src/main.ts` (use it). Focused tests — `recovery-rate-limit.store.spec.ts`, `recovery-rate-limit.guard.spec.ts`, `recovery-rate-limit.http.spec.ts` (all new, same directory), plus a parity line in `apps/api/src/test/test-http.ts` (`app.enableCors(appCorsOptions())`).
- **Start context:** this story; the parent [shared API contract](./SP-105-password-reset.md#shared-api-contract-all-children-must-agree) and [retry wire contract](./SP-105-password-reset.md#retry-wire-contract-f-emits-c-consumes-d-verifies) sections; `owner-lock.ts` (`databaseNow`), `auth.controller.ts`, `auth.module.ts`, `public-routes.ts`, `password-reset.service.ts` (A — unchanged), `all-exceptions.filter.ts`, `test-http.ts`; parent README decisions SD8/PR-001 and the shared DoD in `docs/epics/README.md`. Dependencies link to A/B implementation artifacts; the sibling stories, correction history, and unrelated epic content are not needed to start.
- **Verification:** `pnpm --filter @studypilot/api db:generate && pnpm --filter @studypilot/api typecheck` (clean); `pnpm --filter @studypilot/api test` (store/guard unit suites pass; the HTTP suite self-skips without `DATABASE_URL` locally and always runs in CI; the 13 pre-existing DB skips remain the baseline); `pnpm --filter @studypilot/api lint` (0 errors). Observable pass conditions: 11th same-IP forgot request → `429` + integer `Retry-After` 1–60 + `Access-Control-Expose-Headers` containing `Retry-After`; over-limit attempts perform no user/token/email mutation; storage failure → sanitized 503. Optional local run of the HTTP suite: `docker compose up db -d` + `DATABASE_URL` + `prisma migrate deploy` (the repo's documented dev flow).
- **Dependencies / exclusions:** depends on A + B (implemented; the limiter runs *before* their DTO/service logic and leaves admitted requests on their exact contracts) and the SP-102 module/public-route wiring. Excluded with owners: per-account 60s issuance cooldown (A), redemption transaction + cookie expiry (B), session coordination (E), client retry countdown/boundary (G/C), real multi-instance limiter races (J via H), browser/SMTP/integrated sign-off (D), per-IP limits on login/register/verify endpoints (a future API-wide rate-limiting task — not part of AC7), and a background stale-bucket sweeper (operator follow-up; the in-transaction delete-on-stale bounds row lifetime for revisited IPs only — residual recorded in the implementation artifact).

## Definition of Done

[Shared DoD](../../../epics/README.md): 1, 2, 4, 8, 9 apply; 3 N/A (no academic data), 5–7 backend N/A (C handles UI retry); 10 required through D's integrated review. Preserve original AC7 and TR ownership in the breakdown README. No implementation or test evidence is claimed by this plan.

## Out of scope

- Any change to A/B/E behavior, DTOs, messages, or response shapes for admitted requests.
- A process-local (in-memory) limiter fallback or a second store — AC2 requires the shared PostgreSQL store; storage failure fails closed, it never disables limits.
- Rate limiting on endpoints other than the two recovery routes; login throttling remains SP-102 Q8's existing decision.
- Automatic retries, backoff clients, or frontend presentation (G/C), and all integrated/browser/SMTP evidence (D).
- Tracker mutation: the Jira child key remains Pending creation; no sync is implied by refinement. *(Updated 2026-10-17: this child is STUDY-27, created and verified by the authorized bootstrap sync.)*
