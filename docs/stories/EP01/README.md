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
| [SP-105](./SP-105-password-reset.md) | Password reset | SP-102, SP-103 | STUDY-7 |
| [SP-106](./SP-106-profile-and-preferences.md) | Student profile and preferences | SP-104 | STUDY-11 |
| [SP-107](./SP-107-onboarding-wizard.md) | Onboarding wizard | SP-103, SP-106 | STUDY-8 |

Epic: **STUDY-5**.

Dependency flow: SP-101 → SP-102 → SP-104 → SP-105, with SP-103 and SP-106 parallelizable after SP-101/SP-102, and SP-107 last. SP-107 step 2 introduces a minimal semester-create endpoint that EP02 must extend, not duplicate — flagged in both stories.

Synced to Jira (project STUDY, site adhdestudy.atlassian.net) on 2026-10-11: epic and seven stories labeled `studypilot`, `mvp`; dependencies mirrored as Blocks issue links. Story files remain the source of truth; Jira keys are recorded per story file.
