# SP-105 Password Reset — Plan Review

**Review date:** 2026-10-14  
**Pass:** 2  
**State reviewed:** Working tree based on `cfaef32af89a9ca6aaa1cea84ba2ab17ecf1bba8`  
**Epic / milestone:** EP01 / M1  
**Verdict:** **Plan Ready**  
**Execution status:** **Implementation Blocked** pending upstream integrated evidence

Both findings from pass 1 are independently verified as resolved in the plan. No new blocking planning findings were identified. The ten-child breakdown separates feature implementation, shared frontend coordination, database test infrastructure, automated integration suites, and integrated sign-off.

This verdict approves the planned mechanisms and verification obligations. It does not establish implemented behavior or passing SP-105 tests.

## Reviewed scope and limitations

Reviewed:

- `docs/epics/README.md` and `EP01-authentication-and-onboarding.md`.
- `docs/stories/EP01/README.md`.
- SP-105 breakdown README, parent coordination record, all ten children A–J, correction history, and pass-1 `plan-review.md`.
- Relevant authentication/session service and controller, public-route allowlist, verification service, DTOs, Prisma schema, exception filter, frontend API client, AuthContext, verification UI, package manifests, and CI configuration.
- SP-102 and SP-103 review artifacts.

Read-only validation checked **82 local Markdown file links**, with **zero missing targets**.

No application tests were run: this is a review of an unimplemented plan. Database concurrency, cookie application, SMTP delivery, timing resistance, and real-browser accessibility remain implementation verification obligations.

SD7/SD8 retain dated documentary approval provenance. The underlying historical conversation was unavailable for independent authentication; no new policy approval is inferred.

## Prioritized findings and closure

| ID | Original severity | Original finding | Pass-2 disposition |
|---|---|---|---|
| PR-001 | Medium | Retry guidance lacked a settled wire contract and browser accessibility ownership | **Resolved in plan** |
| PR-002 | Medium | Frontend/integration children combined independently testable outcomes without grounded sizing | **Resolved in plan** |

**Open blocking findings:** None.

### PR-001 — Resolved: retry contract spans backend, client, and browser verification

**Original gap and consequence:** F could emit a header unreadable to cross-origin JavaScript, or retry metadata that the exception filter discarded, leaving C unable to honor the promised wait.

**Fresh evidence:**

- `SP-105-password-reset.md`, **Retry wire contract**, specifies integer delta-seconds `Retry-After`, exact ceiling calculation, range 1–60, and account-independent derivation.
- `SP-105F-password-reset-ip-limits.md`, **AC3**, assigns header emission before the 429 exception and explicit CORS exposure in `apps/api/src/main.ts`.
- F’s **Tests and verification** requires filtered HTTP/header tests, subsecond rounding, range, and CORS exposure.
- `SP-105C-password-reset-frontend-ui.md`, **Success and session clearing**, specifies accepted header values, a 60-second fallback, monotonic waiting, explicit retry, and token/form preservation.
- `SP-105G-recovery-session-client.md`, **AC3**, requires sanitized errors carrying validated retry metadata.
- `SP-105J-limiter-integration-tests.md` assigns actual filtered HTTP/CORS tests.
- `SP-105D-password-reset-integration.md`, **Browser verification method and retry evidence**, requires JavaScript readability from the configured separate web origin and token/session preservation.

**Independent assessment:** The proposed header approach fits the existing exception filter, which writes the normalized JSON response without replacing previously set headers. F explicitly owns the missing CORS exposure. Body-extension ambiguity is removed.

**Closure condition:** Met in plan. Actual HTTP/browser evidence remains required during implementation.

### PR-002 — Resolved: shared coordination and integration construction have separate owners

**Original gap and consequence:** C bundled shared session infrastructure with recovery screens; D assumed an unowned harness while constructing extensive suites and performing sign-off.

**Fresh evidence:**

| Child | Bounded outcome | Planned size / prerequisites |
|---|---|---|
| C | Recovery pages, validation, navigation, retry presentation | 2–4 hours; consumes G |
| G | Shared recovery/session boundary and sanitized errors | 2–4 hours; independently tested without pages |
| H | Real PostgreSQL connections, fixtures, barriers, cleanup | 1–3 hours; migration-dependent execution |
| I | Credential race, expiry, and rollback suite | 2–4 hours; A/B/E/H |
| J | Shared-limiter concurrency and failure suite | 1–3 hours; F/H and A/B HTTP behavior |
| D | Execute prerequisite suites and perform browser/SMTP sign-off | 2–4 hours; all prerequisites complete |

G explicitly covers stale API writes, queued retries, AuthContext restoration/profile completions, and failure callbacks. Its timeout sends no reset while an earlier refresh remains unsettled; abort alone is expressly insufficient.

H requires independent connections, deterministic barriers, teardown on failure, and an explicit integration-job failure when the database is unavailable. Existing SMTP tests are correctly distinguished from a credential-race harness.

D explicitly uses manual real-browser verification. Its delayed-refresh check records the interception method and blocks verification if the environment cannot hold a response before cookie application. No browser automation harness is silently assumed.

**Independent assessment:** The new ownership and dependency graph address the missing prerequisites and separate test construction from integrated sign-off. Session estimates remain heuristics, but now refer to bounded outcomes and inspected repository capabilities.

**Closure condition:** Met in plan.

## Security and consistency assessment

The following are sound proposed mechanisms, with assigned future tests:

| Counterexample | Planned prevention and expected outcome | Verification owner |
|---|---|---|
| Same token redeemed concurrently | Owner lock precedes conditional claim; one success, one uniform 400 | B unit; I real database |
| Distinct valid tokens redeemed concurrently | First owner-serialized redemption retires the outstanding set; second claim fails | B unit; I real database |
| Issuance races redemption | Shared owner-first order; issuance-first retires old token, redemption-first permits a subsequent new cycle | A/B; I |
| Old-password login verifies before reset | Locked password-hash snapshot recheck rejects reset-first login; login-first family is later revoked | E; I |
| Refresh overlaps reset | Locked re-read prevents reset-first renewal; session-first successor is included in reset revocation | E/B; I |
| Request waits past token expiry | Fresh post-lock time, rather than transaction-start time | B/E; I |
| Password/session persistence fails | One transaction rolls back token claim, retirement, revocation, and password change | B; I |
| Prior refresh response arrives late | G drains before reset and rejects stale state updates; B expires HttpOnly cookie | G; D real browser |
| Replicas race the last IP-limit slot | Shared bucket lock admits one request; loser gets account-independent 429 before mutations | F; J |
| Cleanup races limiter admission | Locked staleness recheck and bounded missing-bucket recreation | F; J |

Previously issued access JWTs retain their configured remaining lifetime under the recorded policy. The plan consistently distinguishes that residual window from refresh revocation and local session clearing.

SMTP is detached from the public response. Database-path timing differences are explicitly subject to measurement and security assessment in A/D; no constant-time guarantee is claimed.

## Requirement coverage

| Original requirement | Planned owners |
|---|---|
| AC1 Generic forgot response | A/C/F; J HTTP parity; D SMTP/timing/browser evidence |
| AC2 Hashed, single-use, one-hour token | A/B; H fixtures; I database races/expiry/rollback; D execution |
| AC3 Registration-equivalent password update | B/C; I credential checks; D end-to-end login |
| AC4 Revoke all refresh families and require re-login | B/E/G; C boundary integration; I orderings; D cookie/browser evidence |
| AC5 Actionable invalid/expired recovery | B/C/G; D real negative paths |
| AC6 Accessible request/reset screens and states | C; D keyboard, announcements, desktop/mobile verification |
| AC7 Account and IP limits | A/F/C/G; H/J real-store verification; D browser retry evidence |

All four original test requirements remain assigned: single-use/expiry, session revocation, generic unknown-email response, and rate limiting. The added-child traceability section expressly assigns H/I/J construction while retaining D’s responsibility to execute and record integrated evidence.

## Shared Definition of Done coverage

| DoD | Planning assessment |
|---|---|
| 1 Functional criteria | Assigned across implementation children; D verifies integration |
| 2 Input validation | Backend, frontend, and shared client failure obligations explicit |
| 3 Academic ownership | N/A for new academic queries; stored credential-owner isolation remains required |
| 4 Actionable errors | Uniform token errors, field errors, retry metadata, and sanitized failures specified |
| 5 Loading/empty/error states | C, verified by D |
| 6 Keyboard accessibility | C automated interactions; D real-browser review |
| 7 Responsive layouts | C, with actual desktop/mobile verification in D |
| 8 Automated business-rule tests | A/B/C/E/F/G local coverage; H infrastructure; I/J database suites |
| 9 API/migration documentation | Assigned, including C/G browser/client contracts and H/I/J invocation |
| 10 Integrated development review | D explicitly performs and records it for the complete feature |

No MVP scope expansion was identified.

## Correction history and dependency status

The pass-1 assessments of CF-1–CF-12 remain supported: separate layers, retained per-IP scope, owner-first mechanisms, session coordination, server-owned cookie expiry, timing limitations, and upstream-readiness distinctions remain present. G/H/I/J refine ownership without removing the original obligations.

The README preserves PR-001/PR-002’s original findings, consequences, corrections, verification, and “awaiting re-review” dispositions. This report now independently closes both findings **in the plan**. Historical correction entries remain historical evidence rather than implementation proof.

Execution blockers are separate from plan readiness:

- SP-102’s latest review records acceptance/DoD completion.
- SP-103’s latest review leaves integrated DoD **1, 7, and 10 CANNOT VERIFY**. Obtain the missing upstream evidence before treating that dependency as independently complete.
- SP-105 implementation and required verification are outstanding.
- All child Jira keys remain **Pending creation**; no tracker mutation or sync was verified.

## Handoff

**Planner:** Record PR-001 and PR-002 as independently resolved by this pass and update readiness metadata to reference this report.

**Implementation:** Follow the documented dependencies, preserve the shared contracts, and collect actual child test and integrated evidence. Release remains gated by D.

**User decisions:** None newly required.

**Verdict: Plan Ready. Implementation remains blocked on upstream integrated evidence; no application verification is implied.**
