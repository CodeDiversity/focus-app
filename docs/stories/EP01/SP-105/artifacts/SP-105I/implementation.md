# SP-105I implementation

Updated: 2026-10-16 America/New_York
Status: **Implemented — awaiting parent review**
Review unit: SP-105; final combined review after I/J/D and all other parent obligations.
Story: [SP-105I](../../SP-105I-credential-race-tests.md)

## Delivered

One test-only real-PostgreSQL suite proving the SP-105 credential-concurrency
invariants against migrated PostgreSQL, using the SP-105H harness. No production
service, DTO, controller, schema, migration, dependency or CI change.

- `apps/api/src/modules/auth/password-reset.integration.spec.ts` (new) — 15 cases
  across AC1/AC2/AC3 plus small in-file helpers (service construction, email stub,
  seed helpers, deterministic owner-lock barrier, throwing-transaction decorator).

Test discovery is unchanged: the existing ordinary `testPathIgnorePatterns` keeps
the file out of `test`/watch/coverage, and the `test:integration` regex already
selected it.

## Invocation and disposable database contract

Supply `TEST_DATABASE_URL` yourself; it must be a PostgreSQL URL whose database
name ends in `_test` (the harness rejects anything else and never falls back to
`DATABASE_URL`). An unavailable target or missing migrations fails the explicit
integration command — no skips and no mocks of the lock/transaction path.

From the repository root, with a disposable migrated target configured:

```sh
pnpm --filter @studypilot/api db:generate
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy
pnpm --filter @studypilot/api run test:integration --runInBand
```

`run` is explicit because this workspace's pnpm interprets bare `test --runInBand`
as pnpm options. Focused runs use the same `--testRegex` as the integration script.

## Consumed H helper contract (DoD 9)

- `RecoveryDbHarness.create()` / `close()` — one harness for the file; `close()`
  releases held transactions, deletes only tracked owner rows (credentials
  cascade) and disconnects every client.
- `.client` is a real pooled `PrismaClient`; `connection()` yields a second
  independently pooled client.
- `seed(options)` returns `{ userId, resetToken, refreshToken, ... }` with raw
  credentials in memory only (persisted rows are SHA-256 digests). Passing a real
  hash (`await argon2.hash(oldPassword, ARGON2_OPTIONS)`) is required for any case
  that logs in; the default hash is intentionally unusable.
- `hold((tx) => lockOwner(tx, ownerId))` returns `{ pid, release() }`; always
  released in `finally`.

## Mechanisms (grounded in inspected code)

- **Service construction.** `new PasswordResetService(prisma, emailStub, config)`
  and `new AuthService(new UsersService(prisma), prisma, jwtService, verificationStub)`
  with `prisma` = the harness client cast to `PrismaService`, `emailStub` a
  `jest.fn` capturing `#token=<43-char>` from delivery text, `config` a
  `ConfigService` with `FRONTEND_URL`/`NODE_ENV`, and a real `JwtService`
  (`expiresIn: '15m'`). No Nest HTTP app is booted.
- **Deterministic barrier (no sleeps).** The owner row is held with
  `harness.hold(lockOwner)`. Because a service call exposes no contender pid and
  `pg_blocking_pids` reports the lock-group leader for queued waiters, the helper
  counts the **transitive** set of backends blocked by the held pid (recursive CTE
  over `pg_blocking_pids`) before releasing; `Promise.allSettled` is attached at
  launch so no rejection is unhandled.
- **Distinct-token race.** A second unused token is inserted directly as a
  `passwordResetToken` row (SHA-256 of a fresh 43-char base64url raw), never via a
  second `forgotPassword`, which would retire the first.
- **Expiry across the lock wait.** While the redemption blocks on the owner lock,
  the token's `expiresAt` is set to the past from another connection; the fresh
  post-lock `clock_timestamp()` makes the conditional claim match zero rows.
- **Rollback decorator.** A `PrismaService`-shaped proxy delegates `$transaction`
  to the real client but hands the callback a proxy whose `user.update` throws
  once; the earlier claim/retire/revoke writes execute and PostgreSQL rolls them
  back.
- **Safety.** No raw token, password or connection detail is logged, persisted or
  returned by the suite; diagnostics in the barrier failure path are limited to
  pids/state/wait-event; teardown is H's fixture-only cleanup.

## Acceptance coverage

| AC | Cases |
| --- | --- |
| AC1 | same-token one-winner; distinct-token one-winner; cross-owner isolation |
| AC2 | issuance-before-redemption; redemption-before-issuance; reset-before-old-login; login-before-reset family revoke; concurrent issuance/redemption; concurrent login/reset; eligible concurrent issuance/issuance; concurrent refresh/reset |
| AC3 | expiry-across-lock-wait; throwing-decorator rollback; post-reset new-password login + old-password/prior-family rejection; SD7 access-JWT window |

## Verification actually executed

- Disposable ephemeral PostgreSQL 15.19 container (`--rm`, `localhost:55432`,
  database `study_test`); `prisma migrate deploy` applied all six migrations;
  container stopped and removed after the run. No shared/application database was
  touched.
- `pnpm --filter @studypilot/api run test:integration --runInBand` →
  **2 suites / 18 tests passed, 0 skipped** (H harness 3 + I 15).
- `pnpm --filter @studypilot/api run test --runInBand` → 20 suites / 237 passed,
  2 suites / 18 already skipped (baseline unchanged; the new file is absent from
  ordinary discovery).
- `pnpm --filter @studypilot/api typecheck` → clean.
- `pnpm --filter @studypilot/api exec eslint src/modules/auth/password-reset.integration.spec.ts --max-warnings=0` → clean.
- `jest --listTests` → new file excluded from ordinary discovery and present under
  the `test:integration` regex.
- `git diff --check` → clean.

## Remaining parent scope

SP-105J owns limiter admission/races/HTTP; SP-105D executes this suite and owns
integrated/browser/SMTP sign-off, DoD 10 and the parent index. A failing
assertion would return the defect to A/B/E — this story changes no production
code. No child formal review is triggered (one combined SP-105 parent review).
No Jira mutation occurred.
