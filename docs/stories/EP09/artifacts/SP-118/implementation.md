# SP-118 implementation record

**Story:** [SP-118: Semester & Course Management E2E Coverage](../../SP-118-semester-course-e2e.md)
**Status:** Implemented — awaiting parent review (EP09)
**Checkpoint:** [checkpoint.md](./checkpoint.md)

## Summary

Added the core data journeys to the Playwright suite, all against the real
stack (no mocking): semester create/edit/delete and course create/edit plus
archive/restore through the real UI and API, one explicit negative validation
case, and a shared `e2e/helpers.ts` (register/login via the API + bearer-token
setup calls + UI login). No production code changed.

## Acceptance criteria outcomes

| AC | Outcome | Evidence |
| --- | --- | --- |
| 1. A signed-in user can create a semester; it appears in the semesters list | **Met** | `semesters-courses.spec.ts`: empty state → `Add your first semester` → form (name + native date inputs) → `Create semester` → `${name} created.` status line, row visible with readable dates (`Jan 5, 2026`–`May 15, 2026`) and `0 courses` |
| 2. A signed-in user can create a course; it appears in the courses list | **Met** | Empty state → `Add your first course` dialog → code/name, semester picked by id from the setup response, instructor + credits → `Create course` → row shows code, attached semester name, `4 credits` |
| 3. Editing a semester/course persists and renders the updated values | **Met** | Semester: setup via API → `Edit ${name}` → rename + new end date → `Save changes` → `${newName} updated.`, row shows `Jun 20, 2026`, old name count 0. Course: rename + credits 4→3 + instructor → row shows `3 credits`; instructor persistence proven via the reopened, prefilled edit dialog (`toHaveValue('Grace Hopper')` — the list does not render instructors, F3) |
| 4. Deleting a semester/course removes it (with the UI's existing confirmation; guards not weakened) | **Met (course = archive, F2)** | Semester: `Delete ${name}` → confirmation dialog (`Delete ${name}?` heading) → confirm → `${name} deleted. Its courses remain, unaffiliated.`, row count 0. Course: the product has **no hard delete** (D111-2) — the removal journey is **archive with its confirmation dialog** (`Archive ${courseName}?`), then the row leaves the active list, reappears via the `Show archived` switch with the text badge, and **restores** through its own confirmed dialog. All guards used as-is |
| 5. Tests clean up their data or use uniquely named entities per run | **Met (unique names; no cleanup, F4)** | Per-test user + per-test unique semester names / course codes / names; name collisions across workers are impossible to manifest (409 is student-scoped). No cleanup — same carried finding as SP-116 F5/SP-117 F4 |

Story-notes negative case: empty semester form submit renders the three inline
required-field errors and the form stays open (no creation).

## Changes

| Path | Change |
| --- | --- |
| `apps/web/e2e/helpers.ts` | New: `registerUserViaApi` (201 fail-fast), `loginViaApi` (returns `accessToken` from the `AuthResponse`), `createAuthenticatedUserViaApi`, `authHeaders`, `createSemesterViaApi`/`createCourseViaApi` (authenticated setup calls — the guard accepts bearer tokens only, so the httpOnly cookie cannot authorize them), `loginViaUi` |
| `apps/web/e2e/semesters-courses.spec.ts` | New: 7 independent tests (semester create/edit/delete, course create/edit, archive→show-archived→restore, empty-form negative case) |
| `docs/stories/EP09/SP-118-semester-course-e2e.md` | Story `Status` → Implemented — awaiting parent review (execution status only) |
| `docs/stories/EP09/README.md` | Queue row + test-inventory Status fields for SP-118; Active/Next substory reconciled (execution status only) |
| `docs/stories/EP09/artifacts/SP-118/` | Checkpoint + this implementation record |

No production code, config, or dependency changes. The SP-116/SP-117 specs were
intentionally left untouched (their in-file helpers stay; consolidation is
recorded as a parent-review note).

## Verification

All commands from the repo root unless noted; dev stack (Postgres :5432, Vite
:3000, API :4000) was already running and was not started/stopped by this task.

| Command (cwd) | Result |
| --- | --- |
| `pnpm test:e2e` (root) | **14 passed** (7 SP-118 + 5 SP-117 + 2 SP-116) — **15 consecutive green runs** (first run caught F3 before the fix) |
| `pnpm test` (`apps/web`, vitest) | 45 files / 563 tests passed (the new e2e files are excluded from collection by the existing `e2e/**` exclude) |
| `pnpm lint` (root, turbo) | api + web passed |
| `pnpm --filter @studypilot/web typecheck` (root) | passed |
| `npx prettier --check apps/web/e2e/helpers.ts apps/web/e2e/semesters-courses.spec.ts` | clean |

## Findings and deviations

Full record with evidence in [checkpoint.md](./checkpoint.md):

- **F1 (design, resolved in code):** the API guard accepts bearer tokens only
  (`jwt.strategy.ts`), so authenticated API setup calls log in via
  `POST /api/auth/login` and carry the returned access token in an
  `Authorization` header; tokens live in local test variables only (never
  logged or persisted).
- **F2 (AC4 wording vs. product decision — planner/reviewer disposition):**
  courses have no hard delete (D111-2: "nothing is ever deleted"); the covered
  course removal journey is the confirmed archive/restore. The semester delete
  (hard delete with confirmation) is covered as written. No product change
  made.
- **F3 (fixed):** first run failed — the course-edit test wrongly asserted the
  instructor in the list row (`CourseList` doesn't render it). Fixed by
  asserting persistence via the reopened prefilled dialog; 15 consecutive
  green runs after.
- **F4 (carried over, still open):** no data cleanup — runs leave `e2e-auth-*`
  users and `E2E Semester …`/`E2E Course …` rows (no deletion endpoints;
  direct-DB cleanup needs env wiring outside a tests-only scope). Same
  disposition as SP-116 F5/SP-117 F4: dedicated-test-DB + cleanup infra story
  for the planner.
- **F5 (note for parent review):** helper consolidation — SP-116/SP-117 specs
  still carry their own in-file copies of the register/login helpers; the new
  `helpers.ts` serves SP-118. Consolidation would touch already-verified
  sibling specs and was deliberately left out of this tests-only scope.

## Remaining work

- All EP09 children (SP-116/117/118) are now implemented — the EP09 parent
  implementation index (`artifacts/EP09/implementation.md`) and the single
  independent parent review are next; F2/F4/F5 dispositions there.
