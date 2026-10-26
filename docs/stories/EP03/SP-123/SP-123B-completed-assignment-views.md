# SP-123B: Completed Assignment Views

**Story ID:** SP-123B
**Title:** Frontend: completed assignment views on the course page (show-completed affordance)
**Parent:** [SP-123](./SP-123-overdue-and-completed-assignment-views.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (UI/UX gaps — see below)
**Dependencies:** SP-121B reviewed (finished/unfinished partition exists). No hard dependency on SP-123A, but A should land first so the model file stays coherent.
**Jira key:** Pending creation
**Refined:** 2026-10-26 (planning)

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
2. **Reveal.** A control (placement and copy settled by ui-refiner) reveals
   the finished assignments (`COMPLETED`, `SUBMITTED`, `GRADED`) without a
   network request, because they are already in the `assignments` prop. The
   revealed rows render with the same row affordances as unfinished rows
   (status `Select`, edit, delete, subtasks) so a student can reopen a finished
   assignment.
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
   request, or change focus except as specified by ui-refiner. The expanded
   state resets when the `assignments` prop changes identity (the SP-120J
   pattern for expanded/busy ids), so a refetch does not leave stale revealed
   rows.
6. **Accessibility.** The control is keyboard-operable with a visible focus
   ring and an accessible name; the revealed region is announced or otherwise
   reachable (per ui-refiner). DoD 6, 7 hold at desktop and mobile widths.
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

## UI/UX gaps (Needs refinement)

The following are deliberately left to the `ui-refiner` agent rather than
settled here:

- Affordance choice (disclosure button, toggle, tabs, or a separate
  "Completed" section) and its placement relative to the unfinished list.
- Copy for the control and the revealed region's heading/empty state.
- Whether revealed finished rows are visually de-emphasized (opacity, muted
  styling) and how overdue styling (A) interacts with finished rows (finished
  rows are never overdue).
- Focus management when revealing/hiding and at narrow widths.

## Tests

- `features/courses/ui/AssignmentsSection.test.tsx` (extend): the nine cases
  listed in AC 7.
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

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D123-3 | The completed view is client-side on the course page; the course projection already returns every status (D121-5), so no refetch and no API change. | D121-5 (one-fetch pattern) + D121-7 (interim gap closed here). Reversible. |
| D123-4 | Finished = `COMPLETED | SUBMITTED | GRADED` (D121-4); the same predicate (`isFinishedAssignment`) is reused. | D121-4. |
| D123-5 | The affordance resets its revealed state when the `assignments` prop changes identity, following the SP-120J expanded-ids pattern, so a refetch cannot leave stale rows. | SP-120J precedent. |
| D123-6 | UI affordance choice, placement, copy, and focus management are left to ui-refiner (see gaps above). | Planner assessment per the UI/UX handoff; do not invent UI decisions. |

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
  note. Uncertainty is the affordance choice, which ui-refiner settles.
- **Files:** `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (+ test);
  `./artifacts/SP-123/implementation.md`; DoD-10 note. No backend, schema, or
  route change.
- **Start context:** this file, the UI/UX gaps above, the SP-123 README, and
  the inspected paths. Do not read SP-122's correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentsSection.test.tsx` passes, then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`. The parent index and DoD-10 note exist at the recorded paths.
- **Dependencies / exclusions:** Blocked for code until this file's UI/UX gaps
  are settled by `ui-refiner`. Excludes the API, overdue identification
  ([SP-123A](./SP-123A-overdue-identification.md)), status transitions, and
  filters.

## UI/UX refinement callout

This story needs a `ui-refiner` pass before implementation: affordance choice,
placement, copy, finished-row de-emphasis, and focus management are unsettled.
Run `ui-refiner` on **SP-123B**.