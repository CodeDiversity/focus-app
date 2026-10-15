# SP-105B: Password Reset — Redemption & Session Revocation — Implementation Review

**Review date:** 2026-10-15  
**Pass:** 1 (implementation review)  
**State reviewed:** Commit `d401e1f` (HEAD). Working tree clean except untracked `docs/artifacts/SP-105A/review.md` (see Handoff). Implementation commits: `80ddbe0` (DTO), `9dec2d4` (service + `owner-lock.ts` + `ARGON2_OPTIONS` export), `04d206d` (controller + allowlist comment).  
**Epic / milestone:** EP01 / M1  
**Verdict:** **Changes Required** (PR-104 documentation correction; no B code change required)

---

## Reviewed scope and limitations

Reviewed application code:

- `apps/api/src/modules/auth/password-reset.service.ts` — `resetPassword()` redemption (lines 199–260) + contract constants
- `apps/api/src/modules/auth/owner-lock.ts` — shared owner-first protocol (`lockOwner` line 40, `databaseNow` line 57)
- `apps/api/src/modules/auth/dto/reset-password.dto.ts` — token/password/confirmation validators
- `apps/api/src/modules/auth/auth.controller.ts` — `POST /auth/reset-password` (lines 65–76), `clearRefreshCookie` (lines 26–31)
- `apps/api/src/modules/auth/auth.service.ts` — `ARGON2_OPTIONS` export (lines 59–64), current `login` (137) / `refresh` (174) used to verify the dependency-state claim in the artifact
- `apps/api/src/modules/auth/public-routes.ts` — allowlist entry (line 27)
- `apps/api/src/main.ts` — global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`) and `AllExceptionsFilter` wiring; matches the pipe used by the DTO spec exactly
- `apps/api/src/common/filters/all-exceptions.filter.ts` — uniform 400/500 envelope
- `apps/api/src/modules/auth/auth.module.ts` — `PasswordResetService` provider, `APP_GUARD` default-deny
- Test files: `reset-password.dto.spec.ts` (20 tests), `password-reset.service.spec.ts` (16 new redemption tests; 36 total), `auth.controller.spec.ts` (9 new; 26 total)
- `apps/api/prisma/schema.prisma` — `RefreshToken.revokedAt`, `PasswordResetToken`, `User.passwordResetRequestedAt` (no schema change by B, as claimed)
- Docs: `docs/stories/EP01/SP-105/SP-105B-…md` (story), `SP-105E-…md`, `SP-105-password-reset.md` (parent session-ownership section), `docs/stories/EP01/SP-105/README.md` (breakdown, CF-7/CF-8), `docs/artifacts/SP-105B/implementation.md`, `docs/epics/README.md` (shared DoD)

**Tests run (actual output):**

- `npx jest` on the three touched spec files: **82 passed, 0 failed**.
- Full API suite: **199 passed, 13 skipped, 18 of 19 suites passed** (the skipped suite is the pre-existing `users-data-scoping` live-Postgres suite, unrelated to this story). The artifact's "full API suite green" claim is verified.
- New-test count verified: 20 DTO + 16 service + 9 controller = **45 new tests**, matching the artifact (no count discrepancy this time).

**Limitations:**

- No real-Postgres execution: lock-wait serialization, `READ COMMITTED` per-statement snapshot behavior, and deadlock-freedom are proven only by the stateful, rollback-capable in-memory doubles. Real-DB proof is the declared obligation of SP-105H/I/D and was not run.
- The test doubles simulate, not reproduce, PostgreSQL row-lock semantics (e.g. the `$queryRaw` double fakes lock-wait via fake timers).
- `.env`/secret files were not read (by design); no secrets were found in any file B touched.
- Upstream SP-103 integrated-review evidence remains unverified — a pre-existing release gate, not introduced here.

---

## Acceptance Criteria Verification

| AC | Status | Evidence |
|---|---|---|
| **1.** Valid token updates the password with registration's argon2id options and min-8 policy; confirmation validated before mutation | ✅ **Satisfied** (unit level) | `password-reset.service.ts:211` hashes with the exported `ARGON2_OPTIONS` (same const as `register`/`validateUser`, `auth.service.ts:59`) **before** opening the transaction; min-8 + confirmation equality are enforced by the DTO (`reset-password.dto.ts:56–64`) in the global pipe before the service runs. Service test asserts `argon2.hash` called with `ARGON2_OPTIONS`; DTO tests cover the 8-char boundary and mismatch/missing confirmation as field errors. |
| **2.** Owner locked **before any token write**; fresh post-lock time; conditional claim; zero rows → uniform 400 + full rollback | ✅ **Satisfied** (unit level; real-Postgres proof deferred to D/I) | `password-reset.service.ts:215–240`: advisory `findUnique` (read-only) → `lockOwner` (`owner-lock.ts:40`, `SELECT id FROM "users" … FOR UPDATE`) → `databaseNow` (`clock_timestamp()`, not transaction-start `now()`) → claim `updateMany` on `id + userId + usedAt: null + expiresAt > checkedAt`, count ≠ 1 throws and the interactive transaction rolls back. Tests: post-lock-expiry case asserts the claim compared against now+5s after a simulated 5s lock wait; used-token case asserts retirement/revocation/password all roll back; unknown-token and missing-owner cases assert zero writes. |
| **3.** Retire all other unused reset tokens, revoke **all** refresh rows by `userId`, update password; never touch another owner | ✅ **Satisfied** (transaction level) | `password-reset.service.ts:245–256`: both `updateMany`s scoped to the claimed token's stored `userId`; `user.update` targets the locked row only; the cooldown marker (`passwordResetRequestedAt`) is deliberately absent from the update. Tests assert used/foreign token rows and foreign/already-revoked refresh rows are untouched, and that the cooldown marker survives. |
| **4.** Missing/malformed/unknown/used/expired → same `INVALID_RESET_MESSAGE`; password errors stay field errors | ✅ **Satisfied** | DTO: every token validator carries `INVALID_RESET_MESSAGE` (`reset-password.dto.ts:51–55`); service re-checks shape with the same constant (`password-reset.service.ts:204`). Field validators never mention the link. Verified at DTO level (message-identity loop over all rejection cases), at real-HTTP level (uniform 400 envelope via `AllExceptionsFilter`; field failures never contain the invalid-link wording), and in the service. |
| **5.** Same/distinct-token races → one success + one uniform 400; no token-before-owner deadlock | ✅ **Satisfied at unit level** (real-Postgres proof is D/I's obligation, per the story) | Lock order is owner → tokens → refresh, the same direction as issuance (A's cooldown claim takes the `users` row lock first), so no cycle between A/B/B; B never holds a token lock while waiting for the owner (`owner-lock.ts` header documents this). The serialized double tests same-token and distinct-token races (1 success + 1 uniform 400, loser's writes rolled back, foreign account untouched). **Database-level proof not executed** — deferred to SP-105I/D, matching the story's own test ownership. |
| **6.** Post-commit `clearRefreshCookie` with existing attributes; no cookie or success response on rollback | ✅ **Satisfied** | `auth.controller.ts:65–76`: `clearRefreshCookie(res)` runs only after the service resolves; the existing helper preserves `HttpOnly`, `Path=/auth`, `SameSite=Lax`, production `Secure` (lines 16–24); `@HttpCode(200)` explicit. Unit tests assert cookie-on-success / no-cookie-on-reject; real-HTTP tests assert the `Set-Cookie` header (`refresh_token=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0`) on success and its absence on every failure path. Route is public via `public-routes.ts:27` under the `APP_GUARD` default-deny. |

---

## Definition of Done Checklist

| DoD | Status | Evidence |
|---|---|---|
| **1.** Functional acceptance criteria pass | ✅ PASS (unit/stateful/HTTP level) | All six ACs satisfied above. Integrated (real-Postgres + browser + SMTP) verification is the story's item-10 obligation performed by SP-105D — same deferral pattern as SP-105A. |
| **2.** Validation handles invalid input | ✅ PASS | Global pipe (`whitelist` + `forbidNonWhitelisted` + transform, `main.ts:16–25`) + DTO validators + service shape re-check. 20 DTO tests + 9 controller tests (incl. real-HTTP wiring with the production pipe) cover token shape, password policy, confirmation, and non-whitelisted `userId`/`familyId`/`tokenHash`/`email`. |
| **3.** Academic data scoped to authenticated student | N/A | No academic data is read or written. Public endpoint — the principal is token possession; every mutation is confined to the token's stored `userId` (the locked owner). No `@Req()`/`@Request()` used; no protected-data query added. A uniform 400 for missing-owner and unknown-token prevents an existence oracle. |
| **4.** API errors produce actionable messages | ✅ PASS | Token failures: uniform 400 with the approved actionable `INVALID_RESET_MESSAGE` ("…Please request a new one.") through the global envelope. Field failures: per-field 400 messages. Unexpected failures: sanitized 500 envelope. 429/503 admission behavior is F's scope (tracked as an open item, not deferred). |
| **5–7.** UI states / keyboard / responsive | N/A | Backend-only. |
| **8.** Business rules have automated tests | ✅ PASS | 45 new tests, all green (run above, including both race orderings, post-lock expiry, rollback on persistence failure, and no-credential-logging). |
| **9.** API changes and migrations documented | ⚠️ **PASS with correction (PR-104)** | The artifact documents the endpoint, request/response, cookie behavior, concurrency protocol, and test coverage; the no-migration claim is correct (schema unchanged). However, its "Open items" section contains an incorrect security-behavior claim about the pre-E residual (PR-104). |
| **10.** Reviewed in integrated development environment | ⏳ DEFERRED to SP-105D | The story explicitly assigns item 10 to D (real DB + real SMTP + viewports + keyboard). Not performed at this commit by design. |

---

## Prioritized Findings

| ID | Severity | Finding | Location |
|---|---|---|---|
| **PR-104** | **Should-fix** | Artifact claims the pre-E in-flight-login family is "dead on its next use" — false against current code; the family stays alive and rotatable until E lands | `docs/artifacts/SP-105B/implementation.md` ("Open items"), vs `apps/api/src/modules/auth/auth.service.ts:137–152, 174–247` |
| **PR-105** | Polish (process) | B was implemented and committed before its declared prerequisite SP-105E | Story header + breakdown README vs commits `80ddbe0`/`9dec2d4`/`04d206d` |
| **PR-106** | Polish | Two minor nits: a no-op placeholder test; `@IsString` message on `password` diverges from `RegisterDto` | `password-reset.service.spec.ts:295`; `reset-password.dto.ts:56` |

### PR-104 — Should-fix: "dead on its next use" misdescribes the residual pre-E session window

**Location:** `docs/artifacts/SP-105B/implementation.md`, "Open items and known dependency state", first bullet:

> "Until E lands, a login/refresh that was *in flight before* a reset can still commit a new refresh family after it; **that family is then dead on its next use**, but the old-password-login race window remains."

**Evidence (actual code):**

- `AuthService.login` (`auth.service.ts:137`) takes **no** owner lock: it verifies the password snapshot, then unconditionally runs `refreshToken.create` (line 148). A login that verified the *old* password before the reset commits can therefore insert a **new** refresh row with `revokedAt: null` **after** the reset's revocation statement — `updateMany` cannot affect a row that did not yet exist at its snapshot (`password-reset.service.ts:249`).
- `AuthService.refresh` (`auth.service.ts:174`) consults only the presented row: unexpired, `revokedAt` null, `replacedByTokenId` null → conditional claim succeeds → successor created → `200` with a new cookie and a fresh access JWT (lines 208–247). Nothing in the current `refresh` path reads the `users` row or any reset state.

So a refresh row created by a pre-reset login is **not** dead on its next use: the next `refresh` with that token succeeds, and the family keeps rotating for up to its 30-day TTL. The SD7-approved bounded window covers only the ~15-minute access JWT, not the refresh family. The property that closes this — "all post-reset renewal attempts using those credentials fail" / "a delayed pre-reset response does not make that refresh credential usable" — belongs to **SP-105E** (its AC2/AC4 and counterexamples; parent "Session semantics and ordering" section), which is not yet implemented.

**Consequence:** at this commit, after a successful reset, a login request that was in flight at the moment of the reset leaves the account with a fully usable, renewably-rotating session — i.e., the feature-level invariant behind original AC4 ("revoke every refresh family, require re-login"; owned by B+E+G+C+D per the breakdown README) is only **partially** in force. The artifact's sentence describes a bounded residual, understating the actual one. This is the consequence of B landing before E (PR-105); the plan already assigns the window to E and gates the feature on D, which is why this is a should-fix (documentation accuracy + sequencing record) rather than a code blocker — the mechanism B itself was tasked with (owner-first protocol, all-rows revocation, cookie expiry) is correctly in place.

**Suggested correction:** rewrite the bullet to state, e.g.: "Until E lands, a login that verified the old password before the reset can commit a new refresh family **after** it; that family remains **alive and rotatable** (refresh succeeds) until its 30-day TTL or E's locked snapshot re-check lands — B's transaction revokes only the rows that existed when it committed. The bounded ~15-minute access-JWT window (SD7) does not cover this family."

**Acceptance condition:** `implementation.md` corrected; E implemented next; SP-105I (real-Postgres race suite, incl. the login-paused-after-verification interleaving) and SP-105D execution remain the release sign-off gates.

### PR-105 — Polish (process): B shipped before its declared prerequisite E

**Location:** `docs/stories/EP01/SP-105/SP-105B-…md` header ("Dependencies: SP-105A … SP-105E"; "Target one focused working session **after A/E**"); breakdown README ("B … Implementation dependency: **A, E**"; E: "a prerequisite to B") — versus the implementation commits, which landed with E still at "Draft — awaiting independent plan re-review".

**Description:** No functional regression in B's own scope — all six of B's ACs are transaction- and endpoint-scoped and are met, and `owner-lock.ts` is in place for E to reuse. The deviation's real effect is the PR-104 window: B's story/plan sequencing exists precisely so E's protocol is in force before B ships.

**Suggested correction:** record the deviation in the breakdown README correction log (planner); confirm E is the next backend implementation so the feature never reaches release (D) with the window open.

**Acceptance condition:** README correction-log entry with a stable ID; E scheduled immediately after this review.

### PR-106 — Polish: two minor nits

1. **No-op placeholder test** — `password-reset.service.spec.ts:295`: `it('returns a 400 field error for an empty or malformed email', async () => { /* comment only */ })` asserts nothing (SP-105A-era; the file was reworked by B). The real coverage lives in the DTO spec and the real-HTTP wiring tests — delete the stub or give it a real assertion.
2. **Message drift** — `reset-password.dto.ts:56` uses `@IsString({ message: 'Password must be at least 8 characters' })`, whereas `RegisterDto` uses the default `@IsString()` ("password must be a string"). The artifact's "same message as RegisterDto" is true for `@MinLength` but not for `@IsString`: a `null` password on reset produces a length message. Align the message (or the artifact wording) so the two flows read consistently.

**Acceptance condition:** stub removed/asserted; messages aligned; no behavior change.

---

## Plan-review / correction-log findings status (from the breakdown README)

| Plan ID | Original severity | Status in this review | Notes |
|---|---|---|---|
| **CF-7** — inconsistent lock order | Blocker (plan) | ✅ **Resolved in implementation** | `resetPassword` executes exactly the corrected order: advisory discovery (no lock/write) → `lockOwner` → `databaseNow` → conditional claim → retirement → revocation → password update. Losers of both same-token and distinct-token races traced through the code hold no token lock while waiting for the owner; lock direction matches A. |
| **CF-8** — login/refresh races asserted away | Blocker (plan) | ⚠️ **Partially in force** | B's half (owner-first redemption protocol, all-rows revocation, `owner-lock.ts` for E to reuse) is implemented. E's half (locked login snapshot re-check, locked refresh re-read/signing) is **not** implemented, and B shipped early (PR-105). Until E lands the plan-corrected invariant is not fully in force — tracked as **PR-104** with the corrected characterization. Closure of CF-8 requires E implementation + SP-105I/D real-Postgres proof of both interleavings. |

---

## Requirement/DoD planning-coverage summary

All six story acceptance criteria are satisfied at the unit/stateful/real-HTTP level with file-and-line evidence above; database-level proof of AC5's races and the integrated DoD-10 review are deferred to SP-105I/D exactly as the story assigns them (not a coverage gap). DoD 1, 2, 4, 8 pass with the tests actually run (199 passed, 13 skipped — the skips being the pre-existing live-DB scoping suite, unrelated to B); 3, 5–7 are N/A by the story's own mapping (no academic data; credential writes confined to the token's stored owner); 9 passes subject to the PR-104 wording correction; 10 is deferred to D by design. No committed secrets were found in any touched file; raw tokens and proposed passwords are never persisted, returned, or logged (digests only; the only stored values are SHA-256 hex, and the service logs no credential values on failure — the error propagates to the global filter, which logs stacks only for 5xx). No AI/LMS/grade/flashcard/native scope is introduced.

---

## Verdict

**SP-105B: Changes Required** — all six acceptance criteria are met and all 45 new tests pass (full API suite green); the single should-fix is **PR-104**, a documentation-accuracy correction to `implementation.md` (the "dead on its next use" claim is false for the current code — the family stays alive and rotatable until E lands), accompanied by **PR-105** (record the before-E sequencing in the README) and **PR-106** (two polish nits). No application-code change is required in B itself; feature release sign-off remains gated on SP-105E, SP-105I, and SP-105D as planned.

---

## Handoff

**Parent (this session):** save this report to `docs/artifacts/SP-105B/review.md` (done). Also commit the still-untracked `docs/artifacts/SP-105A/review.md` (its PR-101/PR-102 corrections are already in the codebase per commits `32c68ff`, `7d3d059`, `c53b0ce` — SP-105A is effectively closed pending that commit).

**Implementation (B owner):** correct the PR-104 sentence in `docs/artifacts/SP-105B/implementation.md`; apply PR-106. No endpoint/service/controller changes.

**Planner:** record PR-104, PR-105, PR-106 in the breakdown README correction log with stable IDs; mark CF-8 "partially in force — B done, E pending"; schedule **SP-105E as the next backend implementation**.

**Next:** SP-105E (closes the login/refresh window) → SP-105F/G in parallel where convenient → SP-105H/I/J suites → SP-105D (DoD 10 + release sign-off).

**User decisions:** none newly required — SD7 (JWT window) and SD8 (per-IP limits in F) were already approved and are unchanged by this review.
