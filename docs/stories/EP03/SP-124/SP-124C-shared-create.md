# SP-124C: Shared Create on the List

**Story ID:** SP-124C  
**Title:** Frontend: create an assignment from the list through the shared form  
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)  
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)  
**Milestone:** M1  
**Layer:** Frontend  
**Priority:** High / P0  
**Status:** Implemented — awaiting parent review  
**Refined:** 2026-10-26 (UI/UX refined)  
**Dependencies:** SP-124A implemented (the form lives in `features/assignments`). Does not require SP-124B. No backend dependency.  
**Jira key:** Pending creation  
**Implementation:** [implementation](./artifacts/SP-124C/implementation.md) (implemented 2026-10-26 — awaiting the combined parent review)  

## Summary

A student can create an assignment on `/assignments`. The list opens the same `AssignmentForm` modal dialog the course page uses (D124-6, D124-11). Because the cross-course list has no fixed course, the form renders an optional course selector when `courseId` is omitted, pre-filling with the active course filter if one is selected, or defaulting to "No course". The page header gains a primary "Add assignment" button matching `/courses` and `/semesters`, and the unfiltered empty state provides both direct creation and course browsing CTAs. This child also writes the SP-124 parent implementation index and the DoD-10 browser verification note.

## Bounded scope

In:
- Optional `courseId` and `courses` prop on `AssignmentForm`; course select with "No course" option rendered only in create mode when `courseId` is omitted.
- Pre-fill Course select with the active course filter if present on `/assignments`.
- `AssignmentsPage` header "Add assignment" button (`data-assignment-focus="add"`).
- Dual CTA in unfiltered empty state ("Add your first assignment" + "Browse courses").
- Success refetch with current filter, search, and sort parameters and page live region announcement.
- `AssignmentDialogs` wiring to pass `courses` and `initialCourseId`.
- Component and interaction tests for form modes and page entry points.
- Parent implementation index (`docs/stories/EP03/SP-124/artifacts/SP-124/implementation.md`) and DoD-10 browser note.

Out:
- A second create form component (D124-10).
- Row edit/delete/status/subtasks on the list (SP-124B).
- Course-page create changes (fixed `courseId` remains unchanged and never renders the course select).
- Edit mode course re-assignment (edit mode never renders the course select).
- Backend, API, or database schema changes (D124-1).

## Source requirement references

- **AC-E03-01** — "Students can create an assignment with a title and course." Course remains optional (SP-113 / D113-1); "No course" is allowed.
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, 10. Items 3 and 9 are not applicable. Item 11 is the final reviewer walkthrough.

## Acceptance criteria

1. **Shared form reuse.** Activating the "Add assignment" button in the page header or "Add your first assignment" in the empty state opens `AssignmentForm` from `@/features/assignments` in create mode. There is no duplicate list-local form component (D124-10).
2. **Fixed course on course host preserved.** When `courseId` is passed as a non-empty string (as on `AssignmentsSection` on `CourseDetailPage`), the form does not render a Course select and automatically includes that fixed `courseId` in the `createAssignment` POST body.
3. **Edit mode invariant.** When `assignment` is passed (edit mode), the Course select is never rendered, regardless of `courses` or `courseId` props (D124-6).
4. **List create with course selector.** When `courseId` is omitted or empty on `AssignmentForm` and `assignment` is undefined:
   - The form renders a `<Select>` for Course directly below the `Title` input and above the 2-column `Due date` / `Estimated duration` grid (UI-124C-3).
   - The select contains an initial option `No course` (`value=""`), followed by the active courses formatted as `{course.code} {course.name}` (UI-124C-4).
   - If the list host has an active course filter (`courseId !== ''`), the form initializes the select to that course; otherwise it defaults to `""` ("No course") (UI-124C-3).
   - Submitting with `No course` selected omits `courseId` from the `createAssignment` payload (storing an unassigned assignment).
   - Submitting with a selected course includes that `courseId` in the `createAssignment` payload.
5. **Form validation and error handling.**
   - Title, due date, estimated hours, priority, type, and description enforce existing validation rules (DoD 2). The Course select is optional and does not block submit when set to "No course".
   - 400 validation errors from the API map to corresponding form fields (including `courseId` if rejected).
   - Duplicate submission is blocked while a request is in flight (`isSubmitting` disables inputs/buttons, dialog has `aria-busy="true"`).
   - Submitting failure toasts an actionable error (`We could not save the assignment. Try again.`).
6. **Populated list header action.** On `/assignments`, the page header renders a primary `<Button data-assignment-focus="add" onClick={actions.openForm}>Add assignment</Button>` aligned with the "Assignments" title (UI-124C-1).
7. **Empty state actions.**
   - Unfiltered empty state (`isEmpty && !filtersActive`): renders message `"No assignments yet."`, subtitle `"Create an assignment directly or browse your courses."`, a primary button `<Button data-assignment-focus="empty-add" onClick={actions.openForm}>Add your first assignment</Button>`, and a secondary button `<Link to="/courses"><Button variant="outline">Browse courses</Button></Link>` (UI-124C-2).
   - Filtered empty state (`isEmpty && filtersActive`): retains `"No assignments match these filters."` with `<Button onClick={clearFilters}>Clear filters</Button>`. The header "Add assignment" button remains accessible in the header.
8. **Refetch and live region announcement.** On successful assignment creation:
   - The modal dialog closes.
   - The list refetches `GET /assignments` with the currently active filter, search, and sort parameters.
   - The page status live region announces `"Assignment added. Showing {count} assignment(s)."` (matching the host convention).
   - Keyboard focus returns to the activating control (the header Add button or the empty state Add button).
9. **Parent implementation index and DoD-10 browser note.** This child creates `docs/stories/EP03/SP-124/artifacts/SP-124/implementation.md` indexing SP-124A, SP-124B, and SP-124C, and records the manual browser verification notes covering creation from the list with and without a course.
10. **Automated tests.** Component and interaction tests verify:
    - `AssignmentForm`: renders course select only when `courseId` is omitted in create mode; omits `courseId` when "No course" is selected; sends `courseId` when a course is chosen; respects initial pre-fill; omits course select in fixed-course mode; omits course select in edit mode.
    - `AssignmentsPage`: header Add button opens create modal; unfiltered empty state Add button opens create modal; active filter pre-selects course in modal; successful create closes modal, refetches list, and updates live region; create error maintains modal and shows actionable error.

## Tests

- `apps/web/src/features/assignments/ui/AssignmentForm.test.tsx` (extend existing suite):
  1. Create mode with omitted `courseId` and `courses` provided renders the Course select below Title with "No course" as default.
  2. Submitting with "No course" calls `createAssignment` with no `courseId` field.
  3. Selecting a course from the select calls `createAssignment` with the selected `courseId`.
  4. Passing `initialCourseId` pre-selects that course in the Course select.
  5. Fixed `courseId` provided (course host) does not render the Course select and sends fixed `courseId`.
  6. Edit mode (`assignment` prop passed) does not render the Course select even when `courses` is provided.
  7. Keyboard navigation traverses Title -> Course select -> Due date -> Duration -> Type -> Priority -> Description -> Cancel -> Create assignment; Escape closes dialog.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` (extend existing suite):
  1. Activating header "Add assignment" button opens `AssignmentForm` in create mode with course options.
  2. Unfiltered empty state renders "Add your first assignment" and "Browse courses" buttons; clicking "Add your first assignment" opens `AssignmentForm`.
  3. Opening create while filtering by a specific course pre-fills that course in the form's Course select.
  4. Successful creation closes the form, calls `listAssignments` with current parameters, and updates the live region to announce `"Assignment added. Showing X assignments."`.
  5. Closing the form on Cancel returns keyboard focus to the activating button.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/features/assignments/ui/AssignmentForm.tsx` — accepts `courseId?: string`, `courses?: CourseWithSemester[]`, `initialCourseId?: string`. Already handles modal dialog layout, focus trapping, validation schema, error mapping, and submission.
- `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx` — receives `courseId?: string`, `courses?: CourseWithSemester[]`, `initialCourseId?: string` from host and forwards to `AssignmentForm`.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — already loads `courses` via `listCourses()`. Passes `courses` and active filter `courseId` into `AssignmentDialogs`. Renders header Add button and empty state CTAs.
- `apps/web/src/features/assignments/model/useAssignmentActions.ts` — owns `openForm`, `closeForm`, `handleCreateSuccess`, and focus restoration (`[data-assignment-focus="add"]` and `[data-assignment-focus="empty-add"]`).
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `createAssignment` already accepts optional `courseId?: string | null` and omits it from POST body if falsy.

### Element decisions

| Element | Placement / Component | Rationale |
|---|---|---|
| Header Add Button | `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` | Aligned with page title in header block; matches `/courses` and `/semesters` page pattern (UI-124C-1). |
| Empty State Add Button | `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` | Provides direct in-context creation CTA alongside "Browse courses" for students starting on `/assignments` (UI-124C-2). |
| Course Select | Reused `Select` from `@/shared/ui/Select` inside `AssignmentForm.tsx` | Full-width select placed directly below Title; only rendered in cross-course create mode (UI-124C-3). |
| Assignment Dialogs Host | Reused `features/assignments/ui/AssignmentDialogs.tsx` | Single mount point for dialogs; avoids duplicating modal markup in page (D124-10). |

### Layout and hierarchy

- **Page Container (`AssignmentsPage`):** `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12`
  - **Page Header:** `flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between mb-6`
    - Left: `<h1 id="assignments-heading" className="text-3xl font-bold text-secondary-900">Assignments</h1>`
    - Right: `<Button data-assignment-focus="add" onClick={actions.openForm}>Add assignment</Button>`
  - **Live Region:** `<div role="status" className="mb-4 min-h-5 text-sm text-secondary-600">{statusMessage}</div>`
  - **Card Container:** `card p-6` containing Filter Bar and either List or Empty State.
  - **Empty State (Unfiltered):**
    - Message: `text-sm text-secondary-700` `"No assignments yet."`
    - Subtitle: `mt-1 text-sm text-secondary-500` `"Create an assignment directly or browse your courses."`
    - Button row: `mt-4 flex flex-wrap items-center justify-center gap-3`
      - Primary: `<Button data-assignment-focus="empty-add" onClick={actions.openForm}>Add your first assignment</Button>`
      - Secondary: `<Link to="/courses"><Button variant="outline">Browse courses</Button></Link>`
  - **Empty State (Filtered):**
    - Message: `text-sm text-secondary-700` `"No assignments match these filters."`
    - Button: `<Button className="mt-4" onClick={clearFilters}>Clear filters</Button>`
- **Dialog Layout (`AssignmentForm`):**
  - Modal overlay: `fixed inset-0 z-50 flex items-center justify-center p-4` with backdrop `absolute inset-0 bg-secondary-900/50`
  - Dialog card: `card relative max-h-[90vh] w-full max-w-md overflow-y-auto`
  - Title: `<h2 id="assignment-form-title" className="text-lg font-semibold text-secondary-900">Add an assignment</h2>`
  - Form Fields (top to bottom):
    1. Title: `<Input label="Title" placeholder="Problem Set 4" required ... />` (full width)
    2. Course Select (only when `!courseId && !isEdit`):
       `<Select label="Course" hint="Optional — choose a course or leave unassigned." ...>` (full width)
       - `<option value="">No course</option>`
       - `{courses.map(c => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}`
    3. Grid (`grid grid-cols-1 gap-4 sm:grid-cols-2`):
       - Due date: `<Input label="Due date" type="date" hint="Optional — leave blank for no due date." ... />`
       - Estimated duration: `<Input label="Estimated duration (hours)" type="number" step="any" hint="Optional" ... />`
    4. Grid (`grid grid-cols-1 gap-4 sm:grid-cols-2`):
       - Type: `<Select label="Type" hint="Optional." ... />`
       - Priority: `<Select label="Priority" hint="Optional — defaults to Medium" ... />`
    5. Description: `<textarea label="Description" rows={3} maxLength={2000} ... />` (full width)
  - Footer actions: `flex flex-col-reverse gap-3 sm:flex-row sm:justify-end`
    - Cancel: `<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>`
    - Submit: `<Button type="submit" variant="primary" isLoading={isSubmitting} aria-label="Create assignment">Create assignment</Button>`

### States

- **Initial Load:** Unchanged — centered spinner with `"Loading your assignments…"`.
- **Form Closed:** Header Add button and empty state Add button are interactive.
- **Form Open:**
  - Dialog focused; backdrop blocks page interaction.
  - Initial field values: Title `""`, Course set to `initialCourseId` if matching an available course else `""` ("No course"), Due date `""`, Estimated duration `""`, Type `""`, Priority `"MEDIUM"`, Description `""`.
- **Form In-Flight Submission:**
  - `isSubmitting = true`, `dialogRef` has `aria-busy="true"`.
  - All form inputs, selects, textarea, Cancel button, and Submit button are disabled.
  - Submit button displays loading spinner (`isLoading={isSubmitting}`).
- **Success State:**
  - Dialog unmounts.
  - Page live region updates: `statusMessage` announces `"Assignment added. Showing {count} assignment(s)."`.
  - `listAssignments(currentParams)` executes in background with filter bar spinner (`Loader2`).
  - Active button that triggered the modal receives focus.
- **Error States:**
  - Field validation error (400): mapped to field helper text (e.g., `errors.courseId?.message` or `errors.title?.message`).
  - Course 404 error: displays in-dialog alert banner (`"{apiErrorMessage} — this course may no longer exist."`).
  - Generic server failure: toasts `"We could not save the assignment. Try again."`. Form inputs remain editable and in-flight lock releases.

### Accessibility (WCAG 2.2 AA)

- **Keyboard Navigation and Focus:**
  - DOM tab sequence inside create dialog: Title -> Course select (when rendered) -> Due date -> Estimated duration -> Type -> Priority -> Description -> Cancel button -> Create assignment button.
  - Dialog focus trap: Tab and Shift+Tab wrap within the dialog focusable elements. Escape key closes the dialog (when not in-flight) and stops propagation.
  - Focus restoration: when the dialog closes (via Cancel, Escape, or submit success), focus returns to the activating control:
    - If triggered from page header: focuses `[data-assignment-focus="add"]`.
    - If triggered from empty state: focuses `[data-assignment-focus="empty-add"]`.
    - Handled cleanly by `AssignmentForm`'s `trigger?.focus()` return in `useEffect`.
- **Visible Focus Rings:**
  - All interactive elements use standard `focus:outline-none focus:ring-2 focus:ring-primary-500` focus indicators.
- **Non-Color Distinctions:**
  - Course options display textual `{c.code} {c.name}` alongside explicit `"No course"`.
  - Field errors display descriptive red text messages with `aria-invalid="true"` on the control.
  - Required fields explicitly marked with `required` attribute and visible asterisk.
- **Touch Targets:**
  - On viewports < 640px, all buttons (`min-h-[44px]`), selects (`min-h-[44px]`), and date inputs maintain minimum 44 px touch heights.
  - Header Add button and empty state buttons maintain standard touch padding (`px-4 py-2`).

### Responsive behavior

- **Desktop (>= 640px):**
  - Page header displays "Assignments" heading on the left and "Add assignment" button on the right in a single row (`sm:flex-row sm:items-center sm:justify-between`).
  - Dialog displays Course select full width, followed by two 2-column grids (Due date + Duration; Type + Priority).
  - Dialog footer aligns Cancel and Create buttons to the right (`sm:flex-row sm:justify-end`).
- **Mobile (< 640px):**
  - Page header stacks vertically with button below title or reversed (`flex-col-reverse gap-4`).
  - Dialog stacks all fields into a single column (`grid-cols-1`). Dialog scrolls vertically (`max-h-[90vh] overflow-y-auto`) with sticky padding so submit buttons remain accessible.
  - Dialog footer stacks action buttons vertically with Submit on top (`flex-col-reverse gap-3`).

### Copy specifications

- **Header button:** `Add assignment`
- **Empty state heading:** `No assignments yet.`
- **Empty state subtext:** `Create an assignment directly or browse your courses.`
- **Empty state primary button:** `Add your first assignment`
- **Empty state secondary button:** `Browse courses`
- **Dialog title:** `Add an assignment`
- **Course select label:** `Course`
- **Course select unassigned option:** `No course`
- **Course select hint:** `Optional — choose a course or leave unassigned.`
- **Title field label:** `Title`
- **Title placeholder:** `Problem Set 4`
- **Due date field label:** `Due date`
- **Due date hint:** `Optional — leave blank for no due date.`
- **Estimated duration field label:** `Estimated duration (hours)`
- **Estimated duration hint:** `Optional`
- **Type field label:** `Type`
- **Type hint:** `Optional.`
- **Priority field label:** `Priority`
- **Priority hint:** `Optional — defaults to Medium`
- **Description field label:** `Description`
- **Description placeholder:** `Optional notes or instructions`
- **Description hint:** `Optional — up to 2000 characters.`
- **Cancel button:** `Cancel`
- **Submit button:** `Create assignment`
- **Live region create announcement:** `Assignment added. Showing {count} assignment{s}.`
- **Submit error toast:** `We could not save the assignment. Try again.`
- **Course not found dialog alert:** `{apiErrorMessage} — this course may no longer exist.`

### Decisions

- **D124-1:** No backend or API change. Mutations stay on the existing assignment client (`POST /assignments`).
- **D124-6:** Create stays `AssignmentForm`. `courseId` is optional. When omitted, the form shows a course select of the caller's course list plus "No course" and omits `courseId` on POST. Edit mode never shows the select. (Provenance: D113-1 / EP03 architecture).
- **D124-10:** Single interaction owner: `features/assignments` owns `AssignmentForm` and dialog mounting. No list-local form implementation.
- **D124-11:** Create remains the existing modal `AssignmentForm` dialog on both pages; no inline row creator. (Provenance: User confirmation 2026-10-26).
- **UI-124C-1:** Primary "Add assignment" button is placed in the top page header alongside the "Assignments" title heading, matching `/courses` and `/semesters` conventions. (Provenance: User selection 2026-10-26).
- **UI-124C-2:** Unfiltered empty state features dual CTAs: primary "Add your first assignment" button opening the form + secondary "Browse courses" button linking to `/courses`. (Provenance: User selection 2026-10-26).
- **UI-124C-3:** Course select is placed full-width below Title and above Due Date / Duration grid; pre-fills with active filter course if the list is currently filtered by course, otherwise defaults to "No course". (Provenance: User selection 2026-10-26).
- **UI-124C-4:** Course select copy uses label "Course", unassigned option "No course", and hint "Optional — choose a course or leave unassigned.", maintaining non-destructive parity with row badge copy. (Provenance: User selection 2026-10-26).
- **UI-124C-5:** Mobile dialog layout stacks all fields vertically, preserving standard dialog bounds (`max-w-md w-full max-h-[90vh] overflow-y-auto`) and >= 44 px touch targets without overflow. (Provenance: UI/UX refinement 2026-10-26).

## Definition of Done

- The ten acceptance criteria pass.
- Invalid input is handled by the existing form schema and server mapping (DoD 2).
- API errors are actionable (DoD 4).
- Empty, refetch, and loading states are handled (DoD 5).
- New controls are keyboard accessible with visible focus rings and minimum 44 px touch targets on mobile (DoD 6, 7).
- Component and interaction tests pass (DoD 8).
- DoD 10 parent implementation index and manual browser review note are recorded in `artifacts/SP-124/implementation.md`.
- No API or migration change (DoD 9).
- Item 11 is the parent reviewer walkthrough.

## Sizing

- **Outcome:** A student creates an assignment directly from `/assignments` using the shared modal form, with an optional course select that pre-fills if filtered, or "No course", while preserving course-page creation; this child also completes the parent index and browser manual review note.
- **Request/token estimate:** 1–2 requests.
- **Model recommendation:** 2 (Straightforward frontend slice extending the shared form props and list host wiring, with well-isolated component tests and parent index).
- **Time estimate:** 1.5–2 hours, including form prop extension, list header and empty state entry points, parent index artifact, and tests.
- **Files:**
  - `apps/web/src/features/assignments/ui/AssignmentForm.tsx` (+ test `AssignmentForm.test.tsx`)
  - `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx`
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (+ test `AssignmentsPage.test.tsx`)
  - `docs/stories/EP03/SP-124/artifacts/SP-124/implementation.md` (new parent index and DoD-10 note)
- **Start context:**
  - This story file
  - `docs/stories/EP03/SP-124/README.md` (Architecture & Decision register)
  - `apps/web/src/features/assignments/ui/AssignmentForm.tsx`
  - `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx`
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
- **Verification:**
  - `pnpm --filter @studypilot/web test -- src/features/assignments/ui/AssignmentForm.test.tsx src/pages/assignments/ui/AssignmentsPage.test.tsx` passes.
  - `pnpm --filter @studypilot/web typecheck`
  - `pnpm --filter @studypilot/web lint`
- **Dependencies / exclusions:** Depends on SP-124A (implemented). Does not depend on SP-124B's row wiring (though B is already implemented). Excludes backend/API changes and row actions. Owns the parent index and DoD-10 manual note.

