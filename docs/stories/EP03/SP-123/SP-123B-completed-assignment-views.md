# SP-123B: Completed Assignment Views

**Story ID:** SP-123B
**Title:** Frontend: completed assignment views on the course page (show-completed affordance)
**Parent:** [SP-123](./SP-123-overdue-and-completed-assignment-views.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent review
**Dependencies:** SP-121B reviewed (finished/unfinished partition exists). No hard dependency on SP-123A, but A should land first so the model file stays coherent.
**Jira key:** Pending creation
**Refined:** 2026-10-26 (ui-refiner)

## Summary

Finished (completed, submitted, graded) assignments become visible again on the
course page through an explicit show-completed affordance, satisfying the view
half of AC-E03-05: completing an assignment removes it from the unfinished-work
view, but the record persists and remains reachable. The course projection
already returns every status (D121-5), so no refetch is needed to reveal them.

## Bounded scope

In: the show-completed affordance and the finished-assignment rendering in
`AssignmentsSection`; the empty-state variants; component tests; the parent
index at `./artifacts/SP-123/implementation.md`; the DoD-10 browser note.

Out: the API or schema. Overdue identification ([SP-123A](./SP-123A-overdue-identification.md)).
Status transitions — SP-121. Filters/sort/search — SP-122. Dashboard widgets —
EP05. If implementation needs a new route or a backend change, stop and return
that split to the planner.

## Source requirement references

- **AC-E03-05** — "Completing an assignment removes it from unfinished-work
  views without deleting it." This child owns the view half: finished
  assignments are reachable again through the show-completed affordance. The
  transition half is SP-121A/B.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 5, 6, 7, 8, 10. Items 2, 3, 4, 9 are not applicable (no API
  change). Item 11 is the final reviewer walkthrough for the parent.
- Contract and D121-4/D121-5/D121-7/D123-3 in the [SP-121 README](../SP-121/README.md)
  and this parent's [decision register](#decisions).

## Acceptance criteria

1. **Default view unchanged.** With the affordance collapsed/closed, the
   section renders only unfinished assignments (`PENDING`, `IN_PROGRESS`), as
   today, in API order. No regression to SP-121B's behavior.
2. **Reveal.** A disclosure `Button` (ghost, `size="sm"`, `ChevronDown`
   leftIcon) placed below the unfinished list (and inside the all-complete
   empty state) reveals the finished assignments (`COMPLETED`, `SUBMITTED`,
   `GRADED`) without a network request, because they are already in the
   `assignments` prop. Collapsed label `Show completed (N)`; expanded label
   `Hide completed (N)`. It uses `aria-expanded` and
   `aria-controls="completed-assignments"` (button id
   `completed-assignments-toggle`). The revealed rows render in API order in a
   `role="region"` container with the same row affordances as unfinished rows
   (status `Select`, edit, delete, subtasks) so a student can reopen a finished
   assignment. Focus stays on the toggle on reveal/hide.
3. **Counts.** The control communicates how many finished assignments are
   available to reveal (e.g. "Show completed (N)"), with `N` derived from the
   finished subset. When `N === 0` the control is not rendered.
4. **Empty states.**
   - No assignments at all → `No assignments yet.` + `Add your first assignment`
     CTA (unchanged).
   - Assignments exist but all are finished → `All assignments are complete.`
     plus the show-completed affordance revealing them.
   - Unfinished and finished both present → unfinished list plus the
     affordance; finished rows appear only after reveal.
5. **Toggle semantics.** Revealing and hiding does not mutate data, send a
   request, or move focus (focus stays on the toggle). The revealed state
   (`showCompleted`) resets to `false` whenever the `assignments` prop changes
   identity (D123-5), so a refetch cannot leave stale revealed rows.
6. **Accessibility.** The control is a `Button` (keyboard-operable, visible
   focus ring, accessible name = `Show completed (N)` / `Hide completed (N)`,
   `aria-expanded` + `aria-controls`). The revealed region is a
   `role="region"` with `aria-labelledby="completed-assignments-toggle"`, only
   rendered while expanded, and reachable by Tab. Finished rows keep the same
   keyboard behavior as unfinished rows (status `Select`, Edit, Delete, subtask
   disclosure). DoD 6, 7 hold at desktop and mobile widths.
7. **Tests.** Component tests cover: default shows only unfinished; reveal
   shows finished rows without a request; hide returns to unfinished-only;
   counts; the three empty-state variants; revealed rows keep the status
   control; no DELETE/PATCH is sent by reveal/hide.
8. **Parent index.** `./artifacts/SP-123/implementation.md` is written,
   summarizing A and B's evidence with checkpoint links.
9. **DoD-10.** A manual browser pass of the completed view (reveal/hide,
   empty states, keyboard, narrow width) is executed and recorded in
   `./artifacts/SP-123B/implementation.md` (or a linked note), or a documented
   exception is recorded with the session owner's authorization (the SP-113C
   precedent).

## UI/UX gaps (ui-refiner)

Settled 2026-10-26 by `ui-refiner`; the former gap list is the `Decisions`
section of Technical notes (D123B-1…). No gap remains open before
implementation.

## Tests

- `features/courses/ui/AssignmentsSection.test.tsx` (extend): the cases listed
  in AC 7, including: default shows only unfinished; reveal shows finished rows
  without a request (`updateAssignment`/`deleteAssignment` not called); hide
  returns to unfinished-only; counts in the toggle label; the three empty-state
  variants (no assignments; all finished shows the message plus the toggle;
  mixed); revealed rows keep the status `Select`, Edit, Delete, and subtask
  disclosure; reveal/hide send no DELETE/PATCH; `showCompleted` resets to
  `false` when the `assignments` prop changes identity; toggle uses
  `aria-expanded`/`aria-controls`; revealed region is `role="region"`.
- No new API or e2e tests (no backend change).

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — unfinished filter
  (`assignments.filter(isUnfinishedAssignment)`), the `All assignments are
  complete.` empty state, the `data-assignment-focus` + layout-effect focus
  restoration, expanded/busy ids (SP-120J pattern).
- `apps/web/src/entities/assignment/model/status.ts` — `isFinishedAssignment`
  already exists (D121-4).
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — one `getCourse`
  fetch; the section receives the full `assignments` array; no new fetch is
  needed to reveal finished rows.
- `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` — existing
  empty-state and focus assertions.

### Element decisions

- **Reuse `isUnfinishedAssignment` / `isFinishedAssignment`** (D123-4) for the two subsets; no new predicate.
- **Reuse the existing row markup** by extracting a small `renderAssignmentRow(assignment)` helper inside `AssignmentsSection` so unfinished and finished rows stay identical (status `Select`, badges, Edit, Delete, subtask disclosure). No new component file.
- **Reuse `Button`** (ghost, `size="sm"`, `ChevronDown` leftIcon) for the affordance, matching the subtask disclosure. No new shared primitive.
- **Reuse `clsx`** for conditional classes; no opacity/muting classes on finished rows.
- **New state only:** `showCompleted: boolean`, reset on `assignments` identity change. No new prop.

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D123-3 | The completed view is client-side on the course page; the course projection already returns every status (D121-5), so no refetch and no API change. | D121-5 (one-fetch pattern) + D121-7 (interim gap closed here). Reversible. |
| D123-4 | Finished = `COMPLETED | SUBMITTED | GRADED` (D121-4); the same predicate (`isFinishedAssignment`) is reused. | D121-4. |
| D123-5 | The affordance resets its revealed state when the `assignments` prop changes identity, following the SP-120J expanded-ids pattern, so a refetch cannot leave stale rows. | SP-120J precedent. |
| D123-6 | UI affordance choice, placement, copy, de-emphasis, and focus management are **settled by ui-refiner** (D123B-1…6 below); no longer deferred. | Planner assessment per the UI/UX handoff (D123-7); now settled. |
| D123B-1 | **Affordance — disclosure button.** A `Button` (`variant="ghost"`, `size="sm"`, `ChevronDown` leftIcon rotating 180° when expanded) placed below the unfinished list (and inside the all-complete empty state). Uses `aria-expanded` + `aria-controls="completed-assignments"`; button id `completed-assignments-toggle`. Not tabs (would hide unfinished context) and not an always-visible section (would clutter the half-width card and lose the on-demand reveal). | Matches the subtask disclosure and the course-page "Show more/less" disclosure; keeps unfinished rows primary. |
| D123B-2 | **Placement.** When unfinished rows exist: disclosure sits below the `<ul>` with a top border separator (`mt-4 border-t border-secondary-100 pt-3`). When all assignments are finished: the `All assignments are complete.` message renders, then the disclosure below it. When `N === 0`: the disclosure is not rendered. | Keeps the reveal control adjacent to the content it affects; avoids a floating control. |
| D123B-3 | **Copy.** Collapsed: `Show completed (N)`. Expanded: `Hide completed (N)`. Revealed region: `role="region"` with `aria-labelledby="completed-assignments-toggle"`; no separate visible heading and no empty state (the control is hidden when `N === 0`). Count is `finished.length`. | Short, parallel, matches the status/priority label style; the count satisfies AC 3. |
| D123B-4 | **No de-emphasis.** Finished rows render identically to unfinished rows; the status pill (green/teal/violet) distinguishes them. Rows stay fully interactive (status `Select` to reopen, edit, delete, subtasks). The overdue pill (SP-123A) never renders on a finished row because `isOverdueAssignment` returns `false` for finished statuses. | Mutating or fading finished rows would imply disabled/non-interactive; the status badge already encodes state; avoids double-encoding and WCAG contrast risk. |
| D123B-5 | **Focus management.** Focus stays on the disclosure toggle on both reveal and hide. The revealed region is reachable by Tab after the toggle. No auto-focus into the list. At narrow widths the toggle and rows follow the existing `sm:` stacking; no new touch target is introduced beyond the toggle (already a `Button`). | Matches the subtask disclosure; avoids focus jumps on repeated toggling; keeps keyboard flow predictable. |
| D123B-6 | **State reset.** `showCompleted` resets to `false` whenever the `assignments` prop changes identity (D123-5), implemented as `useEffect(() => setShowCompleted(false), [assignments])`. A refetch therefore never leaves stale revealed rows. | D123-5 precedent (SP-120J expanded-ids pattern adapted to a single boolean). |
| D123B-7 | **Responsive.** No new breakpoint work: the disclosure is an inline `Button` that wraps naturally; the revealed `<ul>` reuses the existing `divide-y` list. Desktop and mobile widths keep the existing row stacking (`flex-col` below `sm`, `sm:flex-row`). | Verification item; no control beyond the toggle is added. |

## Definition of Done

- The nine acceptance criteria pass.
- Loading/empty (all three variants) and error behavior holds (DoD 5).
- The affordance is keyboard-accessible and works at desktop and mobile widths
  (DoD 6, 7).
- Component tests pass (DoD 8).
- The parent index and DoD-10 note are written.
- Item 10 is the parent's combined review; item 11 is the reviewer's
  walkthrough.

## Sizing

- **Outcome:** A student can reveal finished assignments on the course page
  without a refetch, with counts, empty states, and accessibility, plus the
  parent index and DoD-10 browser note.
- **Time estimate:** 2–2.5 hours, including the affordance, the finished-row
  rendering, the empty states, component tests, the index, and the browser
  note. UI/UX is now settled (D123B-1…7).
- **Files:** `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (+ test);
  `./artifacts/SP-123/implementation.md`; DoD-10 note. No backend, schema, or
  route change.
- **Start context:** this file, the UI/UX gaps above, the SP-123 README, and
  the inspected paths. Do not read SP-122's correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentsSection.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`. The parent index and DoD-10 note exist at the recorded paths.
- **Dependencies / exclusions:** UI/UX settled by `ui-refiner` (done
  2026-10-26). A should land first so the model file stays coherent. Excludes
  the API, overdue identification
  ([SP-123A](./SP-123A-overdue-identification.md)), status transitions, and
  filters.

## UI/UX refinement callout

UI/UX settled by `ui-refiner` on 2026-10-26 (D123B-1…7). No further
ui-refiner pass required before implementation.