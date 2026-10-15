# SP-105J: Recovery Shared-Limiter Concurrency Suite

**Story ID:** SP-105J
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer / owner:** Integration tests, assignee TBD
**Status:** Draft — addressed PR-002; awaiting independent re-review
**Dependencies:** F, H; A/B for HTTP mutation assertions
**Jira key:** Pending creation

## Summary and bounded scope

One 1–3 hour session constructing real-store limiter/admission proofs using H. Exclude credential race tests, infrastructure creation and browser review.

## Source requirements

AC1/AC7; generic-response and rate-limit TR; [shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). All tests below are future obligations, not passing results.

## Acceptance criteria

1. Race two independent instances for the last rolling-window slot on each endpoint: exactly one admission and one 429. Verify restart persistence, endpoint isolation and exact expiry boundaries.
2. Race cleanup/admission and test missing-bucket bounded recreation. Verify spoofed forwarding headers ignored by default and 503 fail-closed before mutations on storage failure.
3. Assert blocked requests create no credential/email/password/session mutation; known/unknown accounts receive the same bucket-derived Retry-After and generic envelope. Allowed forgot outcomes retain generic parity.

## Tests

Add proposed `apps/api/src/modules/auth/recovery-rate-limit.integration.spec.ts` using H fixtures. Use locked rows/barriers and controlled admitted timestamps; test actual filtered HTTP response/header and CORS exposure. D verifies browser access separately.

## Technical evidence and exclusions

F proposes new shared-store guard/model; main.ts lacks exposedHeaders and the exception filter normalizes body fields. No existing limiter fixture is claimed. Return feature defects to F, never bypass rate limits in order to pass.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet local criteria, exercise invalid/failure paths, sanitize errors, automate assigned rules and document commands/contracts. DoD 3 N/A: no academic queries; isolate seeded credential owners. UI states/keyboard/responsiveness (5–7) belong to C and D, with no new screen here. Item 10 remains required through D; local completion alone is not release approval. Record evidence under this child's actual Jira key after assignment; no fabricated key or test result.
