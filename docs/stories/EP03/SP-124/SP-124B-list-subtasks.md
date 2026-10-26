# SP-124B: Subtask Checklist on List-Page Rows

**Story ID:** SP-124B
**Title:** Frontend: subtask checklist on assignment list rows
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (UI/UX gaps; see § UI/UX gaps)
**Dependencies:** SP-120 (subtasks) reviewed; SP-122B (list page) reviewed; benefits from SP-124A landing first (shared row layout). No backend dependency.
**Jira key:** Pending creation

## Summary

A student can expand an assignment row on the cross-course list to manage its
subtasks (add, toggle complete/reopen, reorder, delete) using the existing
`SubtaskChecklist`, with the list refetching after each subtask mutation.

## Bounded scope

In: expand/collapse toggle per row; `SubtaskChecklist` wiring; busy state
locking the disclosure; refetch after subtask mutation; component tests.

Out: row Edit/Delete/status (SP-124A). In-place create (SP-124C). Any backend
change (D124-1). Course-page changes (D124-2 — untouched).

## Source requirement references

- **AC-E03-03** — "Assignments can contain ordered, independently completable
  subtasks." (second surface)
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 4, 5, 6, 7, 8. Items 2, 3, 9, 10, 11 are not applicable or
  parent-level.

## Acceptance criteria

1. **Expand/collapse.** Each list row has a disclosure control showing the
   subtask summary (`subtaskSummary`, reused from `AssignmentsSection`); toggling
   reveals the `SubtaskChecklist` for that assignment. Only one row's checklist
   needs to be expandable at a time (or many — ui-refiner decides); state is
   local and keyed by assignment id.
2. **Subtask mutations.** Add, toggle, reorder, and delete call the existing
   subtask endpoints and trigger a list refetch (via `onChanged` → page refetch).
   The checklist's own `onRefresh` handles partial-reorder failures.
3. **Busy state.** The disclosure control is disabled while that row's checklist
   has a request in flight (`busyIds` set, reused pattern).
4. **Reset on refetch.** Expanded state resets when the assignments array
   changes identity (D124-5), so stale rows do not keep a checklist open.
5. **Errors.** Subtask failures toast the sanitized message (handled inside
   `SubtaskChecklist`); the list keeps its last known state.
6. **Tests.** Component tests cover: expand/collapse; subtask add toggles
   checklist and refetches; busy disables disclosure; reset on refetch.

## Tests

- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): subtask cases
  listed in AC 6.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — host; needs
  `expandedIds`, `busyIds`, and `onSubtaskChanged`/`onSubtaskRefresh`/
  `onSubtaskPending` wiring.
- `apps/web/src/features/courses/ui/SubtaskChecklist.tsx` — reused as-is;
  props are compatible with `AssignmentListItem`.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — `subtaskSummary`
  export and the `expandedIds`/`busyIds` pattern to mirror.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — subtask endpoints
  already exported.

### Element decisions (to be settled by ui-refiner)

- **D124B-1** Expand/collapse control placement and visual (chevron + summary
  text vs. a separate "Subtasks" button) and whether it matches the course page.
- **D124B-2** Whether multiple rows can be expanded simultaneously or only one.
- **D124B-3** Expanded panel indentation/containment within the list row card.

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D124-1 | No backend change. | See parent. |
| D124-5 | Local expanded state, reset on refetch identity. | See parent. |

## Definition of Done

- The six acceptance criteria pass.
- Keyboard accessibility and responsive layout (DoD 6, 7).
- Automated component tests (DoD 8).
- No API or migration change (DoD 9 not applicable).
- Item 10 is the parent's combined review; item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** A student can manage subtasks on an assignment row in the
  cross-course list, with refetch after each mutation.
- **Time estimate:** 1.5–2 hours, including wiring and component tests.
- **Files:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (+ test).
  No backend, schema, or route change. Reuses `SubtaskChecklist`.
- **Start context:** this file, the parent README, the inspected paths, and the
  SP-124B element decisions.
- **Verification:** `pnpm --filter @studypilot/web test -- src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Benefits from SP-124A's row layout (ui-refined).
  Excludes row edit/delete/status (SP-124A) and create (SP-124C).

## UI/UX gaps (for ui-refiner)

1. Expand/collapse control placement and affordance (chevron + summary text).
2. Single vs. multiple expanded rows.
3. Panel containment/indentation within the list row at mobile widths.
4. Busy/disabled styling while a subtask request is in flight.