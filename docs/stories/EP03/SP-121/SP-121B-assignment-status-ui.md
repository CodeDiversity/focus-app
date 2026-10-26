# SP-121B: Assignment Status UI

**Story ID:** SP-121B
**Title:** Frontend: status control on course-detail assignment rows + unfinished-only default view
**Parent:** [SP-121](./SP-121-completion-and-status-tracking.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Reviewed 2026-10-26 (combined SP-121 review — [review](./artifacts/SP-121/review.md) · [walkthrough](./artifacts/SP-121/walkthrough.md))
**Dependencies:** SP-121A implemented (met when A lands). No other blocker.
**Jira key:** Pending creation
**Refined:** 2026-10-26

## Summary

On the course page, a student can set an assignment's status from the
assignment row using a `Select` (all five lifecycle values — D121-2). The
course-detail assignments section is the unfinished-work view: it renders
only unfinished assignments (`PENDING`, `IN_PROGRESS` — D121-4) by default,
so setting a finished status removes the row after the background refetch.
The record persists — a status change is a PATCH, never a delete
(AC-E03-05).

## Bounded scope

In: the shared status helper (`entities/assignment/model/status.ts`) and
its test, the `status` key on `UpdateAssignmentRequest`, the status `Select`
on the assignment row, the unfinished-only partition and both empty states
in `AssignmentsSection`, the page wiring for announcements, component
tests, the DoD-10 browser note, and the parent index.

Out: the API change ([SP-121A](./SP-121A-assignment-status-api.md)).
Status on create (D121-1). Overdue identification and the
completed/overdue views — story 7 (AC-E03-05 view half, AC-E03-06) —
including any "show completed" affordance (D121-7 records the interim
gap). Search, sorting, filters — story 6. Assignment editing of other
fields — SP-114E (shipped). If implementation needs a new screen, stop and
return that split to the planner. Layout, component choice, and copy are
settled below (Decisions).

## Source requirement references

- **AC-E03-04** — "Students can update assignment status." This child
  owns the visible half.
- **AC-E03-05** — "Completing an assignment removes it from
  unfinished-work views without deleting it." This child owns the
  unfinished-view half: the section renders only unfinished assignments by
  default. The completed view is story 7.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 4, 5, 6, 7, 8, and 10. Item 3 stays enforced by A. Item 9
  is A's contract. Item 11 is the final reviewer walkthrough for the
  parent, not this child's deliverable.
- Contract and D121-1…7 in the [SP-121 README](./README.md).

## Acceptance criteria

1. **Control renders.** Each assignment row in `AssignmentsSection` has a
   shared `Select` (gap settled: all five statuses) showing the current
   status, with an accessible name `Status for <title>`. It occupies the
   status slot in the row's `flex flex-wrap gap-2` cluster; the existing
   priority/type badges, Edit, and Delete stay. The read-only status
   `Badge` is removed (the Select replaces it).
2. **Change.** Choosing a status PATCHes exactly `{ status }` to
   `/assignments/:id` (A's contract). The Select disables while in flight;
   a duplicate submit is blocked.
3. **Success.** The page sets the status-specific sentence in the
   always-present `role="status"` region, background-refetches `getCourse`,
   and moves focus per the settled pattern (gap 3). A failed request toasts
   `We could not update the status. Try again.` and changes nothing.
4. **Unfinished view.** After the refetch, the section renders only
   unfinished assignments (`PENDING`, `IN_PROGRESS` — D121-4), in API order
   as given (no client re-sort). Setting `COMPLETED`, `SUBMITTED`, or
   `GRADED` removes the row from the default view. No DELETE request is
   ever sent by this flow — assert that in the component test.
5. **Empty states.** No assignments at all → the existing
   `No assignments yet.` + `Add your first assignment` CTA, unchanged.
   Assignments exist but all are finished → `All assignments are complete.`
   (text-only line) — never the misleading `No assignments yet.`
6. **Keyboard and narrow width.** The Select is keyboard operable with a
   visible focus ring and an accessible name; the section works at desktop
   and mobile widths without horizontal scroll (DoD 6, 7).

## UI/UX decisions (settled)

Control choice, placement, disappearing row/focus, all-finished empty
state, interim reachability, filter mechanics, and copy are settled below
(Decisions). No open UI gaps remain.

## Tests

Named per AC (assert exact request objects; exact-object `toEqual` proves
the key set). Vitest + Testing Library, same style as
`AssignmentsSection.test.tsx`.

- `entities/assignment/model/status.test.ts` (new): the helper —
  `PENDING`/`IN_PROGRESS` are unfinished; `COMPLETED`/`SUBMITTED`/
  `GRADED` are finished.
- `assignmentApi.test.ts`: `updateAssignment` sends `status` through
  (exact body `{ status: 'COMPLETED' }`); no new API module.
- `AssignmentsSection.test.tsx`: the Select renders the current status
  with accessible name `Status for <title>` and all five options in
  lifecycle order; choosing one PATCHes exactly `{ status }`; in-flight
  disables the Select; success refetches and announces the status-specific
  sentence; a finished status removes the row from the rendered list and
  sends no DELETE; unfinished rows render in given order; the two empty
  states (`No assignments yet.` and `All assignments are complete.`); a
  failed PATCH toasts `We could not update the status. Try again.` and
  keeps the row; focus moves to the next unfinished row's Select (or
  previous, or the header Add control).
- `CourseDetailPage` wiring (extend an existing test or add one focused
  case): a status change sets the settled live-region sentence and
  background-refetches.
- **DoD-10:** one manual browser pass on course detail: set each status
  on a row, confirm the row disappears exactly on the finished statuses,
  confirm the all-finished empty state, Tab through the control, and
  check the row at a phone width. Record the pass or the blocker in
  `./artifacts/SP-121B/implementation.md`. This is closeout for this
  child, not a separate story.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/shared/types/academic.ts` — `AssignmentStatus` is the
  five-value union; `Assignment.status: AssignmentStatus`.
  `CourseAssignment` carries it through the course projection.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` —
  `UpdateAssignmentRequest` has no `status` key; `updateAssignment` sends
  the patch object through. Add `status?: AssignmentStatus | null`.
- New: `apps/web/src/entities/assignment/model/status.ts` — the shared
  predicate (D121-5). `entities/assignment/` currently has only `api/`;
  `model/` is the FSD slot for it. Story 7 reuses this helper for the
  overdue rule (unfinished + past due).
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — read-only
  status `Badge` (`STATUS_STYLES`/`STATUS_LABELS`, all five values) in
  the row's `flex flex-wrap gap-2` cluster; the section renders
  `assignments` as-is with the `No assignments yet.` empty state; delete
  focus restoration uses `data-assignment-focus` + a layout effect;
  expanded/busy ids survive refetch (the SP-120J pattern).
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — one `getCourse`
  fetch; `role="status"` live region; `handleAssignmentChanged` announces
  `Assignment added.` / `Assignment updated.` / `Assignment deleted.` and
  background-refetches (D112B-10). A status change uses its own callback
  (the subtask precedent) because the announcement is status-specific.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — the `Select`
  precedent for priority (the SP-115H control).
- `apps/web/src/shared/ui/` — `Button` (`primary | outline | ghost |
  danger`, `size="sm"`, `isLoading`, visible focus ring), `Input`,
  `Select` (label/error/hint wrapper around a native `<select>`).
- FSD: the control and any new dialog stay in `features/courses/ui/`
  (D113-4). The helper and client stay in `entities/assignment/`. The
  page keeps importing only `AssignmentsSection`. No new shared primitive
  unless the settled control needs one.

### Decisions (settled 2026-10-26)

1. **Control choice — Select, all five statuses.** Replace the read-only
   status `Badge` with the shared `Select` (`shared/ui/Select`) offering
   `PENDING | IN_PROGRESS | COMPLETED | SUBMITTED | GRADED` in lifecycle
   order. Mirrors `AssignmentForm`'s priority `Select` and D121-2's full
   enum; one control, no new primitive.
2. **Placement — status slot in the wrap cluster.** The Select occupies
   the status slot in the existing `flex flex-wrap gap-2` cluster beside
   the priority/type badges and Edit/Delete. No relocation to the text
   column; the Select wraps like the other pills.
3. **Disappearing row and focus — next unfinished row's Select.** Setting
   a finished status removes the row after refetch; focus moves to the next
   unfinished row's status Select (previous if none; when the last row
   disappears, the header `Add assignment` control). Reuse the
   `data-assignment-focus` + layout-effect pattern; use a
   `status:<id>` focus key. Announcement is status-specific (below).
4. **All-finished empty state — `All assignments are complete.`** A single
   muted text line, no call-to-action. Distinct from `No assignments yet.`
   and signals completion rather than absence.
5. **Interim reachability — accepted as planned.** Finished assignments
   stay persisted (PATCH, never delete) and reappear in story 7's
   completed view; the gap is one story wide. No "show completed"
   affordance is added here (belongs to story 7).
6. **Filter mechanics — confirmed.** One `isUnfinishedAssignment` predicate
   in `entities/assignment/model/status.ts`; no client re-sort; expanded-row
   ids and busy state survive the background refetch (SP-120J pattern).
7. **Copy — status-specific announcements + settled toasts.** Live-region
   sentences: `Assignment set to pending.` / `Assignment marked as in
   progress.` / `Assignment marked as completed.` / `Assignment marked as
   submitted.` / `Assignment marked as graded.` Failure toast:
   `We could not update the status. Try again.` Select options are
   title-cased labels (`Pending`, `In progress`, `Completed`, `Submitted`,
   `Graded`); the Select carries `aria-label="Status for <title>"`.

### Wiring implications (from the decisions above)

- `AssignmentsSection` gains `onAssignmentStatusChanged: (status: AssignmentStatus) => void`.
  The page handler sets the status-specific sentence and background-refetches
  (D112B-10), mirroring the subtask precedent (a dedicated callback, not
  `onAssignmentChanged('updated')`, because the copy is status-specific).
- The Select is controlled by the stored status plus an in-flight pending
  value: on failure the displayed value reverts to the stored status (no
  optimistic drift). On success the refetch supplies the new value.
- `STATUS_STYLES`/`STATUS_LABELS` remain (the Select's option labels and
  any future badge reuse); the row no longer renders the status `Badge`.

### Decisions this child must not reopen

D121-1 fixes create. D121-2 fixes the accepted values. D121-3 fixes null
semantics. D121-4 fixes the unfinished set. D121-5 fixes where the
filter lives. D121-7 records the interim gap. Settling the gaps above is
not a license to add a completed view, overdue badges, or filters — those
are stories 6–7.

## Definition of Done

- The acceptance criteria pass, including the settled control behavior.
- Loading, empty (both states), and error behavior holds (DoD 5).
- The control is keyboard accessible and works at desktop and mobile
  widths (DoD 6, 7).
- Component and helper tests above pass (DoD 8).
- DoD-10 browser note is in `./artifacts/SP-121B/implementation.md`.
- Parent index at `./artifacts/SP-121/implementation.md` links A and B
  evidence and the contract. That index is this child's closeout, not a
  separate story.
- Do not mark the parent reviewed. Item 11 belongs to the reviewer.

## Sizing

- **Outcome:** A student can set an assignment's status from the course
  page, and the course-detail assignments section shows only unfinished
  work by default.
- **Time estimate:** 2–2.5 hours with the UI/UX gaps settled, including
  the helper, the control, the partition and empty states, the client
  type, component tests, and the browser note. The index is closeout, not
  extra scope. Six criteria are one status-control outcome (render,
  change, success, view, empty states, keyboard) — not split. A further
  child would only restate the same row.
- **Files:** new `entities/assignment/model/status.ts` and its test;
  `entities/assignment/api/assignmentApi.ts` and its test;
  `features/courses/ui/AssignmentsSection.tsx` and its test;
  `pages/courses/ui/CourseDetailPage.tsx` (wiring only, if the settled
  announcement needs its own callback). Fixture-only changes: none
  expected — `status` already exists on `CourseAssignment`.
- **Start context:** this file (`UI/UX decisions` + Tests), the SP-121 README
  contract, and A's implementation record for the live response shape. Do
  not read stories 6–7 or the full correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/entities/assignment src/features/courses/ui/AssignmentsSection.test.tsx src/pages/courses/ui/CourseDetailPage.test.tsx` passes. Then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Blocked for code until A is implemented
  and this file's UI/UX gaps are settled by `ui-refiner`. Excludes the API
  change, status on create, overdue/completed views, and filters. Those
  epic ACs stay owned in the [EP03 README](../README.md).