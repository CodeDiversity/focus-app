# SP-124C implementation — shared create on the list

**Story:** [SP-124C](../../SP-124C-shared-create.md)
**Status:** Implemented and post-review corrected — awaiting parent re-review
**Date:** 2026-10-26
**Checkpoint:** [checkpoint.md](./checkpoint.md)
**Review unit:** SP-124 combined parent review (parent index: [../SP-124/implementation.md](../SP-124/implementation.md)). Post-review corrections R-124-002/003/005/006 land here (`7f27a8a`).

## Outcome

`/assignments` now creates assignments through the same `AssignmentForm`
dialog the course page uses. The page header carries a primary **Add
assignment** button and the unfiltered empty state offers **Add your first
assignment** beside **Browse courses**. Because the list host omits a fixed
`courseId`, the create dialog renders a `Course` select below Title with
`No course` first and the page's already-loaded courses as `CODE Name`; it
prefills from the active course filter when that course is offered. Choosing
`No course` omits `courseId` from `POST /assignments`; choosing a course sends
it. Create success closes the dialog, refetches the list with the current
filter/search/sort parameters, announces `Assignment added. Showing N
assignment(s).`, and restores focus to the activating control — or, when the
first create removes the empty-state trigger, to the stable header Add control.
The course host
and every edit-mode dialog still hide the select. No API, schema, or
client-contract change (D124-1); no list-local form or mutation code (D124-10).

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1. Shared form reuse | Met | Header Add and empty-state Add both call `actions.openForm`; `AssignmentDialogs` mounts one `AssignmentForm`. `AssignmentsPage` defines no form. |
| 2. Fixed course preserved | Met | `AssignmentForm` renders the select only when `!isEdit && !courseId`; the fixed host course is still sent. Form tests cover the hidden select and the sent `courseId`; the course-section suites stay green. |
| 3. Edit mode invariant | Met | `showCourseSelect` excludes edit mode; a form test passes `courses` + `assignment` and asserts no `Course` control. |
| 4. List create with course selector | Met | Select sits below Title, `No course` first, options `CODE Name`; prefills from the active filter only when that course is offered; "No course" submits no `courseId` key; a selected course submits it. Six form tests. |
| 5. Validation and errors | Met | Existing schema unchanged; `courseId` added to the 400 field map (test asserts the select's `aria-invalid` + message); in-flight lock/`aria-busy` and the save-failure toast are the existing behavior. |
| 6. Populated header action | Met | Header `flex flex-col-reverse … sm:flex-row` with the title and `data-assignment-focus="add"` primary button (test asserts the attribute). The button carries `max-sm:min-h-[44px]` (R-124-003). |
| 7. Empty state actions | Met | Unfiltered: `No assignments yet.` + `Create an assignment directly or browse your courses.` + `Add your first assignment` (`data-assignment-focus="empty-add"`) + `Browse courses` link. Filtered: unchanged clear-filters state with the header Add still present. Tests cover the copy, the link target and opening the dialog; both CTAs carry `max-sm:min-h-[44px]` (R-124-003). |
| 8. Refetch and announcement | Met | Create success triggers `refetchCurrent('Assignment added.')`; a page test asserts the dialog closes, `listAssignments` re-runs with the current params `{}`, and the live region shows `Assignment added. Showing 1 assignment.` Cancel/Escape returns focus to the header Add button (test). After a **successful first create** removes the empty-state trigger, a hook layout effect moves focus to the stable header Add control (R-124-002, tested empty→populated). |
| 9. Parent index + DoD-10 note | Met | [../SP-124/implementation.md](../SP-124/implementation.md) indexes A/B/C and records the executed integrated browser evidence (R-124-006). |
| 10. Automated tests | Met | 10 new form cases (40 total) and 5 new page cases (31 total); focused suite 146 at the child commit. Post-review adds the list-host create-failure case (R-124-005): sanitized toast, modal + values retained, submit released, no refetch/announcement. |

## Verification

Working directory `apps/web` (via the workspace filter):

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/web test -- src/features/assignments/ui/AssignmentForm.test.tsx` | 40 passed |
| `pnpm --filter @studypilot/web test -- src/pages/assignments/ui/AssignmentsPage.test.tsx` | 31 passed at the child commit; 38 after the post-review corrections |
| `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` | 146 passed (7 files) at the child commit; 156 after the post-review corrections |
| `pnpm --filter @studypilot/web test` | 670 passed (50 files) at the child commit; 680 after the post-review corrections |
| `pnpm --filter @studypilot/web typecheck` | passed |
| `pnpm --filter @studypilot/web lint` | passed (0 warnings) |
| `cd apps/web && pnpm exec playwright test e2e/assignments-list.spec.ts --reporter=list` | 4 passed against the self-contained real stack (Chromium/API/throwaway Postgres) |

Tested state: the child's implementation commit plus the post-review correction
working tree; no uncommitted code after closeout. Integrated browser evidence:
[parent index](../SP-124/implementation.md#dod-10-browser-note-executed).

## Changed paths

- `apps/web/src/features/assignments/ui/AssignmentForm.tsx` — optional
  `courseId`, `courses`, `initialCourseId`; create-mode Course select below
  Title; `courseId` in the schema and 400 field map; the create payload omits
  the key for "No course" and still sends a fixed host course; a guarded effect
  applies the filter prefill if the course list resolves after the dialog opens.
- `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx` — forwards
  `courseId`/`courses`/`initialCourseId`; `courseId` is now optional.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — page header Add
  button, dual empty-state CTAs and copy, `courses`/`initialCourseId` into the
  dialog mount.
- `apps/web/src/features/assignments/ui/AssignmentForm.test.tsx` — new
  cross-course create block (select presence/options/order, No-course payload,
  selected course, prefill incl. a late course list, fallback, fixed host, edit
  mode, tab order, 400 mapping) and the `CourseWithSemester` import.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` — updated the
  empty-state copy case; new list-creation block (header open, empty-state open,
  filter prefill, create/refetch/announcement, focus return). Post-review adds
  the list-host create-failure case and the mobile-class assertions.
- `apps/web/e2e/assignments-list.spec.ts` — post-review real-stack journeys:
  empty→create focus, edit/status/delete, filtered prefill + course link, course
  host regression, and 375 px touch-target/overflow measurement.
- Docs: `docs/stories/EP03/SP-124/README.md` (execution queue),
  `SP-124C-shared-create.md` (Status + artifact pointer),
  `artifacts/SP-124/implementation.md` (new parent index + DoD-10 note), this
  record and the checkpoint. The ui-refiner rewrite of the story file is carried
  in the same commit as this child's code.

## Findings and deviations

| ID | Source | Observation / affected paths | Disposition, owner, closure evidence |
|---|---|---|---|
| C-124C-1 | AC 3 / D124-6 | Edit mode never renders the Course select, so an existing assignment cannot be moved between courses. | **Accepted limitation (out of scope).** Story AC 3 forbids the select in edit mode. No code change; recorded in the parent index for reviewer awareness. Owner of any future change: a new story. |
| C-124C-2 | AC 9 / DoD 10 | The required integrated-browser note could not be executed at the child commit: no browser session had been arranged. | **Closed by the post-review correction.** A committed Playwright spec (`apps/web/e2e/assignments-list.spec.ts`) executed against the self-contained real stack: 4/4 journeys on Chromium + API + throwaway Postgres. Evidence is in the [parent index](../SP-124/implementation.md#dod-10-browser-note-executed). |
| C-124C-3 | Test scaffolding | The unfiltered empty-state subtitle changed to `Create an assignment directly or browse your courses.` (UI-124C-2), so the existing `AssignmentsPage.test.tsx` assertion was updated. | **Resolved in this child.** Same test now asserts the new copy, both CTAs and the `/courses` link. |
| C-124C-4 | AC 4 prefill edge | A prefilled course is only applied when that id is present in the loaded course list; otherwise the select falls back to `No course`. If `listCourses()` fails (non-fatal in the page), only `No course` is offered. | **Accepted, tested.** Form tests cover the non-matching initial id and the list resolving after the dialog opens (the effect applies the prefill only while the field is untouched). |

Findings requiring product action: none beyond the recorded edit-mode limitation
(C-124C-1), which remains out of scope for this unit.

## Post-review corrections (R-124-002, R-124-003, R-124-005, R-124-006)

| ID | Correction | Evidence |
|---|---|---|
| R-124-002 | `handleCreateSuccess` sets `focusAfterCreate`; a hook layout effect focuses `[data-assignment-focus="add"]` once the refetch returns rows. Empty-state still restores its own trigger while mounted. | Page tests: empty→populated focus, header-create success, cancel restoration. Browser journey 1. |
| R-124-003 | Scoped `max-sm:min-h-[44px]` added to the header Add, empty-state Add/Browse, every create form control, and Cancel/Create. | Page tests assert classes; browser journey 4 measures ≥44 px at 375×667 with no overflow. |
| R-124-005 | Added the list-host create-failure test. | Asserts sanitized toast, dialog/values retained, submit re-enabled, no refetch, no success announcement. |
| R-124-006 | Added `apps/web/e2e/assignments-list.spec.ts` (serial, self-contained). | 4 passed on Chromium/API/throwaway Postgres; DB created and dropped. |

## Remaining work

None for SP-124C. The combined SP-124 parent re-review is next (A + B + C, the
parent index, and the executed DoD-10 evidence).
