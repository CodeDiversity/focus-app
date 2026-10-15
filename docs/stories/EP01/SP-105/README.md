# SP-105 Breakdown — Password Reset

**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md) (co-ordination record, Jira STUDY-7)
**Milestone:** M1
**Status:** **Needs Decision — corrections in progress; independent re-review pending** (2026-10-14). The feature is **not yet built.**
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
| D12 (Q7) | Prior per-IP deferral is unverified; see SD8 and CF-10. |

**Proposed mechanisms and tracking conventions** (2026-10-14; policy approval must be explicit):

| # | Decision |
|---|---|
| SD1 (split) | SP-105 → parent + A/B/C/D; backend and frontend are separate tickets; issuance and redemption are independently testable; integration has a distinct owner. |
| SD2 (Jira) | STUDY-7 = the existing "Password reset" story becomes the parent; A/B/C/D are new issues ("Pending creation"), keys recorded back on next sync. |
| SD3 (hash) | SHA-256 digest of the 43-char base64url raw token, stored hex; raw never persisted/logged/returned (mirrors SP-103 + SP-102). |
| SD4 (TTL) | 1-hour reset-token expiry (original AC2); distinct from verification's 24h. |
| SD5 (single-use) | Issuance retires the account's prior tokens; redemption retires the account's other tokens + revokes all refresh families. "One live token after each request" (A) and "one token can ever be redeemed" (B). |
| SD6 (concurrency) | Redemption = one all-or-nothing transaction: user-row `FOR UPDATE` lock + conditional claim (`usedAt IS NULL AND expiresAt > now`) + account-wide retirement + refresh revocation + password update; `READ COMMITTED`. Serializes same-token and different-token races. |
| SD7 (session scope) | **Decision needed:** current guards allow existing access JWTs until expiry (~15 minutes). Accept this bounded residual window or require immediate access-token invalidation; do not infer approval. |
| SD8 (abuse / AC7) | **Decision needed:** original per-IP requirement remains in scope unless explicitly deferred. Per-account issuance cooldown limits email attempts; token entropy protects against guessing, not request-volume abuse. SP-102 login deferral is not approval here. |
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

## Review corrections — 2026-10-14

The CF-1–CF-6 entries above preserve the previous agent's original claims and dispositions; they are historical, not fresh verification. In particular, CF-3 and CF-5's approval claims are not substantiated by this session. The following entries supersede their readiness/approval conclusions. No independent `plan-review.md` exists yet; these findings come from the parent assistant's review in this conversation. Corrections remain subject to independent re-review.

### CF-7 — inconsistent lock order (Blocker)
- **Original finding:** SP-105B, “Persistence and concurrency,” steps 1–2 claimed a token before locking its owner, while the parent required owner-first. Two distinct token claims can block account-wide retirement and form a deadlock; the prose incorrectly said the claim already held the user lock.
- **Correction:** B now specifies advisory owner discovery, owner-first serialization shared with A/E, conditional claim after the lock, fresh post-wait expiry, rollback, and controller-owned cookie expiration.
- **Verification:** Traced same-token and different-token losers through the new owner-first B steps; neither holds a token lock while waiting for the owner. Remaining cross-file synchronization is tracked below; actual PostgreSQL evidence belongs to D.
- **Status:** Unresolved.

### CF-8 — login/refresh races asserted away (Blocker)
- **Original finding:** SP-105B, “Session revocation,” said old-password verification fails after replacement and left login unchanged. Login can verify before reset and persist a new session after reset; refresh can similarly create a successor outside reset's snapshot.
- **Correction:** Added E as B's prerequisite: shared owner-first locking, login password-snapshot recheck, locked refresh re-read and signing, and both race orderings. B now points to this protocol.
- **Verification:** Compared current login (verify then uncoordinated insert) and refresh (token-first claim) with E's required order; traced reset-first failure and session-first later revocation. D must prove both on PostgreSQL.
- **Status:** Unresolved.

### CF-9 — HttpOnly cookie assigned to frontend (Major)
- **Original finding:** SP-105C AC4 and success handling assigned cookie clearing to the SPA; JavaScript cannot clear the HttpOnly refresh cookie. No reset-controller response owned the action.
- **Correction:** Pending: B's controller expires the cookie after commit with existing cookie attributes; C clears local state and guards both API token writes and AuthContext restore; D verifies real Set-Cookie behavior.
- **Verification:** Pending comparison with `clearRefreshCookie` in `auth.controller.ts` and the single-flight refresh in `services/api.ts`.
- **Status:** Unresolved.

### CF-10 — unsupported policy approvals (Major)
- **Original finding:** README SD7/SD8 and CF-3/CF-5 labeled the access-JWT window and per-IP deferral “auto-approved.” This conversation contains no such approval; the alleged follow-up has no specific ID/owner.
- **Correction:** Remove current approval claims; retain original text only in the historical finding record. Mark access-JWT policy and per-IP disposition as decisions needed until the user answers. Preserve original AC7.
- **Verification:** Compared the conversation authorization with SD7/SD8. A request to fix docs is not acceptance of a weaker security requirement.
- **Status:** Decision needed.

### CF-11 — response timing overclaimed (Major)
- **Original finding:** SP-105A “Security” promised identical timing because SMTP is async, despite eligible accounts doing additional database writes.
- **Correction:** Pending: retain identical status/body and SMTP-independent response, explicitly disclose residual database-path timing, require measurement and a decision before claiming full timing-enumeration resistance.
- **Verification:** Pending test ownership in A/D and revised claim comparison; no constant-time result is claimed.
- **Status:** Unresolved.

### CF-12 — broken links and readiness overclaim (Major)
- **Original finding:** All moved child epic links used `../../epics/`, resolving into `docs/stories/epics/`; readiness rows passed despite policy and concurrency gaps. SP-103's latest review still has unverified integrated DoD obligations.
- **Correction:** Pending: repair links, distinguish planning from implementation readiness, preserve dependency limits, and replace blanket readiness claims with specific blockers.
- **Verification:** Pending local Markdown link resolution and final cross-file review.
- **Status:** Unresolved.

## Current readiness — supersedes earlier declarations

**Needs Decision; independent re-review pending.** No application feature has been implemented by this correction pass. Original requirement/test maps above are retained, but AC7's per-IP coverage is blocked on CF-10. Session-race coverage must include child E (CF-8). The quality gate cannot pass until these entries are corrected and policy decisions are settled.
