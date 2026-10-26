# SP-122 walkthrough — Assignment Search, Sorting & Filters

**Parent:** [SP-122](../../SP-122-assignment-search-sorting-and-filters.md) (coordination) / [SP-122 README](../../README.md)
**Epic:** EP03 — Assignment & Task Management (Jira STUDY-16)
**Review unit:** combined SP-122 (children SP-122A, SP-122B, SP-122C)
**Final review:** [`review.md`](./review.md) (pass 2, 2026-10-26, verdict PASS)
**Reviewed state:** working tree on `main`; parent baseline `e0a1722`; planner correction `440ff2a` (docs only).

This walkthrough explains the finished feature, the evidence for correctness after the review rounds, and manual test steps with expected results. It is the reviewer-owned DoD item 11 deliverable for this parent.

## 1. What changed

A student can now open a single list of **all their assignments across courses** at `/assignments` and narrow it by course, date range, status (plus priority and type), and free text, and order it by due date, title, priority, status, or creation/update time. Each row carries its course context (color chip, code, name) and subtask progress, and links to the course detail page. Filtering by another student's course is impossible (uniform 404), and no query parameter can bypass ownership.

Scope of this review unit (in scope): SP-122A (backend `GET /assignments`), SP-122B (frontend `/assignments` page + `listAssignments`), SP-122C (integration e2e + parent index). Out of scope (intentionally): story 7 overdue/completed views, pagination (D122-7), a dedicated assignment detail page (D122-1), and any change to POST/PATCH/DELETE/subtask routes or the course-detail projection.

## 2. How the code works

### Request / data flow

1. The user navigates to `/assignments` (route registered in `apps/web/src/app/App.tsx` inside `ProtectedRoute` + `Layout`; nav link "Assignments" in `apps/web/src/widgets/header/ui/Header.tsx` between "Courses" and "Profile").
2. `AssignmentsPage` (`apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`) calls `listAssignments()` with no filters on first load, showing a centered spinner ("Loading your assignments…").
3. `listAssignments` (`apps/web/src/entities/assignment/api/assignmentApi.ts`) builds a query object, **omitting unset/empty params**, and issues `GET /assignments` via the shared axios client. `dueFrom`/`dueTo` are sent as ISO datetimes (`T00:00:00` / `T23:59:59` local, assembled in the page).
4. The backend controller (`apps/api/src/modules/assignments/assignments.controller.ts`, `@Get() list(...)`) reads the principal via `@CurrentUser()` (no `@Req()`; the global `APP_GUARD` 401s unauthenticated callers) and binds `@Query()` to `ListAssignmentsQueryDto`.
5. `FieldValidationPipe` (whitelist + `forbidNonWhitelisted` + transform) rejects unknown params / invalid enums / malformed ISO dates / over-long `q` / unknown sort/order with a 400 field-level `errors` map.
6. `AssignmentsService.list(userId, query)` (`apps/api/src/modules/assignments/assignments.service.ts`):
   - Re-runs the DTO rules via `validateSync` (defense in depth for non-HTTP callers).
   - **Ownership gate first:** if `courseId` is present, `course.findFirst({ where: ownedWhere(userId, courseId) })`; missing/foreign/malformed → uniform 404 "Resource not found" **before any assignment query** (no existence oracle).
   - Trims `q`; empty/whitespace-only becomes absent.
   - Builds `where = { userId }` plus optional `courseId`, `status`, `priority`, `type`, inclusive `dueDate` bounds (`gte`/`lte`; null `dueDate` rows excluded when a bound is present because the comparison cannot match null), and a case-insensitive `contains` `OR` over title+description when `q` is present.
   - Builds `orderBy`: requested sort (default `dueDate`), then `title asc`, then `id asc`. `dueDate asc` keeps nulls last via PostgreSQL's default for ascending order. `priority`/`status` sort by the native enum column's declaration ordinal (LOW→MEDIUM→HIGH→URGENT / PENDING→IN_PROGRESS→COMPLETED→SUBMITTED→GRADED).
   - `assignment.findMany` with `include: { course: { select: { id, name, code, color } }, tasks: { where: { userId }, orderBy: [orderIndex asc, createdAt asc], select: 6 keys } }`, scoped by `userId`.
   - Maps rows to the `AssignmentListItem` projection: 11 assignment keys + `course` (or null) + `subtasks` (6-key).
7. The page renders rows in API order. Re-queries keep the last good list with a spinner in the filter bar and `aria-busy` on the list region; failed re-queries show a toast and keep the list; a foreign/missing course shows a toast and resets the course filter to "All courses".

### Key files / symbols

- Backend: `assignments.controller.ts` (`@Get()` `list`), `assignments.service.ts` (`list()`), `dto/list-assignments-query.dto.ts` (`ListAssignmentsQueryDto`).
- Frontend: `entities/assignment/api/assignmentApi.ts` (`listAssignments`, `ListAssignmentsParams`), `shared/types/academic.ts` (`AssignmentListItem`, `AssignmentListItemCourse`), `pages/assignments/ui/AssignmentsPage.tsx`, `app/App.tsx` (route), `widgets/header/ui/Header.tsx` (nav link).
- Contract: `docs/stories/EP03/SP-122/README.md` (D122-1…D122-9, shared API contract).
- Integration: `apps/api/src/modules/assignments/assignments-list-e2e.spec.ts` (23 tests).

### Important choices

- **No pagination in MVP** (D122-7): the endpoint returns all matching rows; EP05 owns sensible limits.
- **No dedicated detail page** (D122-1): rows route to their course detail.
- **`courseId` ownership gate before any list query** (D122-2): no existence oracle — foreign/missing/malformed → uniform 404.
- **Null `dueDate` handling** (D122-3): excluded when a date bound is present; included and sorted last otherwise.
- **Search** (D122-4): case-insensitive substring on title + description, trimmed, empty/whitespace treated as absent, max 200 chars.
- **Sort** (D122-5): single sort key + documented tie-break (`title asc`, then `id asc`); priority/status sort by Postgres enum **declaration ordinal**, not lexicographic text and not a severity rank. This matches the native `ORDER BY` on the Prisma enum columns.
- **Projection reuse** (D122-6): 11 assignment keys + `course: { id, name, code, color } | null` + `subtasks` (6-key projection), so the list page renders course context and progress without a second fetch.

## 3. Why it is correct

- **Contract/implementation/test agreement (F122C-1 closed):** D122-5 and the shared API contract now state ordinal order for priority/status, matching `orderBy: [{ priority: order }]` / `[{ status: order }]` on native enum columns and the e2e expectations (ordinal). Verified by cross-file comparison in review pass 2; no code change was required.
- **Ownership invariants:** every Prisma read carries `userId`; `courseId` is gated via `ownedWhere` before any assignment query; `tasks` are filtered by `userId`; no client `userId` is accepted (DTO field absent + `forbidNonWhitelisted` → 400). Cross-student HTTP matrix (C) proves B's list never contains A's rows and B filtering by A's `courseId` → uniform 404 with B's data unchanged.
- **Validation:** DTO decorators + `FieldValidationPipe` (unknown params, invalid enums, malformed ISO dates, over-long `q`, unknown sort/order → 400 with `errors`); service re-runs `validateSync` (defense in depth). Frontend mirrors the rules.
- **Scoping of academic data:** all reads principal-scoped; no 403/distinct messages (uniform 404 "Resource not found").
- **Automated evidence (recorded, reused — code unchanged):**
  - Backend typecheck: pass.
  - `assignments-list-e2e.spec.ts`: **23 passed** (with disposable Postgres 55432).
  - Full API suite: **43 suites, 1025 tests passed**.
  - Frontend: `AssignmentsPage` + `assignmentApi`: **2 files, 29 tests passed**.
  - Frontend typecheck: pass.
  - `git diff --check`: pass.
  - Without `DATABASE_URL`, the e2e spec self-skips (`describe.skip`); recorded as skipped, not claimed passed.
- **Review rounds:** Pass 1 found one should-fix (F122C-1, sort contract wording) and one acknowledged DoD-10 exception (D122C-1). Pass 2 (this review) closed F122C-1 via the corrected docs and accepted D122C-1 under the authorized exception. No blocker or other should-fix remains. Optional polish F122C-2 (stale e2e test title/comment wording) is non-blocking.
- **DoD:** items 1–5, 8, 9, 11 PASS; items 6, 7, 10 PASS under the D122C-1 exception (automated substitute + independent review; live browser not executed).

## 4. Manual test workflows

Use disposable/local test data only. Do not use production data or shared credentials. The frontend and backend must be running against a seeded dev database with at least two students, each owning courses and assignments.

### Workflow M1 — Browse the list (happy path)

**Prerequisites:** App running; logged in as a student who has assignments across at least two courses, including one assignment with no course and one with no due date.

1. Open `/assignments` (or click "Assignments" in the header nav).
2. Observe the initial centered spinner "Loading your assignments…", then the list.
3. Verify each row shows title, due date (or "No due date"), status/priority/type badges, course context (color chip + code + name) or "No course", and subtask progress text.
4. Verify rows are ordered by due date ascending with null due dates last, then title, then id.

**Expected:** list renders in API order; no console errors; empty-state not shown.

### Workflow M2 — Search

1. Type a substring of a known title into "Search assignments" (e.g. "lab").
2. Wait ~300 ms (or press Enter to flush immediately).
3. Verify the list re-queries and shows only matching rows (title or description, case-insensitive).
4. Type only spaces → verify `q` is omitted (list returns all rows).
5. Type more than 200 characters → verify the input is capped at 200 (`maxLength`).
6. Click the inline × clear button → verify the input clears and the list resets.

**Expected:** debounced re-query, case-insensitive match on title+description, clear resets.

### Workflow M3 — Filters (course, status, priority, type, date range)

1. Select a course in the course Select → verify only that course's assignments show.
2. Select "All courses" → verify the filter is omitted and all rows return.
3. Select each status/priority/type → verify narrowing; "All" omits the param.
4. Set "From" and "To" date pickers → verify inclusive bounds; assignments with null due date are excluded.
5. Clear one bound → verify null-dated rows reappear (when no bound present).
6. Click "Clear filters" when any filter is active → verify all controls reset and a no-param re-query runs.

**Expected:** AND-combined filters; empty match shows "No assignments match these filters." with "Clear filters".

### Workflow M4 — Sort

1. Change the sort Select (Due date / Title / Priority / Status / Created / Updated).
2. Toggle asc/desc via the button (accessible name "Sort ascending"/"Sort descending").
3. Verify the list re-orders accordingly.
4. For `sort=priority asc`: verify order LOW → MEDIUM → HIGH → URGENT (Postgres enum ordinal), not lexicographic.
5. For `sort=status asc`: verify PENDING → IN_PROGRESS → COMPLETED → SUBMITTED → GRADED.
6. For `dueDate asc`: verify null due dates sort last.

**Expected:** documented ordering including ordinal priority/status and nulls-last due date.

### Workflow M5 — States (loading / empty / error)

1. Throttle the network and reload → observe "Loading your assignments…" spinner.
2. Filter to a combination with no matches → observe "No assignments match these filters." + "Clear filters".
3. With no assignments at all → observe "No assignments yet." + "Assignments you create on your courses will show up here." + "Browse courses" link.
4. Simulate an API failure (e.g. stop the backend) and trigger a re-query → observe a toast and the last good list retained with a spinner in the filter bar and `aria-busy` on the list region.
5. Trigger an initial-load failure → observe the `role="alert"` card with message + "Try again"; retry re-queries.

**Expected:** all states render without crashes; live region announces result counts.

### Workflow M6 — Accessibility & responsive

1. Tab through search, filters, sort, toggle, and list; verify visible focus rings and keyboard operability (Enter/Space on toggle).
2. Verify status/priority badges use text + color (never color alone).
3. Verify the empty/error regions are announced via the always-present `role="status"` live region.
4. Resize to mobile width → verify the filter bar stacks vertically, controls become full-width, rows stack, touch targets ≥ 44 px.
5. Resize to desktop → verify the filter bar wraps and rows align horizontally.

**Expected:** WCAG 2.2 AA-oriented behavior; no horizontal scroll on mobile.

### Workflow M7 — Ownership / security (negative)

1. Log in as student B. Open `/assignments` → verify none of student A's rows appear.
2. As student B, attempt `GET /assignments?courseId=<A's courseId>` (via devtools/curl) → verify uniform 404 "Resource not found" and B's data unchanged.
3. Attempt `GET /assignments?userId=forged` → verify 400 (unknown param).
4. Attempt `GET /assignments?foo=bar` → verify 400.
5. Attempt an invalid enum/date/sort/order or `q` > 200 chars → verify 400 with a field-level `errors` map.
6. Unauthenticated request to `GET /assignments` → verify 401.

**Expected:** no data leak; uniform 404 for foreign/missing `courseId`; 400 for invalid/unknown input; 401 unauthenticated.

### Workflow M8 — Regression

1. Create/edit/delete an assignment and manage subtasks on a course detail page → verify unchanged behavior.
2. Open a course detail page → verify its assignment projection/ordering is unchanged.
3. Navigate `/assignments` and click a row → verify it routes to `/courses/:id`.

**Expected:** no regression in existing assignment/course flows.

## 5. Execution status

| Workflow | Status |
|---|---|
| M1 Browse list | Not executed — user test instructions (no live browser run in this review; automated substitute per D122C-1) |
| M2 Search | Not executed — user test instructions |
| M3 Filters | Not executed — user test instructions |
| M4 Sort | Not executed — user test instructions (ordinal expectations verified by automated e2e, 23/23 with DB) |
| M5 States | Not executed — user test instructions |
| M6 Accessibility & responsive | Not executed — user test instructions (component tests cover some interactions) |
| M7 Ownership / security | Partially executed — automated (e2e cross-student matrix + unit data-scoping) passed with DB; live browser walk not executed |
| M8 Regression | Partially executed — automated (full API suite 43/1025 + frontend 29) passed; live browser walk not executed |

**D122C-1 exception note:** The manual browser pass (search, filters, sort, empty/error states, responsive, keyboard) was not performed in this agent context. A session-owner-authorized automated substitute was recorded (backend full suite 43 suites / 1025 tests incl. 23 new e2e, frontend component suite 2 files / 29 tests, both typechecks). These are **not** a live browser-to-API journey, actual mobile rendering, or human visual/a11y ratification. The manual steps above are instructions for the user, not recorded test results. Required manual gates remain outstanding for the user; the automated evidence stands in the interim per the SP-113C precedent.

**Automated evidence provenance (recorded, reused):** implementer-run, unchanged code since. Backend typecheck pass; e2e 23/23 (with disposable Postgres 55432); full suite 43/1025; frontend 2 files/29 tests; frontend typecheck pass; `git diff --check` pass. Reviewer executed no commands (no shell available).

**Known limitation:** Reviewer had no shell access; all gate results are reused implementer evidence for unchanged code. The manual browser workflows above are unexecuted instructions. Optional polish F122C-2 (stale e2e test title/comment wording) does not affect behavior.