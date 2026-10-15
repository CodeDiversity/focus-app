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
| D8 | Password reset: session handling | Successful reset revokes all sessions; user must re-login (SP-105 Q3) |
| D9 | Password cooldown | `passwordResetRequestedAt` on `User`, separate 60-second cooldown (SP-105 Q4) |
| D10 | Password validation | Same min 8-char as registration, no complexity rules (SP-105 Q5) |
| D11 | Reset route wrapper | `/reset-password` outside both `PublicRoute`/`ProtectedRoute`, handles signed-in and signed-out (SP-105 Q6) |
| D12 | Rate limiting | Per-account cooldown now; per-IP deferred to the epic API-wide task (SP-105 Q7 — see SP-105 breakdown SD8) |

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
| [SP-105](./SP-105/README.md) | Password reset — split into [4 children](./SP-105/README.md) | SP-102, SP-103 | STUDY-7 (parent) |
| [SP-106](./SP-106-profile-and-preferences.md) | Student profile and preferences | SP-104 | STUDY-11 |
| [SP-107](./SP-107-onboarding-wizard.md) | Onboarding wizard | SP-103, SP-106 | STUDY-8 |

Epic: **STUDY-5**.

Dependency flow: SP-101 → SP-102 → SP-104 → SP-105, with SP-103 and SP-106 parallelizable after SP-101/SP-102, and SP-107 last. SP-107 step 2 introduces a minimal semester-create endpoint that EP02 must extend, not duplicate — flagged in both stories.

Synced to Jira (project STUDY, site adhdestudy.atlassian.net) on 2026-10-11: epic and seven stories labeled `studypilot`, `mvp`; dependencies mirrored as Blocks issue links. Story files remain the source of truth; Jira keys are recorded per story file. SP-105 was split (2026-10-14) into the parent **STUDY-7** plus four children (SP-105A/B/C/D), each "Pending creation"; the four child issues are created on the next sync and linked under STUDY-7.

## Quality Gate (SP-105 breakdown — 2026-10-14)

**Status:** Plan ready for implementation. SP-105 is split into a parent and four children; the feature is not yet built. Full detail — decisions, per-requirement ownership, correction log, readiness table — lives in the [SP-105 breakdown README](./SP-105/README.md).

### Structure

SP-105 is **not** one combined story. It is a [parent coordination record](./SP-105/SP-105-password-reset.md) plus:

- **SP-105A** — backend: `PasswordResetToken` model + `forgot-password` issuance (60s cooldown, generic response, async email).
- **SP-105B** — backend: `reset-password` redemption (atomic claim, session revocation).
- **SP-105C** — frontend: request + reset screens (states, a11y, session clearing).
- **SP-105D** — integration: real-Postgres concurrency proofs, E2E recovery, DoD 10.

### Requirement/test ownership (→ child)

All 7 original acceptance criteria and all 4 technical-notes test requirements are assigned to owning children in the [breakdown README](./SP-105/README.md) — **not** to sections of one combined story (which the earlier refinement did, and which this supersedes). DoD 3 is N/A (public recovery flow); DoD 10 is owned by SP-105D.

### Corrections (supersede the 2026-10-14 refinement)

The earlier refinement treated SP-105 as one combined story and declared it ready; it also left DoD 10 unowned, reduced AC7's per-IP requirement, and named no concurrency mechanism. All are addressed in the [correction log (CF-1..CF-6)](./SP-105/README.md).

### Checked code paths (verified 2026-10-14)

- `public-routes.ts` already lists both reset routes (inert until implemented); the global `JwtAuthGuard` (APP_GUARD) treats them as public.
- `auth.controller.ts` / `auth.service.ts` have **no** `forgot-password` / `reset-password` yet (implemented in A/B); no `PasswordResetToken` model in `schema.prisma` (added in A).
- Reuse verified: `email-verification.service.ts` (SHA-256, 60s cooldown, async `setImmediate` email, 43-char token), `email-provider.ts` (`EMAIL_PROVIDER`), `auth.service.ts` (`ARGON2_OPTIONS`), the `RefreshToken`/`EmailVerificationToken` models, the `AllExceptionsFilter` envelope, `VerifyEmail.tsx` `readLinkToken` + fragment-strip, the `App.tsx` unguarded `/verify-email` precedent, the `Login.tsx` dead `/forgot-password` link, and `services/api.ts` `AUTH_PATHS`.
- Implementer notes: `App.tsx` gains the two reset routes in C; the `PasswordResetToken` migration is generated in A; the dead `/forgot-password` link is connected in C; `VerifyEmail` is the UX reference.

**Readiness:** every applicable readiness row passes and no finding is unresolved → **plan ready for implementation** (see the [readiness table](./SP-105/README.md)). The feature itself is pending (SP-105A–D); DoD 10 is satisfied by SP-105D at implementation time.
