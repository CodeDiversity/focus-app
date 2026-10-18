# EP01 Story Breakdown — Authentication & Onboarding

**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Status:** Planned

## Locked Decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Auth approach | Email + password, self-implemented in NestJS (argon2id hashing) |
| D2 | Session strategy | JWT access token + refresh token rotation with reuse detection |
| D3 | Registration surface | Email + password only; no social sign-in in MVP |
| D4 | Onboarding scope | Skippable wizard: preferences → first semester → optional first course; progress saved per step |
| D5 | Email verification | Non-blocking: login allowed immediately; banner + resend until verified |
| D6 | Password reset: unverified gate | Password reset works for unverified accounts (SP-105 Q1) |
| D7 | Password reset: URL format | URL-hash pattern `#token=<raw-token>`, same as verification (SP-105 Q2) |
| D8 | Password reset: session handling | Revoke all refresh families and clear the local session; existing access JWTs retain their remaining configured TTL (default 15 min), explicitly approved 2026-10-14; see SP-105 SD7 |
| D9 | Password cooldown | `passwordResetRequestedAt` on `User`, separate 60-second cooldown (SP-105 Q4) |
| D10 | Password validation | Same min 8-char as registration, no complexity rules (SP-105 Q5) |
| D11 | Reset route wrapper | `/reset-password` outside both `PublicRoute`/`ProtectedRoute`, handles signed-in and signed-out (SP-105 Q6) |
| D12 | Rate limiting | Account issuance cooldown (A) AND shared per-IP limits (F): 10 forgot requests / 30 reset submissions per IP per minute; user approved 2026-10-14, SP-105 SD8 |

## Scaffold baseline (2026-10-11)

TECH-01 (STUDY-20) pre-placed working auth/users code beyond pure scaffolding. It is a head start, not story completion — and it deviates from two locked decisions the stories must converge on:

- **D1 (argon2id):** the scaffold hashes with bcrypt; SP-101 swaps it.
- **D2 (refresh rotation):** the scaffold re-signs plain JWTs with no rotation, httpOnly cookies, or reuse detection; SP-102 builds the full model.

Per-story deltas are recorded in each story file under "Existing scaffold code".

## Stories

| Story | Title | Dependencies | Jira |
|---|---|---|---|
| [SP-101](../../jira-sync/tombstones.md#story-sp-101) | User registration | — | STUDY-6 |
| [SP-102](../../jira-sync/tombstones.md#story-sp-102) | Login, logout, and session management | SP-101 | STUDY-9 |
| [SP-103](./SP-103-email-verification.md) | Email verification (non-blocking) | SP-101 | STUDY-12 |
| [SP-104](./SP-104-auth-guards-data-scoping.md) | Auth guards and student data scoping | SP-102 | STUDY-10 |
| [SP-105](./SP-105/README.md) | Password reset — split into [10 children](./SP-105/README.md) | SP-102, SP-103 | STUDY-7 (parent) |
| [SP-106](./SP-106/README.md) | Student profile and preferences — split into [4 children](./SP-106/README.md) | SP-104 | STUDY-11 (parent) |
| [SP-107](./SP-107/README.md) | Onboarding wizard — split into [6 children](./SP-107/README.md) | SP-103, SP-106 | STUDY-8 (parent) |

Epic: **STUDY-5**.

Dependency flow: SP-101 → SP-102 → SP-104 → SP-105, with SP-103 and SP-106 parallelizable after SP-101/SP-102, and SP-107 last. SP-107 introduces minimal `POST /semesters` (step 2) and `POST /courses` (step 3) endpoints that EP02 must extend, not duplicate — flagged in both breakdowns.

Historical Jira sync: EP01 and seven original stories were recorded as synced on 2026-10-11. SP-105 remains the existing STUDY-7 parent; children A–J have distinct local story IDs and Jira keys **Pending creation**. No tracker mutation occurred during this correction pass; linking and issue types must be reconciled on an explicitly authorized sync. Superseded 2026-10-17 by the authorized bootstrap sync, which verified SP-105's children A–J as **STUDY-22–STUDY-31**, SP-106's children A–D as **STUDY-32–STUDY-35**, SP-108 and its children A–G as **STUDY-36–STUDY-43**, SP-106/SP-105 parents STUDY-11/STUDY-7 as before, and SP-109 and its children A–I as **STUDY-44–STUDY-53**. Nested parent linkage remains unresolved: Jira rejects a `Task` parenting another `Task`, and STUDY-7/STUDY-11/STUDY-36 are `Task`s. No status transition was executed in that run; full record in `docs/jira-sync/ledger.json`.

## Quality gate — SP-105 correction pass (2026-10-14)

**Plan Ready — independently reviewed in [pass 2](./SP-105/plan-review.md); Implementation Blocked pending SP-103 integrated evidence.** The [SP-105 breakdown](./SP-105/README.md) owns original AC/TR/DoD mapping, explicit policy provenance, correction history (CF-1–CF-12, PR-001/002), and current readiness evidence.

- A: backend issuance/persistence/account cooldown.
- E: backend login/refresh/logout owner-first coordination, prerequisite to B.
- B: backend redemption/retirement/revocation and server-owned cookie expiry.
- F: backend per-IP limits on both recovery endpoints; retained in scope by explicit user decision.
- G: shared frontend refresh barrier, generation checks and sanitized API failures.
- C: recovery screens consuming G, retry/error states.
- H: reusable real-Postgres fixtures and barriers; I: credential races; J: limiter races.
- D: executes prerequisite suites, performs manual browser/SMTP sign-off and DoD 10.

The historical blanket “ready” verdict is superseded. Source code exists for SP-102/SP-103 but SP-103's latest review still lacks integrated DoD evidence; planning can proceed while upstream execution readiness remains unverified. No SP-105 implementation or passing tests are claimed. Its original AC7 per-IP requirement is no longer deferred. The pass-2 read-only review independently resolved PR-001/002 and returned Plan Ready; this approves planning obligations, not application implementation or test results.

## Quality gate — SP-106 plan (2026-10-17)

**Plan Ready; implementation not started and not claimed.** The [SP-106 breakdown](./SP-106/README.md) owns the execution queue, decisions (D106-1…9, preferences shape user-approved 2026-10-17), shared API contract, original AC/TR traceability, correction log (CF-106-01), and quality gate.

- A: backend — `timeZone` + `preferences` on `User` (one migration); `GET /users/me` returns them, credentials excluded.
- B: backend — `PATCH /users/me` (replaces PUT) with IANA + bounded-preferences validation; field-level 400 `errors` map; dead unscoped service methods deleted.
- C: frontend — profile time-zone field (browser-detected default, client validation, form states); PATCH switch; stored-zone display via the existing shared helper.
- D: integration — cross-session round-trip + cross-student + credential-exclusion proof on real Postgres; manual browser sign-off (DoD 10).

Upstream prerequisites SP-104 (implemented, STUDY-10 review PASS) and SP-108 (implemented, combined review PASS) are verified in code, so implementation is not blocked; next actionable is SP-106A.
