# SP-121B implementation record

**Story:** [SP-121B — Assignment Status UI](../../SP-121B-assignment-status-ui.md)
**Role:** implementer (frontend). **Date:** 2026-10-26.
**Baseline before first change:** `ac1ff63` (working tree clean at start).
**Status:** implementation complete — awaiting parent review (combined SP-121 review after this child; no per-child review).

## Outcome

The course-detail assignments section now renders a status `Select` (all five
lifecycle values, D121-2) on every unfinished row, PATCHes `{ status }` on
change (A's contract), and renders only unfinished assignments
(`PENDING`/`IN_PROGRESS`, D121-4) by default, with a distinct all-finished
empty state. The shared predicate lives in
`entities/assignment/model/status.ts` for story 7 reuse. No DELETE is sent by
this flow.

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Control renders | Pass | Select with `aria-label="Status for <title>"`, all five options in lifecycle order, in the row's `flex flex-wrap gap-2` cluster; priority/type badges, Edit, Delete stay. `STATUS_STYLES`/`STATUS_LABELS` retained. |
| 2 Change | Pass | `handleStatusChange` calls `updateAssignment(id, { status })` exactly; Select disabled while in flight (`statusBusyIds`); duplicate submit blocked by the busy guard. |
| 3 Success | Pass | Page's `handleAssignmentStatusChanged` sets the status-specific sentence in the `role="status"` region and background-refetches `getCourse`; focus moves per gap 3. Failure toasts `We could not update the status. Try again.` and changes nothing. |
| 4 Unfinished view | Pass | Section filters via `isUnfinishedAssignment`; finished statuses remove the row after refetch; no `deleteAssignment` call in this flow. |
| 5 Empty states | Pass | No assignments → `No assignments yet.` + `Add your first assignment`. All finished → `All assignments are complete.` (text-only). |
| 6 Keyboard/narrow width | Pass | Native select with visible focus ring and accessible name; section uses existing responsive layout. |

## Changed paths

Production:
- `apps/web/src/entities/assignment/model/status.ts` (new) — `isUnfinishedAssignment`, `isFinishedAssignment`, `ASSIGNMENT_STATUSES`.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `status?: AssignmentStatus | null` on `UpdateAssignmentRequest` (import added).
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — status Select, unfinished partition, all-finished empty state, focus handling, exported palettes.
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — `handleAssignmentStatusChanged` wiring.

Tests:
- `apps/web/src/entities/assignment/model/status.test.ts` (new).
- `apps/web/src/entities/assignment/api/assignmentApi.test.ts` — added status-through assertion (IR-121-2).
- `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` — adjusted existing assertions to the new unfinished view / Select tab order; added status-control coverage (render/options/aria-label, PATCH exactly `{ status }`, in-flight disable, finished removal + no DELETE, both empty states, failure toast, focus move) (IR-121-1).
- `apps/web/src/pages/courses/ui/CourseDetailPage.test.tsx` — added status-wiring coverage (live-region sentence + background refetch) (IR-121-3).

Docs:
- `docs/stories/EP03/SP-121/README.md` (queue fields), `SP-121B-...md` (Status), this record, parent index.

## Verification

| Check | Command (cwd) | Result |
|---|---|---|
| Typecheck | `pnpm --filter @studypilot/web typecheck` (repo root) | exit 0 |
| Lint | `pnpm --filter @studypilot/web lint` (repo root) | exit 0 |
| Tests | `pnpm --filter @studypilot/web test` (repo root) | 48 files, 600/600 passed |
| Focused | `pnpm --filter @studypilot/web test -- src/entities/assignment src/features/courses/ui/AssignmentsSection.test.tsx src/pages/courses/ui/CourseDetailPage.test.tsx` | passed |

## DoD-10 browser note

Manual browser pass **executed and passed** (user-provided evidence,
2026-10-26). All six steps confirmed:
1. Course with a mix of pending/in-progress and one finished assignment opened.
2. Only unfinished rows render; finished row absent.
3. Status Select exercised through all five values; row disappears exactly on
   COMPLETED/SUBMITTED/GRADED and persists on refetch.
4. All-finished empty state (`All assignments are complete.`) confirmed.
5. Tab through the Select; visible focus ring and accessible name
   `Status for <title>` confirmed.
6. Row checked at phone width; no horizontal scroll.

## Findings/deviations

- **F-121B-1** (deviation, minor; closed): existing badge-palette assertions
  in `AssignmentsSection.test.tsx` were updated to reflect the removal of the
  read-only status badge and the new unfinished filtering; no correctness
  weakening — they now assert the priority palette and unfinished view. Owner:
  implementer. Closure: full web suite green (600/600).
- **IR-121-1** (should-fix; closed 2026-10-26): added the status-control
  component tests listed in the story (render/options/aria-label, PATCH exactly
  `{ status }`, in-flight disable, finished removal + no DELETE, both empty
  states, failure toast, focus move). Owner: implementer.
- **IR-121-2** (should-fix; closed 2026-10-26): added the
  `assignmentApi.test.ts` status-through exact-body assertion.
  Owner: implementer.
- **IR-121-3** (should-fix; closed 2026-10-26): added the
  `CourseDetailPage` status-wiring test (live-region sentence + background
  refetch). Owner: implementer.
- **IR-121-4** (CANNOT VERIFY → closed 2026-10-26): DoD-10 browser pass
  executed and passed (user-provided evidence; all six steps confirmed).
  Owner: reviewer/user.
- No blockers, no contract deviations. Tests added but not independently
  executed in this session (no shell available); recorded test runs from the
  prior pass stand. Re-run required before re-review.

## Commit scope

Single commit on top of `ac1ff63`: the production/test files above plus the
docs paths. No unrelated files staged; hooks not bypassed.
