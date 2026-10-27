# SP-124 parent implementation index — Assignment List Cohesion

**Parent:** [SP-124](../../SP-124-assignment-list-cohesion.md)
**Execution queue:** [SP-124 README](../../README.md#execution-queue)
**Status:** Reviewed 2026-10-26 (pass 2) — meets DoD and acceptance criteria (polish note P-124-001 only).
**Date:** 2026-10-26
**Review unit:** SP-124 (SP-124A, SP-124B, SP-124C). The reviewer writes
`./review.md` and `./walkthrough.md` beside this index.

## Child index

| Child | Outcome | Implementation record | Code commit |
|---|---|---|---|
| [SP-124A](../../SP-124A-shared-assignment-interaction.md) | One interaction home (`features/assignments/`): shared hook, row, dialogs, form, checklist; the course page keeps its behavior. | [SP-124A/implementation.md](../SP-124A/implementation.md) | `2285f17` (queue wording corrected in `ac9fa34`); shared-owner corrections in `7f27a8a` |
| [SP-124B](../../SP-124B-list-adopts-shared-interaction.md) | `/assignments` hosts the same owner: title opens edit, course meta link, inline status/subtasks, refetch with current params. | [SP-124B/implementation.md](../SP-124B/implementation.md) | `7380146`; refetch-freshness corrections in `7f27a8a` |
| [SP-124C](../../SP-124C-shared-create.md) | Create from `/assignments` through the shared modal form with an optional Course select (prefilled from the active filter, "No course" omits the field); list header Add, dual empty-state CTAs; this index and the DoD-10 note. | [SP-124C/implementation.md](../SP-124C/implementation.md) | `7f27a8a` (create/focus/e2e corrections; record finalized in the docs follow-up) |

Baseline before this unit: `b7b3557` (plan) → `2285f17` (A) → `7380146` (B) → C's original commit. Post-review corrections, tests and e2e spec: `7f27a8a` (see [Post-review corrections](#post-review-corrections-r-124-001006)).

## Integration summary

- **One owner, two hosts (D124-10).** `useAssignmentActions` + `AssignmentRow` +
  `AssignmentDialogs` live under `apps/web/src/features/assignments/`. Neither
  page implements status handling, dialogs, focus restoration, badges, or the
  subtask checklist.
- **One modal form (D124-11, D124-6).** `AssignmentForm` serves create/edit on
  both hosts. The Course select renders only in create mode when the host omits
  `courseId`; a fixed host course and every edit-mode dialog hide it.
- **Create contract (AC-E03-01).** `POST /assignments` is unchanged and already
  accepts an optional `courseId`; "No course" selects omit the key. No API,
  schema, migration, or client-contract change (D124-1, D124-9).
- **Refetch, not optimistic (D124-4).** Every mutation success re-reads the
  host's own source with its active parameters; a failed background refetch
  keeps the last list and toasts the fixed copy.
- **List create entry points (UI-124C-1/2).** Header `Add assignment`
  (`data-assignment-focus="add"`) and the unfiltered empty state's
  `Add your first assignment` (`data-assignment-focus="empty-add"`) beside
  `Browse courses`. The header control also supplies the hook's last-row delete
  focus fallback (closes D-124B-3).
- **Course select (UI-124C-3/4/5).** Full width below Title; prefilled from the
  active course filter when that course is offered, otherwise "No course";
  label `Course`, hint `Optional — choose a course or leave unassigned.`;
  unchanged dialog bounds and single-column mobile stacking.

## Shared DoD coverage

| DoD | Owner / evidence |
|---|---|
| 1. Functional criteria | A: course behavior preserved through the shared owner. B: list edit/delete/status/subtasks. C: list create with/without a course. Post-review: R-124-001/002/004/005 gaps corrected with regression tests. |
| 2. Invalid input | C: existing Zod schema (title/date/duration/priority/type/description) + 400 field mapping incl. `courseId`. A/B reuse it. |
| 3. Student data scoping | Not applicable — no new read/write. Existing endpoints stay principal-scoped; mutations only receive ids from the principal-scoped list/course fetch. |
| 4. Actionable API errors | Shared hook/dialog copy (status, save, delete, uniform 404); background refetch toasts the fixed list copy; list-host create failure retains the dialog and toasts the sanitized copy (R-124-005 test). |
| 5. Loading/empty/error | Initial spinner, live region, filtered/unfiltered empty states, header actions, refetch spinner + `aria-busy`, refetch-failure toast, in-dialog alerts. Only the newest list request may commit rows/loading/status (R-124-001). |
| 6. Keyboard | Row tab order and dialog traps preserved (A/B tests); create dialog order incl. the Course select; Escape closes and restores focus to the activating control; successful first create moves focus to the stable header Add control (R-124-002). |
| 7. Responsive | Rows stack below `sm` with 44 px touch targets; header stacks; dialog stays `max-w-md w-full max-h-[90vh] overflow-y-auto`, single-column fields. Create entry points, form inputs and dialog actions carry `max-sm:min-h-[44px]`; real browser measurement ≥44 px at 375 px with no horizontal overflow (R-124-003/006). |
| 8. Automated tests | A: 121 focused / 645 full at its commit. B: 131 focused / 655 full. C: 146 focused / 670 full at its commit. Post-review: 156 focused / 680 full, plus 4 real-stack Playwright journeys. Typecheck + lint green. |
| 9. API/migration docs | Not applicable — no API or migration change. |
| 10. Integrated review | Executed 2026-10-26 against a self-contained real stack (below); reviewer independently verifies. |
| 11. Reviewer walkthrough | Reviewer-owned, `./walkthrough.md`. |

## Post-review corrections (R-124-001…006)

Review pass 1 ([review.md](./review.md)) returned Changes Required with six
should-fix findings. All six are corrected in the commit containing this record;
no finding ID was renumbered, and no reviewer-owned artifact was edited.

| ID | Correction | Files | Regression evidence |
|---|---|---|---|
| R-124-001 | Async completion reads the latest host callbacks/items through a `latest` ref; the list keeps a monotonic `requestSeq` so only the newest GET may commit rows, loading, status or error effects. Status focus neighbors come from the latest rows. Subtask callbacks are stable wrappers over the latest host callbacks. | `model/useAssignmentActions.ts`, `pages/assignments/ui/AssignmentsPage.tsx` | Hook test: `onStatusChanged` after re-render uses the latest callback. Page tests: deferred PATCH then filter change refetches with the final params; a stale GET resolving after a newer one cannot replace it. |
| R-124-002 | Successful list create sets `focusAfterCreate`; a layout effect, once the refetch supplies rows, focuses the stable `[data-assignment-focus="add"]`. While still empty the form's own restoration keeps the empty-state trigger. | `model/useAssignmentActions.ts` | Page tests: empty-state create → populated list leaves focus on header Add; header-create success keeps focus on header Add; cancel still restores its trigger. |
| R-124-003 | Scoped `max-sm:min-h-[44px]` on header Add, empty-state Add/Browse, Title/Course/Due duration/Type/Priority/Description controls, and Cancel/Create. No unrelated shared-component redesign. | `pages/assignments/ui/AssignmentsPage.tsx`, `features/assignments/ui/AssignmentForm.tsx` | Page tests assert the classes; browser test measures header Add, Course select and Create ≥44 px at 375 px with `scrollWidth <= innerWidth + 1`. |
| R-124-004 | Expanded IDs reset when the `items` array changes identity and are retained when identity is stable, via a `previousItems` ref; no state update when nothing is expanded. | `model/useAssignmentActions.ts` | Hook tests for new-array reset and same-array retention; course-section test rewritten to the D124-5 contract. |
| R-124-005 | Added the list-host create-failure case. | `pages/assignments/ui/AssignmentsPage.test.tsx` | Asserts sanitized save toast, dialog + entered title retained, submit re-enabled, no refetch, no success announcement. |
| R-124-006 | Added `apps/web/e2e/assignments-list.spec.ts` and executed it against the self-contained real stack. | `apps/web/e2e/assignments-list.spec.ts` | 4/4 journeys pass on real Chromium + API + throwaway Postgres. |

**D124-5 interpretation (R-124-004).** The contract says expanded ids reset when
`items` changes identity; it is implemented literally. The old moved course test
asserted the opposite (retention across a fresh array); it was a contradicted
assertion, so it was rewritten rather than the contract being changed. No planner
or user contract revision was required.

## DoD-10 browser note (executed)

**Execution status:** Executed 2026-10-26 by the implementer against the repo's
self-contained Playwright mode. This is real browser → real API → real database
evidence, not a component-test substitute. The developer stack was not required
or touched.

| Field | Value |
|---|---|
| Date | 2026-10-26 |
| Tested Git state | Committed correction state `7f27a8a` (re-run after the pre-commit formatter; 4/4 passed on 7.0 s) |
| Environment | Playwright Chromium (installed `chromium-1248`), test API `:4100`, test Vite `:3100` proxying `/api` to it, throwaway Postgres database `studypilot_e2e_test` at `localhost:5432` created and dropped by global setup/teardown |
| Command | `cd apps/web && pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` |
| Result | Exit 0 — 4 passed (7.0 s committed-state re-run; 7.1 s first run), serial mode |
| Provenance | Env is loaded programmatically by the spec; no `.env`/secret file was read, printed or committed; no developer database was modified |

**Executed workflows and actual outcomes**

| # | Workflow | Actual result |
|---|---|---|
| 1 | List: empty state → create → focus → edit → status → delete | Empty-state dialog opens with Title focused and Course `No course`; Escape returns focus to **Add your first assignment**; create closes the dialog, announces `Assignment added. Showing 1 assignment.`, and focus lands on the header **Add assignment**; title button opens the shared edit dialog with no Course select; priority save announces `Assignment updated…` and shows `Urgent`; status announces `Assignment marked as completed. Showing 1 assignment.`; delete returns the page to `No assignments yet.` |
| 2 | Filtered prefill + course link | Selecting a course filter yields the filtered empty state; **Add assignment** opens with Course prefilled; created row shows the course code and a `View course` link with `href="/courses/:id"` |
| 3 | Course host regression | Course page **Add assignment** shows no Course select; create announces `Assignment added.`; subtasks add/complete (`Subtask completed.`) and status completion removes the row from the unfinished view, restored via **Show completed (1)** |
| 4 | Narrow layout (375×667) | Header Add, Course select and Create measured ≥44 px; no horizontal overflow (`scrollWidth <= innerWidth + 1`) |

**Not covered by this run (honest limits):** human visual/a11y judgement and
other routes (dashboard, calendar). The reviewer should still inspect the
screenshots/trace if they need visual ratification; no waiver is claimed.

## Verification (post-review corrections)

Run from the repository root unless noted; workspace filter runs in `apps/web`.
Correction commit: `7f27a8a` (code, tests, e2e spec, records; final record
edits in the immediately following docs commit).

| Command | Exit | Result |
|---|---|---|
| `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` | 0 | 156 passed (7 files) |
| `pnpm --filter @studypilot/web test` | 0 | 680 passed (50 files) |
| `pnpm --filter @studypilot/web typecheck` | 0 | `tsc --noEmit` clean |
| `pnpm --filter @studypilot/web lint` | 0 | ESLint `--max-warnings 0` clean |
| `cd apps/web && pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` | 0 | 4 passed; throwaway DB created and dropped |


## Known deviations carried into review

| ID | Source | Note |
|---|---|---|
| D-124B-1 | SP-124B | Closed: C makes `courseId` optional on `AssignmentDialogs`/`AssignmentForm` and supplies `courses` + `initialCourseId`. |
| D-124B-3 | SP-124B | Closed: the list header now mounts `[data-assignment-focus="add"]`, so deleting the last row has a focus target. |
| D-124B-2 | SP-124B | Shared delete dialog 404 copy now matches the edit form's uniform sentence (required by B AC 6; also affects the course host). |
| D-124B-4 | SP-124B | Generic delete failures keep the dialog's inline sanitized alert plus retry; status/save use toasts. |
| C-124C-1 | SP-124C | Edit-mode course re-assignment is out of scope (AC 3): the edit form never shows a Course select, so moving an existing assignment between courses is not offered on either host. |
| C-124C-2 | SP-124C | **Closed by the post-review correction:** DoD-10 is executed against the self-contained real stack (see above). |
| F-124C-1 | SP-124C correction | The moved course-section test asserted expanded-row retention across a new array, contradicting D124-5. Rewritten to assert reset on new identity and retention on stable identity (R-124-004). Test correction only. |
| F-124C-2 | SP-124C correction | Addressed R-124-001 in the checklist path by making the hook's subtask callbacks stable wrappers over `latest.current`; `SubtaskChecklist` keeps its own render-local `onChanged`/`onRefresh` props. |
| F-124C-3 | SP-124C correction | The e2e spec runs `test.describe.configure({ mode: 'serial' })` because cold parallel workers contended on first login. Serial is deterministic; total runtime 7.1 s. |
