# EP05 — Student Dashboard: user walkthrough

**What this is:** the finished result of the **EP05** parent review unit (Jira STUDY-19) — the student's home dashboard, built by three children ([EP05A](../../EP05A-dashboard-data-layer-rtk-query-slices.md) the data layer, [EP05B](../../EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md) the four sections and the page, [EP05C](../../EP05C-quick-actions-empty-states-and-parent-index.md) the quick action, the empty states and the shared-owner mount).

**Reviewed state:** branch `main`, HEAD `fdc3dce` (the EP05 closeout commit; the application-code scope ends at `f93a4c4`, EP05C's implementation commit). The working tree's only dirty path is `apps/api/tsconfig.json` — another contributor's unrelated modification, untouched by EP05 and by this review.

**Final review:** [./review.md](./review.md) — the combined EP05 parent implementation review, verdict **PASS** (2026-10-30).
**Implementation evidence:** [./implementation.md](./implementation.md) — the EP05 parent implementation index (combined change scope, the AC/TR/DoD → evidence map, the verification evidence and the **executed** DoD-10 manual browser pass).

---

## 1. What changed

The `/dashboard` route used to be a static placeholder: a welcome line, a "Quick Actions" card whose three buttons did nothing, a "Recent Assignments" card hard-coded to "No assignments yet", a "Study Stats" card hard-coded to zeros, and a static "Upcoming Deadlines" card. **EP05 replaces it** with a real dashboard that reads the student's own data.

### The user-visible workflows that now work

1. **One screen that answers "what needs me today?"** — four sections in urgency order:
   - **Overdue assignments** — unfinished assignments whose due date has passed, each marked with the **text** badge "Overdue" (readable without colour).
   - **Upcoming deadlines** — the incomplete assignments that are *not* yet overdue, in the server's own order (deadline ascending, no-deadline work last and labelled "No due date").
   - **Today's classes** — today's class events with their time range, title and course; a class title links to its course.
   - **Today's study sessions** — today's study sessions, a focus session badged "Focus session". (EP05 **displays** sessions; creating them is EP06/EP07's job.)
   Each section caps itself (5 / 5 / 5 / 3) and shows "**+N more**" plus a "**See all**" link to the full list (`/assignments` or `/calendar`). EP05 adds no new route.

2. **"Add assignment" actually works.** The header's **Add assignment** button opens the shared, already-existing assignment form (with the student's own courses in the select), and a successful create closes the dialog, refreshes the dashboard without a reload, moves focus back to the button and announces "Assignment added." to screen readers. A failed create leaves the form **open with the student's text intact** and shows the shared, actionable message — the dashboard adds no error surface of its own.

3. **"Open relevant details" works.** Clicking an assignment's title opens the **same single** shared edit dialog. The dashboard mounts the shared assignment owner exactly **once**, so there is never a second dialog, a second focus owner or an ambiguous focus target.

4. **Every state is handled.** Each section renders its own loading skeleton, its own empty state and its own error state with a "Try again" action; the two data sources fail independently (a broken calendar never blanks the assignment sections); and each empty state says what to do next ("Add an assignment", "View your week", "Open the calendar").

5. **The day line tells the truth.** The header shows `Today, <date> · <your time zone>` using the **server's** civil date for the student's profile zone — never a browser-computed date and never a date shifted by a time-zone conversion.

### Deliberately **not** shipped (decisions, not gaps)

- **No "Study Stats" card** — "Hours Studied" has no endpoint until EP07's seam; "Tasks Completed" is deliberately not re-added (D05-11, final). The page test asserts no study-stats figure survives.
- **No "Create Study Plan" / "Start Focus Session" buttons** — those surfaces belong to EP06/EP07 (D05-5).
- **No dashboard e2e spec in the repo** — the browser suite's scope is EP09's decision (D05-14); EP05's DoD-10 evidence is the **executed** manual browser pass recorded in the parent index §5.

---

## 2. How the code works

### The request/response flow

```
DashboardPage (pages/dashboard/ui/DashboardPage.tsx)
  ├─ useAssignmentsQuery()          → GET /assignments          (no query parameters at all)
  ├─ useCalendarEventsQuery(range)  → GET /calendar/events?from&to
  ├─ listCourses()                  → GET /courses              (the create dialog's course select)
  └─ pure selectors (features/dashboard/model/dashboardSelectors.ts)
       └─ the four sections + the live region's counts
```

- **The two data slices** (`features/assignments/api/assignmentsApi.ts`, `features/calendar/api/calendarApi.ts`) are separate RTK Query APIs, one per domain, both registered in `app/store/store.ts`. Both go through the shared axios transport (`shared/api/rtkBaseQuery.ts`) so the app's bearer-token/refresh chain stays the single transport. The payloads are returned **unchanged** — no field is reshaped.
- **The request window** is `dashboardTodayRange()` (`features/dashboard/model/dashboardRange.ts`): the browser-local civil date **± 2 days** (5 days inclusive). It is held as page **state** (not a `useMemo` over `new Date()`), so it cannot refetch on every render; the refresh control recomputes it.
- **The selection key** is the **server-echoed `result.today`** (`selectTodayEvents`, `dashboardRange.ts:111-113`). Every calendar-derived section selects `event.date === result.today`.
- **The assignment split** uses the shared predicates and nothing else: `isUnfinishedAssignment` ∧ `isOverdueAssignment` for the overdue list, `isUnfinishedAssignment` ∧ ¬overdue for the upcoming list (`entities/assignment/model/status.ts` is the single source of truth). The selectors **filter only** — the endpoint's documented order (`dueDate asc`, nulls last, then `title asc`, `id asc`) is preserved, so the dashboard can never drift from the server's contract.

### The "today" contract, end to end

| Concern | Who owns it | How it is implemented |
|---|---|---|
| Which day is "today" | **the server** | the calendar payload echoes `today` = the **profile zone's** civil date (`calendar.service.ts:188`, `formatToday(timeZone)`) |
| Which days to ask for | the client, from a **verified bound** | browser-local civil date ± 2 days. The worst possible IANA offset spread is 26 h, so the two civil dates can be **two days apart**; ± 1 day would then miss the profile zone's "today" entirely |
| Which events count as "today" | the client, from the **server's** value | `event.date === result.today` — never a client-derived date |
| What the day line shows | the client, **verbatim** | `` formatDate(new Date(`${today}T00:00:00Z`), 'UTC') `` — the civil date is formatted as a civil date, and the profile zone is printed **beside** it as raw context |

**Why the day line is formatted in UTC.** The payload's `today` is a *civil date*, not an instant. Re-anchoring it to an instant and re-rendering it in the profile zone shifts the displayed date by one day for every zone at UTC+12 or later (a noon-UTC anchor) or at UTC−12 and earlier (a midnight-UTC anchor) — so **no single UTC-anchored instant is correct in every zone**. Rendering the civil date as-is is correct in every zone, and the client still performs **no** profile-zone arithmetic: the server still owns the date.

### Ownership and error behaviour

- **Student data scoping.** The dashboard adds **no endpoint** and accepts **no** client-supplied id. `GET /assignments` is principal-scoped server-side (`where: { userId }`, `assignments.service.ts:297`); `GET /calendar/events` takes its zone from the **stored profile row** (`calendar.service.ts:182-186`) and whitelists only `from`/`to` (`list-calendar-events-query.dto.ts:16-39`) under the global `whitelist + forbidNonWhitelisted` pipe (`main.ts:14-23`). The client sends **no** `userId`, `courseId`, `assignmentId` or `tz`.
- **Actionable errors.** The base query normalises every failure to `{ message, code }`; the sections render that message through the shared `getErrorMessage` (`shared/lib/errors.ts`) inside a `role="alert"` box with a **Try again** action that refetches *that* query. A failed create shows the shared form's own actionable message and keeps the student's input.
- **One owner, one mount.** The page mounts `useAssignmentActions` + `AssignmentDialogs` **once** and attaches `actions.sectionRef` to the page's root `<section>`. The rows call the page-level `onOpenDetails(row)` callback; no section mounts an owner and no row opens a dialog. The page carries exactly one `data-assignment-focus="add"` control and **no** `empty-add` control, so the shared hook's focus targets are unambiguous.
- **No EP03 shared component was modified.** The dashboard renders its own compact row (`features/dashboard/ui/DashboardAssignmentRow.tsx`); `features/assignments/ui/**` is untouched.

### The key files

| File | Role |
|---|---|
| `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` | the page: request window, day line, single live region, section order, the shared-owner mount, the quick action |
| `apps/web/src/features/dashboard/model/dashboardRange.ts` | the ± 2-day window and the `result.today` selection |
| `apps/web/src/features/dashboard/model/dashboardSelectors.ts` | the pure derived sets and the section limit |
| `apps/web/src/features/dashboard/ui/dashboardSection.ts` | the shared vocabulary: statuses, empty-state contract, the four limits, the row helpers |
| `apps/web/src/features/dashboard/ui/{TodayClasses,UpcomingDeadlines,OverdueAssignments,TodayStudySessions}Section.tsx` | the four sections, each with its own three states |
| `apps/web/src/features/dashboard/ui/DashboardAssignmentRow.tsx` | the dashboard-local compact assignment row |
| `apps/web/src/features/dashboard/ui/DashboardQuickActions.tsx` | the single "Add assignment" trigger |
| `apps/web/src/features/dashboard/ui/dashboardEmptyStates.tsx` | the four settled empty states and their affordances |
| `apps/web/src/features/assignments/api/assignmentsApi.ts`, `.../calendar/api/calendarApi.ts`, `apps/web/src/shared/api/rtkBaseQuery.ts` | the two data slices and the shared transport |
| `apps/web/src/app/store/store.ts` | the two slices' registration |

---

## 3. Why it is correct

**The seven epic acceptance criteria** are each realised by code, not by a summary: today's class schedule (the `CLASS` selection + the section), incomplete assignments ordered by upcoming deadline (filter-only selectors + the endpoint's documented order), overdue assignments clearly identified (the shared predicate + the **text** "Overdue" badge), planned study sessions for the selected day (the `STUDY_SESSION` selection; creation is EP06/EP07's), add assignments and open relevant details directly (the shared owner mounted once + the live row→host callback), empty states that explain the next step (the four settled copy pairs + their matching affordance), and sensible section limits with links to full lists (5/5/5/3 + "See all" → `/assignments` / `/calendar`). The full disposition per criterion is in the [final review](./review.md).

**The evidence behind that mapping:**

- **Automated tests — executed, but by the implementer and the coordinator, not by this reviewer.** This review session has **no shell**, so it could not re-run the suites; it verified the suites **by inspection and by independent counting** instead. The reviewed tree carries **9 test files and 110 cases** across `src/features/dashboard` and `src/pages/dashboard` — the reviewer counted the `it(...)` blocks file by file (12 + 12 + 11 + 13 + 11 + 10 + 8 + 8 + 25 = 110), which matches the recorded result exactly. The recorded runs: the implementer's focused command (`pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → 9 files / 110 tests, all passing), `pnpm --filter web typecheck` → exit 0, `pnpm --filter web lint` → exit 0, and the **coordinator's** run at HEAD `fdc3dce` of the same focused command **and** of the full web suite (78 files / 962 tests, all passing). The full suite's only known failure anywhere is `features/courses/ui/CourseForm.test.tsx` — a **pre-existing, timing-sensitive flake in the courses feature (EP02's)**, reproduced at the pristine tree before EP05 and passing in isolation. It is out of EP05's scope and was not changed.
- **The day line's two boundary cases are real guards.** `DashboardPage.test.tsx:331-347` pins the payload's civil date at the **UTC+14** extreme (`Pacific/Kiritimati` → "Oct 30, 2026", never "Oct 31") and at the **UTC−12** extreme (`Etc/GMT+12` → "Oct 30, 2026", never "Oct 29"). Reasoning from the code: a **noon-UTC** anchor re-rendered in the profile zone yields "Oct 31, 2026" at UTC+14 (so the first case fails) and "Oct 30, 2026" at UTC−12 (so the second still passes); a **midnight-UTC** anchor yields "Oct 29, 2026" at UTC−12 (so the second case fails). The pair therefore rules out *both* single-anchor constructions, which is exactly the contract ("no single UTC-anchored instant renders the civil date correctly in every zone"). The implementer additionally recorded running both cases against each reverted construction and observing the corresponding failure.
- **The mandatory finding from the implementation is closed.** **F-EP05B-01 / PC-EP05-13** — the noon-UTC construction — was corrected by the implementer fix round (`03665fe`) and **independently verified by this review** at the code level: the shipped expression is `` formatDate(new Date(`${calendar.today}T00:00:00Z`), 'UTC') `` (`DashboardPage.tsx:227-229`) and the zone id is printed beside it as raw context only, never applied to the date. The plan-review gate is not reopened by the correction (it changed a construction detail *inside* the accepted contract).
- **The two inter-commit transients are both live in the final state.** The missing working "Add assignment" action (EP05B → EP05C) and the inert "open relevant details" affordance (**F-EP05B-02**, EP05B → EP05C) are both closed by EP05C's wiring — the page's default `onOpenDetails` is `actions.openEdit(row)` (`DashboardPage.tsx:272`), i.e. the product path, not a test-only path.
- **The integrated manual browser pass was executed**, not written as a checklist: 2026-10-30, the repository's self-contained stack (a throwaway `studypilot_e2e_test` PostgreSQL database, a test-only API on :4100, a test-only web instance on :3100, Playwright's Chromium), 2 journeys, 15 recorded observations — the empty states, the one shared dialog, the failed create, the successful create with its focus and announcement, reload persistence, the shared edit dialog, the tab order, the error state, the loading skeleton, and 375 px (44 px target, no horizontal overflow, a working create). The driver was a **temporary, uncommitted** spec that was deleted afterwards; **no dashboard e2e spec was added to the repo** (D05-14). The full step-by-step record is in the [parent index §5](./implementation.md).

**Material limitations retained honestly:**

- The reviewer could **not execute** any command (no shell in this runtime; delegation to a command helper was refused by the runtime's subagent-depth limit). Every gate result above is therefore **recorded** evidence with its provenance, plus the reviewer's own static verification and independent test counting — not reviewer-executed output. This is the review's one material qualification and it is named in the verdict.
- **DoD 10's browser pass was executed by the implementer**, not by the reviewer; the reviewer judged it on its recorded environment, date and per-step observations and on the code it exercises.
- **A tab left open across midnight keeps yesterday's window** until the student presses Refresh (the window is page state, by design — the plan records this as a known limitation, not a defect).
- **The browser zone is the fallback** for displaying due dates while the calendar query has no payload (a display-only degradation in an already-degraded state).
- The **"a `Button` inside a `Link`"** treatment used for "View Profile" and the two calendar empty-state links is the repository's house pattern (`AssignmentsPage.tsx:556`, `AvailabilityPage.tsx:195`), which the plan prescribed; it means one of those controls occupies two tab stops. It is inherited, not introduced here, and it is recorded as optional polish in the review.

---

## 4. Manual test workflows

**Prerequisites (all local and disposable):** the repository's self-contained browser stack — `pnpm --filter web e2e` style setup via `apps/web/e2e/global-setup.ts` (a throwaway `studypilot_e2e_test` PostgreSQL database that the tooling creates, migrates and drops), the test API on **:4100** and the test web instance on **:3100**; or the developer stack with a **local** database. **Never point these steps at a shared environment.** Use a throwaway student account; no secrets are needed and none may be printed. No permission beyond an ordinary student account is required. Steps marked *Not executed* below are **instructions for you**, not results.

### W1 — Load the dashboard and read the four sections

*Setup: a signed-in student with at least one class today, one overdue assignment, one upcoming assignment and (optionally) one study session.*

1. Open `/dashboard`.
2. Read the header: `Today, <date> · <your profile zone>`.
3. Read the four section headings, top-left first: **Overdue assignments**, **Upcoming deadlines**, **Today's classes**, **Today's study sessions**.
4. Click a **See all** link in any section.

**Expected:** the day line shows today's date with your profile zone as raw text; the four sections appear in that order; each section shows at most 5 / 5 / 5 / 3 rows and, if it truncates, a "+N more" line; **See all** navigates to `/assignments` or `/calendar`.
**Edge cases:** a section with no data shows its **empty state** (not a blank box); a class title links to its course; an assignment with no deadline shows "No due date" and sits last in "Upcoming deadlines"; an overdue row shows the word **Overdue**.

### W2 — Add an assignment (the working quick action)

1. Click **Add assignment** in the header.
2. Type a title, optionally pick a course, click **Create assignment**.
3. Look at the header, then press Tab once.

**Expected:** exactly **one** dialog opens ("Add an assignment") with focus in the **Title** field; after the create the dialog **closes**, the new row appears in a section **without a page reload**, focus is on the **Add assignment** button, and the live region reads "Assignment added. · …". Reloading the page keeps the row (the row only appears after the server confirms it).
**Edge cases:** with **no courses** in the account, the Course select offers only "No course" and the create still succeeds.

### W3 — A failed create keeps the student's work

1. Open **Add assignment** and type a title.
2. Make the create fail (e.g. use a duplicate title the server rejects, or stop the API).
3. Observe the dialog.

**Expected:** the dialog **stays open**, the typed title is **still there**, an actionable message is shown ("We could not save the assignment. Try again."), and **no** row is added to either section.

### W4 — Open relevant details from a row

1. Click an assignment's **title** in "Upcoming deadlines" or "Overdue assignments".
2. Read the dialog, then close it with **Escape**.

**Expected:** exactly **one** dialog opens, named "Edit assignment"; closing it returns focus to the row's title. Clicking a second row's title reuses the **same** dialog — never a second one.

### W5 — The empty states of a brand-new student

1. Sign up a throwaway student with no data.
2. Open `/dashboard`.

**Expected:** each of the four sections shows its settled copy — "Nothing overdue.", "No upcoming deadlines.", "No classes today.", "No study sessions today." — each with a description naming the next step; the two assignment sections offer an **Add an assignment** button (which opens the same create dialog) and the two calendar sections offer a **View your week** / **Open the calendar** link to `/calendar`. No empty state mentions a study plan, a focus session or a study-stats figure.

### W6 — A failing query shows an actionable error

1. Make one API fail (e.g. block `GET /assignments`).
2. Open `/dashboard`.

**Expected:** the two **assignment** sections show an error box with the server's actionable message and a **Try again** button; the two **calendar** sections still render their rows (and the mirror image holds when the calendar fails). Pressing **Try again** retries only that query.

### W7 — The loading state

1. Throttle the network so the dashboard's requests are slow.
2. Open `/dashboard`.

**Expected:** each affected section shows its own skeleton bars with `aria-busy="true"` (not a blank page and not a full-page spinner), and the live region reads "Loading your dashboard…".

### W8 — Keyboard operation

1. Reload `/dashboard` and press **Tab** from the top.
2. Tab through the header, then into the sections; activate the refresh control, a **See all** link and a row title with **Enter**.
3. Open the create dialog with the keyboard, then press **Escape**.

**Expected:** every interactive element is reachable and shows a visible focus ring; the order is the page order (refresh → Add assignment → View Profile → the sections); the refresh control and a row title are operable with the keyboard alone; **Escape** closes the dialog and focus returns to the control that opened it. The overdue marking remains readable in greyscale (it is the word "Overdue", not a colour).

### W9 — 375 px (phone width)

1. Set the viewport to 375 px wide and open `/dashboard`.
2. Measure the **Add assignment** button's height and scroll the page horizontally.
3. Repeat the create round trip.

**Expected:** the trigger is **≥ 44 px** tall; the page has **no horizontal scrolling**; the four sections stack in one column in the same order; the create round trip still works (dialog closes, row appears, focus lands on the trigger).

### W10 — A profile zone that differs from the browser's zone

*Setup: set the student's profile time zone to `Pacific/Kiritimati` (UTC+14) — or `Etc/GMT+12` (UTC−12) — while the browser runs in a different zone.*

1. Sign in and open `/dashboard`.
2. Read the day line.

**Expected:** the day line shows the **server's** civil date for the profile zone and the zone id beside it — the displayed date never shifts by a day because of the zone. The classes and sessions shown are the profile zone's "today".
**Note:** this is the scenario the two automated boundary cases encode (`DashboardPage.test.tsx:331-347`); the automated evidence for it is in §3.

### W11 — Refresh after midnight

1. Leave the dashboard open across local midnight (or change the system clock).
2. Press the **Refresh dashboard** button.

**Expected:** the request window is recomputed, the day line shows the new date and the sections show the new day. (Without the refresh, the page keeps the window it computed at mount — a known, recorded limitation.)

### W12 — Screen-reader spot check (optional)

1. Run the dashboard with a screen reader.
2. Navigate the sections and the header.

**Expected:** the four sections are announced as named regions; the count line is announced politely; the action sentence ("Assignment added.") is announced after a create; no focus trap or stray announcement appears.

### Workflows that do not apply

- **Creating a study session from the dashboard** — **Not applicable**: EP05 displays sessions; creation is EP06/EP07's (D05-2, D05-13). The empty state deliberately offers no create-session action.
- **A "Study Stats" card / "Hours Studied" / "Tasks Completed"** — **Not applicable**: deliberately dropped (D05-11, final); there is no endpoint for study time yet, and the page test asserts no such figure renders.
- **A study-plan or focus-session quick action** — **Not applicable**: those surfaces are EP06's and EP07's (D05-5); EP05 omits them rather than shipping them disabled.
- **Editing or deleting an assignment from a dashboard row** — **Not applicable**: the compact row is a summary (title, course, due date, subtask progress); status changes, deletion and the subtask checklist live on the assignments list and the course page.

---

## 5. Execution status of each workflow

| # | Workflow | Status | Provenance |
|---|---|---|---|
| W1 | Load the dashboard; the four sections | **Executed** (2026-10-30, EP09 self-contained stack — throwaway `studypilot_e2e_test` Postgres, test API :4100, test web :3100, Playwright Chromium) | Implementer-executed DoD-10 pass, observations 1–3, 7, 8; recorded in [./implementation.md §5](./implementation.md) |
| W2 | Add assignment (round trip, focus, announcement) | **Executed** (same environment and date) | DoD-10 observations 3–7; plus the executed component cases in `DashboardPage.test.tsx` (create round trip, focus + announcement) |
| W3 | Failed create keeps the form open | **Executed** (same environment and date) | DoD-10 observation 5; plus the executed failed-create component case |
| W4 | Open relevant details (one shared dialog) | **Executed** (same environment and date) | DoD-10 observation 8; plus the executed "one owner, one mount" component case |
| W5 | Empty states and their affordances | **Executed** (same environment and date) | DoD-10 observation 1; plus the executed empty-state component cases |
| W6 | Failing query → actionable error + retry | **Executed** (same environment and date) | DoD-10 observation 11; plus the executed partial-failure component cases |
| W7 | Loading skeleton | **Executed** (same environment and date) | DoD-10 observation 12; plus the executed per-section loading cases |
| W8 | Keyboard operation, focus order, focus restoration | **Executed** (same environment and date) | DoD-10 observations 9–10; plus the executed keyboard and focus-order component cases |
| W9 | 375 px: 44 px target, no overflow, create | **Executed** (same environment and date) | DoD-10 observations 13–15; plus the executed responsive class-contract cases |
| W10 | Profile zone ≠ browser zone (day line) | **Automated coverage executed** (the two zone-extreme component cases, implementer-recorded); **the manual browser variant was not executed** | The component cases are executed evidence; the browser variant is listed below as a user test |
| W10 (manual variant) | Same, in a real browser with a `Pacific/Kiritimati` profile zone | **Not executed — user test instructions** | Steps in §4 W10; no manual browser run at that zone is on record |
| W11 | Refresh across midnight | **Not executed — user test instructions** | Steps in §4 W11; not exercised by the DoD-10 pass |
| W12 | Screen-reader spot check | **Not executed — user test instructions** (optional user repeat) | Steps in §4 W12; no assistive-technology run is on record |

**Nothing in this table is a reviewer-executed result.** The DoD-10 pass was executed by the implementer against the integrated stack; this review judged it on its recorded environment, date and per-step observations and on the code it exercises. The reviewer executed **no** command in this review session (no shell; delegation to a command helper was refused by the runtime's subagent-depth limit) — the review's verification is static, plus an independent count of the test cases. See [./review.md](./review.md) §"Execution capability" for the full limitation statement.
