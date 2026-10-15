# SP-105H: Reusable Recovery PostgreSQL Test Harness

**Story ID:** SP-105H
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer / owner:** Integration infrastructure, assignee TBD
**Status:** Draft — addressed PR-002; awaiting independent re-review
**Dependencies:** SP-102; A/F migrations before recovery suite execution
**Jira key:** Pending creation

## Summary and bounded scope

One 1–3 hour session establishing only the real-database fixture/barrier lifecycle. No recovery race assertions or browser runner installation.

## Source requirements

AC2/AC4/AC7 and single-use/expiry, revocation, rate-limit TR infrastructure; [shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). All tests below are future obligations, not passing results.

## Acceptance criteria

1. Supply real Prisma clients on independent database connections, isolated seeded accounts/refresh/reset credentials, per-test cleanup and deterministic acquire/release barriers for owner/bucket locks. Never use production data or read secret files.
2. Apply migrations before execution using the existing CI Postgres service. A smoke test proves a second connection waits for a held row lock and proceeds after release. Test teardown releases locks on assertion failure, closes clients and removes only owned test fixtures.
3. Document invocation and required disposable database; a missing database is an explicit failed integration job, never a passing mocked fallback. Existing SMTP-only integration tests are not a credential-race harness.

## Tests

Harness smoke tests: lock waits/releases; teardown after failure; separate fixture owners do not collide; migrations available. I/J reuse the fixture API and D runs their commands.

## Technical evidence and exclusions

Inspected `.github/workflows/ci.yml`: postgres:15-alpine, Prisma generation and migrate deploy before Jest already exist. API Jest includes *.spec.ts under src; existing SMTP integration spec supplies email transport precedent only. Proposed `apps/api/src/modules/auth/testing/recovery-db-harness.ts` is new. No web browser runner is declared in apps/web/package.json; D explicitly uses manual browser verification.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet local criteria, exercise invalid/failure paths, sanitize errors, automate assigned rules and document commands/contracts. DoD 3 N/A: no academic queries; isolate seeded credential owners. UI states/keyboard/responsiveness (5–7) belong to C and D, with no new screen here. Item 10 remains required through D; local completion alone is not release approval. Record evidence under this child's actual Jira key after assignment; no fabricated key or test result.
