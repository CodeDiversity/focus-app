# SP-105G: Frontend Recovery Session Coordination

**Story ID:** SP-105G
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer / owner:** Frontend, assignee TBD
**Status:** Draft — addressed PR-002; awaiting independent re-review
**Dependencies:** SP-102; A/B/F settled contracts; C consumes this contract
**Jira key:** Pending creation

## Summary and bounded scope

One 2–4 hour session updating the existing single-flight API refresh and AuthContext restore. Deliver one recovery-operation boundary, independently tested without recovery pages. Exclude form/routing changes and real-browser verification.

## Source requirements

AC4/AC5/AC7; session-revocation TR; [shared contract](./SP-105-password-reset.md), [shared DoD](../../../epics/README.md). All tests below are future obligations, not passing results.

## Acceptance criteria

1. Provide a recovery-operation API (proposed `runRecoveryReset`): prevent overlapping reset operations; pause new automatic refreshes and await the existing flight before calling the supplied reset request. Use a bounded 10-second wait; if not settled, do not send reset and return a sanitized retryable error. Aborting a request alone is not proof its response cookie cannot arrive: keep the operation blocked until the flight settles.
2. On reset success, advance a shared generation before clearing token/user and disable automatic restore until explicit login. API token writes, queued interceptor retries, AuthContext restoration/profile completions and failure callbacks must check that generation before changing state. On reset failure release the barrier and preserve the prior session, subject to ordinary independently expired-session behavior.
3. Add recovery endpoints to AUTH_PATHS. Propagate only sanitized status/message/field errors and validated retry seconds, never raw Axios configuration/body. Preserve existing ordinary login/logout/refresh and verification behavior.
4. B owns HttpOnly expiry. This operation owns local state and request ordering; it never writes document.cookie. C owns navigation and token lifetime.

## Tests

Vitest API/context deferred-promise tests: existing refresh delays reset; concurrent refresh launches are paused; timeout sends no reset and late completion cannot bypass the still-active drain; success rejects stale API/context/profile/queued retry/failure callbacks; failed reset releases barrier without logout; explicit login resumes session operation; recovery 400/429/503/401 do not trigger refresh/global logout; sanitized errors exclude request bodies. Existing auth and verification suites remain required.

## Technical evidence and exclusions

Inspected `apps/web/src/services/api.ts`: module refreshPromise writes token before returning, AUTH_PATHS lacks recovery entries and errors spread Axios config. Inspected `apps/web/src/context/AuthContext.tsx`: local sessionVersion guards restoration but is not shared with API writes. No existing recovery boundary is assumed. Proposed helper/API names may be refined without changing the shared behavior. D verifies late response-cookie ordering in a real browser.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet local criteria, exercise invalid/failure paths, sanitize errors, automate assigned rules and document commands/contracts. DoD 3 N/A: no academic queries; isolate seeded credential owners. UI states/keyboard/responsiveness (5–7) belong to C and D, with no new screen here. Item 10 remains required through D; local completion alone is not release approval. Record evidence under this child's actual Jira key after assignment; no fabricated key or test result.
