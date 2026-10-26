# SP-120 Walkthrough — Assignment Subtasks

**Review unit:** SP-120 (SP-120I backend + SP-120J frontend) — final combined review, pass 2, 2026-10-26
**Reviewed code:** application tree identical to `a1ec584`; HEAD `dcb8273` is docs-only after that commit · [review.md](./review.md) · [SP-120 README](../../README.md)
**Stories:** [SP-120I](../../SP-120I-subtask-api.md) · [SP-120J](../../SP-120J-subtask-ui.md)

## What changed

On a course page, each assignment can be broken into an ordered checklist.
Expand the row, add a subtask, check it off, move it up or down, or delete
it. Completing one subtask does not complete the assignment. Deleting the
assignment does not delete its subtasks; they stay in the database and
simply stop appearing on any checklist.

Two stories delivered this:

- **SP-120I** (backend): list, create, update, and delete under
  `/assignments/:id/subtasks`, using the existing `Task` rows. No new
  table and no migration. The course-detail response now includes each
  assignment's ordered `subtasks`.
- **SP-120J** (frontend): the expand/collapse checklist on the course
  page, the add form, the checkbox, Up/Down, and a delete confirmation.
  After a successful change the page refetches the course and announces
  a subtask sentence, not an assignment sentence.

## How the code works

- **Storage.** A subtask is a `Task` with `assignmentId` set. The model
  already had `orderIndex` and a default status of `PENDING`. Creating a
  subtask without an order number appends it (`max + 1`, or `0` if it is
  the first). Status on create is always the schema default. A client
  cannot send a description, due date, minutes, priority, or status on
  create — those fields are rejected.
- **Ownership.** Every subtask route first checks that the assignment
  belongs to the signed-in student. A missing, foreign, or malformed
  assignment id is the same `Resource not found` 404. Reads and writes
  then require the subtask id, the student, and that assignment together.
  Another student's subtask, or a subtask that belongs to a different
  assignment, is the same 404. The response never includes `userId` or
  `assignmentId`.
- **Update.** A patch may change the title, the checkbox state
  (`PENDING` or `COMPLETED` only), or the order number. An empty body is
  rejected. Other status values (`IN_PROGRESS`, `ARCHIVED`) are rejected.
- **Course page.** `GET /courses/:id` still returns every assignment. Each
  one now has `subtasks`, ordered by `orderIndex`, then creation time.
  The checklist renders that list as given. It does not call a second
  list endpoint.
- **Checklist.** The row starts collapsed and shows a text summary
  (`No subtasks`, `2 subtasks`, `3 subtasks, 1 complete`). Expanding it
  shows the list, or `No subtasks yet.` plus the add form. Add sends only
  `{ title }`. The checkbox sends only `{ status }`. Up/Down swaps the
  two order numbers with two patches. Delete asks first; Cancel sends
  nothing. A failed title stays on the input. Other failures toast and
  keep the last list. The open row stays open across the refetch.

## Why it is correct

- **AC-E03-03** — an assignment can hold ordered, independently completable
  subtasks. The API orders them, creates them, toggles only that subtask's
  status, reorders them, and deletes them. The course page does the same
  actions on the projected list.
- **Automated evidence (reviewer-executed, 2026-10-26, via a bounded
  helper; application files unchanged since `a1ec584`).** API unit tests
  for assignments and courses: 284 passed, 0 skipped. Database-backed
  data-scoping, assignment e2e, subtask e2e, and course-meetings e2e:
  134 passed, 0 skipped. Web checklist, dialog, section, client, and
  course-page tests: 125 passed, 0 skipped. API and web typecheck and
  lint were clean. Details and commands are in [review.md](./review.md).
- **Manual evidence.** You reported the browser walkthrough passed on
  2026-10-26 (`SP-120 walkthru passed`), after being asked to run the
  steps in J's browser note. That closes the open integrated-review
  finding from pass 1. You did not itemize the environment or each step.
  This is the same kind of user report that closed the SP-115 browser
  pass, not a reviewer-watched session.
- **Pass 1** could not run tests and had no walkthrough report. Those
  two findings are closed on this pass. No code defect was found.
- **Limitation.** Phone width and live keyboard behavior are covered by
  your report of the full walkthrough, not by a measurement this review
  made. You can repeat the steps below at any time.

## Manual test workflows

Use your own local account and a course you can discard. Do not use a
shared production database. No extra permission is required beyond being
signed in.

### 1. Expand, add, complete, reorder, and delete a subtask

Status: **Executed — you, 2026-10-26.** You reported the walkthrough
passed. Environment and per-step notes were not provided. The steps below
are the ones that report covers. An optional repeat is not required for
sign-off.

1. Start the API and the web app. Sign in. Open a course that has an
   assignment.
2. Read the collapsed summary (`No subtasks`, or a count, or
   `{n} complete`). Expand the row.
   **Expected:** the checklist opens. Title, due date, badges, Edit, and
   Delete are still on the row. An empty checklist says `No subtasks yet.`
   and shows the add form.
3. Type a title and choose **Add subtask**.
   **Expected:** the page says `Subtask added.` The input clears. The row
   stays open. The new subtask appears after the page refreshes.
4. Check the box, then uncheck it.
   **Expected:** `Subtask completed.` then `Subtask marked incomplete.`
   The title is not struck through.
5. Move it with **Up** or **Down**.
   **Expected:** one `Subtask moved.` The order matches after refresh.
   The first item's Up control is unavailable. The last item's Down
   control is unavailable.
6. Choose **Delete**. Cancel once.
   **Expected:** the subtask is still there.
7. Delete again and confirm.
   **Expected:** `Subtask deleted.` The subtask is gone. The row stays open.
8. Tab through the row, then narrow the window to a phone width.
   **Expected:** focus follows the visual order (summary, Edit, Delete,
   then each subtask's checkbox, Up, Down, Delete, then the title field
   and Add). The row does not scroll sideways.

### 2. Another student's assignment

Status: **Not applicable as a manual sign-off gate.** Ownership is proven
by the reviewer-executed data-scoping and e2e suites (uniform 404, the
other student's row unchanged). A browser repeat is optional and was not
part of the reported walkthrough.

**Optional, not executed — user test instructions:** sign in as a second
student and open the first student's course or assignment URL.
**Expected:** the course is not found. You cannot list or change the
first student's subtasks.
