# SP-111B: Course Management UI

**Story ID:** SP-111B
**Parent:** [SP-111](./SP-111-course-management.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Frontend
**Status:** Reviewed 2026-10-22 — final combined parent review **PASS** (F-111R-1 closed by user waiver; F-111R-2/3 accepted as-is). Implemented 2026-10-21 (record in `./artifacts/SP-111B/implementation.md`, checkpoint `./artifacts/SP-111B/checkpoint.md`).
**Dependencies:** SP-111A implemented (contract fixed in the [breakdown README](./README.md#shared-api-contract)); SP-109 (FSD, implemented + reviewed), SP-107D/E (semester + course entities, implemented)
**Jira key:** Pending creation

## Summary

Build the course management screen in the FSD structure: a `/courses` page
listing the student's courses (color chip, code, name, semester, credits) with
a create/edit form (including the new `instructor` field, D111-1), archive and
restore actions, and a show-archived toggle — plus the `entities/course` API
functions and the header nav link.

## Description

As a student, I open **Courses** from the header, see my current courses at a
glance, add a new one (picking its semester), edit any field, and archive
courses I no longer take — archived ones stay visible on demand and nothing is
ever deleted.

## Acceptance criteria

1. **Route + nav:** `/courses` renders inside `ProtectedRoute` at
   `pages/courses/ui/CoursesPage.tsx`; a "Courses" link is added to the header
   nav (after Semesters) with the same active-state styling. *(D111-5)*
2. **List:** active courses by default — each row shows the color chip, `code`
   (monospace), `name`, semester name (or a muted "No semester" when
   unaffiliated), and credits (when present). A **"Show archived"** toggle
   includes `isActive = false` rows, which carry an **Archived** badge
   (D111-3). Loading skeleton, an empty state ("No courses yet" + a create
   call-to-action), and an error state with an actionable message + retry.
   *(AC-E02-03/05, DoD 5)*
3. **Create form (dialog):** fields `code`, `name`, `semester` (optional
   picker populated from the semester entity list — only the student's own
   semesters, with the active one marked), `instructor` (optional), `credits`
   (optional), `color` (optional, defaults to indigo), `description`
   (optional). Client-side rules mirror the backend field rules (DoD 2):
   code/name non-empty after trim with the same max lengths; credits numeric
   `0 < c ≤ 30`; color `#rrggbb`. Backend 400 field errors render per-field;
   409 (duplicate code) and 404 (semester) render as actionable form-level
   messages. On success the list refreshes. *(AC-E02-02/03, DoD 2/4)*
4. **Edit:** the same form, pre-filled from the selected course (all fields
   including `instructor` and `semester`); saving issues the `PATCH` partial
   merge and refreshes the row. *(AC-E02-03)*
5. **Archive / restore:** each row offers **Archive** (active rows) /
   **Restore** (archived rows) with a lightweight confirmation dialog (the
   operation is reversible — the dialog states that). The action issues
   `PATCH { isActive }` (D111-2) and updates the row in place.
   *(AC-E02-05, DoD 8)*
6. **Accessibility:** list rows, the toggle, form fields, and both dialogs are
   fully keyboard-operable; dialogs trap and return focus; the toggle is a
   real switch with an accessible name; badges are text, not color-only
   (DoD 6). **Responsive:** the layout works on mobile (stacked rows, full-
   width dialogs) and desktop (DoD 7).
7. **Out of scope here:** the course **detail** page and list-row links to it
   arrive with SP-112 (AC-E02-04/06); rows are not links in this child.

## Tests

Component (mirror the `features/semesters` test patterns —
`SemesterList.test.tsx` / `SemesterForm.test.tsx`):

- `CourseList`: renders rows (chip/code/name/semester/credits); "No semester"
  fallback; archived rows hidden by default, shown with badge after toggling;
  loading / empty / error states
- `CourseForm`: validation matrix (empty/over-long code & name, credits
  bounds, color format, whitespace-only instructor); 400 field errors render
  per-field; 409/404 form-level messages; create vs edit prefill
- `ArchiveCourseDialog`: confirm issues `PATCH { isActive: false }`; cancel
  issues nothing; restore variant issues `{ isActive: true }`
- `CoursesPage`: route renders the list + "New course" action; nav link present

## Technical notes

- **Inspected (2026-10-21):** `apps/web/src/entities/course/api/courseApi.ts`
  (plain-axios `createCourse`; its header anticipates the EP02 extension),
  `apps/web/src/entities/semester/api/semesterApi.ts` (SP-110A/B pattern:
  `SemesterWithCount` interface + `listSemesters`/`getSemester`/
  `updateSemester`/`deleteSemester` functions — **mirror this shape**),
  `apps/web/src/shared/types/academic.ts` (`Course` 8-key type),
  `apps/web/src/features/semesters/ui/{SemesterList,SemesterForm,DeleteSemesterDialog}.tsx`
  + tests (component patterns, RHF + Zod usage),
  `apps/web/src/pages/semesters/ui/SemestersPage.tsx` (page composition),
  `apps/web/src/widgets/header/ui/Header.tsx` (nav links), `App.tsx` (routes).
- **Entity API (`entities/course/api/courseApi.ts`):** add `listCourses({
  semesterId?, includeArchived? })`, `getCourse(id)`, `updateCourse(id,
  patch)` returning `CourseWithSemester` (new interface, mirrors
  `SemesterWithCount`); extend the shared `Course` type with `instructor:
  string | null` (keep the existing `createCourse` — extend its request with
  optional `instructor`). No RTK Query: the entity uses the plain-axios
  pattern established by SP-107E/SP-110B.
- **Feature (`features/courses/`):** `ui/CourseList.tsx`, `ui/CourseForm.tsx`
  (RHF + Zod mirroring the backend rules), `ui/ArchiveCourseDialog.tsx`
  (reused for restore with a different message); `model/` for the page state
  (fetch, filter, mutation) as needed.
- **Page (`pages/courses/ui/CoursesPage.tsx`):** composes list + form dialog +
  archive dialog; registers the `/courses` route in `App.tsx` inside
  `ProtectedRoute` (mirror the semesters route); header nav link.
- **States:** loading/empty/error per DoD 5; optimistic row updates after
  archive/restore are optional — a refetch is acceptable.

## Definition of Done

1. ACs 1–7 pass. 2. Client-side validation mirrors the backend (DoD 2).
3. N/A — consumes principal-scoped routes (A). 4. Field-level 400 / 409 / 404
rendered actionably. 5. Loading/empty/error states on page + form. 6.
Keyboard accessibility per AC 6. 7. Responsive per AC 6. 8. Component tests
above. 9. N/A — no API change (consumes A's contract). 10. Via SP-111C
sign-off + the combined parent review.

## Sizing

- **Outcome:** the student can manage courses in the browser: list (with
  archive filter), create, edit (incl. instructor), archive, restore.
- **Time estimate:** ~2.5–3 h — one page + three components + entity API
  extension on a well-trodden pattern (the semesters feature is the template);
  the non-mechanical parts are the form validation matrix and the
  list/toggle/badge states. One cohesive child: list + form + archive are one
  screen's behavior and must not be split.
- **Files:** `apps/web/src/entities/course/api/courseApi.ts` (change) + its
  test, `apps/web/src/shared/types/academic.ts` (change — `instructor`),
  `apps/web/src/features/courses/ui/{CourseList,CourseForm,ArchiveCourseDialog}.tsx`
  (**new**) + tests, `apps/web/src/pages/courses/ui/CoursesPage.tsx` (**new**)
  + test, `App.tsx` (route), `widgets/header/ui/Header.tsx` (nav link).
- **Start context:** this ticket, decisions D111-1…5, the
  [shared API contract](./README.md#shared-api-contract), the files above
  (esp. the `features/semesters` + `pages/semesters` templates),
  `shared/api/httpClient.ts`.
- **Verification:** `pnpm --filter @studypilot/web test` all green;
  `pnpm --filter @studypilot/web typecheck` + `lint` + `build` clean.
- **Dependencies / exclusions:** SP-111A (contract), SP-109/SP-107D/E (done).
  Excluded: the course detail page + row links (SP-112B), meetings UI (SP-112B),
  integration sign-off (C). Every excluded requirement has an owner in the
  [README traceability table](./README.md#source-requirements-and-test-traceability).
