# SP-124 parent implementation index — Assignment List Cohesion

**Parent:** [SP-124](../../SP-124-assignment-list-cohesion.md)
**Execution queue:** [SP-124 README](../../README.md#execution-queue)
**Status:** All children implemented — ready for the combined parent review
**Date:** 2026-10-26
**Review unit:** SP-124 (SP-124A, SP-124B, SP-124C). The reviewer writes
`./review.md` and `./walkthrough.md` beside this index.

## Child index

| Child | Outcome | Implementation record | Code commit |
|---|---|---|---|
| [SP-124A](../../SP-124A-shared-assignment-interaction.md) | One interaction home (`features/assignments/`): shared hook, row, dialogs, form, checklist; the course page keeps its behavior. | [SP-124A/implementation.md](../SP-124A/implementation.md) | `2285f17` (queue wording corrected in `ac9fa34`) |
| [SP-124B](../../SP-124B-list-adopts-shared-interaction.md) | `/assignments` hosts the same owner: title opens edit, course meta link, inline status/subtasks, refetch with current params. | [SP-124B/implementation.md](../SP-124B/implementation.md) | `7380146` |
| [SP-124C](../../SP-124C-shared-create.md) | Create from `/assignments` through the shared modal form with an optional Course select (prefilled from the active filter, "No course" omits the field); list header Add, dual empty-state CTAs; this index and the DoD-10 note. | [SP-124C/implementation.md](../SP-124C/implementation.md) | the commit containing this record |

Baseline before this unit: `b7b3557` (plan) → `2285f17` (A) → `7380146` (B) → C's commit.

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
| 1. Functional criteria | A: course behavior preserved through the shared owner. B: list edit/delete/status/subtasks. C: list create with/without a course. |
| 2. Invalid input | C: existing Zod schema (title/date/duration/priority/type/description) + 400 field mapping incl. `courseId`. A/B reuse it. |
| 3. Student data scoping | Not applicable — no new read/write. Existing endpoints stay principal-scoped; mutations only receive ids from the principal-scoped list/course fetch. |
| 4. Actionable API errors | Shared hook/dialog copy (status, save, delete, uniform 404); background refetch toasts the fixed list copy. |
| 5. Loading/empty/error | Initial spinner, live region, filtered/unfiltered empty states, header actions, refetch spinner + `aria-busy`, refetch-failure toast, in-dialog alerts. |
| 6. Keyboard | Row tab order and dialog traps preserved (A/B tests); create dialog order incl. the Course select; Escape closes and restores focus to the activating control. |
| 7. Responsive | Rows stack below `sm` with 44 px touch targets; header stacks; dialog stays `max-w-md w-full max-h-[90vh] overflow-y-auto`, single-column fields. |
| 8. Automated tests | A: 121 focused / 645 full at its commit. B: 131 focused / 655 full. C: 146 focused / 670 full (final). Typecheck + lint green at each closeout. |
| 9. API/migration docs | Not applicable — no API or migration change. |
| 10. Integrated review | Browser note below; execution status recorded honestly. The reviewer performs the integrated review. |
| 11. Reviewer walkthrough | Reviewer-owned, `./walkthrough.md`. |

## DoD-10 browser note (manual verification)

**Execution status:** not executed by the implementer in this environment
(no running API/database session and no browser driver; `pnpm test:e2e` needs a
`DATABASE_URL` for its throwaway database). This is a **documented exception**
following the SP-113C/SP-122C precedent: the automated substitutes below are
**not** a live browser-to-API journey, mobile rendering, or human visual/a11y
ratification. The parent reviewer must run these steps (or ratify the exception)
before marking the unit reviewed; required manual gates still need real
evidence.

**Automated substitute actually run** (working directory `apps/web` via the
workspace filter):

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` | 146 passed (7 files) |
| `pnpm --filter @studypilot/web test` | 670 passed (50 files) |
| `pnpm --filter @studypilot/web typecheck` | passed |
| `pnpm --filter @studypilot/web lint` | passed (0 warnings) |

**Manual steps and expected results**

1. **List create, no course.** Sign in as a student with at least one course,
   open `/assignments`, click the header **Add assignment**.
   *Expected:* the `Add an assignment` dialog opens with focus in Title and a
   `Course` select showing `No course` first, then each course as `CODE Name`.
2. **No-course create.** Enter a title, leave `No course`, click
   **Create assignment**.
   *Expected:* the dialog closes; the list refetches; the new row shows static
   `No course` beneath its due line; the live region announces
   `Assignment added. Showing N assignment(s).`; keyboard focus is back on the
   header Add button.
3. **Filtered prefill.** Choose a course in the filter bar, then click
   **Add assignment**.
   *Expected:* the dialog's Course select is prefilled with that course; after
   creating, the refetched filtered list contains the new row with its course
   link (`/courses/:id`).
4. **Empty state.** As a student with no assignments (no filters), open
   `/assignments`.
   *Expected:* `No assignments yet.`, `Create an assignment directly or browse
   your courses.`, **Add your first assignment**, and **Browse courses**
   (`/courses`). The first opens the same dialog; the second navigates.
5. **Course page unchanged.** Open a course page and use **Add assignment**.
   *Expected:* no Course select; the assignment is created in that course and
   appears in the course section.
6. **Edit mode.** Edit any assignment from either host.
   *Expected:* the `Edit assignment` dialog never shows a Course select; saving
   keeps the stored course.
7. **Keyboard.** From the header Add button, Tab into the dialog: Title →
   Course → Due date → Duration → Type → Priority → Description → Cancel →
   Create assignment; Shift+Tab wraps; Escape closes and returns focus to the
   control that opened it.
8. **Narrow width (≈375 px).** Repeat step 1.
   *Expected:* the header stacks, dialog fields are single-column, the dialog
   scrolls inside `max-h-[90vh]`, and selects/buttons meet ≈44 px touch height
   with no horizontal overflow.
9. **Errors.** Submit with a blank title (inline `Title is required`); force a
   5xx (toast `We could not save the assignment. Try again.`); delete or edit
   an assignment whose course was removed elsewhere (uniform
   `Resource not found — this course or assignment may no longer exist.`).

## Known deviations carried into review

| ID | Source | Note |
|---|---|---|
| D-124B-1 | SP-124B | Closed: C makes `courseId` optional on `AssignmentDialogs`/`AssignmentForm` and supplies `courses` + `initialCourseId`. |
| D-124B-3 | SP-124B | Closed: the list header now mounts `[data-assignment-focus="add"]`, so deleting the last row has a focus target. |
| D-124B-2 | SP-124B | Shared delete dialog 404 copy now matches the edit form's uniform sentence (required by B AC 6; also affects the course host). |
| D-124B-4 | SP-124B | Generic delete failures keep the dialog's inline sanitized alert plus retry; status/save use toasts. |
| C-124C-1 | SP-124C | Edit-mode course re-assignment is out of scope (AC 3): the edit form never shows a Course select, so moving an existing assignment between courses is not offered on either host. |
