# SP-105F: Password Reset — Shared Per-IP Limits

**Story:** [SP-105F](../../SP-105F-password-reset-ip-limits.md)
**Epic:** EP01 — Authentication & Onboarding
**Parent:** SP-105 (STUDY-7)
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Status:** Implemented (2026-10-15) — awaiting parent review

## Summary

Implemented the shared **per-IP rate limiting** half of SP-105 AC7: a PostgreSQL-backed
rolling-window admission store and a route-level guard on `POST /auth/forgot-password`
(10/60s) and `POST /auth/reset-password` (30/60s). Over-limit attempts receive an
account-independent `429` with integer `Retry-After` guidance; storage failures fail
closed with a sanitized `503`; denials mutate nothing. Admitted requests keep A/B's
exact contracts unchanged. Approved limits per SD8 (2026-10-14); retry wire contract
per the parent's PR-001.

## What was built

### Schema changes (F-D1)

| Change | File | Notes |
|---|---|---|
| `RecoveryRateLimitBucket` model | `prisma/schema.prisma` | `id`, `endpoint`, `normalizedIp`, `admittedAt DateTime[] @default([])`, `updatedAt`; `@@unique([endpoint, normalizedIp])`; mapped to `recovery_rate_limit_buckets` |
| Migration | `prisma/migrations/20261015060000_recovery_rate_limit_buckets/migration.sql` | Verbatim `prisma migrate diff --from-schema --to-schema` output: additive `CREATE TABLE` + unique index. Generated client stays gitignored; CI runs generate → lint → typecheck → `migrate deploy` → test |

**No relation to `User`** (F-D1): this is IP-scoped rate-limit state, not academic data —
DoD 3 is N/A by design, and the bucket rows hold only endpoint, IP, and timestamps.

### Admission store (F-D2)

`recovery-rate-limit.store.ts` — `RecoveryRateLimitStore.admit(endpoint, normalizedIp)`:

1. One interactive Prisma transaction: `upsert` the bucket (create with `admittedAt: []`)
2. `SELECT ... FOR UPDATE` on the unique `(endpoint, normalizedIp)` key
3. Fresh post-lock database clock (`clock_timestamp()` — reuses `databaseNow` from `owner-lock.ts`)
4. Prune entries `<= checkedAt − 60s` (an admission exactly 60s old frees its slot)
5. Under the endpoint limit → admit + append `checkedAt`; at the limit → **deny with zero writes** (a denial never prolongs the window)
6. Window empty after prune (stale) → delete the row and create a fresh one — bounded in-transaction cleanup
7. Row vanishing between upsert and lock → 1 bounded retry, then a sanitized, account-independent `ServiceUnavailableException` (503) — never a pass-through that silently disables the limits

`Retry-After` derivation: `N = max(1, ceil(earliestRetainedAdmission + 60s − checkedAt))` — integer 1–60, per the parent [retry wire contract](../../SP-105-password-reset.md).

### Route guard (F-D3 / F-D4)

`recovery-rate-limit.guard.ts` — `RecoveryRateLimitGuard`, `@UseGuards`-registered on
exactly the two recovery routes in `auth.controller.ts` (guards run before the global
`ValidationPipe` and before A/B services, so a denied attempt performs no DTO
transformation, account lookup, or credential mutation):

- Endpoint resolved from `req.method` + `req.path`; any route the guard does not own fails closed (503)
- Source address from Express `req.ip` (direct peer; `trust proxy` is not enabled, so client-supplied `X-Forwarded-For` is inert and cannot steer the bucket); `::ffff:a.b.c.d` normalizes to dotted-quad, lowercase, zone ids preserved; unresolvable → fail-closed 503
- Denial: `Retry-After: N` set on the response **before** throwing, then the 429. Nest 10.4 has no `TooManyRequestsException`, so the body is an explicit `HttpException` with `{ statusCode: 429, message: RATE_LIMITED_MESSAGE, error: 'Too Many Requests' }` — the standard envelope, written by the global `AllExceptionsFilter`, which never clears headers (verified; PR-001)
- Message: `"Too many recovery requests. Wait and try again."` for every account state — no cooldown or existence leak (SD9)

### CORS (PR-001)

`src/common/cors.ts` — `appCorsOptions()`: `{ origin: FRONTEND_URL, credentials: true, exposedHeaders: ['Retry-After'] }`, used by **both** `main.ts` and the integration helper `src/test/test-http.ts`, so the HTTP spec asserts the real configuration rather than a copy. The SPA can read `Retry-After` cross-origin; no other response headers are exposed.

### Module wiring

| File | Change |
|---|---|
| `auth.controller.ts` | `@UseGuards(RecoveryRateLimitGuard)` on `POST forgot-password` and `POST reset-password` |
| `auth.module.ts` | Providers: `RecoveryRateLimitStore`, `RecoveryRateLimitGuard` |
| `auth.controller.spec.ts` | The manual HTTP-contracts test module now supplies an always-allow `RecoveryRateLimitStore` mock (the guard is part of the controller's route metadata); those contracts test the services, and the limiter has its own suites |
| `src/common/cors.ts` / `src/main.ts` / `src/test/test-http.ts` | Shared CORS options incl. `exposedHeaders` (main.ts parity) |

### Test coverage (40 new tests)

| Test file | Tests | Coverage |
|---|---|---|
| `recovery-rate-limit.store.spec.ts` | 18 | Admit L, deny L+1 per endpoint; exactly-60s slot release; denials never write or prolong; endpoint independence; stale-window delete-and-recreate; vanishing-row bounded retry → sanitized 503; raw SQL failure → sanitized 503 (no address/database detail); garbage window data → 503; only the four bucket fields written (no emails/tokens/bodies) |
| `recovery-rate-limit.guard.spec.ts` | 17 | Both routes admitted to their limits then 429 with `Retry-After`; endpoint map fails closed on foreign routes; `req.ip` normalization (`::ffff:`, case, zone id) and fail-closed on malformed/missing; spoofed `X-Forwarded-For` ignored; 429 shape + `Retry-After` set before throw; 503 sanitization; admitted requests pass through untouched |
| `recovery-rate-limit.http.spec.ts` | 5 | `describeIntegration` (self-skips without `DATABASE_URL`; always runs in CI) against a real Postgres: 10×200 then a filtered 429 with envelope + `Retry-After` 1–60 + `Access-Control-Allow-Origin`/`-Credentials`/`Expose-Headers: Retry-After`; full 30-window reset 429 with **no** user/token mutation and an unchanged window; endpoint-bucket independence over real HTTP; bucket rows store only endpoint/IP/timestamps (no marker email anywhere); admitted reset traffic reaches B's uniform 400 |

## Verification

Run 2026-10-15 against an ephemeral disposable Postgres 15 container (port 5433; the
user's local database on 5432 was not touched), all 6 migrations applied:

- `pnpm --filter @studypilot/api typecheck` → clean
- `pnpm --filter @studypilot/api test` (with `DATABASE_URL`) → **22 suites, 255 passed, 0 failed, 0 skipped** (baseline at E was 202 passed + 13 DB skips; F adds 35 unit + 5 integration = 40)
- `pnpm --filter @studypilot/api test` (without `DATABASE_URL`) → 20 of 22 suites, 237 passed, 18 skipped (the two integration suites self-skip; local dev contract preserved)
- `pnpm --filter @studypilot/api lint` → 0 errors (1 pre-existing `no-console` warning in `main.ts`, out of scope)
- `prisma migrate deploy` on the fresh container → clean (additive migration)
- Real 429 wire check (direct probe of the integration app): `Retry-After: 60`, `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`, `Access-Control-Expose-Headers: Retry-After` all present on the filtered 429 — confirming PR-001 end to end

## Review corrections

| Finding | Severity | Disposition |
|---|---|---|
| The 429 CORS assertion in `recovery-rate-limit.http.spec.ts` read `res.headers['access-control-credentials']` — the header name is `access-control-allow-credentials`. The production behavior was correct all along (verified by a direct wire probe before the fix); the test key was the defect. | Should-fix (test-only) | ✅ Corrected to `access-control-allow-credentials`; suite 5/5 green against real Postgres. |
| `auth.controller.spec.ts` manual module failed to compile after the guard landed (Nest instantiates route guards; the store was not provided). | Should-fix (test-only) | ✅ Added an always-allow `RecoveryRateLimitStore` provider with a comment; 26/26 green. |
| A request-side comment implied `cors@2.8.5` only emits `Access-Control-Allow-Credentials` for Cookie-bearing requests — false (it emits it unconditionally when `credentials: true`). | Polish (comment) | ✅ Reworded; the Cookie is kept in the test to mirror the real SPA, not because cors requires it. |

## Acceptance criteria status

| AC | Status | Notes |
|---|---|---|
| 1 | ✅ | Guard runs before DTO/service; separate 10/30 buckets per normalized IP; admits counted regardless of email/token validity; A's per-account cooldown untouched |
| 2 | ✅ | Shared PostgreSQL storage (no process-local map); row locked `FOR UPDATE` before the admit decision; denial writes nothing (HTTP spec asserts no user/token mutation, window unchanged). Multi-instance race proof is SP-105J (needs H) |
| 3 | ✅ | Uniform 429 message for every account state; integer `Retry-After` 1–60 set before throw and preserved by the global filter; `Retry-After` exposed via CORS; allowed requests keep A/B contracts (HTTP spec) |
| 4 | ✅ | `req.ip` direct peer; XFF inert; IPv4-mapped IPv6 normalized; fail-closed 503 on unresolvable IP; no `@Req()`. Topology: the compose stack has no proxy (browser → api direct); documented proxy deployments must set `trust proxy` explicitly — the default never trusts client headers |
| 5 | ✅ | Bucket stores only endpoint/IP/timestamps (asserted in unit + HTTP specs); in-transaction delete-on-stale bounds row lifetime for revisited IPs; storage failure → sanitized 503 (unit: raw failure, garbage data, vanishing row) |

## DoD checklist (shared)

| DoD | Status |
|---|---|
| 1 functional criteria | ✅ AC1–AC5 above |
| 2 invalid input validation | ✅ Admission inputs (route, source address) validated; malformed → fail-closed 503 |
| 3 academic data scope | N/A — no academic data; IP-scoped rate-limit state, no `User` relation |
| 4 actionable errors | ✅ Actionable 429 + `Retry-After`; sanitized 503 (D verifies integrated) |
| 5–7 UI states/keyboard/responsive | N/A backend (C handles UI retry) |
| 8 automated business-rule tests | ✅ 18 store + 17 guard + 5 real-DB HTTP |
| 9 API/migration documentation | ✅ this artifact (topology, thresholds, retention, migration/rollback) |
| 10 integrated development review | Via SP-105D's combined review; held for the parent |

## Deployment and rollback (F-D5)

- **Deploy:** apply migration `20261015060000` before the guard-bearing build (CI order guarantees generate → `migrate deploy` → test). Thresholds: 10 / 30 per 60s, per SD8; changes require a plan-level decision.
- **Retention:** rows are bounded by the window for any IP that returns (in-transaction delete-on-stale). IPs that never return leave a row of ≤30 timestamps; a background sweeper for never-revisited rows is a documented **operator follow-up**, not a release blocker (no security impact — an unrevisited IP holds no protection debt).
- **Rollback:** dropping the table turns every recovery request into a fail-closed sanitized 503 — the feature can never be silently left unprotected. The operator decision is to keep the migration applied and roll back the code if the limiter itself must come down.
- **Proxy topologies:** the default trusts the direct peer (`trust proxy` off). Any deployment adding a trusted proxy must configure it explicitly; untrusted deployments get XFF-inert behavior by default.

## Open items

- **SP-105J** (needs H): real multi-instance limiter race (two clients, last slot, one admission) + service-restart persistence. F's proofs stop at unit + single-app HTTP vs real Postgres.
- **SP-105D**: real-browser readability of the 429/`Retry-After` (PR-001), SMTP/integrated sign-off, DoD 10.
- **Background stale-bucket sweeper**: operator follow-up (see Rollback/retention).
- **SP-103** integrated DoD 1/7/10: feature **release** gate only — does not block F or G.

## Files modified/created

| File | Type |
|---|---|
| `apps/api/prisma/schema.prisma` | Modified (add model) |
| `apps/api/prisma/migrations/20261015060000_recovery_rate_limit_buckets/migration.sql` | New |
| `apps/api/src/modules/auth/recovery-rate-limit.store.ts` (+spec) | New (18 tests) |
| `apps/api/src/modules/auth/recovery-rate-limit.guard.ts` (+spec) | New (17 tests) |
| `apps/api/src/modules/auth/auth.controller.ts` | Modified (`@UseGuards` on two routes) |
| `apps/api/src/modules/auth/auth.module.ts` | Modified (providers) |
| `apps/api/src/modules/auth/auth.controller.spec.ts` | Modified (store mock for the manual module) |
| `apps/api/src/modules/auth/recovery-rate-limit.http.spec.ts` | New (5 integration tests) |
| `apps/api/src/common/cors.ts` | New (shared options) |
| `apps/api/src/main.ts` | Modified (use shared options) |
| `apps/api/src/test/test-http.ts` | Modified (CORS parity line) |

**Commits:** `2e8b85d` (M1 model + migration), `c5fe2d4` (M2 store + unit), `f671b85` (M3 guard + wiring + CORS), `b3777e8` (M4 HTTP spec + controller-spec provider + store-spec helper).
