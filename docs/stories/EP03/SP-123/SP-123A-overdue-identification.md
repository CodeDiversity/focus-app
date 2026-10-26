# SP-123A: Overdue Identification

**Story ID:** SP-123A
**Title:** Frontend: overdue identification (shared predicate + indicator on course detail and the list page)
**Parent:** [SP-123](./SP-123-overdue-and-completed-assignment-views.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent review
**Dependencies:** SP-121B reviewed (finished/unfinished predicate exists). No backend dependency.
**Jira key:** Pending creation
**Refined:** 2026-10-26 (ui-refiner)

## Summary

A student can tell at a glance which unfinished assignments are past their
deadline. The overdue rule lives in one shared predicate in
`entities/assignment/model/status.ts` (alongside `isUnfinishedAssignment`),
and an overdue indicator (text plus color — never color alone) renders on
assignment rows in both the course-detail section and the cross-course list
page. No API, schema, or status change is involved.

The indicator is a small red pill reading "Overdue", placed on the due-date
line immediately beside the rendered due date. The due date itself stays
neutral in color. The indicator is a text label (never icon-only) so it is
readable by assistive technology, and the due date remains part of the row's
accessible text.

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
   assignments return `false`. The helper accepts an object carrying `status`
   and `dueDate` (e.g. `CourseAssignment`, `AssignmentListItem`, or any
   `{ status, dueDate }` row), so both surfaces can call it without reshaping.
2. **Course detail.** An overdue unfinished assignment row shows an overdue
   indicator — a red pill reading "Overdue" (`bg-red-100 text-red-700`,
   `rounded-full` pill shape) — on the due-date line immediately beside the
   rendered due date. The due date is still rendered in its neutral color.
   Non-overdue rows are unchanged.
3. **List page.** The same pill ("Overdue", red, same shape) renders on each
   overdue row of `AssignmentsPage`, on the due-date line beside the date, in
   the same visual language as the course detail (shared `OVERDUE_STYLE`
   constant and `OVERDUE_LABEL`).
4. **Accessibility.** The indicator is a text label (not an icon-only glyph)
   readable by assistive technology, and the due date remains part of the row's
   accessible text (it is not removed or replaced by the indicator). DoD 6, 7
   hold at desktop and mobile widths.
5. **No regression.** Status control, subtasks, edit/delete, filters, sort,
   and search behave as before; no new request is sent by this child.
6. **Tests.** Helper unit tests cover: unfinished + past due → true; unfinished
   + future due → false; finished + past due → false; null due date → false;
   `now` override. Component tests on both surfaces cover: overdue row shows
   the "Overdue" pill; non-overdue row does not; finished row does not (the
   course-detail view shows only unfinished rows, so a finished row is absent).

## Tests

- `entities/assignment/model/status.test.ts` (extend): `isOverdueAssignment`
  cases listed in AC 6, including a `now` override for determinism.
- `features/courses/ui/AssignmentsSection.test.tsx` (extend): overdue row shows
  the "Overdue" pill with `bg-red-100 text-red-700`; non-overdue and finished
  rows do not; the due-date line keeps its neutral color on overdue rows.
- `pages/assignments/ui/AssignmentsPage.test.tsx` (extend): overdue row shows
  the "Overdue" pill; non-overdue row does not.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/entities/assignment/model/status.ts` — `isUnfinishedAssignment`,
  `isFinishedAssignment`, `ASSIGNMENT_STATUSES` (D121-4/D121-5). The new
  predicate belongs here so story 7 and EP05 reuse one rule.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — unfinished rows
  render the due date (`Due ${formatDate(...)}` / `No due date`) and the
  status `Select` cluster. The indicator slots into the existing row on the
  due-date line. Exports `STATUS_STYLES`, `TYPE_STYLE`, etc.; add
  `OVERDUE_STYLE` and `OVERDUE_LABEL` here so the list page reuses them.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — row renders the due
  date line and the badge cluster; reuse the shared overdue constants.
- `apps/web/src/shared/lib/datetime.ts` — `formatDate` for the due date.
- `apps/web/src/shared/types/academic.ts` — `AssignmentStatus`,
  `AssignmentListItem` (carries `dueDate`, `status`), `CourseAssignment`.

### Element decisions

- **Reuse `isUnfinishedAssignment`** as the unfinished half of the overdue
  rule; do not duplicate the status set (D123-1).
- **Reuse the existing pill shape** (`inline-flex items-center rounded-full
  px-2.5 py-0.5 text-xs font-medium`) and the established palette convention
  (D112B-4) for the overdue pill; no new shared primitive.
- **New constants only:** `OVERDUE_STYLE = 'bg-red-100 text-red-700'` and
  `OVERDUE_LABEL = 'Overdue'`, exported from `AssignmentsSection` so the list
  page imports them (mirrors `STATUS_STYLES`/`TYPE_STYLE` reuse).
- **No new component file.** The indicator is an inline `<span>` in both
  surfaces, keeping the change to the two existing row renderers.
- **No icon.** The text label carries the meaning; color reinforces (DoD 6).

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D123-1 | Overdue is computed client-side from `dueDate` + `status`; no API field, filter, or schema change. The predicate reuses `isUnfinishedAssignment`. | D121-5 (client-side filter precedent) + D113-5 (past due dates accepted at create). Reversible: a backend `overdue` filter can be added later without breaking this. |
| D123-2 | Overdue boundary is the assignment's `dueDate` timestamp vs. the current time (strictly before → overdue). No end-of-day grace. | Planner-recorded, reversible; a whole-day grace would be a product change and is flagged here rather than silently chosen. |
| D123-3 | The indicator is text plus color (DoD 6); color never carries the meaning alone. | DoD 6 + the existing badge palette convention (D112B-4). |
| D123-4 | UI placement, copy, color token, and icon are **settled by ui-refiner** (see D123A-1…6 below); no longer deferred. | Planner assessment per the UI/UX handoff (D123-7); now settled. |
| D123A-1 | **Placement — beside the due date.** The pill renders on the due-date line immediately after the `Due <date>` text, inside the same row container. It is not added to the badge cluster (status/priority/type/Edit/Delete). | Keeps the deadline and its overdue status as one readable unit; avoids displacing the status Select and Edit/Delete controls; matches the "due date is still rendered" AC. |
| D123A-2 | **Copy — "Overdue".** Single word, title-cased, consistent with the status/priority label style. | Short and unambiguous; reads naturally next to `Due 12 Oct`. |
| D123A-3 | **Color token — red pill.** `OVERDUE_STYLE = 'bg-red-100 text-red-700'`, reusing the established URGENT priority palette and the danger semantic. Pill shape matches the other badges. | Red is the established urgency/danger hue in this codebase (URGENT priority, danger button, error text); a distinct hue is not needed because the label differs. |
| D123A-4 | **No icon.** The pill contains text only; no lucide icon. | Text + color already satisfies DoD 6; an icon would add width and risk duplicating the label for AT. |
| D123A-5 | **Due date stays neutral.** The `Due <date>` text keeps its existing color (`text-secondary-600`, or `text-secondary-500` only when null — but an overdue row always has a date). The overdue cue lives on the pill alone. | Avoids double-encoding and keeps the date legible; color stays paired with text on the pill. |
| D123A-6 | **Responsive — no layout change.** The pill is an inline element on the due-date line; it wraps naturally with the date at narrow widths. No new touch target is introduced (the pill is not interactive), so the ≥ 44 px touch-target rule is unaffected. | Verification item; no control is added, so no responsive breakpoint work is needed. |
| D123A-7 | **Element reuse.** `OVERDUE_STYLE` and `OVERDUE_LABEL` are defined and exported from `features/courses/ui/AssignmentsSection.tsx` and imported by `pages/assignments/ui/AssignmentsPage.tsx`, mirroring `STATUS_STYLES`/`TYPE_STYLE`. The pill uses the shared pill shape classes. | Single source of truth for the visual language across both surfaces (AC 3). |

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
  surfaces, and the tests. UI/UX is now settled (D123A-1…7).
- **Files:** `apps/web/src/entities/assignment/model/status.ts` (+ test);
  `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (+ test);
  `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (+ test). No backend,
  schema, or route change.
- **Start context:** this file, the settled UI/UX decisions above, the SP-123
  README, and the inspected paths. Do not read SP-122's correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/entities/assignment/model/status.test.ts src/features/courses/ui/AssignmentsSection.test.tsx src/pages/assignments/ui/AssignmentsPage.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** UI/UX settled by `ui-refiner` (done 2026-10-26). Excludes the API, the completed
  view ([SP-123B](./SP-123B-completed-assignment-views.md)), status transitions,
  and filters.