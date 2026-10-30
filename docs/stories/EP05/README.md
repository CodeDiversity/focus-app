# EP05 Story Breakdown — Student Dashboard

**Epic:** [EP05: Student Dashboard](../../epics/EP05-student-dashboard.md) (Jira STUDY-19)
**Milestone:** M2 (Calendar and dashboard)
**Epic dependency:** EP02 (Semester & Course Management) — complete 2026-10-23; EP03 (Assignment & Task Management) — complete (all nine parents reviewed); EP04 (Academic Calendar & Availability) — implementation complete (SP-127 pass 3, SP-128 pass 1, SP-129 pass 3; SP-128B's F-B-6 fix round is open but touches the availability editor, which EP05 does not consume). EP04 also carries one open follow-up — **FU-EP04-01** (the calendar page's browser-local week-range derivation, found during this EP05 planning pass) — which touches the EP04 calendar page, **not** the endpoints EP05 consumes; it does not block EP05. **EP05's own implementation is unblocked.**
**Status:** Planning — breakdown complete (2026-10-29; planner correction pass applied 2026-10-29 — see the Plan correction log, PC-EP05-01…PC-EP05-03). EP05A (data layer) is `Ready`; EP05B and EP05C are `Needs refinement` pending their `ui-refiner` pass (D05-12). No implementation started.
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP05/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP05A/`, `./artifacts/EP05B/`, `./artifacts/EP05C/`, plus `./artifacts/EP05/` for the parent implementation index, combined review and walkthrough.

**Parent artifacts:** `./artifacts/EP05/` (parent `implementation.md` written by EP05C; `review.md` and `walkthrough.md` written by the reviewer).

**Active substory:** None.

**Next substory:** EP05A — implement (dashboard data layer: RTK Query slices, store registration, "today" derivation, assignment split).

**Implementation owner:** `implementer`, one sequential writer across the epic (frontend only; the layer labels are scope, not concurrent roles).

**Final review:** one combined review for the EP05 parent review unit — all three children — after EP05C is implemented. Reviewer artifacts: `./artifacts/EP05/review.md` + `./artifacts/EP05/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP05A](./EP05A-dashboard-data-layer-rtk-query-slices.md) | Ready | EP02 + EP03 + EP04 complete (satisfied). No EP05 sibling dependency. No `ui-refiner` pass needed (D05-12 — no user-visible surface). | Implement EP05A: RTK Query slices + store wiring + today derivation + assignment split | `./artifacts/EP05A/` (pending) |
| [EP05B](./EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md) | Needs refinement | EP05A implemented (the queries and derived sets it renders). `ui-refiner` pass required (D05-12). | `ui-refiner` pass on EP05B, then implement | `./artifacts/EP05B/` (pending) |
| [EP05C](./EP05C-quick-actions-empty-states-and-parent-index.md) | Needs refinement | EP05A + EP05B implemented (the sections whose empty states it writes). `ui-refiner` pass required (D05-12). | `ui-refiner` pass on EP05C, then implement | `./artifacts/EP05C/` (pending) |

Sequence (one writer): EP05A → EP05B → EP05C. EP05A is the data spine both UI children consume; EP05B owns the page and its four sections; EP05C owns the quick action, the empty states, and the EP05 parent index.

**Do not start EP05B or EP05C before their `ui-refiner` pass** — the section layout and information hierarchy, how "today" is communicated, the section limits and their "see all" links, the two assignment lists' row form and how overdue is marked without relying on colour alone, the study-sessions presentation, the quick-actions layout, the empty-state copy, the loading/error presentation, the 375px responsive behaviour and the keyboard behaviour/focus order are deliberately undecided (D05-12). EP05A carries no user-visible surface, so a UI/UX pass on it would be a category error; if that pass changes the query-state contract EP05A exposes, EP05A is amended before EP05B starts.

**One accepted inter-commit transient.** After EP05B the dashboard has no working "Add assignment" action: the placeholder's three non-functional quick-action buttons are removed with the old page, and EP05C adds the working one. That is a work-in-progress state inside one sequential implementation, not a release — AC-E05-05 is satisfied only by EP05C, and the combined EP05 review is the gate.

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP05A](./EP05A-dashboard-data-layer-rtk-query-slices.md) | Data spine for proposed stories 1–4 (no epic proposed story of its own — see "Why three children") | Frontend (data) | Pending creation |
| [EP05B](./EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md) | 1. Implement today's schedule widget + 2. Implement upcoming assignment widget + 3. Implement overdue assignment widget + 4. Implement today's study sessions widget | Frontend | Pending creation |
| [EP05C](./EP05C-quick-actions-empty-states-and-parent-index.md) | 5. Implement dashboard quick actions and empty states | Frontend | Pending creation |

All five of the epic's proposed stories are covered. The epic defines no backend work; every child is frontend-only and adds **no** API endpoint (D05-3).

### Why three children (split rationale)

EP05 is one page with no backend work, so a small number of frontend children is the correct shape. The split is by **independently verifiable outcome**, not by layer label:

- **EP05A — the data spine.** Two RTK Query API slices (assignments, calendar), the shared base query, the store registration, the "today" derivation and the assignment split. Substantive and independently verifiable: it ships a tested data layer with no UI at all, and both UI children depend on the exact set it exposes. It cannot be merged into EP05B without dragging RTK Query wiring, store registration and the time-zone reasoning into the same window as the whole page.
- **EP05B — the four sections and the page shell.** Two calendar-derived sections (classes, study sessions) and two assignment-derived sections (upcoming deadlines, overdue), each with a limit, ordering and a "see all" link, plus the page shell and the per-section loading/empty/error states. Substantive on its own: four components, a responsive page layout, and three states per section.
- **EP05C — the quick action, the empty states and the parent index.** The working "Add assignment" action (reusing the shared `useAssignmentActions`/`AssignmentDialogs` owner), the empty states that explain what the student can do next (AC-E05-06), the focus/live-region contract around the dialog, and the EP05 parent `implementation.md` (the combined change scope and the DoD-10 manual browser pass). Substantive: it wires a real mutation into a cache-backed page and owns the parent's evidence record.

**Not created** (the sizing policy forbids padded children): no README-only, status-only, verification-only or index-only child — the parent index and the integration verification belong to EP05C, the last substantive child; no separate "e2e" child — EP05 adds no backend surface and no new test harness (D05-14); no "data layer" child for the plain-axios entity clients — they already exist.

## Epic acceptance criteria — ownership

Original wording from [EP05](../../epics/EP05-student-dashboard.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| The dashboard displays today's class schedule. | AC-E05-01 | **EP05A** (the calendar query + the `today` selection), **EP05B** (the "Today's classes" section). |
| Incomplete assignments are ordered by upcoming deadline. | AC-E05-02 | **EP05A** (the unfinished/overdue split, order preserved from the endpoint), **EP05B** (the "Upcoming deadlines" section). |
| Overdue assignments are clearly identified. | AC-E05-03 | **EP05A** (the overdue predicate reuse), **EP05B** (the "Overdue" section with a non-colour-only marker). |
| Planned study sessions appear for the selected day. | AC-E05-04 | **EP05A** (the `STUDY_SESSION` selection), **EP05B** (the "Today's study sessions" section). *Creation is owned by EP06/EP07 — see the cross-epic note below. The "selected day" is read as the dashboard's day (today) — see D05-4.* |
| Students can add assignments and open relevant details directly. | AC-E05-05 | **EP05C** (the working "Add assignment" action via the shared assignment owner), **EP05B** (the "open relevant details" affordances on the class, assignment and session rows). |
| Empty states explain what the student can do next. | AC-E05-06 | **EP05C** (the per-section empty states). |
| Dashboard sections have sensible limits and links to full lists. | AC-E05-07 | **EP05B** (each section's limit and its "see all" link). |

### Cross-epic note on AC-E05-04

**Creation is owned by EP06/EP07; display is owned by EP05.** EP05 ships the "today's study sessions" widget now: it reads `STUDY_SESSION` events from `GET /calendar/events` and renders an empty state until sessions exist, then lights up with no rework (D05-2). This mirrors EP04's D404-6 precedent ("EP04 creates no study sessions; creation is owned by EP06/EP07"). The end-to-end "a session created in the product appears on the dashboard" path is therefore owned by EP06/EP07 — recorded, not dropped.

### Reading of AC-E05-04's "selected day" (D05-4)

The epic's wording says "the selected day". EP05 is a **single "today" view**: today's classes, today's deadlines, overdue work, today's sessions. There is **no day picker** in EP05, and none is implied by the scope list. The AC's "selected day" is therefore read as *the dashboard's day — today*. This reading is recorded here so the AC's wording is not silently reinterpreted. A day picker may be added later without breaking the structure: the sections are already derived from one selected date (`result.today`).

## Requirement and test traceability

The epic defines no test requirements (TR-*); stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| AC-E05-01 | Today's class schedule is displayed | EP05A, EP05B |
| AC-E05-02 | Incomplete assignments ordered by upcoming deadline | EP05A, EP05B |
| AC-E05-03 | Overdue assignments clearly identified | EP05A, EP05B |
| AC-E05-04 | Planned study sessions appear for the selected day (display half; creation is EP06/EP07) | EP05A, EP05B |
| AC-E05-05 | Add assignments and open relevant details directly | EP05B (details affordances), EP05C (add assignment) |
| AC-E05-06 | Empty states explain what the student can do next | EP05C |
| AC-E05-07 | Sensible section limits and links to full lists | EP05B |
| TR-E05-01 | Data-layer tests: RTK Query endpoint wiring (URL/method/params, payload unchanged), the request window and `today` selection (including a profile zone ≠ browser zone — **both** the ±1-day pair and the adversarial **26-hour-spread** pair whose civil dates are two days apart), the unfinished/overdue split with the shared predicates, order preservation, and limit application | EP05A |
| TR-E05-02 | Class-section tests: today's classes rendered from the calendar's `CLASS` events, order, limit, "see all" link, loading/empty/error states | EP05B |
| TR-E05-03 | Assignment-section tests: upcoming list ordered by upcoming deadline (no-deadline rows last), overdue list marked with a text "Overdue" label (not colour alone), limits, "see all" links | EP05B |
| TR-E05-04 | Study-session-section tests: `STUDY_SESSION` events rendered with the focus flag as text, empty state until sessions exist, limit, "see all" link | EP05B |
| TR-E05-05 | Quick-action tests: "Add assignment" opens the shared form, a successful create closes it and refreshes the dashboard data, focus lands on a stable control, a failed create shows an actionable message and leaves the form open | EP05C |
| TR-E05-06 | Empty-state tests: every section's empty state names the next step and offers the matching action or link | EP05C |
| TR-E05-07 | Accessibility and responsive tests: keyboard operability and focus order, visible focus, overdue marked without colour alone, 375px layout, reduced motion | EP05B, EP05C |
| TR-E05-08 | Manual browser pass recorded for the dashboard (desktop + 375px, every section's states, the add-assignment flow) — the DoD-10 evidence; no dashboard e2e spec exists (D05-14) | EP05C (recorded), EP05B (contributes) |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | Not applicable — no new input. The dashboard's only form is the **existing** `AssignmentForm`, whose validation is unchanged (SP-113/SP-114 rules and tests); EP05C wires it, it does not re-implement it. |
| 3 student data scoping | Not applicable — no data-access change. EP05 adds no backend endpoint and no id parameter (D05-3); the two endpoints it calls are already principal-scoped server-side (`apps/api/src/common/ownership/ownership.ts`). See the invariants table. |
| 4 actionable API errors | Not applicable — no API error-contract change. The dashboard presents the existing endpoints' errors through the shared `getErrorMessage` helper unchanged; the error **surface** (message + retry) is owned under DoD 5. |
| 5 loading, empty, and error states | EP05A (query states), EP05B (per-section states), EP05C (empty states + the action's error state) |
| 6 keyboard accessibility | EP05B (section rows, links, focus order), EP05C (dialog focus contract, quick action) |
| 7 responsive layouts | EP05B (page + sections), EP05C (quick action, empty states) |
| 8 automated tests | All children (TR-E05-01…07); TR-E05-08 is a recorded manual pass owned by EP05C |
| 9 API/migration documentation | Not applicable — no API change and no migration. The shared contract section below documents what EP05 consumes. |
| 10 integrated review | EP05 parent review unit (all three children) + EP05C's manual browser pass note |
| 11 reviewer walkthrough | Reviewer, once for the EP05 parent review unit |

## Shared dashboard data contract

EP05 adds **no** endpoint and changes **no** contract (D05-3). It consumes two existing read models and derives the four sections client-side. This section is the seam between EP05A (which implements the client data layer) and EP05B/EP05C (which consume it).

### Queries

| RTK Query endpoint | HTTP | Request | Response | Owner |
|---|---|---|---|---|
| `useAssignmentsQuery()` | `GET /assignments` | **no query parameters** (the backend default sort/order apply) | `AssignmentListItem[]` (11 assignment keys + `course` + ordered `subtasks`) | EP05A |
| `useCalendarEventsQuery({ from, to })` | `GET /calendar/events` | `from`, `to` only (`YYYY-MM-DD`, inclusive, ordered, ≤ 31 days) | `CalendarEventsResult` = `{ timeZone, today, from, to, events[] }` | EP05A |

Both slices are separate `createApi` instances (one per domain — D05-1), each with its own `reducerPath`, both registered in `apps/web/src/app/store/store.ts`. The shared RTK Query base query moves to `apps/web/src/shared/api/rtkBaseQuery.ts` so the slices do not import from another feature (the FSD lint rule forbids `entities/` → `features/` imports, and cross-feature imports would be a second, worse coupling) — D05-7, D05-8.

### "Today" — the one derived value

The server owns the date/time-zone arithmetic (EP04's D404-2): the payload echoes `timeZone` (the stored profile zone) and `today` (that zone's current civil date). The client must not redo that arithmetic.

- **Request window:** the browser-local civil date **± 2 days** (5 days inclusive, ≤ the API's 31-day inclusive cap). **Derivation:** the two civil dates that can differ are the **browser's** civil date and the **profile zone's** civil date, and the maximum UTC-offset spread in the IANA database is **26 hours** (UTC−12 `Etc/GMT+12` / Baker Island ↔ UTC+14 `Pacific/Kiritimati`). A 26-hour civil difference can place the two civil dates **two calendar days apart**, so a ±1-day window does **not** guarantee that the profile zone's "today" is inside the requested range — `result.today`'s events would then fall outside the fetched window and the dashboard would show an empty "today" for a real, legal zone combination. Because the spread is bounded at 26 h < 48 h, the profile zone's civil date is always within **± 2 days** of the browser's, so the **± 2-day window (5 days total) provably contains it for every legal IANA offset pair**. The window's endpoints remain **browser-local civil dates** (the client cannot compute the profile zone's date at all — see below); only the window's *size* is derived from the offset bound.
- **Selection key:** `result.today` — the server's profile-zone date. Every calendar-derived section selects `event.date === result.today`. **This part of D05-6 is unchanged by the window correction:** the window is only a safety margin, and the selection is always the server's date.
- **API limits honoured:** the endpoint's inclusive span may not exceed 31 days (5 ≤ 31 ✓) and `from === to` is legal (a 1-day span) — recorded so the implementer does not assume a minimum span. A single-day window is legal but **not safe**: it cannot contain a two-day civil-date difference.

**The calendar page's derivation is a separate EP04 defect — do not copy it, and do not "fix" EP05 into it.** `apps/web/src/pages/calendar/ui/CalendarPage.tsx` derives its week range **and its column headers** from the **browser's** local date (`mondayOf`/`formatYMD` use `getDay()`/`setDate()`/`getFullYear()`/`getMonth()`/`getDate()`, lines 29–43; `selectedDate` is initialised to `new Date()` at `:56`; `handleToday` resets it to `new Date()` at `:141`; `from`/`to` at `:68-75` and the `days` column headers at `:77-85` are therefore browser-local), while the **server interprets `from`/`to` in the profile zone** (`apps/api/src/modules/calendar/calendar.service.ts` — `rangeStartInstant`/`rangeEndInstant` via `wallToInstant(..., timeZone)`, `formatToday(timeZone)`) and buckets every event by the **profile zone's** civil date (`zoneDateParts(s.startTime, timeZone)` → `event.date`). When the two civil dates differ, `groupByDay` (`CalendarPage.tsx:45-53`) keys events by the profile-zone date while the column headers are browser-local dates — so events land in the **wrong day column or vanish from the grid entirely**, and the "today" marker (`data.today`, the profile zone, compared against browser-local `days` in `WeekView.tsx:33-34`) highlights the wrong column or none. EP04's F3 closed the **display** drift (the `T12:00:00Z` UTC-noon construction in `CalendarEventDetails`/`WeekView`'s `dayHeader`) but **not** this **range derivation**; EP04's own D404-2 ("the server owns the date math") and D404-3 ("the time zone is the stored profile zone") describe the intended contract, which the shipped derivation does not honour.

Because EP05 owns neither the calendar page nor the API contract (D05-3), this defect is **not** EP05 work: it is recorded as an **EP04 follow-up, FU-EP04-01** (home: [EP04 README → Open follow-ups](../EP04/README.md#open-follow-ups)), and the combined EP05 review must not silently absorb it. **EP05's own "today" handling is correct and must not be changed to match the calendar page:** EP05 selects by the server-echoed `event.date === result.today` and never by a client-derived column key, so the calendar page's defect does not affect EP05's sections.

The client's session user is **not** a usable zone source: `SessionUser.timeZone` is optional (`apps/web/src/entities/user/model/types.ts:6-9` — "Undefined on login/refresh session users"), and this is now confirmed end-to-end for a **verified** student: `AuthContext` calls `refreshProfile()` (which fetches `GET /users/me`) **only** when `emailVerifiedAt === null` — the `window` focus handler at `apps/web/src/features/auth/model/AuthContext.tsx:153` and the effect's refresh at `:142`. A verified student therefore never fetches `/users/me` on the dashboard path, so `SessionUser.timeZone` stays `undefined` and the client **cannot** derive the profile zone at all. The payload's `timeZone`/`today` are the only authoritative values available to the page.

### EP04 follow-up — the calendar page's browser-local week range (PC-EP05-02 → FU-EP04-01)

| Field | Record |
|---|---|
| Finding (discovered) | 2026-10-29, during this EP05 planning correction pass — **PC-EP05-02** in the Plan correction log below. |
| Original location | `apps/web/src/pages/calendar/ui/CalendarPage.tsx:29-43`, `:56`, `:68-75`, `:77-85`, `:141`; `apps/web/src/features/calendar/ui/WeekView.tsx:33-34`. |
| Faulty claim | The calendar page's week range and column headers are the browser-local civil dates, and the returned events are therefore in the same week — i.e. the client and the server describe the same days. |
| Consequence | The server buckets events by the **profile zone's** civil date while the columns are keyed by **browser-local** dates: events land in the wrong day column or vanish from the grid, and the "today" marker highlights the wrong column or none. |
| Counterexample | A student whose profile zone is `Pacific/Kiritimati` (UTC+14) with a browser set to `Etc/GMT+12` (UTC−12) — the 26-hour spread — sees another day's events, or an empty grid. |
| Required fix (EP04) | Derive the calendar page's week range **and** column headers from the **profile zone**: anchor the current week on the server-echoed `result.today` and derive the headers from the server's echoed civil dates; the "Today"/prev/next controls step in profile-zone days. The fix must **not** move the range math into the client (D404-2/D404-3 stay binding — the client still sends only `from`/`to` and performs no zone arithmetic). The same zone-drift class must be checked for `CalendarAgenda` and for the Today/prev/next controls. |
| Owner / home | EP04 (not EP05 — EP05 owns neither the calendar page nor the API contract, D05-3). Home: [EP04 README → Open follow-ups](../EP04/README.md#open-follow-ups) → **FU-EP04-01**. |
| Evidence required | Calendar-page component tests proving the profile-zone week headers, correct column placement of a returned event, the `result.today` marker and the Today/prev/next behaviour for a profile zone whose civil date differs from the browser's; DoD 5/6/7 re-verified on the changed surface; the calendar e2e journey re-run. |
| Review route | **A standalone review unit** (its own sized child, evidence and `review.md`/`walkthrough.md`) — **not** an EP04 re-review: SP-127's parent review **passed** (pass 3, `artifacts/SP-127/review.md`, verdict PASS) and that verdict is not rewritten. |
| Effect on EP05 | **None.** EP05's "today" handling is correct (window ± 2 days + selection by `result.today`) and must not be changed to match the calendar page. The combined EP05 review must not silently absorb FU-EP04-01. |

### Section derivation (pure, in EP05A)

| Section | Source | Rule |
|---|---|---|
| Today's classes | calendar events | `type === 'CLASS' && date === result.today` |
| Today's study sessions | calendar events | `type === 'STUDY_SESSION' && date === result.today` |
| Upcoming deadlines | assignments | `isUnfinishedAssignment(row)` ∧ ¬`isOverdueAssignment(row)`; **the endpoint's order is preserved** (no client re-sort) |
| Overdue assignments | assignments | `isUnfinishedAssignment(row)` ∧ `isOverdueAssignment(row)`; order preserved (oldest deadline first) |

- The predicates are the single source of truth: `apps/web/src/entities/assignment/model/status.ts` (`isUnfinishedAssignment` — SP-121B/D121-4; `isOverdueAssignment` — SP-123A/D123-1-2, unfinished ∧ non-null `dueDate` strictly before now, no end-of-day grace). EP05 does **not** re-derive "unfinished" or "overdue".
- The endpoint's default order is the documented contract (SP-122's D122-5): `dueDate asc` (nulls last), then `title asc`, then `id asc`. EP05 relies on it rather than duplicating a client-side sort; a change to that default is a contract change to re-check (V-05-3).
- Assignments with a **null** `dueDate` are unfinished work without a deadline: they stay in "upcoming deadlines", last (nulls last), and their row must say so ("No due date") rather than show a blank date (D05-9).
- The calendar's `ASSIGNMENT_DEADLINE`/`EXAM_DEADLINE` events are **not** used for the dashboard's assignment sections: the two assignment sections are assignment rows (with course context and subtask progress), not calendar chips. This avoids two competing sources for the same work.

### Section limits and "see all" links (provisional — D05-10, confirmed by the `ui-refiner`)

| Section | Limit | "See all" target |
|---|---|---|
| Today's classes | 5 | `/calendar` |
| Upcoming deadlines | 5 | `/assignments` |
| Overdue assignments | 5 | `/assignments` |
| Today's study sessions | 3 | `/calendar` |

EP05 adds **no new route**; every link points at an existing full list. The study-sessions link points at `/calendar` because it is the only session-bearing surface today — EP07's study-history surface is a later seam (V-05-1).

### Presentation reuse (verified, not invented)

- `Card`, `Badge`, `EmptyState`, `Button`, `Dialog` from `apps/web/src/shared/ui/` (EP10 primitives).
- `OVERDUE_LABEL` ("Overdue") and `OVERDUE_STYLE` from `apps/web/src/features/assignments/ui/assignmentPresentation.ts:65-66` — the overdue marker is a **text** label in a badge, so it never relies on colour alone.
- The calendar's type icon + label map (`CLASS` → `GraduationCap`/"Class", `STUDY_SESSION` → `Brain`/"Study session", `ASSIGNMENT_DEADLINE` → `ClipboardList`, `EXAM_DEADLINE` → `FileText`, `BLOCKED_TIME` → `Ban`) from `apps/web/src/features/calendar/ui/CalendarEventChip.tsx:26-31` and `CalendarEventDetails.tsx:14-20` — the same non-colour-only convention (EP04's AC-E04-08).
- `CalendarEventDetails` (`apps/web/src/features/calendar/ui/CalendarEventDetails.tsx`) is the reusable focus-trapped dialog pattern (Escape closes, focus trap, focus restored) if a section needs a details dialog.
- `lucide-react` `^0.312.0` — verified exports: `GraduationCap`, `ClipboardList`, `Brain`, `Ban`, `FileText`, `CalendarDays`, `Clock`, `Timer`, `AlertTriangle`, `CheckCircle2`, `Plus`, `ArrowRight`, `ChevronRight`, `Inbox`, `SquarePen`, `LayoutDashboard`, `BookOpen`, `NotebookPen`, `UserRound`, `ExternalLink`, `Link2`, `RefreshCw`. **Not available in 0.312.0:** `CircleAlert`, `TriangleAlert`, `CircleCheckBig`, `CircleHelp` — do not name them.

### Trade-offs recorded honestly (D05-3)

1. **The dashboard fetches the student's whole assignment list.** `GET /assignments` has no pagination and no limit (SP-122's D122-7: "Sensible limits/links to full lists are EP05's concern"), so the dashboard downloads every assignment and slices client-side. For a student with a large backlog this is heavier than a bounded page. Accepted because EP05 must not change the endpoint; re-check when pagination lands (V-05-3).
2. **The dashboard depends on the shared predicates staying in sync with the server's semantics.** "Unfinished" and "overdue" are client predicates over the server's status and `dueDate`; the server has no equivalent overdue filter today, so there is nothing to drift from **yet** — but a future server-side overdue filter must use the same rule (unfinished ∧ non-null `dueDate` strictly before now). Recorded, not hidden.
3. **`GET /assignments` is not amended.** No pagination, no multi-value status filter, no new dashboard aggregation endpoint (D05-3).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D05-1 | **RTK Query, per-domain slices.** The dashboard uses RTK Query (the epic's own technical note, SP-108's RD2 user decision of 2026-10-16, and the choice EP04's D404-10 explicitly deferred to EP05) implemented as **per-domain RTK Query API slices** over the existing domain endpoints — one slice per domain (assignments, calendar) that the dashboard composes. **Not** one monolithic dashboard slice, and **not** a new backend aggregation endpoint. Consequence: this makes the dashboard the first real RTK Query surface outside `features/session/api/sessionApi.ts`. | User decision (settled 2026-10-29). |
| D05-2 | **Build the study-sessions widget now.** EP05 ships the "today's study sessions" widget reading `STUDY_SESSION` events from `GET /calendar/events`. It renders an empty state until EP06/EP07 create sessions and lights up with no rework when they land — exactly mirroring EP04's D404-6 precedent. AC-E05-04's **creation** half is owned by EP06/EP07; its **display** half is EP05's. | User decision (settled 2026-10-29). |
| D05-3 | **Compose client-side; no API contract change.** The dashboard calls the existing `GET /assignments` (no filters) and `GET /calendar/events` (today's range), then derives "unfinished" and "overdue" with the existing shared predicates and slices each section client-side. `GET /assignments` is **not** amended: no pagination, no multi-value status filter, no new endpoint. The two trade-offs are recorded in the shared contract section. | User decision (settled 2026-10-29). |
| D05-4 | **Today only; no date selector.** The dashboard is a single "today" view: today's classes, today's deadlines, overdue work, today's sessions. AC-E05-04's "selected day" is read as the dashboard's day (today); the reading is recorded in the traceability section so the AC's wording is not silently reinterpreted. A day picker is out of scope and may be added later without breaking the structure (the sections already derive from one selected date). | User decision (settled 2026-10-29). |
| D05-5 | **Quick actions: Add Assignment works; the other two are dropped.** EP05 implements the "Add assignment" action (AC-E05-05 requires it; the shared `AssignmentDialogs`/`useAssignmentActions` already exist and are reusable). The placeholder's "Create Study Plan" (EP06) and "Start Focus Session" (EP07) buttons are **not** shipped — omitted rather than shipped disabled. **This resolves EP07's D07-9 seam:** EP07 deliberately left the button inert because EP05 owns this surface; EP05 now decides it does not appear until EP07 lands. | User decision (settled 2026-10-29). |
| D05-6 | **"Today" is the server's profile-zone date, not the browser's.** The request window is the browser-local civil date **± 2 days** (5 days inclusive) — the size is derived from the **26-hour maximum IANA UTC-offset spread** (UTC−12 ↔ UTC+14): the browser's and the profile zone's civil dates can be **two calendar days apart**, so a ±1-day window is not sufficient (PC-EP05-01). The selection key is the payload's `today` — **unchanged** by the window correction. The calendar page's browser-local range derivation is **not** reused; it is itself an **EP04 defect** tracked as FU-EP04-01 (PC-EP05-02), not a pattern EP05 may copy. The client's session user is not a usable zone source (`SessionUser.timeZone` is absent even for a verified student — `AuthContext.tsx:142`/`:153`). | Planner-recorded, grounded in the verified calendar payload (`formatToday(timeZone)`), the IANA offset bound (26 h), `CalendarPage.tsx:29-43`/`:56`/`:68-85`/`:141` and `entities/user/model/types.ts:6-9`. Reversible. |
| D05-7 | **The shared RTK Query base query lives in `shared/api/rtkBaseQuery.ts`.** `axiosBaseQuery` and `AxiosBaseQueryError` move out of `features/session/api/sessionApi.ts` (which then imports them from `shared/`), so the two new domain slices do not import across features and no `entities/` file imports a `features/` file (forbidden by the FSD lint zone in `apps/web/.eslintrc.cjs:64-68`). No behaviour change to the transport. | Planner-recorded. Reversible (the export can stay where it is and be re-exported). |
| D05-8 | **The two RTK Query APIs live in `features/assignments/api/assignmentsApi.ts` and `features/calendar/api/calendarApi.ts`**, each a separate `createApi` with its own `reducerPath`, both registered in `apps/web/src/app/store/store.ts` (reducer + middleware + the serializability ignore list). The existing plain-axios entity clients (`entities/assignment/api/assignmentApi.ts`, `entities/calendar/api/calendarApi.ts`) stay as they are and are reused by the slices, so EP04's calendar page and EP03's assignments page are untouched. The dashboard's derived model + section components live in `features/dashboard/{model,ui}/` (the same FSD shape EP04 used for `features/calendar/ui/`). | Planner-recorded, grounded in the FSD convention (`docs/epics/README.md#frontend-architecture`) and the existing `features/session/api/sessionApi.ts` precedent. Reversible. |
| D05-9 | **The dashboard splits the assignment list and keeps the endpoint's order.** Overdue = `isUnfinishedAssignment` ∧ `isOverdueAssignment`; Upcoming = `isUnfinishedAssignment` ∧ ¬overdue. Both keep the endpoint's default order (`dueDate asc` nulls last, `title asc`, `id asc`) — no client re-sort. Null-`dueDate` unfinished assignments stay in "upcoming deadlines", last, and must be labelled rather than shown blank. | Planner-recorded, grounded in SP-122's D122-5 and the shared predicates. Reversible. |
| D05-10 | **Section limits and "see all" targets (provisional):** classes 5 → `/calendar`; upcoming deadlines 5 → `/assignments`; overdue 5 → `/assignments`; study sessions 3 → `/calendar`. Chosen to honour the epic's "avoid overwhelming the user"; every target is an existing route (EP05 adds no route). The `ui-refiner` confirms or replaces them. | Planner-recorded, provisional — subject to the `ui-refiner` pass (D05-12). |
| D05-11 | **The placeholder's static cards are not carried into the rebuilt dashboard, and EP05 ships no "Study Stats" card at all.** The current page hard-codes "Study Stats → 0 Hours Studied / 0 Tasks Completed" and "Recent Assignments → No assignments yet". Shipping hard-coded zeros asserts a false fact to the student ("you have studied 0 hours"), which the epic's own clarity goal ("prioritize clarity / avoid overwhelming") argues against; an honest empty state is not a substitute for a card whose content does not exist. "Hours Studied" has **no endpoint** until EP07's `GET /study-sessions/confirmed-time` seam (D07-3), and EP07 is not built; "Tasks Completed" is derivable from the assignment list EP05 already fetches, but completed-task counts are **not** one of the epic's five scope items and would be a second, competing presentation of the assignment sections. **Final** (settled 2026-10-29 by the planner's delegated judgment — no longer provisional): the dashboard is rebuilt around the four sections plus the quick action; **"Tasks Completed" is deliberately not re-added by EP05**, and the card is reconsidered only if a real study-time data source exists (V-05-2). | Planner-recorded, **final** (2026-10-29), grounded in EP07's D07-3 seam, the epic's scope list and the epic's clarity goal. Reversible only via V-05-2. |
| D05-12 | **EP05B and EP05C are `Needs refinement`; EP05A is `Ready`.** The `ui-refiner` settles the section layout and information hierarchy, how "today" is communicated, the section limits and their "see all" links, the two assignment lists' row form and the non-colour-only overdue marker, the study-sessions presentation, the quick-actions layout, the empty-state copy, the loading/error presentation, the 375px responsive behaviour and the keyboard behaviour/focus order. EP05A carries no user-visible surface (it is the data layer), so a UI/UX pass on it would be a category error — its story file still records the narrow presentation coupling it owns, and it is amended first if the EP05B/EP05C pass changes the query-state contract it exposes. | Planner skill UI/UX handoff rule + the ui-refiner skill's scope ("if the ticket is backend-only, report that no UI/UX pass applies"). The EP05A carve-out is a deliberate, stated reading of the handoff instruction — see the final handoff. |
| D05-13 | **The study-sessions widget consumes `STUDY_SESSION` calendar events — the only session data the API exposes today.** EP06's *planned* sessions (`StudyPlan`/`ScheduledTask`) are not exposed by any endpoint yet, so "planned study sessions" is satisfied today through the calendar's session events. Provisional seam: V-05-1. | Planner-recorded, grounded in the calendar read model and EP04's D404-6 + EP07's D07-3. Provisional. |
| D05-14 | **No dashboard e2e spec is added.** The EP09 browser suite covers `login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses` — there is no dashboard spec, and EP10's plan-review finding PR-003 recorded that expanding the suite beyond those specs is an EP09-scope decision requiring approval. EP05's DoD-10 evidence is therefore a **recorded manual browser pass** (TR-E05-08, owned by EP05C) plus the component/integration tests in TR-E05-01…07. Recorded as a documented gap with a named owner (the EP09 owner / the user), not as silent coverage. | Planner-recorded, grounded in EP10's PR-003 and the e2e directory contents. |
| D05-15 | **A student with no courses can still use the dashboard.** The dashboard renders its empty states for every section and the add-assignment action works without a course (the shared form's create mode stores a null course when no course is selected). | Planner-recorded; follows SP-113's nullable `courseId` semantics. Reversible. |
| D05-16 | **The calendar page's zone drift belongs to EP04, not EP05.** The defect found during this planning pass (PC-EP05-02) is in EP04's shipped calendar page. EP05 does not own that page and D05-3 forbids EP05 changing the API contract, so it is recorded as EP04 follow-up **FU-EP04-01** with its own owner, evidence and standalone review unit. **EP05's own "today" handling is correct and is not changed** — the combined EP05 review must not silently absorb FU-EP04-01. | Planner-recorded, final (2026-10-29). Grounded in the AGENTS.md ownership boundaries (a defect in another epic's reviewed surface) and D05-3. |

### Verification tasks (provisional seams)

| ID | Trigger | Task |
|---|---|---|
| V-05-1 | EP06/EP07 land | Re-check the study-sessions widget against the planned-session read model and the session-history surface; revisit the "see all" target for that section (currently `/calendar`). |
| V-05-2 | EP07 lands (including `GET /study-sessions/confirmed-time`, D07-3) | Revisit D05-11 against the confirmed-time endpoint — **only** if a real study-time data source exists. **EP07's study-history surface owns study time**: if EP07 ships its own study-time presentation, the dashboard must not duplicate it, and the "Study Stats" card stays dropped. "Tasks Completed" is **not** to be re-added by EP05 (D05-11, final): completed-task counts are not one of the epic's scope items, and the upcoming/overdue sections already carry each assignment's own status. |
| V-05-3 | `GET /assignments` gains pagination, a multi-value status filter, or a changed default sort | Re-check the dashboard's whole-list fetch and its reliance on the documented default order (D05-3, D05-9). |

## Code baseline (inspected 2026-10-29, not proposed)

- **The current dashboard** — `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` is an 82-line static placeholder: a welcome line + "View Profile" button, a "Quick Actions" card with three **non-functional** buttons (Add New Assignment / Create Study Plan / Start Focus Session), a "Recent Assignments" card hard-coded to "No assignments yet", a "Study Stats" card with hard-coded zeros ("0 Hours Studied" / "0 Tasks Completed"), and an "Upcoming Deadlines" card hard-coded to "No upcoming deadlines". **There is no dashboard test file.** The route `/dashboard` exists inside the `ProtectedRoute` block of `apps/web/src/app/App.tsx:38`. **The rebuild replaces this placeholder, it does not reuse it:** the "Quick Actions" card is removed and re-added as a working block by EP05C (an accepted inter-commit transient), the "Recent Assignments" and "Upcoming Deadlines" cards are superseded by the upcoming/overdue sections, and the **"Study Stats" card is removed and not rebuilt in any form** (D05-11, final — its two values have no data source; V-05-2). EP05B/EP05C record this as an explicit replacement rather than a silent omission.
- **Calendar read model** — `GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD` (`apps/api/src/modules/calendar/calendar.controller.ts:11-14`, `dto/list-calendar-events-query.dto.ts`). Only `from`/`to` are whitelisted; unknown query parameters are rejected with a 400 by the global `FieldValidationPipe`. The service re-checks order and the 31-day cap (`calendar.service.ts:159-178`); `from === to` is legal (span 1 day). Response: `{ timeZone, today, from, to, events[] }`; `today` is the profile zone's current date (`formatToday(timeZone)`, `calendar.service.ts:68-75`). `CalendarEvent` (`calendar.service.ts:7-28`; mirrored in `apps/web/src/entities/calendar/model/types.ts`) has `{ id, type, title, subtitle, date, startTime, endTime, courseId, courseName, courseColor, assignmentId, completed, focus, link }`; `type` ∈ `CLASS | ASSIGNMENT_DEADLINE | EXAM_DEADLINE | STUDY_SESSION | AVAILABILITY | BLOCKED_TIME`. The server owns all date/time-zone arithmetic (D404-2) — the client sends only a civil date range and renders pre-bucketed values. `events[].link` is populated for class events (`/courses/:id`, `calendar.service.ts:247`), for deadlines (`/courses/:id` or `/assignments`, `:293`) and for availability (`/availability`, `:268`), but is **`null` for study sessions** (`:323`). The client is `apps/web/src/entities/calendar/api/calendarApi.ts` (`listCalendarEvents`) — plain axios today; EP05 wraps it with an RTK Query slice (D05-1). `apps/web/src/features/calendar/ui/` holds `WeekView.tsx`, `CalendarAgenda.tsx`, `CalendarEventChip.tsx`, `CalendarEventDetails.tsx` (a focus-trapped dialog with Escape + focus restoration — the reusable details-dialog pattern).
- **Assignment list** — `GET /assignments` (`apps/api/src/modules/assignments/assignments.controller.ts:50`, `dto/list-assignments-query.dto.ts`, service `list()` at `assignments.service.ts:261-384`). All query params optional and AND-combined: `courseId`, `status` (ONE value of PENDING|IN_PROGRESS|COMPLETED|SUBMITTED|GRADED), `priority`, `type`, `dueFrom`/`dueTo` (ISO datetimes), `q` (≤ 200), `sort` (dueDate|title|priority|status|createdAt|updatedAt), `order`. Default sort `dueDate asc`, nulls last, tie-break `title asc` then `id asc` (`assignments.service.ts:315-328`). **No pagination and no limit** (SP-122's D122-7). The response is `AssignmentListItem[]` including a `course` object and the assignment's ordered `tasks` — so the dashboard's assignment rows already carry subtask data. The client is `apps/web/src/entities/assignment/api/assignmentApi.ts` (`listAssignments`) — plain axios today.
- **Shared predicates** — `apps/web/src/entities/assignment/model/status.ts`: `isUnfinishedAssignment` (PENDING or IN_PROGRESS; SP-121B/D121-4), `isOverdueAssignment` (unfinished AND non-null `dueDate` strictly before now, no end-of-day grace; SP-123A/D123-1-2), `isFinishedAssignment`, `isDueSoonAssignment` (unfinished, due within `withinDays` (default 3) inclusive, excludes overdue; SP-125/R-125-007). All accept a bare status or an object with `status`/`dueDate`, and take an optional `now` for deterministic tests. These are the single source of truth for "unfinished"/"overdue" — reuse them; do not re-derive the rules.
- **Reusable assignment UI** — `apps/web/src/features/assignments/ui/`: `AssignmentForm.tsx` (exported `AssignmentForm` + `AssignmentFormProps`), `AssignmentDialogs.tsx`, `AssignmentRow.tsx`, `RowActionsMenu.tsx`, `SubtaskChecklist.tsx`, `DeleteAssignmentDialog.tsx`, `assignmentPresentation.ts` (`STATUS_LABELS`, `PRIORITY_LABELS`, `TYPE_LABELS`, `OVERDUE_LABEL`/`OVERDUE_STYLE`, `TYPE_ICONS`). `apps/web/src/features/assignments/model/useAssignmentActions.ts` owns create/edit/delete/status/subtask actions and the focus-management contract — it is the reusable owner for "add an assignment" (AC-E05-05); it needs `items`, `onChanged`, `onSubtaskChanged`, `onSubtaskRefresh` from its host. `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` is the reference host page (filter toolbar outside the results card, `role="status"` count header, distinct empty/no-match states, `max-w-5xl` shell, uppercase tracking-wider count header) and the reference for wiring `useAssignmentActions` + `AssignmentDialogs` (`:251-260`, `:610`).
- **RTK Query today** — `apps/web/src/features/session/api/sessionApi.ts` is the **only** RTK Query API in the app (`createApi`, `reducerPath: 'api'`, one `resendVerification` mutation, its own `axiosBaseQuery` over the shared client). It is registered in `apps/web/src/app/store/store.ts` (reducer + `api.middleware` + the serializability ignore list). The store has no other API slice.
- **FSD / lint** — `apps/web/.eslintrc.cjs` enforces layer direction with `import/no-restricted-paths`: `entities/` may **not** import `features/` (`:64-68`), `features/` may not import `pages/`/`app/` (`:69-74`), `pages/` may import `app/store` only via the sanctioned exception (`:81-86`). `@/` → `apps/web/src`.
- **Design system (EP10, implemented + parent-reviewed)** — semantic tokens in `apps/web/tailwind.config.js` + `apps/web/src/index.css`; primitives in `apps/web/src/shared/ui/` (`Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, `EmptyState`); reduced motion via token durations; tap targets ≥ 44px; visible focus rings. EP05 UI must use these — no ad-hoc colors/spacing.
- **Icons** — `lucide-react` `^0.312.0` (installed 0.312.0). Verified exports include `GraduationCap`, `ClipboardList`, `Brain`, `Ban`, `FileText`, `CalendarDays`, `Clock`, `Timer`, `AlertTriangle`, `CheckCircle2`, `Plus`, `ArrowRight`, `ChevronRight`, `Inbox`, `SquarePen`, `LayoutDashboard`, `BookOpen`, `NotebookPen`, `UserRound`, `ExternalLink`, `Link2`, `RefreshCw`. **Not available in 0.312.0** (do not name them): `CircleAlert`, `TriangleAlert`, `CircleCheckBig`, `CircleHelp`.
- **Ownership convention** — `apps/api/src/common/ownership/ownership.ts`: every academic query carries the authenticated `userId` (`ownedWhere`/`assertOwned`/`assertAffected`); missing and foreign records return the same uniform 404 `Resource not found` (never 403 — no existence oracle). **EP05 adds no new backend endpoints (D05-3), so this is a no-op for EP05** — the two endpoints it calls are already principal-scoped — but the plan states it, and the invariants table below names the counterexample.
- **Testing conventions** — web component tests beside components (`*.test.tsx`, vitest); browser e2e in `apps/web/e2e/` (`login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`) against the self-contained EP09 stack. Commands: `pnpm --filter web test -- <path>`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Unverified (disclosed as such):** the `ui-refiner` presentation decisions; EP06's and EP07's session creation (neither exists); any browser rendering of a proposed dashboard layout (no screenshots taken); the exact lucide-react icon names for icons not already verified above.

## Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| The dashboard never shows another student's work | Student B's browser calls the dashboard's queries, or the page is fed a foreign `courseId`/`assignmentId` | EP05 adds no endpoint and no id parameter (D05-3). `GET /assignments` is principal-scoped server-side (`where: { userId }`); `GET /calendar/events` accepts **only** `from`/`to` — the DTO whitelist rejects `userId`/`courseId`/`tz` with a 400, and the zone comes from the stored profile row, never from the client | TR-E05-01 |
| "Today" is the student's profile-zone day, not the browser's | A student whose **profile zone is `Pacific/Kiritimati` (UTC+14)** with a browser set to **`Etc/GMT+12` (UTC−12)** — the **26-hour** maximum IANA UTC-offset spread, so the two civil dates are **two calendar days apart** — sees an **empty "today"**: the ±1-day window never fetched the profile zone's "today" events | The request window is the browser-local civil date **± 2 days** (5 days), which provably contains the profile zone's civil date for every legal IANA offset pair (max spread 26 h < 48 h ⇒ the profile civil date is always within ±2 days of the browser's); the **selection key is the server-echoed `result.today`** and events are selected by `event.date === result.today`. The client never re-derives the zone (`SessionUser.timeZone` stays `undefined` for a verified student — `AuthContext.tsx:142`/`:153` — D05-6) | TR-E05-01 |
| Overdue is never re-derived or guessed | The dashboard marks an assignment overdue because its due **date** (not instant) is in the past, or marks a completed assignment overdue | The dashboard calls `isOverdueAssignment` (unfinished ∧ non-null `dueDate` strictly before `now`, no end-of-day grace) and `isUnfinishedAssignment` from `entities/assignment/model/status.ts` — the single source of truth. It implements no second rule | TR-E05-01, TR-E05-03 |
| The dashboard never fabricates a session | With no sessions in the database, the widget shows a session row anyway (e.g. a placeholder or a locally created row) | The widget renders exactly the `STUDY_SESSION` events the calendar returns; EP05 creates nothing and keeps no local session state. Until EP06/EP07 land, the section renders its empty state | TR-E05-04 |
| The quick action never mutates silently | The dashboard shows the new assignment before the server confirms it, or reports success after a failed POST | The action goes through the shared `useAssignmentActions` + `AssignmentForm` (client-validated, then `POST /assignments`); on success the dialog closes and the assignments query is invalidated/refetched; on failure the form stays open with the shared actionable error copy. No optimistic insert is used | TR-E05-05 |
| Overdue is identifiable without colour | A student with a colour-vision deficiency, or in high-contrast mode, cannot tell an overdue row from a normal one | The row carries the text label "Overdue" (`OVERDUE_LABEL`) in a `Badge`, in addition to colour — the same convention as the assignments list (EP04's AC-E04-08 precedent) | TR-E05-03, TR-E05-07 |
| The dashboard is operable without a mouse | A student cannot open a section's full list, add an assignment, or dismiss the dialog with the keyboard alone | Every control is a native link/button with a visible focus ring; the add-assignment dialog reuses the shared focus-managed `AssignmentForm`/`Dialog` (Escape closes, focus is restored); sections are headings in a predictable order | TR-E05-07, TR-E05-05 |

## Plan correction log

(First plan of this epic. No plan-review pass yet. The planner's 2026-10-29 correction pass added **PC-EP05-01…PC-EP05-03** below; the original plan's claims are preserved verbatim in the "Original finding" column and are not rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-EP05-01 | 2026-10-29 | Should-fix | `docs/stories/EP05/README.md` — shared dashboard data contract → "### "Today" — the one derived value" (request-window bullet) and the "Today" invariant row; decision D05-6; `docs/stories/EP05/EP05A-…md` AC #2, design decision #3, `dashboardRange.test.ts` window case | The request window was specified as the browser-local civil date **± 1 day** (3 days), justified as a safety margin "so that a student whose profile time zone differs from their browser's time zone still receives the profile zone's "today" events". **That justification is wrong:** the maximum UTC-offset spread in the IANA database is **26 hours** (UTC−12 `Etc/GMT+12` / Baker Island ↔ UTC+14 `Pacific/Kiritimati`), so the browser's and the profile zone's civil dates can be **two calendar days apart**. A ±1-day window therefore does not guarantee that the profile zone's "today" is inside the requested range: `result.today`'s events fall outside the fetched window and the dashboard shows an **empty "today"** for a real, legal zone combination. | Widened the window to the browser-local civil date **± 2 days** (5 days inclusive) and stated the derivation explicitly from the 26-hour bound in the shared contract, D05-6 and the invariant row; the **selection key remains the server-echoed `result.today`** (that part of D05-6 was correct). Added the **unit-test obligation for an adversarial 26-hour-spread zone pair** (`Pacific/Kiritimati` +14 vs `Etc/GMT+12` −12, whose civil dates differ by two days) alongside the retained ±1-day-pair case. Recorded the endpoint's **31-day inclusive cap** (5 ≤ 31 ✓) and that **`from === to` is legal** (so a 1-day window is legal but not safe). Also recorded the newly verified fact that `AuthContext` calls `refreshProfile()` **only** when `emailVerifiedAt === null` (`AuthContext.tsx:153` focus handler, `:142` effect), so for a **verified** student `GET /users/me` is never fetched on the dashboard path, `SessionUser.timeZone` stays `undefined`, and the client genuinely cannot derive the profile zone — cited alongside `entities/user/model/types.ts:6-9`. | Cross-file comparison: the window rule now reads identically in the EP05 README contract section, D05-6, the "Today" invariant row and EP05A's AC #2 / design decision #3 / test list; the test obligation names both the adversarial pair and the retained ±1-day pair; the 5-day span is within the API's inclusive cap (`calendar.service.ts:159-178`, `from === to` legal). | Fixed in plan |
| PC-EP05-02 | 2026-10-29 | Should-fix (cross-epic — **EP04 follow-up FU-EP04-01**) | `apps/web/src/pages/calendar/ui/CalendarPage.tsx:29-43` (`mondayOf`/`formatYMD` use browser-local getters), `:56` (`selectedDate` = `new Date()`), `:68-75` (browser-local `from`/`to`), `:77-85` (browser-local `days`), `:141` (`handleToday` → `new Date()`); `apps/web/src/features/calendar/ui/WeekView.tsx:33-34` (`eventsByDay.get(day)`, `isToday = day === today`); `apps/api/src/modules/calendar/calendar.service.ts` (`rangeStartInstant`/`rangeEndInstant`/`formatToday`/`zoneDateParts`) | **Faulty claim:** the calendar page's week range and column headers are the browser-local civil dates, and the events the server returns are therefore in that same week (the original EP05 plan described this derivation as "acceptable for a week view the student navigates"). **That claim is wrong:** the server interprets `from`/`to` in the **profile zone** (`wallToInstant(..., timeZone)`) and buckets events by the **profile zone's** civil date (`zoneDateParts(s.startTime, timeZone)` → `event.date`), so the client and the server do **not** describe the same days. **Consequence:** `groupByDay` (`CalendarPage.tsx:45-53`) keys events by the profile-zone date while the column headers are browser-local dates — events land in the **wrong day column or vanish from the grid entirely** — and the "today" marker compares the profile-zone `data.today` against browser-local `days`, so it highlights the wrong column or none. **Counterexample:** a student whose profile zone is `Pacific/Kiritimati` (UTC+14) with a browser set to `Etc/GMT+12` (UTC−12) sees another day's events, or an empty grid. **Partial prior coverage:** EP04's SP-127 F3 closed the **display** drift (the `T12:00:00Z` UTC-noon construction) but **not** the **range derivation**; EP04's own D404-2 ("the server owns the date math") and D404-3 ("the time zone is the stored profile zone") state the intended contract, which the shipped derivation does not honour. | Recorded in this log (discovery) and **owned by EP04** as follow-up **FU-EP04-01** — home: `docs/stories/EP04/README.md#open-follow-ups` — because EP05 does not own the calendar page and D05-3 forbids EP05 changing the API contract. EP05's shared contract now states that the calendar page's derivation is a defect EP05 must not copy, that **EP05's own "today" handling is correct and must not be changed to match it**, and that the combined EP05 review must not silently absorb it. The EP04 follow-up specifies the fix (week range and column headers derived from the **profile zone**, anchored on the server-echoed `today` / the server's echoed civil dates), forbids moving the range math back into the client (D404-2/D404-3 stay binding), requires the same zone-drift class to be checked for `CalendarAgenda` and the Today/prev/next controls, and states its evidence and its **standalone review unit** (EP04's SP-127 parent review stays PASS and is not reopened). | Cross-file comparison: `docs/stories/EP04/README.md` now carries FU-EP04-01 with the original location, the faulty claim, the consequence, the counterexample, the required fix, the owner, the DoD/evidence and the review route; `docs/stories/EP04/SP-127/README.md` points to it **without** altering the F3 row or the pass-3 verdict; `docs/stories/EP04/SP-127/artifacts/SP-127/review.md` is **unchanged**. EP05's README states the non-absorption rule in three places (contract section, D05-16, quality-gate row 8). | Fixed in plan — EP04 follow-up open (FU-EP04-01) |
| PC-EP05-03 | 2026-10-29 | Should-fix (settled decision) | `docs/stories/EP05/README.md` — decision D05-11, verification task V-05-2, code baseline (the placeholder's cards), quality-gate row 8; `docs/stories/EP05/EP05B-…md` in-scope #2 and out-of-scope; `docs/stories/EP05/EP05C-…md` out-of-scope | D05-11 recorded the placeholder's "Study Stats" card as **provisional** and left it as an **open question for the user** (quality-gate row 8 listed "D05-11 (the dropped "Study Stats" card)" among the open items), so the plan both dropped the card and left its status open. The card's two values were never real data: "Hours Studied" has **no endpoint** until EP07's `GET /study-sessions/confirmed-time` seam (D07-3) and EP07 is not built; "Tasks Completed" is derivable from the assignment list EP05 already fetches, but completed-task counts are **not** one of the epic's five scope items and would be a second, competing presentation of the assignment sections. | The decision is **final** (settled 2026-10-29 by the planner's delegated judgment): **EP05 ships no "Study Stats" card** — not as a placeholder to fill in later. D05-11 is marked final (no longer provisional); quality-gate row 8 no longer lists it as an open question; **V-05-2** is extended so the card is reconsidered **only** if a real study-time data source exists, so that EP07's study-history surface owns study time, and so that "Tasks Completed" is **deliberately not re-added** by EP05; the code baseline records the card's removal; EP05B and EP05C record the rebuild as an explicit **replacement** of the placeholder rather than a silent omission, and EP05B's page test asserts that **no** study-stats card is rendered. | Cross-file comparison: D05-11, V-05-2, the code baseline and quality-gate row 8 now agree with EP05B's in-scope/out-of-scope/test lists and EP05C's out-of-scope list; no file still describes the card as provisional, as a placeholder to be filled in, or as an open user question. | Fixed in plan |

## Quality gate (2026-10-29)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP05B and EP05C are `Needs refinement` (D05-12): the section layout and information hierarchy, how "today" is communicated, the section limits and their "see all" links, the two assignment lists' row form and the non-colour-only overdue marker, the study-sessions presentation, the quick-actions layout, the empty-state copy, the loading/error presentation, the 375px responsive behaviour and the keyboard behaviour/focus order are deliberately undecided and must be settled by the `ui-refiner` before those children are implemented. EP05A carries no user-visible surface and is `Ready` to implement. **No implementation blocker exists** beyond refinement: EP02, EP03 and EP04 are complete, EP05 adds no backend work, and EP06/EP07 are not dependencies of EP05's own acceptance criteria (D05-2, D05-13). The EP07 D07-9 seam is resolved by D05-5. The planner's 2026-10-29 correction pass (PC-EP05-01…PC-EP05-03) is applied: the "today" window rule is corrected and proven, the "Study Stats" decision is settled, and the one cross-epic item (FU-EP04-01) is **open but owned by EP04** — it does not block EP05 and must not be absorbed by the combined EP05 review (D05-16).

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Three children, each a substantive outcome (data spine, four sections + page shell, quick action + empty states + parent index). The split reasons are stated above; no README-only/status-only/evidence-only/verification-only child — the parent index and the integration verification belong to EP05C; the e2e suite is not extended (D05-14, justified by EP10's PR-003). |
| 2 | Original AC/TR coverage | Pass | All seven epic ACs mapped to owners above; eight TRs assigned (TR-E05-01…08). Every AC has at least one owning child and every TR has a named owner. AC-E05-04's creation half is explicitly owned by EP06/EP07 (D05-2) and its "selected day" reading is recorded (D05-4). |
| 3 | Definition of Done | Pass | DoD map above; items 2/3/4/9 marked Not applicable with reasons (no new input, no data-access change, no API error-contract change, no migration). Items 10/11 belong to the combined EP05 parent review. |
| 4 | Contract consistency | Pass | One shared dashboard data contract section (queries, the "today" derivation, the section derivation rules, limits/links, presentation reuse, trade-offs); EP05A implements the client data layer, EP05B/EP05C consume it, the combined review verifies it end to end. The three provisional seams carry named verification tasks (V-05-1…03). |
| 5 | Code paths inspected | Pass | Code baseline section above (the current placeholder page, the calendar read model and its client, the assignment list and its client, the shared predicates, the reusable assignment UI and its hook, the only existing RTK Query API, the store, the FSD lint zones, the EP10 design system, lucide-react's verified exports, the ownership convention, the testing conventions). Unverified items are disclosed there: the `ui-refiner` decisions, EP06/EP07's session creation, and any browser rendering (no screenshots taken). |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table above — seven claims with concrete counterexamples: cross-student data, the profile-zone "today" (now stated with the **26-hour** IANA offset bound and the adversarial `Pacific/Kiritimati` vs `Etc/GMT+12` pair whose civil dates differ by two days), re-derived overdue rules, a fabricated session, a silent quick-action mutation, colour-only overdue marking, and keyboard operability. |
| 7 | Dependencies | Pass | EP02 + EP03 + EP04 complete (satisfied); EP05A → EP05B → EP05C, one writer. EP06/EP07 are not broken down and are not implementation dependencies of EP05 (their seam is recorded as D05-2/D05-13/V-05-1). EP05 resolves EP07's D07-9 seam (D05-5). EP04's open SP-128B fix round does not touch anything EP05 consumes, and EP04's open follow-up FU-EP04-01 touches the EP04 calendar page, not EP05's surfaces (D05-16). |
| 8 | Material decisions | Blocked | D05-1…D05-5 are settled user decisions (2026-10-29). D05-11 is now **final** — the "Study Stats" card is dropped outright and "Tasks Completed" is deliberately not re-added (PC-EP05-03); it is no longer an open question. D05-16 records the cross-epic ownership of FU-EP04-01 (EP04's, not EP05's). D05-12 (the EP05B/EP05C UI/UX) is unresolved and is the `ui-refiner`'s to settle — this is what keeps the verdict at `Draft`. D05-10 (limits/links) remains provisional pending the `ui-refiner`. |
| 9 | Correction log | Pass | The planner's 2026-10-29 correction pass recorded PC-EP05-01 (the ±1-day window defect → ±2 days with the 26-hour derivation and an adversarial test), PC-EP05-02 (the EP04 calendar-page zone drift → FU-EP04-01, cross-epic and not absorbed by EP05) and PC-EP05-03 (the "Study Stats" decision settled). Original findings are preserved. No plan-review pass yet. |
| 10 | Jira identity | Not applicable | No sync authorized; the epic key is STUDY-19 and all three child keys are `Pending creation`. |

## Implementation review log

(No implementation yet.)

## Final implementation review unit

One combined review for the EP05 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP05](./README.md) | EP05A, EP05B, EP05C | `./artifacts/EP05/` | EP05C (writes `./artifacts/EP05/implementation.md`, including the combined change scope and the DoD-10 manual browser pass) | One combined EP05 review after all three children (`review.md` + `walkthrough.md`) |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP05B and EP05C must complete their `ui-refiner` pass before implementation.

## Autopilot

```yaml
version: 1
scope:
  parent: EP05
  descendants: []
  entry: planning
  limits: enclosing parent review unit
stage: plan
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: "add0f41"
  head: "3b8dd83"
active_dispatch:
  name: ep05-planner-2
  role: planner
  status: pending
  pointer: docs/stories/EP05/README.md
  session: ""
  assignment: plan_correction
last_result:
  evidence: "Breakdown committed: 1ff69d5 (README + EP05A), e29bee7 (EP05B), 35197b2 (EP05C), 3b8dd83 (README consolidation). All commits touch docs/stories/EP05/** only; the unrelated dirty apps/api/tsconfig.json was preserved unstaged. Coordinator-verified claims: CalendarPage.tsx:29-75 does derive its range from the browser-local date; SessionUser.timeZone is optional and absent on login/refresh/boot; OVERDUE_LABEL/OVERDUE_STYLE exist at assignmentPresentation.ts:65-66; the FSD lint zones forbid entities/ -> features/ and features/ -> app/; sessionApi.ts is the only RTK Query API with axiosBaseQuery/reducerPath 'api'; lucide-react 0.312.0 has graduation-cap/brain/ban/timer/inbox/layout-dashboard/square-pen/notebook-pen/user-round/alert-triangle etc. and NO circle-alert/triangle-alert/circle-check-big/circle-help."
  findings: "None open. Planner recorded D05-1..D05-15 (D05-1..D05-5 user-settled; D05-6 the profile-zone 'today' derivation; D05-7 the shared RTK base query; D05-8 the two per-domain slices + store registration; D05-9 the assignment split keeping the endpoint order; D05-10 provisional limits/links; D05-11 the dropped 'Study Stats' card — flagged to the user and the ui-refiner; D05-12 the EP05A ui-refiner carve-out; D05-13 the study-sessions provisional seam; D05-14 no dashboard e2e; D05-15 the course-less student). Verification tasks V-05-1..03 recorded."
  scope_note: "Planning only — no implementation, no Jira sync (children stay `Pending creation`). Verdict Draft: EP05A Ready; EP05B and EP05C await the ui-refiner pass (D05-12). EP07's D07-9 seam is resolved by D05-5. EP06/EP07 are not EP05 implementation dependencies."
  cycles: 0
  same_findings: unknown
gates:
  breakdown: true
  plan: draft
  ui: unknown
  refinement: false
  child_unfinished: false
  eligible_child_state: Ready
  closeout: unknown
  integration: unknown
  all_descendants_implemented: false
  review: absent
  findings_owner: none
  open_findings: false
  walkthrough: missing
  judged_at_head: "3b8dd83"
  queue_hash: "ep05-queue-v1"
writer: none
session_live: unknown
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: ""
judgment_attempts: 0
```
