# SP-124B: List Page Adopts the Shared Interaction

**Story ID:** SP-124B
**Title:** Frontend: assignment list rows edit in place through the shared owner
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (list-only UI/UX gaps)
**Dependencies:** SP-124A implemented. SP-122B reviewed. No backend dependency.
**Jira key:** Pending creation

## Summary

On `/assignments`, a student can edit, delete, change status, and manage
subtasks without leaving the list. The page is a host: it renders
`AssignmentRow`, mounts the shared dialogs once, and refetches
`GET /assignments` with the current filters. It does not grow its own status
handler, dialog state, or checklist.

## Bounded scope

In: replace the list row's private badge/title markup with `AssignmentRow`;
title opens edit; course meta slot; one `useAssignmentActions` call; refetch
on change; component tests.

Out: a second copy of edit/delete/status/subtask logic (forbidden by D124-10).
Create ([SP-124C](./SP-124C-shared-create.md)). Course-page changes beyond what
A already did. API or schema changes.

## Source requirement references

- **AC-E03-03**, **AC-E03-04**, and SP-114 edit/delete — second surface, same
  implementation as A.
- Shared DoD items 1, 4, 5, 6, 7, 8. Items 2, 3, 9 are not applicable. Items
  10 and 11 are the parent review and reviewer walkthrough.

## Acceptance criteria

1. **Shared row.** Each list row is an `AssignmentRow`. Status, edit, delete, overdue pill, badges, and the subtask disclosure come from the shared owner. `AssignmentsPage` does not define its own status `Select`, delete handler, or `SubtaskChecklist` wiring.
2. **Title edits.** Activating the title opens the shared edit form for that assignment. It does not navigate to `/courses/:id`.
3. **View course.** When the row has a course, a separate affordance navigates to `/courses/:id`. When `course` is null, that affordance is absent. Shape and placement are the ui-refiner decision (D124-7); the destination is not optional.
4. **Refetch.** After edit, delete, status, or subtask change, the page refetches with the current filter/sort/search params and keeps those controls. A failed refetch toasts the sanitized message and keeps the last list.
5. **One hook.** The page calls `useAssignmentActions` once and renders its `dialogs` once.
6. **Errors.** A 404 from edit or delete shows the existing uniform not-found copy. Other failures toast the sanitized message.
7. **Tests.** Component tests cover title-opens-edit (no course navigation), view-course only when a course exists, status change refetches with current params, delete removes the row after refetch, and subtask expand uses the shared checklist.

## Tests

- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): the cases in AC 7, plus the existing filter/sort/overdue cases stay green.
- Do not add a second checklist or dialog test suite here; those stay with the moved component tests from A.

## Technical notes

### Inspected paths (2026-10-26)

- `pages/assignments/ui/AssignmentsPage.tsx` — private row markup (title `Link`, badges, overdue pill) is what this child replaces. `runFetch(params, initial)` already exists and is the refetch.
- Shared exports from A: `useAssignmentActions`, `AssignmentRow`, `assignmentPresentation.ts`.

### Host rules

- Pass `AssignmentListItem` values as `AssignmentInteractionItem`. The course chip is a slot, not a field the row fetches.
- Do not filter to unfinished rows. The list already shows the API result (SP-122). Show-completed stays on the course host only.
- Do not optimistic-update the list (D124-4).

### Decisions

D124-2, D124-3, D124-4, D124-5, D124-10.

### UI/UX gaps (for ui-refiner)

1. Title control: button vs link-styled button, focus ring, hover. It must not look like the course navigation it replaces.
2. "View course" affordance: code chip, text link, or icon link; placement beside the title; same tab. Destination is `/courses/:id`.
3. How the course chip sits next to the shared badge cluster at widths under `sm` without dropping the status select below a 44 px target.
4. Whether a background refetch uses the page's existing `isFetching` spinner (already present) or stays silent.

Do not restyle the shared Edit, Delete, status select, or subtask disclosure. Those are settled on the course row and stay shared.

## Definition of Done

- The seven acceptance criteria pass.
- Refetch errors are actionable (DoD 4, 5).
- New list controls are keyboard accessible and usable at desktop and mobile widths (DoD 6, 7).
- Component tests pass (DoD 8).
- No API or migration change.
- Item 10 is the parent review; item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** A student edits, deletes, changes status, and manages subtasks on the assignment list without a second implementation of those actions.
- **Time estimate:** 1.5–2 hours after A, including the host wiring and list tests.
- **Files:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and its test. No new mutation module.
- **Start context:** this file, the Architecture section of the [SP-124 README](./README.md), A's exports, and `AssignmentsPage.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test -- src/pages/assignments/ui/AssignmentsPage.test.tsx src/features/assignments` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Blocked for code until A is implemented and ui-refiner has settled the gaps above. Excludes create (SP-124C).
