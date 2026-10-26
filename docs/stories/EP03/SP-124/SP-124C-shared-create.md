# SP-124C: Shared Create on the List

**Story ID:** SP-124C
**Title:** Frontend: create an assignment from the list through the shared form
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (list-only UI/UX gaps)
**Dependencies:** SP-124A implemented (the form lives in `features/assignments`). Does not require SP-124B. No backend dependency.
**Jira key:** Pending creation

## Summary

A student can create an assignment on `/assignments`. The list opens the same
`AssignmentForm` the course page uses. Because the list has no fixed course,
the form shows a course select when `courseId` is omitted. This child also
writes the parent index and the DoD-10 browser note.

## Bounded scope

In: optional `courseId` and a `courses` prop on `AssignmentForm`; course select
plus "No course" only in that mode; list-page add control and empty-state CTA;
refetch after create; parent index; DoD-10 note; component tests.

Out: a second create form. Row edit/delete/status/subtasks (SP-124B). Course-page
create, which keeps passing a fixed `courseId` and must not show the select.
API or schema changes.

## Source requirement references

- **AC-E03-01** — "Students can create an assignment with a title and course."
  Course remains optional (SP-113 / D113-1); "No course" is allowed.
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, 10. Items 3 and 9 are not applicable.
  Item 11 is the reviewer walkthrough.

## Acceptance criteria

1. **Same form.** The list-page add action opens `AssignmentForm` from `features/assignments`. There is no list-local form component.
2. **Fixed course unchanged.** When `courseId` is passed (course page), the form does not render a course select and still POSTs that id. Edit mode never renders the select.
3. **List create.** When `courseId` is omitted, the form renders a select of the supplied courses plus "No course". The selected id is sent as `courseId`. "No course" omits the field.
4. **Validation.** Title, due date, estimated hours, priority, type, and description keep the current form rules. The course select is optional.
5. **Refetch.** Success closes the form and the list refetches with the current params. The new row appears in that result.
6. **Empty state.** With no rows and no active filters, the empty state can open the same form. Populated-list placement of Add is the ui-refiner decision.
7. **Errors.** 400 field errors map onto the form. 404 uses the uniform not-found copy. Other failures toast the sanitized message. Duplicate submit is blocked while in flight.
8. **Parent index and DoD-10 note.** This child writes `artifacts/SP-124/implementation.md` and the manual browser note for the parent review.
9. **Tests.** Form tests cover fixed-course (no select), list-course selected, "No course" omits `courseId`, and edit mode has no select. List tests cover open, success refetch, and the empty-state entry.

## Tests

- `features/assignments/ui/AssignmentForm.test.tsx` (extend): AC 9 form cases.
- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): open, refetch, empty-state entry.

## Technical notes

### Inspected paths (2026-10-26)

- `AssignmentForm.tsx` — `courseId: string` is required today; create always sends it when set. Edit already PATCHes by assignment id and can ignore `courseId`.
- `AssignmentsPage.tsx` — already loads courses with `listCourses()` for the filter picker. Pass that list into the form; do not fetch courses a second way.
- `createAssignment` already treats `courseId` as optional.

### Decisions

D124-1, D124-6, D124-10.

### UI/UX gaps (for ui-refiner)

1. Add control placement on a populated list (page header vs filter bar). The empty-state entry is required either way.
2. Course select placement in the form and whether "No course" is the initial value.
3. Select label and hint copy. Do not imply that choosing "No course" deletes anything.
4. Narrow-width form: the dialog already caps at `max-w-md` and scrolls. Confirm the new select does not break that.

## Definition of Done

- The nine acceptance criteria pass.
- Invalid input is handled by the existing form schema (DoD 2).
- API errors are actionable (DoD 4).
- Empty and refetch-error states are handled (DoD 5).
- New controls are keyboard accessible and usable on narrow widths (DoD 6, 7).
- Tests pass (DoD 8).
- DoD 10 note is recorded. No API or migration change.
- Item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** A student creates an assignment from the list with the same form, choosing a course or none, and the course page's create path is unchanged.
- **Time estimate:** 1.5–2 hours, including the form prop, list entry points, parent index, browser note, and tests.
- **Files:** `features/assignments/ui/AssignmentForm.tsx` (+ test), `pages/assignments/ui/AssignmentsPage.tsx` (+ test), `docs/stories/EP03/SP-124/artifacts/SP-124/implementation.md` (new).
- **Start context:** this file, D124-6 in the [SP-124 README](./README.md), and the form file after A has moved it.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/assignments/ui/AssignmentForm.test.tsx src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Blocked for code until A is implemented and ui-refiner has settled the gaps above. Does not require B. Excludes row actions (SP-124B).
