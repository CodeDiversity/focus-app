# SP-122B: Assignment List UI

**Story ID:** SP-122B
**Title:** Frontend: `/assignments` list page with search, filters, and sort
**Parent:** [SP-122](./SP-122-assignment-search-sorting-and-filters.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement (UI/UX gaps — see below; not ready to code)
**Dependencies:** SP-122A implemented (contract fixed in the [SP-122 README](./README.md)). UI/UX gaps settled by ui-refiner before implementation.
**Jira key:** Pending creation

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
deferred to ui-refiner); the course picker (sourced from `listCourses`);
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
   stable page heading, and is reachable from the header nav.
2. **List.** On load the page calls `listAssignments()` (no filters) and renders
   the returned rows in API order, each with title, due date, status, priority,
   type, course context, and subtask progress.
3. **Search.** A text input filters by `q` (debounced or on submit — ui-refiner
   to decide) and re-queries `GET /assignments?q=…`. Empty input omits `q`.
4. **Course filter.** A course selector (sourced from `listCourses`) sets
   `courseId`; "All courses" omits it. A foreign/missing course surfaces the
   API's uniform 404 as an error state, not a crash.
5. **Date filter.** From/to date inputs set `dueFrom`/`dueTo` as ISO datetimes.
   Invalid/empty inputs omit the bound.
6. **Status/priority/type filters.** Selects set the corresponding query
   params; "All" omits the param.
7. **Sort.** A sort selector and an asc/desc toggle set `sort`/`order` and
   re-query.
8. **States.** Loading (skeleton/spinner), empty ("No assignments match…"/
   "No assignments yet."), and error (actionable message + retry) states are
   handled. A failed filter re-query keeps the last good list and surfaces a
   toast/alert (the course-detail precedent).
9. **Accessibility.** All controls are keyboard-operable with visible focus;
   the list is a semantic list; status/priority use text + color (never color
   alone); empty/error regions are announced.
10. **Responsive.** Filters collapse appropriately on mobile; rows remain
    readable on small screens.
11. **No regression.** Course detail and the existing assignment controls
    (create/edit/delete/status/subtasks) are unchanged.

## Tests

- **Component** (`AssignmentsPage.test.tsx` or co-located):
  - Renders loading, then rows from a mocked `listAssignments`.
  - Search input triggers a re-query with `q`.
  - Each filter (course, status, priority, type, date range) triggers a
    re-query with the correct param; "All" omits it.
  - Sort selector + order toggle trigger a re-query with `sort`/`order`.
  - Empty state renders when the API returns `[]`.
  - Error state renders on a rejected query and retry re-queries.
  - Row renders course context and subtask progress.
- **Entity API** (`assignmentApi.test.ts`): `listAssignments` builds the query
  string correctly (omits unset params, serializes arrays/scalars) and returns
  the typed projection.
- **Negative:** malformed API responses are not silently swallowed; the page
  does not crash on a null `course`.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/web/src/entities/assignment/api/assignmentApi.ts` — extend with
  `listAssignments(params)` and a `ListAssignmentsParams`/`AssignmentListItem`
  type. Reuse the plain-axios pattern (`@/shared/api/httpClient`).
- `apps/web/src/shared/types/academic.ts` — `Assignment`, `AssignmentStatus`,
  `AssignmentPriority`, `AssignmentType`, `CourseAssignment` (subtasks shape).
  Add the list item type (assignment keys + `course` + `subtasks`).
- `apps/web/src/entities/course/api/courseApi.ts` — `listCourses` for the
  course picker.
- `apps/web/src/app/App.tsx` — add the `/assignments` route inside
  `ProtectedRoute`.
- `apps/web/src/widgets/layout/ui/Header.tsx` (or equivalent nav) — add an
  "Assignments" link (placement decided by ui-refiner).
- `apps/web/src/pages/courses/ui/CoursesPage.tsx` and `CourseDetailPage.tsx` —
  precedents for loading/error/empty states and the live-region pattern.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — row rendering,
  badge palettes (`STATUS_STYLES`, `STATUS_LABELS`, `PRIORITY_LABELS`,
  `TYPE_LABELS`), subtask summary helper (reuse/export as needed).

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
| D122-9 | UI/UX is unsettled; ui-refiner settles it. | Do not invent UI decisions. |

## UI/UX refinement gaps (for ui-refiner)

The following are deliberately NOT settled by this plan. Run the `ui-refiner`
agent on **SP-122B** before implementation to decide:

1. **Page layout & information hierarchy.** Single-column list vs. grouped by
   course vs. split-pane (filters sidebar vs. top bar). How prominent the
   search box is relative to the filters. Whether the page reuses the course
   detail's card styling.
2. **Filter placement & component choice.** Top horizontal bar vs. collapsible
   sidebar; native `<select>` vs. the shared `Select`; date inputs (native
   date picker vs. text); whether filters are applied on change (live) or via
   an "Apply" button; whether active filters show as removable chips.
3. **Search affordance.** Debounce delay, submit-on-Enter, clear button,
   placeholder copy, whether search covers description or title only.
4. **Sort control.** Dropdown vs. column-header sort; asc/desc affordance;
   default sort presentation.
5. **Row design.** How course context is shown (color chip + code + name, or
   just code); subtask progress (count vs. progress bar); which fields are
   primary vs. secondary; truncation of long titles.
6. **Empty & error states.** Distinct copy for "no assignments yet" vs. "no
   matches for these filters"; whether to offer a "clear filters" action;
   error retry placement.
7. **Loading state.** Skeleton rows vs. spinner; whether the previous list
   stays visible during a re-query.
8. **Responsive behavior.** How filters collapse on mobile (drawer, accordion,
   or stacked); row layout on small screens; touch targets.
9. **Navigation entry.** Header link label/placement and whether the page is
   also reachable from the dashboard later.
10. **Accessibility details.** Live-region announcements for filter changes,
    focus management after a re-query, and the accessible names for the sort
    toggle.

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
  is the UI/UX decisions (ui-refiner) and the filter component count, not the
  data wiring.
- **Files:** `apps/web/src/entities/assignment/api/assignmentApi.ts` (+ test);
  `apps/web/src/shared/types/academic.ts`; new `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
  (+ test); `apps/web/src/app/App.tsx`; nav component; possibly
  `apps/web/src/features/assignments/ui/*` for reusable filter components.
  No backend or migration change.
- **Start context:** this file, the UI/UX gaps above (settled by ui-refiner),
  the SP-122 README contract, and the inspected paths above. Do not read
  story 7.
- **Verification:** `pnpm --filter @studypilot/web typecheck` (or the project's
  script) passes; `pnpm --filter @studypilot/web test --run` (or equivalent)
  passes for `assignmentApi.test.ts` and the new page test. Pass means the
  filter/sort/search re-query cases and the empty/error states pass.
- **Dependencies / exclusions:** Requires SP-122A implemented. UI/UX must be
  settled by ui-refiner before implementation. Excludes the backend
  ([SP-122A](./SP-122A-assignment-list-api.md)), the integration proof
  ([SP-122C](./SP-122C-assignment-list-integration.md)), overdue/completed
  views, pagination, and a dedicated detail page. Every excluded epic AC stays
  owned in the [EP03 README](../README.md).