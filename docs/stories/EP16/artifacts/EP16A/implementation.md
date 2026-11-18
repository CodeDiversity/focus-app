# EP16A implementation record

**Story:** [EP16A — Today Page and Landing Route](../../EP16A-today-page-and-landing-route.md)
**Status:** Implemented — awaiting parent review (EP16 combined review after EP16F)
**Date:** 2026-11-17
**Baseline:** `8d69995` (EP15K review pass 2 committed).
**Ordering note:** EP16's queue held EP16A behind EP15K's review (D16-1). The user instructed on 2026-11-17 to "run EP15K's review, fix any issues, and then continue on and implement EP16A". EP15K's pass 2 closed every finding except R-EP15K-02 (the manual pass, user-owned). EP16A shares no files with EP15K.
**Commit scope:** `pages/today` (new page + test); `features/dashboard` → `features/today` (`git mv`; the four section components, `dashboardEmptyStates` and their tests deleted); `features/today/model/dayLine.ts` (+ test); `pages/dashboard` deleted; route table and every landing path; nav's first entry; `TodayPlanCard` empty state; `DashboardQuickActions` variant; `shared/ui/Button` accessible name; test updates for the new landing; minimal e2e edits (contracts § Known windows); this record, story, queue, contracts, efficiency.

Decisions applied: D-A1…D-A4 as ratified (user, "ratify all", 2026-11-17). Epic D16-2, D16-10, D16-12, D16-13, D16-14 as written.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16A-AC1 — `/today`: h1, day line (zone only when it differs), refresh, Add assignment, one live region, `TodayPlanCard` first; title; nothing else | **Done; one item not verified here.** `TodayPage` composes exactly these. The live region reads "N sessions planned today" (D-A2). The page mounts the shared assignment owner once (D05-17). Add assignment is now the **outline** variant, because D16-12 (8) allows one primary control per screen and Today's is the hero's Start focus (F-EP16A-01). **Not verified here:** the 360×640 no-scroll check is a layout property jsdom can't measure. It belongs to EP16F (V-16-3). | `TodayPage.test.tsx` (7); `dayLine.test.ts` (3); `DashboardQuickActions.test.tsx` (variant updated) |
| EP16A-AC2 — every landing path → `/today`; `/` by auth state; nav's first entry Today | **Done.** `/dashboard` → `<Navigate to="/today" replace />` (inside the protected group, so a signed-out visit still lands on `/login`). `HomePage` renders nothing while the session restores, redirects a signed-in student to `/today`, and shows the marketing page otherwise; its dead CTA now reads "Go to Today". `PublicRoute`, the `LoginPage` fallback, `VerifyEmailPage` ("Back to Today") and `OnboardingPage` all target `/today`. The nav entry is now `{ id: 'today', label: 'Today', icon: Sun, to: '/today' }`; the groups are EP16D's. | `LoginPage.test.tsx`, `OnboardingPage.test.tsx`, `ProtectedRoute.test.tsx`, `Header.test.tsx` (landing targets updated); Playwright login/auth journeys |
| EP16A-AC3 — empty state: "No plan for today yet" + **Plan my week**, everything else unchanged | **Done.** The label and description changed; the link target is the exported `PLAN_MY_WEEK_HREF = '/plan'` (D-A3), which EP16C re-points to `/plan/proposal`. | `TodayPlanCard.test.tsx` (label assertion), `TodayPage.test.tsx` |
| EP16A-AC4 — rename; exports kept; dashboard page and four sections deleted; search clean | **Done.** `features/today/**` keeps `DashboardSectionStatus`, `eventTimeRange`, the selectors, `limitRows`, `dashboardRange`, `DashboardQuickActions` and `DashboardAssignmentRow`. The search below finds only the redirect route and the e2e files pending EP16F. Comments that still say "the dashboard's …" describe EP05/EP13 history and are not references to the route. | search below |
| EP16A-AC5 — loading `Button` keeps its accessible name | **Done.** While `isLoading`, children render in an `sr-only` span beside the `aria-hidden` spinner, and `aria-busy` stays. Icons are hidden while loading, as before. | `Button.test.tsx` (2 new) |

## AC4 search (recorded)

```
grep -rn "pages/dashboard\|features/dashboard\|'/dashboard'\|\"/dashboard\"" apps packages README.md \
  --exclude-dir=node_modules --exclude-dir=dist-test --exclude-dir=generated --exclude-dir=test-results
# → apps/web/src/app/App.tsx:46 (the redirect) and apps/web/e2e/{adaptive-scheduling,auth-journeys}.spec.ts
#   (goto('/dashboard') through the redirect, and the signed-out → /login checks), pending EP16F.
```

## Verification

All runs on the working tree of this commit, 2026-11-17.

- **Web** (cwd `apps/web`): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **120 files, 1321 passed, 0 failed**. The count is down from 1387 because the dashboard page and four section suites were deleted with their components; 12 tests were added.
- **API:** unchanged (`git diff --stat -- apps/api` empty; D16-13). Not re-run.
- **Playwright, full suite, external-stack mode (EP15J precedent):** a uniquely named throwaway DB (`sp_oak_ep16a_<epoch>`, migrated), `pnpm start:e2e` (`PORT=4200`, shell-only placeholder `JWT_SECRET`), `vite --port 3200` with `E2E_API_PROXY_TARGET`, then `E2E_BASE_URL=http://localhost:3200 npx playwright test` → **62 passed / 0 failed × 3** (18.0 s, 17.8 s, 17.8 s). The database was checked after each run, then dropped, and the servers stopped.
- **Earlier runs, disclosed:** one full run failed only journey 5 (`adaptive-scheduling.spec.ts:283`), which then passed 4/4 alone; that is the known parallel-load flake BL-15-08. In a later window the stack's first database (`studypilot_ep16a_e2e`) disappeared mid-run, and every journey that registers a user failed with Prisma errors and `ECONNREFUSED`. The harness drops only `*_e2e_test` databases, so the drop most likely came from outside this session. The clean ×3 above ran on a fresh, uniquely named database, which was confirmed present after each run.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16A-01 | `DashboardQuickActions.tsx`; D16-12 (8) | EP05C's quick action was the primary variant. On Today it would be a second primary beside the hero's Start focus. | **Changed to outline**, with its EP05C test updated. The control, its label, `data-assignment-focus="add"` and post-create focus are unchanged. | implementer — closed |
| F-EP16A-02 | `e2e/helpers.ts:210`, `auth-journeys.spec.ts:109,143`, `login.spec.ts:59` | contracts § Known windows said only the `helpers.ts` comment needed changing. In fact four post-login assertions match `/(onboarding\|dashboard)/`; left alone, every journey that signs in would fail. | **Re-pointed** to `/(onboarding\|today)/` in this child (test-only). Known-windows row corrected. | implementer — closed |
| F-EP16A-03 | `adaptive-scheduling.spec.ts` journey 6 | The journey asserted the dashboard's momentum card, which EP16A retires. Today's momentum row arrives in EP16B. | **Reworked, not skipped.** The journey still starts from Today, checks the post-finish celebration and the API momentum, and now asserts Today's "25 min studied today" badge plus an axe check on `/today`. The momentum-row assertion moves to EP16F's `today.spec.ts` (known window). | EP16B / EP16F |

## How to verify by hand (for the parent review)

Not executed (no interactive browser); user instructions:
1. Sign in. Expected: you land on `/today`, titled "Today"; under the header is "Today's plan" with **Start focus** / **Just 10 min**, and nothing else below it.
2. Visit `/` and `/dashboard` while signed in. Expected: both go to `/today`; Back does not bounce.
3. On a 360×640 viewport: **Start focus** is visible without scrolling.
4. With no plan: the card shows "No plan for today yet" and **Plan my week**, which goes to `/plan`.
5. With a screen reader, start a session from the card. Expected: the button keeps its name ("Start focus") while busy.
