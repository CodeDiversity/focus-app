# SP-105H implementation

Updated: 2026-10-16 America/New_York
Status: **Implemented — awaiting parent review**
Review unit: SP-105; final combined review after I/J/D and all other parent obligations.
Story: [SP-105H](../../SP-105H-postgres-test-harness.md)

## Delivered

A small PostgreSQL harness and exactly three focused Jest cases: explicit safe target selection, fixture cleanup after a throwing body while preserving another fixture, and an independently connected contender observed blocking on the held owner row before explicit release. The throwing-body case also releases a held transaction through ordinary teardown.

- `apps/api/src/modules/auth/testing/recovery-db-harness.ts`: independently pooled Prisma clients, unique credential fixtures, optional limiter fixtures, held interactive transactions, actual `pg_blocking_pids` observation and fixture-only cleanup.
- `apps/api/src/modules/auth/testing/recovery-db-harness.integration.spec.ts`: the three H cases; no recovery or limiter feature assertions.
- `apps/api/package.json`: dedicated integration selection includes H and planned I/J file paths. Normal test/watch/coverage discovery excludes only those recovery database suites; existing SMTP integration remains included.
- `.github/workflows/ci.yml`: existing PostgreSQL 15 service uses an `_test` database; migration and integration targets agree; explicit integration step follows migrations.

No production services, endpoints, schema, migrations or dependencies changed. No secret files were read. No academic data is queried. Database client logging is disabled and harness failures use fixed diagnostics without connection details or credential material.

## Invocation and disposable database contract

Supply `TEST_DATABASE_URL` in the process environment yourself. It must be a PostgreSQL URL whose decoded database name ends in `_test`. There is no `DATABASE_URL` fallback. Use an isolated disposable database with all existing migrations. No setup is conditionally skipped: an unavailable target or missing tables fails the explicit integration command.

From the repository root, after configuring the disposable target:

```sh
pnpm --filter @studypilot/api db:generate
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy
pnpm --filter @studypilot/api run test:integration --runInBand
```

Select the guarded `_test` target before running migrations; the existing Prisma migration CLI reads `DATABASE_URL`, while the harness reads only `TEST_DATABASE_URL`. Do not point either at a shared application database. CI sets both to its disposable service database. `run` is explicit above because this workspace's pnpm interpreted bare `test --runInBand` as pnpm options.

## Minimal helper API for I/J

- `testDatabaseUrl(value)` validates an explicit string without reading a fallback or emitting its contents.
- `RecoveryDbHarness.run(async harness => ...)` wraps a body in `finally` cleanup. `create()` plus `close()` is available for a second independently managed fixture context; callers must use `finally`.
- `client` is a real Prisma client. `connection()` creates another independently pooled client and registers its disconnect. Service consumers may inject these clients using their existing test construction conventions; no Nest production wiring was changed.
- `seed(options)` returns `userId`, raw `refreshToken`/`resetToken` in memory, and the fixture's `endpoint`/`normalizedIp`. Persisted credentials are SHA-256 hashes. Options permit `expiresAt`, `usedAt`, `revokedAt`, `admittedAt`, `endpoint`, `bucket`, and an already-hashed `passwordHash`. The default password hash is an unusable synthetic digest; login tests must supply their own Argon2 hash. Each seed adds one owner/refresh/reset credential; consumers can create additional credentials under that tracked owner.
- `hold(async tx => ...)` awaits an acquired owner or bucket lock callback and returns `{ pid, release() }`. Release is idempotent and awaits transaction completion. Always release in `finally`; `close()` is the fallback. Automatic release caps holds at 10 seconds, interactive transactions at 12 seconds; pool connection/transaction acquisition waits are also bounded.
- `waitUntilBlocked(contenderPid, holderPid)` polls actual PostgreSQL blocking (five-second deadline); it does not infer contention from elapsed sleep. Consumers should attach rejection handling immediately to concurrent transaction promises and drain them in `finally`.
- `close()` releases/drains held transactions, deletes only registered compound bucket keys and owner IDs (credential rows cascade), then disconnects every registered client. It also handles partially created fixtures. Tests must register limiter fixtures through `seed({ bucket: true })` so replacement bucket rows remain covered by the same compound key.

## Verification actually executed

- Test-first discovery run failed because the new harness module did not yet exist; this was a compilation failure, not a claimed behavior-level red test. The three cases were written before the harness implementation.
- `pnpm --filter @studypilot/api db:generate`: passed (Prisma 7.10.0).
- Existing six migrations deployed successfully to a dedicated ephemeral PostgreSQL 15 container, with no existing database touched. Initial sandbox attempt failed P1001; the escalated local connection succeeded.
- `pnpm --filter @studypilot/api run test:integration --runInBand` with the disposable target: **1 suite / 3 tests passed**, zero skips. Target guard was also run alone during development (two cases intentionally unselected in that targeted run only).
- `pnpm --filter @studypilot/api run test --runInBand`: **20 suites / 237 tests passed; 2 suites / 18 tests already skipped**. SMTP integration passed and the recovery database file was absent from ordinary discovery. Initial sandbox run failed SMTP/auth-controller socket binding with EPERM; rerun outside the sandbox passed. Existing exception-filter test emits its intentional synthetic error log; no failure remained.
- `pnpm --filter @studypilot/api typecheck`: passed.
- `pnpm --filter @studypilot/api exec eslint src/modules/auth/testing --max-warnings=0`: passed.
- `pnpm --filter @studypilot/api exec jest --listTests --runInBand`: verified SMTP retained and H excluded.
- `git diff --check`: passed.

## Remaining parent scope

I owns credential races/expiry/rollback; J owns limiter feature tests; D owns integrated execution, browser/SMTP sign-off and final parent index. I/J drafts require refinement before coding. This child has no formal review and does not approve parent release or close upstream integrated-evidence gaps. No Jira mutation occurred.
