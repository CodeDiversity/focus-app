# SP-124A: List-Page Row Actions (Edit, Delete, Status)

**Story ID:** SP-124A
**Title:** Frontend: in-place Edit, Delete, and status change on assignment list rows
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (UI/UX gaps; see § UI/UX gaps)
**Dependencies:** SP-114 (edit/delete API) reviewed; SP-121 (status) reviewed; SP-122B (list page) reviewed. No backend dependency.
**Jira key:** Pending creation

## Summary

A student can edit, delete, and change the status of an assignment directly on
the cross-course `/assignments` list, without being routed to the course page.
The assignment title becomes the trigger that opens the edit form in place; a
secondary "View course" affordance (the course code chip or a small link) still
routes to `/courses/:id` when a course exists. After every mutation the list
refetches with the current filter/sort params.

## Bounded scope

In: Edit button + `AssignmentForm` (edit mode) on list rows; Delete button +
`DeleteAssignmentDialog`; status `Select` calling `updateAssignment`; title
opens edit instead of routing; "View course" affordance; refetch-after-mutation
helper; busy state; component tests.

Out: subtask checklist (SP-124B). In-place create (SP-124C). Any backend
change (D124-1). Course-page changes (D124-2 — untouched).

## Source requirement references

- **AC-E03-04** — "Students can update assignment status." (second surface)
- SP-114 editing/deletion — second surface.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 4, 5, 6, 7, 8. Items 3, 9, 10, 11 are not applicable or
  parent-level (10 = combined review, 11 = reviewer walkthrough).

## Acceptance criteria

1. **Edit.** Clicking the title (or an Edit control) on a list row opens
   `AssignmentForm` in edit mode pre-filled with that assignment; saving calls
   `updateAssignment(id, …)` and refetches the list; the row reflects the new
   values. Cancel closes without a request.
2. **Delete.** A Delete control opens `DeleteAssignmentDialog`; confirming calls
   `deleteAssignment(id)`, refetches, and removes the row. Cancel closes
   without a request.
3. **Status.** Each row has a status `Select` (same five values and labels as
   the course page). Changing it calls `updateAssignment(id, { status })` and
   refetches. The control is disabled while a request is in flight.
4. **No route on title.** The title no longer navigates to the course page by
   default; it opens edit. A separate "View course" affordance routes to
   `/courses/:id` when `course` is non-null; assignments with no course show no
   such affordance.
5. **Refetch.** After add/edit/delete/status/subtask mutations the list
   refetches using the current filter/sort/order params (no full page reload,
   no loss of filter state). A failed refetch toasts the sanitized message and
   keeps the last known list.
6. **Busy state.** Edit/delete/status controls are disabled while their own
   request is in flight; duplicate submission is prevented (in-flight ref).
7. **Errors.** A 404 from any mutation shows the uniform "Resource not found"
   copy; other failures toast the sanitized message.
8. **Tests.** Component tests cover: edit open/save/refetch; delete
   confirm/cancel; status change; title does not navigate; "View course" link
   present only when course exists; refetch uses current params; 404 copy.

## Tests

- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): row action cases
  listed in AC 8, plus the existing filter/sort/overdue cases remain green.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — current list page;
  `runFetch(params, initial)` already exists and can be reused for refetch.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — reference for
  `openEdit`/`openDelete`/`handleStatusChange`/`handleDeleted`, `busyIds`,
  `statusBusyIds`, `pendingStatus`, `expandedIds`.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — `courseId` required;
  edit mode ignores it. Widen `assignment` prop type (D124-8).
- `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx` — reads only
  `id` and `title`; widen prop type (D124-8).
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `updateAssignment`,
  `deleteAssignment`, `listAssignments`.
- `apps/web/src/shared/types/academic.ts` — `AssignmentListItem`,
  `CourseAssignment`.

### Element decisions (to be settled by ui-refiner)

- **D124A-1** Placement of Edit/Delete vs. the existing badge cluster and the
  new "View course" affordance on narrow screens (D124-7).
- **D124A-2** Whether the title is a button or a link-styled button, and its
  focus ring (DoD 6).
- **D124A-3** "View course" affordance shape (code chip link vs. icon link) and
  whether it opens in the same tab.

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D124-1 | No backend change. | See parent. |
| D124-2 | Course page unchanged. | See parent. |
| D124-3 | Title opens edit; "View course" remains. | See parent. |
| D124-4 | Refetch, no optimistic update. | See parent. |
| D124-8 | Type widening for reuse. | See parent. |

## Definition of Done

- The eight acceptance criteria pass.
- Validation handles invalid input (edit form reuses SP-114 validation).
- API errors produce actionable messages.
- Loading/empty/error states handled (refetch error toasts; keep last list).
- Keyboard accessibility and responsive layout (DoD 6, 7).
- Automated component tests (DoD 8).
- No API or migration change (DoD 9 not applicable).
- Item 10 is the parent's combined review; item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** A student can edit, delete, and change status of an assignment
  on the cross-course list, with the title opening edit and a separate
  "View course" link, refetching after each mutation.
- **Time estimate:** 2–2.5 hours, including type widening, refetch helper,
  busy state, and component tests.
- **Files:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (+ test);
  `apps/web/src/features/courses/ui/AssignmentForm.tsx` (type widen);
  `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx` (type widen).
  No backend, schema, or route change.
- **Start context:** this file, the parent README, the inspected paths, and the
  SP-124A element decisions. Do not read SP-122's correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** UI/UX gaps to be settled by ui-refiner before
  Ready. Excludes subtasks (SP-124B) and create (SP-124C).

## UI/UX gaps (for ui-refiner)

1. Row action layout: where Edit/Delete sit relative to the status Select and
   the badge cluster on desktop and at mobile widths (touch targets ≥ 44 px).
2. Title affordance: button vs. link-styled button, focus ring, hover state.
3. "View course" affordance: code chip link vs. icon link; same-tab vs.
   new-tab; placement.
4. Status Select width and placement in the row; disabled styling in flight.
5. Refetch feedback: whether a subtle spinner is shown during background refetch
   (the page already has `isFetching` + Loader2).