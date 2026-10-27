# SP-125: Assignment Page and Module Experience

**Story ID:** SP-125
**Title:** Frontend: clearer assignments page and shared module presentation
**Parent epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent re-review (RV-125-001 and RV-125-002 corrected; [implementation record](./artifacts/SP-125/implementation.md), [review](./artifacts/SP-125/review.md))
**Dependencies:** SP-124 reviewed (`63f9615`). Visual decisions settled (D125-1…10).
**Jira key:** Pending creation
**Refined:** 2026-10-27 (ui-refiner)

## Summary

The assignments list and the shared assignment modules feel designed and calm: clear visual hierarchy, scannable statuses, organized filtering, and a framed subtask panel. Students can search, filter, sort, create, edit, delete, change status, and manage subtasks with responsive controls that work seamlessly across desktop and mobile. This story refines the presentation, component layout, and visual feedback across both the standalone assignments page and the course detail host without adding new capabilities or altering API contracts.

## Description & Bounded scope

### In scope

1. **Assignments page layout (`AssignmentsPage.tsx`):**
   - **Two-tier filter bar:** Primary tier always visible (Search with clear icon, Course select, Status select, and an expandable "Filters" toggle button with active filter count badge). Secondary tier inside an animated/accessible collapsible panel (Due date range with visible field labels, Priority select, Type select, Sort field select, and Sort direction toggle).
   - **Integrated result summary:** Clear assignment count header ("Showing X assignments" or "No assignments match these filters") with a visible "Clear filters" button when filters are active.
   - **Distinct states:** Distinct, friendly empty state for zero assignments, distinct no-match state for active filters, clean loading spinner card, and accessible alert card for initial load error.
2. **Assignment row presentation (`AssignmentRow.tsx`):**
   - **Scannable status control:** Style the status selector using the existing theme palette (`STATUS_STYLES`) so each status (Pending, In progress, Completed, Submitted, Graded) is identifiable at a glance with text and color pairing.
   - **Typographic & metadata hierarchy:** Prominent title (interactive button on the list page; bold text on the course page), secondary due date with overdue pill (`OVERDUE_STYLE`), course chip link, subtasks disclosure button, and priority/type badges.
   - **Responsive action layout:** Actions (Edit, Delete) clearly separated and aligned on desktop; cleanly wrapped on mobile (<640px) without vertical bloat, satisfying touch targets (`min-h-[44px]`).
3. **Subtasks checklist presentation (`SubtaskChecklist.tsx`):**
   - **Framed subtask panel:** When expanded, renders inside an indented, soft-gray container (`bg-secondary-50/75 border border-secondary-200/80 rounded-lg p-3 sm:p-4 mt-2`) with a progress summary ("X of Y complete"), clean checklist rows, reordering controls, and inline add input.
4. **Create / Edit modal presentation (`AssignmentForm.tsx`):**
   - **Standard modal polish:** Clean vertical spacing, consistent input heights, helper text styling, two-column responsive grids for Date + Duration and Type + Priority, and a right-aligned action footer with Cancel (secondary) and Submit (primary) buttons.
5. **Course detail section parity (`AssignmentsSection.tsx`):**
   - Receives all visual enhancements to `AssignmentRow` and `SubtaskChecklist` automatically via the shared module owner (`features/assignments`).

### Out of scope

- New API endpoints, request/response DTO changes, or database migrations (D125-1).
- Replacing the modal dialog with an inline row editor (D124-11, D125-5).
- Alternate view modes: board/kanban, calendar, or timeline view.
- Dashboard "Recent Assignments" widget (EP05).
- Upstream changes to `useAssignmentActions` hook logic, refetch lifecycles, or ownership scoping.

## Source requirement references

- **Epic AC-E03-01 … AC-E03-07:** Preserved in full. All creation, editing, deletion, subtask management, status transitions, overdue indicators, and filtering remain fully functional.
- **Shared Definition of Done:**
  - Item 1: Functional presentation passes.
  - Item 5: Loading, empty, no-match, and error states handled with actionable recovery.
  - Item 6: Keyboard accessibility, focus management, visible focus rings, non-color-only status indicators.
  - Item 7: Responsive layouts tested on desktop (≥1024px) and mobile (375px viewport).
  - Item 8: Automated component and accessibility tests.
  - Item 10: Integrated development environment verification.
  - Item 11: Final reviewer walkthrough.
- **Decisions:** D125-1 through D125-6 in [SP-125 README](./README.md) and settled decisions D125-7 through D125-10 below.

## Settled UI/UX decisions

### 1. Element & component decisions

- **Filter Bar Container:** `div.card` holding a primary search & filter bar, plus an expandable secondary filter panel toggled by a `Button` (ghost/secondary variant with `SlidersHorizontal` or `Filter` icon and active filter count badge).
- **Date Inputs in Filter Bar:** Render with visible `<label>` text ("Due from", "Due to") above or beside the date pickers instead of floating `aria-label` alone, improving visual clarity while maintaining accessibility.
- **Status Selector in Row (`AssignmentStatusSelect` or styled `<select>`):**
  - Renders a styled dropdown button/select with dynamic classes from `STATUS_STYLES`:
    - `PENDING`: `bg-slate-100 text-slate-700 border-slate-300`
    - `IN_PROGRESS`: `bg-blue-100 text-blue-700 border-blue-300`
    - `COMPLETED`: `bg-green-100 text-green-700 border-green-300`
    - `SUBMITTED`: `bg-violet-100 text-violet-700 border-violet-300`
    - `GRADED`: `bg-teal-100 text-teal-700 border-teal-300`
  - Pairs text and color with a small chevron icon. Maintains full native keyboard operability (Arrow keys, Enter, Space) and stable focus hook `data-assignment-focus="status:${assignment.id}"`.
- **Row Action Buttons:**
  - "Edit" (`variant="outline"`, `size="sm"`) and "Delete" (`variant="ghost"`, `size="sm"`, `text-secondary-600 hover:text-red-700 hover:bg-red-50`).
- **Subtask Panel:**
  - Indented container with `bg-secondary-50/75 border border-secondary-200/80 rounded-lg p-3 sm:p-4 mt-2`.
  - Header line: `span.text-xs.font-semibold.uppercase.tracking-wider.text-secondary-500` ("Subtasks") and counter pill ("X of Y complete").
- **Modal Dialog (`AssignmentForm.tsx`):**
  - Fixed centered dialog with clean field spacing (`space-y-4`), clear labels, hint text below inputs, and sticky action buttons at the bottom.

### 2. Layout and hierarchy

#### A. Assignments Page (`/assignments`)
1. **Page Header:**
   - Left: Page title `h1` "Assignments".
   - Right: Primary CTA `Button` "Add assignment" (`data-assignment-focus="add"`).
2. **Screen Reader Live Region (`role="status"`):**
   - Always present in DOM: announces filter changes, item count, and mutation success sentences.
3. **Filter Card:**
   - **Primary Bar:** Flex row with:
     - Search input (flex-1) with search icon on the left and clear `X` button on the right.
     - Course `<Select>` ("All courses" default).
     - Status `<Select>` ("All statuses" default).
     - "Filters" toggle `<Button>` showing active count (e.g., "Filters (2)").
   - **Collapsible Secondary Panel:**
     - Grid layout (2 cols on mobile, 4 cols on tablet/desktop).
     - "Due from" (date input with label).
     - "Due to" (date input with label).
     - "Priority" `<Select>` ("All priorities" default).
     - "Type" `<Select>` ("All types" default).
     - "Sort by" `<Select>` + Sort order toggle (`ArrowUp` / `ArrowDown`).
   - **Active Filters Summary Line:** Shown if any filter or non-default sort is active, offering an inline "Clear filters" text button.
4. **Results Section:**
   - Summary bar: "Showing X assignments" text with subtle divider.
   - List container: `ul.divide-y.divide-secondary-100` rendering `AssignmentRow`s.
   - Empty/No-match container when empty.

#### B. Assignment Row (`AssignmentRow.tsx`)
- **Desktop (≥640px):**
  - **Left column (Primary info):**
    - Line 1: Title button/text (`text-base font-semibold text-secondary-900 hover:underline`).
    - Line 2: Due date (`text-sm text-secondary-600`) + Overdue pill (`OVERDUE_STYLE`) if overdue + Course chip link (list host) or "No course".
    - Line 3: Subtask disclosure button (`ChevronDown` icon + "X subtasks, Y complete").
  - **Right column (Status & Actions):**
    - Status pill select (colored by status).
    - Priority badge (`PRIORITY_STYLES`).
    - Type badge (`TYPE_STYLE`) if present.
    - Edit button (`size="sm"`, `variant="outline"`).
    - Delete button (`size="sm"`, `variant="ghost"`).
- **Mobile (<640px):**
  - Line 1: Title button/text.
  - Line 2: Due date + Overdue pill + Course chip.
  - Line 3: Subtask disclosure button.
  - Line 4 (Action bar): Status pill select on the left; Priority/Type badges and Edit/Delete buttons on the right, maintaining ≥44px touch targets.

#### C. Subtask Checklist (`SubtaskChecklist.tsx`)
- Container: Indented `rounded-lg border border-secondary-200/80 bg-secondary-50/75 p-3 sm:p-4`.
- Header: "Subtasks" title + progress counter (`2 of 4 complete`).
- Items: Checkbox (`accent-primary-600`), title label (strikethrough when completed), up/down order buttons (`ArrowUp`/`ArrowDown`), delete button (`Trash2` or `X`).
- Add item: Compact input with inline "Add" button.

### 3. State presentation

| State | Visual Treatment | Primary Call to Action |
|---|---|---|
| **Loading (Initial)** | Centered card with `Loader2` spinner and text "Loading your assignments…" | None |
| **Loading (Background Refetch)** | Subtle spinner next to filter summary; existing list rows remain visible with `aria-busy="true"` | None |
| **Empty (Zero Assignments)** | Friendly card with icon, headline "No assignments yet", subtext "Create an assignment directly or browse your courses." | "Add your first assignment" (primary) + "Browse courses" (outline) |
| **No Matches (Filters Active)** | Centered card with search icon, headline "No assignments match these filters", subtext "Try adjusting your search terms or clearing filters." | "Clear filters" (secondary/primary) |
| **Initial Error** | Alert card with `role="alert"`, red accent border, descriptive error text | "Try again" button |
| **Course All Complete** | Course section displays "All assignments are complete." with "Show completed (N)" disclosure | "Show completed (N)" button |

### 4. Accessibility (WCAG 2.2 AA)

- **Keyboard Operability:**
  - Tab order flows logically: Header Add → Search → Primary Filters → Toggle Secondary Filters → [Secondary Filters if expanded] → Assignment Rows → Status → Edit → Delete.
  - All buttons and disclosures trigger on `Enter` and `Space`.
  - Secondary filter panel uses `aria-expanded` on the toggle button and `aria-controls="advanced-filters-panel"`.
  - Modal dialog traps focus, handles `Escape` to close, and restores focus to the invoking trigger on close.
- **Focus Rings:**
  - High-visibility focus indicators on all interactive elements: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`.
- **Non-Color-Only Indicators:**
  - Status indicators combine distinct text labels with background color pills.
  - Overdue status displays the explicit text "Overdue" inside a red badge (`OVERDUE_STYLE`).
  - Priority badges show "Low", "Medium", "High", "Urgent".
- **Stable Focus Targets (Preserved):**
  - `data-assignment-focus="add"` on page Add button.
  - `data-assignment-focus="empty-add"` on empty state Add button.
  - `data-assignment-focus="status:${id}"` on status selector.
  - `data-assignment-focus="edit:${id}"` on row Edit button.
  - `data-subtask-focus=...` on subtask inputs and action buttons.

### 5. Responsive behavior

- **Desktop (≥1024px):**
  - Primary filter row is a clean inline strip; secondary filter panel expands into a 4-column grid.
  - Assignment row items align horizontally with ample whitespace between title/metadata and action controls.
- **Tablet (640px – 1023px):**
  - Primary filter row wraps search on one line and selects on the next; secondary filter panel displays in 2–3 columns.
- **Mobile (<640px):**
  - Search input takes full width; Course and Status selects sit in a 2-column grid; "Filters" button is full-width.
  - Assignment row stacks title and metadata above a dedicated bottom action bar.
  - Touch targets ensure a minimum height of 44px (`min-h-[44px]`).

### 6. User-facing copy

- **Page Titles & Headers:** "Assignments", "Add assignment", "Edit assignment", "Subtasks".
- **Filter Labels:** "Search assignments by title or description", "Course", "Status", "Due from", "Due to", "Priority", "Type", "Sort by".
- **Filter Action Text:** "Filters", "Filters ({count})", "Hide filters", "Clear filters".
- **Empty & Error Copy:**
  - Empty: "No assignments yet." / "Create an assignment directly or browse your courses."
  - No match: "No assignments match these filters." / "Clear filters".
  - Loading: "Loading your assignments…".
  - Error: "We could not load your assignments. Try again."
- **Status Options:** "Pending", "In progress", "Completed", "Submitted", "Graded".
- **Subtask Counter:** "{noun}, {done} complete" (e.g., "3 subtasks, 1 complete").

## Acceptance criteria

1. **Two-tier filter presentation:** The assignments page presents a primary filter bar with Search, Course, and Status, plus an accessible collapsible panel for secondary filters (Due from, Due to, Priority, Type, Sort field, Sort order). The toggle button indicates whether filters are expanded and displays the active filter count.
2. **Scannable status on rows:** `AssignmentRow` renders the status selector using the text-plus-color `STATUS_STYLES` palette across all five statuses, matching the design specification while preserving keyboard selection and the `data-assignment-focus="status:${id}"` hook.
3. **Clean row hierarchy & responsive stacking:** `AssignmentRow` separates title and metadata from status and actions. On viewports ≥640px, status and actions align to the right; on mobile (<640px), actions wrap cleanly into an action row with ≥44px touch targets without overlapping or visual degradation.
4. **Framed subtasks panel:** When an assignment's subtasks are expanded, they render inside a dedicated container (`bg-secondary-50/75 border border-secondary-200/80 rounded-lg`) with a "Subtasks" header, a progress summary ("X of Y complete"), and full keyboard-accessible checklist controls.
5. **Polished modal dialog:** The create/edit assignment dialog presents grouped fields with consistent spacing, clear helper texts, responsive two-column grids for dates and classifications, and accessible Cancel/Submit buttons.
6. **State presentation & parity:**
   - Unfiltered empty state displays friendly illustration/text with "Add your first assignment" and "Browse courses" CTAs.
   - Filtered empty state displays "No assignments match these filters." with a "Clear filters" CTA.
   - Initial error displays an actionable alert card with "Try again".
   - The course page (`AssignmentsSection`) uses the updated `AssignmentRow` and `SubtaskChecklist` with zero behavioral regression to grouping or show-completed disclosures.
7. **Accessibility compliance:** All new and updated components meet WCAG 2.2 AA: visible focus indicators, non-color-only status badges, correct ARIA attributes (`aria-expanded`, `aria-controls`, `aria-label`), and all existing focus restoration hooks preserved.

## Tests to add / update

### Component & UI tests

- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx`:
  - Renders primary filter controls (Search, Course, Status) and the "Filters" toggle button.
  - Toggling "Filters" reveals/hides the secondary filter panel with visible labels for "Due from" and "Due to".
  - Filter toggle button reflects active secondary filter count badge (e.g., "Filters (2)").
  - "Clear filters" resets both primary and secondary filters and collapses or clears the active indicator.
  - Renders friendly empty state when list is empty and no filters are active; renders filtered no-match state when filters are active.
  - Live region announces result counts and mutation actions correctly.
- `apps/web/src/features/assignments/ui/AssignmentRow.test.tsx` (or inside host tests):
  - Renders status selector with appropriate `STATUS_STYLES` class for `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SUBMITTED`, and `GRADED`.
  - Renders overdue pill, priority badge, and type badge with text and color.
  - Renders Edit and Delete buttons with proper accessible names and focus targets.
  - Mobile layout verification (presence of responsive classes and touch-target sizing).
- `apps/web/src/features/assignments/ui/SubtaskChecklist.test.tsx`:
  - Renders framed container with subtasks progress summary ("X of Y complete").
  - Checkbox toggle, move up/down, add subtask, and delete dialog remain fully functional and retain focus.
- `apps/web/src/features/assignments/ui/AssignmentForm.test.tsx`:
  - Renders polished modal dialog with 2-column grid layout for dates/hours and type/priority.
  - Required validation errors display inline below invalid inputs.
- `apps/web/src/features/assignments/ui/AssignmentsSection.test.tsx`:
  - Course host renders updated `AssignmentRow`s in unfinished and finished groups without regression.

## Technical notes

### Verified current behavior (2026-10-27)

- `AssignmentsPage` is the list host composing `useAssignmentActions`, `AssignmentRow`, and `AssignmentDialogs`.
- `AssignmentsSection` is the course host reusing `AssignmentRow` and `SubtaskChecklist`.
- `useAssignmentActions` handles all mutation calls, focus restoration, and dialog states; this presentation pass makes zero changes to `useAssignmentActions` logic.
- `STATUS_STYLES`, `PRIORITY_STYLES`, `TYPE_STYLE`, and `OVERDUE_STYLE` are exported from `assignmentPresentation.ts`.

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D125-1 | Presentation only. No new capability, route, filter, API field, or schema change. | User request 2026-10-27 ("better UX design and feel"). |
| D125-2 | Shared modules are in scope. Changes land once in `features/assignments` and apply to both hosts. | D124-10. |
| D125-3 | All existing search, filter, sort, edit, delete, status, subtasks, overdue, and course navigation behaviors are preserved. | SP-113–SP-124. |
| D125-4 | UI/UX layout, components, states, responsive behavior, and copy refined in this story. | UI refiner pass 2026-10-27. |
| D125-5 | Create/edit stays the modal `AssignmentForm` (D124-11). Visual treatment polished inside the dialog. | User confirmation 2026-10-26, re-verified. |
| D125-6 | All existing focus target hooks (`data-assignment-focus`, `data-subtask-focus`) are preserved verbatim. | Focus restoration contract. |
| D125-7 | Two-tier expandable filter bar for `/assignments`: Search, Course, Status always visible; Date ranges, Priority, Type, Sort in collapsible panel. | User decision 2026-10-27. |
| D125-8 | Styled status selector using `STATUS_STYLES` text-and-background palette + clean visible Edit/Delete buttons on desktop that stack cleanly on mobile. | User decision 2026-10-27. |
| D125-9 | Framed subtasks panel (`bg-secondary-50/75 border border-secondary-200/80 rounded-lg`) with progress counter and clean checklist rows. | User decision 2026-10-27. |
| D125-10 | Standard modal dialog polish with grouped fields, consistent input heights, and clean action footer. | User decision 2026-10-27. |

## Definition of Done

1. The refined presentation is implemented on `/assignments` and in `features/assignments` shared modules.
2. Existing form validations and field constraints are preserved.
3. No API or schema changes; existing queries remain principal-scoped.
4. Actionable error messages and toasts remain intact.
5. Loading, empty, no-match, and initial error states render per specification.
6. Keyboard navigation, visible focus rings, non-color-only badges, and focus restoration pass WCAG 2.2 AA.
7. Responsive layouts tested on desktop and mobile viewports.
8. Component tests in `pages/assignments` and `features/assignments` pass.
9. Not applicable (no API or migration changes).
10. Integrated review in development environment verified.
11. Final reviewer walkthrough saved upon completion.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** A polished, cohesive, and accessible user experience for the assignments page and shared modules, implementing the two-tier filter bar, colored status pills, framed subtask checklist, and polished modal dialog.
- **Request/token estimate:** 2–3 requests for implementation and verification, well bounded within the existing frontend structure.
- **Model recommendation:** 3 (careful layout, responsive styling, and accessible markup across existing components without altering core hooks or API layers).
- **Files:**
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx`
  - `apps/web/src/features/assignments/ui/AssignmentRow.tsx`
  - `apps/web/src/features/assignments/ui/SubtaskChecklist.tsx`
  - `apps/web/src/features/assignments/ui/AssignmentForm.tsx`
  - `apps/web/src/features/assignments/ui/assignmentPresentation.ts`
  - `apps/web/src/features/assignments/ui/AssignmentsSection.tsx`
- **Start context:** This refined story file, `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`, `apps/web/src/features/assignments/ui/AssignmentRow.tsx`, and `apps/web/src/features/assignments/ui/assignmentPresentation.ts`.
- **Verification:** `pnpm --filter web test -- src/pages/assignments src/features/assignments` and `pnpm --filter web typecheck && pnpm --filter web lint`.
- **Dependencies / exclusions:** Refinement complete. No backend work or dashboard widget work.
