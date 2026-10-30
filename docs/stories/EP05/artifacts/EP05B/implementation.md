# EP05B — implementation record

**Child:** EP05B — Dashboard Sections: today's classes, upcoming deadlines, overdue assignments, today's study sessions (and the rebuilt dashboard page)
**Parent review unit:** EP05 (Student Dashboard, Jira STUDY-19)
**Story:** [docs/stories/EP05/EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md](../../EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md)
**Checkpoint:** [./checkpoint.md](./checkpoint.md) (kept for resume state; the completed behaviour and the evidence live here)
**Role:** implementer — implementation only. **This child is `implementation complete — awaiting parent review`; it does not carry its own approval.**
**Date:** 2026-10-30 (implementation) · **fix round:** 2026-10-30 — **F-EP05B-01**, the day line's construction (**PC-EP05-13**)
**Base commit:** `0e0ec0d` (branch `main`)
**Fix-round base commit:** `4022312` (the branch tip before the fix round — the round's own commit hash is returned in the handoff, not written here)

---

## 1. Acceptance criteria — outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| **AC 1** | The page frame, the day label and the section layout: the `max-w-5xl` / `px-4 sm:px-6 lg:px-8` shell; the `<h1>Dashboard</h1>`, the retained greeting, the day line and the action group; the day line built from the payload's `today`/`timeZone` — the payload's **civil date rendered verbatim** (``formatDate(new Date(`${today}T00:00:00Z`), 'UTC')``, the profile zone printed **beside** it as the raw IANA id and never applied to the date) — and absent while the calendar query has no payload; the action group's reserved quick-action slot + the "View Profile" link; the refresh control immediately after the day line; one page-level `role="status"` region announcing the loaded state and the four counts; the four sections in a `grid gap-6 lg:grid-cols-2` in urgency order; no placeholder leftovers. | **PASS** | `pages/dashboard/ui/DashboardPage.test.tsx` — the four `<h2>` headings in the order *Overdue assignments, Upcoming deadlines, Today's classes, Today's study sessions*; `Today, Oct 30, 2026 · America/New_York` from the payload's `today`/`timeZone`; **the two required zone-extreme cases** — `Today, Oct 30, 2026 · Pacific/Kiritimati` (UTC+14, never "Oct 31, 2026") and `Today, Oct 30, 2026 · Etc/GMT+12` (UTC−12, never "Oct 29, 2026") — which pin the **corrected construction** (the civil date formatted in `UTC`, the zone id as context only) at both ends of the offset range; **no** day line when the calendar query has no payload; exactly **one** `role="status"` region carrying `3 classes today · 1 overdue assignment · 5 upcoming deadlines · 1 study session`; the class contract (`max-w-5xl`, `px-4`, `sm:px-6`, `lg:px-8` on the shell; `grid`, `gap-6`, `lg:grid-cols-2` on the grid); the headings assert that no placeholder card survives ("Study Stats", "Quick Actions", "Recent Assignments", the placeholder's "Upcoming Deadlines" card) and that no "Hours Studied" / "Tasks Completed" / "No assignments yet" / "Create Study Plan" / "Start Focus Session" / "Add New Assignment" text is in the document. |
| **AC 2** | Today's classes: a labelled region whose rows are today's `CLASS` events with the time range, the title and the course name; the title is a native link to `event.link` and plain text without one; another day's class is never rendered; the payload's order is kept; the cap is 5 with `+N more`; the "See all" link points at `/calendar` with the accessible name "See all today's classes on the calendar". | **PASS** | `features/dashboard/ui/TodayClassesSection.test.tsx` (11 cases) — one row per class with `09:00 – 10:00` (and `09:00` for a point event), the title and the course name; another day's class is absent; the rows keep the payload order; the title is `<a href="/courses/c1">` and a link-less event renders plain text; 7 events → 5 rows + `+2 more`; the "See all" link's `href` and accessible name are asserted. |
| **AC 3** | The two assignment lists and the compact row: "Upcoming deadlines" lists the incomplete, not-overdue assignments in the endpoint's order with a null-`dueDate` row last and labelled "No due date"; "Overdue assignments" lists the incomplete, past-due ones, each marked with the **text** "Overdue"; both render the dashboard-local compact row (title button calling the host's `onOpenDetails(row)` once with the row it rendered and carrying `data-assignment-focus="edit:<id>"`, the course `code · name` or "No course", the due date and the subtask progress) with no status select, overflow menu, status badge, priority/type label, "Due soon" badge or subtask checklist; no dialog and no assignment owner mounted; both capped at 5 with `+N more`; the "See all" links point at `/assignments`. | **PASS** | `features/dashboard/ui/UpcomingDeadlinesSection.test.tsx` (13 cases) and `features/dashboard/ui/OverdueAssignmentsSection.test.tsx` (11 cases) — the title, the `MATH101 · Calculus` course line, `Due Dec 31, 2999`, "No due date" on the null-deadline row (and it stays last), a finished and an overdue row excluded from "upcoming", the endpoint order preserved, `1/2 subtasks` present only when the assignment has subtasks, 7 rows → 5 + `+2 more`, both "See all" links' `href` and accessible names, the compact row's absent status select / overflow menu / "Pending" / "Medium" / "Homework" / "Due soon", the "Overdue" text present twice for two overdue rows and absent for a row that is not overdue, the row's title calling `onOpenDetails` **once** with the exact row object, and no `role="dialog"` in the document after the activation. |
| **AC 4** | Today's study sessions: a labelled region whose rows are today's `STUDY_SESSION` events with their time range and title; a focus session carries the **text** "Focus session" and a non-focus session carries no focus label; another day's session is never rendered; a session row is not interactive (no link, no button); the cap is 3 with `+N more`; the "See all" link points at `/calendar`; the empty state renders until sessions exist. | **PASS** | `features/dashboard/ui/TodayStudySessionsSection.test.tsx` (10 cases) — the time range and the title, "Focus session" exactly once for the one focus session, another day's session absent, **no** link and **no** button inside the row list, 5 sessions → 3 rows + `+2 more`, the "See all" link's `href` and accessible name "See all today's study sessions on the calendar", and the empty state (the section's own icon + the supplied title) when there are no sessions. |
| **AC 5** | Per-section states, independence, responsiveness, keyboard and reduced motion: every section renders its own loading skeleton (`animate-pulse motion-reduce:animate-none` bars, `aria-busy`), its own empty state (the shared `EmptyState` with the section's icon and the content from the `emptyState` prop) and its own error state (`role="alert"`, the `getErrorMessage` text, a "Try again" button that refetches that query); the two queries fail independently; below `lg` the sections stack in one column, every row's interactive element is ≥ 44 px, the meta lines wrap; each section is a named region (`<section aria-labelledby>` + `<h2>`); the tab order is the DOM order; every control carries the EP10 `focus-ring` treatment; the overdue marking is text; no `animate-*` class lacks its `motion-reduce:animate-none` companion. | **PASS** | Per-section: the four section test files each assert the skeleton (`aria-busy="true"` on the section, bars carrying `animate-pulse` **and** `motion-reduce:animate-none`), the `role="alert"` error box with the message and a "Try again" button that calls the retry callback **once**, and the empty state with the section's own icon and the supplied title. Independence: `DashboardPage.test.tsx` — a failing assignments query produces **two** alerts (the two assignment sections) while the calendar sections still render their rows, and the failing calendar query is the mirror image. Responsiveness: the shell and grid class contract plus the row list's `max-sm:[&_button]:min-h-[44px] max-sm:[&_a]:min-h-[44px]`. Keyboard: the page test asserts the control order `refresh → profile → see-all → row …` (the DOM order) and that every control carries `focus-visible:ring-focus-ring` + `focus-visible:ring-offset-2`, and that the refresh control and a row title are operable by keyboard alone (focus + `Enter`). Named regions: the page test asserts the five `aria-labelledby` values in order. Reduced motion: the page test asserts that **no** element carrying an `animate-*` class lacks `motion-reduce:animate-none` (the skeletons and the shared Button's spinner both carry it). |

### Shared DoD items that apply to this child

| DoD | Outcome |
|---|---|
| **1 — functional acceptance criteria** | Met (the five ACs above). |
| **5 — loading, empty and error states** | Met for this child's half: each of the four sections renders its own skeleton, empty state and error state with a retry, and the two queries fail independently (asserted in the page test). The empty states' **copy** is EP05C's (Decisions #14) — the shape is this child's. |
| **6 — keyboard accessibility** | Met: the sections are named regions with `<h2>` headings in a predictable order, every control is a native link/button with the EP10 focus-ring treatment, the "See all" links are operable, the overdue marking is text, and the page has exactly one `role="status"` region. |
| **7 — responsive layouts** | Met: the `max-w-5xl` shell, the one-column-below-`lg` grid, the ≥ 44 px row tap targets and the wrapping meta lines (class-contract assertions — jsdom cannot measure layout). |
| **8 — automated tests (TR-E05-02…04, TR-E05-07)** | Met — **60 new test cases** across five new test files (45 section cases + 15 page cases). |
| **3 / 4 — data scoping / actionable errors** | Not weakened. The dashboard issues **no** request of its own: it calls EP05A's `useAssignmentsQuery()` (no parameters) and `useCalendarEventsQuery({ from, to })` — the DTO's two whitelisted civil dates — so no `userId`/`courseId`/`assignmentId`/`tz` is ever sent. The error copy path is the shared `getErrorMessage` over the RTK Query `{ message, code }` shape, and every section renders it with a "Try again" action that refetches **that** query. The **combined EP05 review must check** both (DoD map rows 3 and 4). |

---

## 2. What was built

### 2.1 `apps/web/src/features/dashboard/ui/dashboardSection.ts` (new — the shared vocabulary)

The shared module the four sections, the page and EP05C's empty-state content all speak (Decisions #1, #3, #5, #7, #8, #14):

- `DashboardSectionStatus` — `'loading' | 'ready' | 'error'`;
- `DashboardEmptyState` — `{ title, description?, action? }` (the empty-state content is a **prop**, so EP05C replaces the copy without touching a section);
- `DashboardSectionBaseProps` — `status`, `error?`, `isFetching?`, `onRetry`, `emptyState?`;
- `DashboardAssignmentSectionProps` — the base props plus `rows`, `timeZone` and the D05-17 `onOpenDetails(row)` callback;
- the four limits (5 / 5 / 5 / 3 — D05-10, confirmed);
- the two shared row helpers: `eventTimeRange(startTime, endTime)` → `09:00 – 10:00` (or `09:00`) and `dueDateLabel(dueDate, timeZone)` → `Due Oct 30, 2026` / `No due date`.

It is a `.ts` module on purpose — it is vocabulary, not markup.

### 2.2 The four section components (new)

`TodayClassesSection.tsx`, `UpcomingDeadlinesSection.tsx`, `OverdueAssignmentsSection.tsx`, `TodayStudySessionsSection.tsx`. Each owns its heading (with the section's decorative icon), its rows, its limit, its "See all" link and its three states, and **applies its own EP05A selector and limit to the data it is given** — the sections receive the raw payload plus the server-echoed `today`, never a pre-derived list. The order is the endpoint's (no client-side re-sort — D05-9).

### 2.3 `apps/web/src/features/dashboard/ui/DashboardAssignmentRow.tsx` (new — the compact row)

The dashboard-local compact row (D05-18). **No EP03 shared component was modified**: the shared `AssignmentRow` has no summary variant and every prop is required, so reusing it would have forced an unscoped edit to a component the assignments page and the course page also consume. The row renders three lines — the title button (calling `onOpenDetails(row)` once, with `data-assignment-focus="edit:<id>"`), the course (`code · name` or "No course") and the due date with the subtask progress — plus the shared text badge `<Badge variant="danger">{OVERDUE_LABEL}</Badge>` on the title line. It mounts **no** dialog and **no** assignment owner (D05-17).

### 2.4 `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (rebuilt)

The placeholder is **replaced**, not extended (D05-11, final): the "Quick Actions" card, the "Recent Assignments" card, the "Study Stats" card and the static "Upcoming Deadlines" card are gone, and **no** study-stats surface is rebuilt in any form. The page owns the request window (**state**, `useState(() => dashboardTodayRange())` — never a `useMemo` over `new Date()`), the day line, the refresh control, the single page-level `role="status"` region, the section order and the reserved quick-action slot. Its root `<section>` is where EP05C attaches `actions.sectionRef`.

---

## 3. Changed paths

**New (12):**

- `apps/web/src/features/dashboard/ui/dashboardSection.ts`
- `apps/web/src/features/dashboard/ui/TodayClassesSection.tsx`
- `apps/web/src/features/dashboard/ui/UpcomingDeadlinesSection.tsx`
- `apps/web/src/features/dashboard/ui/OverdueAssignmentsSection.tsx`
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.tsx`
- `apps/web/src/features/dashboard/ui/DashboardAssignmentRow.tsx`
- `apps/web/src/features/dashboard/ui/TodayClassesSection.test.tsx`
- `apps/web/src/features/dashboard/ui/UpcomingDeadlinesSection.test.tsx`
- `apps/web/src/features/dashboard/ui/OverdueAssignmentsSection.test.tsx`
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.test.tsx`
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx`
- `docs/stories/EP05/artifacts/EP05B/checkpoint.md` + `implementation.md`

**Modified (3):**

- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` — the placeholder rebuilt
- `docs/stories/EP05/README.md` — narrow execution-status fields only (Active substory / Next substory / the EP05B queue row)
- `docs/stories/EP05/EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md` — the `Status` line and the artifact pointers only

**Not touched:** `apps/api/**` (including the other contributor's dirty `apps/api/tsconfig.json`), `apps/web/src/features/assignments/ui/**` (EP03's shared components — D05-18), `apps/web/src/features/calendar/ui/**`, `apps/web/src/pages/calendar/**`, `apps/web/src/pages/assignments/**`, `apps/web/src/features/dashboard/model/**` (EP05A's, already implemented and tested), `apps/web/src/test/providers.tsx`, `docs/stories/EP05/EP05C*`, `docs/stories/EP05/plan-review.md`, the `## Autopilot` section of the EP05 README and every planning-owned section of it (ACs, decisions, dependency register, correction log, quality gates).

**Fix round — F-EP05B-01 (2026-10-30, PC-EP05-13) — changed paths (6):**

- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modified — the day line's **construction**: the payload's civil date is now formatted in `UTC`; the zone id is printed beside it as context only)
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` (modified — the **two required zone-extreme cases**; the calendar payload's `timeZone` is now overridable per test)
- `docs/stories/EP05/artifacts/EP05B/implementation.md` (modified — this record)
- `docs/stories/EP05/artifacts/EP05B/checkpoint.md` (modified — the fix round as a milestone)
- `docs/stories/EP05/README.md` (modified — the narrow execution-status fields only: `Active substory`, `Next substory`, the EP05B queue row)
- `docs/stories/EP05/EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md` (modified — the `Status` line only)

**Not touched in the fix round:** the day line's **content** (the wording `Today, <date> · <raw IANA zone id>`, the raw zone id as context only, the line's absence while the calendar query has no payload), the section order, the limits, the quick-action slot, the live region, the `emptyState` prop contract, the `onOpenDetails` prop, the `data-assignment-focus` attributes, the row form, the error/empty/loading states, `apps/web/src/features/dashboard/ui/**`, `apps/web/src/features/dashboard/model/**`, `apps/web/src/features/assignments/ui/**`, `apps/web/src/pages/calendar/**`, `apps/web/src/pages/assignments/**` and **`apps/web/src/features/calendar/ui/CalendarEventDetails.tsx`** (EP04's reviewed surface — see the note in §5).

---

## 4. Verification

All commands were run from the repository root `/Users/michaelrobert/Desktop/focus-app` (the `pnpm --filter web …` commands execute in `apps/web`). The tested state is the working tree described in §3 **before** this child's commit — the commit's own hash is returned in the handoff rather than written into this record.

| # | Command | Result |
|---|---|---|
| V1 | `pnpm --filter web test -- src/features/dashboard/ui/TodayClassesSection.test.tsx src/features/dashboard/ui/TodayStudySessionsSection.test.tsx` (milestone 1) | **PASS** — 2 files, **21 tests** passed. |
| V2 | `pnpm --filter web test -- src/features/dashboard/ui/UpcomingDeadlinesSection.test.tsx src/features/dashboard/ui/OverdueAssignmentsSection.test.tsx` (milestone 2) | **PASS** — 2 files, **24 tests** passed. |
| V3 | `pnpm --filter web test -- src/pages/dashboard` (milestone 3) | **PASS** — 1 file, **15 tests** passed. |
| V4 | `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` (the story's required command) | **PASS** — 7 files, **84 tests** passed (EP05A's two model suites + this child's five). |
| V5 | `pnpm --filter web typecheck` | **PASS** — `tsc --noEmit`, no output, exit 0. |
| V6 | `pnpm --filter web lint` | **PASS** — `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, no output, exit 0 (this includes the repo's Prettier rule; the new files were formatted with the shared config). |
| V7 | `pnpm --filter web test` (the **full** web suite) | **PASS** — 76 files / **936 tests** passed, 0 failed. The known courses flake (F-EP05A-03, `apps/web/src/features/courses/ui/CourseForm.test.tsx`) **did not reproduce** in this run; it is intermittent (EP05A recorded it failing in 2 of 3 runs at the pristine `b7728c8`) and it is outside EP05's scope — it was **not** chased and **not** "fixed" here. |

### 4.1 Fix round — F-EP05B-01 (2026-10-30, PC-EP05-13)

All commands were run from the repository root `/Users/michaelrobert/Desktop/focus-app` (the `pnpm --filter web …` commands execute in `apps/web`). The tested state is the working tree of this fix round **before** this round's commit — the commit's own hash is returned in the handoff rather than written into this record.

| # | Command | Result |
|---|---|---|
| **F-V1** | `pnpm --filter web test -- src/pages/dashboard` | **PASS** — 1 file, **17 tests** passed (the page's 15 cases + the **two new zone-extreme cases**). |
| **F-V2** | `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` | **PASS** — 7 files, **86 tests** passed (EP05A's two model suites + this child's five; 84 before this round + the 2 new cases). |
| **F-V3** | `pnpm --filter web typecheck` | **PASS** — `tsc --noEmit`, no output, exit 0. |
| **F-V4** | `pnpm --filter web lint` | **PASS** — `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, no output, exit 0 (it includes the repo's Prettier rule; the two touched files are Prettier-clean — confirmed separately with `pnpm --filter web format`, "All matched files use Prettier code style!"). |
| **F-V5** | `pnpm --filter web test` (the **full** web suite) | **PASS** — 76 files / **938 tests** passed, 0 failed (936 before this round + the 2 new cases). The known courses flake (F-EP05A-03) did not reproduce; it is out of EP05's scope and was neither chased nor fixed. |
| **F-V6** | **Regression-guard check** (the two new cases against the superseded constructions) | **PASS (as guards)** — with the noon-UTC construction restored temporarily (`formatDate(new Date(`${today}T12:00:00Z`), calendar.timeZone)`), the **UTC+14** case failed ("Unable to find an element with the text: Today, Oct 30, 2026 · Pacific/Kiritimati" — that zone rendered "Oct 31, 2026"); with a midnight-UTC construction restored temporarily (`formatDate(new Date(`${today}T00:00:00Z`), calendar.timeZone)`), the **UTC−12** case failed ("Today, Oct 30, 2026 · Etc/GMT+12" not found — that zone rendered "Oct 29, 2026"). Both temporary edits were reverted; the corrected construction is the committed state. |

**The tested commit:** the working tree of this fix round on top of the base commit `4022312` (the branch tip before the round). The round's own commit hash is returned in the handoff.

---

## 5. Findings and deviations

### Findings

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| **F-EP05B-01** | EP05B → Decisions #2 — the day line is built with `formatDate(new Date(`${today}T12:00:00Z`), timeZone)` (the EP04 F3 noon-UTC construction). **Corrected in the plan by PC-EP05-13 (2026-10-30):** the payload's **civil date is rendered verbatim** — ``formatDate(new Date(`${today}T00:00:00Z`), 'UTC')`` — with the profile zone printed **beside** it as the raw IANA id (context only, never applied to the date). | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx`, `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` | The noon-UTC construction is correct for offsets in (−12, +12) but **shifts the displayed civil date for every zone at UTC+12 or later**: with the profile zone `Pacific/Kiritimati` (UTC+14), `today = 2026-10-30` renders as **"Today, Oct 31, 2026"** (noon UTC is already the next day there). The same applies to `Pacific/Fiji`, `Pacific/Nauru`, `Pacific/Tarawa`, `Pacific/Apia`, `Pacific/Tongatapu` and `Pacific/Auckland` (UTC+12/+13). A midnight-UTC construction fails at the opposite end (`Oct 29, 2026` for `America/New_York` and `Etc/GMT+12`), so **no single UTC-anchored instant is correct in every zone** — only rendering the civil date as-is is. | **Closed — fixed in the implementer fix round (2026-10-30, PC-EP05-13).** The corrected construction is applied in `DashboardPage.tsx` (the civil date is formatted in `UTC`; the zone id is printed beside it as context only) and the **two required zone-extreme cases** are in `DashboardPage.test.tsx`. **This is not a self-approval:** PC-EP05-13 records the fix round as the implementer half of the correction's independent verification; the **combined EP05 parent review** is the verification that closes it, and the plan-review gate stays **passed** (the correction is a construction detail inside the accepted contract, D05-6). The **day line's content** (wording, raw zone id, absence while the calendar query has no payload) is unchanged. | implementer (the fix round); the independent verification is the combined EP05 parent review | **The corrected construction** — `DashboardPage.tsx:138`: `` `Today, ${formatDate(new Date(`${calendar.today}T00:00:00Z`), 'UTC')} · ${calendar.timeZone}` ``, with the surrounding comment explaining why the civil date is formatted in `UTC` and never re-anchored to an instant. **The two new tests** (in `DashboardPage.test.tsx`): *"renders the payload’s civil date verbatim at the UTC+14 extreme (Pacific/Kiritimati)"* (asserts `Today, Oct 30, 2026 · Pacific/Kiritimati` and that no "Oct 31, 2026" is rendered) and *"renders the payload’s civil date verbatim at the UTC-12 extreme (Etc/GMT+12)"* (asserts `Today, Oct 30, 2026 · Etc/GMT+12` and that no "Oct 29, 2026" is rendered). **Commands and results** (from the repository root, on the working tree of this round over the base commit `4022312`): `pnpm --filter web test -- src/pages/dashboard` → **PASS**, 1 file / 17 tests; `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → **PASS**, 7 files / 86 tests; `pnpm --filter web typecheck` → **PASS** (exit 0); `pnpm --filter web lint` → **PASS** (exit 0); `pnpm --filter web test` (full suite) → **PASS**, 76 files / 938 tests. **Guard check:** each new case was temporarily re-run against the superseded noon-UTC construction and against a midnight-UTC construction and **failed** as intended (F-V6 in §4.1), so both are real regression guards. **The tested commit** is the working tree of this round on `4022312`; the round's own commit hash is returned in the handoff. |
| **F-EP05B-02** | AC-E05-05's "open relevant details" half — the row's affordance calls the page-level `onOpenDetails(row)` (D05-17) | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` | The page's `onOpenDetails` default is a documented **no-op** (EP05B mounts no assignment owner), so between EP05B and EP05C an assignment row's title button is focusable and operable but opens nothing. This is a **second** accepted inter-commit transient; the EP05 README records only the missing "Add assignment" action ("One accepted inter-commit transient"). | **Closed — by EP05C's wiring (2026-10-30).** EP05C mounted the shared assignment owner on the page (one `useAssignmentActions` + one `AssignmentDialogs`, D05-17) and the page's `onOpenDetails` default is now **`actions.openEdit(row)`** instead of the no-op — so the affordance is live in the product, not only in a test. **No section component was touched.** The inter-commit transient is therefore closed; it was never a release state. | implementer (EP05C); the combined EP05 parent review verifies it | `DashboardPage.test.tsx` (EP05C's block) — "mounts the shared owner exactly once and opens the same single dialog from a row" activates a row's title and asserts exactly **one** `[role="dialog"]` named "Edit assignment"; the DoD-10 browser pass, observation 8 (a row title opens the same single shared edit dialog). EP05C's own record: [`./../EP05C/implementation.md`](./../EP05C/implementation.md) §5. |
| **F-EP05B-03** | Decision #7 — each section renders its own error state | `apps/web/src/features/dashboard/ui/*.tsx` | A **background** refetch that fails (the query already has data) makes RTK Query report `isError`, so the section replaces its rows with the error box. The already-loaded rows are not shown alongside the error. | **Closed — implemented deliberately, no change.** The alternative (rows + an error banner) is not one of the section's three settled states and would add a state the `ui-refiner` did not decide. The chosen behaviour never shows stale data as if it were fresh, and the error box carries the actionable message and a "Try again" action. Recorded so the reviewer sees the choice. | implementer | `DashboardPage.test.tsx` — the partial-failure cases assert the two error boxes and that the other query's sections still render their rows. |
| **F-EP05B-04** | Decision #11 — the live region announces the loaded state and the four counts | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` | The counts come from the payload, so when one query has **failed** its pair of counts reads `0` (the failed query has no payload) while its two sections show the error. The live region therefore does not announce the failure. | **Closed — implemented as settled, recorded.** The live region's content is fixed by Decision #11 ("Loading your dashboard…" then the count summary) and the sections' `role="alert"` boxes carry the failure. No second live region is added (that is EP05C's rule). | implementer | `DashboardPage.test.tsx` — the partial-failure cases assert the two `role="alert"` boxes and the still-rendered rows of the other pair. |

**Findings/deviations summary:** 4 findings — **4 closed** (**F-EP05B-01** closed by the 2026-10-30 implementer fix round, **PC-EP05-13**; F-EP05B-03 and F-EP05B-04 closed as implemented deliberately, no code change; **F-EP05B-02** closed by EP05C's wiring of the shared owner — 2026-10-30, the row's own row above). The closure of F-EP05B-01 is an **implementation** closure; its independent verification is the combined EP05 parent review, which the implementer does not perform. The same applies to F-EP05B-02's closure: it is the **implementation's** closure of a bounded inter-commit transient, and the combined EP05 parent review verifies it.

**Cross-epic observation — NOT an EP05 finding, and NOT changed here.** `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx:89` carries the **same** noon-UTC construction for an **event's** civil date (`formatDate(new Date(`${date}T12:00:00Z`), timeZone)`), so it has the same exposure at UTC+12 and later. It is **EP04's reviewed surface**, not EP05's (D05-3, D05-16; PC-EP05-13's cross-epic note; the planner flagged it for the EP04 owner). **This fix round did not touch that file**, and the combined EP05 review **must not absorb it** as an EP05 finding. It is recorded here only so the observation is not lost.

### Deviations from the story's file list / plan text

| ID | Deviation | Why | Impact |
|---|---|---|---|
| **D-1** | The reserved quick-action slot is rendered as an **empty** element carrying `data-assignment-focus="add"` (`<div data-assignment-focus="add" />`), not as a rendered control. | The slot must exist before EP05C lands (AC #1: "the reserved quick-action slot … an empty slot until EP05C lands"), and the page must carry **exactly one** `data-assignment-focus="add"` element afterwards. Nesting EP05C's Button **inside** the slot would give the page two elements with that attribute; therefore EP05C **replaces** the element. The exact shape is written into the EP05C handoff below. | No behaviour: the element carries no text, no role and no focusability. EP05C replaces it with the shared `Button` that carries the same attribute (its own AC #1). The page test asserts exactly one `[data-assignment-focus="add"]` and zero `[data-assignment-focus="empty-add"]`. |
| **D-2** | The four sections render their own loading skeleton, error box and empty state (the settled "each section renders its own three states"), so ~12 lines of state markup are repeated per section rather than shared. | The shared module `dashboardSection.ts` is fixed by the story as a **`.ts`** module (vocabulary, no JSX), and the story's file list names no shared-states component. The shared *vocabulary* (the status type, the base props, the limits, the two row helpers) lives in the shared module; the shared *primitives* (`Card`, `Badge`, `EmptyState`, `Button`) come from `shared/ui/`. | Presentation only. Each section's states are covered by its own test file; the page test covers the cross-section behaviour. |
| **D-3** | The page computes the four derived sets itself (with the same pure EP05A selectors) **in addition to** the sections computing their own. | AC #1 requires the live region to announce the **uncapped** counts, while each section must apply "its own EP05A selector and limit to the data it is given". The selectors are pure and filter-only, so both derivations agree by construction and neither re-sorts. | No behaviour; the counts can never disagree with the sections' rows. |

---

## 6. Implementation notes (the story's list, answered)

- **The request window is state.** `useState(() => dashboardTodayRange())` — the lazy initializer runs once, so the window is stable across renders (a `useMemo` over `new Date()` would change the calendar query's argument identity on every render and refetch endlessly). The refresh control replaces it.
- **The refresh control never issues a stale second request.** It recomputes the window: when it differs, `setRange(next)` makes the calendar query refetch through its argument change; when it is identical, the handler calls `calendarQuery.refetch()` directly. Either way the assignments query is refetched. The page test asserts that one refresh produces exactly **one** new `/assignments` request and **one** new `/calendar/events` request, the latter carrying the recomputed window.
- **No client-side profile-zone arithmetic.** The client never computes the profile zone's civil date: the day line and every selection use the payload's `today`, and every due date is displayed in the payload's `timeZone`. The browser zone appears only as the degraded fallback when the calendar query has no payload (assumption A7) — recorded, not hidden.
- **The day line renders the civil date verbatim (fix round, PC-EP05-13).** The payload's `today` is a **civil date**, so it is formatted in `UTC` (`formatDate(new Date(`${today}T00:00:00Z`), 'UTC')`) and the profile zone is printed **beside** it as the raw IANA id — context only, never applied to the date. The civil date is **not** re-anchored to an instant: a noon-UTC instant re-rendered in the profile zone shifts the displayed date at UTC+12 and later, a midnight-UTC instant at UTC−12 and earlier, so no single UTC-anchored instant is correct in every zone. The client still performs **no** profile-zone arithmetic and the server still owns the date (D05-6, D404-2).
- **The day line is absent while the calendar query has no payload** (loading or error); the refresh control stays, so a student can retry a failed calendar read.
- **One live region.** Exactly one `role="status"` on the page; the sections have none (the shared `EmptyState` renders no live region, and the error boxes are `role="alert"`). The region carries the count summary in the assignments page's count-header style.
- **The course colour is not used** (Decision #13): the course name (class rows) and the course code + name (assignment rows) are the identifying cues.
- **No motion is introduced.** The only animations are the section skeletons' `animate-pulse` and the shared `Button`'s busy spinner — both carry `motion-reduce:animate-none`. The retained auth spinner keeps its own. The page test asserts the general property (no `animate-*` without the companion).
- **The "View Profile" control** keeps the house pattern (a shared `Button` inside a `Link`, as in `AssignmentsPage.tsx:556`), so it is one visible control; the page test's control-order helper de-duplicates the nested button.
- **The mocking trap.** The RTK Query slices call `shared/api/httpClient` directly, so mocking the entity clients would not intercept the dashboard's GETs. The page test intercepts at the **axios-adapter** level (`httpClient.defaults.adapter`), EP05A's slice-test precedent; the adapter is restored after every test.

---

## 7. Commit scope

One scoped commit for this child:

- `apps/web/src/features/dashboard/ui/dashboardSection.ts` (new)
- `apps/web/src/features/dashboard/ui/TodayClassesSection.tsx` (new)
- `apps/web/src/features/dashboard/ui/UpcomingDeadlinesSection.tsx` (new)
- `apps/web/src/features/dashboard/ui/OverdueAssignmentsSection.tsx` (new)
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.tsx` (new)
- `apps/web/src/features/dashboard/ui/DashboardAssignmentRow.tsx` (new)
- `apps/web/src/features/dashboard/ui/TodayClassesSection.test.tsx` (new)
- `apps/web/src/features/dashboard/ui/UpcomingDeadlinesSection.test.tsx` (new)
- `apps/web/src/features/dashboard/ui/OverdueAssignmentsSection.test.tsx` (new)
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.test.tsx` (new)
- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modified — rebuilt)
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` (new)
- `docs/stories/EP05/artifacts/EP05B/checkpoint.md` + `implementation.md` (new)
- `docs/stories/EP05/README.md` (modified — narrow execution-status fields only)
- `docs/stories/EP05/EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md` (modified — the `Status` line and the artifact pointers only)

**Explicitly excluded from the commit:** `apps/api/tsconfig.json` (another contributor's unrelated modification — left modified, unstaged and uncommitted) and every planning-owned section of `docs/stories/EP05/README.md` (including its `## Autopilot` run record).

### 7.1 Fix round — F-EP05B-01 (2026-10-30, PC-EP05-13) — commit scope

One scoped commit for this fix round:

- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modified — the day line's construction)
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` (modified — the two required zone-extreme cases)
- `docs/stories/EP05/artifacts/EP05B/implementation.md` (modified — the F-EP05B-01 closure)
- `docs/stories/EP05/artifacts/EP05B/checkpoint.md` (modified — the fix round as a milestone)
- `docs/stories/EP05/README.md` (modified — the narrow execution-status fields only)
- `docs/stories/EP05/EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md` (modified — the `Status` line only)

**Explicitly excluded from this round's commit:** `apps/api/tsconfig.json` (the other contributor's unrelated modification — left modified, unstaged and uncommitted), the README's planning content (the decision register, the decision log, the invariants table, the shared contract, the quality gate, the `**Status:**` line) and the README's `## Autopilot` section (the coordinator's run record).

---

## 8. EP05C handoff — the seams this child left

EP05C implements next. It must **not** change a section's shape, its row form or its data contract (D05-12). Everything it needs is below.

### 8.1 The row → host callback (D05-17)

- The two assignment sections take **`onOpenDetails: (row: AssignmentListItem) => void`** as a prop (declared once in `dashboardSection.ts` as `DashboardAssignmentSectionProps.onOpenDetails`).
- `DashboardAssignmentRow` calls it **exactly once**, with the row object it rendered, from the title button (which also carries `data-assignment-focus="edit:<id>"`). The row mounts **no** dialog and **no** assignment owner.
- The page owns the callback. It is exposed as an **optional prop** on the page:

  ```tsx
  export interface DashboardPageProps {
    onOpenDetails?: (row: AssignmentListItem) => void;
  }
  ```

  The default is a documented no-op (`const noop = () => undefined;`). **EP05C replaces the default with the shared owner's `actions.openEdit(row)`** — e.g. `const openDetails = onOpenDetails ?? ((row) => actions.openEdit(row));` — **without touching a section component**. (If EP05C prefers, it can also drop the prop and wire the callback internally; the sections do not care either way.)

### 8.2 The empty-state content is a prop (Decisions #14)

- Each section takes `emptyState?: { title: string; description?: string; action?: ReactNode }` and renders the shared `EmptyState` with **the section's own icon** and that content. No section hard-codes its empty-state copy; the shared fallback title (`EMPTY_STATE_FALLBACK_TITLE` in `dashboardSection.ts`) is used only when a host supplies no content at all.
- EP05B's page passes **provisional** titles: `'Nothing overdue'`, `'No upcoming deadlines'`, `'No classes today'`, `'No study sessions today'`.
- **EP05C replaces the content through the same prop** (title, description and the action) — it changes no section component.

### 8.3 The quick-action slot (D05-12 → Decisions #12; EP05C's Decisions #1–#5, #11)

- The page's action group renders **exactly one** element carrying `data-assignment-focus="add"` — currently an **empty** `<div data-assignment-focus="add" />` (deviation **D-1** above). It is the **first** control of the group, before "View Profile".
- **EP05C replaces that element** with its "Add assignment" `Button` (which carries the same attribute) — it must **not** nest a second control inside the slot, or the page would carry two `[data-assignment-focus="add"]` elements.
- The page renders **zero** `[data-assignment-focus="empty-add"]` controls (the shared hook falls back to the `add` control — `useAssignmentActions.ts:244-250`).
- The action group's DOM position, the day line and the refresh control are fixed — EP05C may add `flex-wrap` to the group (it already wraps).

### 8.4 The live region and the root `<section>`

- The page has **exactly one** `role="status"` region, between the header and the section grid, styled like the assignments page's count header (`text-xs font-medium uppercase tracking-wider text-text-muted`). It currently carries the count summary (`3 classes today · 1 overdue assignment · 5 upcoming deadlines · 1 study session` — the uncapped totals).
- **EP05C prepends its action sentence** to that region (separated by " · ") and clears it when the form opens, so a repeated create announces again. **EP05C adds no second live region and no toast for the success.**
- The page's **root `<section>`** (`aria-labelledby="dashboard-heading"`) is where EP05C attaches `actions.sectionRef` — the header, and therefore the "Add assignment" control, is inside it.

### 8.5 The EP05A API surface EP05C uses

- `useAssignmentsQuery()` — **no argument**; returns `AssignmentListItem[]` unchanged. Its `refetch()` is the cache hand-off after a create (the slice defines no tags).
- `useCalendarEventsQuery({ from, to })` — the window is the page's state.
- The pure selectors `selectTodayClasses`, `selectTodayStudySessions`, `selectUpcomingAssignments`, `selectOverdueAssignments` and `limitRows` — unchanged and already used by this child.
- The query states each section reads: `isLoading`, `isFetching`, `isError`, `data`, `error`, `refetch` — independently per query.

### 8.6 What EP05C must **not** change

The sections' shapes, the row forms, the data contract, the section order, the day line, the refresh control and the live region's structure are settled (D05-12). The only section-facing change EP05C may make is the **empty-state content**, through the `emptyState` prop.

**The day line is now FINAL — EP05C must not touch it.** The 2026-10-30 fix round (**F-EP05B-01**, **PC-EP05-13**) applied the corrected construction: the payload's civil date is rendered **verbatim** (``formatDate(new Date(`${today}T00:00:00Z`), 'UTC')``) and the profile zone is printed **beside** it as the raw IANA id, as context only. The day line's **content** is unchanged from the settled decision — the wording `Today, <date> · <raw IANA zone id>`, the raw zone id, and the line's absence while the calendar query has no payload. **EP05C must not change the day line's construction, its wording, its zone id or its absence rule**, and must not re-introduce a zone conversion of the payload's civil date. If EP05C edits `DashboardPage.tsx` (it must — the quick action, the empty states and the shared-owner mount live there), the day line's expression and the `calendar` guard around it must stay exactly as they are.

---

## 9. What this child does not provide

The working "Add assignment" action, the empty-state copy, the shared-owner mount, the assignment dialogs, the EP05 parent index (`./artifacts/EP05/implementation.md`) and the reviewer's `review.md` / `walkthrough.md` are **EP05C's / the reviewer's** — they are not in this record.
