# STUDY-9 (SP-102) Review Report

**Story:** [SP-102: Login, Logout, and Session Management](../../stories/EP01/SP-102-login-logout-sessions.md)

**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)

**Review date:** 2026-10-13 (re-review pass 2)

**State reviewed:** working tree (uncommitted changes on top of commit `9189f85`)

**Reviewer note:** the same agent implemented this story and the fix pass in
this workspace; every claim below was re-verified against the actual code
and fresh test runs in this pass rather than taken from
`implementation.md`. The implementer's live re-verification after the fix
pass (full HTTP sequence plus a concurrent-refresh race returning
`[200, 401]`) used an ephemeral database that has since been removed, so
those HTTP-level results are recorded as implementer-reported evidence,
not re-run in this pass. This report is the only file written by this
review, and it overwrites the pass-1 report.

---

## Disposition of pass-1 findings

| Finding | Disposition | Evidence in this pass |
|---|---|---|
| SF1 — Rotation not in a single transaction; concurrent refresh could redeem one token twice | Resolved | `apps/api/src/modules/auth/auth.service.ts:188` runs rotation in `prisma.$transaction`; `:219-229` atomically claims the presented row with a conditional `updateMany` (`revokedAt: null, replacedByTokenId: null` pointing at a pre-generated successor id); a lost claim revokes the family at `:231-237`. The stateful race test at `apps/api/src/modules/auth/auth.service.spec.ts:288` lets exactly one of two concurrent refreshes succeed, and it passes fresh in this pass. |
| SF2 — Logout and interceptor-redirect tests asserted less than their names claimed | Resolved | The logout spec at `apps/api/src/modules/auth/auth.service.spec.ts:391` now runs against stateful two-family rows and asserts the second family stays active. The new test at `apps/web/src/context/AuthContext.test.tsx:79` drives the real interceptor into the registered handler and asserts navigation to `/login` with `sessionExpired: true` and the saved `/dashboard` location. |
| SF3 — Boot restore bypassed the single-flight refresh | Resolved | `apps/web/src/services/auth.ts:52` delegates `refreshToken()` to `refreshAccessToken()` (`apps/web/src/services/api.ts:42-55`), so boot restore and interceptor refreshes share one in-flight rotation; `apps/web/src/services/api.test.ts:94` asserts two concurrent boot refreshes issue one HTTP refresh. |
| DoD 6 — No keyboard test for the login flow | Resolved | `apps/web/src/pages/Login.test.tsx:70` completes the whole form keyboard-only (focus order email → password, Enter submits, lands on the dashboard) and passes fresh. |
| DoD 7 — No automated responsive backing | Resolved (shallow; see P2) | `apps/web/src/pages/Login.test.tsx:97` asserts the mobile-first single-column classes (`px-4 sm:px-6 lg:px-8`, `max-w-md w-full`) and passes fresh. |
| P1 — Login timing distinguished unknown email from wrong password | Resolved | `apps/api/src/modules/auth/auth.service.ts:86-95` verifies against a lazily generated dummy Argon2 hash on the unknown-email path (`getDummyHash` at `:51-61`). |
| P2 — Refresh loaded the full user row including the password hash | Resolved | The refresh lookup at `apps/api/src/modules/auth/auth.service.ts:190-201` selects only `id`, `name`, and `email` for the related user. |
| P3 — `/forgot-password` link has no route yet | Unchanged, out of scope | Still links forward to SP-105's flow; recorded again under Optional polish so it is not mistaken for part of this delivery. |
| Cookie-parser import not callable (raised between passes) | Resolved | `apps/api/src/main.ts:5` uses `import cookieParser = require('cookie-parser')`; verified in this pass under both the API tsconfig and an `esModuleInterop` typecheck, and the built output at `apps/api/dist/main.js:7,10` is a plain callable `require`. |

---

## Verification runs (executed during this review pass)

| Check | Command | Result |
|---|---|---|
| Backend tests | `pnpm --filter @studypilot/api test` | 7 suites passed, 39 tests passed |
| Frontend tests | `pnpm --filter @studypilot/web test` | 6 files passed, 30 tests passed |
| Backend typecheck | `pnpm --filter @studypilot/api typecheck` | OK |
| Frontend typecheck | `pnpm --filter @studypilot/web typecheck` | OK |
| Cookie-parser interop check | `tsc --noEmit --esModuleInterop … apps/api/src/main.ts` | OK (exit 0) |
| Backend build | `pnpm --filter @studypilot/api build` | OK; `dist/main.js` uses callable `cookieParser()` |
| Lint | `pnpm lint` | OK (turbo cache hit for both apps from the fix-pass run; no source changed since) |

---

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | `POST /auth/login` returns a short-lived access token (15 minutes) | Satisfied | Default lifetime `15m` at `apps/api/src/modules/auth/auth.module.ts:21`; login at `apps/api/src/modules/auth/auth.service.ts:118-171` (line numbers from pass 1; unchanged by the fix pass except as noted). The 900-second lifetime remains implementer-observed live evidence from pass 1. |
| 2 | Refresh token is an httpOnly, Secure, SameSite cookie scoped to the refresh path and never exposed to JavaScript | Partially satisfied (approved deviation) | `apps/api/src/modules/auth/auth.controller.ts:18-32`: `HttpOnly; Path=/auth; SameSite=Lax`, `Secure` only in production, per the story's recorded Decision Q2. Access token remains in memory only (`apps/web/src/services/tokenStore.ts`). |
| 3 | Wrong credentials return 401 with a generic `Invalid email or password` message | Satisfied | `apps/api/src/modules/auth/auth.service.ts` generic throw (pass-1 reference), timing parity now added at `:86-95`; parity cases at `apps/api/src/modules/auth/auth.service.spec.ts:201-218`. |
| 4 | `POST /auth/refresh` rotates the refresh token and invalidates the old one | Satisfied | Transactional rotation with atomic claim at `apps/api/src/modules/auth/auth.service.ts:188-253`; sequential rotation case at `apps/api/src/modules/auth/auth.service.spec.ts:260` and the concurrent case at `:288` both pass fresh. |
| 5 | Reuse of a rotated token invalidates the whole family and forces re-login | Satisfied | Reuse detection and family revocation at `apps/api/src/modules/auth/auth.service.ts:207-213,231-237`; tested at `apps/api/src/modules/auth/auth.service.spec.ts:355`; forced re-login path tested end to end at `apps/web/src/context/AuthContext.test.tsx:79`. |
| 6 | `POST /auth/logout` revokes the token family and clears the cookie | Satisfied | `apps/api/src/modules/auth/auth.controller.ts:61-72` and family-scoped revocation in `auth.service.ts`; the strengthened two-family test at `apps/api/src/modules/auth/auth.service.spec.ts:391` proves other devices stay signed in. |
| 7 | Missing or invalid access tokens on protected endpoints return 401 | Satisfied | Guarded user routes at `apps/api/src/modules/users/users.controller.ts:9-16` (unchanged); the existing JWT strategy spec passed fresh in this pass. |
| 8 | Frontend stays logged in across reloads, transparently refreshes on 401, and redirects to login when refresh fails | Satisfied | Silent boot restore at `apps/web/src/context/AuthContext.tsx:56-72` now goes through the single-flight primitive via `apps/web/src/services/auth.ts:52`; interceptor at `apps/web/src/services/api.ts:71-120`; restore, single-flight, retry, and navigation cases at `apps/web/src/context/AuthContext.test.tsx:52,79` and `apps/web/src/services/api.test.ts:34-118` all pass fresh. |
| 9 | Login and session-expired states have actionable messages | Satisfied | `apps/web/src/pages/Login.tsx` (unchanged in the fix pass); invalid-credentials and session-expired cases at `apps/web/src/pages/Login.test.tsx:54,113` pass fresh. |

---

## Definition of Done checklist

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | PASS | All nine criteria verified above; 39 backend and 30 frontend tests pass fresh in this pass. |
| 2 | Frontend and backend validation handle invalid input | PASS | Unchanged from pass 1: `LoginDto` in `apps/api/src/modules/auth/dto/login.dto.ts`, global pipe in `apps/api/src/main.ts`, zod mirror in `apps/web/src/pages/Login.tsx`. |
| 3 | Academic data is scoped to the authenticated student | PASS | No academic endpoints added. Refresh/logout act only on the cookie-named family (`apps/api/src/modules/auth/auth.service.ts:268-285`); protected user data stays self-scoped via `req.user.id` in `apps/api/src/modules/users/users.controller.ts`. No client-supplied `userId`/`familyId` is accepted anywhere in the auth controller. |
| 4 | API errors produce actionable messages | PASS | Generic actionable auth messages in `auth.service.ts` and the session-expired guidance surfaced in `apps/web/src/pages/Login.tsx`; unchanged from pass 1. |
| 5 | Loading, empty, and error states are handled | PASS | Boot loading gate in `apps/web/src/context/AuthContext.tsx`, login submission states and error toasts in `apps/web/src/pages/Login.tsx`; empty states not applicable (no list or data view added). |
| 6 | Core interactions support keyboard accessibility | PASS | New keyboard-only login completion test at `apps/web/src/pages/Login.test.tsx:70` passes fresh, covering focus order and Enter submission on the same labelled `Input`/`Button` components SP-101 verified. |
| 7 | Responsive layouts work on desktop and mobile | PASS (shallow backing; see P2) | New test at `apps/web/src/pages/Login.test.tsx:97` asserts the responsive single-column classes. It verifies the class contract, not rendered widths at real viewports; the layout itself is unchanged pre-existing code, so residual risk is low. |
| 8 | Business rules have automated tests | PASS | Rotation, atomic concurrent claim, reuse revocation, expiry, unknown token, two-family logout, cookie behavior, single-flight (interceptor and boot), navigation on expiry, keyboard, and responsive cases are all covered and pass fresh. |
| 9 | API changes and migrations are documented | PASS | `docs/artifacts/STUDY-9/implementation.md` documents the endpoints, cookie, schema, migration, live results, and now the review fix pass; schema validated in pass 1 and the migration file is unchanged since. |
| 10 | Reviewed in an integrated development environment | PASS (this pass) | This re-review re-read the story, epic, DoD, implementation record including the fix pass, and the changed source; re-ran both suites, both typechecks, the interop check, lint, and the backend build. The live HTTP race re-verification remains implementer-reported (see Reviewer note). |

---

## Findings

### Blockers

- None.

### Should-fix

- None. SF1, SF2, and SF3 from pass 1 are resolved as recorded above, and
  no new should-fix issue was found in the fix-pass diff. The transactional
  claim also correctly commits the family revocation on the reuse path:
  the transaction callback returns an `invalid` outcome instead of
  throwing, so the revocation at
  `apps/api/src/modules/auth/auth.service.ts:208-212` is not rolled back.

### Optional polish

- **P1 — `/forgot-password` still routes nowhere.** The login page links
  to SP-105's future flow (unchanged from pass 1). Out of scope here;
  recorded so the dead link is not mistaken for part of this delivery.

- **P2 — The responsive test asserts classes, not viewports.** The new
  backing for DoD 7 checks the Tailwind class contract in jsdom, which
  cannot detect a layout that overflows at a real 360px viewport. Given
  the layout is unchanged pre-existing code already exercised by SP-101,
  this is acceptable for sign-off; a viewport-level check (for example in
  a future Playwright pass) would be stronger.

- **P3 — The concurrent-refresh unit test races against an in-memory
  mock, not a real database.** It proves the conditional-claim logic, and
  the implementer separately reports the same `[200, 401]` outcome over
  HTTP against PostgreSQL, but no committed integration test exercises
  Prisma transaction isolation. Worth adding if an HTTP-level test
  harness is introduced (pass-1 SF2 in the SP-101 review tracks the same
  gap repo-wide).

---

## Verdict

**Verdict: SP-102 meets the acceptance criteria and the Definition of Done — all nine acceptance criteria are satisfied (criterion 2 through the story-approved Decision Q2 deviation), all ten DoD conditions PASS, every pass-1 should-fix (SF1–SF3) and both DoD failures are resolved with fresh test evidence in this pass, and only out-of-scope or residual-risk polish items (P1–P3) remain.**
