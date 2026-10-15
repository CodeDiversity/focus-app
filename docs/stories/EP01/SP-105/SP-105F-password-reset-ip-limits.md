# SP-105F: Password Reset — Shared Per-IP Limits

**Story ID:** SP-105F
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer:** Backend
**Priority:** High / P0
**Status:** Draft — approved scope and limits; awaiting independent plan re-review
**Dependencies:** SP-105A/B contracts; can start limiter implementation against those contracts
**Jira key:** Pending creation
**Refined:** 2026-10-14

## Summary and decision provenance

Original SP-105 AC7 and rate-limiting TR require per-account **and per-IP** protection. The user approved retaining IP protection in a separate child (“approve as sep”) and approved the proposed initial limits (“yes”): 10 forgot-password requests and 30 reset submissions per IP per minute, with account-independent 429 responses (2026-10-14 conversation). This is a release requirement, not an unspecified API-wide deferral. Target one focused backend session; D owns live multi-client verification.

## Acceptance criteria

1. Before DTO/service execution, admit at most 10 requests to `/auth/forgot-password` and 30 to `/auth/reset-password` per normalized source IP in the preceding 60 seconds. The two endpoints have separate buckets. Count admitted attempts regardless of email/token validity or account existence; malformed-body handling before Nest guards is a transport limitation to document. Per-account email cooldown remains A's separate control.
2. Enforce shared limits across service instances using PostgreSQL, not a process-local map. Concurrent requests near the limit cannot overshoot. A denied attempt creates no reset token, sends no email and performs no password/session mutation.
3. Return `429` with the same actionable message and IP-bucket-derived retry guidance for every account state: “Too many recovery requests. Wait and try again.” Never expose account cooldown or existence via headers/body. Allowed requests retain A/B's normal contracts.
4. Use Nest `@Ip()` or a guard's framework request context to resolve the actual source address. Never trust a client-supplied `X-Forwarded-For` by default. Document explicitly trusted proxy hops/networks for deployed topology; default to direct peer addresses. Do not add `@Req()` to controllers. Normalize IPv4-mapped IPv6 consistently; document shared-NAT limits.
5. Keep only endpoint/IP bucket keys and admitted timestamps required for the window; no emails, tokens, passwords or request bodies. Expire stale buckets with bounded cleanup. Storage failures return a sanitized, account-independent 503 before recovery mutations (fail closed), rather than silently disabling limits.

## Proposed persistence/mechanism

Introduce an additive Prisma recovery-limit bucket model with unique `(endpoint, normalizedIp)` key and a bounded `DateTime[]` of admitted timestamps (maximum 30 per endpoint/IP). This is rate-limit state, not a student academic-data query; never return bucket keys or log raw source addresses in errors. No new secret values are required.

For each request, use a short transaction: insert the bucket if missing with conflict handling, lock it `FOR UPDATE`, obtain a fresh post-lock database time, prune entries at or before `checkedAt - 60 seconds`, and admit/append only when fewer than the endpoint's limit remain. Otherwise reject with retry time derived from the earliest retained entry. Release the bucket lock **before** calling A/B and before any user/credential lock. Every replica uses this storage and key normalization. A bucket disappearing during cleanup must be recreated/retried with a bounded policy; don't treat it as unlimited admission. Cleanup obtains the row lock and rechecks staleness before deletion, and never deletes a recently updated bucket.

Register the proposed guard/store in the auth module. Concrete filenames such as `recovery-rate-limit.guard.ts` and `recovery-rate-limit.store.ts` are proposals, not existing symbols. Preserve existing applied migrations; deploy the new limiter migration before enabling the guard. Do not claim a fixed-window counter meets the rolling-window AC above.

## Tests and verification

- Stateful unit tests: first L requests admitted, L+1 denied; exactly-60-second expiry; denied attempts do not prolong the window; endpoint independence; unknown/known/malformed requests follow the same IP limit; no mutation on rejection; normalized-IP parity; spoofed forwarding headers ignored; shared-NAT behavior.
- Store/guard HTTP tests: rolling-window boundary burst, fake clocks plus real post-lock time behavior, generic 429 and retry guidance, fail-closed 503 with sanitized errors, no email/token identifiers stored or logged, cleanup racing a request.
- D: real PostgreSQL with two independent store instances racing the last slot; exactly one admitted, one 429; service restart keeps limits; exercise both endpoints and verify allowed-request generic responses, blocked mutation, and real-browser actionable retry.
- Document topology, thresholds, retention/cleanup, migration/rollback and operator verification in the eventual child implementation artifact. Rollback must not silently release an unprotected feature.

## Definition of Done

[Shared DoD](../../../epics/README.md): 1, 2, 4, 8, 9 apply; 3 N/A (no academic data), 5–7 backend N/A (C handles UI retry); 10 required through D's integrated review. Preserve original AC7 and TR ownership in the breakdown README. No implementation or test evidence is claimed by this plan.
