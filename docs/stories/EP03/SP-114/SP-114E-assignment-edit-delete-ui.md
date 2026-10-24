# SP-114E: Assignment Edit and Delete UI

**Story ID:** SP-114E
**Title:** Frontend: per-row edit/delete controls in AssignmentsSection
**Parent:** [SP-114](./SP-114-assignment-editing-and-deletion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Plan Ready (requires `ui-refiner` pass — see UI/UX gaps below)
**Dependencies:** SP-113A (API client `createAssignment` in `entities/assignment/api/assignmentApi.ts`), SP-113B (existing `AssignmentForm` + `AssignmentsSection`), SP-114D (PATCH + DELETE API endpoints)
**Jira key:** Pending creation

## Summary

Add per-row edit and delete controls to the `AssignmentsSection`. The edit
control reuses the existing `AssignmentForm` in edit mode (pre-filled with the
assignment's data, calling the new `PATCH` endpoint). The delete control shows
a confirmation dialog (reusing the existing dialog pattern) and calls the new
`DELETE` endpoint. After either mutation, the section triggers a course refetch
via the existing `onAssignmentChanged` callback.

## Source requirement references

- **AC-E03-01** (create) — editing/deletion extend the same assignment resource.
- **AC-E03-02** (optional fields) — editable via the form.
- **DoD 1** (functional criteria) — edit/delete behavior.
- **DoD 2** (invalid-input validation) — form mirrors backend validation.
- **DoD 3** (student data scoping) — ownership enforced by the backend (404);
  the frontend displays a generic error.
- **DoD 4** (actionable API errors) — display 400/404 errors.
- **DoD 5** (loading/empty/error states) — in-flight states for edit/delete.
- **DoD 6** (keyboard accessibility) — edit/delete buttons, confirmation dialog.
- **DoD 7** (responsive layouts) — per-row controls on mobile + desktop.
- **DoD 8** (automated tests) — component tests for edit mode, delete confirmation.
- **DoD 10** (integrated review) — SP-114F.

## Acceptance criteria

1. **Per-row edit button:** Each assignment row displays an edit button (icon or text label). Clicking it opens `AssignmentForm` in edit mode, pre-filled with the assignment's current data (title, description, due date, estimated hours, priority — but NOT status or actualHours).
2. **Edit mode form:** The form shows a different title ("Edit assignment") and submit button ("Save assignment"). On submit, it calls the new `PATCH /assignments/:id` endpoint with the assignment's ID and the updated fields.
3. **Edit success:** On successful PATCH, the form closes, `onAssignmentChanged()` fires, and the course refetches (existing SP-113B pattern). A success toast is shown.
4. **Edit error handling:** 400 errors map to form fields (same as create). 404 errors show a recovery message. Network/5xx errors preserve form values and enable retry.
5. **Per-row delete button:** Each assignment row displays a delete button (icon or text label). Clicking it opens a confirmation dialog (reusing the existing dialog pattern) asking the user to confirm deletion.
6. **Delete confirmation:** The confirmation dialog has a clear destructive label ("Delete assignment"), a cancel button, and a confirm button (styled as destructive). On confirm, it calls `DELETE /assignments/:id`.
7. **Delete success:** On successful DELETE (204), the row is removed from the list (via course refetch), a success toast is shown.
8. **Delete error handling:** 404 errors show a generic error toast. Network/5xx errors show a retry toast.
9. **Keyboard accessibility:** Edit and delete buttons are keyboard-accessible (Tab focus, Enter/Space activation). The confirmation dialog traps Tab, closes on Escape, and restores focus to the trigger.
10. **Responsive layout:** Per-row controls are visible on both desktop and mobile. On mobile, controls may be compact (icon-only) or hidden behind a menu — the `ui-refiner` will decide.

## Tests

- **Component tests** (`AssignmentsSection.test.tsx` — extended):
  - Edit button exists on each row (when assignments are present).
  - Clicking edit opens `AssignmentForm` in edit mode with pre-filled values.
  - Submitting the edit form calls `updateAssignment(assignmentId, data)`.
  - Edit success closes form and calls `onAssignmentChanged()`.
  - Edit 400/404/error handling mirrors the create form behavior.
  - Delete button exists on each row.
  - Clicking delete opens a confirmation dialog.
  - Confirming delete calls `deleteAssignment(assignmentId)`.
  - Delete success closes dialog, calls `onAssignmentChanged()`.
  - Delete error handling (404, network).
  - Escape closes the confirmation dialog without deleting.
  - Tab trapping in the confirmation dialog.
  - Focus restoration to the delete trigger after close.
- **API client tests** (`assignmentApi.test.ts` — extended):
  - `updateAssignment(assignmentId, data)` → PATCH `/assignments/:id`.
  - `deleteAssignment(assignmentId)` → DELETE `/assignments/:id`.

## Technical notes

### Inspected code paths (verified)

- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — read-only rows, no per-row controls (test at line 117–125 confirms this).
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — creation-only form (title, dueDate, estimatedHours, priority). Dialog layout, keyboard trapping, focus management, error handling all implemented.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `createAssignment` function (axios POST).
- `apps/web/src/shared/types/academic.ts` — `CourseAssignment` (10-key projection, no `userId`/`courseId`/`course`).
- `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` — row rendering, empty state, form open.
- `apps/web/src/features/courses/ui/AssignmentForm.test.tsx` — keyboard, validation, error handling, in-flight state.

### UI/UX gaps (requires `ui-refiner` pass)

The following UI/UX decisions are **unsettled** and must be resolved by a
`ui-refiner` agent before implementation:

1. **Per-row control design:** How should edit and delete buttons appear on each row? Icon-only (pencil/trash icons)? Text labels ("Edit" / "Delete")? A combined menu/dropdown? On mobile, should controls be visible by default, hidden behind a "⋮" menu, or shown as compact icons?
2. **Edit mode form reuse:** How should the existing `AssignmentForm` be extended to support editing? Should it accept an `assignmentId` + `initialData` prop? Should the form title change dynamically? Should the `description` field (currently not in the create form) be exposed in edit mode?
3. **Delete confirmation UX:** What should the confirmation dialog look like? A simple inline confirmation, a modal dialog (reusing the existing dialog pattern), or an inline expandable section? What destructive styling (red button) is appropriate?
4. **Row interaction states:** How should rows look when editing or deleting is in progress (disabled controls, loading spinner, dimmed row)?
5. **Empty state after deletion:** If deleting the last assignment, should the empty state ("No assignments yet.") appear immediately, or after the refetch?

### API contract (frontend)

```text
PATCH /assignments/:id  ← from SP-114D
  → updateAssignment(assignmentId: string, data: UpdateAssignmentRequest): Promise<CourseAssignment>

DELETE /assignments/:id  ← from SP-114D
  → deleteAssignment(assignmentId: string): Promise<void>
```

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D114E-1 | **Form reuse:** The existing `AssignmentForm` is extended (not replaced) with an optional `assignmentId` prop. When present, the form operates in edit mode: different title, submit text, and API call. Default values are passed from the `AssignmentsSection` (which already has the assignment data). | Minimizes new code; the form already handles keyboard, validation, error handling, and in-flight states. |
| D114E-2 | **`description` is editable but not in the create form.** The create form (SP-113B) omits description for brevity (quick creation). Editing exposes all editable fields including description. | The assignment model has a description field; students may want to add or update it after creation. |
| D114E-3 | **Status and actualHours are NOT editable.** These fields are owned by story 5. The form excludes them in edit mode (read-only display if present). | Consistent with D113-3 (status not in create DTO); actualHours is tracked by focus sessions (story 5). |

## Definition of Done

All applicable shared DoD (see SP-114 parent). Frontend-specific:

- `AssignmentsSection` renders per-row edit/delete buttons.
- `AssignmentForm` extended with `assignmentId?` prop (edit mode).
- `assignmentApi.ts` extended with `updateAssignment` and `deleteAssignment`.
- Component tests for edit mode, delete confirmation, error handling.
- Keyboard accessibility (Tab, Enter/Space, Escape, focus trapping).
- Responsive layout (desktop + mobile).
- In-flight states (disabled controls, loading indicators).

## Sizing block

- **Outcome:** Per-row edit/delete controls in `AssignmentsSection`, form reuse for editing, delete confirmation, API client extensions.
- **Time estimate:** ~2–2.5 hours (includes `ui-refiner` pass for unsettled UI/UX decisions).
- **Production files:** `AssignmentsSection.tsx` (add per-row controls), `AssignmentForm.tsx` (extend with edit mode), `assignmentApi.ts` (add `updateAssignment`, `deleteAssignment`).
- **Test files:** `AssignmentsSection.test.tsx` (extend), `assignmentApi.test.ts` (extend).
- **Minimal start context:** Read `AssignmentsSection.tsx`, `AssignmentForm.tsx`, `assignmentApi.ts`, `assignmentApi.test.ts`, `AssignmentsSection.test.tsx`, `AssignmentForm.test.tsx`.
- **Verification commands:** `pnpm test -- AssignmentsSection.test.tsx`, `pnpm test -- assignmentApi.test.ts`.
- **Dependencies:** SP-113A (API client), SP-113B (existing form + section), SP-114D (PATCH + DELETE endpoints).
- **Exclusions:** Status updates, actualHours, courseId changes — owned by story 5 / future story.
