# SP-124 walkthrough — Assignment List Cohesion

**Parent:** [SP-124](../../SP-124-assignment-list-cohesion.md)
**Review:** [review.md](./review.md) (pass 2, PASS)
**Implementation index:** [implementation.md](./implementation.md)
**Reviewed Git state:** `5ed6f5f3fae4fcf217caf51978304867a83f504b` (correction code at `7f27a8a4fdeb2496f6262b48e2d0302574b0b0e5`)
**Date:** 2026-10-26

## 1. What changed

SP-124 makes `/assignments` a second host of the same assignment interaction the course page uses, so edit, delete, status, subtasks and create are not implemented twice. Three children delivered it:

- **SP-124A** extracted `apps/web/src/features/assignments/` (hook, row, dialogs, form, checklist, presentation). The course page hosts that feature through `useAssignmentActions` + `AssignmentRow` and behaves as before.
- **SP-124B** made `/assignments` a second host: title opens edit, course meta link, inline status/subtasks, refetch with current params.
- **SP-124C** added create from `/assignments` through the shared modal form with an optional Course select (prefilled from the active filter, "No course" omits the field), plus list header Add and dual empty-state CTAs.

Pass-1 review returned six should-fix findings (R-124-001…006); all are closed in `7f27a8a` (latest-callback refetch + stale-response guard, empty-state create focus, 44 px mobile targets, expanded-id identity reset, list-host create-error test, and executed real-stack browser evidence).

**User-visible result:** a student can manage an assignment on `/assignments` — create (with or without a course), edit, change status, add/complete subtasks, delete — without being sent to the course page, with the course page keeping the same actions. One hook and one row back both surfaces.

## 2. How the code works

### Key files and symbols

- `apps/web/src/features/assignments/model/useAssignmentActions.ts` — single owner: status PATCHes, edit/delete dialog selection, subtask expand/busy state, focus restoration. Exposes `latest` ref (R-124-001), `focusAfterCreate` (R-124-002), `previousItems` identity reset (R-124-004).
- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — shared row (badges, status select, actions, disclosure, course meta slot).
- `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx` — one mount point for form + delete dialog.
- `apps/web/src/features/assignments/ui/AssignmentForm.tsx` — shared create/edit form; Course select only in create mode when host omits `courseId`.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — list host: filters, sort, empty states, `requestSeq` freshness guard, header/empty-state Add controls with 44 px classes, `refetchCurrent`.
- `apps/web/src/features/assignments/ui/AssignmentsSection.tsx` — course host (grouping, add, show-completed).

### Request / UI / data flow

1. `/assignments` loads via `GET /assignments` with the active filter/search/sort params (`buildParams`).
2. Each row is `AssignmentRow` bound to one `useAssignmentActions` instance; the page renders `<AssignmentDialogs>` once.
3. Mutations call the existing assignment client; on success the hook calls the host's `onChanged`/`onStatusChanged`/etc., which triggers `refetchCurrent` — re-reading the host's own source with the params currently in the filter bar (D124-4, no optimistic updates).
4. A failed background refetch keeps the last list and toasts `We could not load your assignments. Try again.`; a failed save/status toasts its own copy; delete 404 shows the uniform `Resource not found — this course or assignment may no longer exist.` sentence.
5. Focus restoration: after delete the hook focuses a neighbor Edit control or the stable Add control; after a finishing status change it focuses the next unfinished row or Add; after a successful first create it focuses the header Add (R-124-002).

### Important choices

- **One owner, two hosts (D124-10):** neither page implements status handling, dialogs, focus, badges or the subtask checklist.
- **No optimistic updates (D124-4):** refetch is the source of truth, matching `CourseDetailPage`.
- **Latest-callback completion (R-124-001):** async mutations (status PATCH) can outlive the render that started them; a `latest` ref ensures completion uses the current host callback and rows, and a monotonic `requestSeq` prevents an older GET from overwriting a newer filter result.
- **Identity reset (D124-5, R-124-004):** expanded IDs reset whenever the `items` array changes identity, retained when stable.
- **No API/schema change (D124-1, D124-9):** `POST /assignments` already accepts optional `courseId`; "No course" omits the key.

### Validation / ownership / error behavior

- Create form: Zod schema (title required, date, duration, type, priority, description) unchanged; `courseId` added to the 400 field map so a stale course surfaces as a field error.
- All mutations receive ids only from the principal-scoped list/course fetch; PATCH/DELETE stay uniform-404 (SP-114). No client-supplied user identity.
- Background refetch failure never clears the list; it toasts the fixed copy and clears a stale course filter on 404.

## 3. Why it is correct

- **AC-E03-01 (create with title and course):** C implements list create via the shared form; "No course" omits `courseId`; selecting a course sends it; prefill from the active filter. Verified by form tests (40) and page tests, plus E2E journeys 1–2.
- **AC-E03-03 (ordered, independently completable subtasks):** checklist stays in the shared row; A keeps it, B hosts it. E2E journey 3 completes a subtask and announces `Subtask completed.`; component tests cover add/move/complete.
- **AC-E03-04 (update status):** status select in the shared row on both hosts; E2E verifies completion removes the row from the unfinished view and restores via **Show completed (1)**.
- **SP-114 (edit/delete):** both hosts use the shared form/delete dialog with uniform 404 copy; E2E journey 1 edits priority and deletes.
- **DoD 1–11:** see the implementation index table; DoD-10 now has real browser→API→DB evidence (R-124-006) instead of a documented exception.
- **R-124-001…006:** all closed with persisted, verified evidence (see review.md disposition table). The latest-callback and stale-response guarantees are the key correctness fixes for the mutate-then-refetch surface.

Evidence cited (not a claim of proof):
- Automated: 156 focused (7 files) + 680 full (50 files) + typecheck + lint, all exit 0 at `7f27a8a`.
- Integrated: 4/4 Playwright journeys on Chromium + API `:4100` + throwaway Postgres, committed-state re-run 4/4 (7.0 s).
- Inspection: `latest` ref, `requestSeq`, `previousItems`, 44 px classes, test assertions.

Limitations retained: validation/error/keyboard/ordering/desktop browser scenarios are covered by component tests but not the e2e spec (polish note P-124-001); backend integration/ownership tests were not rerun and are not claimed.

## 4. Manual test workflows

### Workflow A — List create, no course (empty state)
Prerequisites: signed-in student with at least one course, no assignments (or clear filters), local dev stack or the self-contained E2E stack.
1. Open `/assignments`. Expected: `No assignments yet.`, `Create an assignment directly or browse your courses.`, **Add your first assignment**, **Browse courses** (`/courses`).
2. Click **Add your first assignment**. Expected: `Add an assignment` dialog opens, focus in Title, Course select shows `No course` first.
3. Press Escape. Expected: dialog closes, focus returns to **Add your first assignment**.
4. Reopen, enter title "First assignment", leave `No course`, click **Create assignment**. Expected: dialog closes; list refetches; new row shows static `No course`; live region announces `Assignment added. Showing 1 assignment.`; focus on header **Add assignment**.
5. Negative: submit with blank title → inline `Title is required`; force a 5xx → toast `We could not save the assignment. Try again.` and the modal/values stay.

Status: **Executed** (E2E journey 1, 2026-10-26, Chromium, real API/DB).

### Workflow B — Filtered prefill and course link
1. Choose a course in the filter bar. Expected: filtered empty state `No assignments match these filters.` (if none).
2. Click **Add assignment**. Expected: Course select prefilled with that course.
3. Create an assignment. Expected: refetched filtered list contains the new row with its course code and a `View course` link (`/courses/:id`).

Status: **Executed** (E2E journey 2).

### Workflow C — Course host regression
1. Open a course page, click **Add assignment**. Expected: no Course select; assignment created in that course.
2. Expand subtasks, add "Read chapter 1", complete it. Expected: `Subtask completed.`; subtask checkbox checked.
3. Change status to Completed. Expected: row leaves the unfinished view; `Show completed (1)` restores it.

Status: **Executed** (E2E journey 3).

### Workflow D — Edit and delete on the list
1. Click an assignment title. Expected: `Edit assignment` dialog, no Course select, title prefilled.
2. Change priority to Urgent, save. Expected: `Assignment updated. Showing N assignment(s).`, row shows `Urgent`.
3. Change status to Completed via the row select. Expected: `Assignment marked as completed. Showing N assignment(s).`.
4. Delete via the row's Delete button, confirm. Expected: list returns to `No assignments yet.` (or updated count).

Status: **Executed** (E2E journey 1).

### Workflow E — Narrow-width (≈375 px) create surface
1. Set viewport to 375×667, open `/assignments`, click **Add assignment**.
2. Expected: header stacks, dialog fields single-column, dialog scrolls inside `max-h-[90vh]`, header Add/Course select/Create ≥44 px touch height, no horizontal overflow.

Status: **Executed** (E2E journey 4).

### Workflow F — Keyboard
1. From the header Add button, Tab into the dialog: Title → Course → Due date → Duration → Type → Priority → Description → Cancel → Create assignment; Shift+Tab wraps; Escape closes and returns focus to the opening control.
2. Tab order on a row: title → course link → subtask toggle → status select → edit → delete.

Status: **Not executed — user test instructions** (component tests cover tab order/Escape; no browser-level keyboard run in the e2e spec). Not a required manual gate for the core flows; the component coverage is recorded.

### Workflow G — Error paths
1. Delete/edit an assignment whose course was removed elsewhere → uniform `Resource not found — this course or assignment may no longer exist.`.
2. Generic delete failure → inline sanitized alert with retry (not a toast).

Status: **Not executed — user test instructions** (component tests cover 404 copy and generic failure).

## 5. Execution status summary

| Workflow | Status | Evidence |
|---|---|---|
| A. List create, no course | Executed | E2E journey 1 (2026-10-26, Chromium, real API/DB) |
| B. Filtered prefill + link | Executed | E2E journey 2 |
| C. Course host regression | Executed | E2E journey 3 |
| D. Edit and delete | Executed | E2E journey 1 |
| E. Narrow-width create surface | Executed | E2E journey 4 (375×667, ≥44 px, no overflow) |
| F. Keyboard | Not executed — user test instructions (component coverage) | `AssignmentsPage.test.tsx` tab/Escape case |
| G. Error paths | Not executed — user test instructions (component coverage) | `DeleteAssignmentDialog.test.tsx`, form 400 mapping tests |

Automated gates: focused 156 (7 files) + full 680 (50 files) + typecheck + lint, all exit 0 at `7f27a8a`; e2e 4/4 on committed state. No secrets were read. No code was changed by this review.