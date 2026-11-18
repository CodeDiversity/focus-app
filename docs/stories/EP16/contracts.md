# EP16 shared contracts

Frontend-only (D16-13). Every read and write below already exists; this file
fixes the routes, the Today region contract, the copy rules, the single
proposal data path, the session-indicator contract and the known windows
between sequential children. Code baseline inspected 2026-11-17 at `ccb0229`.

## Route matrix

| Path | Before EP16 | After EP16 | Owner |
|---|---|---|---|
| `/` | `HomePage` for everyone (signed-in sees "Go to Dashboard") | signed-out: `HomePage`; signed-in: `<Navigate to="/today" replace />` | EP16A |
| `/today` | — | `TodayPage` (protected) | EP16A |
| `/dashboard` | `DashboardPage` | `<Navigate to="/today" replace />` (kept indefinitely, EP15I D-I1 precedent) | EP16A |
| post-login (`PublicRoute`, `LoginPage` fallback), `VerifyEmailPage` signed-in link, `OnboardingPage` completed | `/dashboard` | `/today` | EP16A |
| `/plan` | saved week + preview mode + `TodayPlanCard` + plan note | saved week + Remaining work + one action (Plan my week / Replan my week) | EP16C |
| `/plan/proposal` | — | `PlanProposal` (protected); on **Use this plan** → `/today`; **Not now** → `/plan` | EP16C |
| `/plan/health` | `PlanHealthView` | `<Navigate to="/plan" replace />` | EP16C |
| `/plan/health/catch-up` | `CatchUpPreview` | `<Navigate to="/plan/proposal" replace />` | EP16C |
| `/catch-up` | → `/plan/health` | → `/plan` | EP16C |
| `/catch-up/preview` | → `/plan/health/catch-up` | → `/plan/proposal` | EP16C |
| `/focus`, `/focus/history`, `/calendar`, `/assignments`, `/courses`, `/courses/:id`, `/semesters`, `/profile`, `/onboarding`, auth routes | unchanged | unchanged (links into them change: EP16D) | — |

Redirect tests follow `app/appRoutes.test.tsx` (EP13E pattern). The `*` → `/`
fallback is unchanged.

## Today — region contract (AC-E16-02…05; D16-3, D16-8, D16-12)

Order is fixed; a region with nothing to show renders **nothing** (D16-12 (10)).

| # | Region | Source | Shows when | Owner |
|---|---|---|---|---|
| 0 | Header: `h1` "Today", day line (civil date; "Times shown in `<zone>`" only when profile zone ≠ browser zone — D16-10), refresh control, **Add assignment** (EP05C control, `data-assignment-focus="add"`) | `GET /calendar/events` (`today`, `timeZone`) | always | EP16A |
| — | Page live region `role="status"` — the only one on the page (D-D13) | derived | always | EP16A |
| 1 | **Hero + today's rows** — `TodayPlanCard` unchanged except its empty-state primary reads **Plan my week** → `/plan/proposal` | `GET /study-plans/today` | always (own states) | EP16A |
| 2 | **Plan note** — one sentence, no numbers: "Some earlier sessions moved into your current plan — today's list is up to date." + link **See your week** → `/plan` | `GET /study-plans/recovery-summary` (`rolledForwardCount > 0`) | work moved forward in the last 7 days | EP16B |
| 3 | **Momentum row** — `MomentumWeekStrip compact` + `weeklyLine` (+ `runLine` when present) + link **See history** → `/focus/history`; no bar, no card chrome, no daily sentence (the hero's badge carries today's minutes) | `GET /study-sessions/momentum` | `hasHistory` (otherwise nothing — the hero is the call to action) | EP16B |
| 4 | **Coming up** — unfinished assignments; past-due first (due asc), then due asc, null due last; cap 5 (`limitRows`); text badge **Past due**; footer link **All assignments** → `/assignments`; rows = `DashboardAssignmentRow` → `onOpenDetails` | `GET /assignments` via `selectOverdueAssignments` + `selectUpcomingAssignments` | ≥ 1 unfinished assignment | EP16B |
| 5 | **Classes today** — one line: "Classes today · 10:00 BIO 101 · 14:00 MATH 201", each a link to its course | `selectTodayClasses` | ≥ 1 class | EP16B |

Removed (EP16A): `OverdueAssignmentsSection`, `UpcomingDeadlinesSection`,
`TodayClassesSection`, `TodayStudySessionsSection`, `dashboardEmptyStates`,
the "Welcome back" line and the "View Profile" button. Kept: the single
`useAssignmentActions` + `AssignmentDialogs` mount (D05-17), the request
window as page state (EP05B), the day-line "no client date arithmetic" rule
(D05-6).

## Copy rules (AC-E16-03; D13-9, D15-14, D16-12)

- Forbidden on every EP16 surface (user-visible text, case-insensitive):
  `missed`, `behind`, `overdue`, `failed`, `late`, and the `%` character.
  Allowed: **Past due** (badge), **Moved forward**, **Set aside**.
- No heading carries a count. No percentage anywhere. The plan, never the
  student, is the subject of any sentence about change.
- Labels: **Plan my week** / **Replan my week** / **Use this plan** / **Not
  now** / **Start focus** / **Just 10 min** / **Resume focus** / **See your
  week** / **See history** / **All assignments** / **Back to session**.
- Test helper (EP16B, `apps/web/src/test/forbiddenWords.ts`, new):
  `expectNoForbiddenWords(container)` asserting the list above against
  `textContent`; reused by EP16C–EP16E (TR-E16-05).

## One planning flow — data path (AC-E16-06…08; ▲ D16-4 (a), D16-5)

| Step | Call (entity client, `entities/study-plan/api/studyPlanApi.ts`) | Notes |
|---|---|---|
| Open proposal | `previewCatchUp()` → `CatchUpPreview` | same engine as `preview` (`study-plans.service.ts:1186` vs `:1123`); additionally returns `missedSessions` (rolled forward, last 7 days), `lockedPreserved`, `completedPreserved` |
| Edit | client-held `ProposedSession[]` via `flattenPreview` / `PlanSessionEditor` | unchanged |
| Lock toggle inside the proposal | `setPlannedSessionLock(id, locked)` | `CatchUpLockToggle`, unchanged |
| Confirm | `confirmCatchUpPlan(from, to, projectSessions(edited))` | replaces only `SCHEDULED && !locked` rows in one transaction (`:1427-1444`); 409 conflicts → rows marked; `WINDOW_ROLLED_OVER` → "Create new plan" |
| Saved week on `/plan` | `listStudyPlan()` | unchanged |
| Remaining work on `/plan` | `listRemainingWork()` | unchanged |

`previewStudyPlan()` and `saveStudyPlan()` lost their last caller in EP16C (shipped 2026-11-18);
they stay in the entity client marked `@deprecated` with a pointer to
BL-16-01 (V-16-4 recorded in EP16C's implementation record).

Proposal surface composition (**as shipped by EP16C, 2026-11-18**; D-C6, D-C12):
header (`h1` "Your proposed week", window line per D-C5, one-line summary "N
sessions · about X this week", **Use this plan**, **Not now**) → rolled-over
banner → `CalibrationNote` → `PlanWeek` → `PlanSessionEditor` → conflict
summary → **What this plan keeps** (`WhatThisKeepsCard`, ex
`CatchUpPreservationCard`, with the lock toggles) → **Moved forward into this
plan** (`MovedForwardList`) → `WorkloadWarnings`. Empty proposal ("Nothing new
to schedule"), error ("We couldn't build a plan proposal. Try again.") and
rolled-over ("This proposal's week has ended. Create a new plan for this
week.") states; a 409 is reported once, by the inline conflict summary (D-C11 —
no duplicate toast). Confirm lands on `/today`; Not now on `/plan`.

## Session indicator (AC-E16-10; D16-11)

- Read: `getCurrentStudySession()` (`GET /study-sessions/current`) on every
  `location.pathname` change and on `visibilitychange` → visible; no interval
  polling. Hidden on `/focus` itself (the timer is the page).
- Render (header, every other page): `ACTIVE` → "Running · mm:ss" ticking
  client-side from the payload (shared elapsed helper extracted from
  `useFocusSession`, EP16D); `PAUSED` → "Paused · mm:ss" static; `null` or
  `COMPLETED` → nothing.
- Control: one link **Back to session** → `/focus`. Appearance announced once
  via `aria-live="polite"`; the tick is `aria-hidden` (a live mm:ss would
  chatter).
- Logout or an account switch clears it: the provider resets on a `user.id` change and drops responses from an earlier read (EP16D D-D8); the store-wide per-student cache reset is EP16G (D16-19). (Planner correction 2026-11-18: no store reset existed.)

## Navigation contract (AC-E16-09, AC-E16-11; D16-6 (a), D16-7)

```ts
authenticatedNavGroups = [
  { id: 'today',    label: 'Today',    to: '/today' },
  { id: 'plan',     label: 'Plan',     to: '/plan' },
  { id: 'calendar', label: 'Calendar', to: '/calendar' },
  { id: 'work',     label: 'Work', items: [
      { id: 'assignments', label: 'Assignments', to: '/assignments' },
      { id: 'courses',     label: 'Courses',     to: '/courses' } ] },
];
unauthenticatedNavGroups = [{ id: 'home', label: 'Home', to: '/' }];
accountMenuItems — unchanged (Profile, Verify email*, Logout).
```

In-page links replacing removed entries: Courses page header → **Semesters**
(`/semesters`); Focus page header → **Study history**; Today momentum row →
**See history**; Focus empty state → **Go to Today**. The tab bar (EP16E)
renders the same contract on narrow viewports (shape per ▲ D-E1).

## Known windows between sequential children (D16-17)

| Window | What is temporarily true | Closed by |
|---|---|---|
| after EP16A, before EP16D | the nav's first entry is re-pointed to Today by EP16A, but Academics/Planning/Focus groups still exist; "Plan health" still opens the old page; "Home" (signed-in) redirects to Today | EP16D |
| after EP16A, before EP16B | Today shows header + hero only (no deadlines, no classes, no momentum) | EP16B |
| after EP16A, before EP16F | `apps/web/e2e/*` still `goto('/dashboard')` (works via redirect). EP16A re-pointed the exact-URL assertion `adaptive-scheduling.spec.ts:169` and the four post-login URL assertions (`helpers.ts:210`, `auth-journeys.spec.ts:109,143`, `login.spec.ts:59` — F-EP16A-02). Journey 6's momentum-card assertions became a Today badge check; the momentum-row assertion is owed by EP16F's `today.spec.ts` (F-EP16A-03). Full rewrite in EP16F | EP16A (minimal), EP16B (row), EP16F |
| after EP16C, before EP16F | EP16C re-points every e2e journey whose content has a new home (refined 2026-11-18, D-C10): `catch-up.spec.ts` (`/plan/health` → `/plan`, `/plan/health/catch-up` → `/plan/proposal`; test ids kept), plus the "Generate plan" / "Save plan" / `/plan/health` steps in `adaptive-scheduling.spec.ts`, `schedule.spec.ts` and `study-plan.spec.ts` (test-only). Only `catch-up.spec.ts:616` (the plan-health page's own content) gets `test.fixme`, naming EP16F. EP16C-AC4's search expects hits in the retained `CatchUpPreview` payload type (`entities/study-plan`) and in `navGroups.ts` / `Header.test.tsx` "plan-health" until EP16D; EP16C-AC5's caller check excludes `studyPlanApi.test.ts` (the deprecated functions' contract test) | EP16C (minimal), EP16D (nav), EP16F |
| after EP16D, before EP16F | `adaptive-scheduling.spec.ts:414-430` opens the removed Planning/Focus menus; EP16D re-points it to the new entries (test-only, refined 2026-11-18) | EP16D (minimal), EP16F |
| after EP16D, before EP16E | on narrow viewports the drawer still lists the four primary entries | EP16E |

## Code baseline (inspected 2026-11-17)

- Routes: `apps/web/src/app/App.tsx:30-87`; `widgets/public-route/ui/PublicRoute.tsx:17`; `pages/login/ui/LoginPage.tsx:41`; `pages/verify-email/ui/VerifyEmailPage.tsx:176`; `pages/onboarding/ui/OnboardingPage.tsx:53`; `pages/home/ui/HomePage.tsx:21`.
- Dashboard: `pages/dashboard/ui/DashboardPage.tsx` (418 lines; regions at `:348-404`); `features/dashboard/{model,ui}` incl. `dashboardSelectors.ts`, `dashboardSection.ts` (shared `DashboardSectionStatus`, `eventTimeRange` — imported by today-plan, momentum, plan), `dashboardRange.ts`, `DashboardQuickActions.tsx`, `DashboardAssignmentRow.tsx`.
- Today plan: `features/today-plan/ui/TodayPlanCard.tsx` (hero at `:117-170`, empty state `:101-112`), `TodayPlanRow.tsx`, `model/useStartPlannedSession.ts`, `api/todayPlanApi.ts`.
- Momentum: `features/momentum/ui/MomentumCard.tsx`, `MomentumWeekStrip.tsx` (`compact` prop exists), `model/momentumCopy.ts`.
- Plan: `pages/plan/ui/PlanPage.tsx` (383 lines; note `:233-245`; header actions `:197-218`); `features/study-plan/ui/{PlanWeek,PlanSessionEditor,RemainingWorkSection,WorkloadWarnings,CalibrationNote}.tsx`; `features/study-plan/lib/preview.ts`.
- Plan health / catch-up: `pages/plan-health/ui/PlanHealthPage.tsx`; `features/plan-health/{api/planHealthApi.ts, ui/PlanHealthView.tsx, ui/MovedForwardList.tsx, ui/UnfinishedWorkList.tsx}`; `features/catch-up/ui/{CatchUpPreview,CatchUpPreservationCard,CatchUpLockToggle}.tsx`.
- Store: `app/store/store.ts:18-46` registers `assignmentsApi`, `calendarApi`, `todayPlanApi`, `planHealthApi`, `momentumApi`.
- Header: `widgets/header/ui/Header.tsx` (desktop nav `:497-525`, auth area `:528-552`, drawer below); `navGroups.ts`; `widgets/layout/ui/Layout.tsx` (skip link, `<main id="main-content">`).
- Focus: `pages/focus/ui/FocusPage.tsx` (empty state `:75-87`); `features/focus-session/model/useFocusSession.ts`; `entities/study-session/api/studySessionApi.ts:74` `getCurrentStudySession`.
- Courses: `pages/courses/ui/CoursesPage.tsx:100` (`h1`); History: `pages/focus/history/ui/StudyHistoryPage.tsx:127`.
- Button: `shared/ui/Button.tsx:45-70` — while `isLoading` the children are replaced by an `aria-hidden` spinner, so the accessible name is lost (F-EP15G-03).
- E2E: `apps/web/e2e/` — `helpers.ts:209`, `adaptive-scheduling.spec.ts` (`/dashboard` ×8, `/plan/health` ×3, `/catch-up` ×2), `auth-journeys.spec.ts` (`/dashboard` ×3), `catch-up.spec.ts` (`/plan/health*` ×12).
- **Resolved at refinement (2026-11-18):**
  - No elapsed helper exists: the arithmetic is inline in `useFocusSession.ts:76-78` and the formatter is private in `FocusTimer.tsx:29-38`, so EP16D extracts `entities/study-session/model/elapsed.ts`.
  - The drawer is at `Header.tsx:577-748`; the route-change close is at `:416-420`.
  - **No store reset on logout exists**, so EP16G adds one (D16-19).
