# SP-114E checkpoint

Updated: 2026-10-24 (implementer session — child complete)
Execution state: [SP-114 README queue](../../README.md#execution-queue) — row E `Implemented — awaiting parent review`
Story: [SP-114E-assignment-edit-delete-ui.md](../../SP-114E-assignment-edit-delete-ui.md)
Review unit: SP-114 (parent index `../../SP-114/` written by F; combined parent review)
Role / scope: implementer; frontend only — per-row Edit and Delete controls, AssignmentForm reuse with description and edit mode, DeleteAssignmentDialog modal, API client methods, and action-aware onAssignmentChanged callback.

## Completed — see [implementation.md](./implementation.md)

- [x] API client methods `updateAssignment` and `deleteAssignment` in `apps/web/src/entities/assignment/api/assignmentApi.ts`
- [x] Unit tests for `updateAssignment` and `deleteAssignment` in `apps/web/src/entities/assignment/api/assignmentApi.test.ts`
- [x] Extended `apps/web/src/features/courses/ui/AssignmentForm.tsx`:
  - [x] Accept `assignment?: CourseAssignment` prop
  - [x] Support optional `description` textarea (up to 2000 chars) for create and edit modes
  - [x] Mode-aware hints (due date, estimated hours, priority, description)
  - [x] Edit mode title "Edit assignment", submit button "Save changes"
  - [x] Format ISO `dueDate` to local `YYYY-MM-DD` for date input (`toLocalDateInputValue`)
  - [x] Edit submission payload with null semantics (blank date/hours -> null, blank description -> '')
  - [x] 404 alert copy: `"Resource not found — this course or assignment may no longer exist."`
- [x] Implemented `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx` (patterned after `DeleteMeetingDialog.tsx`)
- [x] Wired per-row controls and dialogs into `apps/web/src/features/courses/ui/AssignmentsSection.tsx`:
  - [x] Edit and Delete buttons on each row with accessible `aria-label`s
  - [x] Wired Edit click to open `AssignmentForm` with `assignment`
  - [x] Wired Delete click to open `DeleteAssignmentDialog`
  - [x] Focus restoration to triggers on close
  - [x] Updated `onAssignmentChanged` prop signature to `(action: 'added' | 'updated' | 'deleted') => void`
- [x] Updated `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` to handle `action: 'added' | 'updated' | 'deleted'`
- [x] Component tests:
  - [x] `AssignmentsSection.test.tsx` (replaced obsolete out-of-scope test, added edit/delete/focus/empty tests)
  - [x] `AssignmentForm.test.tsx` (tested edit mode, description, 400 errors, 404 alert, focus trap)
  - [x] `DeleteAssignmentDialog.test.tsx` (new test suite)
- [x] Full web verification: vitest (542 tests passing), typecheck clean, eslint clean, format clean

## Findings / discoveries / deviations

Findings/deviations: None.

## Resume next

None — child complete. Next queue row: **SP-114F** (implement: e2e tests, DoD-10 sign-off, parent index); followed by the combined SP-114 parent review.
