# SP-124B: List Page Adopts the Shared Interaction

**Story ID:** SP-124B  
**Title:** Frontend: assignment list rows edit in place through the shared owner  
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md)  
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)  
**Milestone:** M1  
**Layer:** Frontend  
**Priority:** High / P0  
**Status:** Implemented — awaiting parent review  
**Refined:** 2026-10-26 (UI/UX refined)  
**Dependencies:** SP-124A implemented. SP-122B reviewed. No backend dependency.  
**Jira key:** Pending creation  
**Implementation:** [implementation](./artifacts/SP-124B/implementation.md)  

## Summary

On `/assignments`, a student can edit, delete, change status, and manage subtasks without leaving the list. The page is a host: it renders `AssignmentRow`, mounts the shared dialogs once, and refetches `GET /assignments` with the current filters. It does not grow its own status handler, dialog state, or checklist.

## Bounded scope

In: replace the list row's private badge/title markup with `AssignmentRow`; title opens edit; course meta slot with navigation; one `useAssignmentActions` call; refetch on change; component and accessibility tests.

Out: a second copy of edit/delete/status/subtask logic (forbidden by D124-10). Create ([SP-124C](./SP-124C-shared-create.md)). Course-page changes beyond what A already did. API or schema changes.

## Source requirement references

- **AC-E03-03**, **AC-E03-04**, and SP-114 edit/delete — second surface, same implementation as A.
- Shared DoD items 1, 4, 5, 6, 7, 8. Items 2, 3, 9 are not applicable. Items 10 and 11 are the parent review and reviewer walkthrough.

## Acceptance criteria

1. **Shared row integration.** Each list row is rendered via `AssignmentRow` from `@/features/assignments`. Status select, edit button, delete button, overdue pill, priority/type badges, and subtask disclosure come from the shared owner. `AssignmentsPage` does not define its own status `Select`, delete handler, or `SubtaskChecklist` wiring.
2. **Title opens edit modal.** Activating the assignment title button opens the shared `AssignmentForm` dialog in edit mode for that assignment (D124-11, UI-124B-1). It does not navigate to `/courses/:id`, and it does not expand an inline editor in the row. The button is styled as a subtle text button (`text-left font-medium text-secondary-900 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded`).
3. **Course affordance in meta slot.** When the row has an associated course, the `meta` slot beneath the due date renders a clickable link routing to `/courses/:id` (D124-3, UI-124B-2). The link displays the course color dot, monospace code, and course name (`text-xs text-secondary-600 hover:text-secondary-900 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded`). When `course` is null, the meta slot renders static neutral text `No course` (`text-xs text-secondary-500`) with no link affordance.
4. **Refetch with current params.** After an edit, delete, status change, or subtask change, the page refetches `GET /assignments` using the active filter, search, and sort parameters.
   - During background refetch, the existing filter bar spinner (`Loader2`) is visible and the list has `aria-busy="true"` (UI-124B-4). The existing rows remain visible and interactive.
   - A failed refetch displays an actionable toast error (`We could not load your assignments. Try again.`) and preserves the existing list.
5. **Single hook and dialog mount.** The page calls `useAssignmentActions` once for the list and mounts `AssignmentDialogs` once.
6. **Error handling.** A 404 from edit or delete displays the existing uniform not-found copy (`Resource not found — this course or assignment may no longer exist.`). Other mutation failures toast actionable sanitized error messages (`We could not update the status. Try again.`, `We could not save the assignment. Try again.`).
7. **Keyboard and responsive accessibility.**
   - All interactive controls (title button, course link, subtasks toggle, status select, edit button, delete button) are fully keyboard-navigable in standard DOM order with visible focus indicators.
   - On screens under `sm` (< 640px), the row cleanly wraps the upper metadata block above the action cluster; the status select and action buttons maintain minimum 44 px touch targets without overflow or overlapping.
8. **Automated tests.** Component tests verify:
   - Activating title button opens `AssignmentForm` in edit mode (and does not trigger course navigation).
   - Activating Edit button opens `AssignmentForm` in edit mode.
   - Course link renders and navigates to `/courses/:id` when `course` is present; static "No course" renders when null.
   - Status change calls `updateAssignment` and triggers list refetch with current parameters.
   - Delete calls `deleteAssignment` and triggers list refetch, removing the row.
   - Subtasks toggle opens `SubtaskChecklist`.
   - Refetch displays the spinner, sets `aria-busy`, and handles refetch failure gracefully.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — private row markup (title `Link`, inline badges, overdue pill) to be replaced with `AssignmentRow` and `AssignmentDialogs`. `runFetch(params, initial)` handles refetches.
- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — shared row component; accepts `onTitleActivate`, `meta`, `statusValue`, `statusDisabled`, `expanded`, `busy`, and action handlers.
- `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx` — single mount point for `AssignmentForm` (edit) and `DeleteAssignmentDialog`.
- `apps/web/src/features/assignments/model/useAssignmentActions.ts` — shared hook returning action handlers, dialog state, and busy sets.
- `apps/web/src/features/assignments/ui/assignmentPresentation.ts` — shared presentation constants (`OVERDUE_LABEL`, `OVERDUE_STYLE`, `STATUS_LABELS`, etc.).

### Element decisions

| Element | Placement / Component | Rationale |
|---|---|---|
| Assignment Row | Reused `features/assignments/ui/AssignmentRow.tsx` | Single owner for row actions, status select, badges, and subtasks (D124-10). |
| Assignment Dialogs | Reused `features/assignments/ui/AssignmentDialogs.tsx` | Single mount point for edit modal and delete dialog (D124-11). Mount once at page root. |
| Title Control | `button` in `AssignmentRow` (`onTitleActivate`) | Text button styled as heading text; opens edit modal rather than course navigation (D124-3, UI-124B-1). |
| Course Link | Custom slot element in `meta` prop of `AssignmentRow` | Positioned below due date; links to `/courses/:id` with color dot, code, and name (UI-124B-2). |
| Subtask Checklist | Reused `features/assignments/ui/SubtaskChecklist.tsx` | Managed internally by `AssignmentRow` when expanded. |
| Dialog State Hook | Reused `features/assignments/model/useAssignmentActions.ts` | Owns row mutation states, busy sets, and dialog toggling without duplication. |

### Layout and hierarchy

- **Page Container:** `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12`
- **Filter Bar:** Top of the card (`Search`, `Course`, `Due from`, `Due to`, `Status`, `Priority`, `Type`, `Sort by`, Sort order toggle button, and refetch spinner).
- **Status Live Region:** `role="status"` below heading, announcing assignment count or filter results.
- **List Container:** `ul.divide-y.divide-secondary-100` with `aria-busy={isFetching}`.
- **Per Row (`AssignmentRow`):**
  - **Left Section (`min-w-0`):**
    1. Title button: `<button type="button" onClick={onTitleActivate} className="text-left font-medium text-secondary-900 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">{assignment.title}</button>`
    2. Due date line: `Due <date>` + inline Overdue pill (`bg-red-100 text-red-700 rounded-full`) if overdue and unfinished. If no due date, `No due date`.
    3. Course meta line (`meta` slot):
       - If course exists: `<Link to={`/courses/${course.id}`} className="group inline-flex items-center gap-1.5 text-xs text-secondary-600 hover:text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-label={`View course: ${course.name}`}>` with color dot (`h-2.5 w-2.5 rounded-full`), code (`font-mono text-xs font-medium`), and name (`truncate group-hover:underline`).
       - If course is null: `<span className="text-xs text-secondary-500">No course</span>`.
    4. Subtask toggle button: `Button size="sm" variant="ghost"` with chevron, `aria-expanded`, and summary label (`{n} subtask(s), {m} complete` or `No subtasks`).
  - **Right Section (`flex flex-wrap gap-2 items-center`):**
    1. Status `<Select>` with `data-assignment-focus={`status:${assignment.id}`}`.
    2. Priority `<Badge>` (`Low`, `Medium`, `High`, `Urgent`).
    3. Type `<Badge>` (`Homework`, `Paper`, `Project`, `Quiz`, `Exam`) if present.
    4. Edit `<Button size="sm" variant="outline">` with `data-assignment-focus={`edit:${assignment.id}`}`.
    5. Delete `<Button size="sm" variant="ghost">`.
  - **Expanded Section:** `<SubtaskChecklist>` rendered directly below when expanded.

### States

- **Initial Loading:** Centered spinner `<Loader2 className="animate-spin text-primary-600" size={24} />` with text `"Loading your assignments…"`.
- **Background Refetch:**
  - Spinner `<Loader2 className="animate-spin text-primary-600" size={20} />` visible in the filter bar grid.
  - `<ul aria-busy={isFetching}>` set to indicate loading to assistive technology.
  - Rows stay visible and interactive (except mutating row).
- **Empty States:**
  - No assignments overall: `"No assignments yet."`, subtitle `"Assignments you create on your courses will show up here."`, button link to `Browse courses`.
  - No filter matches: `"No assignments match these filters."`, button `Clear filters`.
- **Row In-Flight Mutations:**
  - Status PATCH: Status select disabled on that row (`statusDisabled={true}`); temporarily displays optimistic pending status.
  - Subtask mutation: Checklist controls disabled while request is pending.
  - Edit modal: Form submit button in `isLoading` state; fields disabled.
  - Delete dialog: Confirm button in `isLoading` state.
- **Error States:**
  - Initial load failure: Card with `role="alert"`, error message, and `"Try again"` button.
  - Refetch failure: Toast message `"We could not load your assignments. Try again."`, retaining current list.
  - Status failure: Toast message `"We could not update the status. Try again."`, reverts select to previous status.
  - Edit/Delete 404: In-dialog error `"Resource not found — this course or assignment may no longer exist."`.
  - Generic edit/delete failure: Toast message `"We could not save the assignment. Try again."` / `"We could not delete the assignment. Try again."`.

### Accessibility (WCAG 2.2 AA)

- **Keyboard Operability:**
  - Sequential tab order through each row: Title button -> Course link (if present) -> Subtask toggle -> Status select -> Edit button -> Delete button -> (Subtask checklist items if expanded).
  - Modal focus traps: Both `AssignmentForm` and `DeleteAssignmentDialog` trap focus, close on Escape key, and return focus to the activating element (Title button or Edit button) on close.
  - Focus restoration on delete: Handled by `useAssignmentActions` (focuses neighboring row edit button or empty/add state).
- **Visible Focus States:**
  - Title button: `focus:outline-none focus:ring-2 focus:ring-primary-500 rounded`
  - Course link: `focus:outline-none focus:ring-2 focus:ring-primary-500 rounded`
  - Standard focus rings on select, buttons, and checkboxes.
- **Non-Color Distinctions:**
  - Overdue badge displays explicit text `"Overdue"` in addition to red pill styling.
  - Course dot is paired with readable course code and course name; color dot marked `aria-hidden="true"`.
  - Priority and type badges carry clear text labels.
- **Touch Targets:**
  - On mobile screens (< 640px), the status `<Select>` and buttons maintain >= 44 px touch heights. The upper metadata block (title, due date, course link) is separated vertically from the action controls to prevent mis-taps.

### Responsive behavior

- **Desktop (>= 640px):** Single row with metadata on the left and action buttons aligned on the right (`sm:flex-row sm:items-center sm:justify-between`).
- **Mobile (< 640px):** Stacks into two vertical blocks:
  - Upper block: Title button, due date + overdue badge, course link, and subtask toggle button.
  - Lower block: `flex flex-wrap gap-2 items-center` containing status select, priority/type badges, edit button, and delete button. Course link stays in the upper block to guarantee no crowding of the 44 px action buttons.

### Copy specifications

- **Title button:** `{assignment.title}`
- **Due date:** `Due {formatDate(dueDate)}` or `No due date`
- **Overdue badge:** `Overdue`
- **Course link:** `{course.code} {course.name}` (accessible name: `View course: {course.name}`)
- **No course label:** `No course`
- **Subtasks toggle:** `{n} subtask(s), {m} complete` or `No subtasks`
- **Status options:** `Pending`, `In Progress`, `Completed`, `Submitted`, `Graded`
- **Action buttons:** `Edit`, `Delete`
- **Edit modal header:** `Edit assignment`
- **Edit modal submit:** `Save changes`
- **Delete dialog header:** `Delete assignment`
- **Delete dialog body:** `Are you sure you want to delete "{title}"? This cannot be undone.`
- **Delete dialog confirm:** `Delete assignment`
- **Refetch error toast:** `We could not load your assignments. Try again.`
- **Status update error toast:** `We could not update the status. Try again.`
- **Resource not found error:** `Resource not found — this course or assignment may no longer exist.`

### Decisions

- **D124-2:** List page hosts the shared interaction owner for edit/delete/status/subtasks. (Provenance: User direction 2026-10-26).
- **D124-3 / UI-124B-1:** Assignment title button opens `AssignmentForm` in edit mode; styled as a subtle text button (`text-left font-medium text-secondary-900 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded`). (Provenance: User confirmation 2026-10-26).
- **D124-4:** Refetches are the source of truth; no optimistic list updates on the host. (Provenance: SP-121/SP-122 precedent).
- **D124-7 / UI-124B-2:** "View course" affordance is placed in the `AssignmentRow` `meta` slot beneath the due date, rendering as a link to `/courses/:id` with color dot, code, and name when course exists, or static "No course" text when null. (Provenance: User confirmation 2026-10-26).
- **D124-10:** Single interaction owner: `useAssignmentActions` + `AssignmentRow` are the only mutation/dialog/badge implementation. No second implementation in `AssignmentsPage`. (Provenance: Architecture refinement 2026-10-26).
- **D124-11:** Edit stays modal `AssignmentForm` on both pages; no inline row editor. (Provenance: User confirmation 2026-10-26).
- **UI-124B-3:** Mobile layout stacks metadata and action clusters cleanly, preventing touch target degradation. (Provenance: UI/UX refinement 2026-10-26).
- **UI-124B-4:** Background refetch displays the existing filter bar spinner (`Loader2`) and sets `aria-busy` on the list, keeping rows interactive and toasting on error. (Provenance: User confirmation 2026-10-26).

## Tests

- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` (extend existing suite):
  1. Title button click opens `AssignmentForm` in edit mode and does not trigger route navigation.
  2. "Edit" button click opens `AssignmentForm` in edit mode.
  3. Clicking course link in meta slot navigates to `/courses/:id`.
  4. Row with null course renders "No course" as static text without a link.
  5. Selecting a new status calls `updateAssignment` and triggers `listAssignments` refetch with active filters.
  6. Confirming delete in dialog calls `deleteAssignment` and triggers `listAssignments` refetch.
  7. Subtasks disclosure toggles `SubtaskChecklist` with assignment subtasks.
  8. Background refetch sets `aria-busy="true"` on the list and displays the filter bar spinner.
  9. Refetch error renders error toast and leaves current list intact.
  10. Keyboard navigation verifies focus order across title button, course link, subtask toggle, status select, edit button, and delete button; Escape closes open modal.

## Definition of Done

- The eight acceptance criteria pass.
- Refetch errors are actionable (DoD 4, 5).
- New list controls are keyboard accessible and usable at desktop and mobile widths (DoD 6, 7).
- Component and interaction tests pass (DoD 8).
- No API or migration change (DoD 9).
- Item 10 is the parent review; item 11 is the reviewer walkthrough.

## Sizing

- **Outcome:** Cross-course assignment list adopts the shared interaction row with title-opens-edit, course link affordance in meta, inline status/subtasks/badges, and background refetch.
- **Request/token estimate:** 1–2 requests.
- **Model recommendation:** 2 (Straightforward host integration consuming existing shared components and hook, well-bounded scope).
- **Time estimate:** 1.5–2 hours after A, including host wiring and list tests.
- **Files:**
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx`
- **Start context:**
  - This story file
  - `docs/stories/EP03/SP-124/README.md` (Architecture & Decision register)
  - `apps/web/src/features/assignments/ui/AssignmentRow.tsx`
  - `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx`
  - `apps/web/src/features/assignments/model/useAssignmentActions.ts`
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
- **Verification:**
  - `pnpm --filter @studypilot/web test -- src/pages/assignments/ui/AssignmentsPage.test.tsx src/features/assignments`
  - `pnpm --filter @studypilot/web typecheck`
  - `pnpm --filter @studypilot/web lint`
- **Dependencies / exclusions:** Depends on SP-124A (implemented) and SP-122B (reviewed). Excludes assignment creation on list page (SP-124C).
