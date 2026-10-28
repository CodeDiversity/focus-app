# SP-126: Course Page Experience

**Story ID:** SP-126
**Title:** Frontend: a modern Courses page consistent with the Assignments redesign
**Parent epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (commit 914a5d2, 2026-10-28).
**Dependencies:** SP-125 reviewed (`9dce1c4`) — the design reference is in code; no implementation dependency.
**Refined:** 2026-10-28
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

All residual UI/UX decisions for D126-5 are now settled (2026-10-28). The user request
already settled the header content/placement, toolbar composition and styling, the card
information set, the state kinds, and the accessibility requirements.

- **Card color indicator:** a small 10–12px rounded color dot beside the course code, matching the existing course rows and the Assignments course chip. Color is never the only channel (the code/name/semester text also identifies the course).
- **Three-dot menu placement:** trigger in the card's top-right corner, dropdown anchored to it and absolutely positioned within the card (mirroring `RowActionsMenu`: open focuses the first item, Escape closes and restores the trigger, arrow keys cycle, an action re-focuses the trigger before the callback). The trigger sits above the stretched click layer (higher z-index) so it never navigates.
- **Card click pattern:** stretched link — the course name is a `Link` to `/courses/:id` (accessible name = course name); an invisible absolutely-positioned overlay covers the card body so the whole card is clickable, while the menu trigger and any other interactive control remain above it. Preserves D112B-6 (name is the accessible target) and keyboard operability.
- **Subtitle wording:** "Manage your courses, semesters, and class meetings." (one line, `text-sm text-secondary-500` under the `h1`).
- **Search mechanism:** instant client-side filtering on every keystroke (case-insensitive match on name or code), no debounce — the list is small and instant feedback is ADHD-friendly. Clear `X` inside the input plus Enter handling for completeness.
- **Filter-reset affordance:** a `Clear filters` ghost button (`variant="ghost"`, `size="sm"`) in the results card footer, shown only when any filter is active, plus the magnifier + clear `X` inside the search input. Mirrors the Assignments page footer.
- **Archived toggle + indicator:** the "Show archived" `role="switch"` sits in a small right-aligned row above the results card (preserving the existing client-side filter, D111B-1); archived cards keep a text "Archived" pill (`bg-secondary-100 text-secondary-600`) — not color-only.
- **Empty / no-results states:** empty (no courses): `BookOpen` icon (`size={40}`, `text-secondary-300`), "No courses yet.", "Add your first course to start organizing your semester.", CTA "Add your first course". No matches: `Search` icon (`size={36}`), "No courses match these filters.", "Try adjusting your search or semester filter.", CTA "Clear filters".
- **Hover / focus / height:** grid items stretch to equal row height (`items-stretch`); cards use `min-h` with content pinned to the top; hover raises shadow `shadow-sm → shadow-md` and darkens the border (`border-secondary-200 → border-secondary-300`); focus uses the base `:focus-visible` ring. Minimal motion (transition on shadow/border only).
- **Grid breakpoints:** 1 column below `sm` (640px), 2 columns from `sm`, 3 columns from `lg` (1024px): `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Inside the Assignments-consistent `max-w-5xl` container.

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
| D126-5 | Settled by the ui-refiner pass (2026-10-28): color indicator = small dot; menu = top-right trigger with RowActionsMenu keyboard model; card click = stretched link; subtitle = "Manage your courses, semesters, and class meetings."; search = instant client-side; reset = `Clear filters` ghost button in results card footer + clear X in input; archived toggle above the grid + text "Archived" pill; empty/no-match icons = BookOpen/Search with settled copy; hover/focus = subtle shadow/border lift + base focus ring with equal-height grid; grid = 1 (base) / 2 (sm) / 3 (lg). Full detail in the "Settled UI/UX decisions" section above. | ui-refiner pass 2026-10-28 (user-confirmed options). |
| D126-8 | Card color indicator is a small 10–12px rounded dot beside the course code; color is never the sole channel. | ui-refiner 2026-10-28. |
| D126-9 | Three-dot menu trigger sits top-right of the card, above the stretched click layer (higher z-index); dropdown anchors to it with the RowActionsMenu keyboard model. | ui-refiner 2026-10-28. |
| D126-10 | Card primary content uses a stretched link: course name is a `Link` to `/courses/:id`; an invisible overlay covers the card body; menu trigger stays above it. | ui-refiner 2026-10-28. |
| D126-11 | Page subtitle copy: "Manage your courses, semesters, and class meetings." (`text-sm text-secondary-500`). | ui-refiner 2026-10-28. |
| D126-12 | Search filters instantly on every keystroke (case-insensitive match on name or code); clear `X` in input plus Enter handling. | ui-refiner 2026-10-28. |
| D126-13 | Filter reset: `Clear filters` ghost button (`variant="ghost"`, `size="sm"`) in the results card footer, shown only when any filter is active, plus the magnifier + clear X in the search input. | ui-refiner 2026-10-28. |
| D126-14 | "Show archived" `role="switch"` in a small right-aligned row above the results card; archived cards carry a text "Archived" pill (`bg-secondary-100 text-secondary-600`). | ui-refiner 2026-10-28. |
| D126-15 | Empty state: `BookOpen` icon (size 40, text-secondary-300), "No courses yet.", "Add your first course to start organizing your semester.", CTA "Add your first course". No-match: `Search` icon (size 36), "No courses match these filters.", "Try adjusting your search or semester filter.", CTA "Clear filters". | ui-refiner 2026-10-28. |
| D126-16 | Hover/focus/height: grid items stretch to equal row height; cards use `min-h` with content pinned top; hover raises shadow `shadow-sm → shadow-md` and border `border-secondary-200 → border-secondary-300`; focus uses the base `:focus-visible` ring; transitions on shadow/border only. | ui-refiner 2026-10-28. |
| D126-17 | Grid breakpoints: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` inside the `max-w-5xl` container. | ui-refiner 2026-10-28. |
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
