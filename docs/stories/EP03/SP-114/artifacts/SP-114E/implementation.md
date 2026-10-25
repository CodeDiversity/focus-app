# SP-114E implementation

**Status:** Implemented — awaiting combined SP-114 parent re-review.
**Date:** 2026-10-24
**Scope:** SP-114E only (frontend); baseline `286d64f` (SP-114D implementation, `feat(api): implement SP-114D assignment update/delete API`). The earlier `b089cfa` baseline was not a commit in this repository and is withdrawn (IR-114-05).
**Ticket / decisions:** [SP-114E-assignment-edit-delete-ui.md](../../SP-114E-assignment-edit-delete-ui.md), decisions D114E-1…7.

## Acceptance criteria outcomes

| AC | Outcome / evidence |
|---|---|
| 1 — Per-row controls | Pass. Each assignment item in `AssignmentsSection` renders an "Edit" button (`variant="outline"`, `size="sm"`) and a "Delete" button (`variant="ghost"`, `size="sm"`), grouped with status and priority badges in a right-aligned actions cluster. Verified in `AssignmentsSection.test.tsx`. |
| 2 — Accessible row button labels | Pass. Buttons have descriptive labels: `aria-label="Edit <assignment title>"` and `aria-label="Delete <assignment title>"`. Verified in `AssignmentsSection.test.tsx`. |
| 3 — Edit mode form initialization | Pass. Clicking "Edit" opens `AssignmentForm` in edit mode with `assignment={assignment}`: heading "Edit assignment", submit button "Save changes", pre-filled fields (title, local `YYYY-MM-DD` date via `toLocalDateInputValue`, duration string, priority enum, description string), lifecycle fields (`status`, `actualHours`) excluded, and edit-mode field hints (D114E-6). Verified in `AssignmentForm.test.tsx`. |
| 4 — Description field support | Pass. `AssignmentForm` includes an optional "Description" textarea (`maxLength={2000}`) with mode-aware hints (create: "Optional — up to 2000 characters.", edit: "Optional — up to 2000 characters. Leave blank to clear."). Description errors map to field error. Verified in `AssignmentForm.test.tsx`. |
| 5 — Edit form submission | Pass. Submitting calls `updateAssignment(assignment.id, payload)`. Blank due date and duration send `null` (D114-5 backend keeps stored values), blank description sends `''` (clears it), priority round-trips. On success closes form and fires `onAssignmentChanged('updated')` (page announces "Assignment updated."). 400 errors map to field alerts, 404 displays inline alert `"Resource not found — this course or assignment may no longer exist."` with link to `/courses`, 5xx/network toasts error and enables retry. Verified in `AssignmentForm.test.tsx` and `CourseDetailPage.test.tsx`. |
| 6 — Delete confirmation dialog | Pass. `DeleteAssignmentDialog` renders modal dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="delete-assignment-title"`, title `"Delete <assignment title>?"`, body copy `"This permanently deletes the assignment. Any subtasks will remain without an assignment."`, safe Cancel button receiving initial focus, and destructive Delete button. Verified in `DeleteAssignmentDialog.test.tsx`. |
| 7 — Delete execution and dismissal | Pass after IR-114-02. Clicking Delete calls `deleteAssignment(assignment.id)` while setting `isLoading={true}` on button. On success (204) unmounts dialog and fires `onAssignmentChanged('deleted')` (page announces "Assignment deleted."). Opening Delete calls `onAssignmentFormOpen`, which clears that live region before the next identical success, so a second deletion is a new announcement. On error displays inline alert and allows retry. Cancel button / Escape / backdrop click close without API call. Verified in `DeleteAssignmentDialog.test.tsx`, `AssignmentsSection.test.tsx`, and `CourseDetailPage.test.tsx`. |
| 8 — Keyboard accessibility and focus management | Pass after IR-114-01. Both dialogs trap Tab/Shift+Tab, including while DELETE is pending and after a rejection. Escape is ignored only while the delete request is in flight; focus is held on the dialog when both buttons are disabled, and Tab from outside the dialog is pulled back. Initial focus remains Cancel. Verified in `DeleteAssignmentDialog.test.tsx` (deferred-promise regression with a focusable background control) and the idle trap tests. |
| 9 — Responsive layout | Pass. Uses `sm:flex-row sm:items-center sm:justify-between` and `flex-wrap gap-2` on row items and action clusters. Verified visually and in DOM structure assertions. |
| 10 — Empty state transition | Pass. Removing/deleting all assignments transitions `AssignmentsSection` back to empty state (`"No assignments yet."` with `"Add your first assignment"` CTA). Verified in `AssignmentsSection.test.tsx`. |

## Changed paths / commit scope

- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `UpdateAssignmentRequest`, `updateAssignment` (PATCH), `deleteAssignment` (DELETE).
- `apps/web/src/entities/assignment/api/assignmentApi.test.ts` — unit tests for `updateAssignment` and `deleteAssignment`.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — edit mode support, description textarea, mode-aware hints, title/submit button copy, null/empty semantics for edit payload, 404 message.
- `apps/web/src/features/courses/ui/AssignmentForm.test.tsx` — updated keyboard tab order for description; added edit-mode test suite (initial values, null semantics, 400 error mapping, 404 handling, keyboard trap).
- `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx` (new) — delete confirmation modal with safe default focus, focus trap, and error recovery.
- `apps/web/src/features/courses/ui/DeleteAssignmentDialog.test.tsx` (new) — test suite for delete confirmation modal.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — per-row Edit and Delete buttons, action-aware `onAssignmentChanged('added' | 'updated' | 'deleted')`, modal triggers and focus restoration.
- `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` — replaced obsolete out-of-scope test with tests for edit/delete buttons, edit form trigger, delete dialog trigger, focus restoration, and empty state transition.
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — wired action-aware `handleAssignmentChanged` announcing `"Assignment added."`, `"Assignment updated."`, or `"Assignment deleted."`.
- Child checkpoint and implementation record, child ticket status, and parent README execution queue.
- Unrelated pre-existing dirty files preserved and excluded from commit: `.gitignore`, `docs/stories/EP03/SP-113/**`.

## Findings / deviations and final dispositions

Original implementation pass found none. Parent review pass 1
([review.md](../SP-114/review.md)) then required these corrections:

| ID | Issue | Disposition | Closure |
|---|---|---|---|
| IR-114-01 | Pending DELETE returned from the whole key handler, so Tab could leave the modal | **Fixed** | `DeleteAssignmentDialog.tsx` suppresses only Escape while deleting, focuses the dialog, and contains Tab/Shift+Tab on a document capture listener. Regression in `DeleteAssignmentDialog.test.tsx`. |
| IR-114-02 | Opening Delete did not clear `Assignment deleted.`, so a second deletion did not change the live region | **Fixed** | `AssignmentsSection` calls `onAssignmentFormOpen` on delete open; the page already clears status there. Page regression deletes two assignments and checks the intervening empty status plus the second `Assignment deleted.` |
| IR-114-05 (E record) | Baseline was recorded as `b089cfa`, which is not a commit here | **Fixed** | This record's baseline is `286d64f`, the D implementation commit directly before E `74822fd`. |

## Verification (executed)

All commands run from `apps/web` against the final working tree.

| Command | Result |
|---|---|
| `pnpm test -- run AssignmentsSection.test.tsx AssignmentForm.test.tsx DeleteAssignmentDialog.test.tsx assignmentApi.test.ts` | Pass — 4 suites, 48 tests. |
| `pnpm test -- run CourseDetailPage.test.tsx` | Pass — 19 tests. |
| `pnpm test` (full web test suite) | Pass — 45 suites, 542 tests, 0 failures. |
| `pnpm typecheck` | Pass — `tsc --noEmit` clean. |
| `pnpm lint` | Pass — `eslint` clean with 0 errors and 0 warnings. |
| `pnpm format` | Pass — Prettier check clean on all files. |

### Review-fix verification (2026-10-24, `apps/web`, working tree on `fb95e06` plus these fixes)

| Command | Result |
|---|---|
| `pnpm test -- run DeleteAssignmentDialog.test.tsx AssignmentsSection.test.tsx CourseDetailPage.test.tsx` | Pass — 3 files, 41 tests. |
| `pnpm exec eslint` on the six changed web files `--max-warnings 0` | Pass. |
| `pnpm exec prettier --check` on those files | Pass. |
| `pnpm typecheck` | Pass. |

## DoD and remaining work

E's keyboard and announcement gaps from review pass 1 are fixed. Combined parent re-review remains after the D/F review-fix closeout. No independent approval is claimed.
