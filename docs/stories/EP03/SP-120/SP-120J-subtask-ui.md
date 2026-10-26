# SP-120J: Subtask Checklist UI

**Story ID:** SP-120J
**Title:** Frontend: subtask checklist on course-detail assignment rows
**Parent:** [SP-120](./SP-120-assignment-subtasks.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement — UI/UX gaps below must be settled by `ui-refiner` before code
**Dependencies:** SP-120I implemented (contract and routes) — not yet met. UI/UX gaps must be settled by `ui-refiner` before code.
**Jira key:** Pending creation

## Summary

On the course page, a student can expand an assignment to see its ordered
subtask checklist: add a subtask, mark it complete with a checkbox, move it
up/down, and delete it. The checklist renders from the course-detail
projection (D120-5); mutations re-fetch the course in the background (the
existing D112B-10 pattern).

## Bounded scope

In: the shared `Subtask` type, the subtask client functions in
`entities/assignment/api/`, the checklist component(s) in
`features/courses/ui/` (the D113-4 home), the section wiring, component
tests, the DoD-10 browser note, and the parent index.

Out: standalone tasks, orphaned-subtask surfacing (D120-6), subtask
descriptions/due dates/minutes/priority (D120-3), assignment status
changes (story 5), search/sort/filters (story 6), overdue views (story 7).
If implementation needs a new screen, stop and return that split to the
planner.

## Source requirement references

- **AC-E03-03** — "Assignments can contain ordered, independently
  completable subtasks." This child owns the visible half.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 4, 5, 6, 7, 8, and 10. Item 3 stays enforced by I. Item 9 is
  I's contract. Item 11 is the final reviewer walkthrough for the parent,
  not this child's deliverable.
- Contract and D120-1…8 in the [SP-120 README](./README.md).

## Acceptance criteria

1. **Checklist renders.** Each assignment row in `AssignmentsSection` can
   expand to show its subtasks (ordered by `orderIndex`). A collapsed row
   shows a subtask summary (the exact copy is a ui-refiner decision). An
   assignment with no subtasks shows an empty state with an add
   affordance.
2. **Add.** An input + button (or inline form — a ui-refiner decision)
   creates a subtask with a title. Client validation mirrors the API
   (non-empty, ≤ 200). A 400 field error renders on the input. In-flight
   lock, duplicate submit, and network retry follow the existing form
   behavior.
3. **Toggle.** Each subtask has a checkbox. Checking it sets `status:
   "COMPLETED"`; unchecking sets `status: "PENDING"`. The checkbox is
   keyboard accessible (Space toggles), has an accessible name (the
   subtask title), and announces the change.
4. **Reorder.** Each subtask has up/down buttons (disabled at the ends).
   Moving a subtask swaps its `orderIndex` with the neighbor (two PATCH
   calls). The buttons are keyboard accessible and have accessible names.
5. **Delete.** Each subtask has a delete button (with or without
   confirmation — a ui-refiner decision). 204 → the subtask disappears
   after refetch.
6. **Refetch.** After any subtask mutation, the page re-runs `getCourse`
   in the background (D112B-10); the checklist re-renders from the
   projection. No second fetch source.
7. **States.** Loading (the page's existing loading state covers the
   initial fetch), empty (no subtasks → empty state with add), error
   (mutation failure toasts the sanitized message and keeps the last known
   state).
8. **Keyboard and narrow width.** The checklist is fully keyboard
   operable (Tab order: expand → add input → checkboxes → reorder →
   delete). The row and checklist work at desktop and mobile widths.

## UI/UX gaps (ui-refiner)

Open before implementation — run the `ui-refiner` agent on **SP-120J** to
settle these with the user:

1. **Expand/collapse pattern** — a disclosure button on the row (chevron +
   subtask count) vs. an always-visible checklist vs. a dialog. The row
   already has badges + Edit/Delete; an always-visible checklist would
   make rows very tall.
2. **Subtask summary on the collapsed row** — "3 subtasks, 1 complete" vs.
   just "3 subtasks" vs. a progress bar vs. nothing.
3. **Add-subtask placement** — an inline input at the bottom of the
   expanded checklist vs. an "Add subtask" button that opens a small form
   vs. a dialog.
4. **Checkbox styling** — native checkbox vs. a custom toggle. The
   completed state should have a visual treatment (strikethrough title?
   muted color? both?).
5. **Reorder controls** — up/down arrow buttons vs. drag-and-drop vs.
   both. Drag-and-drop adds significant complexity (and accessibility
   concerns); up/down buttons are simpler and keyboard-friendly.
6. **Delete confirmation** — a confirmation dialog (like
   `DeleteAssignmentDialog`) vs. an inline confirm vs. no confirmation
   (subtasks are low-stakes).
7. **Announcements** — the page's `role="status"` live region announces
   "Assignment added/updated/deleted." Subtask mutations need their own
   announcements ("Subtask added.", "Subtask completed.", etc.) or a
   generic one.
8. **Empty state** — "No subtasks yet." + an add button, matching the
   assignments empty-state pattern.
9. **Copy** — button labels ("Add subtask", "Move up", "Move down",
   "Delete subtask"), empty-state text, aria-labels for icon-only buttons.

## Tests

Named per AC (assert exact request objects; exact-object `toEqual` proves
the key set):

- `SubtaskChecklist.test.tsx` (new): renders ordered subtasks;
  expand/collapse; add (valid, empty, > 200, server 400); toggle
  (PENDING → COMPLETED → PENDING); reorder (up/down, disabled at ends);
  delete; empty state; keyboard (Tab order, Space on checkbox, Enter on
  buttons); narrow width.
- `AssignmentsSection.test.tsx`: the collapsed row shows the subtask
  summary; expanding shows the checklist; existing badges/Edit/Delete
  remain (unchanged assertions).
- `assignmentApi.test.ts` (or a new `subtaskApi.test.ts`): create/list/
  update/delete functions send the exact request shapes.
- Fixture compile fixes, not new behavior: `CourseDetailPage.test.tsx`,
  `entities/course/api/courseApi.test.ts`,
  `DeleteAssignmentDialog.test.tsx` — `CourseAssignment` fixtures need
  `subtasks: []` once the type requires it.
- **DoD-10:** one manual browser pass on course detail after I is deployed
  locally: expand an assignment, add a subtask, toggle it, reorder it,
  delete it, confirm the checklist re-renders after each mutation, and
  check keyboard/narrow behavior. Record the pass or the blocker in
  `./artifacts/SP-120J/implementation.md`. This is closeout for this child,
  not a separate story.

## Technical notes

### Inspected paths (2026-10-25)

- `apps/web/src/shared/types/academic.ts` — the full `Task` type exists.
  Add `Subtask` (the 6-key projection) and add `subtasks: Subtask[]` to
  `CourseAssignment`.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — plain axios
  pattern. Add `listSubtasks`, `createSubtask`, `updateSubtask`,
  `deleteSubtask` (nested under `/assignments/:id/subtasks`).
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — the section
  to extend (D113-4 home). The expand/collapse state and checklist
  component live here or in a new sibling component.
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — the refetch
  pattern (D112B-10). `onAssignmentChanged` triggers the background
  refetch; subtask mutations reuse it.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — react-hook-form
  + zod pattern for forms (the add-subtask input may reuse this pattern or
  be simpler).
- `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx` — the
  confirmation dialog pattern (if ui-refiner decides subtask delete needs
  confirmation).
- `apps/web/src/shared/ui/Button.tsx`, `Input.tsx` — shared UI
  primitives.
- FSD: keep the checklist in `features/courses/ui/` (D113-4). The client
  stays in `entities/assignment/api/`. No lateral feature import.

### Decisions this child must not reopen

D120-1 fixes the model. D120-2 fixes the routes. D120-3 fixes the
projection and DTO fields. D120-4 fixes the status values. D120-5 fixes
the projection join. D120-6 fixes the orphan behavior. D120-7 fixes the
order semantics. Display copy, layout, and interaction patterns are the
open gaps — they are settled by ui-refiner, not by this plan.

## Definition of Done

- The acceptance criteria pass, including client validation and the API
  field error on title.
- Loading, empty, and error behavior holds (DoD 5).
- The checklist is keyboard accessible and works at desktop and mobile
  widths (DoD 6, 7).
- Component tests above pass (DoD 8).
- DoD-10 browser note is in `./artifacts/SP-120J/implementation.md`.
- Parent index at `./artifacts/SP-120/implementation.md` links I and J
  evidence and the contract. That index is this child's closeout, not a
  separate story.
- Do not mark the parent reviewed. Item 11 belongs to the reviewer.

## Sizing

- **Outcome:** A student can manage an ordered subtask checklist on each
  assignment row: add, toggle complete, reorder, delete.
- **Time estimate:** 2.5–3 hours after the UI/UX decisions (pending
  ui-refiner), including the checklist component, client functions,
  component tests, fixture updates, and the browser note. The index is
  closeout, not extra scope.
- **Files:** `shared/types/academic.ts`;
  `entities/assignment/api/assignmentApi.ts` (or new `subtaskApi.ts`) and
  its test; new `features/courses/ui/SubtaskChecklist.tsx` and its test;
  `features/courses/ui/AssignmentsSection.tsx` and its test. Fixture-only:
  `pages/courses/ui/CourseDetailPage.test.tsx`,
  `entities/course/api/courseApi.test.ts`,
  `features/courses/ui/DeleteAssignmentDialog.test.tsx`.
- **Start context:** this file (UI/UX gaps + Tests), the SP-120 README,
  and I's implementation record for the live response shape. Do not read
  stories 5–7 or the full correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/courses/ui/SubtaskChecklist.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx src/entities/course/api/courseApi.test.ts src/features/courses/ui/DeleteAssignmentDialog.test.tsx` passes. Then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Blocked for code until I is implemented
  and this file's UI/UX gaps are settled by `ui-refiner`. Excludes
  standalone tasks, status changes, filters, and overdue views. Those
  epic ACs stay owned in the [EP03 README](../README.md).
