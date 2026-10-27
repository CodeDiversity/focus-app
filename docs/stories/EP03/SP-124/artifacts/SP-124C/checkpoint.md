# SP-124C checkpoint — shared create on the list

**Story:** [SP-124C](../../SP-124C-shared-create.md)
**Status:** Implemented — awaiting parent review
**Started / finished:** 2026-10-26
**Execution state:** [SP-124 README](../../README.md#execution-queue) — A, B and C implemented; the combined parent review is next.
**Review unit:** SP-124 combined parent review (`../SP-124/implementation.md`).
**Role / scope:** implementer; frontend only. Course select in the shared form, list header/empty-state entry points, parent index and DoD-10 note.

## Progress

- [x] Read queue, refined story, SP-124A/B records, form/dialogs/page code and existing suites
- [x] Extend `AssignmentForm` (optional `courseId`, `courses`, `initialCourseId`, Course select, `courseId` in the 400 map, create payload)
- [x] Forward the new props through `AssignmentDialogs`
- [x] Wire `AssignmentsPage`: header Add, dual empty-state CTAs, courses/active filter into the dialogs
- [x] Extend `AssignmentForm.test.tsx` (9 cases) and `AssignmentsPage.test.tsx` (5 cases, copy update)
- [x] Parent index + DoD-10 browser note (`../SP-124/implementation.md`)
- [x] Focused tests, full web suite, typecheck, lint; closeout records and commit

## Decisions, findings and deviations

- D124-1/D124-6/D124-10/D124-11 and UI-124C-1…5 implemented as refined.
- Closed D-124B-1 (`courseId` optional; courses supplied) and D-124B-3
  (`data-assignment-focus="add"` now exists for the last-row delete fallback).
- C-124C-1: edit mode never offers course re-assignment (AC 3). Accepted limitation.
- C-124C-2: DoD-10 browser execution is a labelled documented exception; the parent
  reviewer must execute or ratify. No live browser pass is claimed.
- C-124C-3: the empty-state subtitle copy change required updating the existing
  page assertion (done in the same suite).
- C-124C-4: prefill only applies when the course is in the loaded list; otherwise
  the select falls back to `No course` (tested).
- Details, AC mapping and verification: [implementation.md](./implementation.md).

## Verification

- `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` — 146 passed (7 files)
- `pnpm --filter @studypilot/web test` — 670 passed (50 files)
- `pnpm --filter @studypilot/web typecheck` — passed
- `pnpm --filter @studypilot/web lint` — passed (0 warnings)

## Next action

None for C. The coordinator requests one independent combined SP-124 review
(A+B+C) with parent index and DoD-10 note in scope.
