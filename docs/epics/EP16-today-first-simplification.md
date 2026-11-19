# EP16: Today-First Simplification (one daily surface, fewer destinations)

**Epic ID:** EP16
**Status:** **Reviewed — shipped on the development branch (2026-11-18).** Breakdown 2026-11-17 → [docs/stories/EP16](../stories/EP16/README.md); nine children (EP16A–EP16I, incl. the security child EP16G and the accepted ADHD upgrades EP16H/EP16I) implemented and passed the combined review at `4f9ecd1` (pass 2, [review](../stories/EP16/artifacts/EP16/review.md)); EP16J/EP16K cancelled for the epic (specs kept via BL-16-05/BL-16-09). Open polish: BL-16-08, BL-16-10, BL-15-08. No tracker sync.
**Release:** 1.3 (proposed, D16-1)
**Priority:** High / P0
**Labels:** `studypilot`, `adhd`, `simplification`, `navigation`
**Dependencies:** EP13 (today plan, momentum, plan health — closed), EP15 (calendar-first schedule — closed), EP11 (grouped navigation — closed). EP15K (optional, Ready) runs **first** (D16-1 ruling); EP16 starts after EP15K's review unit. One sequential writer as always.
**Milestone:** M9 (proposed, D16-1).

## Epic Summary

Give the student one answer to "what do I do right now?" on one screen, make
planning one action with one confirmation, and cut the navigation from ten
entries in four groups (nine destinations plus Home) to four destinations. Nothing the app can do is
removed; what changes is how many places a student has to look, and how many
decisions they face before they start studying.

## Description

As a student with ADHD, I want to open StudyPilot and see exactly one thing to
do next, with one button to start it, so that I begin studying instead of
reading, comparing and choosing.

The product's **behaviour** already serves this — EP13 made plans self-heal,
put a one-tap start on the dashboard and keeps copy non-blaming (D13-9). Its
**surface** does not. Inspected 2026-11-17:

- **Navigation** (`apps/web/src/widgets/header/ui/navGroups.ts:65-101`):
  Home, Dashboard, Academics ▾ (Semesters, Courses, Assignments), Planning ▾
  (Calendar, Plan, Plan health), Focus ▾ (Focus session, Study history) — ten
  entries, three of which are the same idea ("my plan") split three ways, and
  one of which (`/focus` without a running session) is an empty state whose
  only action is "Go to assignments" (`pages/focus/ui/FocusPage.tsx:75-87`).
- **Dashboard** (`pages/dashboard/ui/DashboardPage.tsx:348-404`): six
  regions — Today's plan, Your momentum, Overdue assignments, Upcoming
  deadlines, Today's classes, Today's study sessions — plus a header with
  "Welcome back", a day line that prints the raw IANA time-zone id, a refresh
  button, "Add assignment" and "View Profile". The next action is first
  (EP13D D-D1), but it shares the screen with five other lists.
- **Planning** is two flows that look identical and are named differently.
  `/plan` has **Generate plan → preview → Save plan** (`PlanPage.tsx`); `/plan/health`
  has **Regenerate my week → preview → Use this plan** (`CatchUpPreview.tsx`).
  Both previews run the same engine through `gatherPlanData` → `schedule`
  (`study-plans.service.ts:1123`, `:1186`); both confirms replace only
  `SCHEDULED && !locked` rows (`:1427-1444`, `:1647-1664`). Since EP13C's
  rolling reconciliation the only difference is that the catch-up preview also
  returns the rolled-forward context and preserved counts. The student sees
  two vocabularies for one job.
- **Plan health** (`features/plan-health/ui/PlanHealthView.tsx`) is a page
  whose content is one sentence ("Your plan moved unfinished work forward…"),
  a list that the proposal flow could show as context, a list that `/plan`
  already shows as **Remaining work**, and a button that starts the second
  planning flow.

Every extra region, entry and flow is a place where a student with ADHD can
stall, compare, or leave. This epic applies EP15's minimalism principle
(D15-14, binding here by D16-12) to the daily surfaces: **one surface for
now, one action for planning, four places to go.**

Scheduling stays deterministic and untouched (D13-1). Non-blaming copy
(D08-8, D13-9) binds every new sentence. This is a **frontend-only** epic
(D16-13): every read and write it needs already exists.

## Scope

- **Today** (`/today`) replaces the dashboard as the landing surface: one
  hero (the next session with Start / Just 10 min / Resume, or "Plan my
  week"), today's remaining sessions, one plan-note sentence when work moved
  forward, one momentum line, one **Coming up** deadlines list, one classes
  line. Login, onboarding completion, `/`, `/dashboard` all land here.
- **One planning flow**: `/plan` shows the saved week and one primary action
  ("Plan my week" / "Replan my week") that opens one proposal surface with
  "Use this plan" / "Not now"; the proposal carries what it keeps (locked,
  completed) and what moved forward. The second flow and the plan-health
  page are retired behind redirects; none of their information is lost.
- **Navigation**: Today · Plan · Calendar · Work ▾ (Assignments, Courses).
  Focus entries leave the nav; a **running-session indicator** in the header
  (elapsed time + Resume) takes over the "get back to my timer" job on every
  page. Semesters are reached from Courses; Study history from Today's
  momentum line and the Focus page. Home is hidden for signed-in students.
- **Mobile**: a bottom tab bar with the four primary entries (EP16E, D16-7
  ruled); the drawer keeps the account items.
- **Housekeeping the rebuild makes free**: `features/dashboard` →
  `features/today`; the day line stops printing an IANA id; BL-14-07 (account
  menu unmounting after login) is investigated and fixed in the header story;
  BL-15-09's `shared/ui/Button` accessible-name-while-loading defect is fixed
  where the Today hero relies on it.

## Out of scope

- Reminders and notifications (D13-8 stands; separate epic — the #1
  recommendation of the 2026-11-17 product review).
- Focus-session changes (breaks, end-of-target cue, parking lot) — the #3
  recommendation; its own epic.
- Merging the Plan week view into the Calendar grid (▲ D16-9 option b —
  recorded as a backlog row, not done here).
- Any engine, API or schema change. If a story finds one is required it
  flags it and stops (D16-13; EP11 D11-2 precedent). Removing the now-unused
  `POST /study-plans/preview` + `PUT /study-plans` pair from the API is a
  backlog row for a later API-cleanup story.
- Quick-capture assignment entry (the honourable mention of the review) —
  backlog row.
- AI, syllabus parsing, LMS, grades, flashcards, native mobile.

## Acceptance Criteria (draft — stable IDs AC-E16-01…14 assigned at breakdown)

**Today**

1. A signed-in student lands on **Today** after login, after finishing
   onboarding, and when visiting `/`, `/dashboard` or any former dashboard
   deep link; Today is the first navigation entry and the browser title says
   so.
2. Today's first meaningful content is the single next action — **Start
   focus** / **Just 10 min** for the next planned session, **Resume focus**
   for a session in progress, **Plan my week** when there is no plan, or the
   "done for today" block — rendered before and independently of every other
   read on the page (EP13E D-E10 carried over). On a 360×640 viewport the
   primary control is visible without scrolling.
3. Today has at most these regions, in this order, and no others: next
   action + today's remaining sessions; one plan-note sentence (only when
   work moved forward); one momentum line; **Coming up** (unfinished
   assignments by due date, past-due rows first with a text badge, capped at
   five with an "All assignments" link); **Classes today** (one line, hidden
   when none). No region heading carries a count; no percentage, no
   "missed", "behind", "overdue" or "failed" appears (D13-9).
4. The former "Today's study sessions" list is not rendered; today's
   confirmed minutes appear once, in the momentum line, with a link to Study
   history.
5. A student can still add an assignment from Today in one tap (EP05C's
   control and its post-create focus behaviour preserved) and open any
   deadline row's details.

**Planning**

6. From `/plan` one action — **Plan my week** (no saved plan) / **Replan my
   week** (saved plan exists) — opens one proposal surface with exactly one
   confirm (**Use this plan**) and one decline (**Not now**); the proposal
   keeps the week grid, per-session editing, conflict marking, workload
   warnings and the calibration note, and additionally shows what it keeps
   (locked and completed sessions) and what moved forward, when either is
   non-empty.
7. Today's "Plan my week" opens the proposal surface; the plan-note link
   opens `/plan` (amended at breakdown, D16-18 — a curious click must not
   start a proposal).
8. `/plan/health`, `/plan/health/catch-up`, `/catch-up` and
   `/catch-up/preview` redirect (`replace`) into the plan flow; the plan-health
   page is removed; its lead sentence lives on Today (AC 3), its moved-forward
   list in the proposal (AC 6) and its unfinished-work list stays as
   **Remaining work** on `/plan`.

**Navigation**

9. The signed-in primary navigation is exactly **Today**, **Plan**,
   **Calendar**, **Work ▾** (Assignments, Courses). The account menu keeps
   Profile, Verify email (when unverified) and Logout. Home is not shown to
   signed-in students. Every route that existed before remains reachable by
   link or redirect: Semesters from the Courses page, Study history from
   Today's momentum line and the Focus page, Focus from the session indicator
   and Today.
10. While a focus session is **active or paused**, every page's header shows
    a session indicator with the elapsed time and one control back to the
    session (recommended label **Back to session**; keyboard-operable,
    announced once); when no session exists the header
    shows nothing extra. The Focus page's empty state points to Today.
11. On narrow viewports the four primary entries render as a
    bottom tab bar with icon + label, `aria-current="page"`, 44 px targets;
    the drawer keeps only the account items.

**Quality (shared)**

12. Keyboard operability, visible focus, one page-level `role="status"` live
    region on Today, reduced-motion compliance and WCAG 2.2 AA hold on every
    new or changed surface; every control has a text label.
13. No backend, engine or schema change (D16-13); the EP13J identity test and
    the EP15 determinism test (V-15-3) still pass unchanged.
14. All existing Playwright journeys pass after the route and navigation
    changes, plus new journeys for Today, the single plan flow, the session
    indicator and the redirects.

### Test requirements (draft — TR-E16-01…06 assigned at breakdown)

- **TR-E16-01** Component tests for every new or changed page and widget
  (Today, proposal surface, nav, session indicator, tab bar) covering
  loading / empty / error / ready, keyboard, and the copy rules.
- **TR-E16-02** Route tests (`app/appRoutes.test.tsx` pattern) for every
  redirect in AC 1 and AC 8 and for the `/` landing behaviour by auth state.
- **TR-E16-03** Playwright: `today.spec.ts` (login → Today → Start focus →
  finish → Today shows the minutes), the single plan flow (no plan → Plan my
  week → Use this plan → Today shows the next session; Replan preserves a
  locked session), navigation and indicator journeys, redirects; the
  existing axe gate extended to Today and the proposal surface; `helpers.ts`
  updated from `/dashboard` to `/today`.
- **TR-E16-04** Manual accessibility pass (screen reader on the session
  indicator and the bottom tab bar; 360×640 primary-control visibility).
- **TR-E16-05** Copy audit: a unit test asserts the forbidden-word list of
  AC 3 against every string the new surfaces render.
- **TR-E16-06** Momentum-line parity: the compact line renders the same
  sentences `momentumCopy.ts` produces for the card today.

## Proposed Stories

Sequenced for the single implementer; letters are stable IDs. All frontend.
Sizes are planning estimates (one "window" ≈ one implementer dispatch).

| ID | Title | Outcome | Depends on | Size |
|---|---|---|---|---|
| **EP16A** | **Today page and landing route** | `/today` exists with the hero and today's rows (reusing `TodayPlanCard`), the dashboard page and its six regions are gone, every landing path (login, onboarding, `/`, `/dashboard`) resolves to Today; `features/dashboard` → `features/today`; the day line loses the IANA id (D16-10); Button accessible-name fix (BL-15-09 item). | — | ~1 window |
| **EP16B** | **Today's secondary content** | The plan-note sentence (moved from `PlanPage`), the compact momentum line with "See history" (D16-8), **Coming up** (merged deadlines, past-due first, cap 5, "All assignments"), **Classes today** line; "Add assignment" kept; copy-audit test. | EP16A | ~1 window |
| **EP16C** | **One planning flow** | `/plan` with one primary action; one `PlanProposal` feature replaces `PlanPage`'s preview mode and `CatchUpPreview` (D16-4); "kept" and "moved forward" context in the proposal; `/plan/health*` and `/catch-up*` redirects; `features/plan-health` and `features/catch-up` retired or folded; Today's buttons re-targeted. | EP16A (for the Today links; can be implemented before EP16B) | ~1.5 windows |
| **EP16D** | **Navigation and the session indicator** | `navGroups.ts` → Today / Plan / Calendar / Work ▾; Home hidden when signed in; Focus entries removed; header session indicator reading `GET /study-sessions/current` (D16-11); Semesters link on Courses; Study history link on the Focus page; Focus empty state → Today; BL-14-07 investigated and fixed. | EP16A | ~1 window |
| **EP16E** | **Mobile bottom tab bar** (D16-7) | Four-entry tab bar on narrow viewports; drawer reduced to account items; `Layout` safe-area padding. | EP16D | ~0.5–1 window |
| **EP16F** | **Cross-layer e2e and parent index** | `today.spec.ts`, plan-flow and navigation journeys, redirect checks, axe gate, `helpers.ts` landing update, parent `implementation.md` index. | EP16A–EP16E | ~1 window |

Review unit: one combined review after EP16F (review-cadence). Plan review:
**not required** by the checklist rule (no migration, no new invariant, six
children) unless you ask for one.

### Story sketches

**EP16A — Today page and landing route.** New `pages/today/ui/TodayPage.tsx`
(the dashboard page's header, request-window state and single live region
survive; the six-region body does not). Hero and rows are `TodayPlanCard`
unchanged, except its empty state's primary becomes **Plan my week**. Routes:
`/today` added; `/dashboard` → `/today` (`replace`); `PublicRoute`,
`LoginPage`, `VerifyEmailPage`, `OnboardingPage`/`Step3Course`,
`HomePage` ("Go to Dashboard") re-pointed; `/` renders Home only for
signed-out visitors and redirects signed-in students (D16-6). Mechanical
`git mv features/dashboard features/today` with import rewrite;
`dashboardSection.ts` helpers keep their exports. Day line: civil date only,
plus "Times shown in <zone>" only when the profile zone differs from the
browser zone (D16-10). `shared/ui/Button` keeps its accessible name while
`isLoading` (BL-15-09 item, one-line fix + test).

**EP16B — Today's secondary content.** Plan note: the sentence and link
EP13E put on `PlanPage` (`PlanPage.tsx:233-245`) move to Today, pointing at
the proposal route. Momentum: a `MomentumLine` variant of `MomentumCard` —
`MomentumWeekStrip` in `compact` mode beside `weeklyLine` (+ `runLine` when
present), no bar, no card chrome, a "See history" link (D16-8 (c);
refines EP13K D-K9/D-K10). Coming up: one list built
from the existing `selectOverdueAssignments` + `selectUpcomingAssignments`
(past-due rows first, text badge **Past due**, cap 5 via `limitRows`,
"All assignments" link); `DashboardAssignmentRow` reused. Classes today: one
line from `selectTodayClasses` ("10:00 BIO 101 · 14:00 MATH 201"), hidden
when empty. The "Add assignment" control and `AssignmentDialogs` mount stay
(EP05C). Removed: Overdue / Upcoming / Today's classes / Today's study
sessions sections and their empty-state copy. Copy-audit test (TR-E16-05).

**EP16C — One planning flow.** `features/plan-proposal/` (new) hosts
`PlanProposal`: header (title, window, **Use this plan**, **Not now**),
`PlanWeek`, `PlanSessionEditor`, `CatchUpPreservationCard` (renamed to
"What this plan keeps"), a "Moved forward" context list (from the catch-up
payload's `missedSessions`), `WorkloadWarnings`, `CalibrationNote`,
conflict summary, rolled-over handling — the union of what `PlanPage` preview
mode and `CatchUpPreview` render today, once. Data path: `previewCatchUp` +
`confirmCatchUpPlan` for every proposal (D16-4). `/plan` stops mounting
`TodayPlanCard` — Today owns the hero now; `/plan` shows the saved week,
Remaining work, and the one primary action (D16-5). Routes:
`/plan/proposal` (or `/plan?propose`, refiner's call) renders the proposal;
`/plan/health` → `/plan`; `/plan/health/catch-up` → `/plan/proposal`;
`/catch-up*` chained accordingly. `features/plan-health` is deleted (its
query is still used by the Today note — `planHealthApi` moves to
`features/today` or stays as a small shared read; refiner's call).
`CatchUpLockToggle` survives inside the proposal.

**EP16D — Navigation and the session indicator.** `navGroups.ts`: `home`
entry only for signed-out; `today` (icon `Sun`), `plan` (`CalendarCheck`),
`calendar` (`Calendar`), `work` group (`Briefcase`?) with `assignments`,
`courses`. `accountMenuItems` unchanged. A `SessionIndicator` widget in the
header reads `GET /study-sessions/current` on route change and after
focus-session mutations (D16-11), shows `mm:ss` + **Resume** linking to
`/focus`, hidden when null; `aria-live="polite"` announces appearance once.
Courses page header gains a "Semesters" link; Focus page gains a "Study
history" link in its header and its empty state points to Today. BL-14-07:
reproduce with the EP14C harness, fix the late re-render, add the regression
test. Amends D11-4/D11-6/D11-10 and EP13E D-E13 (nav rows), recorded
bidirectionally at breakdown.

**EP16E — Mobile bottom tab bar.** `widgets/tab-bar/` renders the four
primary entries below `sm`; `Layout` adds bottom padding and
`env(safe-area-inset-bottom)`; the drawer lists only account items; the
header keeps the menu button. Reduced motion, 44 px, `aria-current`.

**EP16F — Cross-layer e2e and parent index.** As TR-E16-03; the parent index
per review-cadence.

## Technical Notes (inspected baseline, 2026-11-17)

- **Routes:** `apps/web/src/app/App.tsx:30-87`. `PublicRoute` redirects
  authenticated users to `/dashboard` (`widgets/public-route/ui/PublicRoute.tsx:17`);
  `/dashboard` is referenced in 20 non-test source files and 24 times in
  `apps/web/e2e/*.ts` (`helpers.ts` waits on it).
- **Today's plan read:** `GET /study-plans/today` → `TodayPlan`
  (`sessions`, `nextSession`, `nextSessionReason: 'NO_PLAN' | 'NOTHING_LEFT_TODAY'`,
  `confirmedMinutesToday`) via `features/today-plan/api/todayPlanApi.ts`;
  start via `useStartPlannedSession` (`POST /study-sessions/from-planned/:id`,
  optional minutes for the micro-start).
- **Momentum:** `GET /study-sessions/momentum`; sentences in
  `features/momentum/model/momentumCopy.ts` (`dailyLine`, `weeklyLine`, `runLine`).
- **Plan health read:** `GET /study-plans/recovery-summary` → `RecoverySummary`
  (`rolledForward*`, `unfinishedWork`, `confirmedMinutes`) via
  `features/plan-health/api/planHealthApi.ts`, shared by the `PlanPage` note.
- **Planning endpoints:** `POST /study-plans/preview`, `PUT /study-plans`
  (save), `POST /study-plans/catch-up/preview`, `POST /study-plans/catch-up/confirm`,
  `PATCH /study-plans/sessions/:id/lock`, `GET /study-plans` (saved week),
  `GET /study-plans/remaining-work`. Both previews call
  `gatherPlanData` → `schedule`; both confirms delete only
  `SCHEDULED && !locked` rows inside a transaction (EP13A AC-E13-02).
- **Dashboard selectors:** `features/dashboard/model/dashboardSelectors.ts`
  — `selectTodayClasses` (`CLASS` events), `selectTodayStudySessions`
  (`STUDY_SESSION` = confirmed focus sessions, not planned ones),
  `selectOverdueAssignments`, `selectUpcomingAssignments`, `limitRows`.
- **Current session:** `GET /study-sessions/current` (used by
  `features/focus-session/model/useFocusSession.ts`).
- **Header:** `widgets/header/ui/Header.tsx` (~750 lines: desktop dropdowns,
  account menu, mobile drawer with focus trap — EP10C/EP11); nav data in
  `navGroups.ts`. No bottom navigation exists.
- **E2E:** `apps/web/e2e/` — 11 specs, `global-setup.ts`, `helpers.ts`,
  axe gate added by EP15J. BL-15-08 (ports/DB name) is the known harness
  limitation; EP16F should not need to touch it.
- **Unverified / for the refiner:** exact icon set; whether the proposal
  lives at `/plan/proposal` or in page state; whether `planHealthApi` is kept
  as a shared read or folded; `Header.tsx` structure for the indicator slot
  (file not read end-to-end); bottom tab bar interaction with the EP10C
  drawer's scroll lock.

## Decision Register

`Ruling` is yours. ▲ rows are material (user-visible workflow); they block
the owning story until ruled. Rows without ▲ ratify by default at
implementation start.

| ID | Decision | Options considered | Recommended | Ruling |
|---|---|---|---|---|
| D16-1 | Milestone and release | (a) new **M9**, release 1.3, frontend-only, after EP15K (Ready, small) or before it — the two share no files; (b) fold into M8 as "1.2 polish" | **(a)** — this changes the product's shape, not EP15's; it deserves its own review unit and release note | Ratified (a); EP15K runs first (user, 2026-11-17) |
| ▲ D16-2 | Landing surface | (a) new `/today` page, `/dashboard` redirects; the word "Dashboard" disappears from the product; (b) rebuild in place at `/dashboard`, relabel "Today"; (c) keep the dashboard and add Today beside it | **(a)** — "Dashboard" promises an overview of everything; "Today" promises one answer. (c) adds a destination, the opposite of the goal | Ratified (user, 2026-11-17 — "ratify all") |
| ▲ D16-3 | Today's regions and order | (a) hero + rows → plan note → momentum line → Coming up (merged deadlines, past-due first, cap 5) → Classes today line; no study-sessions list; (b) keep the six EP05/EP13 regions and only reorder; (c) hero only, everything else behind links | **(a)** — one list per question ("what now", "what's coming", "where am I today"); (c) hides deadlines, which students told EP05 they need in view | Ratified (a): cap 5 with "All assignments", past-due rows carry a **Past due** text badge (user, 2026-11-17) |
| ▲ D16-4 | One planning flow — data path | (a) the single proposal surface always uses `catch-up/preview` + `catch-up/confirm` (same engine, same selective replace, plus moved-forward context and preserved counts); `preview` + `PUT /study-plans` stay in the API, unused by the web client, with a backlog row to remove them; (b) use `preview` + `PUT` and fetch moved-forward context from `recovery-summary`; (c) keep two flows | **(a)** — one request pair, one payload that already carries everything the surface shows; no API change; (c) is the status quo this epic exists to remove | Ratified (user, 2026-11-17 — "ratify all") |
| ▲ D16-5 | Plan health page | (a) retire `/plan/health` and `/plan/health/catch-up` behind redirects; sentence → Today, moved-forward list → proposal, unfinished work → `/plan` Remaining work; `/plan` no longer mounts `TodayPlanCard` (Today owns the hero); (b) keep the page, remove it from the nav only | **(a)** — a page whose every part has a better home is a destination for its own sake | Ratified (a) (user, 2026-11-17) |
| ▲ D16-6 | Navigation model | (a) **Today · Plan · Calendar · Work ▾ (Assignments, Courses)**; Home hidden when signed in and `/` → `/today`; Focus entries removed in favour of the header session indicator; Semesters linked from Courses; Study history linked from Today and Focus; account menu unchanged; (b) same, plus Semesters and Study history in the account menu; (c) five flat entries: Today, Plan, Calendar, Assignments, Courses | **(a)** — four places to go; the account menu stays about the account. (c) is acceptable if you dislike the one remaining dropdown; (b) if you want Semesters one click from anywhere. Amends D11-4/D11-6/D11-10 and EP13E D-E13 | Ratified (a) (user, 2026-11-17) |
| ▲ D16-7 | Mobile bottom tab bar | (a) yes — EP16E, last before e2e; (b) drawer only | **(a)** — the four-entry IA is what makes a thumb-reach tab bar possible; "where am I" is always visible on a phone | Ratified (a) — EP16E is in the epic (no longer optional) (user, 2026-11-17) |
| D16-8 | Momentum presentation on Today | (a) one text line, week strip behind a "Show week" disclosure; (b) keep the full card; (c) one compact row: the existing `MomentumWeekStrip` in its `compact` mode (36 px) beside one sentence (weekly line, plus the run line when present), no progress bar, no card chrome, no disclosure, a "See history" link | **(c)** (revised 2026-11-17 from (a)) — the seven day marks are the most glanceable part (no reading needed) and the reward that matters for ADHD; hiding them behind a click adds a control for a 7-mark graphic and makes the reward invisible by default. The bar and the daily sentence duplicate the hero's "min studied today" badge. Refines EP13K D-K9/D-K10 | Ratified (c) (user, 2026-11-17) |
| ▲ D16-9 | Plan week view vs Calendar grid | (a) keep `/plan` (saved week + Remaining work + the one action) separate from `/calendar`; record "render the proposal on the EP15 week grid and retire PlanWeek" as a backlog row; (b) merge now | **(a)** — the EP15 grid is a week old and the proposal/edit mode is a different job; merging is a follow-on epic once Today has landed | Ratified (user, 2026-11-17 — "ratify all") |
| D16-10 | Day line | (a) civil date only; "Times shown in <zone>" appended only when the profile zone ≠ browser zone; (b) keep printing the IANA id | **(a)** — refines D05-6's *display* only; the no-client-date-arithmetic rule is untouched | Ratified (user, 2026-11-17 — "ratify all") |
| D16-11 | Session indicator read | (a) `GET /study-sessions/current` on route change and after focus-session mutations; elapsed time ticks client-side from the payload; no interval polling; (b) poll every N seconds | **(a)** — the timer already runs client-side on `/focus`; a route-change read catches every way a student can leave it | Ratified (user, 2026-11-17 — "ratify all") |
| D16-12 | Minimalism binds EP16 | D15-14 (1)–(7) apply verbatim to every EP16 surface, plus: **(8)** one primary control per screen; **(9)** Today's primary control is visible without scrolling at 360×640; **(10)** a region with nothing to show renders nothing (no empty-state cards on Today except the hero's) | — | Ratified (user, 2026-11-17 — "ratify all") |
| D16-13 | Frontend only | No API, engine or schema change; a story that needs one flags it and stops (EP11 D11-2 precedent) | — | Ratified (user, 2026-11-17 — "ratify all") |
| D16-14 | Backlog absorption | BL-14-07 (account menu unmounted after login) → EP16D — its trigger "any work on the header/auth shell" fires; BL-15-09's Button accessible-name item → EP16A; the rest of BL-15-09 stays. New rows at breakdown: remove the unused `preview`/`PUT` pair (D16-4); proposal on the week grid (D16-9); quick-capture assignment entry | — | Ratified (user, 2026-11-17 — "ratify all") |

## Security / privacy / accessibility invariants

No new credential, tenancy or persistence surface. Every read the new
surfaces make already enforces `userId` scoping server-side.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Every former destination stays reachable | A redirect loop or a retired page with no inbound link | Route table with `replace` redirects; nav + in-page links enumerated in AC 9 | TR-E16-02, TR-E16-03 |
| No student is ever shown another student's cached data (Today, calendar, assignments, momentum, onboarding, the session indicator) | Student A logs out; B signs in on the same tab within 60 s and is served A's cached Today plan | EP16G: a store listener resets every per-student RTK Query slice and the onboarding slice on logout and on an account switch, with a registry test; EP16D D-D8 resets the indicator's provider on a `user.id` change (D16-19; planner correction 2026-11-18 — no reset existed) | EP16G-AC1…AC4; EP16D-AC3 |
| The single plan flow never deletes locked or completed sessions | Replan after locking a session removes it | `catch-up/confirm` replaces only `SCHEDULED && !locked` (EP13A) — unchanged, relied upon | TR-E16-03 (Replan preserves a locked session) |
| Today never leads with a failure | A rolled-forward count or an overdue heading appears first | Region order fixed by AC 3; copy-audit test | TR-E16-05 |

## Verification tasks

- **V-16-1:** copy audit (TR-E16-05) runs against every string in
  `pages/today`, `features/today`, `features/plan-proposal`, the session
  indicator and the tab bar.
- **V-16-2:** route matrix — every path in AC 1 and AC 8, by auth state.
- **V-16-3:** 360×640 primary-control visibility (D16-12 (9)) — Playwright
  viewport assertion in `today.spec.ts`.
- **V-16-4:** the unused-endpoint check — after EP16C, `grep` for
  `previewStudyPlan`/`saveStudyPlan` in `apps/web/src` returns only the entity
  client (D16-4 (a)).

## Remaining decisions

None — every epic and story decision was ratified by the user on 2026-11-17
("yes, ratify all"). Breakdown: [docs/stories/EP16](../stories/EP16/README.md).
