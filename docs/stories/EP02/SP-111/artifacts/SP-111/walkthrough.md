# SP-111 Course Management — Final Walkthrough

**Date:** 2026-10-22 · **Reviewed state:** commit `d4f5c14` (clean tree)
**Companion:** [review.md](./review.md) — the final combined parent review
(PASS; F-111R-1 closed by recorded user waiver)

## 1. What you can do now

As a student, open **Courses** from the header (the new link, after
Semesters) and manage your courses in one screen:

- **See** your current courses — color chip, code, name, semester (or a muted
  "No semester"), credits.
- **Create** a course: code, name, semester (optional), **instructor** (new in
  EP02), credits, color (a row of visible color swatches), description.
- **Edit** any field — including instructor and semester attachment.
- **Archive** a course you no longer take — a confirmation dialog states the
  operation is reversible — and **restore** it later. Archived courses are
  hidden by default, revealed by the "Show archived" toggle, and carry a text
  **Archived** badge.
- **Nothing is ever deleted** — archiving is a flag flip; the row and its data
  always survive.

This delivers EP02's course scope: create (story 2), edit (story 3), archive
and restore (story 4) — as SP-111A (API), SP-111B (UI), SP-111C (integration
sign-off). The course detail page and recurring meetings arrive with SP-112.

## 2. How the code works

**Backend** (`apps/api/src/modules/courses/`):

- `courses.controller.ts` — four routes: `POST /courses`, `GET /courses`,
  `GET /courses/:id`, `PATCH /courses/:id`. **No delete route exists.**
- `courses.service.ts` — every query carries the authenticated student's
  `userId` (from the JWT principal via `@CurrentUser()`) in its `where`
  clause. A record that is missing **or** owned by another student returns the
  same uniform `404 "Resource not found"` — the API never reveals that
  another student's course exists.
  - `list` — active courses by default; `?includeArchived=true` adds archived
    rows; `?semesterId=` filters to one of **your** semesters (foreign or
    missing → 404 before anything is returned); ordered by name, then code.
  - `get` — returns your course **regardless of archive state**.
  - `update` — partial merge: only the fields you send are written; validation
    runs on the **merged** values; a `semesterId` pointing at someone else's
    semester → 404 with **no write**; a duplicate code for you → 409;
    `isActive: false` archives, `true` restores.
  - `create` — gains the optional `instructor` (D111-1; new nullable column,
    migration `20261021000000_course_instructor`).
  - Every route returns the 12-key `CourseWithSemester` shape with the
    semester projected as `{ id, name }` or `null` (orphaned by semester
    deletion).
- Validation is two-layered — DTO decorators plus service re-checks; the
  backend is authoritative.

**Frontend** (FSD, `apps/web/src/`):

- `entities/course/api/courseApi.ts` — plain-axios functions for the four
  routes (the same pattern as the semester entity).
- `features/courses/ui/` — `CourseList` (rows, the "Show archived" switch,
  badges, loading/empty/error + retry), `CourseForm` (RHF + Zod mirroring the
  backend rules; the color field is the swatch row — the F111C-3 improvement
  from your browser walk), `ArchiveCourseDialog` (reversible wording, focus
  trap, Escape cancels).
- `pages/courses/ui/CoursesPage.tsx` — composes the page; fetches once with
  archived included and filters client-side so the toggle is instant;
  announces successes through a live region.
- `App.tsx` — `/courses` inside `ProtectedRoute`; `Header.tsx` — the "Courses"
  link with active-state styling.

**Key decisions (breakdown README):** archive = `isActive` flag, no hard
delete (D111-2); list active-only by default (D111-3); the read shape carries
the semester projection (D111-4); the `instructor` column — your confirmed
schema addition (D111-1).

## 3. Why you can trust it

- **Your courses are yours alone.** Every route is principal-scoped; the
  two-student e2e matrix (executed on real Postgres) proves student B cannot
  read or write A's courses — uniform 404, A's row byte-identical before/after,
  B's list never contains A's ids — and every route 401s without a token.
- **Archiving never destroys.** The e2e proves the row survives archiving,
  stays readable via the detail route, and even survives its semester being
  deleted (orphaned, `semester: null`).
- **Validation is tested end to end.** 113 API tests (62 unit + 51
  data-scoping), 91 web component/API tests, and the 14-test e2e lifecycle
  (create → list → filter → edit → archive → restore over real HTTP) — all
  green at `d4f5c14`, plus typecheck/lint/format clean on both apps.
- **You walked it.** The DoD-10 manual browser sign-off was performed by you
  on 2026-10-22: approved, with one deviation (the color field) that became
  the swatch design you re-confirmed in the browser the same day.
- **Known cosmetic residual (waived, recorded):** the implementation records
  and a few code comments describe the course shape as "13-key" (baseline
  "8-key"); the actual shape is 12 keys (9 before this story). The binding
  contract enumeration, the code, and the test assertions are all consistent
  at 12 — the labels are descriptive text only, with no functional, security,
  or test impact. You chose to accept this as-is on 2026-10-22 (recorded in
  [review.md](./review.md) and the breakdown README correction log), so no fix
  round was run.

## 4. Manual test workflows

Prerequisites (safe, local only): a local PostgreSQL with migrations applied;
`pnpm --filter @studypilot/api dev` (port 4000) and `pnpm --filter
@studypilot/web dev` (port 3000); register a **fresh throwaway account** — the
data you create is yours and safe to discard. No secrets are needed or used.

### W1 — The core journey (list, create, edit, archive, restore)

1. Log in as the fresh account; open **Courses** from the header (active
   highlight on `/courses`).
2. With no courses: expect "No active courses" + a create call-to-action.
3. Open the create dialog; enter code `CS101`, name `Computer Science I`, a
   semester, instructor `Dr. Grace`, credits `3`, pick a swatch, a short
   description → save. Expect the row (chip, code, name, semester, credits) +
   a success announcement.
4. Negative: empty code, a 21-char code, empty name, credits `0` or `31`, a
   non-hex color, a whitespace-only instructor, a >2000-char description →
   each shows a per-field client error; nothing is saved.
5. Create a second course (different code; optionally no semester → the row
   shows "No semester").
6. **Edit** the first course: the form is pre-filled (all fields incl.
   instructor; "No semester" is disabled while attached). Rename + change the
   instructor → save → the row updates in place.
7. **Archive** a row → the dialog states the operation is reversible; focus
   starts on Cancel; Tab/Shift+Tab cycle inside; **Escape cancels** (no
   request); Confirm → the row disappears (switch off) + announcement.
8. Toggle **Show archived** → the row reappears with the **Archived** badge;
   toggle off → hidden again (instant, client-side).
9. **Restore** the archived row → confirm → active again, badge gone.

**Execution status: Executed** — performed by the user 2026-10-22 against the
local dev stack (the 14-step walk; provenance in
[SP-111C/implementation.md](../SP-111C/implementation.md)). One deviation (the
color field, F111C-3) was fixed as the swatch row (`7ae6ad0`) and re-confirmed
by the user in the browser the same day.

### W2 — Keyboard-only pass

Repeat create → edit → archive using only the keyboard: Tab order through the
list into the dialog; arrow keys / Home / End on the color swatches; Escape
closes a dialog and returns focus to the row.

**Execution status: Executed** — step 11 of the 2026-10-22 walk.

### W3 — Error state + retry

Stop the API dev server, reload `/courses` → expect the error state with a
**Retry** button. Restart the API, click Retry → the list loads.

**Execution status: Executed** — step 12 of the 2026-10-22 walk.

### W4 — Mobile viewport

Repeat the core walk (list, create, archive, show-archived) at a mobile
viewport — expect stacked rows, full-width dialogs, no horizontal scroll.

**Execution status: Executed** — step 13 of the 2026-10-22 walk.

### W5 — Cross-student safety (API level)

**Not applicable as a separate manual check** — this is proven by the executed
e2e suite (B's GET/PATCH on A's course → uniform 404; A's row byte-identical;
B's list empty) and the dev-stack HTTP pre-flight. Optional re-run, if you
want to see it: with two local accounts, request
`GET /courses/<A's course id>` using B's token (e.g. via the API in a second
browser profile or `curl`) — expect `404` with `"message":"Resource not
found"`, byte-identical to a never-created id.

## 5. Recorded limitations

- The 2026-10-22 walk approval was at the feature level: the browser/version
  was not provided (the SP-110C precedent); per-step observations were the
  overall approval plus the one deviation.
- The key-count label inaccuracy in the records/comments remains as-is per
  your 2026-10-22 decision (see §3 and [review.md](./review.md)).
