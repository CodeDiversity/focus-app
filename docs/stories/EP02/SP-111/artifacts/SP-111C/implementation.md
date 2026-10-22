# SP-111C implementation record — Course Management Integration Sign-off

**Story:** [SP-111C](../../SP-111C-course-integration-signoff.md) (parent [SP-111](../../README.md))
**Parent / review unit:** SP-111 — one combined parent review after A+B+C (`../SP-111/review.md`); this child is the named integration/index owner.
**Layer:** Integration (verification child — SP-110C precedent)
**Baseline:** `c0ccb7d` (SP-111B: course management UI — the commit before the first included change)
**Completed:** 2026-10-22, implementer, single sequential writer.
**Updated:** 2026-10-22 — DoD 10 human browser walk ratified (PASSED with one deviation, F111C-3, since fixed); F111C-3 swatch design confirmed by the user.
**Status:** Implementation complete — awaiting the combined SP-111 parent review. DoD 10 human browser-walk ratification recorded **PASSED with one deviation** (human gate — the user, 2026-10-22; the deviation is F111C-3, fixed and confirmed, exactly as SP-110C ran it).

## Summary

Verification-only child: **no production, schema, migration, harness,
`package.json` or CI change was made.** One new e2e spec proves the course
management feature as a student journey over real HTTP against a real
PostgreSQL database (AC1 lifecycle + semester filter, the SP-110-boundary
orphan case, the AC2 cross-student matrix, 401 on every route); the automated
suites were re-executed green on a disposable migrated Postgres and the bare
no-DB path; the manual browser sign-off supporting DoD 10 was prepared (dev
stack + full HTTP pre-flight through the web proxy — all green) and the
browser-level walk — a **human gate** — was performed by the user on
2026-10-22 and returned approval with one deviation (F111C-3 — the course
color field; fixed in `CourseForm.tsx` and the swatch design confirmed by the
user; ratification recorded below, AC2); the parent implementation index was
written at `../SP-111/implementation.md` (AC3).

## Deliverable

`apps/api/src/modules/courses/courses-e2e.spec.ts` (**new**) — real-app
harness (`test/test-http.ts`, `main.ts` parity; the harness already carries
the courses + semesters modules — no harness change), students seeded through
the real `POST /auth/register` + `POST /auth/login`, self-skips when
`DATABASE_URL` is unset, cleanup cascades from the seeded users (verified:
the database was back to 0 users / 0 semesters / 0 courses after the run).
The cases are ordered as the student journey and each asserts on real rows
via the harness `prisma` handle.

| Case | Claim proven |
|---|---|
| AC1 lifecycle (8 tests) | `POST /semesters` ×2 (7-key shape, `isActive: false`) → `POST /courses` ×3 (CS101→Fall with instructor/credits/color/description; CS201→Spring minimal — default `#6366f1`; MATH101 unaffiliated — the D110-2 shape; exact 13-key `CourseWithSemester`, D111-4) → `GET /courses` (3 rows, name-asc order, semester projected, `null` for the unaffiliated) → `GET /courses/:id` (13 keys) → `PATCH` name + instructor (merged values on the wire **and** in the row) → `PATCH` semester re-attach Fall→Spring (projection follows) → archive `isActive: false` (row survives; absent from the default list, present with `?includeArchived=true`, the detail route still returns it — AC-E02-05) → restore `isActive: true` (active again, back in the default list). *(AC-E02-03/05, DoD 1/8)* |
| Semester filter (2 tests) | `?semesterId=<own>` returns **only** that semester's courses (Fall → `[CS101]`, Spring → `[CS201]` — the unaffiliated row excluded); a foreign (another student's) or missing `semesterId` → uniform 404 `Resource not found` with the same status/message/error (no existence oracle). *(AC-E02-02)* |
| Orphaned by semester deletion (1 test) | `DELETE /semesters/:id` on Spring, which holds **two** courses → 204; the semester row is gone; both course rows **survive with `semesterId: null`** (D110-2); the list still returns all three courses, each with `semester: null` (AC-E02-05 boundary: the semester going away never destroys course data). |
| AC2 cross-student matrix (2 tests) | B's `GET` / `PATCH` on A's course id → **uniform 404 `Resource not found`** ×2; A's row **byte-identical** under an unscoped before/after read (no existence oracle, no partial write); B's list (default and `includeArchived`) is empty and A's ids appear nowhere in the serialized body (wire-level scoping). *(DoD 3/8)* |
| Unauthenticated (1 test) | Every route — `POST /courses`, `GET /courses`, `GET /courses/:id`, `PATCH /courses/:id` — without a token → 401. *(DoD 3/8)* |

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC1 e2e spec (lifecycle, filter, cross-student, orphan) | ✅ | the spec above — 14/14 green on the disposable migrated Postgres (first run after the F111C-1 assertion fix) |
| AC2 manual browser sign-off (DoD 10) | ✅ **PASSED with one deviation** (ratified 2026-10-22) | The 14-step `/courses` browser walk performed by the user 2026-10-22 — approved ("everything looks good") with **one deviation**: the course color field should be a color picker (F111C-3 — a UX gap in B's form, not a ticket defect; fixed in `CourseForm.tsx` and the final swatch design re-confirmed by the user the same day). Browser/version not provided — recorded limitation (SP-110C precedent: approval at the feature level). Recorded CANNOT VERIFY at closeout until the human leg landed; see below. The dev-stack HTTP pre-flight + e2e wire proof stand alongside it. |
| AC3 parent index | ✅ | `../SP-111/implementation.md` (this commit) |

## Verification actually executed

### Disposable migrated Postgres (automated proof)

Target: an **ephemeral** `postgres:15-alpine` container (port 5433),
migrations applied via `prisma migrate deploy` (all applied, no pending),
removed after the run — no shared or persistent database touched.
`.env`/`.env.local` were never read or displayed and no connection string or
token was printed.

| Check | Command (cwd: repo root) | Result |
|---|---|---|
| New e2e spec | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand courses-e2e` | **1 suite / 14 tests passed** (all cases; first run after the F111C-1 fix) |
| Full API suite (with DB) | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand` | **35/35 suites, 547/547 tests passed, 0 skipped** (baseline after SP-111A: 34/533; + this spec's 14) |
| Full API suite (no DB) | `pnpm --filter @studypilot/api exec jest --runInBand` | 26 suites pass, **9 integration suites self-skip** (162 tests, incl. this spec's 14), 385 pass — the bare local path works |
| Typecheck | `pnpm --filter @studypilot/api typecheck` | clean |
| Lint / format | `eslint --max-warnings 0` + `prettier --check` on the new spec | clean (an `eslint --fix` pass applied formatting fixes — F111C-1's companion) |
| Self-cleaning | row counts after the run | **0 users / 0 semesters / 0 courses** — the suite cascades from the seeded users |
| Full web suite | `pnpm --filter @studypilot/web test` (cwd: repo root) | **35 files / 423 tests, all pass** (the combined feature: 91 course component/API tests from SP-111B + the rest of the app) |

### Dev-stack HTTP pre-flight (AC2 wire leg — performed)

Environment: the dev stack — local PostgreSQL (`localhost:5432`, migrated dev
DB incl. `20261021000000_course_instructor`), `pnpm --filter @studypilot/api
dev` (API `:4000`), `pnpm --filter @studypilot/web dev` (web `:3000`; the
vite proxy forwards `/api/*` → `:4000` with the prefix stripped). Every
request below went **through the web proxy** at `http://localhost:3000/api` —
the same path the browser takes. All 14 steps green on the first run:

| Step | Result |
|---|---|
| Register + login A and B | 201 / 201 with `accessToken` (both) |
| A: create Fall + Spring semesters | 201 (both) |
| A: create CS101 (Fall, instructor/credits/color/description) + CS201 (Spring) + MATH101 (unaffiliated) | 201 ×3 — exact 13-key `CourseWithSemester` shape |
| A: `GET /courses` | 3 rows, name-asc (Calculus, Computer Science I, Computer Science II), semester projected (`null` for MATH101) |
| A: `GET /courses?semesterId=` (Fall / Spring / B's) | `[CS101]` / `[CS201]` / **404 `Resource not found`** (uniform) |
| A: `GET /courses/:id` (CS101) | 200 (13 keys, semester = Fall) |
| A: `PATCH` name + instructor | 200 — merged values returned (`Advanced Computer Science I` / `Dr. Grace`; unpatched fields kept) |
| A: `PATCH` semester re-attach (Fall → Spring) | 200 — `semester` projection follows |
| A: archive (`isActive: false`) | 200; default list → 2 rows (CS101 absent); `includeArchived=true` → 3 rows (CS101 flagged); detail on the archived course → 200 |
| A: restore (`isActive: true`) | 200; default list → 3 rows, all active |
| B: `GET` / `PATCH` on A's CS201 | **404 `Resource not found`** ×2 (uniform; no existence oracle) |
| B: `GET /courses` | empty (0 rows) |
| Unauthenticated `GET /courses` | 401 |
| `GET /courses` (the SPA route, no `/api` prefix) | 200 — the SPA shell (`id="root"`), i.e. the route is served and protected by the app, not the API |

Row-level proof on the dev DB (unscoped read, then cleanup): CS101 carried
the full journey (`Advanced Computer Science I`, `Dr. Grace`, active,
attached to Spring); CS201's name was **still** `Computer Science II` —
B's `Hacked by B` PATCH wrote nothing; MATH101 unaffiliated. The two
pre-flight users were then deleted (cascade); the dev DB was restored to its
exact pre-run state (5 users, 3 semesters, 1 course, 28 refresh tokens).
Both dev servers were stopped and the disposable container removed.

## Manual browser sign-off (DoD 10, AC2) — **PASSED with one deviation** (ratified 2026-10-22)

**Status: PASSED with one deviation.** The manual browser walk (the 14 steps
below) was performed by the user on 2026-10-22 and returned approval:
"everything looks good except color for the course should be a color
picker." Provenance: who — the user (session owner); when — 2026-10-22;
browser/version — **not provided** (recorded limitation: the approval is at
the feature level, per the user's report — the SP-110C precedent);
per-step observations — overall approval, one deviation (the color field —
F111C-3). The user then clarified the desired design (a simple dropdown of
preset colors, no hex input; the options must actually show the colors), the
fix (a row of color swatches — F111C-3) was committed, and the user
re-confirmed the result in the browser the same day.

**History:** at closeout this sign-off was recorded **CANNOT VERIFY** — the
walk is a **human gate** (per the SP-105D/SP-106D/SP-107F/SP-110C precedent)
and no human browser session was available in the implementation runtime; per
the ticket's own rule it was recorded CANNOT VERIFY with the reason rather
than claimed, and no sign-off was claimed or implied until the ratification
above. What the implementer **performed** and stands on its own regardless:
the dev-stack bring-up + the full HTTP pre-flight above (the wire leg of the
same journey) and the automated proof (the e2e suite + the SP-111A/B
unit/component suites, all green).

### Exact steps the human must perform

Environment: the dev stack — local PostgreSQL (migrated; the running dev DB
is fine), `pnpm --filter @studypilot/api dev` (API `:4000`), `pnpm
--filter @studypilot/web dev` (web `:3000`), the app reading its
`.env.local`.

1. **Register** a brand-new account and **log in**. If the onboarding wizard
   (SP-107) is offered, complete or skip it to reach the app — optionally
   create a course in wizard step 3 (it will later appear in the list).
   Note: the account is unverified, so the email-verification banner may
   show.
2. Open **`/courses`** via the header **"Courses" link** (after Semesters) —
   confirm the link is present when authenticated and carries the active
   highlight on `/courses`.
3. **Empty state:** with no courses yet, confirm the "No active courses"
   message + the create call-to-action.
4. **Create (invalid):** open the create dialog; exercise each invalid field
   — empty code, code > 20 chars, empty name, name > 100 chars, credits `0`
   or `31`, a non-`#rrggbb` color, a whitespace-only instructor, description
   > 2000 chars — each shows a **field-level** client error and saves
   nothing.
5. **Create (valid):** enter code + name + a semester + instructor + credits
   + color + description; save → the new course appears in the list (the
   list re-reads from the API) and the success is announced.
6. **Create a second course** (a different code/name; a different semester or
   none — the "No semester" option).
7. **Edit:** open edit on one row → confirm the form is **pre-filled** (all
   fields incl. instructor and semester; "No semester" is disabled while the
   course is attached); rename + change the instructor; save → the row
   updates in place with the merged values.
8. **Archive:** click **Archive** on a row → the confirmation dialog states
   the operation is **reversible**; focus starts on **Cancel**;
   **Tab/Shift+Tab cycle inside the dialog**; **Escape cancels** (confirm no
   request is sent); **Confirm** → the row disappears (the switch is off) and
   the success is announced.
9. **Show archived:** toggle the **"Show archived"** switch → the archived
   row reappears with a text **Archived** badge; toggle it back off → the
   row hides again (instant, client-side).
10. **Restore:** with archived shown, click **Restore** on the archived row →
    confirmation (restore wording); confirm → the row is active again (badge
    gone).
11. **Keyboard pass:** repeat create → edit → archive using the keyboard
    only (Tab order through list → dialog; no mouse).
12. **Error state:** stop the API, reload `/courses` → the error state +
    **retry** appears; restart the API and retry → the list loads.
13. **Mobile viewport:** repeat the core walk (list, create, archive,
    show-archived) at a mobile viewport — actions reachable, the dialogs fit,
    no horizontal scroll.
14. **Return approval** with the browser/version used and per-step
    observations (or the deviations observed).

### Closure (SP-106/SP-107/SP-110 precedent)

The human gate is now **satisfied**: the user performed the walk above and
the ratification with provenance is recorded in the Status block (who/when/
limitations — browser/version not provided; one deviation, F111C-3), exactly
as SP-110C's was transcribed. DoD 10 closes via that recorded ratification
**plus** the combined SP-111 parent review (pending — report at
`../SP-111/review.md`); until that review passes, the review unit is not
signed off.

## Findings / deviations

| ID | Description | Disposition |
|---|---|---|
| F111C-1 | The first draft of the semester-filter case asserted `toEqual` between the two uniform-404 bodies (foreign vs missing `semesterId`); the error envelope's `path` (which contains the semester id) and `timestamp` differ per request. The uniformity contract covers status + `message` + `error` — the assertion now compares exactly those three. | Fixed (test-only, this session). One test failed on the first run until the update; all green after. No product defect. |
| F111C-2 | Registration lowercases the email (`preflight.a.9944B033@…` is stored as `…9944b033@…`), so the pre-flight cleanup's `delete from users where email = <as sent>` matched 0 rows. | Fixed (process-level): the two pre-flight users were deleted by id instead; the dev DB was verified back to its exact pre-run state. No product defect (lowercasing is the intended normalization). |
| F111C-3 | The DoD-10 human browser walk (user, 2026-10-22) passed with one deviation: the course **color field was a plain hex text input** and the user wants a color picker. The B ticket required `#rrggbb` validation (a text input satisfied it) but did not mandate a picker — a UX gap, not a ticket defect. The user then clarified the design: a simple dropdown of preset colors, no hex input, and the options must actually show the colors. | Fixed (B-owned file `CourseForm.tsx`, changed by this session — the implementer is the single owner, per the ticket rule that A/B findings route back to their owner): the color field is now a **row of color swatch circles** (a `role="radiogroup"` of 10 preset colors; indigo `#6366f1` default; click to pick; one tab stop with arrow-key/Home/End navigation). A native `<select>` cannot render colors and a popover would clip in the scrolling dialog. In edit mode a stored non-palette color is offered as an extra `Custom #rrggbb` swatch so editing never silently overwrites it; the `#rrggbb` zod rule stays (mirrors the backend) but is unreachable through the swatches, so the two color validation-matrix cases are removed. The backend contract is unchanged. CourseForm tests 34 → 36; web suite 35 files / 425 tests; typecheck/lint/prettier clean. Committed `7ae6ad0`; the user re-confirmed the swatch design in the browser the same day. |

**Product defects in A–B:** one UX finding — F111C-3 above (surfaced by the
DoD-10 walk; fixed in this session in B's file). Every e2e case and every
pre-flight step otherwise passed on the first (corrected) run.

No Jira mutation occurred (child key remains `Pending creation`).

## Commit scope

Two scoped commits on `main` (baseline `c0ccb7d`):

1. `36e272a` — the sign-off work:
   `apps/api/src/modules/courses/courses-e2e.spec.ts` (new),
   `docs/stories/EP02/SP-111/artifacts/SP-111C/` (checkpoint + this record),
   `docs/stories/EP02/SP-111/artifacts/SP-111/implementation.md` (parent
   index, AC3), `docs/stories/EP02/SP-111/README.md` (execution fields only —
   queue row C, Active/Next), `docs/stories/EP02/SP-111/SP-111C-course-integration-signoff.md`
   (status line only).
2. `7ae6ad0` — the F111C-3 fix (B-owned file):
   `apps/web/src/features/courses/ui/CourseForm.tsx` + `CourseForm.test.tsx`
   (color swatches) + `docs/stories/EP02/SP-111/artifacts/SP-111C/checkpoint.md`
   (F111C-3 record).

The DoD-10 ratification records (this record's Status/AC2/sign-off sections,
the parent index DoD-10 section, the queue "Next substory" field) land in a
third scoped commit, recorded in the queue row and the returned handoff (not
amended into this record).

## Remaining work (outside this child)

- ~~**DoD 10 human ratification**~~ — **done** (2026-10-22): the user
  performed the 14-step `/courses` walk above and returned approval with one
  deviation (F111C-3, fixed and re-confirmed); the ratification is recorded
  in this record (the SP-110C pattern).
- **Combined SP-111 parent review** (one review after all children; report at
  `../SP-111/review.md`) — the implementer has prepared the parent index;
  the coordinator requests the independent review. DoD 10 closes via the
  recorded ratification **plus** this review; no other DoD input is open.
