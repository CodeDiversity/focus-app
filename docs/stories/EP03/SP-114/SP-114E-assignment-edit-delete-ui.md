# SP-114E: Assignment Edit and Delete UI

**Story ID:** SP-114E
**Title:** Frontend: per-row edit/delete controls in AssignmentsSection
**Parent:** [SP-114](./SP-114-assignment-editing-and-deletion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent re-review (review-fix pass closed IR-114-01, IR-114-02, and the E baseline claim in IR-114-05; [implementation](./artifacts/SP-114E/implementation.md))
**Artifact:** [implementation](./artifacts/SP-114E/implementation.md) · [checkpoint](./artifacts/SP-114E/checkpoint.md)
**Refined:** 2026-10-24
**Dependencies:** SP-113A (API client `createAssignment` in `entities/assignment/api/assignmentApi.ts`), SP-113B (existing `AssignmentForm` + `AssignmentsSection`), SP-114D (PATCH + DELETE API endpoints)
**Jira key:** Pending creation

## Summary

Add per-row Edit and Delete controls to the `AssignmentsSection` on the course
detail page. The Edit control opens `AssignmentForm` in edit mode (pre-filled
with the assignment's data, calling `PATCH /assignments/:id`). The Delete control
opens a dedicated confirmation modal (`DeleteAssignmentDialog`) and calls
`DELETE /assignments/:id`. After any mutation, the section fires the
action-aware `onAssignmentChanged` callback; the course detail page announces
the result in its live region and background-refetches (the meetings pattern —
no success toast, D114E-7).

## Source requirement references

- **AC-E03-01** (create) — editing and deletion extend the same assignment resource.
- **AC-E03-02** (optional fields) — editable via the form (due date, estimated hours, priority, and description).
- **DoD 1** (functional criteria) — edit and delete behavior.
- **DoD 2** (invalid-input validation) — form client-side validation mirrors backend DTO rules.
- **DoD 3** (student data scoping) — ownership enforced by backend (404); uniform error handling.
- **DoD 4** (actionable API errors) — display field-level 400 and uniform 404 errors.
- **DoD 5** (loading/empty/error states) — in-flight submission states, empty state on deleting last row.
- **DoD 6** (keyboard accessibility) — visible focus, Tab trapping in modals, Escape dismissal, focus restoration to trigger.
- **DoD 7** (responsive layouts) — clean wrapping and touch targets on desktop and mobile.
- **DoD 8** (automated tests) — component tests for edit mode, delete dialog, keyboard flow, and API client.
- **DoD 10** (integrated review) — SP-114F.

## Acceptance criteria

1. **Per-row controls:** Each assignment item in `AssignmentsSection` renders an "Edit" button (`variant="outline"`, `size="sm"`) and a "Delete" button (`variant="ghost"`, `size="sm"`), grouped with the status and priority badges in a right-aligned actions cluster.
2. **Accessible row button labels:** The buttons have descriptive accessibility labels: `aria-label="Edit <assignment title>"` and `aria-label="Delete <assignment title>"`.
3. **Edit mode form initialization:** Clicking "Edit" opens `AssignmentForm` in edit mode with prop `assignment={assignment}`:
   - Form title: "Edit assignment" (heading ID `assignment-form-title`).
   - Submit button text & label: "Save changes".
   - Fields pre-filled from assignment: `title` (string), `dueDate` (converted from ISO string to local `YYYY-MM-DD` for the date input, or empty if null), `estimatedHours` (number converted to string, or empty if null), `priority` (enum, defaults to current), and `description` (string, or empty if null).
   - `status` and `actualHours` are excluded from editing (lifecycle fields owned by story 5).
   - Field hints switch to their edit-mode variants (D114E-6): due date / estimated duration read "leave blank to keep the current…", priority reads "Pick a different value to change the priority.", and description reads "leave blank to clear" (the `CourseForm` hint precedent).
4. **Description field support:** `AssignmentForm` includes an optional "Description" textarea (`maxLength={2000}`) for both create and edit modes, with mode-aware hints: create "Optional — up to 2000 characters.", edit "Optional — up to 2000 characters. Leave blank to clear." (D114E-6 — description is the only clearable field, D114-5).
5. **Edit form submission:** Submitting the form calls `updateAssignment(assignment.id, payload)`.
   - Payload (D114E-6): a blank due date / estimated duration sends `null` (the backend keeps the stored value — D114-5); a blanked description sends `''` (clears it); `priority` always round-trips the select's value.
   - On success: closes the form dialog and fires `onAssignmentChanged('updated')` — the page announces `"Assignment updated."` in its live region and background-refetches (no success toast — D114E-7).
   - On 400 validation error: displays field-level errors matching API response.
   - On 404 course/assignment missing: displays inline alert `"Resource not found — this course or assignment may no longer exist."` with a link to `/courses`.
   - On 5xx/network error: preserves inputs, enables retry, toasts `"We could not save the assignment. Try again."`.
6. **Delete confirmation dialog:** Clicking "Delete" opens `DeleteAssignmentDialog`:
   - Modal dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="delete-assignment-title"`.
   - Title: `"Delete <assignment title>?"`.
   - Description copy: `"This permanently deletes the assignment. Any subtasks will remain without an assignment."`.
   - Safe action: "Cancel" button (`variant="outline"`), which receives initial focus upon opening.
   - Destructive action: "Delete" button (`variant="danger"`, `aria-label="Delete <assignment title>"`).
7. **Delete execution and dismissal:**
   - Clicking "Delete" calls `deleteAssignment(assignment.id)` while setting `isLoading={true}` on the delete button.
   - On success (204): unmounts the dialog and fires `onAssignmentChanged('deleted')` — the page announces `"Assignment deleted."` in its live region and background-refetches (no success toast — D114E-7).
   - On error: displays actionable error alert inside the dialog and re-enables the Delete button for retry.
   - Clicking "Cancel" or pressing Escape closes the dialog without issuing an API call.
8. **Keyboard accessibility and focus management:**
   - Both `AssignmentForm` and `DeleteAssignmentDialog` trap Tab/Shift+Tab focus within the dialog container.
   - Escape key dismisses the dialog (only when not in-flight).
   - On close (both cancel and success), focus is restored to the specific Edit or Delete button trigger that opened the dialog.
9. **Responsive layout:**
   - Desktop (≥640px): assignment rows display title and due date on the left, badges and buttons grouped on the right in a single horizontal row (`sm:flex-row sm:items-center sm:justify-between`).
   - Mobile (<640px): assignment rows stack vertically with badges and buttons wrapping gracefully (`flex-wrap gap-2`).
10. **Empty state transition:** Deleting the final assignment in a course causes the list to transition back to the empty state (`"No assignments yet."` with `"Add your first assignment"` CTA) upon completion of the course refetch.

## Tests

### Component tests (`AssignmentsSection.test.tsx`)
- **Replace** the existing test `offers no per-row management controls (editing/deletion remain out of scope)` (lines 117–125) — it contradicts AC 1 once per-row buttons exist; the per-row button test below replaces it.
- `renders Edit and Delete buttons for each assignment row with accessible labels`: verifies button presence and `aria-label` attributes containing assignment title.
- `opens AssignmentForm in edit mode with pre-filled fields when Edit clicked`: verifies dialog heading "Edit assignment", submit button "Save changes", and populated input values.
- `opens DeleteAssignmentDialog when Delete clicked`: verifies dialog heading `"Delete <title>?"` and initial focus on Cancel button.
- `returns focus to Edit trigger when AssignmentForm closes`: verifies focus restoration.
- `returns focus to Delete trigger when DeleteAssignmentDialog closes`: verifies focus restoration.
- `transitions to empty state when all assignments are removed`: verifies empty state copy and CTA after deletion.

### Component tests (`AssignmentForm.test.tsx`)
- The existing `vi.mock` factory mocks only `createAssignment`; add `updateAssignment` for the edit-mode tests.
- `populates initial values in edit mode`: verifies title, date, estimatedHours, priority, and description populated.
- `submits PATCH request via updateAssignment on edit`: verifies payload format and omit logic for empty fields.
- `handles 400 field validation errors on edit`: checks title, dueDate, estimatedHours, priority, and description error displays.
- `handles 404 not found error on edit`: checks alert box and back to courses link.
- `traps Tab key and closes on Escape`: verifies modal keyboard boundaries.

### Component tests (`DeleteAssignmentDialog.test.tsx` — new file)
- `renders confirmation copy with assignment title`: verifies heading and warning body copy.
- `focuses Cancel button on mount`: verifies safe default focus.
- `traps Tab key between Cancel and Delete buttons`: verifies cyclical keyboard navigation.
- `cancels on Escape and backdrop click`: verifies dismissal without API call.
- `calls deleteAssignment on confirm`: verifies API call with assignment ID.
- `disables buttons and shows spinner while request in flight`: verifies loading state.
- `displays error alert and permits retry on failure`: verifies error recovery.

### API client tests (`assignmentApi.test.ts`)
- `updateAssignment calls PATCH /assignments/:id with payload and returns updated assignment`: verifies axios PATCH method, URL, and body.
- `deleteAssignment calls DELETE /assignments/:id and resolves void`: verifies axios DELETE method, URL, and 204 handling.

## Technical notes

### Inspected code paths (verified)

- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — existing list rendering and create dialog trigger.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — existing modal dialog, form fields, zod schema, and focus trap.
- `apps/web/src/features/courses/ui/MeetingsSection.tsx` — precedent for row actions (`Edit` outline button, `Delete` ghost button).
- `apps/web/src/features/courses/ui/DeleteMeetingDialog.tsx` — precedent for modal delete confirmation.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — existing `createAssignment` function.
- `apps/web/src/shared/types/academic.ts` — `CourseAssignment` interface.

### Element decisions & FSD placement

| Component / File | Layer / Placement | Decision | Reason |
|---|---|---|---|
| `AssignmentsSection.tsx` | `features/courses/ui/` | Modify (in-place) | Add per-row Edit and Delete buttons; manage active edit/delete state; change the `onAssignmentChanged` prop from `() => void` to `(action: 'added' \| 'updated' \| 'deleted') => void` (breaking — `CourseDetailPage` is updated in the same story). |
| `AssignmentForm.tsx` | `features/courses/ui/` | Extend (in-place) | Accept optional `assignment?: CourseAssignment` prop; add Description textarea; toggle create vs edit submission (mode-aware hints, D114E-6). |
| `DeleteAssignmentDialog.tsx` | `features/courses/ui/` | New component | Encapsulates delete confirmation, safety focus, error handling, and API invocation. Matches `DeleteMeetingDialog` pattern. |
| `assignmentApi.ts` | `entities/assignment/api/` | Extend (in-place) | Add `updateAssignment(id, payload)` and `deleteAssignment(id)` HTTP methods. |
| `CourseDetailPage.tsx` | `pages/courses/ui/` | Modify (in-place) | Replace the hardcoded `'Assignment added.'` handler with the action-aware `(action: 'added' \| 'updated' \| 'deleted')` form (mirroring `handleMeetingChanged`); the live-region copy follows D114E-7. |

### Layout and hierarchy

- **Section view:**
  - Header: `"Assignments"` heading + `"Add assignment"` primary button.
  - Row item:
    - Left column: Title (medium text, secondary-900), Due date (sm text, secondary-500/600).
    - Right column: Badges (`status`, `priority`) followed by Edit button (`outline`) and Delete button (`ghost`).
- **Edit Modal (`AssignmentForm`):**
  - Title: `"Edit assignment"`.
  - Fields stacked: Title (required Input) -> Due date & Estimated duration (2-col grid) -> Priority (Select) -> Description (Textarea).
  - Actions footer: Cancel (`outline`) + Save changes (`primary`).
- **Delete Modal (`DeleteAssignmentDialog`):**
  - Title: `"Delete <title>?"`.
  - Copy: `"This permanently deletes the assignment. Any subtasks will remain without an assignment."`.
  - Actions footer: Cancel (`outline`, initial focus) + Delete (`danger`).

### States

- **Loading:**
  - Edit form: Submit button `isLoading={true}` (disabled), inputs disabled, backdrop clicks disabled.
  - Delete dialog: Delete button `isLoading={true}` (disabled), Cancel button disabled, backdrop clicks disabled.
- **Empty:**
  - When the last assignment is deleted, the course detail refetches and displays `"No assignments yet."` with `"Add your first assignment"` CTA.
- **Error:**
  - Edit form 400: field-level error messages beneath respective inputs.
  - Edit form 404: inline alert with `"Resource not found — this course or assignment may no longer exist."` and link to `/courses`.
  - Edit form 500/network: toast message `"We could not save the assignment. Try again."`.
  - Delete dialog 400/404/500: inline alert with API error message; Delete button re-enables for retry.

### Accessibility (WCAG 2.2 AA)

- **Keyboard navigation:**
  - Per-row buttons are standard `<button>` elements, reachable via Tab and activatable with Enter/Space.
  - In `DeleteAssignmentDialog`, initial focus is placed on Cancel (safe default). Tab and Shift+Tab cycle between Cancel and Delete.
  - In `AssignmentForm`, initial focus is placed on the first input (Title).
  - Escape closes both modals when requests are not in flight.
- **Focus restoration:**
  - Both modals store the trigger element (`document.activeElement`) on mount and restore focus on unmount.
- **Non-color indicators:**
  - Delete action is explicitly labeled with text `"Delete"` and has `aria-label="Delete <title>"`, reinforced by danger variant styling.
  - Badges retain both text labels and color tokens.

### Exact copy

- Row Edit button text: `"Edit"`
- Row Edit button aria-label: `"Edit <title>"`
- Row Delete button text: `"Delete"`
- Row Delete button aria-label: `"Delete <title>"`
- Edit dialog heading: `"Edit assignment"`
- Edit dialog submit button: `"Save changes"`
- Live-region announcement after a successful edit: `"Assignment updated."` (no success toast — D114E-7)
- Delete dialog heading: `"Delete <title>?"`
- Delete dialog message: `"This permanently deletes the assignment. Any subtasks will remain without an assignment."`
- Delete dialog confirm button: `"Delete"`
- Delete dialog cancel button: `"Cancel"`
- Live-region announcement after a successful delete: `"Assignment deleted."` (no success toast — D114E-7)
- Due date hint — create: `"Optional — leave blank for no due date."` / edit: `"Optional — leave blank to keep the current due date."`
- Estimated duration hint — create: `"Optional"` / edit: `"Optional — leave blank to keep the current duration."`
- Priority hint — create: `"Optional — defaults to Medium"` / edit: `"Pick a different value to change the priority."`
- Description hint — create: `"Optional — up to 2000 characters."` / edit: `"Optional — up to 2000 characters. Leave blank to clear."`

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D114E-1 | **Per-row controls use visible text buttons** (`variant="outline"` for Edit, `variant="ghost"` for Delete), placed alongside badges. | User decision (2026-10-24); matches `MeetingsSection` and `SemesterList` design precedent. |
| D114E-2 | **Description textarea added to `AssignmentForm`** (optional, ≤ 2000 chars) for both create and edit modes. | User decision (2026-10-24); exposes the existing schema column cleanly without mode divergence. |
| D114E-3 | **Delete confirmation uses dedicated modal dialog (`DeleteAssignmentDialog`)** with safe default focus on Cancel, destructive button styling, and warning copy. | User decision (2026-10-24); matches `DeleteMeetingDialog` and `DeleteSemesterDialog` precedent. |
| D114E-4 | **Status and actualHours are excluded from the form.** Status is lifecycle-managed (story 5); actualHours is session-tracked (story 5). | Aligned with D113-3 and D114-2. |
| D114E-5 | **Local date conversion for date input:** ISO string from assignment is parsed to local date parts (`YYYY-MM-DD`) when initializing the input, avoiding off-by-one time-zone shifts. | Reuses `localDate` helper in `AssignmentForm.tsx`. |
| D114E-6 | **Edit payload follows the D114-5 null semantics:** a blank due date / estimated duration sends `null` (the backend keeps the stored value); a blanked description sends `''` (clears it — the only clearable field); `priority` always round-trips the select's value. | User decision 2026-10-24; mirrors the `CourseForm` edit payload (F111B-1/D111B-3). |
| D114E-7 | **Success feedback is a live-region announcement, not a toast:** after a successful edit or delete the course detail page announces `"Assignment updated."` / `"Assignment deleted."` in its `role="status"` region and background-refetches. | User decision 2026-10-24; matches the meetings pattern (D112B-10) and the existing `onAssignmentFormOpen` status-clear. |

## Definition of Done

All applicable shared DoD (see SP-114 parent). Frontend-specific:

- `AssignmentsSection` renders per-row Edit and Delete buttons with accessible labels.
- `AssignmentForm` extended with `assignment?: CourseAssignment` prop, Description textarea, and mode-aware hints (D114E-6).
- `onAssignmentChanged` is action-aware (`'added' | 'updated' | 'deleted'`); `CourseDetailPage` announces the result in its live region and background-refetches (no success toast — D114E-7).
- `DeleteAssignmentDialog` implemented with modal focus trap, safe default focus, and confirmation flow.
- `assignmentApi.ts` extended with `updateAssignment` and `deleteAssignment`.
- Component tests added for `AssignmentsSection`, `AssignmentForm`, `DeleteAssignmentDialog`, and `assignmentApi`.
- Keyboard accessibility verified (Tab, Shift+Tab, Escape, focus restoration).
- Responsive layout verified on mobile and desktop viewports.
- All copy matches exact strings specified in ticket.

## Sizing block

- **Outcome:** Per-row edit/delete controls in `AssignmentsSection`, form reuse with description support, `DeleteAssignmentDialog`, API client methods, and the action-aware `onAssignmentChanged` callback (live-region announcements, D114E-7).
- **Time estimate:** ~2–2.5 hours.
- **Production files:**
  - `apps/web/src/features/courses/ui/AssignmentsSection.tsx`
  - `apps/web/src/features/courses/ui/AssignmentForm.tsx`
  - `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx`
  - `apps/web/src/entities/assignment/api/assignmentApi.ts`
  - `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` (action-aware `onAssignmentChanged` handler)
- **Test files:**
  - `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx`
  - `apps/web/src/features/courses/ui/AssignmentForm.test.tsx`
  - `apps/web/src/features/courses/ui/DeleteAssignmentDialog.test.tsx`
  - `apps/web/src/entities/assignment/api/assignmentApi.test.ts`
- **Minimal start context:** Read `AssignmentsSection.tsx`, `AssignmentForm.tsx`, `DeleteMeetingDialog.tsx`, `MeetingsSection.tsx`, `assignmentApi.ts`, `CourseDetailPage.tsx` (the `handleMeetingChanged` pattern + the `onAssignmentFormOpen` status-clear).
- **Verification commands:** `pnpm test -- AssignmentsSection.test.tsx`, `pnpm test -- AssignmentForm.test.tsx`, `pnpm test -- DeleteAssignmentDialog.test.tsx`, `pnpm test -- assignmentApi.test.ts`.
- **Dependencies:** SP-113A (API client), SP-113B (existing form + section), SP-114D (PATCH + DELETE endpoints).
- **Exclusions:** Status updates, actualHours, subtasks — owned by stories 4 and 5.
