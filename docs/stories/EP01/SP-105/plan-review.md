# SP-105 Password Reset — Plan Review

**Review date:** 2026-10-14  
**Pass:** 1 — first independent report; no previous `plan-review.md` present  
**State reviewed:** Working tree based on `483148a8ec769e76342da240b65435f757d931be`  
**Epic / milestone:** EP01 / M1  
**Verdict:** **Changes Required**

The proposed backend security mechanisms are coherent: owner-first locking, conditional token claims, fresh expiry checks after lock waits, atomic retirement/revocation, and coordinated login/refresh transactions address the identified races. Two planning gaps remain: the browser-visible retry contract and the sizing of the frontend/integration children.

This is planning approval work. No SP-105 implementation or passing feature tests are established.

## Scope and evidence

Reviewed:

- `docs/epics/README.md` and `EP01-authentication-and-onboarding.md`.
- `docs/stories/EP01/README.md`.
- SP-105 breakdown README, parent coordination record, and all six children A–F.
- Original SP-105 requirements from commit `997162d`.
- SP-102 and SP-103 review artifacts.
- Relevant authentication controller/service, public-route allowlist, verification service, DTO, Prisma schema, exception filter, frontend API client, AuthContext, verification page, application package manifests, and CI workflow.

The original seven acceptance criteria and four test requirements remain represented. Relative epic/shared-DoD links use the correct three-level path.

**Limitations:** No application tests were run because this review concerns an unimplemented plan. PostgreSQL locking, browser cookie behavior, SMTP delivery, timing resistance, and accessibility remain future verification obligations. SD7/SD8 record dated approval replies, but the underlying historical conversation is unavailable in this review; its provenance is documented rather than independently authenticated.

## Prioritized findings

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| PR-001 | Medium | Retry guidance lacks a settled wire contract and browser accessibility ownership | Open |
| PR-002 | Medium | Frontend and integration children still combine independently testable outcomes without grounded session sizing | Open |

### PR-001 — Complete the retry contract across F, C, and D

**Original claim/gap:** The readiness table marks API/data consistency as passing, and C requires honoring `Retry-After`. F and the shared contract promise “retry guidance” without specifying its representation or how the browser obtains it.

**Evidence:**

- `docs/stories/EP01/SP-105/SP-105-password-reset.md:34` and `:42`: generic IP-derived retry guidance.
- `docs/stories/EP01/SP-105/SP-105F-password-reset-ip-limits.md:22`: 429 response and retry guidance.
- `docs/stories/EP01/SP-105/SP-105C-password-reset-frontend-ui.md:55`: retry honoring `Retry-After`.
- `apps/api/src/main.ts:28`: credentialed CORS configuration has no exposed response headers.
- `apps/api/src/common/filters/all-exceptions.filter.ts`: the standard error envelope does not retain an additional retry field.

**Concrete consequence:** F can reasonably implement a `Retry-After` header while C expects to read it. With web and API on separate origins, the current CORS configuration does not expose that header to frontend JavaScript. Alternatively, F can put retry metadata in an exception payload that the existing filter removes. Both implementations satisfy the present vague wording while leaving C unable to implement the intended behavior.

**Suggested correction:** Specify one shared representation, including units, rounding, and fallback behavior. For example, define integer-second `Retry-After`, assign header emission and CORS exposure to F, and have C use a safe fallback if the header is unavailable. A documented body representation is also acceptable if filter ownership is explicit.

**Acceptance condition for closure:** Parent, F, and C agree on the exact representation; D owns an actual browser/API-origin check that the retry value is readable, account-independent, and preserves the reset token without triggering logout.

### PR-002 — Finish the child-sizing assessment before passing that gate

**Original claim/gap:** The breakdown marks child separation and sizing as passing while postponing assessment of the recovery barrier and integration harness.

**Evidence:**

- `docs/stories/EP01/SP-105/README.md:16–17`: C may need wider refactoring; D assumes a harness and proposes splitting setup “if absent.”
- `docs/stories/EP01/SP-105/README.md:161`: sizing gate passes with those qualifications.
- `docs/stories/EP01/SP-105/SP-105C-password-reset-frontend-ui.md:42–55`: two screens plus API error sanitization, refresh coordination, shared generation checks, and session restoration changes.
- `docs/stories/EP01/SP-105/SP-105D-password-reset-integration.md:43–64`: new real-database race suite, rolling-limit verification, timing assessment, browser cookie checks, SMTP flow, accessibility review, and evidence collection.
- The inspected web manifest supplies Vitest/JSDOM testing, with no declared browser test runner. Existing inspected integration coverage includes SMTP, rather than a reusable password-reset database/browser race harness.

**Concrete consequence:** C bundles independently verifiable recovery UI and shared session infrastructure. D bundles substantial automated test construction with integrated review, despite being sized as a focused verification session “after harness exists.” Neither ticket currently establishes the prerequisite or bounded work that makes that assessment credible.

This is a planning granularity issue, rather than a claim that a particular number of hours is impossible.

**Suggested correction:** Separate the shared frontend recovery/session coordination from the recovery forms, preserving existing IDs. For D, identify the reusable harness and its actual capabilities, or assign harness/race-suite construction to a bounded prerequisite child and retain D as the named integration sign-off owner. Update dependencies and traceability accordingly.

**Acceptance condition for closure:** Each child names one coherent outcome and a grounded working-session scope; any required harness work has an explicit owner/dependency. The sizing gate reflects the resulting inventory rather than deferring that assessment.

## Verification of existing correction history

CF identifiers are preserved as historical planner/parent findings; they are not prior independent reviewer findings.

| Historical finding | Independent disposition | Fresh evidence |
|---|---|---|
| CF-1 combined backend/frontend story | Resolved structurally; sizing remains PR-002 | Separate backend A/B/E/F, frontend C, and integration D; parent is coordination only |
| CF-2 DoD 10 unowned | Resolved in plan | D AC4 and integrated-review section explicitly own execution/evidence |
| CF-3 per-IP scope reduction | Resolved in current scope | F explicitly retains both recovery endpoint limits; original AC7 remains mapped |
| CF-4 concurrency mechanism absent | Resolved in plan | B specifies owner lock, conditional claim, account-wide retirement, rollback; D owns database tests |
| CF-5 session/JWT ambiguity | Resolved in planned behavior; approval provenance limited | Parent/B/E/C consistently retain configured JWT expiry and define refresh/local-session cleanup |
| CF-6 issuance cooldown misrepresented | Resolved in plan | A distinguishes account issuance cooldown; F separately limits redemption |
| CF-7 inconsistent lock order | Resolved in plan | A/B/E consistently acquire owner before credential writes |
| CF-8 login/refresh races | Resolved in plan | E requires password-snapshot recheck and locked refresh re-read; D tests both orderings |
| CF-9 HttpOnly cookie ownership | Resolved in plan | B owns expiry header; C owns refresh drain and local state; D owns real-browser proof |
| CF-10 unsupported approvals | Documentary provenance recorded; historical approval not independently verifiable | SD7/SD8 specify dated replies and supersede historical auto-approval claims |
| CF-11 identical timing overclaim | Resolved in plan | A/D explicitly require timing measurement and risk assessment rather than constant-time assertions |
| CF-12 links/readiness overclaim | Links and upstream distinction resolved; readiness requires PR-001/002 corrections | Correct relative links; SP-103 integrated evidence remains separately identified |

“Resolved in plan” means the mechanism or obligation is adequately specified. It does not certify implementation.

## Requirement and DoD planning coverage

| Requirement | Planning coverage |
|---|---|
| AC1 generic forgot response | A/C/F/D cover response parity, detached SMTP, and account-independent admission |
| AC2 hashed, single-use, one-hour token | A/B/D cover representation, expiry, same/distinct-token races, and rollback |
| AC3 registration-equivalent password update | B/C/D cover hashing, validation, confirmation, and successful re-login |
| AC4 all-family revocation/re-login | B/E/C/D cover transaction ordering, cookie expiry, local clearing, and accepted JWT window |
| AC5 invalid/expired recovery | B/C/D cover uniform token errors and new-link actions |
| AC6 accessible recovery screens/states | C/D explicitly own states, keyboard/focus/status, and actual viewports |
| AC7 account and IP limits | A/F/C/D retain both controls; retry contract needs PR-001 |
| Four original test requirements | Explicitly assigned across A/B/C/D/E/F; none claimed executed |

| Shared DoD | Planning assessment |
|---|---|
| 1 Functional criteria | Assigned; final gate depends on D |
| 2 Input validation | Backend/frontend obligations assigned |
| 3 Academic ownership | N/A for new recovery data access; credential-owner isolation remains explicit |
| 4 Actionable errors | Assigned; retry metadata needs PR-001 |
| 5 Loading/empty/error states | C, verified by D |
| 6 Keyboard accessibility | C, verified by D |
| 7 Responsive layouts | C, actual viewport verification in D |
| 8 Automated business-rule tests | Assigned, including real PostgreSQL races |
| 9 API/migration documentation | Backend obligations assigned; clarify C’s browser-contract documentation obligation consistently with README |
| 10 Integrated development review | Explicitly owned by D and required for all children |

## Implementation dependency blockers

These are separate from the planning findings:

- SP-102’s latest review records acceptance/DoD completion.
- SP-103’s latest review leaves integrated DoD 1, 7, and 10 **CANNOT VERIFY**. Obtain the missing evidence before treating that dependency as independently complete.
- A–F remain unimplemented in the reviewed state.
- Child Jira keys remain **Pending creation**; no tracker reconciliation was performed.

## Handoff

**Planner:** Address PR-001 and PR-002, record both original findings and corrections in the breakdown correction log, and request independent re-review.

**User decisions:** No new product decision is required to correct these findings. Historical SD7/SD8 approval provenance remains a disclosed review limitation.

**Verdict: Changes Required.**
