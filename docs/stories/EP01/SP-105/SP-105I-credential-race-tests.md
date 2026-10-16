# SP-105I: Recovery Credential Concurrency Suite

**Story ID:** SP-105I
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer / owner:** Integration tests, `implementer` (single sequential writer; layer is a scope label)
**Status:** Implemented (2026-10-16) — awaiting the combined SP-105 parent review ([implementation](./artifacts/SP-105I/implementation.md); [checkpoint](./artifacts/SP-105I/checkpoint.md))
**Dependencies:** [SP-105A](./SP-105A-password-reset-backend-issuance.md), [SP-105B](./SP-105B-password-reset-backend-redemption.md), [SP-105E](./SP-105E-auth-session-coordination.md) and [SP-105H](./SP-105H-postgres-test-harness.md) are implemented (awaiting parent review); H's [implementation](./artifacts/SP-105H/implementation.md) documents the helper contract consumed here
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-16

## Summary and bounded scope

Add one real-PostgreSQL suite that proves the SP-105 credential-concurrency invariants — single-use redemption, cross-operation ordering, expiry-after-wait, rollback and post-reset session outcomes — using H's fixtures, independently connected clients and deterministic lock barriers. Exclude limiter tests, harness construction, HTTP/cookie wiring, UI and sign-off. This is a test artifact only: if an assertion fails, the defect returns to A/B/E; this story changes no production code.

### Sizing and implementation boundary

- **Outcome:** a new Jest integration suite (`password-reset.integration.spec.ts`) drives the real `PasswordResetService` and `AuthService` against migrated PostgreSQL and deterministically proves the credential invariants, with no sleeps and no mocks of the lock/transaction path.
- **Time estimate:** ~3–5 hours total, a cohesive multi-window task delivered in the three bounded checkpoints below (AC1 foundation/races, AC2 ordering, AC3 expiry/rollback/post-reset). The uncertainty is the deterministic barrier for service-call contenders (H's `waitUntilBlocked` needs a contender PID that a service call does not expose) and the exact throwing-decorator shape; both are front-loaded into checkpoint 1.
- **Files:** create `apps/api/src/modules/auth/password-reset.integration.spec.ts` (test-only; small in-file helpers allowed). No production, schema, migration, `package.json` or CI change: the existing `test:integration` regex already selects `modules/auth/password-reset.integration.spec.ts`, and the ordinary `testPathIgnorePatterns` already excludes it.
- **Start context:** this story; EP01 and shared DoD; parent shared-contract sections "POST /auth/reset-password" and "Session semantics and ordering"; H's [implementation](./artifacts/SP-105H/implementation.md) helper API; `apps/api/src/modules/auth/testing/recovery-db-harness.ts`, `owner-lock.ts`, `password-reset.service.ts`, `auth.service.ts`, `../users/users.service.ts`, `dto/reset-password.dto.ts`; `apps/api/prisma/schema.prisma`; API Jest settings and the `test:integration` script. A/B/E are implemented; their unit suites are green and are not start prerequisites.
- **Verification:** from repo root, with a disposable `_test` PostgreSQL target configured: `pnpm --filter @studypilot/api db:generate`; `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy`; `pnpm --filter @studypilot/api run test:integration --runInBand` (must include the new file with zero skips); then `pnpm --filter @studypilot/api test --runInBand`, `pnpm --filter @studypilot/api typecheck`, and read-only `pnpm --filter @studypilot/api exec eslint src/modules/auth/password-reset.integration.spec.ts --max-warnings=0`. An unavailable database or missing migrations is a failed integration run, never a skip or a mock pass.
- **Dependencies / exclusions:** A/B/E/H implemented; H supplies clients, fixtures and barriers. SP-105J owns limiter admission/races/HTTP; SP-105D executes this suite and owns integrated/browser/SMTP evidence and the parent index; SP-105B's controller specs own the HTTP envelope and cookie. One sequential `implementer` owns all implementation layers.

## Source requirements

AC2/AC3/AC4 and the single-use/expiry and session-revocation TRs; [shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). Every test below is a future obligation, not a passing result.

## Acceptance criteria

1. Against migrated real PostgreSQL, one winner for **same-token** and **distinct-token** redemption: exactly one concurrent `resetPassword` succeeds and the loser fails uniformly. Seed distinct valid credentials directly (normal issuance retires prior tokens, so it cannot produce two live tokens for one owner).
2. Deterministic both-order coverage — sequentially and, for the genuine races, under a real owner-lock barrier — for issuance/redemption, eligible issuance/issuance, old-password login/reset and refresh/reset: reset-first rejects stale credentials; session-first may return success but the reset revokes the new family/successors. Other owners remain untouched; no owner/token deadlock.
3. Hold the owner lock across expiry so the fresh post-lock check rejects an expired token; inject a persistence failure to prove the password/token/family writes roll back; after a committed reset, a new-password login succeeds while the old password and every prior-family refresh fail, and a previously issued access JWT stays valid only for its configured expiry (SD7).

## Tests

Create `apps/api/src/modules/auth/password-reset.integration.spec.ts` using the H harness (Jest `describe`/`it`, same conventions as `testing/recovery-db-harness.integration.spec.ts`). Named cases below are proposed new cases, not passing evidence. Assert database state as well as each service's returned value or thrown exception.

| AC | Named case / observable result |
| --- | --- |
| 1 | `lets exactly one of two concurrent redemptions of the same token succeed` — hold the owner row, launch two real `resetPassword` calls with one seeded token, confirm genuine contention, release: one resolves with `RESET_SUCCESS_MESSAGE`, the other rejects `BadRequestException` with `INVALID_RESET_MESSAGE`; the token's `usedAt` is set once, the password hash is the new one, and the owner's refresh rows are revoked. |
| 1 | `lets exactly one of two concurrent redemptions of distinct valid tokens succeed` — create a second valid token directly as a `passwordResetToken` row (sha256 digest of a fresh 43-char base64url raw); exactly one winner; the loser fails uniformly; both transactions settle within the bound (no token-before-owner deadlock). |
| 2 | `issuance before redemption retires the previously issued token` — `forgotPassword` then redeem the earlier seeded token → uniform `400`; the freshly issued token still redeems. |
| 2 | `redemption before issuance leaves a fresh issuance valid` — redeem the seeded token, then `forgotPassword`: a new unused token exists and the redeemed token stays used. |
| 2 | `reset before an old-password login rejects the stale credentials` — reset commits, then `login(oldPassword)` rejects `UnauthorizedException` and writes no refresh row. |
| 2 | `login before reset has its new family revoked` — `login` succeeds (family F2), then reset revokes F2 (`revokedAt` set) and `refresh(F2 raw)` rejects. |
| 2 | `concurrent issuance and redemption serialize on the owner lock without deadlock` — hold the owner row, launch `forgotPassword` and `resetPassword` together, confirm contention, release: one consistent outcome, both settle, other owner untouched. |
| 2 | `concurrent login and reset leave no live session on the old password` — hold the owner row, launch `login(oldPassword)` and `resetPassword`, confirm contention, release: after both settle, the owner has no unrevoked refresh row (reset revokes a committed login family; a reset-first reset makes the login's locked re-check fail). |
| 1/2 | `leaves another account untouched` — with a second seeded owner, run the races above and assert B's user/reset/refresh rows are unchanged. |
| 3 | `rejects a token that expires while the redemption waits for the owner lock` — hold the owner row, start redemption of a valid token, confirm blocking, set that token's `expiresAt` to a past instant from a second connection, release: uniform `400` and no password/refresh mutation. |
| 3 | `rolls back token claim, retirement and family revocation when the password write fails` — inject a one-shot failure on the final `user.update` (see Mechanisms); the error propagates and the token `usedAt`, other unused tokens, refresh `revokedAt` and the stored hash are unchanged. |
| 3 | `allows a new-password login and rejects the old password and prior family after a reset` — after reset: `login(newPassword)` succeeds (new family); `login(oldPassword)` rejects; `refresh(prior-family raw)` rejects. |
| 3 | `keeps a previously issued access JWT valid only for its configured expiry` — decode the pre-reset access token: `exp - iat` equals the configured window and the token still verifies after the reset, while the old password and prior family are rejected (SD7; no denylist). |

SP-105D executes and links this suite as its evidence; it owns browser/SMTP/viewport sign-off. Rerun the existing API unit suites as a regression check. An unavailable `_test` database fails the explicit integration command rather than skipping.

## Technical evidence and exclusions

### Decisions

- **I1 — shape:** user accepted one cohesive suite file delivered in three bounded checkpoints (not a planner split); the ACs share H's fixtures/barriers and it is a single test artifact.
- **I2 — layer:** user accepted service-level testing — instantiate the real `PasswordResetService`/`AuthService` with H's real Prisma clients and assert DB state plus return/throw. No Nest HTTP app is booted; the HTTP envelope, `Set-Cookie` and 429/`Retry-After` stay with SP-105B's `auth.controller.spec.ts` and SP-105J.
- **I3 — rollback injection:** user accepted a test-only throwing transaction-client decorator (throws once on the final `user.update`); the earlier claim/retire/revoke run for real and PostgreSQL rolls them back. No production code.
- **I4 — ordering:** user accepted sequenced assertions for the two named orders plus `hold()`/`waitUntilBlocked()` owner-lock barriers for the genuine races, asserting winner-agnostic outcome invariants; no fixed sleeps.
- **I5 — SD7 window:** user accepted decoding the pre-reset token's `exp - iat` and asserting it still verifies after reset; no wall-clock wait.

### Relevant files and wiring

- New `apps/api/src/modules/auth/password-reset.integration.spec.ts` — the suite and its small test-only helpers.
- Consume `apps/api/src/modules/auth/testing/recovery-db-harness.ts` (H): `RecoveryDbHarness.run/create/close`, `.client`, `connection()`, `seed(options)` → `{ userId, refreshToken, resetToken, endpoint, normalizedIp }`, `hold(acquire)` → `{ pid, release() }`, `waitUntilBlocked(contenderPid, holderPid)`.
- Subject: `apps/api/src/modules/auth/password-reset.service.ts` (`forgotPassword`, `resetPassword`; `RESET_SUCCESS_MESSAGE`, `INVALID_RESET_MESSAGE`, `RESET_TOKEN_TTL_MS`, `COOLDOWN_MS`) and `auth.service.ts` (`login`, `refresh`, `ARGON2_OPTIONS`; login rejects with `'Invalid email or password'`, refresh with `'Invalid or expired session'`).
- Dependencies: `../users/users.service.ts` (`findByEmail`, constructor `(prisma)`), `apps/api/src/modules/auth/owner-lock.ts` (`lockOwner`, `databaseNow` — used by the barrier and the expiry case), `dto/reset-password.dto.ts` (token must be `^[A-Za-z0-9_-]{43}$`), `../email/email-provider.ts` (`EMAIL_PROVIDER` token for the email stub), `apps/api/src/modules/auth/recovery-rate-limit.store.ts` is **not** used here (J's scope).
- Read-only evidence: `apps/api/prisma/schema.prisma` `User`/`RefreshToken`/`PasswordResetToken`; migrations `20261013000000_refresh_tokens_drop_sessions`, `20261015000000_password_reset_tokens`, `20261015060000_recovery_rate_limit_buckets`; `apps/api/package.json` (`test:integration` regex) and `.github/workflows/ci.yml` (integration step) already cover the new file — expected unchanged.

### Mechanisms (grounded in inspected code)

- **Service construction.** Instantiate directly with the harness client cast to `PrismaService`: `new PasswordResetService(harness.client as unknown as PrismaService, emailStub, configStub)`, `new AuthService(new UsersService(harness.client as unknown as PrismaService), harness.client as unknown as PrismaService, jwtService, verificationStub)`. The email stub is `{ send: jest.fn().mockResolvedValue(undefined) }` behind `EMAIL_PROVIDER`; the config stub returns `FRONTEND_URL` (e.g. `http://localhost:3000`) and `NODE_ENV: 'test'`; `jwtService` is a real `JwtService` with a test secret and the module expiry (e.g. `expiresIn: '15m'`).
- **Fixtures.** `Harness.seed()` persists sha256 digests and returns raw tokens in memory. Its default `passwordHash` is an intentionally unusable digest, so login cases must pass a real hash: `seed({ passwordHash: await argon2.hash(oldPassword, ARGON2_OPTIONS) })`. Distinct valid reset tokens for the one-winner race are created directly as `passwordResetToken` rows with `sha256` digests — never by a second `forgotPassword`, which retires the first.
- **Deterministic barriers (no sleeps).** Hold the owner row with `harness.hold((tx) => lockOwner(tx, ownerId))`; launch the real service calls on `harness.client` as contenders; `release()` in `finally`. Because a service call does not expose its contender PID, confirm genuine contention by polling `pg_stat_activity`/`pg_blocking_pids` for a backend blocked by the holder PID (H's `waitUntilBlocked(contenderPid, holderPid)` is used where a contender PID exists, e.g. a raw `harness.connection()` transaction). Attach rejection handlers immediately and drain concurrent promises in `finally`; keep all waits bounded. This barrier is the checkpoint-1 uncertainty.
- **Expiry across the lock wait.** While the redemption is blocked on the owner lock, update the claimed token's `expiresAt` to a past instant from a second connection, then release: the fresh `clock_timestamp()` after the lock makes the conditional claim match zero rows.
- **Rollback decorator.** A `PrismaService`-shaped object whose `$transaction(fn)` delegates to the real client but passes a `Proxy` transaction client overriding `user.update` to throw once; every other operation passes through the real `tx`, so the earlier writes execute and PostgreSQL aborts them on the throw.
- **Safety.** Never log, persist or return raw tokens or passwords; diagnostics are sanitized (no URLs, parameters or credential material); teardown is H's fixture-only cleanup; diagnosis uses returned values/thrown exceptions and DB queries, never request dumps.

### Checkpoints and resume inputs

1. **Foundation and redemption races (AC1).** Build the service setup, stubs, seed helpers (real argon2 hash, directly-created distinct token) and the barrier helper; implement the same-token and distinct-token one-winner cases and the cross-owner isolation case. Verify with the focused `test:integration` command against migrated PostgreSQL. Resume from this story, the harness module and the new spec; record remaining work in `./artifacts/SP-105I/checkpoint.md`.
2. **Ordering (AC2).** Add the sequenced issuance/redemption, reset-first login, session-first family-revocation, concurrent issuance/redemption and concurrent login/reset cases. Re-run the focused command.
3. **Expiry, rollback and post-reset (AC3).** Add expiry-while-blocked, the throwing-decorator rollback case, and the post-reset login/refresh/access-JWT cases; then run the full `test:integration`, ordinary `test`, `typecheck` and read-only lint, and record real commands/results in `./artifacts/SP-105I/implementation.md`. Keep the checkpoint current; no child formal review is required.

### Out of scope

Limiter admission/races/window/failure and HTTP/CORS `Retry-After` proofs (SP-105J); H harness construction or changes to its helper module (SP-105H); HTTP envelope/`Set-Cookie` assertions (SP-105B controller specs); browser automation, real browser/SMTP sign-off, integrated DoD 10 evidence and the parent index (SP-105D); any production service/model/migration change (a failing assertion returns to A/B/E/F, never patched here); UI. AI, syllabus parsing, LMS integrations, grade calculations, flashcards and native mobile apps remain excluded.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet the local criteria, exercise invalid/failure paths, sanitize diagnostics, automate the assigned invariants and document commands/fixtures. DoD 3 N/A: no academic queries; seeded credential owners are isolated. UI states/keyboard/responsiveness (5–7) belong to C and D, with no new screen here. Item 10 remains required through D and the one combined SP-105 review; local completion is “Implemented — awaiting parent review”, not release approval. Use this delivery home's stable-ID `./artifacts/SP-105I/` paths; the parent review resolves to `./artifacts/SP-105/review.md`. No fabricated Jira key or passing result. Return readiness to the coordinator for queue reconciliation; this refiner does not edit README or Jira.
