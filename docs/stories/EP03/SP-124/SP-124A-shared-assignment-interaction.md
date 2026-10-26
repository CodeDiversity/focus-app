# SP-124A: Shared Assignment Interaction

**Story ID:** SP-124A
**Title:** Frontend: one assignment interaction owner under `features/assignments`
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Ready
**Dependencies:** SP-114, SP-120, SP-121, and SP-123 reviewed. No backend dependency. No ui-refiner pass — this child preserves the course-page visuals.
**Jira key:** Pending creation

## Summary

Assignment edit, delete, status change, subtasks, badges, and the overdue pill
live in one feature. The course page still behaves as it does today, but it
hosts that feature instead of owning a private copy. The list page does not
gain actions in this child.

## Bounded scope

In: new `features/assignments/` slice; move the assignment action components
out of `features/courses/ui/`; extract `useAssignmentActions` and
`AssignmentRow`; slim `AssignmentsSection` to a course host (header, add,
unfinished/completed grouping) that uses the hook once; move pill constants to
`assignmentPresentation.ts`; retarget imports; keep existing course tests green.

Out: list-page edit/delete/status/subtasks ([SP-124B](./SP-124B-list-adopts-shared-interaction.md)).
List-page create and the course selector ([SP-124C](./SP-124C-shared-create.md)).
Any API or schema change (D124-1). Any visual redesign of the course row (D124-7).

## Source requirement references

- **AC-E03-03** and **AC-E03-04**, plus SP-114 edit/delete — this child owns the
  shared implementation those later list hosts call. The course page remains a
  working surface.
- Shared DoD items 1, 4, 6, 7, 8. Items 2, 3, 5, 9 are not applicable (no new
  input, no new read, no new empty state, no API change). Items 10 and 11 are
  the parent review and reviewer walkthrough.

## Acceptance criteria

1. **One home.** Assignment action UI lives under `apps/web/src/features/assignments/`. `features/courses/ui/` no longer contains `AssignmentForm`, `DeleteAssignmentDialog`, `SubtaskChecklist`, `DeleteSubtaskDialog`, or `AssignmentsSection`. `CourseDetailPage` imports the section from the assignments feature.
2. **One owner.** Status changes, edit/delete dialogs, subtask expand/busy, and focus restoration are implemented only in `useAssignmentActions` + `AssignmentRow`. `AssignmentsSection` calls the hook once and renders `{dialogs}` once.
3. **Shared item.** The hook and the edit/delete components accept `AssignmentInteractionItem` (see the [breakdown contract](./README.md#shared-item)). They do not require `CourseAssignment`.
4. **Presentation.** `STATUS_*`, `PRIORITY_*`, `TYPE_*`, and `OVERDUE_*` are exported from `assignmentPresentation.ts`. The list page's existing label import no longer comes from the course section.
5. **No course-page regression.** Create, edit, delete, status, subtasks, overdue pill, and show-completed on the course page behave as before, including keyboard focus after delete and after a finishing status change.
6. **No list-page behavior change.** `/assignments` still has no edit, delete, status select, or subtask checklist.
7. **Tests.** Moved course-section, form, dialog, and checklist tests pass against the new paths. A hook test proves two hook instances do not share busy state.

## Tests

- Move and keep green: `AssignmentsSection.test.tsx`, `AssignmentForm.test.tsx`, `DeleteAssignmentDialog.test.tsx`, `SubtaskChecklist.test.tsx`, `DeleteSubtaskDialog.test.tsx`.
- New: `features/assignments/model/useAssignmentActions.test.ts` — isolated busy state across two hook renders; status PATCH calls `updateAssignment` with the assignment id and status only.
- `AssignmentsPage.test.tsx` stays green (labels still render; no new controls).

## Technical notes

### Inspected paths (2026-10-26)

- `features/courses/ui/AssignmentsSection.tsx` — the logic to extract (status handler, dialogs, expand/busy, focus effects, badge constants, row renderer).
- `features/courses/ui/AssignmentForm.tsx`, `DeleteAssignmentDialog.tsx`, `SubtaskChecklist.tsx`, `DeleteSubtaskDialog.tsx` — move with their tests.
- `pages/courses/ui/CourseDetailPage.tsx` — import path only.
- `pages/assignments/ui/AssignmentsPage.tsx` — today imports labels from `AssignmentsSection`; retarget that import only.
- `apps/web/.eslintrc.cjs` — features may import features; entities may not import features (D124-9).

### Target files

```text
features/assignments/ui/assignmentPresentation.ts
features/assignments/ui/AssignmentRow.tsx
features/assignments/ui/AssignmentForm.tsx          # moved
features/assignments/ui/DeleteAssignmentDialog.tsx  # moved
features/assignments/ui/SubtaskChecklist.tsx        # moved
features/assignments/ui/DeleteSubtaskDialog.tsx     # moved
features/assignments/ui/AssignmentsSection.tsx      # host only
features/assignments/model/useAssignmentActions.ts
```

Leave re-export shims in `features/courses/ui/` only if a test import cannot move in the same change. Do not keep a second implementation behind a shim. Prefer updating imports and deleting the old files in this child.

### Decisions

D124-1, D124-5, D124-9, D124-10 in the [breakdown](./README.md#decision-register).

## Definition of Done

- The seven acceptance criteria pass.
- Course-page keyboard behavior and focus restoration still work (DoD 6, 7).
- Moved and new tests pass (DoD 8).
- No API or migration change (DoD 9 not applicable).
- Item 10 is the parent review; item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** The course page manages assignments through one shared interaction owner, with no user-visible change.
- **Time estimate:** 2.5–3 hours, including the move, the extraction, and test retargeting. If one window is not enough, checkpoint after the files have moved and the existing course tests are green, then finish the hook extraction. Do not split that into another story.
- **Files:** the target files above, their tests, `CourseDetailPage.tsx` import, and the label import in `AssignmentsPage.tsx`. No backend, schema, or route change.
- **Start context:** this file, the Architecture and Shared item sections of the [SP-124 README](./README.md), and the inspected paths. Do not read SP-122's correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Excludes list-page actions (SP-124B) and the course selector (SP-124C).

## UI/UX gaps

None. This child preserves the current course-row layout, copy, and controls. List-only gaps are on SP-124B and SP-124C.
