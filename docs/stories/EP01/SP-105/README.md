# SP-105 Breakdown — Password Reset

**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md) (co-ordination record, Jira STUDY-7)
**Milestone:** M1
**Status:** **Plan ready for implementation** (2026-10-14). The feature is **not yet built.**
**Children:** [SP-105A](./SP-105A-password-reset-backend-issuance.md) · [SP-105B](./SP-105B-password-reset-backend-redemption.md) · [SP-105C](./SP-105C-password-reset-frontend-ui.md) · [SP-105D](./SP-105D-password-reset-integration.md)

## How SP-105 is split

The original SP-105 was a single combined backend+frontend story. It is split into a parent coordination record plus four independently testable children, following the required breakdown structure (separate backend/frontend children, each with its own tracker issue, plus a named integration owner):

- **SP-105A** — backend: data model + `forgot-password` issuance.
- **SP-105B** — backend: `reset-password` redemption + session revocation (carries the concurrency guarantees).
- **SP-105C** — frontend: request + reset screens (can start against the contract, finishes after A/B).
- **SP-105D** — integration: real-Postgres concurrency proofs, E2E recovery, DoD 10.

The split mirrors SP-103's issuance/confirmation boundary and the "issuance / redemption / recovery UI" boundaries. No original requirement is dropped — each is assigned below.

## Locked decisions

**Preserved** from the epic decision record (also in the [EP01 README](../README.md) D6–D12):

| # | Decision |
|---|---|
| D6 (Q1) | Reset works for unverified accounts (no `emailVerifiedAt` gate). |
| D7 (Q2) | Reset link uses the URL-fragment pattern `#token=<raw-token>`, same as verification. |
| D8 (Q3) | A successful reset revokes all sessions; the user re-logs in on all devices. |
| D9 (Q4) | `passwordResetRequestedAt` on `User`; a separate 60-second per-account cooldown. |
| D10 (Q5) | Same min-8-char password policy as registration; no complexity rules. |
| D11 (Q6) | `/reset-password` (and `/forgot-password`) live outside `PublicRoute`/`ProtectedRoute`; signed-in and signed-out both handled. |
| D12 (Q7) | Rate limiting: per-account cooldown now; per-IP deferred to the epic API-wide task. |

**New structural decisions** (auto-approved by the user, 2026-10-14):

| # | Decision |
|---|---|
| SD1 (split) | SP-105 → parent + A/B/C/D; backend and frontend are separate tickets; issuance and redemption are independently testable; integration has a distinct owner. |
| SD2 (Jira) | STUDY-7 = the existing "Password reset" story becomes the parent; A/B/C/D are new issues ("Pending creation"), keys recorded back on next sync. |
| SD3 (hash) | SHA-256 digest of the 43-char base64url raw token, stored hex; raw never persisted/logged/returned (mirrors SP-103 + SP-102). |
| SD4 (TTL) | 1-hour reset-token expiry (original AC2); distinct from verification's 24h. |
| SD5 (single-use) | Issuance retires the account's prior tokens; redemption retires the account's other tokens + revokes all refresh families. "One live token after each request" (A) and "one token can ever be redeemed" (B). |
| SD6 (concurrency) | Redemption = one all-or-nothing transaction: user-row `FOR UPDATE` lock + conditional claim (`usedAt IS NULL AND expiresAt > now`) + account-wide retirement + refresh revocation + password update; `READ COMMITTED`. Serializes same-token and different-token races. |
| SD7 (session scope) | Revoke = `revokedAt` on all the user's refresh rows. Accept the bounded ~15-min access-JWT window (stateless JWTs); no denylist in MVP. |
| SD8 (abuse / AC7) | Per-account 60s cooldown on `forgot-password` now; **per-IP deferred** to the epic API-wide rate-limiting task (SP-102 Q8 / SP-101 precedent) — the original per-IP requirement is preserved as that follow-up, not dropped. Redemption is protected by 256-bit single-use 1h tokens (entropy), not by the issuance cooldown. |
| SD9 (anti-oracle) | `forgot-password` returns one identical `200`+message for eligible / cooled-down / unknown / SMTP-failure; email is async off the response path; no `429` / cooldown header. |
| SD10 (route wrapper) | Both routes outside the wrappers (D11); on success the frontend clears local token/user/cookie, guards the in-flight restore, then navigates to login. |
| SD11 (uniform rejection) | Every reset-token failure (used/expired/unknown/invalid) is the same generic `400`; never distinguished. |

## Requirement & test ownership map

### Original acceptance criteria → owning child

| # | Original criterion | Owning child(ren) |
|---|---|---|
| AC1 | `forgot-password` always returns the same generic response whether or not the email is registered | **SP-105A** (identical `200`, async email, no 429/oracle — SD9); **SP-105C** (single generic "check inbox" state) |
| AC2 | Tokens are single-use, hashed at rest, expire after 1 hour | **SP-105A** (SHA-256, 1h, retire prior); **SP-105B** (conditional claim, one-success); **SP-105D** (real-Postgres one-success) |
| AC3 | `reset-password` with a valid token updates the password hash with the same policy as registration | **SP-105B** (argon2id `ARGON2_OPTIONS`, min 8) |
| AC4 | A successful reset revokes every refresh token family, forcing re-login on all devices | **SP-105B** (revoke all rows); **SP-105C** (clear local session + navigate); **SP-105D** (proves all families dead) |
| AC5 | Used/expired tokens rejected with an actionable message offering a new request | **SP-105B** (generic `400`); **SP-105C** (shows message + re-request link) |
| AC6 | Frontend request + reset screens with loading/empty/error states and keyboard accessibility | **SP-105C** (both pages, all states, keyboard/responsive WCAG 2.2 AA); **SP-105D** (real-viewport verification) |
| AC7 | Rate-limited per account **and per IP** | **SP-105A** (per-account 60s cooldown now); **per-IP → tracked deferral** to the epic API-wide task (SD8 / CF-3) — not silently dropped |

### Original technical-notes test requirements → owning child

| Original test requirement | Owning child(ren) |
|---|---|
| Token single-use and expiry | SP-105A (issuance retire + expiry) · SP-105B (redemption enforce + concurrent) · SP-105D (real-Postgres) |
| Session revocation on reset | SP-105B (revoke all rows) · SP-105D (racing refresh 401s, all families dead) |
| Generic response on unknown email | SP-105A (identical `200` for known/unknown) |
| Rate limiting | SP-105A (per-account cooldown) · per-IP deferred (SD8) |

### Definition of Done items → owning child

| DoD item | Owner(s) |
|---|---|
| 1 — functional ACs pass | A, B, C, D |
| 2 — FE + BE validation of invalid input | A (email) · B (token + password) · C (forms) |
| 3 — academic data scoped to the student | **N/A** — public recovery flow; a token authorizes only its owner's change; no academic data touched |
| 4 — actionable API errors | A, B, C |
| 5 — loading/empty/error states | C (unit) + D (verify) |
| 6 — keyboard accessibility | C (unit) + D (verify) |
| 7 — responsive desktop/mobile | C (unit) + D (verify) |
| 8 — business rules automated tests | A, B, C, D |
| 9 — API changes and migrations documented | A (schema + migration) · B (API contract); C N/A (no FE migration) |
| 10 — integrated development review | **D performs it** · A/B/C carry the obligation |

## Correction log

The 2026-10-14 refinement of SP-105 (in the working tree) was re-checked against the required breakdown structure and the plan quality gate. Each finding retains the original claim alongside the fix. "Original" refers to the pre-split `docs/stories/EP01/SP-105-password-reset.md` and the uncommitted `docs/stories/EP01/README.md` "Quality Gate (SP-105 refinement)" section.

### CF-1 — combined story declared ready (Blocker)
- **Date:** 2026-10-14
- **Original:** `EP01/README.md` → "Quality Gate (SP-105 refinement — 2026-10-14)"; `SP-105-password-reset.md`.
- **Original claim:** *"All 7 original acceptance criteria from SP-105 are mapped to concrete technical sections … Status: Plan ready for implementation."* — one combined backend+frontend story with requirements mapped to its own sections.
- **Consequence:** violates the required breakdown structure — separate backend/frontend children each with their own tracker issue, and requirement/test mapping to **child IDs**, not sections of one combined file. A single combined ticket cannot be implemented/reviewed independently by the backend and frontend agents, and cross-layer integration has no owner.
- **Correction:** split into parent + A/B/C/D; created this breakdown README with the per-AC / per-test / per-DoD → child maps; corrected the EP01 README.
- **Verification:** every original AC, all 4 test requirements, and every DoD item is assigned to a named child above; each child has a distinct tracker key (or "Pending creation"); the EP01 README no longer maps requirements to one combined story.
- **Status:** Fixed in plan.

### CF-2 — DoD 10 unowned (Major)
- **Original claim:** DoD 1–9 were allocated to the combined story's "backend"/"frontend" halves; **DoD 10 (integrated development review) was never assigned to an owner.**
- **Consequence:** the cross-layer integrated review had no owner; a combined story cannot express a distinct cross-layer verification.
- **Correction:** DoD 10 allocated to SP-105D (performs the integrated review); A/B/C carry the obligation.
- **Verification:** the DoD map lists item 10 → SP-105D; SP-105D's AC4 requires performing the review and recording evidence.
- **Status:** Fixed in plan.

### CF-3 — AC7 per-IP silently reduced (Major / security)
- **Original claim:** D12 reduced the original "per account **and per IP**" requirement to "per-account cooldown only." A deferral is a scope change; inheriting SP-102 Q8's *login* deferral is not approval for the reset endpoints.
- **Consequence:** the per-IP requirement would be silently dropped, weakening abuse protection on `forgot-password` (the email-flooding vector).
- **Correction:** recorded a **specific** decision (SD8): per-account 60s cooldown now; per-IP deferred to the epic API-wide rate-limiting task with a named follow-up; the original per-IP requirement is **preserved** as that follow-up. Residual risk stated: the cooldown bounds flooding to ~1/min/account; per-IP would bound cross-account flooding.
- **Verification:** the AC7 row maps per-account → SP-105A and per-IP → tracked deferral (SD8); it is **not** marked fully covered.
- **Status:** Fixed in plan (deferral auto-approved by the user, 2026-10-14).

### CF-4 — concurrency mechanism unnamed (Major / security)
- **Original claim:** the technical notes name the single-use and revocation *outcomes* but not the **mechanism** that prevents (a) two concurrent redemptions of one token or (b) two distinct valid tokens both succeeding. A read-then-unconditional-write does not establish single-use.
- **Consequence:** the security invariant was asserted, not established; a naive implementation would race.
- **Correction:** SP-105B specifies the all-or-nothing transaction (user-row `FOR UPDATE` lock + conditional claim + account-wide retirement + refresh revocation + password update; `READ COMMITTED`) with a counterexample → mechanism → falsifying-test table.
- **Verification:** SP-105B's table names the predicate/lock for each race and its owning test; SP-105D proves both races against real Postgres.
- **Status:** Fixed in plan.

### CF-5 — session-state / access-JWT gap (Minor / decision)
- **Original claim:** AC4 "revokes every refresh token family" implies full immediate logout, but stateless access JWTs (15-min) survive, and revoking refresh rows does not clear the React auth state.
- **Consequence:** the plan over-claimed (immediate logout) and under-specified the frontend (local token/user + in-flight restore).
- **Correction:** SD7 documents the bounded ~15-min access-JWT window as an accepted decision (no denylist); SP-105C (C3) specifies clearing local token/user/cookie + guarding the in-flight silent restore.
- **Verification:** the parent "session-revocation semantics," SP-105B "access-JWT window," and SP-105C AC4/C3 all state the same bounded behavior.
- **Status:** Fixed in plan.

### CF-6 — abuse-control endpoint mismatch (Minor / security)
- **Original claim:** the per-account cooldown was framed as protecting "the reset flow" generally, but a per-account cooldown does **not** throttle guessing at the *redemption* endpoint.
- **Consequence:** an unaddressed impression that the cooldown protects token-guessing.
- **Correction:** SD8/CF-6 clarify redemption is protected by 256-bit single-use 1-hour tokens (entropy), not by the issuance cooldown; the issuance cooldown bounds email flooding only.
- **Verification:** SP-105A (cooldown on issuance) and SP-105B (token entropy on redemption) each state the correct protection for their own endpoint.
- **Status:** Fixed in plan.

## Readiness table (plan)

| Row | Status | Evidence |
|---|---|---|
| Story separation & size | **Pass** | parent + A + B + C + D; FE/BE separated; each one working session; A and B independently testable (parent "Children" + dependency graph) |
| Original requirement & test coverage | **Pass** | all 7 ACs + all 4 test reqs mapped to named children; none dropped — AC7 per-IP preserved as a tracked deferral (SD8/CF-3) |
| API consistency | **Pass** | one shared contract in the parent; A/B/C agree on DTOs, token format, hashing boundary, statuses, and the error envelope |
| Security counterexamples | **Pass** | same-token race, different-token race, refresh-racing-reset, old-pw-login, access-JWT window, abuse — each has a named mechanism + owning child + falsifying test (B unit / D real-Postgres) |
| DoD 1, 2, 4, 8, 9 (backend) | **Pass** | allocated to A and B |
| DoD 3 (academic scoping) | **Not applicable** | public recovery flow; a token authorizes only its owner's change; no academic data touched |
| DoD 5, 6, 7 (frontend) | **Pass** | allocated to C (unit tests) + D (real-viewport/keyboard verification) |
| DoD 10 (integrated review) | **Pass (plan) — not yet performed** | allocated to SP-105D (performs it); the actual integrated development review is a downstream verification obligation satisfied at implementation, not now |
| Dependency completion | **Pass (external) / Pending (children)** | SP-102 + SP-103 implemented (git `005893e`, `f8cb4d2`, `20c7263`); SP-105A/B/C/D not yet built — this plan produces them |
| Material decisions | **Pass** | D6–D12 (preserved) + SD1–SD11 recorded; all auto-approved 2026-10-14 per the user |
| Correction-log completeness | **Pass** | CF-1..CF-6 captured with original claim + correction + verification + status |

## Quality gate result

- **Requirement/test ownership:** all 7 ACs, all 4 test requirements, and all 10 DoD items assigned to named children (DoD 3 N/A; DoD 10 → SP-105D).
- **Checked code paths (all referenced symbols verified to exist):** `schema.prisma` (`User`/`RefreshToken`/`EmailVerificationToken`); `auth.service.ts` (`ARGON2_OPTIONS`, sha256, 30-day refresh); `email-verification.service.ts` (SHA-256 / 60s cooldown / async email / `readLinkToken`-style 43-char token); `email-provider.ts` (`EMAIL_PROVIDER`); `public-routes.ts` (both reset routes already present, inert); `AllExceptionsFilter` envelope; frontend `VerifyEmail.tsx` (`readLinkToken` + fragment strip), `App.tsx` (unguarded `/verify-email` precedent), `Login.tsx` (dead `/forgot-password` link), `services/auth.ts` + `services/api.ts` (`AUTH_PATHS`).
- **Settled decisions:** D6–D12 + SD1–SD11 (auto-approved 2026-10-14).
- **Security guarantees → mechanism + falsifying test:** token single-use (conditional claim + user lock → B unit, D real-Postgres); multiple tokens (account-wide retirement + lock → B, D); session revocation (revoke all rows + SP-102 reuse detection → B, D); access-JWT window (bounded 15-min, documented decision SD7); abuse (per-account cooldown → A; token entropy → B; per-IP deferred SD8).
- **Overall:** **Plan/breakdown ready for implementation** — every applicable readiness row passes and no finding is left unresolved (CF-1..CF-6 all "Fixed in plan"). The **feature is not yet implemented or tested**: SP-105A–D are the implementation tickets this plan produces, and DoD 10 will be satisfied by SP-105D at implementation time.
