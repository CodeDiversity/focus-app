# SP-124B implementation — list page adopts the shared interaction

**Story:** [SP-124B](../../SP-124B-list-adopts-shared-interaction.md)
**Status:** Implemented and post-review corrected — awaiting parent re-review
**Date:** 2026-10-26
**Checkpoint:** [checkpoint.md](./checkpoint.md)
**Review unit:** SP-124 combined parent review (index written by C). Post-review corrections R-124-001 (`7f27a8a`) cover this host's mutate-then-refetch path.

## Outcome

`/assignments` is now a second host of the SP-124A interaction owner. Each row is
`AssignmentRow`; the title is a button that opens the shared edit form; the meta
slot links to the course (or shows static `No course`); status, badges, overdue
pill, and subtasks come from the shared row; one `useAssignmentActions` call and
one `AssignmentDialogs` mount serve the page. Every edit/delete/status/subtask
success refetches `GET /assignments` with the filter/search/sort parameters
currently in the bar, and a failed refetch toasts the fixed copy while keeping
the last list. No page-local mutation, dialog, or checklist implementation was
added (D124-10), and there is no API/schema change (D124-1).

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1. Shared row integration | Met | The page renders `AssignmentRow` from `@/features/assignments`; it defines no status `Select`, delete handler, or `SubtaskChecklist` wiring. Imports `status/edit` cells come from the row. |
| 2. Title opens the edit modal | Met | `onTitleActivate={() => actions.openEdit(a)}`; tests assert the `Edit assignment` dialog, prefilled title, and unchanged `/assignments` route. Title button carries the specified text-button classes incl. `rounded`. |
| 3. Course affordance in the meta slot | Met | `CourseMeta` renders the `/courses/:id` link with color dot (aria-hidden), monospace code, and name; null renders static `No course` with no link. Tests cover both. |
| 4. Refetch with current params | Met | `refetchCurrent()` calls `runFetch(buildParams(), false, …)`; the shape is asserted with an active course filter and after delete. The hook invokes the host callback through a `latest` ref, so a status PATCH that resolves after a filter change refetches with the *current* params (R-124-001). A monotonic `requestSeq` prevents an older GET from overwriting the newest rows/loading/status. Background refetch shows the filter-bar `Loader2`, sets `aria-busy` on the list, keeps rows interactive, and a failed refetch toasts `We could not load your assignments. Try again.` without clearing rows. |
| 5. Single hook and dialog mount | Met | Exactly one `useAssignmentActions` call before the early returns and one `<AssignmentDialogs actions={actions} …/>` in the page tree. |
| 6. Error handling | Met, with shared-copy notes | Edit 404 keeps the form's uniform sentence; delete 404 now maps to the same sentence in the shared dialog (D-124B-2). Status failures toast `We could not update the status. Try again.`; edit failures toast `We could not save the assignment. Try again.`. A generic delete failure keeps the dialog's inline sanitized alert (D-124B-4). |
| 7. Keyboard and responsive accessibility | Met | Test walks title → course link → subtask toggle → status select → edit → delete and asserts Escape closes the edit dialog with focus restored. The shared row stacks below `sm` (`flex-col … sm:flex-row`) and the list applies `max-sm` 44 px minimum heights to row buttons/selects; create entry points and form controls also meet 44 px (R-124-003) and the real browser run measures them at 375 px (R-124-006). |
| 8. Automated tests | Met | 10 new cases in `AssignmentsPage.test.tsx` (26 total in the suite); the delete-dialog 404 test now asserts the uniform copy. Post-review adds deferred-PATCH/current-params and out-of-order-GET cases. Full web suite green. |

## Verification

Working directory `apps/web` (via the workspace filter):

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` | 131 passed (7 files) at B's commit; 156 passed after the post-review corrections |
| `pnpm --filter @studypilot/web test` | 655 passed (50 files) at B's commit; 680 passed after the post-review corrections |
| `pnpm --filter @studypilot/web typecheck` | passed |
| `pnpm --filter @studypilot/web lint` | passed (0 warnings) |

Post-review integrated evidence (real browser/API/DB, both hosts) is recorded in
the [parent index](../SP-124/implementation.md#dod-10-browser-note-executed).

Tested state: current working tree on the child's implementation commit; no
uncommitted code after closeout.

## Changed paths

- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — host wiring: shared
  row/dialogs/hook, course meta slot, refetch-with-params, fixed refetch toast,
  live-region sentences, section ref for focus restoration, `max-sm` touch targets.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` — full assignment
  API mock, route probe, 10 SP-124B cases (title/edit, course link, null course,
  status refetch, delete refetch, subtasks, busy state, refetch failure, tab
  order + Escape).
- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — title button gains
  `rounded` (AC 2 focus ring) and the action cluster gains `items-center`.
- `apps/web/src/features/assignments/ui/DeleteAssignmentDialog.tsx` — 404 maps to
  the uniform not-found sentence (AC 6).
- `apps/web/src/features/assignments/ui/DeleteAssignmentDialog.test.tsx` —
  strengthened 404 assertion.
- Docs: `docs/stories/EP03/SP-124/README.md` (execution queue), the refined
  `SP-124B-list-adopts-shared-interaction.md` (ui-refiner rewrite carried with
  this child's commit), this record and the checkpoint.

## Findings and deviations

- **D-124B-1 (deviation, plumbing).** The list renders
  `<AssignmentDialogs … courseId="" />` because creation is out of scope until
  SP-124C and `AssignmentDialogs.courseId` is still required. The create branch is
  unreachable on this host (no `openForm` caller). Owner: SP-124C, which makes
  `courseId` optional and supplies the courses list.
- **D-124B-2 (shared copy alignment, AC 6).** `DeleteAssignmentDialog` now shows
  `Resource not found — this course or assignment may no longer exist.` for a 404,
  matching the edit form. This changes the course host's copy too; it is the
  story's required uniform sentence, and the dialog test asserts it.
- **D-124B-3 (open limitation, owner SP-124C).** Deleting the last visible list
  row leaves focus on `<body>`: the shared hook falls back to
  `[data-assignment-focus="add"]`, and the list has no Add control until C. No B
  acceptance criterion requires a fallback target; C should mount the control
  with that attribute.
- **D-124B-4 (existing shared behavior).** A generic delete failure keeps the
  shared dialog's inline error alert (with retry) rather than adding a toast;
  AC 6's toast examples are the status and save messages. A toast would duplicate
  the inline message and change the course host.
- **Findings requiring product action:** none new beyond D-124B-3 (a follow-up
  owned by C within the same parent).

## Post-review correction (R-124-001)

- **Latest-callback refetch.** The page's `onStatusChanged`/`onChanged`/subtask
  callbacks are read through the hook's `latest` ref at completion, so a PATCH
  that starts under one filter and resolves after the filter bar changes refetches
  with the *final* parameters. Regression test: deferred PATCH, switch course
  filter while pending, assert the last GET params match the final controls.
- **Stale-response guard.** `AssignmentsPage.runFetch` increments a monotonic
  `requestSeq`; only the newest request may commit rows, status copy, loading or
  error effects. Regression test: an earlier GET resolving after a newer one
  cannot restore the superseded rows.
- **Findings requiring product action:** none.

## Remaining work

None for SP-124B. The combined SP-124 parent re-review follows the correction commit.
