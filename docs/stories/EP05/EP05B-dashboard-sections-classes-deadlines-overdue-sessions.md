# EP05B: Dashboard Sections — Today's Classes, Upcoming Deadlines, Overdue Assignments, Today's Study Sessions

**Story ID:** EP05B
**Title:** Frontend — the four dashboard sections and the rebuilt dashboard page
**Parent epic:** [EP05: Student Dashboard](../../epics/EP05-student-dashboard.md) (Jira STUDY-19)
**Parent:** [EP05 breakdown](./README.md)
**Milestone:** M2 (Calendar and dashboard)
**Layer:** Frontend
**Status:** Needs refinement — the `ui-refiner` pass (D05-12) must settle the section layout, the "today" labelling, the limits and "see all" links, the row forms, the study-sessions presentation, the loading/error presentation, the 375px behaviour and the keyboard/focus order before implementation. Not implemented.
**Dependencies:** EP05A implemented (the queries and the derived sets this story renders). EP02/EP03/EP04 complete (satisfied).
**Jira key:** Pending creation
**Refined:** — (awaiting the `ui-refiner` pass; the specific gaps are recorded at the end of this file)

## Summary

Rebuild the dashboard page around four real sections — today's classes, upcoming deadlines, overdue assignments and today's study sessions — each rendered from the data EP05A derives, each with a limit, a "see all" link to the corresponding full list, and its own loading, empty and error state. The placeholder's static cards are removed (D05-11).

## Description & bounded scope

### In scope

1. **The four section components** in `apps/web/src/features/dashboard/ui/`:
   - `TodayClassesSection.tsx` — today's `CLASS` events: time range, course, title; ordered by start time; capped; "see all" → `/calendar`.
   - `UpcomingDeadlinesSection.tsx` — unfinished, not-overdue assignments ordered by upcoming deadline; the due date shown; a null `dueDate` labelled ("No due date"); capped; "see all" → `/assignments`.
   - `OverdueAssignmentsSection.tsx` — unfinished assignments whose `dueDate` is in the past; each row marked with the text label "Overdue" (never colour alone); capped; "see all" → `/assignments`.
   - `TodayStudySessionsSection.tsx` — today's `STUDY_SESSION` events; the focus flag shown as text ("Focus session"); capped; "see all" → `/calendar`. Renders an empty state until EP06/EP07 create sessions (D05-2).
2. **The dashboard page** — `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` is rebuilt: a heading with the current day, the four sections in a responsive layout, per-section states, and the page's live region. The placeholder's quick-action card, its static "Recent Assignments" card, its static "Study Stats" card and its static "Upcoming Deadlines" card are removed (D05-11) — the working "Add assignment" action is EP05C's.
3. **The "open relevant details directly" affordances** (the second half of AC-E05-05): a class row opens the course (`event.link` → `/courses/:id`); an assignment row opens its details (the shared edit dialog via `useAssignmentActions`, or the course page — the ui-refiner decides, see the gaps); a study-session row has **no** deep link today (`events[].link` is `null` for sessions — verified) and must not pretend to have one.
4. **Tests** for the four sections and the page (TR-E05-02, TR-E05-03, TR-E05-04, TR-E05-07).

### Out of scope

- The working "Add assignment" action and the empty-state copy (EP05C).
- Any backend change, new endpoint, new route, or date picker (D05-3, D05-4).
- The data layer itself (EP05A).
- Re-styling EP03's assignments page or EP04's calendar page; the dashboard only **links** to them.
- A "study stats" surface (D05-11 — no endpoint exists; V-05-2).

## Source requirement references

- **Epic AC-E05-01, AC-E05-02, AC-E05-03, AC-E05-04** (display half), **AC-E05-05** (the "open relevant details" half), **AC-E05-07**.
- **Shared DoD** — items 1, 5, 6, 7, 8 (and item 10 through the combined EP05 parent review).
- **Decisions:** D05-2 (the study-sessions widget ships now), D05-4 (today only, no day picker), D05-9 (the assignment split and its order), D05-10 (provisional limits and "see all" targets — the `ui-refiner` confirms them), D05-11 (the placeholder's static cards are not carried over), D05-15 (no courses is a valid state).

## Acceptance criteria

1. **Today's classes.** The dashboard shows today's class schedule from the calendar's `CLASS` events for the selected day (`result.today`), each row showing the time range, the course and the event title, in the calendar's start-time order, capped at the section limit with a "see all" link to the full calendar.
2. **The two assignment lists.** The "upcoming deadlines" section lists the incomplete assignments that are not overdue, ordered by upcoming deadline (the endpoint's order is preserved; assignments without a due date come last and are labelled rather than left blank); the "overdue" section lists the incomplete assignments whose due date has passed, each row marked with the text label "Overdue" in addition to colour. Both sections are capped and link to the full assignments list.
3. **Today's study sessions.** The dashboard lists today's `STUDY_SESSION` events with their times and, where the event is a focus session, that fact shown as text. The section renders an empty state until sessions exist (no session is created by EP05) and links to the full calendar.
4. **Per-section states.** Every section renders its own loading, empty and error state; an error in one section (with a retry action) does not blank the other sections; the page exposes a live region that announces the loaded state, and the day's date and time zone are shown to the student.

## Tests to add

- `apps/web/src/features/dashboard/ui/TodayClassesSection.test.tsx` (new):
  - Renders one row per `CLASS` event of the selected day with the time range, the course name and the title; a `CLASS` event on another day is not rendered.
  - Rows appear in the calendar's start-time order.
  - With more events than the limit, only `limit` rows are rendered and the section signals the remainder ("…and N more" — the wording is the ui-refiner's).
  - The "see all" link points at `/calendar`.
  - Loading → skeleton/spinner; error → the message + a "Try again" action that refetches; empty → the empty state.
- `apps/web/src/features/dashboard/ui/UpcomingDeadlinesSection.test.tsx` and `OverdueAssignmentsSection.test.tsx` (new):
  - Upcoming: unfinished rows ordered by upcoming deadline, a null-`dueDate` row last and labelled, finished rows absent, limit + "see all" → `/assignments`.
  - Overdue: an overdue row shows the text "Overdue" (assert the accessible text, not only a class), a not-overdue row does not, a finished row with a past due date is absent, the due date is shown, limit + "see all" → `/assignments`.
  - Both: loading, empty and error states.
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.test.tsx` (new):
  - A `STUDY_SESSION` event of the selected day renders with its time; `focus: true` shows "Focus session" as text; an event of another day is absent.
  - With no sessions (the state today, until EP06/EP07 land) the section renders its empty state and **no** session row.
  - Limit + "see all" → `/calendar`; loading and error states.
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` (new — no dashboard test exists today):
  - The four sections render in the page's order with their headings.
  - A failing assignments query shows the error only in the two assignment sections while the calendar sections still render (partial failure).
  - The page shows the current day and the student's time zone; the live region announces the loaded state.
  - The page contains no leftover placeholder content (no "Hours Studied", no hard-coded "No assignments yet", no inert "Create Study Plan"/"Start Focus Session" buttons).
- **Accessibility / responsive (TR-E05-07):**
  - Every section is a labelled region/heading in a predictable order; the "see all" links are reachable and operable by keyboard in that order.
  - Visible focus rings on all interactive elements (the EP10 token `focus-ring`).
  - The overdue marking is present as text, so it survives a colour-blind/greyscale check.
  - At 375px the sections stack in one column and each row's content wraps without horizontal scrolling.
- **Verification:** `pnpm --filter web test -- src/features/dashboard src/pages/dashboard`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified codebase facts (inspected 2026-10-29)

- **The page being replaced** — `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (82 lines): `max-w-7xl` shell; a "Dashboard" heading + "Welcome back, {name}!" + a "View Profile" link; a `md:grid-cols-2 lg:grid-cols-3` grid of four `.card` blocks — "Quick Actions" (three inert `Button`s), "Recent Assignments" (hard-coded "No assignments yet"), "Study Stats" (hard-coded zeros), "Upcoming Deadlines" (hard-coded "No upcoming deadlines"). It renders a full-screen spinner while `useAuth().isLoading`.
- **The route** — `apps/web/src/app/App.tsx:38`: `/dashboard` inside the `ProtectedRoute` block, rendered within the standard `Layout` (skip link + landmarks).
- **The data EP05A provides** — `useAssignmentsQuery()` → `AssignmentListItem[]`; `useCalendarEventsQuery({ from, to })` → `CalendarEventsResult`; and the pure selectors `selectTodayClasses`, `selectTodayStudySessions`, `selectUpcomingAssignments`, `selectOverdueAssignments`, `limitRows`. The payload's `today` and `timeZone` are the server's profile-zone values (D05-6).
- **The `CalendarEvent` shape** — `apps/web/src/entities/calendar/model/types.ts`: `{ id, type, title, subtitle, date, startTime, endTime, courseId, courseName, courseColor, assignmentId, completed, focus, link }`. `startTime`/`endTime` are `HH:mm` **in the student's profile time zone** (server-bucketed, D404-2) — the dashboard renders them as-is and performs no zone arithmetic. `endTime` is `null` for point events. `link` is `/courses/:id` for classes, `null` for study sessions (verified in `calendar.service.ts:247` and `:323`).
- **The `AssignmentListItem` shape** — `apps/web/src/shared/types/academic.ts:136-150`: the 11 assignment keys plus `course: { id, name, code, color } | null` and `subtasks: Subtask[]` (ordered). `dueDate` is an ISO instant or `null`.
- **Presentation precedents to reuse**
  - `apps/web/src/features/calendar/ui/CalendarEventChip.tsx:26-31` and `CalendarEventDetails.tsx:14-20` — the type icon + label map (`CLASS` → `GraduationCap`/"Class", `STUDY_SESSION` → `Brain`/"Study session", `ASSIGNMENT_DEADLINE` → `ClipboardList`/"Assignment", `EXAM_DEADLINE` → `FileText`/"Exam", `BLOCKED_TIME` → `Ban`/"Blocked"). The same convention makes the sections identifiable without colour (EP04's AC-E04-08).
  - `apps/web/src/features/assignments/ui/assignmentPresentation.ts` — `OVERDUE_LABEL` ("Overdue", line 66) and `OVERDUE_STYLE` (line 65) — the overdue marker already exists as a **text** label; `STATUS_LABELS`, `PRIORITY_LABELS`, `TYPE_LABELS`, `subtaskProgress()`.
  - `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — the full assignment card (type icon, title, urgency badge, course chip, meta line, subtask disclosure, status select, overflow menu). **The dashboard's rows are a reduced form of it** — the dashboard does not need the status select or the subtask checklist; the ui-refiner decides whether to reuse the component with reduced props or write a compact dashboard row.
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — the reference page shell (`max-w-5xl`, `role="status"` uppercase tracking-wider count header, distinct empty/no-match states, `role="alert"` error card with a "Try again" button, `max-sm:min-h-[44px]` tap targets).
  - `apps/web/src/shared/ui/` — `Card` (`variant`, `padding`), `Badge` (`variant: neutral|accent|success|warning|danger`, `size`, `icon`), `EmptyState` (`icon`, `title`, `description`, `action`), `Button`, `Dialog`.
  - `apps/web/src/shared/lib/datetime.ts` — `formatDate(date, timeZone)`, `formatTime(date, timeZone)`, `formatDateTime(date, timeZone)` — zone-aware **display** helpers (the arithmetic stays server-side).
  - `apps/web/src/shared/lib/errors.ts` — `getErrorMessage(error)` for the error copy.
  - `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` — the reusable focus-trapped dialog (Escape closes, focus trap, focus restored) if a section opens a details dialog.
- **Icons** — `lucide-react` 0.312.0; verified exports include `GraduationCap`, `ClipboardList`, `Brain`, `Ban`, `FileText`, `CalendarDays`, `Clock`, `Timer`, `AlertTriangle`, `CheckCircle2`, `ArrowRight`, `ChevronRight`, `Inbox`, `SquarePen`. **`CircleAlert`, `TriangleAlert`, `CircleCheckBig` and `CircleHelp` do not exist in 0.312.0** — do not name them.
- **FSD** — the section components live in `features/dashboard/ui/` (the same shape EP04 used for `features/calendar/ui/`); the page lives in `pages/dashboard/ui/`. `features/` may import `entities/` and `shared/` but not `pages/`/`app/`.

### Design decisions (planner-recorded)

1. **Four section components, one page.** Each section owns its own heading, its rows, its limit, its "see all" link and its three states. The page composes them and owns the page-level heading, the day/time-zone label and the live region.
2. **The deadline sections show assignment rows, not calendar chips.** The calendar's `ASSIGNMENT_DEADLINE` events are not used for them: the assignment rows carry course context, subtask progress and the assignment's own status, and a single source per section avoids two competing presentations of the same work.
3. **The endpoint's order is the section's order** (D05-9) — the sections never re-sort.
4. **The overdue marker is text.** The row shows the word "Overdue" (`OVERDUE_LABEL`) in a `Badge`; colour is an addition, never the signal.
5. **The class row links to the course** via the payload's `link` (`/courses/:id`); the assignment row's affordance is the ui-refiner's call (the shared edit dialog vs. the course page); the study-session row has no deep link today and is not given a fake one — it may open the calendar, or be non-interactive (ui-refiner).
6. **The page removes the placeholder's static content** (D05-11). The "Quick Actions" card is removed here and re-added as a working block by EP05C (an accepted inter-commit transient).

### Proposed files

- `apps/web/src/features/dashboard/ui/TodayClassesSection.tsx` (**new**)
- `apps/web/src/features/dashboard/ui/UpcomingDeadlinesSection.tsx` (**new**)
- `apps/web/src/features/dashboard/ui/OverdueAssignmentsSection.tsx` (**new**)
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.tsx` (**new**)
- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modify — rebuild)
- `apps/web/src/features/dashboard/ui/*.test.tsx` (**new**) and `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` (**new**)

### Remaining risks / implementation notes (not blockers)

- **The session row has no link.** `events[].link` is `null` for `STUDY_SESSION` — a session row must not render a link that goes nowhere.
- **The empty study-sessions section is the expected state today.** It must not read as an error, and it must not say "no sessions scheduled" in a way that implies the feature is broken (D05-2, D05-13) — the copy is the ui-refiner's.
- **Row density.** The full `AssignmentRow` carries a status select and a subtask disclosure; a dashboard row is a summary. Reusing the component unchanged would put four status selects and four overflow menus on the dashboard. The ui-refiner decides reuse-with-reduced-props vs. a new compact row.
- **The limit's remainder.** `limitRows` reports the remainder; the section shows it (e.g. "+3 more") only if the ui-refiner wants that — the "see all" link may be the only affordance.
- **Duplicate content with the full lists.** The dashboard repeats rows the assignments and calendar pages also show; the sections must stay summaries (no editing, no deletion) so the full pages remain the place to work.
- **Time display.** `startTime`/`endTime` are already profile-zone `HH:mm` strings — render them directly. `dueDate` is an ISO **instant**: displaying it in the profile zone needs `formatDate`/`formatTime` from `shared/lib/datetime.ts` with the payload's `timeZone`, not the browser's zone. This is the one place the dashboard touches a zone value, and it is display-only (the server still owns the arithmetic).
- **The page currently renders its own full-screen auth spinner** (`useAuth().isLoading`) — keep that behaviour; the query states are a second, inner layer of loading.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input on the dashboard (the add-assignment form is EP05C's and reuses the existing validation).
3. Not applicable — no data-access change; the dashboard adds no endpoint and sends no principal-scoped identifier.
4. Not applicable — no API error-contract change; the error surface shows the existing actionable copy.
5. Loading, empty and error states are implemented per section, with a retry on error and no blanking of the other sections.
6. Keyboard accessibility: the sections are labelled regions in a predictable order, every control is a native link/button with a visible focus ring, the "see all" links are operable, and the overdue marking does not rely on colour.
7. Responsive: the sections stack in one column at 375px with no horizontal scrolling and tap targets ≥ 44px.
8. Automated component tests pass (TR-E05-02, TR-E05-03, TR-E05-04, TR-E05-07).
9. Not applicable — no API change and no migration.
10. Integrated review — the combined EP05 parent review (all three children) plus EP05C's manual browser pass.
11. Reviewer walkthrough — the combined EP05 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** the dashboard page shows today's classes, upcoming deadlines, overdue assignments and today's study sessions, each with a limit, a "see all" link and its own loading/empty/error state.
- **Request/token estimate:** ~2–3 requests/tokens — four section components, the rebuilt page, the row/limit/link presentation, and the component tests. Uncertainty: moderate — four sections plus a page shell is the largest of the three children; it may run to the upper end.
- **Model recommendation:** 3 — several coordinated surfaces with accessibility and responsive obligations, but no new algorithms and no backend work; the derivation logic is already tested in EP05A.
- **Files:** `apps/web/src/features/dashboard/ui/TodayClassesSection.tsx` (new), `.../UpcomingDeadlinesSection.tsx` (new), `.../OverdueAssignmentsSection.tsx` (new), `.../TodayStudySessionsSection.tsx` (new), `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modify), `.../TodayClassesSection.test.tsx`, `.../UpcomingDeadlinesSection.test.tsx`, `.../OverdueAssignmentsSection.test.tsx`, `.../TodayStudySessionsSection.test.tsx`, `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` (new).
- **Start context:** this story; `docs/stories/EP05/README.md` (shared dashboard data contract + D05-2, D05-4, D05-9…D05-11); EP05A's implementation record (`./artifacts/EP05A/implementation.md`) for the exact selector and hook names; `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (the page being replaced); `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` and `CalendarEventDetails.tsx` (the row/icon/dialog precedents); `apps/web/src/features/assignments/ui/assignmentPresentation.ts` and `AssignmentRow.tsx` (the row precedents); `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (the page-shell precedent).
- **Verification:** `pnpm --filter web test -- src/features/dashboard src/pages/dashboard`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP05A implemented. Excludes the working "Add assignment" action and the empty-state copy (EP05C), the parent index (EP05C), any backend work (D05-3), a day picker (D05-4), and a study-stats surface (D05-11).

## UI/UX gaps for the `ui-refiner` (D05-12 — not yet settled)

These are deliberately undecided. The `ui-refiner` settles them with the user; this story is not ready to implement until they are recorded.

- **Section layout and information hierarchy:** which section leads (overdue first, or classes first?), the grid shape and ordering on desktop, and how the four sections stack at 375px (one column, in what order?).
- **How "today" is communicated:** the page heading, the date label (and its wording), whether the profile time zone is shown next to it, and what happens at midnight (the payload's `today` is the day at request time).
- **Section limits and their "see all" links:** confirm or replace the provisional limits (classes 5, deadlines 5, overdue 5, sessions 3 — D05-10), the link labels, their targets, and whether the truncated remainder is shown as text.
- **The two assignment lists' row form:** a compact dashboard row vs. the existing `AssignmentRow` reduced to props — which fields (title, course, due date, priority, subtask progress, status), the row order, and whether the two lists share one row component.
- **How overdue is marked without relying on colour alone:** the text label's wording and placement ("Overdue" in a `Badge`? prefix?), and the non-overdue urgency cue (the assignments page uses a "Due soon" amber badge — does the dashboard keep it?).
- **The study-sessions presentation:** the row form, the time range, how the focus flag reads ("Focus session"), whether a session row is interactive at all (it has no link), and the empty state's wording while no sessions exist.
- **Loading/error presentation:** the whole-page vs. per-section loading shape, the skeleton/spinner choice, the error card's copy and its retry action, and the page's live-region announcements.
- **The "open relevant details directly" affordances:** for an assignment row — the shared edit dialog or the course page; for a class row — the course page (the payload's `link`); for a session row — nothing, or the calendar.
- **The page heading and greeting:** whether the "Welcome back, {name}" line and the "View Profile" link stay, and where they sit relative to the sections.
- **Responsive behaviour at 375px:** stacking order, row wrapping, and whether a section's rows collapse into a denser form.
- **Keyboard behaviour and focus order:** the section order in the tab sequence, whether "see all" links sit at the start or the end of a section, focus visibility, and where focus lands after a retry.
- **Empty-state copy:** reserved for EP05C, but the section headings and the shape of each empty state are decided here — the two must agree.
