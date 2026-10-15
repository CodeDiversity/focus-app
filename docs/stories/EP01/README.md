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
| [SP-101](./SP-101-user-registration.md) | User registration | — | STUDY-6 |
| [SP-102](./SP-102-login-logout-sessions.md) | Login, logout, and session management | SP-101 | STUDY-9 |
| [SP-103](./SP-103-email-verification.md) | Email verification (non-blocking) | SP-101 | STUDY-12 |
| [SP-104](./SP-104-auth-guards-data-scoping.md) | Auth guards and student data scoping | SP-102 | STUDY-10 |
| [SP-105](./SP-105/README.md) | Password reset — split into [10 children](./SP-105/README.md) | SP-102, SP-103 | STUDY-7 (parent) |
| [SP-106](./SP-106-profile-and-preferences.md) | Student profile and preferences | SP-104 | STUDY-11 |
| [SP-107](./SP-107-onboarding-wizard.md) | Onboarding wizard | SP-103, SP-106 | STUDY-8 |

Epic: **STUDY-5**.

Dependency flow: SP-101 → SP-102 → SP-104 → SP-105, with SP-103 and SP-106 parallelizable after SP-101/SP-102, and SP-107 last. SP-107 step 2 introduces a minimal semester-create endpoint that EP02 must extend, not duplicate — flagged in both stories.

Historical Jira sync: EP01 and seven original stories were recorded as synced on 2026-10-11. SP-105 remains the existing STUDY-7 parent; children A–J have distinct local story IDs and Jira keys **Pending creation**. No tracker mutation occurred during this correction pass; linking and issue types must be reconciled on an explicitly authorized sync.

## Quality gate — SP-105 correction pass (2026-10-14)

**Corrected draft; independent re-review pending.** The [SP-105 breakdown](./SP-105/README.md) owns original AC/TR/DoD mapping, explicit policy provenance, correction history (CF-1–CF-12), and current readiness evidence.

- A: backend issuance/persistence/account cooldown.
- E: backend login/refresh/logout owner-first coordination, prerequisite to B.
- B: backend redemption/retirement/revocation and server-owned cookie expiry.
- F: backend per-IP limits on both recovery endpoints; retained in scope by explicit user decision.
- G: shared frontend refresh barrier, generation checks and sanitized API failures.
- C: recovery screens consuming G, retry/error states.
- H: reusable real-Postgres fixtures and barriers; I: credential races; J: limiter races.
- D: executes prerequisite suites, performs manual browser/SMTP sign-off and DoD 10.

The historical blanket “ready” verdict is superseded. Source code exists for SP-102/SP-103 but SP-103's latest review still lacks integrated DoD evidence; planning can proceed while upstream execution readiness remains unverified. No SP-105 implementation or passing tests are claimed. Its original AC7 per-IP requirement is no longer deferred. The corrected plans must receive a fresh read-only review before independent plan approval is claimed.
