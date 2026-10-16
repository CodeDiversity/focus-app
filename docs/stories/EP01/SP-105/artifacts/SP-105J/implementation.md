# SP-105J implementation

Updated: 2026-10-16 America/New_York
Status: **Implemented — awaiting parent review**
Review unit: SP-105; final combined review after D and every other parent obligation.
Story: [SP-105J](../../SP-105J-limiter-integration-tests.md)

## Delivered

One test-only real-PostgreSQL suite proving the shared recovery limiter cannot
overshoot or fail open when two clients race one bucket. No production service,
guard, schema, migration, harness, package script, or CI change.

- `apps/api/src/modules/auth/recovery-rate-limit.integration.spec.ts` (new) — 8 cases
  across AC1–AC3, plus in-file helpers for window seeding, the transitive lock
  barrier, and two-client `admit` races.

Test discovery is unchanged. Ordinary `testPathIgnorePatterns` keeps the file
out of `test`, watch, and coverage. The existing `test:integration` regex
already selected it.

## Invocation and disposable database contract

Supply `TEST_DATABASE_URL` yourself. It must be a PostgreSQL URL whose database
name ends in `_test`. The harness never falls back to `DATABASE_URL`. An
unavailable target or missing migrations fails the explicit integration command.

From the repository root, with a disposable migrated target configured:

```sh
pnpm --filter @studypilot/api db:generate
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy
pnpm --filter @studypilot/api run test:integration --runInBand
```

`run` is explicit because this workspace's pnpm interprets bare `test --runInBand`
as pnpm options. Focused runs may add `--testPathPattern=recovery-rate-limit.integration`.

## Consumed contracts (DoD 9)

- H: `RecoveryDbHarness.create()` / `close()`, `.client`, `connection()`,
  `seed({ bucket: true, endpoint, admittedAt })`, and `hold()`. The second
  endpoint row created by the isolation case is deleted in that test's `finally`
  because `seed()` tracks only one bucket. The harness module was not changed.
- F: `RecoveryRateLimitStore.admit` on two clients cast from harness clients.
  Limits are `RECOVERY_LIMITS` (10 forgot, 30 reset). Denial returns
  `{ allowed: false, retryAfterSeconds }` and writes nothing. A fully stale
  window deletes and recreates the row; a waiter that finds no row retries once
  inside the same transaction.
- Clock: `databaseNow` (`clock_timestamp()`). Seed timestamps are millisecond
  values derived from that clock. `Date.now()` is not the window authority.
- Barrier: the same transitive `pg_blocking_pids` count used by SP-105I, copied
  into this file. Thrown errors include the expected and observed counts only.

## Mechanisms

- **Last slot.** Seed `limit - 1` timestamps a few seconds old, hold
  `SELECT ... FOR UPDATE` on that bucket, launch two `admit` calls, confirm two
  blocked backends, then release. Exactly one call is allowed. The row length
  equals the endpoint limit, and the oldest seeded timestamp is still present.
- **Restart.** A new `RecoveryRateLimitStore` on `connection()` denies a full
  persisted window. A second new store denies again. `admittedAt` is unchanged
  after both calls.
- **Cross-endpoint.** While two forgot contenders are blocked, `admit('reset-password', sameIp)`
  resolves allowed, and the two forgot backends are still blocked. After release
  the forgot race still has exactly one winner.
- **Window.** An oldest entry 61 seconds before the seed clock is gone after the
  next admit, and the other nine recent entries keep the length at 10. A full
  window whose oldest entry is 30 seconds old denies, keeps every timestamp, and
  returns `retryAfterSeconds` within 2 seconds of `retryAfterSeconds(oldest, clock)`
  read around the call.
- **Stale race.** Three timestamps 120 seconds old. Both admits are allowed.
  One row remains, with length 2.
- **Credentials.** After a full-window denial and a forgot last-slot race,
  `passwordHash`, reset `usedAt`, and refresh `revokedAt` match the pre-call
  snapshot. Bucket JSON does not contain the fixture email.

## Acceptance coverage

| AC | Cases |
| --- | --- |
| AC1 | forgot last-slot one-winner; reset last-slot one-winner; reset admission while forgot contenders are blocked; new connection denies a full window |
| AC2 | 61-second-old entry frees a slot; 30-second full window denies with unchanged timestamps |
| AC3 | stale two-admit race ends at exactly two admissions; seeded password, reset token, and refresh row unchanged |

## Verification actually executed

- Disposable PostgreSQL 15 container (`postgres:15-alpine`, `--rm`, `localhost:5433`,
  database name ending in `_test`). `prisma migrate deploy` applied all six
  migrations. The container was removed after the run. The local `studypilot`
  database on port 5432 was not migrated or written.
- `pnpm --filter @studypilot/api db:generate` → Prisma client 7.10.0 generated.
- Focused `pnpm --filter @studypilot/api run test:integration --runInBand --testPathPattern=recovery-rate-limit.integration` → **1 suite / 8 tests passed, 0 skipped**.
- `pnpm --filter @studypilot/api run test:integration --runInBand` → **3 suites / 26 tests passed, 0 skipped** (H 3 + I 15 + J 8).
- `pnpm --filter @studypilot/api run test --runInBand` with no database URL → **20 suites / 237 passed, 2 suites / 18 skipped**. SMTP integration stayed in ordinary discovery. The pre-existing exception-filter spec still prints its intentional synthetic error log.
- `pnpm --filter @studypilot/api typecheck` → clean.
- `pnpm --filter @studypilot/api exec eslint src/modules/auth/recovery-rate-limit.integration.spec.ts --max-warnings=0` → clean.
- `jest --listTests` → the new file is absent from ordinary discovery and present under the `test:integration` regex, with the harness and credential suites.
- `git diff --check` → clean.

## Remaining parent scope

SP-105D executes this suite and owns browser/SMTP sign-off, DoD 10, and the
parent index. D's 2026-10-14 draft still needs refinement before that session.
A failing assertion would return the defect to F. This story changes no
production code. No child formal review is triggered. No Jira mutation occurred.
