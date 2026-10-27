# SP-126: Course Page Experience

**Story ID:** SP-126
**Title:** Frontend: a modern Courses page consistent with the Assignments redesign
**Parent epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (ui-refiner handoff, D126-5). Not ready to code.
**Dependencies:** SP-125 reviewed (`9dce1c4`) — the design reference is in code; no implementation dependency.
**Jira key:** Pending creation

## Summary

The `/courses` page reads as a polished, production-quality student dashboard consistent with the recently redesigned Assignments page: a "My Courses" header with a subtle subtitle and an upper-right "Add Course" button, a modern search + semester filter toolbar, and a responsive grid of course cards (name, code, course color, semester, instructor, credits) with a three-dot action menu. The experience is easy to scan and low-distraction (ADHD-friendly): one clear heading, one toolbar, scannable cards. All existing course behavior — create, edit, archive/restore, show-archived, navigation to course detail, live-region announcements — is preserved, with no API or schema change.

## Description & Bounded scope

### In scope

1. **Page header (`CoursesPage.tsx`):** a prominent "My Courses" `h1` with a subtle one-line subtitle; the "Add Course" primary button in the upper-right of the header row; the page shell matches the Assignments page's width and spacing (`max-w-5xl`, `py-12`, D126-4).
2. **Search and filtering:** a modern search input (magnifier icon + clear affordance) filtering by course name or code; a compact semester `Select`; both aligned horizontally on desktop and styled like the Assignments search toolbar; a visible reset ("Clear filters") when any filter is active; the existing "Show archived" switch composing with both (D126-3).
3. **Course card grid (`CourseList.tsx` → new `CourseCard.tsx`):** a responsive grid (mobile 1 column, tablet 2, desktop 2–3) of cards showing the course name as the primary heading, the course code, a subtle course-colored indicator, the associated semester (or a muted "No semester"), the instructor (when set), and the credits (when set); the primary card content is clickable and navigates to `/courses/:id`; a three-dot menu (new `CourseActionsMenu.tsx`, modeled on `RowActionsMenu`) offering Edit and Archive/Restore (D126-2); subtle borders, rounded corners, consistent padding, minimal shadows, consistent card heights, subtle hover, visible focus.
4. **States:** an attractive empty state with an "Add your first course" CTA; a helpful no-results message with a reset when filtering matches nothing; the existing loading pattern; the actionable list error with retry.
5. **Accessibility:** keyboard navigation across toolbar, cards, and menu (the menu follows the `RowActionsMenu` model: open focuses the first item, Escape closes and restores the trigger, arrow keys cycle); accessible names on icon-only buttons; readable contrast and visible focus indicators; no color-only information (the Archived indicator is text).

### Out of scope

- New API endpoints, request/response DTO changes, or database migrations (D126-1).
- A pending-assignment count on the cards (D126-1 — the list route returns no assignment data; user-confirmed skip).
- A hard course delete or a new `DELETE /courses/:id` route (D126-2 — archive-first design, D111-2).
- The Semesters page and the Course detail page presentation (a separate future request, if any).
- Upstream changes to `courseApi.ts`, `CourseForm.tsx` behavior, `ArchiveCourseDialog.tsx` behavior, or ownership scoping. (Visual polish inside the two dialogs is in scope per D126-6; replacing either dialog requires an explicit withdrawal.)
- Alternate view modes (board/kanban, calendar, timeline).

## Source requirement references

- **Epic AC-E02-02 / AC-E02-03 / AC-E02-05 / AC-E02-06:** preserved in full — traceability in the [SP-126 README](./README.md#source-requirements-and-test-traceability). AC-E02-01 (semesters) and AC-E02-04 (meetings) are not affected (the Semesters page and the Course detail page are out of scope).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)): items 1, 5, 6, 7, 8, 10, 11 apply; items 2, 3, 4, 9 are not applicable (no new input, read, write, or migration).
- **Decisions:** D126-1…D126-7 in the [SP-126 README](./README.md#decision-register); settled UI/UX decisions below.

## Settled UI/UX decisions

> **Pending — `ui-refiner` records these in this section before implementation (D126-5).**
> The user request settles: header content/placement, toolbar composition and styling, the card
> information set, the grid column counts, the state kinds, and the accessibility requirements.
> The ui-refiner settles the residual details with the user:
>
> - the card's internal layout and the course-color indicator treatment (dot vs. left bar vs. top accent);
> - the three-dot menu placement on the card and its overflow behavior inside the grid;
> - the card-click accessibility pattern (name link + stretched activation area, per the D112B-6 / `AssignmentRow` precedent, vs. other);
> - the subtitle wording;
> - the search mechanism (instant client-side filtering vs. debounce vs. Enter) and placeholder/aria-label copy;
> - the filter-reset affordance (button placement/label, mirroring the Assignments "Clear filters");
> - the "Show archived" switch placement in the new toolbar and the Archived indicator on cards;
> - the empty-state icon/illustration (lucide) and the no-results copy;
> - the hover/focus/elevation details and the consistent-card-height strategy;
> - the exact Tailwind grid breakpoints for 1 / 2 / 2–3 columns.

## Acceptance criteria

1. **Page header:** `/courses` renders a "My Courses" `h1` with a subtle one-line subtitle and a primary "Add Course" button in the upper-right of the header row; the page shell uses the Assignments page's width and spacing (`max-w-5xl`, `py-12`).
2. **Search and filtering:** a search input with a magnifier icon and a clear affordance filters the cards by course name or code (case-insensitive, client-side); a compact semester `Select` filters by semester; on desktop the controls sit in one horizontal toolbar row styled like the Assignments toolbar; a visible reset restores the full list when any filter is active; the existing "Show archived" switch composes with both filters.
3. **Course cards:** courses render as a responsive card grid (1 column mobile, 2 tablet, 2–3 desktop) where each card shows the course name as the primary heading, the course code, a subtle course-colored indicator, the semester (or a muted "No semester"), the instructor (when set), and the credits (when set); the primary card content is clickable and navigates to `/courses/:id`; a three-dot menu offers Edit and Archive (Restore for archived courses) with per-course accessible names; archived cards keep a text "Archived" indicator (not color-only).
4. **Visual hierarchy and consistency:** the course name dominates each card; the course color matches the color already used by the Assignments course chip; cards use subtle borders, rounded corners, consistent padding, minimal shadows, and consistent heights; hover is subtle and focus states are visible; no information is conveyed by color alone.
5. **States:** an attractive empty state with an "Add your first course" CTA when the student has no courses; a helpful no-results message with a reset when filters match nothing; the existing loading pattern while the list is in flight; an actionable error with a retry on list failure.
6. **Accessibility:** the toolbar, cards, and menu are fully keyboard-operable (the menu follows the `RowActionsMenu` model — open focuses the first item, Escape closes and restores the trigger, arrow keys cycle); icon-only buttons carry accessible names; focus indicators are visible; contrast meets WCAG 2.2 AA.
7. **Behavior preservation:** create/edit via `CourseForm`, archive/restore via `ArchiveCourseDialog` (including the existing live-region sentences), the show-archived behavior, the list re-read after every mutation, and name→detail navigation all remain; `apps/web/e2e/semesters-courses.spec.ts` keeps passing with at most pin updates (D126-7).

## Tests to add / update

### Component & UI tests

- `apps/web/src/pages/courses/ui/CoursesPage.test.tsx` (update):
  - Renders the "My Courses" header, the subtitle, and the "Add course" button.
  - Renders the toolbar: search input (magnifier + clear), semester select, reset affordance, and the "Show archived" switch.
  - Search filters by name and by code (case-insensitive); the semester select filters; both compose with the show-archived switch (D126-3).
  - The reset restores the full list; the no-results state appears when filters match nothing.
  - The single `listCourses({ includeArchived: true })` fetch remains the only list read (D126-3); the `role="status"` live region and the existing mutation flows (create/edit/archive/restore) keep passing.
- `apps/web/src/features/courses/ui/CourseList.test.tsx` (update):
  - One card per course with name, code, color indicator, semester (and the "No semester" fallback), instructor (when set), and credits (when set).
  - The text "Archived" indicator on archived cards; the grid renders the API order as-is.
  - Card content click navigates to `/courses/:id`; the menu items carry `Edit/Archive/Restore ${name}` accessible names and never navigate.
- `apps/web/src/features/courses/ui/CourseCard.test.tsx` (new, if extracted): card content rendering, the click target, the hover/focus classes, the consistent-height behavior.
- `apps/web/src/features/courses/ui/CourseActionsMenu.test.tsx` (new, if extracted): the `RowActionsMenu` keyboard model — open focuses the first item, Escape closes and restores the trigger, arrow keys cycle, action re-focuses the trigger before the callback; per-course `aria-label`s.

### End-to-end

- `apps/web/e2e/semesters-courses.spec.ts` (SP-118): pin updates only (D126-7) — the accessible names, the live-region sentences, the empty-state CTA, and the dialog headings are preserved; the create/edit/archive/restore journeys keep passing.

## Technical notes

### Verified current behavior (2026-10-27)

- `apps/web/src/pages/courses/ui/CoursesPage.tsx` (161 lines): page-local state (courses, semesters, `formMode`, `archivingCourse`, `statusMessage`); a single `listCourses({ includeArchived: true })` plus a non-fatal `listSemesters()` for the form's picker; an always-present `role="status"` live region; `max-w-3xl` shell with an `h1` "Courses" and a "New course" button (rendered only when the list is non-empty); one `card` hosting `CourseList`.
- `apps/web/src/features/courses/ui/CourseList.tsx` (252 lines): a flat `divide-y` list — color dot, monospace code, name `Link` to `/courses/:id` (D112B-6: the non-interactive row area navigates on mouse click; the action buttons `stopPropagation`), a text "Archived" badge, the semester name or "No semester", credits; row buttons Edit + Archive/Restore; a `role="switch"` "Show archived" (client-side filter, D111B-1); loading spinner, "No courses yet" + "Add your first course" empty state, "No active courses" state, error + retry.
- `apps/web/src/features/courses/ui/CourseForm.tsx` (552 lines): create/edit modal (`role="dialog"`, react-hook-form + zod, color swatches, `Create course`/`Save changes` submit) — behavior frozen (D126-6).
- `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` (163 lines): focus-trapped confirmation (Escape cancels; focus returns to the trigger; states the operation is reversible, D111-2) — behavior frozen (D126-6).
- Design reference (SP-125, reviewed `9dce1c4`): `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — `max-w-5xl` shell, `h1` + upper-right CTA, a toolbar outside the results card (magnifier search + clear `X`, compact `Select`s, `h-[42px]`, `max-sm:min-h-[44px]`), a results card with a `role="status"` count header, distinct empty/no-match/error states, `rounded-xl border border-secondary-200 bg-white p-4 shadow-sm` card rows. `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` — the three-dot `role="menu"` keyboard/focus model to mirror.
- Tokens: `apps/web/src/index.css` — `primary`/`secondary` Tailwind palettes, `.card` (`bg-white rounded-xl shadow-md p-6`), base `:focus-visible` ring.
- Data: `CourseWithSemester` = the 9-key `Course` (code, name, description?, color, credits?, instructor?, isActive, timestamps) + `semesterId` + `semester: { id, name } | null`. The list route is light — **no assignment data** (D112-3).
- No course API or schema change is required (D126-1).

### Decisions

| ID | Decision | Provenance |
|---|---|---|
| D126-1 | Presentation only. No new capability, route, API field, or schema change — in particular **no pending-assignment count** (the list route returns no assignment data; the user's "when supported by existing data" condition is not met). | User request 2026-10-27 + user confirmation 2026-10-27 (skip the count). Reversible if a later request adds the projection. |
| D126-2 | The card's three-dot menu offers **Edit + Archive/Restore** — no hard delete (no `DELETE /courses/:id` in the MVP; archive-first design D111-2; archived courses remain accessible, AC-E02-05). A course-specific menu in `features/courses/ui/` mirroring the `RowActionsMenu` keyboard/focus model; no refactor of the reviewed assignments module. | User decision 2026-10-27. |
| D126-3 | Search and semester filtering are **client-side** over the already-fetched list (the page already fetches `includeArchived: true`, D111B-1; a student's course list is small; the semester options come from the already-fetched `listSemesters()`). No new `q`/filter API parameters; the "Show archived" switch composes with them. | Planner-recorded (grounded in D111B-1 + the Assignments toolbar precedent; reversible). |
| D126-4 | The page shell matches the redesigned Assignments page: `max-w-5xl` width, `py-12`, "My Courses" `h1` + a subtle subtitle, "Add Course" primary button upper-right; the search + semester toolbar sits outside the results area with the Assignments toolbar styling (magnifier search + clear, compact `Select`, `h-[42px]`, `max-sm:min-h-[44px]`). | User request 2026-10-27 (items 1–2). |
| D126-5 | The card's internal layout, the color-indicator treatment, the menu placement, the grid breakpoints, the empty-state art, the filter-reset affordance, the archived-toggle placement, the hover/focus details, and the user-facing copy are **not** decided here. `ui-refiner` records them in the story file before implementation. | UI/UX handoff. |
| D126-6 | Existing behavior stays: create/edit (`CourseForm` modal), archive/restore (`ArchiveCourseDialog` + the live-region sentences), show-archived switch, list re-read after every mutation, name→detail navigation (D112B-6). Visual polish inside the two dialogs is in scope; replacing either requires an explicit withdrawal. | SP-111/SP-112. This story does not re-take those acceptance criteria. |
| D126-7 | The e2e spec `semesters-courses.spec.ts` (SP-118) keeps passing with at most pin updates: the accessible names (`Edit/Archive/Restore ${name}`), the live-region sentences, the empty-state CTA, and the dialog headings are preserved, or the spec is updated in the same change without weakening behavior assertions. | SP-118 + the SP-125 precedent (update incidental markup assertions; do not weaken behavior assertions). |

## Definition of Done

1. The refined presentation is implemented on `/courses` (header, toolbar, card grid, states) — the ui-refiner decisions are the criteria.
2. Not applicable — no new input (search is a free-text filter; the form is unchanged).
3. Not applicable — no new read or write; the existing principal-scoped `listCourses` remains the only list read.
4. Not applicable — no new request; the existing list error state and the dialog toasts remain intact.
5. Loading, empty, no-match, and initial-error states render per the settled specification.
6. Keyboard navigation, visible focus rings, non-color-only indicators, and focus restoration pass WCAG 2.2 AA.
7. Responsive layouts verified on desktop (≥1024px), tablet, and mobile (375px) viewports.
8. Component tests in `pages/courses` and `features/courses` pass (incidental markup assertions updated; behavior assertions kept); the `semesters-courses` e2e journeys pass.
9. Not applicable — no API or migration change.
10. Integrated review in a development environment verified.
11. Final reviewer walkthrough saved upon completion.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** A redesigned `/courses` page — "My Courses" header + subtitle + upper-right "Add Course", a search + semester filter toolbar, a responsive card grid with a three-dot action menu, and polished empty/no-match/loading/error states — consistent with the Assignments page, preserving all existing course behavior.
- **Request/token estimate:** one cohesive frontend outcome; **~3 requests/tokens total** across bounded milestones: (1) page shell — header, toolbar, grid layout; (2) card + actions menu + states; (3) test/e2e updates + accessibility/responsive verification. Each milestone is independently verifiable; the task may span fresh windows using checkpoints.
- **Model recommendation:** 3 — careful layout, responsive grid, and accessible menu markup across existing components, without altering the core state or API layers (the same class of work as SP-125).
- **Files:**
  - `apps/web/src/pages/courses/ui/CoursesPage.tsx`
  - `apps/web/src/pages/courses/ui/CoursesPage.test.tsx`
  - `apps/web/src/features/courses/ui/CourseList.tsx`
  - `apps/web/src/features/courses/ui/CourseList.test.tsx`
  - `apps/web/src/features/courses/ui/CourseCard.tsx` (new)
  - `apps/web/src/features/courses/ui/CourseCard.test.tsx` (new)
  - `apps/web/src/features/courses/ui/CourseActionsMenu.tsx` (new)
  - `apps/web/src/features/courses/ui/CourseActionsMenu.test.tsx` (new)
  - `apps/web/e2e/semesters-courses.spec.ts` (pin updates only)
- **Start context:** this story file, `apps/web/src/pages/courses/ui/CoursesPage.tsx`, `apps/web/src/features/courses/ui/CourseList.tsx`, `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (design reference), `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` (menu model), `apps/web/src/features/courses/ui/CourseForm.tsx`, `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx`, `apps/web/src/entities/course/api/courseApi.ts`, and the two existing test files.
- **Verification:** `pnpm --filter web test -- src/pages/courses src/features/courses`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `semesters-courses` Playwright spec against the self-contained test stack.
- **Dependencies / exclusions:** the ui-refiner pass (D126-5) precedes implementation. No backend work. Excluded: the pending-assignment count (D126-1), hard delete (D126-2), the Semesters page, and the Course detail page.
