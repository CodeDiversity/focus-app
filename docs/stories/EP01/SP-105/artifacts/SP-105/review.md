# SP-105: Password Reset — Combined Parent Implementation Review

**Review date:** 2026-10-16 (America/New_York)
**Pass:** 1 (combined parent implementation review — the single review required after all ten children and integration obligations)
**State reviewed:** `main` @ `db0218f1c37139c3fd0b7afefc22477432259225` (last commit: SP-105D evidence + parent index; queue advanced to combined review). Working-tree cleanliness could not be independently confirmed (read-only session, no shell — see CANNOT VERIFY).
**Epic / milestone:** EP01 / M1 — STUDY-7
**Review mode:** Implementation review (all children implemented; not a plan review)
**Verdict:** **Changes Required** — no blockers; 2 should-fix (PR-107, PR-108), 3 polish (PR-109–PR-111). No security invariant is broken; every code-level mechanism was verified in source. Sign-off is conditional on closing the two should-fix items.

---

## Reviewed scope and limitations

**Read and verified in this pass (read-only):**

- Parent: `docs/stories/EP01/SP-105/README.md` (queue, traceability, correction log, readiness), `SP-105-password-reset.md` (original AC1–7, shared contract), `plan-review.md` (pass 2), `artifacts/SP-105/implementation.md` (parent index)
- All ten child implementation records: `artifacts/SP-105A/B/C/D/E/F/G/H/I/J/implementation.md` (+ D checkpoint 1–3 detail)
- Historical child reviews: `artifacts/SP-105A/review.md`, `artifacts/SP-105B/review.md` (PR-101–106 closure check)
- Backend: `password-reset.service.ts` (issuance + redemption, full), `owner-lock.ts`, `auth.service.ts` (login/refresh/logout), `auth.controller.ts` (both endpoints, guards, cookie expiry), `recovery-rate-limit.store.ts`, `recovery-rate-limit.guard.ts`, `dto/forgot-password.dto.ts`, `dto/reset-password.dto.ts`, `dto/register.dto.ts`, `public-routes.ts`, `auth.module.ts`, `src/common/cors.ts`, `src/main.ts`, `src/test/test-http.ts`, `prisma/schema.prisma`, all 6 migrations, `.github/workflows/ci.yml`, `apps/api/package.json`
- Frontend: `services/recovery.ts`, `services/api.ts` (generation wiring), `context/AuthContext.tsx`, `services/auth.ts`, `utils/linkToken.ts`, `pages/ForgotPassword.tsx`, `pages/ResetPassword.tsx`, `pages/Login.tsx` (one-time notice), `App.tsx` (top-level routes)
- Upstream gate: `docs/artifacts/STUDY-12/review.md` (SP-103 latest state)
- Git state via `.git` file inspection (HEAD, refs, logs)

**Limitations:**

- **No shell in this session** — no tests were re-executed, `git status` could not be run, and no disposable database was spun up. All test-execution claims below are the recorded evidence in D's checkpoint 1 and the child records, reported as CANNOT VERIFY for independent re-execution.
- Real-browser behavior (DoD 5/6/7) rests on the D6 human approval, whose granularity is assessed under PR-108.

---

## Acceptance coverage (original SP-105 AC1–7)

| AC | Verdict | Evidence |
|---|---|---|
| AC1 — generic forgot response, registered or unknown | **Pass** (code verified; SMTP/timing evidence recorded) | `password-reset.service.ts:103-172`: uniform `GENERIC_SUCCESS_MESSAGE` for eligible/cooled-down/unknown; all transaction failures absorbed with name-only structured log (`:156-168`); SMTP via `setImmediate` after commit (`:63-71`). D re-proved delivery live through Mailpit (3 captured test mails) and showed off-path behavior with SMTP refused. AC6 bounded timing sample recorded with disclosure-first assessment, no constant-time claim (SD9 honored). |
| AC2 — single-use, hashed at rest, 1-hour TTL | **Pass** (code verified; real-DB races recorded) | `randomBytes(32).toString('base64url')` (43-char, SD3/SD4), SHA-256 hex at rest (`:54`), 1-h TTL (`:13`), conditional claim `usedAt: null AND expiresAt > checkedAt` with fresh post-lock DB clock (`:229-241`); loser rolls back. Suite I (15 cases) incl. same/distinct-token races and expiry-across-lock-wait — recorded green on real PostgreSQL 15 (D checkpoint 1; not re-run here). One clock deviation noted under PR-107. |
| AC3 — valid-token password update, registration policy | **Pass** | argon2id with shared `ARGON2_OPTIONS` hashed **before** the transaction (`:209-211`); DTO enforces min-8 + confirmation (`reset-password.dto.ts`); uniform 400 for non-43-char tokens (`:204-206`). Suite I recorded new-password-accepts / old-password-rejects. |
| AC4 — revoke every refresh family, require re-login | **Pass** (code verified; both orderings recorded) | Redemption revokes **all** unrevoked owner refresh rows in the same transaction (`:249-252`); controller expires the HttpOnly cookie only after commit (`auth.controller.ts:81-88`). E applies owner-first locking to login (locked password-snapshot recheck), refresh (locked re-read, sign under lock), logout — verified in `auth.service.ts`. G drains the in-flight refresh under a 10 s bound and advances the shared session generation before clearing local state (`recovery.ts`, wired in `api.ts`/`AuthContext.tsx`). SD7's bounded access-JWT window is consistently disclosed. |
| AC5 — actionable used/expired rejection, new request | **Pass** | Uniform `INVALID_RESET_MESSAGE` 400 for missing/used/expired/unknown (`:219,224,241`); `ResetPassword.tsx` distinguishes it byte-exactly from success and offers the re-request action; other failures keep the token (C11). |
| AC6 — request/reset screens, states, keyboard | **Pass automated / CANNOT VERIFY real browser** | Both screens are top-level routes outside `PublicRoute`/`ProtectedRoute` (`App.tsx:19-21`); loading/success/error/invalid-link/retry-countdown states, `aria-live`, keyboard operability, monotonic-clock retry with explicit retry — verified in source; 40 new web cases recorded green (11 files/142 in D). Real-viewport/keyboard proof rests on the D6 blanket approval → PR-108. |
| AC7 — rate limiting per account AND per IP | **Pass** (code verified; races recorded) | Per-account: persisted 60 s conditional cooldown claim (`:111-125`, row-lock serialized). Per-IP: `RecoveryRateLimitGuard` on **both** endpoints (`auth.controller.ts:72,80`), PostgreSQL rolling-window store — upsert + `FOR UPDATE` + fresh `clock_timestamp()` + conditional append, separate 10/60 s and 30/60 s buckets (SD8 limits), integer `Retry-After` set before the 429, `Retry-After` in `exposedHeaders` (`cors.ts:20`), storage failure fails closed with sanitized 503, `req.ip` only — `X-Forwarded-For` never read. Suite J (8 cases) recorded green; suite I/`recovery-rate-limit.http.spec.ts` cover wire parity. |

**Ownership scoping (repo convention):** no new academic-data queries were introduced; every credential/refresh/reset-token write is scoped to the discovered owner; limiter buckets carry no `User` relation. No existence oracle: unknown email, missing owner row, and unknown token all collapse to the same generic 200 / uniform 400.

---

## Shared Definition of Done audit

| DoD | Status | Evidence / limitation |
|---|---|---|
| 1 Functional criteria | **Pass** | All seven AC mechanisms verified in source (above). Real-DB and SMTP evidence recorded in D; not re-executed in this pass. |
| 2 Invalid input validation | **Pass** | Forgot DTO (trim/lowercase/email/254), reset DTO (43-char shape, min-8, cross-field confirm via inline `matchesField`), zod mirrors in both pages, guard rejects non-IP input, store fails closed. |
| 3 Academic data scope | **Pass (N/A with justification)** | No academic data accessed; credential isolation verified; limiter store is account-independent. |
| 4 Actionable errors | **Pass** | Uniform token 400, field errors, 429 + integer `Retry-After` (survives the exception filter — verified in `all-exceptions.filter.ts` path and guard spec), sanitized 503, client `RecoveryError` sanitization with retry metadata and 60 s fallback. |
| 5 States | **Pass (automated)** / real browser CANNOT VERIFY | C component states + tests recorded; real-browser proof = D6 blanket approval (PR-108). |
| 6 Keyboard | **Pass (automated)** / real browser CANNOT VERIFY | Keyboard-only interaction tests + `aria-live` recorded; real-browser proof = D6 blanket approval (PR-108). |
| 7 Responsive | **CANNOT VERIFY** | Responsive classes present in source; no per-step viewport evidence was returned — only the blanket approval. |
| 8 Automated business-rule tests | **Pass (existence + recorded runs)** | All claimed suites exist with recorded counts: A 47, B 45, E +3, F 40 (35 unit + 5 real-DB http), G 51, C 40, H 3, I 15, J 8; web 11 files/142. Discovery wiring verified: `testPathIgnorePatterns` keeps the three DB suites out of `test`/watch/coverage; `test:integration` regex selects exactly H/I/J; CI runs `migrate deploy` on a disposable `studypilot_test` DB then `test:integration --runInBand`. Execution itself: CANNOT VERIFY (not re-run here). |
| 9 API/migration documentation | **Pass** | All ten children have implementation records; both migrations are additive and documented (20261015000000, 20261015060000); H/I/J invocation + disposable-DB contracts documented; G client contract documented and consumed by C. |
| 10 Integrated development review | **Pass with caveat** | D performed it: dev-DB migration, H/I/J on a disposable migrated `study_d_test` PostgreSQL 15 (3 suites/26, zero skips), API unit 20/237 (18 declared skips — baseline unchanged), web 142, typechecks clean, manual browser + Mailpit run, SMTP live re-verification, off-path observation, AC6 timing sample. The manual portion returned only a blanket approval → PR-108. |

---

## Security assessment

Verified invariants (all hold in source):

1. **Single-use tokens** — conditional claim on `usedAt: null` + `expiresAt > checkedAt` under the owner lock; one winner, loser rolls back; distinct-token losers fail the account-wide retirement. (I suite recorded.)
2. **Owner-first locking** — `owner-lock.ts` protocol applied consistently by A (issuance claim), B (redemption), E (login/refresh/logout); limiter bucket lock always taken and released before any user lock, so limiter and recovery transactions cannot deadlock.
3. **Full session revocation** — all unrevoked owner refresh rows revoked in the redemption transaction; cookie expired post-commit; G's generation barrier prevents a delayed pre-reset refresh from resurrecting local state.
4. **No enumeration / no existence oracle** — identical 200 body for known/unknown/cooled-down; uniform 400 for all token failures; limiter denials account-independent.
5. **Secrets hygiene** — raw token never persisted (SHA-256 hex only), never logged (name-only failure logs), never returned; email link uses URL fragment; client strips it from the address bar.
6. **Fail-closed limiter** — storage failure → sanitized 503, nothing mutated; `X-Forwarded-For` never consulted.

Residual, disclosed (not claimed away): bounded ~15-min access-JWT window (SD7, user-approved); residual database-path timing differences (AC6 sample recorded, no constant-time claim); PR-107 clock-skew exposure.

---

## Prioritized findings

| ID | Severity | Owner | Finding |
|---|---|---|---|
| PR-107 | **Should-fix** | SP-105A | Issuance uses the application clock where the refined ticket and shared contract SD5 require a fresh post-lock database wall clock |
| PR-108 | **Should-fix** | SP-105D | DoD 10's real-browser obligations rest on a single blanket approval with no per-step evidence |
| PR-109 | Polish | SP-105B | Prior finding PR-106 (pass-1 B review) remains unaddressed in code |
| PR-110 | Polish | Process | Parent README correction log missing entries for prior implementation findings PR-101–106 |
| PR-111 | Polish | Process | Stale parent status line; SP-103 gate reinterpretation lacks recorded ratification |

### PR-107 — Issuance timestamps use the app clock, not the fresh post-lock wall clock (Should-fix)

**Evidence:** `SP-105A` ticket (line 63) requires: *"Acquire the `users` row `FOR UPDATE` before reset-token writes … Obtain fresh wall-clock time after any lock wait. Atomically claim the account's cooldown with a conditional update … `SET passwordResetRequestedAt = checkedAt WHERE … <= checkedAt - interval '60 s'`."* Shared contract SD5 (README:136) repeats "fresh post-wait expiry."

The implementation instead captures `requestedAt = new Date()` in `prepareToken()` **before the transaction** (`password-reset.service.ts:51`) and uses that app-clock value for: the cooldown claim's `WHERE` boundary and `SET` (`:111-124`), the token-retirement timestamp (`:137`), and the 1-hour `expiresAt` (`:145`). The redemption path does it correctly — `databaseNow(tx)` after the lock (`:229`) — and then compares the app-clock-stamped `expiresAt` against the DB clock (`:237`).

**Consequence:** the TTL is stamped in one clock and enforced in another; app/DB skew (or clock divergence across replicas) shifts the effective 60 s cooldown and 1-hour TTL by the skew amount. Concurrency safety is **not** affected — the row-lock serialization still makes exactly one issuance win — so this is robustness/correctness, not a broken security invariant.

**Fix:** after the lock, take `checkedAt = await databaseNow(tx)` (already exported by `owner-lock.ts`) and use it for the claim marker, the cooldown boundary, the retirement timestamp, and `expiresAt = checkedAt + TTL`. Update the A record accordingly.

### PR-108 — DoD 10 manual evidence is a blanket approval (Should-fix)

**Evidence:** D's checkpoint 2 (D6) handed the human a numbered procedure (Blocks A–E: end-to-end reset with Mailpit link capture, DoD 10 condition matrix, real viewports, rate-limit/retry, delayed-refresh interception). The returned result, verbatim: **"approved everything looks good."** D honestly records the limitations: no per-step pass/fail, no browser/version, no Block-E blocked-mechanism report, and the Mailpit inbox was cleared before re-inspection.

D then re-proved SMTP delivery live (3 captured test mails) and off-path behavior — both recorded. But the DoD 5/6/7 **real-browser** conditions — the reset response's cookie expiry actually clearing the HttpOnly cookie in the browser, `Retry-After` readability from the separate web origin, desktop/mobile viewports, keyboard traversal — rest on that single coarse approval.

**Fix (either):** (a) a targeted re-run of a small browser matrix with per-step results (reset → cookie cleared; 429 → countdown readable from the web origin; two viewports; keyboard-only pass), or (b) explicit user ratification that the blanket approval is sufficient for DoD 10. The parent should record whichever is chosen.

### PR-109 — Prior finding PR-106 unaddressed (Polish)

From B's pass-1 implementation review, still present in `db0218f`:

1. No-op placeholder test at `password-reset.service.spec.ts:295-298` — a comment-only body with no assertions; Jest counts it as a pass, inflating the suite without coverage.
2. Message drift: `reset-password.dto.ts:57` uses `@IsString({ message: 'Password must be at least 8 characters' })` while `register.dto.ts:15` uses default `@IsString()` — a non-string password produces different messages on the two endpoints.

**Fix:** delete or assert the placeholder (the DTO spec already covers malformed email); align the `@IsString` message or drop the override.

### PR-110 — Correction log missing prior implementation findings (Polish, process)

The parent README correction log records CF-1–CF-12 and PR-001/002 (plan findings), but the historical **implementation** review findings PR-101–106 (A/B pass-1) have no stable-ID entries there — only the queue row mentions "PR-104 wording corrected in `6826ae0`." Per delivery-state, the planner records each finding and correction by stable ID in the breakdown README.

**Fix:** add a "Review corrections — 2026-10-15 (implementation pass 1)" section recording PR-101–106 with their dispositions (101–105 verified closed in `db0218f` this pass; 106 open as PR-109).

### PR-111 — Stale parent status line and unratified gate reinterpretation (Polish, process)

1. `SP-105-password-reset.md` still reads *"Status: Plan Ready … Implementation Blocked pending SP-103 integrated evidence"* — all ten children are implemented and the queue awaits this review; the coordination record is stale.
2. The plan review (pass 2) set **Execution status: Implementation Blocked** on SP-103's unverified integrated DoD 1/7/10. The queue later reinterpreted this as "blocks feature sign-off, not implementation" (README:69-70, 101-102) with no recorded user ratification. The substance is defensible — SP-105D re-established integrated evidence for the reset flow itself, and SP-102 (the code dependency) is verified — but a reviewer-approved execution gate was downgraded by the planner without a recorded decision.

**Fix:** update the parent status line to "Implemented — awaiting combined parent review"; either obtain user ratification of the gate reinterpretation or document it as a planner decision with rationale in the correction log.

---

## CANNOT VERIFY (this pass)

| Item | Recorded evidence | Why unverifiable here |
|---|---|---|
| API unit suite (20 suites / 237 passed, 18 declared skips) | D checkpoint 1 | No shell in this read-only session; not re-executed |
| Web suite (11 files / 142 passed) | D checkpoint 1; C record | Same |
| Integration suites H/I/J (3 suites / 26 passed, zero skips, disposable `study_d_test` PostgreSQL 15) | D checkpoint 1 | Same; no disposable DB spun up |
| F real-DB HTTP spec (5 cases) | F record (2026-10-15, disposable Postgres); self-skips without `DATABASE_URL`, so it was among D's 18 skips | Same; F's code is unchanged since its green run (no commits touch `recovery-rate-limit.*` after F) |
| Typechecks (api + web) | D checkpoint 1 | Same |
| Working-tree cleanliness at `db0218f` | — | `git status` not runnable; commit history verified via `.git` file inspection |
| Real-browser DoD 5/6/7 behavior | D6 blanket approval | See PR-108 |

Recorded evidence is consistent across all artifacts (suite counts reconcile: 15+8+3 = 26; queue rows 18/18 and 26/26 match the H/I and H/I/J composition at their respective dates) and no artifact was found to overclaim beyond the limitations it itself records.

## Upstream release gate (not an SP-105 defect)

SP-103 (STUDY-12) latest review (`docs/artifacts/STUDY-12/review.md`) leaves integrated DoD **1, 7, and 10 CANNOT VERIFY** — independently confirmed in this pass. This gates the **EP01 feature release**, not SP-105's implementation sign-off, and is correctly recorded in D's artifact and the parent README. See PR-111 for the gate-reinterpretation process gap.

---

## Handoff

**Planner:** Record PR-107–PR-111 with stable IDs in the breakdown README correction log (including the missing PR-101–106 entries per PR-110); update the parent status line (PR-111); resolve the SP-103 gate ratification (PR-111).

**Implementer:** PR-107 is the only code change — switch issuance to `databaseNow(tx)` for the claim marker, cooldown boundary, retirement timestamp, and token expiry, with a unit test asserting the DB-clock values; then re-run the API unit + integration suites on a disposable `_test` database and record results.

**User:** Choose PR-108's path — targeted browser-matrix re-run with per-step results, or explicit ratification of the blanket approval for DoD 10.

**Reviewer (next pass):** Re-verify PR-107's fix in source plus the recorded re-execution, PR-108's chosen closure, and PR-109–111 documentation corrections; independently confirm closure — planner corrections are not reviewer approval.

**Verdict: Changes Required** (PR-107, PR-108 must close; PR-109–111 polish). No blockers; no security invariant broken; all AC mechanisms and the shared contract verified in source at `db0218f`.
