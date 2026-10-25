# SP-114E implementation

**Status:** Implemented — awaiting combined SP-114 parent review.
**Date:** 2026-10-24
**Scope:** SP-114E only (frontend); baseline `b089cfa` (SP-114D implementation).
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
| 7 — Delete execution and dismissal | Pass. Clicking Delete calls `deleteAssignment(assignment.id)` while setting `isLoading={true}` on button. On success (204) unmounts dialog and fires `onAssignmentChanged('deleted')` (page announces "Assignment deleted."). On error displays inline alert and allows retry. Cancel button / Escape / backdrop click close without API call. Verified in `DeleteAssignmentDialog.test.tsx`. |
| 8 — Keyboard accessibility and focus management | Pass. Both `AssignmentForm` and `DeleteAssignmentDialog` trap Tab/Shift+Tab focus, dismiss on Escape when not in-flight, and restore focus to trigger elements upon close. Initial focus on Title input in `AssignmentForm` and Cancel button in `DeleteAssignmentDialog`. Verified in `AssignmentForm.test.tsx`, `DeleteAssignmentDialog.test.tsx`, and `AssignmentsSection.test.tsx`. |
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

Findings/deviations: None.

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

## DoD and remaining work

Frontend DoD 1, 2, 3, 4, 5, 6, 7, 8 satisfied. Next queue row: **SP-114F** (integration e2e tests, DoD-10 sign-off, parent index); followed by the combined SP-114 parent review.
