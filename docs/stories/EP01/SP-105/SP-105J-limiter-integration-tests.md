# SP-105J: Recovery Shared-Limiter Concurrency Suite

**Story ID:** SP-105J
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer / owner:** Integration tests, `implementer` (single sequential writer; layer is a scope label)
**Status:** Implemented (2026-10-16) — awaiting the combined SP-105 parent review ([implementation](./artifacts/SP-105J/implementation.md); [checkpoint](./artifacts/SP-105J/checkpoint.md))
**Dependencies:** [SP-105F](./SP-105F-password-reset-ip-limits.md) and [SP-105H](./SP-105H-postgres-test-harness.md) are implemented (awaiting parent review). H's [implementation](./artifacts/SP-105H/implementation.md) is the helper contract. F's store is the subject.
**Jira key:** STUDY-31
**Refined:** 2026-10-16
**Review unit:** one combined SP-105 review after every child, including D, is implemented. Child tests and DoD stay here. Formal review resolves to `./artifacts/SP-105/review.md`. This child does not require its own `review.md`.

## Summary and bounded scope

Add one real-PostgreSQL suite that proves the shared recovery limiter cannot overshoot or fail open when two clients race one bucket. Use H's fixtures, independent clients, and deterministic lock barriers. This is a test artifact only: a failing assertion returns to F. This story changes no production code, schema, migration, harness, package script, or CI workflow.

Filtered HTTP, CORS, spoofed forwarding headers, the exact `Retry-After` rounding table, and the sanitized 503 message are already owned by F's passing specs. Browser retry and integrated sign-off stay with D.

### Sizing and implementation boundary

- **Outcome:** a new Jest integration suite (`recovery-rate-limit.integration.spec.ts`) drives two real `RecoveryRateLimitStore` instances against migrated PostgreSQL and proves one shared bucket admits exactly one winner at the last slot, keeps that window across a new client, prunes with `clock_timestamp()`, and turns a stale-row cleanup race into a bounded retry.
- **Time estimate:** ~2.5–4 hours total, a cohesive multi-window task in the three checkpoints below. The uncertainty is confirming two service calls are blocked on the bucket row (they do not expose a PID) and asserting the stale delete-and-recreate race settles at exactly two admissions. Both are front-loaded into checkpoints 1 and 3. One story: the cases share H's fixtures and one serialization invariant. Splitting the last-slot race from the cleanup race would copy the same barrier into two tickets.
- **Files:** create `apps/api/src/modules/auth/recovery-rate-limit.integration.spec.ts` (test-only; small in-file helpers allowed). No production, schema, migration, harness, `package.json`, or CI change. The existing `test:integration` regex already selects `modules/auth/recovery-rate-limit.integration.spec.ts`, and `testPathIgnorePatterns` already excludes it from ordinary `test`, watch, and coverage.
- **Start context:** this story; EP01 and shared DoD; parent shared-contract sections `POST /auth/forgot-password`, `POST /auth/reset-password`, and "Retry wire contract"; F's [implementation](./artifacts/SP-105F/implementation.md) residual (two clients, last slot, restart persistence); H's [implementation](./artifacts/SP-105H/implementation.md) helper API; `apps/api/src/modules/auth/recovery-rate-limit.store.ts`, `owner-lock.ts` (`databaseNow`), `testing/recovery-db-harness.ts`; the in-file `waitUntilBlockedCount` in `password-reset.integration.spec.ts` (copy the query, do not edit that spec); `apps/api/prisma/schema.prisma` `RecoveryRateLimitBucket`; `apps/api/package.json` Jest settings. F's unit and HTTP specs are evidence of what is already proved, not start-up reading for every case.
- **Verification:** from the repo root, with a disposable `_test` PostgreSQL target configured: `pnpm --filter @studypilot/api db:generate`; `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy`; `pnpm --filter @studypilot/api run test:integration --runInBand` (the new file runs with zero skips). Then `pnpm --filter @studypilot/api test --runInBand`, `pnpm --filter @studypilot/api typecheck`, and read-only `pnpm --filter @studypilot/api exec eslint src/modules/auth/recovery-rate-limit.integration.spec.ts --max-warnings=0`. Checkpoint runs may add `--testPathPattern=recovery-rate-limit.integration`. An unavailable database or missing migrations fails the integration command. It is never a skip or a mock pass.
- **Dependencies / exclusions:** F and H implemented. F's `recovery-rate-limit.store.spec.ts`, `recovery-rate-limit.guard.spec.ts`, and `recovery-rate-limit.http.spec.ts` own single-client window math, X-Forwarded-For, filtered 429/CORS, generic 200, and sanitized 503. SP-105D executes this suite and owns browser/SMTP evidence and the parent index. SP-105I owns credential races. One sequential `implementer` owns all implementation layers.

## Source requirements

AC1 and AC7, plus the generic-response and rate-limit test requirements, for the shared-store race those requirements still lack. [Shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). Every test below is a future obligation, not a passing result.

F already records passing proofs for the filtered envelope, CORS `Retry-After` exposure, generic forgot 200, reset 429 with no user/token write, endpoint independence over one HTTP app, spoofed `X-Forwarded-For`, exact `retryAfterSeconds` rounding, and fail-closed 503 on a mocked storage error. This suite does not re-open those cases. The original multi-instance obligation (F's test note and implementation residual) is the work here.

## Acceptance criteria

1. Against migrated real PostgreSQL, two independent `RecoveryRateLimitStore` instances race the last rolling-window slot on each endpoint: exactly one admission, one denial, and a window whose length equals that endpoint's limit. A store constructed on a new connection still denies a full persisted window. A `reset-password` admission completes while `forgot-password` contenders are blocked on the other row.
2. Using `clock_timestamp()` as the only clock, an oldest admission that is already outside the 60-second window frees one slot, and a full window whose oldest admission is still inside it denies with the same timestamps and an integer `retryAfterSeconds` from 1 to 60.
3. Two admits racing a fully stale bucket both succeed through the store's delete-and-recreate plus one bounded retry, leaving exactly one row and two timestamps. Seeded password, reset-token, and refresh rows are unchanged across denial and these races. A second miss is not manufactured here.

## Tests

Create `apps/api/src/modules/auth/recovery-rate-limit.integration.spec.ts` using the H harness (Jest `describe`/`it`, same conventions as `testing/recovery-db-harness.integration.spec.ts` and `password-reset.integration.spec.ts`). Named cases below are proposed new cases, not passing evidence. Assert database state and each `admit` result.

| AC | Named case / observable result |
| --- | --- |
| 1 | `admits exactly one of two clients racing the last forgot-password slot` — seed 9 timestamps a few seconds old (the 10-second hold must not age them out), hold the bucket row, launch two `admit('forgot-password', ip)` calls, confirm two blocked backends, release: one `{ allowed: true }`, one `{ allowed: false, retryAfterSeconds }` integer 1–60, `admittedAt` length 10, oldest seeded timestamp still present. |
| 1 | `admits exactly one of two clients racing the last reset-password slot` — same barrier with 29 timestamps a few seconds old and `admit('reset-password', ip)`; length ends at 30. |
| 1 | `admits reset-password while forgot-password contenders are blocked` — with two forgot contenders confirmed blocked, `admit('reset-password', sameIp)` resolves `{ allowed: true }` before release; the forgot row stays at 9 until release, then the forgot race ends at exactly one extra admission. |
| 1 | `a new store on a new connection denies a full persisted window` — seed 10 in-window forgot timestamps; `new RecoveryRateLimitStore` on `connection()` returns `allowed: false`; `admittedAt` timestamps are unchanged. A second new store denies again. |
| 2 | `frees a slot when the oldest admission is already outside the 60 second window` — seed 10 timestamps: the oldest is `clock_timestamp()` minus 61 seconds and the other nine are a few seconds old. The next `admit` is allowed, length stays 10, and that oldest timestamp is gone. |
| 2 | `denies a full in-window bucket without changing its timestamps` — seed 10 timestamps inside the window, the oldest at `clock_timestamp()` minus 30 seconds and the rest newer. `admit` is denied, `admittedAt` is unchanged, and `retryAfterSeconds` is within 2 seconds of `retryAfterSeconds(oldest, fresh clock_timestamp())` read around the call. |
| 3 | `serializes two admits on a fully stale bucket into exactly two admissions` — seed 3 timestamps at `clock_timestamp()` minus 120 seconds, hold the row, launch two admits, confirm two blocked backends, release: both `allowed: true`, one row for that key, `admittedAt` length 2. |
| 3 | `leaves the seeded user's password, reset token, and refresh row unchanged` — after a full-window denial and the forgot last-slot race, `passwordHash`, reset `usedAt`, and refresh `revokedAt` match the pre-call snapshot, and the bucket JSON contains neither the fixture email nor `@recovery.test`. |

SP-105D executes and links this suite. Re-run the existing API unit suites as a regression check. An unavailable `_test` database fails the explicit integration command.

## Technical evidence and exclusions

### Decisions

- **J1 — proof layer:** the scope question was declined, so the refiner adopted the store-level suite. F's implementation residual is two clients racing the last slot plus restart persistence. HTTP envelope, CORS, `X-Forwarded-For`, generic 200, and sanitized 503 stay in F's existing specs. Browser retry stays with D.
- **J2 — restart:** a new `RecoveryRateLimitStore` on `harness.connection()` is the restarted replica. The limit lives in the Postgres row. No process kill.
- **J3 — clock:** seed timestamps from `databaseNow` / `clock_timestamp()`. Exact equality at 60.000 seconds stays in F's `frees a slot exactly 60 seconds after an admission` and the `retryAfterSeconds` table, because a later real `clock_timestamp()` cannot be pinned to the seed instant. This suite uses a 61-second-old entry and a 30-second-old entry, with a 2-second tolerance on the denial's retry value.
- **J4 — cleanup race:** the fully stale two-client race is the missing-bucket proof. The winner delete-and-recreates; the waiter observes no row and retries once inside `admit`. Do not add a second deleter and do not change `hold()`. F's unit case `retries once when the row disappears between upsert and lock, then fails closed` keeps the double-miss 503.
- **J5 — callouts:** no further callouts were supplied after the declined scope question.

### Relevant files and wiring

- New `apps/api/src/modules/auth/recovery-rate-limit.integration.spec.ts` — the suite and its small test-only helpers.
- Consume `apps/api/src/modules/auth/testing/recovery-db-harness.ts` (H): `RecoveryDbHarness.run`, `.client`, `connection()`, `seed({ bucket: true, endpoint, admittedAt })` → `{ userId, refreshToken, resetToken, endpoint, normalizedIp }`, `hold(acquire)` → `{ pid, release() }`. Copy the recursive `waitUntilBlockedCount` query from `password-reset.integration.spec.ts` into this file. `waitUntilBlocked(contenderPid, holderPid)` needs a contender PID that `admit` does not expose.
- Subject: `recovery-rate-limit.store.ts` — `RecoveryRateLimitStore.admit`, `RECOVERY_LIMITS` (`forgot-password` 10, `reset-password` 30), `RECOVERY_WINDOW_MS` (60_000), `retryAfterSeconds`. Private `ADMISSION_ATTEMPTS` is 2. Denial writes nothing. A pruned-empty window `delete`s the row and `create`s a new one. A missing row between upsert and `FOR UPDATE` returns null and retries once, then throws `ServiceUnavailableException` with `RECOVERY_UNAVAILABLE_MESSAGE`.
- Clock: `databaseNow` in `owner-lock.ts` (`SELECT clock_timestamp()`). The store calls it after the bucket lock.
- Read-only evidence: `schema.prisma` `RecoveryRateLimitBucket` (`admittedAt` is `TIMESTAMP(3)[]`, unique `(endpoint, normalizedIp)`, no `User` relation); migration `20261015060000_recovery_rate_limit_buckets`; `apps/api/package.json` `test:integration` and `testPathIgnorePatterns`; `.github/workflows/ci.yml` already runs `pnpm --filter @studypilot/api run test:integration --runInBand` after migrations. Expected unchanged.

### Mechanisms (grounded in inspected code)

- **Store construction.** `new RecoveryRateLimitStore(client as unknown as PrismaService)` on `harness.client` and on each `await harness.connection()`. Two racing calls use two connections. Do not boot Nest, supertest, or the guard.
- **Fixtures.** `seed({ bucket: true, endpoint, admittedAt })` registers the compound key, so a later delete-and-recreate of that same key is still removed by `close()`. Timestamps come from `databaseNow(harness.client)` minus a fixed offset, at millisecond precision. `Date.now()` is not the window clock. In-window race timestamps are only a few seconds old, so the 10-second hold cannot push them out of the window. On the slot-freeing case, only the oldest timestamp is past 60 seconds; the other nine stay a few seconds old, so the result length is 10 (nine retained plus one append) rather than a full stale replace. `seed()` also inserts one user, one refresh row, and one reset row; use those for the unchanged-credential assertion. Raw tokens stay in local variables and are not logged, asserted as text, or written into errors.
- **Untracked second bucket.** `seed()` registers one bucket. The isolation case's `reset-password` row is created by `admit` on the forgot fixture's IP, so it is not tracked. Delete that compound key in a `finally` before `close()`. Do not add a harness registration method.
- **Last-slot barrier.** `hold` runs `SELECT "id" FROM "recovery_rate_limit_buckets" WHERE "endpoint" = ${endpoint} AND "normalizedIp" = ${normalizedIp} FOR UPDATE` and returns. Launch both `admit` calls, attach rejection handlers immediately, and `waitUntilBlockedCount(harness.client, held.pid, 2)`. `release()` in `finally`, then drain both promises. No fixed sleep. The in-window last slot updates the same row in place (`retained.length > 0`), so both waiters share that lock and the loser re-reads the winner's append.
- **Stale race.** Same barrier with every seeded timestamp 120 seconds before `databaseNow`. On release the winner's retained window is empty, so it deletes and creates; the waiter gets no row from `FOR UPDATE`, returns null, and the in-transaction retry upserts the new row and appends. Expect length 2, not 1 and not a 503.
- **Isolation.** Start the forgot barrier first and confirm two blockers. The reset `admit` uses a different row, so it resolves before `release`. Re-check that the two forgot backends are still blocked, then release.
- **Safety.** Thrown diagnostics include the expected and observed blocked counts only. Do not stringify query text, addresses, or credential material. Teardown is H's fixture cleanup plus the explicit reset-bucket delete above.

### Checkpoints and resume inputs

1. **Last-slot races (AC1).** Build store construction, `databaseNow` seeding, the copied blocker query, and the two last-slot cases plus the cross-endpoint case. Verify with the focused integration command against migrated PostgreSQL. Resume from this story, the harness module, the store, and the new spec. Record remaining work in `./artifacts/SP-105J/checkpoint.md`.
2. **Restart and window (AC1 restart, AC2).** Add the new-connection denial and the 61-second and 30-second window cases. Re-run the focused command.
3. **Stale race and credential snapshot (AC3).** Add the fully stale two-admit case and the unchanged user/token/refresh assertion. Run the full `test:integration`, ordinary `test`, `typecheck`, and read-only lint. Record real commands and results in `./artifacts/SP-105J/implementation.md`. Keep the checkpoint current. No child formal review.

### Out of scope

Filtered HTTP 429 envelope, CORS `exposedHeaders`, generic forgot 200, and single-app no-mutation checks (`recovery-rate-limit.http.spec.ts`, SP-105F). Spoofed `X-Forwarded-For`, `req.ip` normalization, and guard 503 (`recovery-rate-limit.guard.spec.ts`, SP-105F). Exact 60.000-second equality, `retryAfterSeconds` ceil table, mocked double-miss 503, and garbage window data (`recovery-rate-limit.store.spec.ts`, SP-105F). Harness changes (SP-105H). Credential redemption races (SP-105I). Browser, SMTP, and the parent index (SP-105D). Any production service, model, or migration change. UI. AI, syllabus parsing, LMS integrations, grade calculations, flashcards, and native mobile apps remain excluded.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet the local criteria, exercise the denial and stale-race paths, sanitize diagnostics, automate the assigned invariants, and document commands and fixtures. DoD 3 is N/A: no academic queries; seeded credential owners stay isolated, and bucket rows hold endpoint, IP, and timestamps. UI states, keyboard, and responsiveness (5–7) belong to C and D. Item 10 remains required through D and the one combined SP-105 review. Local completion is "Implemented — awaiting parent review", not release approval. Use `./artifacts/SP-105J/` for this child's checkpoint and implementation record. The parent review resolves to `./artifacts/SP-105/review.md`. No fabricated Jira key or passing result. Return readiness to the coordinator for queue reconciliation; this refiner does not edit the README or Jira.
