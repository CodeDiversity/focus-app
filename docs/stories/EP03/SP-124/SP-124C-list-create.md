# SP-124C: In-Place Create on the List Page

**Story ID:** SP-124C
**Title:** Frontend: in-place assignment creation on the cross-course list
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (UI/UX gaps; see § UI/UX gaps)
**Dependencies:** SP-113 (create API) reviewed; SP-122B (list page) reviewed; benefits from SP-124A landing first (form placement). No backend dependency.
**Jira key:** Pending creation

## Summary

A student can create an assignment directly on the cross-course `/assignments`
list. The existing `AssignmentForm` is reused in create mode, but because the
list spans courses, the form gains a course selector (or "No course") when no
fixed course is supplied. After creation the list refetches with the current
params. This child also writes the parent index and the DoD-10 browser note.

## Bounded scope

In: "Add assignment" control on the list page; `AssignmentForm` in create mode
with an optional course selector (D124-6); empty-state CTA; refetch after
create; parent index (`artifacts/SP-124/implementation.md`); DoD-10 browser
note; component tests.

Out: row edit/delete/status (SP-124A). Subtasks (SP-124B). Any backend change
(D124-1). Course-page changes (D124-2 — untouched).

## Source requirement references

- **AC-E03-01** — "Students can create an assignment with a title and course."
  (second surface; "course" is optional per D113-1/SP-113, so "No course" is
  allowed)
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 4, 5, 6, 7, 8, 10. Items 3, 9, 11 are not applicable or
  parent-level.

## Acceptance criteria

1. **Add control.** The list page has an "Add assignment" control (primary)
   that opens `AssignmentForm` in create mode.
2. **Course selector.** When no fixed course is supplied (list page), the form
   renders a Select of the student's courses (already loaded in
   `AssignmentsPage`) plus a "No course" option, and the selected value is
   passed to `createAssignment` as `courseId` (omitted for "No course").
3. **Validation.** Title required (1–200 chars); due date, estimated hours,
   priority, type, description reuse SP-113 validation. The course selector is
   optional.
4. **Refetch.** On success the dialog closes and the list refetches with the
   current params; the new assignment appears.
5. **Empty state.** When the list is empty and no filters are active, the
   empty state offers an "Add your first assignment" CTA that opens the same
   form.
6. **Busy state.** The submit button disables and shows a spinner while the
   request is in flight; duplicate submission is prevented.
7. **Errors.** 400 field errors map to the form; 404 shows the uniform copy;
   other failures toast the sanitized message.
8. **Parent index.** This child writes `artifacts/SP-124/implementation.md`
   linking to A/B/C records, checkpoints, and commits.
9. **DoD-10 browser note.** This child records the manual browser pass note
   for the parent review (mirroring SP-123B).
10. **Tests.** Component tests cover: open form, create with a selected course,
    create with "No course", validation errors, 404 copy, refetch after success,
    empty-state CTA.

## Tests

- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): create cases listed
  in AC 10.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — host; already loads
  `courses` via `listCourses()` for the filter picker (reuse for the selector).
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — `courseId` required
  today; make optional for create mode and render a Select when omitted
  (D124-6). Edit mode is unaffected.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `createAssignment`
  accepts optional `courseId`.
- `apps/web/src/shared/types/academic.ts` — `CourseWithSemester`? The list page
  uses `CourseWithSemester` from `entities/course/api/courseApi`. The selector
  needs `{ id, name, code }`.

### Element decisions (to be settled by ui-refiner)

- **D124C-1** "Add assignment" button placement on the list page (header vs.
  filter bar vs. empty state only).
- **D124C-2** Course selector placement in the form (top of form vs. after
  title) and whether "No course" is the default.
- **D124C-3** Empty-state CTA copy and whether the list shows a persistent
  "Add" button even when populated.

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D124-1 | No backend change. | See parent. |
| D124-6 | Course selector in `AssignmentForm` when `courseId` is omitted. | See parent. |

## Definition of Done

- The ten acceptance criteria pass.
- Validation handles invalid input (reuse SP-113 validation).
- API errors produce actionable messages.
- Loading/empty/error states handled (empty-state CTA; refetch error toasts).
- Keyboard accessibility and responsive layout (DoD 6, 7).
- Automated component tests (DoD 8).
- Item 10 (integrated review) recorded via the DoD-10 browser note.
- No API or migration change (DoD 9 not applicable).
- Item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** A student can create an assignment on the cross-course list,
  choosing a course (or "No course"), with the list refetching after success,
  plus the parent index and DoD-10 browser note.
- **Time estimate:** 2–2.5 hours, including form changes, empty-state CTA,
  refetch, parent index, browser note, and component tests.
- **Files:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (+ test);
  `apps/web/src/features/courses/ui/AssignmentForm.tsx` (course selector);
  `docs/stories/EP03/SP-124/artifacts/SP-124/implementation.md` (new).
  No backend, schema, or route change.
- **Start context:** this file, the parent README, the inspected paths, and the
  SP-124C element decisions.
- **Verification:** `pnpm --filter @studypilot/web test -- src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Benefits from SP-124A's row layout (ui-refined).
  Excludes row actions (SP-124A) and subtasks (SP-124B).

## UI/UX gaps (for ui-refiner)

1. "Add assignment" button placement (header vs. filter bar vs. empty state).
2. Course selector placement and default value in the create form.
3. Empty-state CTA copy and whether a persistent "Add" button shows when
   populated.
4. Form width/scroll behavior on mobile (the form already caps at `max-w-md`).