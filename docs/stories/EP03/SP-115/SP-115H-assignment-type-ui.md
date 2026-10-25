# SP-115H: Assignment Type UI

**Story ID:** SP-115H
**Title:** Frontend: set and show an optional assignment type
**Parent:** [SP-115](./SP-115-assignment-types.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** SP-115G implemented (contract and migration). UI/UX gaps below must be settled by `ui-refiner` before implementation. Refinement does not wait on G.
**Jira key:** Pending creation

## Summary

On the course page, a student can classify an assignment as homework, a paper,
a project, a quiz, or an exam when creating or editing it, and can see that
classification on the assignment. Leaving it unset does not invent a type.
Editing does not clear a type already stored.

## Bounded scope

In: the shared assignment type, the create/update client payload, the existing
course-detail form and assignment row, the fixtures those types force, and
this child's closeout (component tests, DoD-10 browser note, parent index).

Out: a new assignments page, type filters, overdue styling, status changes,
and any control that claims a blank type clears the stored value. If
refinement needs a new screen or a filter, stop and return that split to the
planner. Do not invent layout, badge color, or option copy here.

## Source requirement references

- **AC-E03-02** — optional type, the visible half. Due date, estimated
  duration, and priority already have controls (SP-113B/SP-114E).
- **AC-E03-01** — type is optional on the existing create, not a new flow.
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, and 10. Item 3 stays enforced by G.
  Item 9 is G's migration. Item 11 is the final reviewer walkthrough.
- Contract and D115-1…4 in the [SP-115 README](./README.md).

## Acceptance criteria

1. **Set, omit, keep.** Create and edit can submit each of `HOMEWORK`,
   `PAPER`, `PROJECT`, `QUIZ`, and `EXAM` through the existing assignment
   form and `assignmentApi`. Create with no type omits `type` (the existing
   client drops unset fields; the API also stores an explicit null as null).
   Edit does not send null to clear a stored type (D115-3). The control must
   not tell the student that blank clears a stored type.
2. **Row truth.** A stored type is visible on the course assignment row. A
   null type is not labeled as one of the five categories. Layout, component,
   and copy wait for the UI/UX gaps below.
3. **Errors and in-flight.** `CreateAssignmentRequest` and
   `UpdateAssignmentRequest` accept optional `type`. A 400 field error for
   `type` renders on that control. In-flight lock, duplicate submit, uniform
   404, and network retry stay the current form behavior.
4. **Keyboard and narrow width.** The new control is in the dialog tab order,
   has an accessible name, and remains inside the existing focus trap. The
   assignment row still wraps without hiding the type or the existing edit
   and delete controls at a mobile width. Component tests cover set, omit,
   keep, invalid `type`, and null display.

## UI/UX gaps (ui-refiner)

Status is `Needs refinement` until these are decided in this file. Do not
treat the priority `Select` as a required visual pattern; it is only the
existing control.

- Where the type control sits in the dialog, which already has title, due
  date, estimated duration, priority, and description. Mobile dialog height
  and scroll are unsettled.
- Create unset: whether there is an empty option, and its label. It must not
  promise that blank clears a stored type.
- Edit: show the stored type. Changing it submits the new value. Leaving it
  submits the current value or omits `type`. No clear affordance that the
  API will ignore.
- Row: badge, secondary text, or hidden when null. Status and priority
  badges already fill the row; a third badge's mobile wrap is unsettled.
  Do not invent badge colors in planning.
- Visible labels and option order. API identifiers are fixed; copy is not.
- The page already announces "Assignment added." and "Assignment updated."
  Whether type needs its own announcement is unsettled. Do not add a success
  toast unless that announcement is insufficient.

## Tests

- `AssignmentForm.test.tsx`: create omits `type` when unset; create and edit
  submit a selected type; edit does not send `type: null` when the stored
  type is unchanged; a server field error for `type` renders on the control;
  keyboard coverage includes the new control in the trap.
- `AssignmentsSection.test.tsx`: a typed row shows the settled label; a null
  type does not show a category label; existing edit/delete controls remain.
- `assignmentApi.test.ts`: create omits an unset type and sends a set type;
  update sends a set type and does not send null to clear.
- Fixture compile fixes, not new behavior: `CourseDetailPage.test.tsx`,
  `DeleteAssignmentDialog.test.tsx`, and `entities/course/api/courseApi.test.ts`
  once `CourseAssignment` requires `type`.
- **DoD-10:** one manual browser pass on course detail after G is deployed
  locally: set a type on create, see it on the row, change it on edit, and
  confirm an untyped assignment does not show a category. Record the pass or
  the blocker in `./artifacts/SP-115H/implementation.md`. This is closeout for
  this child, not a separate story.

## Technical notes

### Inspected paths (2026-10-25)

- `apps/web/src/shared/types/academic.ts` — `Assignment` has no `type`.
  `CourseAssignment` is `Omit<Assignment, 'course'>`. Add
  `type: AssignmentType | null` to `Assignment` so both update together.
  `Task.assignment` uses `Assignment` and will require the field in fixtures.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — create copies only
  present optional fields. Update forwards the given object. Follow that:
  omit unset create type; do not add a null clear on update.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — react-hook-form +
  zod. Priority is a required `Select`. `FIELDS` maps 400 errors. Dialog
  traps Tab and closes on Escape unless submitting.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — title, due date,
  status badge, priority badge, edit, delete. No type. Refetch stays the
  page's `onAssignmentChanged` callback; do not add a second fetch.
- `apps/web/src/shared/ui/Select.tsx` — labeled select with error and hint.
  Available, not mandatory.
- FSD: keep the form in `features/courses/ui/` (D113-4). The client stays in
  `entities/assignment/api/`. No lateral feature import.

### Decisions this child must not reopen

D115-1 fixes the five stored values. D115-3 forbids a clear. Display copy and
placement are the gaps above, not a license to add `OTHER` or a free-text type.

## Definition of Done

- The four acceptance criteria pass, including client validation and the API
  field error on `type`.
- Loading, empty, and error behavior of the existing form still holds, with
  null type not shown as a category (DoD 5).
- The new control is keyboard accessible and the row works at desktop and
  mobile widths (DoD 6, 7).
- Component tests above pass (DoD 8).
- DoD-10 browser note is in `./artifacts/SP-115H/implementation.md`.
- Parent index at `./artifacts/SP-115/implementation.md` links G and H
  evidence and the contract. That index is this child's closeout, not a
  separate story.
- Do not mark the parent reviewed. Item 11 belongs to the reviewer.

## Sizing

- **Outcome:** A student can set an optional assignment type on the course
  page and see the stored value, without clearing it by accident.
- **Time estimate:** 2–2.5 hours after UI/UX decisions, including fixture
  updates, component tests, and the browser note. The index is closeout, not
  extra scope. Uncertainty is the row treatment the refiner chooses; a third
  badge is still inside this story unless it needs a new screen.
- **Files:** `shared/types/academic.ts`; `entities/assignment/api/assignmentApi.ts`
  and its test; `features/courses/ui/AssignmentForm.tsx` and its test;
  `features/courses/ui/AssignmentsSection.tsx` and its test. Fixture-only:
  `DeleteAssignmentDialog.test.tsx`, `pages/courses/ui/CourseDetailPage.test.tsx`,
  `entities/course/api/courseApi.test.ts`. No new route.
- **Start context:** this file, the SP-115 README contract, D115-3, and the
  inspected UI paths. After G lands, use its implementation record for the
  live response shape. Do not read stories 4–7 or the full correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentForm.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx src/features/courses/ui/DeleteAssignmentDialog.test.tsx src/entities/course/api/courseApi.test.ts` passes. Then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Blocked for code until G is implemented and
  this file's UI/UX gaps are settled. Excludes type filters, status, subtasks,
  and clearing type. Those epic ACs stay owned in the [EP03 README](../README.md).
