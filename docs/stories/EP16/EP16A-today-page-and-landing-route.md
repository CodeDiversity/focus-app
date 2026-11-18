# EP16A — Today Page and Landing Route

**Story ID:** EP16A
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (2026-11-17); record: [artifacts/EP16A/implementation.md](./artifacts/EP16A/implementation.md)
**Dependencies:** none inside EP16. Epic decisions D16-2 (▲, pending), D16-10, D16-12, D16-13, D16-14 (Button item).

## Plan at a glance

- **What this changes:** a new `/today` page shows the header, the one next action and today's remaining sessions (the existing `TodayPlanCard`), and nothing else yet; `/dashboard`, `/` (signed in), post-login, post-verify and post-onboarding all land on it; the dashboard page and its six-region body are deleted; `features/dashboard` is renamed `features/today`; the day line stops printing the IANA zone id; `Button` keeps its accessible name while loading.
- **Why it improves it:** the first screen a student sees has one thing on it and one button (product, AC-E16-01/02); a 418-line page with six independently-stated sections becomes a composition root for EP16B's three regions, and a feature folder named after a page that no longer exists is renamed before more code lands in it (code).
- **Decisions needing you:** ▲ D16-2 (epic register) — recommended (a), new `/today` with `/dashboard` redirecting.
- **How to change this plan:** edit a Ruling cell below or in the epic register; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Create the landing surface and point every entry path at it. The hero is
reused unchanged apart from one label; the old sections go; the secondary
regions arrive in EP16B. The mechanical rename and two small fixes ride along
because this child touches every affected import anyway.

## Scope

**In:** `pages/today/ui/TodayPage.tsx` (+ test); route table (`/today`, `/dashboard` redirect, `/` by auth state); re-pointing `PublicRoute`, `LoginPage` fallback, `VerifyEmailPage`, `OnboardingPage` (+ `Step3Course`/`onboardingSlice` comments), `HomePage` CTA, the nav's first entry (`dashboard` → `today`, label "Today", `/today` — the group restructure is EP16D's); deletion of `pages/dashboard/**`, `OverdueAssignmentsSection`, `UpcomingDeadlinesSection`, `TodayClassesSection`, `TodayStudySessionsSection`, `dashboardEmptyStates` and their tests; `git mv features/dashboard features/today` with import rewrite; day-line helper (D16-10); `TodayPlanCard` empty-state primary → **Plan my week** → `/plan/proposal` (a redirect-free dead link until EP16C — until then it points at `/plan`, see D-A3); `shared/ui/Button` accessible name while loading; minimal e2e URL-assertion re-point (contracts § Known windows).
**Out:** Coming up, classes line, momentum row, plan note (EP16B); nav groups, session indicator (EP16D); the `/plan` page (EP16C).

## Source requirement references

AC-E16-01, AC-E16-02 (primary); AC-E16-04 (removal half), AC-E16-05 (control kept), AC-E16-07 (hero link), AC-E16-09 (`/` redirect), AC-E16-12, AC-E16-13. TR-E16-01, TR-E16-02. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. `/today` renders `TodayPage`: `h1` "Today", the day line (civil date only; "Times shown in `<zone>`" appended only when the profile zone differs from the browser zone — D16-10), the refresh control, the **Add assignment** control (EP05C, `data-assignment-focus="add"`, post-create focus behaviour intact), the page's single `role="status"` live region (count summary reduced to the plan's sessions until EP16B adds regions), and `TodayPlanCard` directly under the header with its own loading/empty/error states; the document title is "Today — StudyPilot". No other region renders. On a 360×640 viewport the hero's primary control is visible without scrolling (D16-12 (9)).
2. Landing: `/dashboard` → `<Navigate to="/today" replace />`; `/` renders `HomePage` when signed out and `<Navigate to="/today" replace />` when signed in; `PublicRoute`'s authenticated redirect, `LoginPage`'s `from` fallback, `VerifyEmailPage`'s signed-in link and `OnboardingPage`'s completed redirect all target `/today`; `HomePage`'s signed-in CTA is unreachable (route redirects first) and its text/link are updated to Today anyway; the nav's first entry reads **Today** → `/today` (one-entry change; groups untouched).
3. `TodayPlanCard`'s empty state reads **No plan for today yet** with primary **Plan my week** (D-A3 target); every other string, control and state of the card is unchanged (EP13D/EP13I tests still pass with only the label assertion updated).
4. `features/dashboard/**` is `features/today/**`; `DashboardSectionStatus`, `eventTimeRange`, the selectors, `limitRows`, `dashboardRange`, `DashboardQuickActions` and `DashboardAssignmentRow` keep their names and exports (callers in today-plan, momentum, plan updated); `pages/dashboard/**` and the four section components + `dashboardEmptyStates` (+ tests) are deleted; a repository search for `pages/dashboard`, `features/dashboard` and `'/dashboard'` finds only the redirect route, the EP05/EP13 records under `docs/`, and e2e files pending EP16F.
5. `shared/ui/Button` with `isLoading` keeps its accessible name (children stay in the accessibility tree — e.g. rendered visually hidden beside the spinner, or `aria-label` fallback), `aria-busy` stays; a test asserts `getByRole('button', { name })` resolves while loading (BL-15-09 item, F-EP15G-03).

## Tests (TR-E16-01, TR-E16-02)

- `TodayPage.test.tsx`: renders header, live region, hero; no deadline/class/momentum/session-list region present (negative); 360×640 primary-control bounding-box assertion via jsdom layout stub is **not** reliable — recorded as EP16F's V-16-3; day-line cases: same zone (no suffix), different zone (suffix), no payload (line absent); document title.
- `appRoutes.test.tsx` additions: `/dashboard` → `/today`; `/` signed-out renders Home, signed-in redirects; `PublicRoute` → `/today`; `OnboardingPage` completed → `/today`.
- `TodayPlanCard.test.tsx`: empty-state label and link target updated; everything else unchanged.
- `Button.test.tsx`: accessible name while loading; `aria-busy` present; click disabled.
- Import-rewrite safety: `pnpm typecheck && pnpm lint && pnpm test --filter web` green; the AC4 search command recorded in the implementation record.

## Technical notes

- **Inspected:** `App.tsx:30-87`; `PublicRoute.tsx:17`; `LoginPage.tsx:41`; `VerifyEmailPage.tsx:176`; `OnboardingPage.tsx:24,53`; `HomePage.tsx:21`; `navGroups.ts:66`; `DashboardPage.tsx` (header `:299-345`, regions `:348-404`, day line `:261-263`); `TodayPlanCard.tsx:101-112` (empty state); `Button.tsx:45-70`; `store.ts` (no change — `todayPlanApi` etc. keep their reducer paths).
- **Proposed:** `features/today/model/dayLine.ts` — pure `(civilDate: string, profileZone: string, browserZone: string) => string`, formatted via the existing `formatDate(new Date(`${date}T00:00:00Z`), 'UTC')` (D05-6 arithmetic rule kept); `pages/today/ui/TodayPage.tsx` owns the request-window state, the queries and the shared assignment owner exactly as `DashboardPage` did (D05-17), composing `TodayPlanCard` now and EP16B's regions later via props/children.
- **e2e (test-only, minimal):** `adaptive-scheduling.spec.ts:169` `toHaveURL(/\/dashboard$/)` → `/\/today$/`; `helpers.ts:209` comment. Other `goto('/dashboard')` calls keep working through the redirect until EP16F rewrites them.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-A1 | Folder rename: (a) `git mv features/dashboard features/today` in this child, exports unchanged; (b) leave the folder name; (c) rename exports too (`TodaySectionStatus`…) | **(a)** — the folder is named after a page this child deletes; renaming exports is churn without a reader benefit | Ratified (user, 2026-11-17 — "ratify all") |
| D-A2 | Live-region count summary before EP16B: (a) "N sessions today" only; (b) keep the four-count sentence by keeping the queries | **(a)** — the sentence must describe what the page shows | Ratified (user, 2026-11-17 — "ratify all") |
| D-A3 | **Plan my week** target before EP16C exists: (a) `/plan` now, `/plan/proposal` once EP16C lands (EP16C updates the one constant); (b) `/plan/proposal` immediately (404-to-home until EP16C) | **(a)** — never ship a dead link inside the review unit's windows | Ratified (user, 2026-11-17 — "ratify all") |
| D-A4 | Button accessible name: (a) keep children rendered with `sr-only` while loading, spinner `aria-hidden`; (b) `aria-label` fallback from `children` text | **(a)** — no string extraction, works for icon+text children | Ratified (user, 2026-11-17 — "ratify all") |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/02). 2, 3, 4, 9 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** a signed-in student always lands on Today and can start their next session from it; the dashboard is gone.
- **Actual at closeout:** one window, one commit, 2026-11-17. Files as planned, plus four unit tests re-pointed from `/dashboard` as an arbitrary path and three more e2e post-login assertions (F-EP16A-02). Web 1321/0; Playwright 62/0 × 3. Row in [efficiency.md](./artifacts/efficiency.md).
- **Files:** `apps/web/src/pages/today/ui/TodayPage.tsx` (new, + test), `apps/web/src/features/today/**` (renamed from `features/dashboard`, minus the four sections + empty states), `apps/web/src/features/today/model/dayLine.ts` (new, + test), `apps/web/src/app/App.tsx`, `apps/web/src/app/appRoutes.test.tsx`, `apps/web/src/widgets/public-route/ui/PublicRoute.tsx`, `apps/web/src/pages/login/ui/LoginPage.tsx`, `apps/web/src/pages/verify-email/ui/VerifyEmailPage.tsx`, `apps/web/src/pages/onboarding/ui/OnboardingPage.tsx`, `apps/web/src/pages/home/ui/HomePage.tsx`, `apps/web/src/widgets/header/ui/navGroups.ts` (one entry) + header tests, `apps/web/src/features/today-plan/ui/TodayPlanCard.tsx` (+ test), `apps/web/src/shared/ui/Button.tsx` (+ test), `apps/web/e2e/adaptive-scheduling.spec.ts:169`, `apps/web/e2e/helpers.ts:209`; deletions: `apps/web/src/pages/dashboard/**`.
- **Start context:** this story; contracts.md § Route matrix, § Today region contract (rows 0–1), § Known windows; `DashboardPage.tsx`, `TodayPlanCard.tsx`, `App.tsx`.
- **Verification:** `pnpm --filter @studypilot/web typecheck && pnpm --filter @studypilot/web lint && pnpm --filter @studypilot/web test` green; the AC4 search output recorded; manual: sign in → lands on `/today`; visit `/dashboard` → `/today`.
- **Dependencies / exclusions:** EP15K's review unit passed; ▲ D16-2 ruled. Regions → EP16B; nav groups and indicator → EP16D; e2e rewrite → EP16F.
