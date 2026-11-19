# EP16F implementation record

**Story:** [EP16F — Cross-Layer E2E and Parent Index](../../EP16F-cross-layer-e2e-and-parent-index.md)
**Status:** Implemented — awaiting parent review (the EP16 combined review may start)
**Date:** 2026-11-18
**Baseline:** `90161c0` (EP16E).
**Commit scope:** `apps/web/e2e/today.spec.ts` (new), `navigation.spec.ts` (new), `catch-up.spec.ts` → `plan-flow.spec.ts` (`git mv` + rewrite, D-F1), `helpers.ts` (`completeOnboardingViaApi`), `adaptive-scheduling.spec.ts`, `auth-journeys.spec.ts`, `login.spec.ts` (old-URL re-points); **defect fixes in owning children** (EP16F's scope rule): `features/plan-proposal/ui/PlanProposal.tsx` (+ test) — F-EP16F-02 cache reset and F-EP16F-04 `danger-strong`; `features/today-plan/ui/TodayPlanCard.tsx` (+ test) — F-EP16F-03; `src/index.css`, `tailwind.config.js` (the `danger-strong` token); `artifacts/EP16/implementation.md` (parent index); contracts § Known windows closed; this record, story, queue, efficiency.

Decisions applied: D-F1 (a) rename + rewrite, D-F2 (a) `boundingBox()` (ratified 2026-11-17). Checkpoint: not needed — one session.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16F-AC1 — `today.spec.ts`: (a) sign in → `/today`, `h1`, hero control in view at 360×640; (b) no plan → Plan my week → Use this plan → next session; (c) Start → finish → momentum row + badge; (d) `/dashboard`, `/` → `/today`; axe in (a)–(c) | **Done, with one recorded condition.** (a) passes **with the "Verify your email" banner dismissed** — with it, Start focus sits at y ≈ 817 on a 640 px phone (F-EP16F-01 → BL-16-08; the test records the measurement as a Playwright annotation). (b) exposed and now verifies F-EP16F-02; (c) exposed and now verifies F-EP16F-03 ("minutes once") and asserts the momentum row's weekly line + See history; (d) also asserts `aria-current` on Today. Axe clean at 360 and 1280 in (a), and in (b) no-plan / next-session and (c) after-finish states — no allowlist. | `today.spec.ts` (4 journeys) |
| EP16F-AC2 — `plan-flow.spec.ts`: lock → Replan → "What this plan keeps" → Use this plan → lock survives; Not now no confirm; 409 marks rows; route matrix; axe on `/plan` and `/plan/proposal`; EP08F test ids resolve | **Done.** The locked journey now runs through `/plan` → **Replan my week** and asserts the heading; the 409 journey pins a proposed row (a flex row cannot clash — EP13G), collides a class meeting created after the preview, and asserts the single inline summary (D-C11), one `[data-conflicted]` row, kept edits, nothing saved; the route matrix covers the four redirects signed in and `/plan/health` → `/login` signed out; the EP16C `test.fixme` is re-homed on Remaining work ("Confirmed 45 min"). Axe stops: `/plan` (saved week), `/plan/proposal` (moved forward; locked kept; 409 — which found F-EP16F-04). Test ids `catch-up-preservation`, `plan-week`, `plan-session-editor` unchanged. | `plan-flow.spec.ts` (10 journeys incl. the 320 px pair) |
| EP16F-AC3 — `navigation.spec.ts`: desktop exact set + account menu; signed-out Home; 360×640 bar + Account drawer; strip on `/calendar` not `/focus`; Semesters from Courses, Study history from Focus; negative shell text | **Done.** Also asserts: exactly one Primary landmark at each width, 44 px tabs, the bar flush with the viewport bottom, Courses current on `/courses` (D-E7), the strip's live sentence and its tab-order position (first stop after the skip link), the bar hidden on `/focus` while running and shown on Today with the strip. | `navigation.spec.ts` (5 journeys) |
| EP16F-AC4 — every spec green ×3 on the self-contained stack; `helpers.ts` lands on `/today`; no `test.fixme`; identity/determinism API tests untouched and green | **Done.** See § Verification: 73/0/0 × 3 consecutive (self-contained). `grep -rn fixme apps/web/e2e` → none. `helpers.ts` keeps the `/(onboarding\|today)/` landing regex (new accounts land on the wizard — EP14C D-C2) and gains `completeOnboardingViaApi` so EP16F's journeys assert a bare `/today`. API: `npx jest src/domain/study-planning` → 12 suites, 291 passed (incl. `identity.spec.ts` "EP15C-AC4 identity with the EP14E engine" and `scheduler.spec.ts` § 14 determinism); `git diff --stat 90161c0..HEAD -- apps/api` empty. | logs in § Verification |
| EP16F-AC5 — parent index | **Done.** [`artifacts/EP16/implementation.md`](../EP16/implementation.md): inventory, per-child diff ranges, test commands, AC/TR/DoD ownership, decisions/deviations, known gaps incl. the uncollected TR-E16-04 passes. | the index |

## Verification

All on the working tree of this commit, 2026-11-18, cwd `apps/web` unless stated.

- `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **134 files, 1429 passed, 0 failed** (file count corrected 2026-11-18; 135 was a transcription slip) (+1: the F-EP16F-02 reset test; EP16A's done-copy test re-targeted). E2E sources type-check with `npx tsc --noEmit --skipLibCheck … e2e/*.ts` (clean).
- **Playwright, full suite, self-contained mode ×3 consecutive** (`pnpm test:e2e`; the harness derived `sp_elm_ep16f_dev_e2e_test` from a throwaway `sp_elm_ep16f_dev`, migrated, API :4100, web :3100, dropped after each run; shell `DATABASE_URL` + placeholder `JWT_SECRET` because this worktree has no `.env.local` — F-EP16D-01):
  - run 1 → **73 passed, 0 failed, 0 skipped** (44.2 s)
  - run 2 → **73 passed, 0 failed, 0 skipped** (50.6 s)
  - run 3 → **73 passed, 0 failed, 0 skipped** (1.3 min)
- **Disclosed earlier runs:** the first ×3 batch was invalid — each run's own API failed `EADDRINUSE :4100` because the Nest process of the *previous* run outlived Playwright's exit (F-EP16F-05), and the tests hit the stale server whose database the previous teardown had dropped (500s / `ECONNREFUSED`). A stale-server sweep (this worktree's listeners only, identified by cwd) between runs fixed it; the clean batch above is the evidence. Before that, iterative single-file runs found and fixed F-EP16F-01…04 (below).
- `apps/api`: `npx jest src/domain/study-planning` → 12 suites, 291 passed (1.4 s).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16F-01 | `today.spec.ts` (a), V-16-3 | At 360×640 the "Verify your email" banner (EP01/SP-109 surface) is ~290 px tall; Start focus measured at y ≈ 817 with it, in view once dismissed. Affects every unverified (new) student's first run. | Not an EP16 surface → **BL-16-08**; the test asserts AC-E16-02 with the banner dismissed and records the with-banner measurement as an annotation. | planner (backlog) |
| F-EP16F-02 | `today.spec.ts` (b); `PlanProposal.tsx` | After **Use this plan**, Today showed "No plan for today yet": the confirm writes via the entity client, so the RTK `todayPlan` / `calendar` / `recoverySummary` caches served the pre-plan result (≤ 60 s). | **Fixed in EP16C's surface:** `PlanProposal.onConfirmed` dispatches `resetApiState()` on the three slices before `navigate('/today')`; unit test asserts the three resets precede navigation; e2e (b) asserts "Next up" with the saved session. | implementer — closed |
| F-EP16F-03 | `today.spec.ts` (c); `TodayPlanCard.tsx` | AC-E16-04 "minutes appear once": the done block repeated the badge ("25 minutes studied today. Anything else is a bonus."). | **Fixed in EP16A's hero:** the done sentence is "Anything else today is a bonus."; unit test asserts a single "50 min" occurrence. | implementer — closed |
| F-EP16F-04 | axe on `/plan/proposal` (409) | `text-danger` on `bg-danger/10` fails 4.5:1 (serious ×2: the summary line and its `li`). | **Fixed in EP16C's surface:** new `danger-strong` token (`185 28 28`, EP14D D-D2 precedent) on the conflict summary. Sibling `text-danger`-on-tint error blocks elsewhere are unexercised by axe — listed as a known gap for the review. | implementer — closed; sweep → review |
| F-EP16F-05 | `playwright.config.ts` webServer + `pnpm start:e2e` | Playwright kills the `pnpm` wrapper on exit but the `nest start` grandchild keeps :4100, so consecutive self-contained runs collide (`EADDRINUSE`) and hit a stale API. | Recorded; worked around with a between-run sweep. Harness fix (spawn the API binary directly, or `nest start` with a process group) belongs to **BL-15-08**. | planner (BL-15-08) |

Deviations: none from the ACs. Product code was touched only as the scope rule allows (defects fixed in owning children, each recorded above).

## TR-E16-04 collection

EP16D (strip) and EP16E (tab bar) both recorded their manual passes as **not executed** (no interactive browser / screen reader in the implementing environment). What the automated half now proves on the real stack: one Primary landmark per width; the strip's live sentence text and tab-order position; 44 px tab targets; the bar flush to the viewport bottom; hero visibility at 360×640 (banner dismissed). Still owed to a human: VoiceOver/TalkBack read-once of the strip, "current page" on the active tab, the 320×568 "Assignments" label fit, and the hero check *with* the banner (BL-16-08). Listed in the parent index § 6.

**Update 2026-11-18 (user ruling, "mark all manual passes as passed/accepted"):** every manual pass this story collects (EP16D's and EP16E's TR-E16-04 items, the 320×568 label check, the with-banner hero check) is **accepted as passed by the user** on their authority; it was not machine-verified in this environment. The combined review may treat TR-E16-04 as closed by user sign-off (R-EP15K-02 precedent).

## How to verify by hand

Not executed (no interactive browser); user instructions: `cd apps/web && DATABASE_URL=<your dev db url> pnpm test:e2e` → 73 passed. Then, in a browser at 360×640: sign in as an onboarded student with a planned session; dismiss the email banner; Start focus is visible without scrolling, above the tab bar. Plan a week from an empty Today → **Use this plan** → Today immediately shows "Next up" (no stale "No plan for today yet"). Finish a session → Today shows "25 min studied today" once and the momentum row "1 of 3 days this week". Pin a proposal row, add a class meeting on its slot, **Use this plan** → one red summary (readable contrast), the row outlined, nothing saved.
