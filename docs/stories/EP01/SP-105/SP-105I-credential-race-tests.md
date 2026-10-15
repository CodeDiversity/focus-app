# SP-105I: Recovery Credential Concurrency Suite

**Story ID:** SP-105I
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer / owner:** Integration tests, assignee TBD
**Status:** Draft — addressed PR-002; awaiting independent re-review
**Dependencies:** A, B, E, H complete
**Jira key:** Pending creation

## Summary and bounded scope

One 2–4 hour session adding credential-transaction tests to H fixtures. Exclude limiter tests, harness construction, UI and sign-off.

## Source requirements

AC2/AC3/AC4; single-use/expiry and revocation TR; [shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). All tests below are future obligations, not passing results.

## Acceptance criteria

1. Against real Postgres assert one winner for same-token and distinct-token redemption; seed distinct valid credentials directly because normal issuance keeps one live token.
2. Deterministically test both orders for issuance/redemption, eligible issuance/issuance, old-password login/reset and refresh/reset. Reset-first rejects stale credentials; session-first may return 200 but reset revokes new families/successors. Other owners remain untouched; no owner/token deadlock.
3. Hold owner lock across expiry; fresh post-wait check rejects. Inject persistence failures to prove password/token/family rollback. New-password login succeeds; old-password and prior-family refresh fail. Previously issued access JWT validity remains limited to configured expiry, per SD7.

## Tests

Add proposed `apps/api/src/modules/auth/password-reset.integration.spec.ts` using H, with named cases for each AC/order and deterministic synchronization rather than sleeps. Assert database state as well as response status; rerun existing auth unit suites. D executes and links this suite as evidence.

## Technical evidence and exclusions

AuthService and parent A/B/E contracts require owner-first locking, conditional claims and fresh expiry. H owns connection/barrier setup. If an assertion fails, return the defect to A/B/E; this story changes tests only.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet local criteria, exercise invalid/failure paths, sanitize errors, automate assigned rules and document commands/contracts. DoD 3 N/A: no academic queries; isolate seeded credential owners. UI states/keyboard/responsiveness (5–7) belong to C and D, with no new screen here. Item 10 remains required through D; local completion alone is not release approval. Record evidence under this child's actual Jira key after assignment; no fabricated key or test result.
