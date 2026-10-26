# SP-122B: Assignment List UI

**Story ID:** SP-122B
**Title:** Frontend: `/assignments` list page with search, filters, and sort
**Parent:** [SP-122](./SP-122-assignment-search-sorting-and-filters.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (2026-10-26)
**Dependencies:** SP-122A implemented (contract fixed in the [SP-122 README](./README.md)). UI/UX settled by ui-refiner (this refinement).
**Jira key:** Pending creation
**Refined:** 2026-10-26 (ui-refiner)

## Summary

Add an `Assignments` page (`/assignments`) that lists the student's assignments
across courses and exposes search, course/date/status (plus priority and type)
filters and a sort/order control, consuming the `GET /assignments` contract from
SP-122A. Each row shows course context and subtask progress. The page is reached
through `ProtectedRoute` inside the standard `Layout`, and is linked from the
header nav (and, later, from EP05 dashboard widgets).

## Bounded scope

In: the `listAssignments` API function and its types in
`entities/assignment/api/assignmentApi.ts`; the new `pages/assignments/ui/AssignmentsPage.tsx`
route screen; filter/search/sort controls (placement and component choice
settled below); the course picker (sourced from `listCourses`);
row rendering with course badge and subtask progress; loading/empty/error states;
component tests.

Out: the backend endpoint ([SP-122A](./SP-122A-assignment-list-api.md)). The
cross-layer proof ([SP-122C](./SP-122C-assignment-list-integration.md)).
Overdue/completed views and a dedicated assignment detail page (story 7 /
D122-1). Pagination (D122-7).

## Source requirement references

- **AC-E03-07** — "Assignment lists support course, date, and status
  filtering." This child owns the UI half: the list page and the course, date,
  and status controls (plus search and sort).
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 4–7, 8. Items 3, 9, 10 are the backend/integration children's.
  Item 11 is the final reviewer walkthrough for the parent.
- Contract and D122-1…9 in the [SP-122 README](./README.md).

## Acceptance criteria

1. **Route.** `/assignments` renders inside `ProtectedRoute` + `Layout`, with a
   stable page heading "Assignments", and is reachable from the header nav
   ("Assignments" link between "Courses" and "Profile").
2. **List.** On load the page calls `listAssignments()` (no filters) and renders
   the returned rows in API order, each with title, due date, status, priority,
   type, course context, and subtask progress.
3. **Search.** A text input (`aria-label="Search assignments"`, `maxLength=200`,
   placeholder "Search assignments by title or description") filters by `q`,
   debounced 300 ms (and flushed on Enter), re-querying `GET /assignments?q=…`.
   An inline clear (×) button clears the input. Empty/whitespace input omits `q`.
4. **Course filter.** A course `Select` (sourced from `listCourses`, plus an
   "All courses" option) sets `courseId`; "All courses" omits it. A
   foreign/missing course surfaces the API's uniform 404 as an error state (toast
   + reset to "All courses"), not a crash.
5. **Date filter.** Native `<input type="date">` controls for from/to set
   `dueFrom`/`dueTo` as ISO datetimes (`T00:00:00` / `T23:59:59` local). Empty
   inputs omit the bound. Invalid input is blocked by the native picker.
6. **Status/priority/type filters.** `Select`s set the corresponding query
   params; "All" omits the param.
7. **Sort.** A sort `Select` (Due date / Title / Priority / Status / Created /
   Updated) and an asc/desc toggle button set `sort`/`order` and re-query.
8. **States.** Initial load: centered spinner ("Loading your assignments…").
   Re-query: keep the last good list and show a spinner in the filter bar with
   `aria-busy` on the list region. Empty: "No assignments yet." (no filters) vs.
   "No assignments match these filters." (filters active) with a "Clear filters"
   action. Error on initial load: `role="alert"` card with message + "Try again".
   Failed re-query: toast + keep last good list. Foreign/missing course: toast +
   reset filter.
9. **Accessibility.** All controls keyboard-operable with visible focus; list is
   a semantic `<ul>`/`<li>`; status/priority use text + color (never color
   alone); empty/error regions announced via an always-present `role="status"`
   live region; sort toggle carries an accessible name reflecting current order.
10. **Responsive.** Filter bar stacks vertically on mobile and wraps on desktop;
    controls are full-width on mobile. Rows stack on mobile and align horizontally
    on `sm:`. Touch targets ≥ 44 px.
11. **No regression.** Course detail and the existing assignment controls
    (create/edit/delete/status/subtasks) are unchanged.

## Tests

- **Component** (`AssignmentsPage.test.tsx` or co-located):
  - Renders loading, then rows from a mocked `listAssignments`.
  - Search input triggers a re-query with `q` (debounced).
  - Each filter (course, status, priority, type, date range) triggers a
    re-query with the correct param; "All" omits it.
  - Sort selector + order toggle trigger a re-query with `sort`/`order`.
  - Empty state renders when the API returns `[]` (both variants).
  - Error state renders on a rejected query and retry re-queries.
  - Row renders course context and subtask progress.
  - Clear-filters resets all controls and re-queries with no params.
  - Null `course` renders "No course" without crashing.
- **Entity API** (`assignmentApi.test.ts`): `listAssignments` builds the query
  string correctly (omits unset params, serializes scalars) and returns the
  typed projection.
- **Negative:** malformed API responses are not silently swallowed; the page
  does not crash on a null `course`.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/entities/assignment/api/assignmentApi.ts` — extend with
  `listAssignments(params)` and `ListAssignmentsParams`. Reuse the plain-axios
  pattern (`@/shared/api/httpClient`).
- `apps/web/src/shared/types/academic.ts` — add `AssignmentListItem` (assignment
  keys + `course: { id, name, code, color } | null` + `subtasks: Subtask[]`)
  and `AssignmentListItemCourse`.
- `apps/web/src/entities/course/api/courseApi.ts` — `listCourses` for the
  course picker.
- `apps/web/src/app/App.tsx` — add the `/assignments` route inside
  `ProtectedRoute`.
- `apps/web/src/widgets/header/ui/Header.tsx` — add an "Assignments" link.
- `apps/web/src/pages/courses/ui/CoursesPage.tsx` and `CourseDetailPage.tsx` —
  precedents for loading/error/empty states and the live-region pattern.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — row rendering,
  badge palettes (`STATUS_STYLES`, `STATUS_LABELS`, `PRIORITY_LABELS`,
  `TYPE_LABELS`, `TYPE_STYLE`, `PRIORITY_STYLES`), and `subtaskSummary` helper
  (reuse/export as needed).

### Contract notes

Consume the [SP-122 README](./README.md) contract verbatim. `listAssignments`
must omit unset/empty params (so the backend's whitelist is not tripped and
defaults apply) and serialize `dueFrom`/`dueTo` as ISO datetimes. The response
item type must match `AssignmentListItem` exactly (11 keys + `course` +
`subtasks`).

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D122-1 | Rows route to course detail; no dedicated detail page. | Deferred (D122-1). |
| D122-8 | Child letters restart at A. | D121-6 precedent. |
| D122-9 | UI/UX settled by ui-refiner (this refinement). | Do not invent UI decisions — now settled. |
| D122B-1 | Single-column list in `max-w-5xl` container; page heading "Assignments"; filter bar is a top, wrapping horizontal bar inside the list card; search box is the first (most prominent) control. Reuses `card p-6` styling. No sidebar/split-pane and no grouping by course (API order is the contract). | Matches the established page flow (CoursesPage/CourseDetailPage) and keeps mobile simple; grouping would hide the requested sort order. |
| D122B-2 | Filter controls: shared `Select` (course/status/priority/type/sort), native `<input type="date">` (from/to), shared `Input` (search). Filters apply live on change (no Apply button). No removable chips; a "Clear filters" button appears when any filter is active. | Live application matches the re-query AC and reduces friction; chips duplicate control state. |
| D122B-3 | Search: 300 ms debounce (flush on Enter), inline × clear button, placeholder "Search assignments by title or description", `maxLength=200`. Covers title + description (D122-4). Empty/whitespace omits `q`. | Matches backend search semantics; 300 ms is the conventional debounce. |
| D122B-4 | Sort: a `Select` (Due date / Title / Priority / Status / Created / Updated) plus an asc/desc toggle button (lucide `ArrowUp`/`ArrowDown`) with accessible name "Sort ascending"/"Sort descending". Default: "Due date" + ascending. No column-header sort (list, not table). | List layout has no sortable columns; a single control pair is clearer on mobile. |
| D122B-5 | Row design: title (primary, truncated with `title` tooltip); secondary line "Due <date>" / "No due date"; course context as color chip + code (monospace) + name (truncated); "No course" when null. Badges for status/priority/type reuse `AssignmentsSection` palettes (export the constants). Subtask progress as the existing `subtaskSummary` text only. Row navigates to `/courses/:id` when a course exists. | Reuses established badge palettes and summary helper; chip+code+name keeps courses identifiable without crowding. |
| D122B-6 | Empty/error states: initial load shows a centered spinner "Loading your assignments…". Re-query keeps the last good list with a spinner in the filter bar and `aria-busy` on the list region. Empty (no filters): "No assignments yet." + "Assignments you create on your courses will show up here." + "Browse courses" link. Empty (filters active): "No assignments match these filters." + "Clear filters". Initial-load error: `role="alert"` card with message + "Try again". Failed re-query: toast + keep list. Foreign/missing course: toast + reset course filter. | Mirrors CoursesPage/CourseDetailPage conventions; distinguishes "nothing exists" from "nothing matches". |
| D122B-7 | Loading state as above (spinner initial; keep-list + spinner on re-query). | Avoids flicker and matches the background re-fetch precedent. |
| D122B-8 | Responsive: container `max-w-5xl` with `px-4 sm:px-6 lg:px-8 py-12`. Filter bar `flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end`; controls `w-full sm:w-auto sm:min-w-[9rem]`; search `w-full sm:flex-1`. Rows `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`. Touch targets ≥ 44 px. | Stacks on mobile, wraps on desktop; consistent with existing `sm:` breakpoints. |
| D122B-9 | Navigation entry: header "Assignments" link between "Courses" and "Profile" (hidden on mobile via existing `hidden md:flex`), active style when `pathname === '/assignments'`. | Consistent with the existing nav list and ordering. |
| D122B-10 | Accessibility: semantic `<ul>`/`<li>` list; text+color badges; always-present `role="status"` live region announcing the result count ("Showing N assignments." / "No assignments match these filters."); focus stays on the changed control after a re-query; sort toggle accessible name reflects current order; search/filter selects carry `aria-label`s; visible focus via shared ring styles. | WCAG 2.2 AA; matches the course-detail live-region pattern. |

## Definition of Done

- The eleven acceptance criteria pass.
- Invalid input is surfaced to the user; the page does not crash on a null
  `course` or an empty list (DoD 2, 5).
- Loading, empty, and error states are handled (DoD 5).
- Core interactions support keyboard accessibility (DoD 6).
- Responsive layouts work on desktop and mobile (DoD 7).
- Component tests cover the list, filters, sort, search, and states (DoD 8).
- No API/migration change (DoD 9 is the backend child's).
- The page is reviewed in an integrated development environment together with
  SP-122A/C (DoD 10) — not this child alone.

## Sizing

- **Outcome:** A `/assignments` list page with search, course/date/status (plus
  priority/type) filters, sort/order, course context and subtask progress per
  row, loading/empty/error states, and component tests.
- **Time estimate:** 2.5–3 hours, including the API function and types, the
  route, the controls, the row rendering, and the component tests. Uncertainty
  is the filter component count, not the data wiring (UI/UX now settled).
- **Files:** `apps/web/src/entities/assignment/api/assignmentApi.ts` (+ test);
  `apps/web/src/shared/types/academic.ts`; new `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
  (+ test); `apps/web/src/app/App.tsx`; nav component; possibly
  `apps/web/src/features/assignments/ui/*` for reusable filter components.
  No backend or migration change.
- **Start context:** this file, the UI/UX decisions above (settled), the SP-122
  README contract, and the inspected paths above. Do not read story 7.
- **Verification:** `pnpm --filter @studypilot/web typecheck` (or the project's
  script) passes; `pnpm --filter @studypilot/web test --run` (or equivalent)
  passes for `assignmentApi.test.ts` and the new page test. Pass means the
  filter/sort/search re-query cases and the empty/error states pass.
- **Dependencies / exclusions:** Requires SP-122A implemented. UI/UX settled.
  Excludes the backend ([SP-122A](./SP-122A-assignment-list-api.md)), the
  integration proof ([SP-122C](./SP-122C-assignment-list-integration.md)),
  overdue/completed views, pagination, and a dedicated detail page. Every
  excluded epic AC stays owned in the [EP03 README](../README.md).