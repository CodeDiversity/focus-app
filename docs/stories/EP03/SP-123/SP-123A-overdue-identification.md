# SP-123A: Overdue Identification

**Story ID:** SP-123A
**Title:** Frontend: overdue identification (shared predicate + indicator on course detail and the list page)
**Parent:** [SP-123](./SP-123-overdue-and-completed-assignment-views.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (UI/UX gaps — see below)
**Dependencies:** SP-121B reviewed (finished/unfinished predicate exists). No backend dependency.
**Jira key:** Pending creation
**Refined:** 2026-10-26 (planning)

## Summary

A student can tell at a glance which unfinished assignments are past their
deadline. The overdue rule lives in one shared predicate in
`entities/assignment/model/status.ts` (alongside `isUnfinishedAssignment`),
and an overdue indicator (text plus color — never color alone) renders on
assignment rows in both the course-detail section and the cross-course list
page. No API, schema, or status change is involved.

## Bounded scope

In: the `isOverdueAssignment` helper and its tests; the overdue indicator on
`AssignmentsSection` rows and `AssignmentsPage` rows; component tests on both
surfaces.

Out: the API or schema. The completed view ([SP-123B](./SP-123B-completed-assignment-views.md)).
Status transitions — SP-121. Filters/sort/search — SP-122. Dashboard widgets —
EP05. If implementation needs a new screen or a backend change, stop and return
that split to the planner.

## Source requirement references

- **AC-E03-06** — "Overdue work is identified from the deadline and completion
  status." This child owns it in full.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 5, 6, 7, 8. Items 3, 4, 9, 10 are not applicable (no API
  change, no ownership surface beyond the existing list; item 10 is the
  parent's combined review). Item 11 is the final reviewer walkthrough for the
  parent.
- Contract and D121-4/D121-5/D123-1 in the [SP-121 README](../SP-121/README.md)
  and this parent's [decision register](#decisions).

## Acceptance criteria

1. **Predicate.** `isOverdueAssignment(value, now?)` returns `true` iff the
   assignment is unfinished (`PENDING` or `IN_PROGRESS`) **and** has a non-null
   `dueDate` whose timestamp is strictly before `now` (defaulting to the
   current time). Null `dueDate`, finished statuses, and not-yet-due
   assignments return `false`. The helper accepts either an
   `AssignmentStatus`-carrying object or a `{ status, dueDate }`-shaped row, so
   both surfaces can call it without reshaping.
2. **Course detail.** An overdue unfinished assignment row shows an overdue
   indicator (text label plus color — never color alone) on the row; the due
   date is still rendered. Non-overdue rows are unchanged.
3. **List page.** The same indicator renders on each overdue row of
   `AssignmentsPage`, in the same visual language as the course detail (per
   ui-refiner).
4. **Accessibility.** The indicator is readable by assistive technology (text
   label, not an icon-only glyph) and does not remove the due date from the
   accessible name. DoD 6, 7 hold at desktop and mobile widths.
5. **No regression.** Status control, subtasks, edit/delete, filters, sort,
   and search behave as before; no new request is sent by this child.
6. **Tests.** Helper unit tests cover: unfinished + past due → true; unfinished
   + future due → false; finished + past due → false; null due date → false;
   `now` override. Component tests on both surfaces cover: overdue row shows
   the indicator; non-overdue row does not; finished row does not.

## UI/UX gaps (Needs refinement)

The following are deliberately left to the `ui-refiner` agent rather than
settled here:

- Indicator placement on the row (beside the due date vs. in the badge
  cluster), its exact copy (`Overdue` vs. `Past due`), color token, and
  whether an icon accompanies the text.
- Whether the due date text itself changes color on overdue rows, in addition
  to the badge.
- Responsive wrapping at narrow widths and touch-target impact (none expected,
  but verify).

## Tests

- `entities/assignment/model/status.test.ts` (extend): `isOverdueAssignment`
  cases listed in AC 6, including a `now` override for determinism.
- `features/courses/ui/AssignmentsSection.test.tsx` (extend): overdue row shows
  the indicator; non-overdue and finished rows do not.
- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): overdue row shows
  the indicator.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/entities/assignment/model/status.ts` — `isUnfinishedAssignment`,
  `isFinishedAssignment`, `ASSIGNMENT_STATUSES` (D121-4/D121-5). The new
  predicate belongs here so story 7 and EP05 reuse one rule.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — unfinished rows
  render the due date (`Due ${formatDate(...)}` / `No due date`) and the
  status `Select` cluster. The indicator slots into the existing row.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — row renders the due
  date line and the badge cluster; reuse `STATUS_STYLES` etc.
- `apps/web/src/shared/lib/datetime.ts` — `formatDate` for the due date.
- `apps/web/src/shared/types/academic.ts` — `AssignmentStatus`,
  `AssignmentListItem` (carries `dueDate`, `status`).

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D123-1 | Overdue is computed client-side from `dueDate` + `status`; no API field, filter, or schema change. The predicate reuses `isUnfinishedAssignment`. | D121-5 (client-side filter precedent) + D113-5 (past due dates accepted at create). Reversible: a backend `overdue` filter can be added later without breaking this. |
| D123-2 | Overdue boundary is the assignment's `dueDate` timestamp vs. the current time (strictly before → overdue). No end-of-day grace. | Planner-recorded, reversible; a whole-day grace would be a product change and is flagged here rather than silently chosen. |
| D123-3 | The indicator is text plus color (DoD 6); color never carries the meaning alone. | DoD 6 + the existing badge palette convention (D112B-4). |
| D123-4 | UI placement, copy, color token, and icon are left to ui-refiner (see gaps above). | Planner assessment per the UI/UX handoff; do not invent UI decisions. |

## Definition of Done

- The six acceptance criteria pass.
- Loading/empty/error behavior is unchanged (DoD 5).
- The indicator is keyboard-accessible and works at desktop and mobile widths
  (DoD 6, 7).
- Helper and component tests pass (DoD 8).
- No API or migration change (DoD 9 is not applicable).
- Item 10 is the parent's combined review; item 11 is the reviewer's
  walkthrough.

## Sizing

- **Outcome:** A student can identify overdue unfinished assignments at a
  glance on both the course page and the cross-course list, via one shared
  predicate and a text-plus-color indicator.
- **Time estimate:** 1.5–2 hours, including the helper, the indicator on two
  surfaces, and the tests. Uncertainty is the indicator placement/copy, which
  ui-refiner settles.
- **Files:** `apps/web/src/entities/assignment/model/status.ts` (+ test);
  `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (+ test);
  `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (+ test). No backend,
  schema, or route change.
- **Start context:** this file, the UI/UX gaps above, the SP-123 README, and
  the inspected paths. Do not read SP-122's correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/entities/assignment/model/status.test.ts src/features/courses/ui/AssignmentsSection.test.tsx src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Blocked for code until this file's UI/UX gaps
  are settled by `ui-refiner`. Excludes the API, the completed view
  ([SP-123B](./SP-123B-completed-assignment-views.md)), status transitions,
  and filters.

## UI/UX refinement callout

This story needs a `ui-refiner` pass before implementation: overdue indicator
placement, copy, color token, optional icon, and due-date color treatment are
unsettled. Run `ui-refiner` on **SP-123A**.