# SP-105H: Reusable Recovery PostgreSQL Test Harness

**Story ID:** SP-105H
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer / owner:** Integration infrastructure, assignee TBD
**Status:** Implemented — awaiting parent review
**Implementation:** [Record](./artifacts/SP-105H/implementation.md), [checkpoint](./artifacts/SP-105H/checkpoint.md)
**Dependencies:** SP-102; A/F migrations before recovery suite execution
**Jira key:** STUDY-29
**Refined:** 2026-10-16

## Summary and bounded scope

Provide a small, reusable real-PostgreSQL fixture and lock-barrier lifecycle for I/J. Keep verification basic: safe database selection, fixture creation/cleanup, and one useful deterministic lock smoke case. No recovery race assertions or browser runner installation.

### Sizing and implementation boundary

- **Outcome:** I/J can explicitly invoke a guarded, migrated real-database harness with isolated fixtures, independent connections and bounded lock release/cleanup.
- **Time estimate:** 90–150 minutes including focused verification and handoff, in two bounded milestones below. The uncertainty is Prisma interactive-transaction teardown under a held lock. This is one cohesive infrastructure outcome; the invocation wiring and smoke case make that same harness usable and inspectable before I/J land.
- **Files:** change `apps/api/package.json` and `.github/workflows/ci.yml`; create `apps/api/src/modules/auth/testing/recovery-db-harness.ts` and `apps/api/src/modules/auth/testing/recovery-db-harness.integration.spec.ts`. No production service, schema or migration changes.
- **Start context:** this story; EP01 and shared DoD; parent shared contract sections “POST /auth/reset-password”, “Retry wire contract” and “Session semantics and ordering”; `apps/api/src/modules/prisma/prisma.service.ts`, `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`, `apps/api/src/modules/auth/owner-lock.ts`, `apps/api/src/modules/auth/recovery-rate-limit.store.ts`, API Jest settings and CI. A/F migration files are listed below. I/J consume this harness; their feature assertions are not start prerequisites.
- **Verification:** from repo root run `pnpm --filter @studypilot/api db:generate`; with the validated test target supplied to Prisma as `DATABASE_URL`, run `pnpm --filter @studypilot/api exec prisma migrate deploy`, then `pnpm --filter @studypilot/api test:integration --runInBand`. Run `pnpm --filter @studypilot/api test --runInBand`, `pnpm --filter @studypilot/api typecheck`, and read-only lint using `pnpm --filter @studypilot/api exec eslint src/modules/auth/testing --max-warnings=0`. The dedicated command must run the smoke suite against PostgreSQL; unavailable infrastructure is a failed integration execution, never a skip or mock pass.
- **Dependencies / exclusions:** SP-102 and implemented A/F database structures are available in the repository; execution requires a disposable PostgreSQL database. I owns credential races/expiry/rollback, J owns limiter admission/races/HTTP assertions, and D owns integrated execution/browser/SMTP evidence and the parent handoff. One sequential `implementer` owns all implementation layers.

## Source requirements

AC2/AC4/AC7 and single-use/expiry, revocation, rate-limit TR infrastructure; [shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). All tests below are future obligations, not passing results.

## Acceptance criteria

1. Supply real Prisma clients with independent transaction connections, uniquely seeded accounts/refresh/reset credentials and optional limiter buckets, per-test cleanup, and deterministic acquire/release barriers usable for owner/bucket locks. Never use production data or read secret files. Delete only fixture IDs/keys created by the test.
2. Run against migrated PostgreSQL using the existing CI service. One smoke case proves a second connection waits for a held owner-row lock and proceeds after explicit release. Bounded teardown releases held transactions even when the test body throws, disconnects every created client and removes only its fixtures; a second fixture owner remains untouched. Keep this a small lifecycle check, not a database behavior matrix.
3. Add a dedicated `test:integration` command and CI step after migrations. Require `TEST_DATABASE_URL`, reject missing/malformed URLs or a parsed database name without the `_test` suffix, and never fall back to `DATABASE_URL`. The explicit command fails for an unavailable database or missing migrations. Normal API tests exclude only these recovery real-database suites, preserving the existing SMTP integration test. Document the invocation and disposable-database contract here and in the implementation handoff.

## Tests

Use Jest's existing `describe` / `it` style in new `apps/api/src/modules/auth/testing/recovery-db-harness.integration.spec.ts`. Keep the following focused cases; names are proposed new cases, not existing passing evidence:

| AC | Named case / observable result |
| --- | --- |
| 3 | `rejects missing, malformed and non-test database targets` — a small table over the selection helper; no URL or credential values in diagnostics. A valid parsed `_test` target is accepted without consulting a fallback. |
| 1/2 | `cleans up its fixtures after a test body throws and preserves another owner` — create two fixture contexts, throw/catch one controlled test-body error, and verify its tracked user/credential/bucket rows are removed while the other owner's rows remain. Reuse the same teardown path as ordinary tests; no elaborate persistence failure injection. |
| 1/2 | `waits for a held owner lock and proceeds after release` — use independent real transaction connections, confirm the contender is blocked before release, release explicitly, and observe completion. Always release/disconnect in `finally`; no fixed sleeps to infer ordering. |

Fixture creation exercises the migrated `User`, `RefreshToken`, `PasswordResetToken` and `RecoveryRateLimitBucket` tables, so missing required migrations fail naturally; do not add a redundant schema inventory suite. The dedicated command's missing/unreachable database path fails directly rather than conditionally skipping. Check its configuration and CI wiring without a subprocess failure matrix. No new test dependencies or browser runner are required.

Single-use, credential expiry and rollback cases remain in I; rate-limit boundaries, cleanup/admission races and HTTP scoping remain in J. UI empty/loading/error, keyboard and responsive states remain in C/D; this infrastructure adds no UI or endpoints. Existing SMTP integration coverage continues in the ordinary API test command.

## Technical evidence and exclusions

### Decisions

- **H1 — execution:** user accepted a dedicated `test:integration` command and explicit CI step after migrations; missing/unreachable PostgreSQL fails. Preserve the SMTP test in normal API tests.
- **H2 — target safety:** user accepted required `TEST_DATABASE_URL`, no `DATABASE_URL` fallback, a parsed database-name `_test` suffix guard, and a disposable `_test` database in the existing CI service. Prisma migrations must target that same selected URL via `DATABASE_URL`; cleanup is fixture-only.
- **H3 — final callouts:** user requested basic, high-value tests and no difficult low-value testing. Use the three focused cases above, with ordinary `finally` teardown and bounded waits. Do not expand into failure-injection or redundant lifecycle matrices.

### Relevant files and wiring

- `apps/api/package.json` — existing Jest `rootDir: src` and `*.spec.ts` discovery currently include every integration spec. Add `test:integration` selecting the new harness smoke file plus the already-planned I/J files `src/modules/auth/password-reset.integration.spec.ts` and `src/modules/auth/recovery-rate-limit.integration.spec.ts`. Exclude exactly those recovery real-DB suites from normal discovery, including coverage/watch behavior as appropriate. Do not exclude all `*.integration.spec.ts`: `src/modules/email/smtp-email.provider.integration.spec.ts` must remain included.
- `.github/workflows/ci.yml` — retain the existing `postgres:15-alpine` service, generation and migration steps. Give its disposable database an `_test` name, supply `TEST_DATABASE_URL`, and direct migration `DATABASE_URL` to the identical target. Add an explicit recovery integration step after migrations alongside the ordinary tests. Do not log connection strings or add secret-file loading.
- New `apps/api/src/modules/auth/testing/recovery-db-harness.ts` — small target-validation, client/fixture and held-transaction lifecycle helpers shared by I/J. Keep helper documentation near exports so consumers can use it without reading every sibling story.
- New `apps/api/src/modules/auth/testing/recovery-db-harness.integration.spec.ts` — the focused cases above, using actual PostgreSQL and the existing Jest/ts-jest conventions.

Read-only evidence: `apps/api/src/modules/prisma/prisma.service.ts` constructs Prisma 7 through `PrismaPg`, reads `DATABASE_URL` and exposes explicit connect/disconnect lifecycle. `apps/api/prisma.config.ts` uses `DATABASE_URL` for migrate deploy. `apps/api/src/modules/auth/owner-lock.ts` locks mapped `users` rows and obtains fresh `clock_timestamp()`; `recovery-rate-limit.store.ts` locks mapped `recovery_rate_limit_buckets` by endpoint/normalized IP. Existing migrations are `apps/api/prisma/migrations/20261015000000_password_reset_tokens/migration.sql` and `apps/api/prisma/migrations/20261015060000_recovery_rate_limit_buckets/migration.sql`, in addition to SP-102's refresh-token migration. Reuse these; no schema/model change is required.

### Minimal harness contract

- Validate the explicit test URL before constructing clients or mutating data. After validation, use that target consistently for clients; if reusing `PrismaService`, map it to `DATABASE_URL` only within the dedicated test process. No application runtime configuration change is needed. CLI generation/migration uses the existing scripts/config and process environment, never secret files.
- Expose independent clients suitable for the existing services, plus fixtures containing owner IDs and generated credential material in memory. Use UUID-based unique emails/token digests/family IDs and distinct normalized test IP keys; permit I/J to choose expiry/usage/window timestamps without building their assertions here. Persist only hashes for credentials, never raw tokens/passwords. No academic fixture data is needed.
- Provide explicit “acquired” and “release” handles around held interactive transactions, usable for the existing owner and bucket lock shapes. Use parameterized SQL and a bounded wait; e.g. an observer connection can confirm blocking with `pg_blocking_pids` before release. Do not require production instrumentation or mock the locking operation. Do not add a separate bucket-lock smoke matrix: J exercises that consumer.
- Track created IDs/compound bucket keys. Teardown first releases/drains held operations, then deletes tracked buckets/users (credential relations cascade), then disconnects clients, including partial setup/test-body failure. Register cleanup as resources are created. Bound transaction and barrier waits so a failure cannot hang CI. Keep database errors sanitized; never print query parameters, account material or URLs.
- No endpoint signatures, DTO changes, Nest module wiring, or new migrations. No academic queries: ownership helpers are not needed for test credential records, but fixture isolation is mandatory. Keep public generic-error and no-enumeration contracts unchanged.

### Checkpoints and resume inputs

1. **Guarded invocation and fixture lifecycle:** implement the command/CI selection and small harness, then verify configuration selection, client connection and fixture cleanup against migrated PostgreSQL. Resume from this story, API package/CI changes and the harness; record remaining smoke work in `artifacts/SP-105H/checkpoint.md` under this delivery home.
2. **Lock smoke and handoff:** finish the one deterministic blocking/release case and failure-safe cleanup check; run the focused integration command, ordinary API tests, typecheck and read-only lint. Record actual commands/results in `artifacts/SP-105H/implementation.md`, including the small public helper API for I/J and any infrastructure blocker. Keep the checkpoint current; no child formal review is required.

### Out of scope

Credential races/single-use/expiry/session revocation/rollback proofs (I); limiter race/window/failure/HTTP proofs (J); browser automation installation, real browser/SMTP sign-off and final integrated evidence (D); production service fixes, new API behavior, model changes, generic database infrastructure, container provisioning beyond existing CI wiring, and exhaustive failure matrices. AI, syllabus parsing, LMS integrations, grade calculations, flashcards and native mobile apps remain excluded.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet local criteria, reject unsafe inputs, clean up on failure, sanitize diagnostics, automate the focused harness checks and document invocation/helper contracts. DoD 3 N/A: no academic queries; isolate seeded credential owners. UI states/keyboard/responsiveness (5–7) belong to C and D. Item 10 remains required through D and the one combined SP-105 review; local completion is “Implemented — awaiting parent review”, not release approval. Use this delivery home's stable-ID `artifacts/SP-105H/` paths; parent review resolves to `artifacts/SP-105/review.md`. No fabricated Jira key or passing result. Return readiness to the coordinator for queue reconciliation; this refiner does not edit README or Jira.
