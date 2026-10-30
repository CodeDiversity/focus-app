# EP05 Story Breakdown — Student Dashboard

**Epic:** [EP05: Student Dashboard](../../epics/EP05-student-dashboard.md) (Jira STUDY-19)
**Milestone:** M2 (Calendar and dashboard)
**Epic dependency:** EP02 (Semester & Course Management) — complete 2026-10-23; EP03 (Assignment & Task Management) — complete (all nine parents reviewed); EP04 (Academic Calendar & Availability) — implementation complete (SP-127 pass 3, SP-128 pass 1, SP-129 pass 3; SP-128B's F-B-6 fix round is open but touches the availability editor, which EP05 does not consume). **EP05's own implementation is unblocked.**
**Status:** Planning — breakdown complete (2026-10-29). EP05A (data layer) is `Ready`; EP05B and EP05C are `Needs refinement` pending their `ui-refiner` pass (D05-12). No implementation started.
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
| TR-E05-01 | Data-layer tests: RTK Query endpoint wiring (URL/method/params, payload unchanged), the request window and `today` selection (including a profile zone ≠ browser zone), the unfinished/overdue split with the shared predicates, order preservation, and limit application | EP05A |
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

- **Request window:** the browser-local civil date **± 1 day** (3 days, ≤ the 31-day cap). The window is only a safety margin: it exists so that a student whose **profile time zone differs from their browser's time zone** still receives the profile zone's "today" events.
- **Selection key:** `result.today` — the server's profile-zone date. Every calendar-derived section selects `event.date === result.today`.

**The gap this closes (do not copy the calendar page's derivation).** `apps/web/src/pages/calendar/ui/CalendarPage.tsx` derives its week range from the **browser's** local date (`mondayOf(new Date())` + `formatYMD` using local getters, lines 29–75) — it does not use the profile zone, even though the payload carries `timeZone` and `today`. That derivation is acceptable for a week view the student navigates, but it is **wrong** for a "today" view: a student in `Pacific/Auckland` whose browser is set to `UTC` would be served the wrong civil day. EP05 therefore does **not** reuse it; it uses the padded window + the server-echoed `today` (D05-6).

The client's session user is **not** a usable zone source: `SessionUser.timeZone` is optional and is absent on login/refresh/boot session users (verified — `apps/web/src/entities/user/model/types.ts:6-9` and the IR-106-01 note in `apps/web/src/pages/profile/ui/ProfilePage.tsx:58`); `GET /users/me` is not read on the dashboard path. The payload's `timeZone`/`today` are the only authoritative values available to the page.

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
| D05-6 | **"Today" is the server's profile-zone date, not the browser's.** The request window is the browser-local civil date ± 1 day (a safety margin for a profile zone that differs from the browser's); the selection key is the payload's `today`. The calendar page's browser-local range derivation is **not** reused (it would serve the wrong civil day). The client's session user is not a usable zone source (`SessionUser.timeZone` is absent on login/refresh/boot users). | Planner-recorded, grounded in the verified calendar payload (`formatToday(timeZone)`), `CalendarPage.tsx:29-75`, and `entities/user/model/types.ts:6-9`. Reversible. |
| D05-7 | **The shared RTK Query base query lives in `shared/api/rtkBaseQuery.ts`.** `axiosBaseQuery` and `AxiosBaseQueryError` move out of `features/session/api/sessionApi.ts` (which then imports them from `shared/`), so the two new domain slices do not import across features and no `entities/` file imports a `features/` file (forbidden by the FSD lint zone in `apps/web/.eslintrc.cjs:64-68`). No behaviour change to the transport. | Planner-recorded. Reversible (the export can stay where it is and be re-exported). |
| D05-8 | **The two RTK Query APIs live in `features/assignments/api/assignmentsApi.ts` and `features/calendar/api/calendarApi.ts`**, each a separate `createApi` with its own `reducerPath`, both registered in `apps/web/src/app/store/store.ts` (reducer + middleware + the serializability ignore list). The existing plain-axios entity clients (`entities/assignment/api/assignmentApi.ts`, `entities/calendar/api/calendarApi.ts`) stay as they are and are reused by the slices, so EP04's calendar page and EP03's assignments page are untouched. The dashboard's derived model + section components live in `features/dashboard/{model,ui}/` (the same FSD shape EP04 used for `features/calendar/ui/`). | Planner-recorded, grounded in the FSD convention (`docs/epics/README.md#frontend-architecture`) and the existing `features/session/api/sessionApi.ts` precedent. Reversible. |
| D05-9 | **The dashboard splits the assignment list and keeps the endpoint's order.** Overdue = `isUnfinishedAssignment` ∧ `isOverdueAssignment`; Upcoming = `isUnfinishedAssignment` ∧ ¬overdue. Both keep the endpoint's default order (`dueDate asc` nulls last, `title asc`, `id asc`) — no client re-sort. Null-`dueDate` unfinished assignments stay in "upcoming deadlines", last, and must be labelled rather than shown blank. | Planner-recorded, grounded in SP-122's D122-5 and the shared predicates. Reversible. |
| D05-10 | **Section limits and "see all" targets (provisional):** classes 5 → `/calendar`; upcoming deadlines 5 → `/assignments`; overdue 5 → `/assignments`; study sessions 3 → `/calendar`. Chosen to honour the epic's "avoid overwhelming the user"; every target is an existing route (EP05 adds no route). The `ui-refiner` confirms or replaces them. | Planner-recorded, provisional — subject to the `ui-refiner` pass (D05-12). |
| D05-11 | **The placeholder's static cards are not carried into the rebuilt dashboard.** The current page hard-codes "Study Stats → 0 Hours Studied / 0 Tasks Completed" and "Recent Assignments → No assignments yet". Shipping fake zeros would be misleading and the real study-time figure has no endpoint until EP07's confirmed-time seam (D07-3); "Recent assignments" is superseded by the upcoming/overdue sections. The dashboard is rebuilt around the four sections plus the quick action. **Open question for the user** — see the final handoff. | Planner-recorded, reversible; flagged to the `ui-refiner` and the user. |
| D05-12 | **EP05B and EP05C are `Needs refinement`; EP05A is `Ready`.** The `ui-refiner` settles the section layout and information hierarchy, how "today" is communicated, the section limits and their "see all" links, the two assignment lists' row form and the non-colour-only overdue marker, the study-sessions presentation, the quick-actions layout, the empty-state copy, the loading/error presentation, the 375px responsive behaviour and the keyboard behaviour/focus order. EP05A carries no user-visible surface (it is the data layer), so a UI/UX pass on it would be a category error — its story file still records the narrow presentation coupling it owns, and it is amended first if the EP05B/EP05C pass changes the query-state contract it exposes. | Planner skill UI/UX handoff rule + the ui-refiner skill's scope ("if the ticket is backend-only, report that no UI/UX pass applies"). The EP05A carve-out is a deliberate, stated reading of the handoff instruction — see the final handoff. |
| D05-13 | **The study-sessions widget consumes `STUDY_SESSION` calendar events — the only session data the API exposes today.** EP06's *planned* sessions (`StudyPlan`/`ScheduledTask`) are not exposed by any endpoint yet, so "planned study sessions" is satisfied today through the calendar's session events. Provisional seam: V-05-1. | Planner-recorded, grounded in the calendar read model and EP04's D404-6 + EP07's D07-3. Provisional. |
| D05-14 | **No dashboard e2e spec is added.** The EP09 browser suite covers `login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses` — there is no dashboard spec, and EP10's plan-review finding PR-003 recorded that expanding the suite beyond those specs is an EP09-scope decision requiring approval. EP05's DoD-10 evidence is therefore a **recorded manual browser pass** (TR-E05-08, owned by EP05C) plus the component/integration tests in TR-E05-01…07. Recorded as a documented gap with a named owner (the EP09 owner / the user), not as silent coverage. | Planner-recorded, grounded in EP10's PR-003 and the e2e directory contents. |
| D05-15 | **A student with no courses can still use the dashboard.** The dashboard renders its empty states for every section and the add-assignment action works without a course (the shared form's create mode stores a null course when no course is selected). | Planner-recorded; follows SP-113's nullable `courseId` semantics. Reversible. |

### Verification tasks (provisional seams)

| ID | Trigger | Task |
|---|---|---|
| V-05-1 | EP06/EP07 land | Re-check the study-sessions widget against the planned-session read model and the session-history surface; revisit the "see all" target for that section (currently `/calendar`). |
| V-05-2 | EP07 lands | Revisit D05-11 (the dropped "Study Stats" card) against `GET /study-sessions/confirmed-time`. |
| V-05-3 | `GET /assignments` gains pagination, a multi-value status filter, or a changed default sort | Re-check the dashboard's whole-list fetch and its reliance on the documented default order (D05-3, D05-9). |

## Code baseline (inspected 2026-10-29, not proposed)

- **The current dashboard** — `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` is an 82-line static placeholder: a welcome line + "View Profile" button, a "Quick Actions" card with three **non-functional** buttons (Add New Assignment / Create Study Plan / Start Focus Session), a "Recent Assignments" card hard-coded to "No assignments yet", a "Study Stats" card with hard-coded zeros, and an "Upcoming Deadlines" card hard-coded to "No upcoming deadlines". **There is no dashboard test file.** The route `/dashboard` exists inside the `ProtectedRoute` block of `apps/web/src/app/App.tsx:38`.
- **Calendar read model** — `GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD` (`apps/api/src/modules/calendar/calendar.controller.ts:11-14`, `dto/list-calendar-events-query.dto.ts`). Only `from`/`to` are whitelisted; unknown query parameters are rejected with a 400 by the global `FieldValidationPipe`. The service re-checks order and the 31-day cap (`calendar.service.ts:159-178`); `from === to` is legal (span 1 day). Response: `{ timeZone, today, from, to, events[] }`; `today` is the profile zone's current date (`formatToday(timeZone)`, `calendar.service.ts:68-75`). `CalendarEvent` (`calendar.service.ts:7-28`; mirrored in `apps/web/src/entities/calendar/model/types.ts`) has `{ id, type, title, subtitle, date, startTime, endTime, courseId, courseName, courseColor, assignmentId, completed, focus, link }`; `type` ∈ `CLASS | ASSIGNMENT_DEADLINE | EXAM_DEADLINE | STUDY_SESSION | AVAILABILITY | BLOCKED_TIME`. The server owns all date/time-zone arithmetic (D404-2) — the client sends only a civil date range and renders pre-bucketed values. `events[].link` is populated for class events (`/courses/:id`, `calendar.service.ts:247`), for deadlines (`/courses/:id` or `/assignments`, `:293`) and for availability (`/availability`, `:268`), but is **`null` for study sessions** (`:323`). The client is `apps/web/src/entities/calendar/api/calendarApi.ts` (`listCalendarEvents`) — plain axios today; EP05 wraps it with an RTK Query slice (D05-1). `apps/web/src/features/calendar/ui/` holds `WeekView.tsx`, `CalendarAgenda.tsx`, `CalendarEventChip.tsx`, `CalendarEventDetails.tsx` (a focus-trapped dialog with Escape + focus restoration — the reusable details-dialog pattern).
- **Assignment list** — `GET /assignments` (`apps/api/src/modules/assignments/assignments.controller.ts`, `dto/list-assignments-query.dto.ts`, service `list()` at `assignments.service.ts:261-384`). All query params optional and AND-combined: `courseId`, `status` (ONE value of PENDING|IN_PROGRESS|COMPLETED|SUBMITTED|GRADED), `priority`, `type`, `dueFrom`/`dueTo` (ISO datetimes), `q` (≤ 200), `sort` (dueDate|title|priority|status|createdAt|updatedAt), `order`. Default sort `dueDate asc`, nulls last, tie-break `title asc` then `id asc` (`assignments.service.ts:315-328`). **No pagination and no limit** (SP-122's D122-7). The response is `AssignmentListItem[]` including a `course` object and the assignment's ordered `tasks` — so the dashboard's assignment rows already carry subtask data. The client is `apps/web/src/entities/assignment/api/assignmentApi.ts` (`listAssignments`) — plain axios today.
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
| "Today" is the student's profile-zone day, not the browser's | A student in `Pacific/Auckland` with a browser set to `UTC` sees yesterday's classes | The request window is the browser-local date ± 1 day; the **selection key is the server-echoed `result.today`**, and events are selected by `event.date === result.today`. The client never re-derives the zone (the session user's `timeZone` is absent on login/refresh/boot — D05-6) | TR-E05-01 |
| Overdue is never re-derived or guessed | The dashboard marks an assignment overdue because its due **date** (not instant) is in the past, or marks a completed assignment overdue | The dashboard calls `isOverdueAssignment` (unfinished ∧ non-null `dueDate` strictly before `now`, no end-of-day grace) and `isUnfinishedAssignment` from `entities/assignment/model/status.ts` — the single source of truth. It implements no second rule | TR-E05-01, TR-E05-03 |
| The dashboard never fabricates a session | With no sessions in the database, the widget shows a session row anyway (e.g. a placeholder or a locally created row) | The widget renders exactly the `STUDY_SESSION` events the calendar returns; EP05 creates nothing and keeps no local session state. Until EP06/EP07 land, the section renders its empty state | TR-E05-04 |
| The quick action never mutates silently | The dashboard shows the new assignment before the server confirms it, or reports success after a failed POST | The action goes through the shared `useAssignmentActions` + `AssignmentForm` (client-validated, then `POST /assignments`); on success the dialog closes and the assignments query is invalidated/refetched; on failure the form stays open with the shared actionable error copy. No optimistic insert is used | TR-E05-05 |
| Overdue is identifiable without colour | A student with a colour-vision deficiency, or in high-contrast mode, cannot tell an overdue row from a normal one | The row carries the text label "Overdue" (`OVERDUE_LABEL`) in a `Badge`, in addition to colour — the same convention as the assignments list (EP04's AC-E04-08 precedent) | TR-E05-03, TR-E05-07 |
| The dashboard is operable without a mouse | A student cannot open a section's full list, add an assignment, or dismiss the dialog with the keyboard alone | Every control is a native link/button with a visible focus ring; the add-assignment dialog reuses the shared focus-managed `AssignmentForm`/`Dialog` (Escape closes, focus is restored); sections are headings in a predictable order | TR-E05-07, TR-E05-05 |

## Plan correction log

(First plan of this epic. No plan-review pass yet.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | No findings yet. | — | — | — |

## Quality gate (2026-10-29)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP05B and EP05C are `Needs refinement` (D05-12): the section layout and information hierarchy, how "today" is communicated, the section limits and their "see all" links, the two assignment lists' row form and the non-colour-only overdue marker, the study-sessions presentation, the quick-actions layout, the empty-state copy, the loading/error presentation, the 375px responsive behaviour and the keyboard behaviour/focus order are deliberately undecided and must be settled by the `ui-refiner` before those children are implemented. EP05A carries no user-visible surface and is `Ready` to implement. **No implementation blocker exists** beyond refinement: EP02, EP03 and EP04 are complete, EP05 adds no backend work, and EP06/EP07 are not dependencies of EP05's own acceptance criteria (D05-2, D05-13). The EP07 D07-9 seam is resolved by D05-5.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Three children, each a substantive outcome (data spine, four sections + page shell, quick action + empty states + parent index). The split reasons are stated above; no README-only/status-only/evidence-only/verification-only child — the parent index and the integration verification belong to EP05C; the e2e suite is not extended (D05-14, justified by EP10's PR-003). |
| 2 | Original AC/TR coverage | Pass | All seven epic ACs mapped to owners above; eight TRs assigned (TR-E05-01…08). Every AC has at least one owning child and every TR has a named owner. AC-E05-04's creation half is explicitly owned by EP06/EP07 (D05-2) and its "selected day" reading is recorded (D05-4). |
| 3 | Definition of Done | Pass | DoD map above; items 2/3/4/9 marked Not applicable with reasons (no new input, no data-access change, no API error-contract change, no migration). Items 10/11 belong to the combined EP05 parent review. |
| 4 | Contract consistency | Pass | One shared dashboard data contract section (queries, the "today" derivation, the section derivation rules, limits/links, presentation reuse, trade-offs); EP05A implements the client data layer, EP05B/EP05C consume it, the combined review verifies it end to end. The three provisional seams carry named verification tasks (V-05-1…03). |
| 5 | Code paths inspected | Pass | Code baseline section above (the current placeholder page, the calendar read model and its client, the assignment list and its client, the shared predicates, the reusable assignment UI and its hook, the only existing RTK Query API, the store, the FSD lint zones, the EP10 design system, lucide-react's verified exports, the ownership convention, the testing conventions). Unverified items are disclosed there: the `ui-refiner` decisions, EP06/EP07's session creation, and any browser rendering (no screenshots taken). |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table above — seven claims with concrete counterexamples: cross-student data, the profile-zone "today", re-derived overdue rules, a fabricated session, a silent quick-action mutation, colour-only overdue marking, and keyboard operability. |
| 7 | Dependencies | Pass | EP02 + EP03 + EP04 complete (satisfied); EP05A → EP05B → EP05C, one writer. EP06/EP07 are not broken down and are not implementation dependencies of EP05 (their seam is recorded as D05-2/D05-13/V-05-1). EP05 resolves EP07's D07-9 seam (D05-5). EP04's open SP-128B fix round does not touch anything EP05 consumes. |
| 8 | Material decisions | Blocked | D05-1…D05-5 are settled user decisions (2026-10-29). D05-12 (the EP05B/EP05C UI/UX) is unresolved and is the `ui-refiner`'s to settle — this is what keeps the verdict at `Draft`. D05-10 (limits/links) and D05-11 (the dropped "Study Stats" card) are provisional and pending the user/`ui-refiner`. |
| 9 | Correction log | Pass | First plan of this epic; no plan-review pass yet. The log is initialized with no findings. |
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
  baseline: ""
  head: "add0f41"
active_dispatch:
  name: ep05-planner-1
  role: planner
  status: pending
  pointer: docs/stories/EP05/README.md
  session: ""
  assignment: plan
last_result:
  evidence: ""
  findings: ""
  scope_note: ""
  cycles: 0
  same_findings: unknown
gates:
  breakdown: unknown
  plan: unknown
  ui: unknown
  refinement: unknown
  child_unfinished: unknown
  eligible_child_state: unknown
  closeout: unknown
  integration: unknown
  all_descendants_implemented: unknown
  review: unknown
  findings_owner: unknown
  open_findings: unknown
  walkthrough: unknown
  judged_at_head: ""
  queue_hash: ""
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
