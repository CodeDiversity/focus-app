# EP16 combined review — pass 1

**Date:** 2026-11-18
**Reviewer:** parent_review (fresh session, independent)
**Reviewed commit:** `0827fe4` (clean working tree; worktree `oak`)
**Scope:** the EP16 review unit — EP16A, EP16G, EP16B, EP16C, EP16D, EP16E, EP16F, EP16H, EP16I (D16-20; EP16J/EP16K cancelled for this epic by the user 2026-11-18 and out of the unit). Baseline `8d69995`; per-child commits as listed in the [parent index](./implementation.md) § 2 and confirmed against `git log 8d69995..0827fe4`.

**Recorded user waivers honored (sources: [history.md](../../history.md), child records):**

- Every TR-E16-04 manual pass was **accepted as passed by the user on 2026-11-18** ("mark all manual passes as passed/accepted") — treated as closed by user sign-off (R-EP15K-02 precedent); no fresh manual evidence demanded. Covers: EP16D strip screen-reader/360 px checks, EP16E tab-bar screen-reader/320–360 px checks, EP16F's with-banner hero check and 320×568 label fit, EP16H's once-only announcement, EP16I's 320 px one-line check.
- The plan review for EP16G's new invariant was waived by the user (recorded in history.md, 2026-11-18); this combined review covers EP16G.

## Reviewer-executed verification

All runs by this reviewer at commit `0827fe4`, clean tree, 2026-11-18. cwd `apps/web` unless stated.

| # | Command (cwd) | Result | Exit |
|---|---|---|---|
| 1 | `npx vitest run` (`apps/web`) | **134 files, 1440 passed, 0 failed** — matches the EP16I record exactly | 0 |
| 2 | `npx tsc --noEmit -p tsconfig.json` (`apps/web`) | clean | 0 |
| 3 | `npx eslint src --max-warnings=0` (`apps/web`) | clean (read-only; no `--fix`) | 0 |
| 4 | `npx jest src/domain/study-planning` (`apps/api`) | **12 suites, 291 passed** (EP13J identity + EP15 determinism untouched) | 0 |
| 5 | `git diff --stat 8d69995..HEAD -- apps/api` (repo root) | **empty** — frontend-only confirmed (D16-13, AC-E16-13) | 0 |
| 6 | `DATABASE_URL=postgresql://michaelrobert@localhost:5432/sp_rev_ep16_1795048000 JWT_SECRET=review-placeholder pnpm test:e2e` (`apps/web`; throwaway DB created/dropped by reviewer) — run 1 | 70 passed, **1 failed** (`adaptive-scheduling.spec.ts:289` journey 5 — absorption offer not visible in 15 s), 2 did not run (journeys 6–7, serial file) | 1 |
| 7 | same — run 2 (flake re-run; ports :4100/:3100 verified clear first) | 69 passed, **2 failed** (journey 5 again; `schedule.spec.ts:441` — login `getByLabel('Email')` fill hit the 30 s test timeout), 2 did not run | 1 |
| 8 | `npx playwright test adaptive-scheduling.spec.ts:289 schedule.spec.ts:441 --repeat-each=2` (isolation) | **4 passed** (29.6 s) | 0 |
| 9 | `npx playwright test adaptive-scheduling.spec.ts` (whole file alone, fresh throwaway DB) | **7 passed** (17.3 s) — journeys 5, 6 and 7 all green | 0 |
| 10 | `node tools/queue-lint.mjs docs/stories/EP16` (repo root) | clean (15 files) | 0 |

**E2E disposition.** Every journey in the suite passed at least once under reviewer execution (runs 6–9 jointly cover all 73). The two full-suite failures are timing-shaped (an offer not appearing within its budget after a clock fast-forward; a login form fill over the test timeout), both passed immediately in isolation, both are pre-EP16 surfaces (EP13 absorption, EP15J schedule axe), and both match the disclosed cold-run/parallel-load flake families (BL-15-08, F-EP14C-01). The machine was heavily loaded during the full runs (load average ≈ 19; other sessions' stacks active — an `elm`-worktree API/web pair was observed holding :4100/:3100 at one point, left untouched per shared-machine rules; one Playwright pre-start probe also failed transiently on :4100, the F-EP16F-05 family). I treat the full-suite instability as environment, not product (R-EP16-04, Polish). EP16F's own recorded 73/0/0 ×3 stands as implementer evidence.

## Findings

| ID | Severity | Requirement / source | Observed gap | Owner | Closure condition |
|---|---|---|---|---|---|
| R-EP16-01 | **Should-fix** | AC-E16-12 / DoD WCAG 2.2 AA target (epics README); EP16C DoD-5 states | EP16C's own error states fail AA contrast: `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx:161` (new surface, D-C8 error card) and `apps/web/src/pages/plan/ui/PlanPage.tsx:114` (page rebuilt by EP16C) render `text-sm text-danger` on `bg-danger/10` — the identical token pair axe measured as **serious** (<4.5:1) in F-EP16F-04 | implementer | The two EP16C-owned error states use `danger-strong` (or any ≥ 4.5:1 token) with a test (unit class assertion or an axe stop that reaches the error phase); correction committed and independently verified |
| R-EP16-02 | Polish | AC-E16-12 (pre-existing surfaces); parent index known gap 3 | The same `text-danger`-on-tint pair on surfaces EP16 did not change: `TodayPlanCard.tsx:87,182`, `FocusPage.tsx:70`, `WorkloadWarnings.tsx:50`, `RemainingWorkSection.tsx:76` — none reached by an axe stop | planner | A backlog row for the token sweep (or fold into R-EP16-01's fix if trivial) |
| R-EP16-03 | Polish | AC-E16-02 (visible without scrolling at 360×640) | For an **unverified** student the EP01 "Verify your email" banner (~290 px) pushes Start focus to y ≈ 817 at 360×640 (F-EP16F-01); `today.spec.ts` asserts the AC with the banner dismissed and records the measurement as an annotation. Deferral to **BL-16-08** recorded by the planner; the with-banner manual check was user-accepted 2026-11-18 | planner | BL-16-08 lands, or the user re-rules the AC's scope |
| R-EP16-04 | Polish | EP16F-AC4 ×3-green intent; BL-15-08 | Under cross-session load the full suite is not reliably green in one pass (reviewer runs 6–7: 1–2 timing failures per run, all green in isolation; plus one webServer port-probe race, F-EP16F-05 family). Already tracked by BL-15-08; this is corroborating evidence, no new mechanism found | planner | BL-15-08's harness work (port/process-group fix, budget headroom) |

### R-EP16-01 details

Pre-fix comparison: `git show 2453e60~1:…/PlanProposal.tsx` shows the 409 conflict summary used exactly `text-sm text-danger` on `card border-danger/30 bg-danger/10` — the combination axe flagged serious ×2 — and F-EP16F-04 fixed **only** that summary (`danger-strong`, now at `PlanProposal.tsx:207-212`). The error card three lines above it (`:160-162`) and the rebuilt `/plan` error card (`PlanPage.tsx:113-115`) kept the failing pair. Computation with the shipped tokens (`--color-danger: 220 38 38` on 10 % danger over `--color-surface: 255 255 255` → blended ≈ rgb(252 233 233)): contrast ≈ **4.14:1**, below the 4.5:1 minimum for `text-sm`. These are EP16C deliverables — `PlanProposal.tsx` is a new component whose error card D-C8 specified, and `PlanPage.tsx` was rewritten by EP16C — so AC-E16-12's "every new or changed surface" binds them. The parent index's known gap 3 lists `PlanPage` under "pre-existing" and omits `PlanProposal`'s error card; the history row for F-EP16F-04 explicitly flagged the sweep "for the combined review", which is this disposition: the two EP16-owned instances are in scope (Should-fix); the genuinely pre-existing siblings are R-EP16-02 (Polish). Green tests do not downgrade this: no axe stop or unit test renders these error states, which is why it survived.

### Deviations judged (flagged by the implementer)

| Deviation | Judgment |
|---|---|
| **F-EP16E-01** — the signed-in mobile menu button is md-gated (`Header.tsx:589`) instead of the story's CSS-only hide | **Accepted.** Behavior below `md` is unchanged (AC3's substance); the gate is what keeps "Open account menu" unique in the DOM and one Primary-adjacent control set per width (the same D-E2 principle AC1 demands). The signed-out button keeps the CSS-only hide, so D-E4's "unchanged" holds. Recorded, reasoned, tested. No finding. |
| **EP16I AC2 gating** — the "· target reached" suffix sits in the same `sm`-gated span as "of 25 min" (`SessionIndicator.tsx:94-98`) | **Accepted.** AC1 explicitly gates the target suffix for the 320 px one-line fit; AC2 is silent on gating, and below `sm` the strip shows EP16D's baseline — no information regression, same rule for both target strings. Recorded in the EP16I record. No finding. |
| **F-EP16F-01** — `today.spec.ts` asserts AC-E16-02 with the banner dismissed; banner → BL-16-08 | **Accepted as recorded deferral**, kept visible as R-EP16-03 (Polish). The banner is an EP01/SP-109 surface outside EP16's children; the measurement is preserved as a test annotation; the planner's correction-log row and the user's 2026-11-18 acceptance of the with-banner manual check cover it. |

## Per-child AC outcomes

Evidence: reviewer code inspection at `0827fe4` plus reviewer-executed tests (table above). "unit" = covered by the 1440-green vitest run; "e2e" = covered by the reviewer's Playwright runs 6–9.

| AC | Status | Evidence |
|---|---|---|
| EP16A-AC1 | satisfied | `pages/today/ui/TodayPage.tsx` (h1/day line/refresh/Add assignment/single `role="status"` at `:176`/hero first); 360×640 via EP16F e2e (banner dismissed — R-EP16-03); unit `TodayPage.test.tsx`, `dayLine.test.ts` |
| EP16A-AC2 | satisfied | `app/App.tsx:43-44` (`/today`, `/dashboard` redirect); `HomePage.tsx:11`, `PublicRoute.tsx:17`, `LoginPage.tsx:41`, `VerifyEmailPage.tsx:176`, `OnboardingPage.tsx:53` all target `/today`; nav first entry `navGroups.ts:64`; e2e `today.spec.ts` (d) |
| EP16A-AC3 | satisfied | `TodayPlanCard.tsx` empty state + `PLAN_MY_WEEK_HREF = '/plan/proposal'` (re-pointed by EP16C); unit |
| EP16A-AC4 | satisfied | reviewer re-ran the AC4 search: only `App.tsx:44` (redirect) and `e2e/today.spec.ts:215` (the redirect journey itself) reference `/dashboard`; `features/today/**` keeps the named exports |
| EP16A-AC5 | satisfied | `shared/ui/Button.tsx:49-53,78` (`aria-busy`, `sr-only` children while loading); unit `Button.test.tsx` |
| EP16G-AC1 | satisfied | `app/store/resetOnUserChange.ts:35-48` (listener on `clearUser`/`setUser`); reviewer-run `resetOnUserChange.test.ts` AC1 green on the real store |
| EP16G-AC2 | satisfied | `resetOnUserChange.ts:40-42` (same-id early return via `getOriginalState()`); test AC2 positive + negative |
| EP16G-AC3 | satisfied | `pages/today/ui/TodayPage.crossStudent.test.tsx` — A's title absent synchronously after logout, B re-reads (2 reads), real store + axios adapter |
| EP16G-AC4 | satisfied | `resetOnUserChange.test.ts` AC4 derives RTK-shaped slices from the real store and equates to `PER_STUDENT_APIS` (6 slices incl. `sessionApi`); `createAppStore.ts` is the single config for app (`store.ts`) and tests (`test/providers.tsx`) — F-EP16G-01 verified |
| EP16B-AC1 | satisfied | `features/today/ui/PlanNote.tsx` (ready + `rolledForwardCount > 0` only, no digit); `PlanPage.tsx` has no note; unit |
| EP16B-AC2 | satisfied | `MomentumRow.tsx` (compact strip, `weeklyLine`/`runLine` parity — TR-E16-06, sr-only h2, no card/bar); `MomentumCard` deleted; unit |
| EP16B-AC3 | satisfied | `ComingUp.tsx:34-36` (`selectComingUp` + `limitRows(…, 5)`), `DashboardAssignmentRow.tsx:39,70` (neutral **Past due** badge); nothing when empty (`:35`); shared owner via `TodayPage`; unit |
| EP16B-AC4 | satisfied | `ClassesToday.tsx` (D-B10 format/labels); D-B9 live sentence with uncapped totals; unit |
| EP16B-AC5 | satisfied | `test/forbiddenWords.ts` (whole-word + `%`, text + aria-label/title/alt); copy audits across region and page tests; unit |
| EP16C-AC1 | satisfied | `PlanPage.tsx:76` (Plan/Replan), `:102` (navigate, no preview call), `:141` (RemainingWork unconditional); no hero/preview/Generate/Save/note; unit (but see R-EP16-01 for its error card's contrast) |
| EP16C-AC2 | satisfied | `features/plan-proposal/ui/PlanProposal.tsx` + `model/useProposal.ts` (D-C6 order, focus-to-h1, keeps/moved-forward conditional); unit (20 + 8 cases); e2e `plan-flow.spec.ts` |
| EP16C-AC3 | satisfied | confirm → toast + `/today` with the three-slice cache reset first (`PlanProposal.tsx:70-73`, F-EP16F-02 fix verified); 409 inline-only (D-C11); D-C9 unmount rule; unit + e2e |
| EP16C-AC4 | satisfied | `App.tsx:69-73` — four flat `replace` redirects; `pages/plan-health`, `features/plan-health`, `features/catch-up` gone (reviewer-verified by filesystem); recorded searches consistent with the flagged exceptions |
| EP16C-AC5 | satisfied | `studyPlanApi.ts:47,56` `@deprecated` → BL-16-01; reviewer re-ran the caller search — no caller outside the entity client and its contract test; copy audits green |
| EP16D-AC1 | satisfied | `navGroups.ts:63-76` exactly the contract; account menu unchanged (`:96-106`); EP11 keyboard cases re-targeted and green; unit (`navGroups.test.ts`, `Header.test.tsx`) |
| EP16D-AC2 | satisfied | `SessionIndicator.tsx` (strip, persistent polite span `:83`, aria-hidden ticking group `:89`, hidden on `/focus` `:42`, 44 px link `:103`); `CurrentSessionProvider.tsx:69-77` (pathname/visibility reads, no interval); unit + e2e `navigation.spec.ts` |
| EP16D-AC3 | satisfied | provider resets synchronously and bumps the generation on `user.id` change (`CurrentSessionProvider.tsx:72-75`); strip additionally gates on `ownerId === user?.id` (`SessionIndicator.tsx:44`); unit logout-isolation cases green |
| EP16D-AC4 | satisfied | `CoursesPage.tsx` Semesters link; `FocusPage.tsx:86-101` (h1 "Focus session", Study history link, "Go to Today" primary); unit + e2e |
| EP16D-AC5 | satisfied | `Header.tsx:429` (skip `REPLACE`), `:438` (close on `user?.id` change); `Header.postLogin.test.tsx` reproduction recorded pre-fix in the EP16D record, kept as regression; BL-14-07 closed |
| EP16E-AC1 | satisfied | `TabBar.tsx` (five `mobileTabItems` tabs, `NavLink` without `end` — D-E7); `Header.tsx:523,556` md-gated desktop nav/auth; one Primary landmark per width (unit `Layout.test.tsx` ×4; e2e `navigation.spec.ts`) |
| EP16E-AC2 | satisfied | `Layout.tsx:32` `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` exactly when the bar shows; skip link kept; unit |
| EP16E-AC3 | satisfied | Account-only signed-in drawer, "Open/Close account menu" naming (`Header.tsx:328,599`); mechanics unchanged; F-EP16E-01 deviation accepted (above); unit |
| EP16E-AC4 | satisfied | `useTabBarVisible.ts:20-26` (md/auth/focus-while-active rules, unsettled guard); `FocusPage` `refresh()` after Finish; no entrance animation; unit |
| EP16E-AC5 | satisfied | copy audit green (unit); manual halves user-accepted 2026-11-18 (waiver honored) |
| EP16F-AC1 | satisfied | `today.spec.ts` (4 journeys; V-16-3 at `:58-114` with the banner-dismissed condition and annotation — R-EP16-03); green in reviewer runs |
| EP16F-AC2 | satisfied | `plan-flow.spec.ts` (10 journeys: lock-preservation, Not-now, 409 via pinned row, route matrix, axe stops, EP08F test ids); green in reviewer runs |
| EP16F-AC3 | satisfied | `navigation.spec.ts` (5 journeys incl. `RETIRED_SHELL_TEXT` negatives at `:34`, one-landmark checks, strip placement); green in reviewer runs |
| EP16F-AC4 | satisfied | no `fixme` in `apps/web/e2e` (reviewer grep); `helpers.ts` lands on `/(onboarding|today)/` + `completeOnboardingViaApi`; API gate re-run by reviewer 291/0; reviewer's full-suite runs green-in-aggregate (see E2E disposition; full-pass stability is R-EP16-04/BL-15-08) |
| EP16F-AC5 | satisfied | the parent index exists with inventory, diff ranges, commands, ownership, gaps; reviewer-verified against `git log` and the records (one inaccuracy noted in R-EP16-01 details: gap 3's "pre-existing" label for PlanPage) |
| EP16H-AC1 | satisfied | `SessionIndicator.tsx:31` (`PAUSE_NUDGE_SECONDS = 900`), baseline copy below threshold; unit (pinned-clock 14-min case) |
| EP16H-AC2 | satisfied | `:58-63` (60 s paused-only render tick, no new read), `:69-70,76-78,92,105` (copy/link/sentence switch, announced once); unit |
| EP16H-AC3 | satisfied | resume returns "Running"; copy audit green; unit |
| EP16I-AC1 | satisfied | `:94-98` `hidden sm:inline` target suffix; live sentence digit-free (`:73-79`); unit |
| EP16I-AC2 | satisfied | `:72` reached rule (`floor(elapsed/60) >= target`), "· target reached"; gating interpretation accepted (above); unit |
| EP16I-AC3 | satisfied | `plannedMinutes: null` → EP16D copy exactly; copy audit; unit |

## DoD (shared, docs/epics/README.md)

| DoD | Verdict | Evidence |
|---|---|---|
| 1 functional ACs | **FAIL (one item)** | Every child AC above is satisfied; the epic-level AC-E16-12 contrast obligation fails on EP16C's two error states — **R-EP16-01**. Everything else passes. |
| 2 invalid-input validation | N/A | No new inputs (proposal reuses `PlanSessionEditor` validation) — per plan |
| 3 student data scoping | PASS | EP16G: reviewer-run tests on the real store (AC1–AC4) + code inspection of `resetOnUserChange.ts`/`createAppStore.ts`; EP16D-AC3 indicator isolation (generation guard + `ownerId` gate) reviewer-inspected and unit-verified; no new server reads; API untouched (gate #5) |
| 4 actionable API errors | PASS | EP16C 409 inline summary with reasons, `WINDOW_ROLLED_OVER` → "Create new plan", server-message toasts; unit + e2e 409 journey |
| 5 loading/empty/error states | PASS | Present and handled on every EP16 surface (D-B3/D-B7 region states, D-C7/D-C8, D-D4 silent strip, tab-bar unsettled guard); the *styling* defect of two error states is carried under DoD-1/R-EP16-01 |
| 6 keyboard accessibility | PASS | EP11 menu model re-targeted and green; strip link in tab order; tab bar native links with inset rings; proposal focus-to-h1 and post-retry focus; unit-verified (reviewer run #1) |
| 7 responsive layouts | PASS | 360/320 px rules unit-asserted (44 px targets, grid-cols-5, `hidden sm:inline`); e2e narrow journeys green in reviewer runs; V-16-3 with the recorded banner condition (R-EP16-03); 320×568/with-banner manual halves user-accepted |
| 8 automated tests | PASS | Reviewer-executed: web 1440/0, API 291/0, e2e all journeys green (aggregate); TR table below |
| 9 API/migration docs | PASS | No API change (gate #5); contracts § One planning flow updated to the shipped composition; parent index written |
| 10 integrated review | PASS | This review, on the integrated self-contained stack (reviewer e2e runs 6–9) |
| 11 reviewer walkthrough | PASS | § How to verify by hand below |

**TR coverage:** TR-E16-01/02 — unit suites per child (reviewer run #1). TR-E16-03 — the three EP16F specs (reviewer runs). TR-E16-04 — **closed by user sign-off 2026-11-18** (recorded waiver; not machine-verified, and not re-demanded). TR-E16-05 — `expectNoForbiddenWords` reused across B/C/D/E/H/I (unit). TR-E16-06 — `MomentumRow` parity cases (unit).

## Epic AC coverage (AC-E16-01…14)

| Epic AC | Status | Where verified |
|---|---|---|
| AC-E16-01 | satisfied | EP16A-AC2 + nav first entry + `today.spec.ts` (a)(d) |
| AC-E16-02 | satisfied with recorded residual | Hero first and independent (unit "hero renders while secondary reads pend"); 360×640 with banner dismissed (e2e); unverified-student residual → BL-16-08 (R-EP16-03) |
| AC-E16-03 | satisfied | EP16B-AC1–AC5; region order unit case; no count headings; copy audit |
| AC-E16-04 | satisfied | sessions list gone (EP16A); minutes once — F-EP16F-03 fix verified in `TodayPlanCard.tsx:172` + `today.spec.ts` (c) |
| AC-E16-05 | satisfied | Add assignment control kept (outline variant, F-EP16A-01, D16-12 (8)); row details via shared owner (unit) |
| AC-E16-06 | satisfied | EP16C-AC1–AC3; lock preservation e2e; grid/editing/conflicts/warnings/calibration kept; keeps + moved-forward shown |
| AC-E16-07 | satisfied | hero link → `/plan/proposal`; plan note → `/plan` (D16-18); `today.spec.ts` (b) |
| AC-E16-08 | satisfied | four redirects (`App.tsx:69-73`); page removed; moved-forward list and Remaining work re-homed; route-matrix e2e |
| AC-E16-09 | satisfied | EP16D-AC1; reachability links (Semesters/Study history/Go to Today); `navigation.spec.ts` negatives |
| AC-E16-10 | satisfied | EP16D-AC2/AC3; hidden on `/focus`; Focus empty state → Today |
| AC-E16-11 | satisfied | EP16E-AC1–AC4; `navigation.spec.ts` @360 |
| AC-E16-12 | **partially satisfied** | Keyboard, single Today live region, reduced motion, labels: verified. AA contrast fails on EP16C's two error states — **R-EP16-01** (fix) and R-EP16-02 (pre-existing sweep) |
| AC-E16-13 | satisfied | `git diff --stat 8d69995..HEAD -- apps/api` empty; API gate 291/0 (both reviewer-executed) |
| AC-E16-14 | satisfied | All journeys green under reviewer execution (aggregate across runs 6–9); new journeys added (19 across three specs); full-pass stability under load → BL-15-08 (R-EP16-04) |

## Verdict

**Changes Required — one should-fix open: R-EP16-01 (WCAG AA contrast on EP16C's `/plan` and `/plan/proposal` error states, `PlanPage.tsx:114` and `PlanProposal.tsx:161`) must be fixed and independently verified; no blocker; every other AC/DoD item passes, is N/A, or is Polish (R-EP16-02…04).**

Per passing-sync § Non-passing: this report is saved; no queue/status/history sync is performed and nothing is committed by the reviewer. The fix is follow-up implementer work; a pass-2 re-review covers the changed child (EP16C) plus cross-child behavior.

## How to verify by hand

Each item labelled per the reviewer skill. Use disposable local data only.

1. **Full automated suites** — **Executed — 2026-11-18, this environment, commit `0827fe4`**: web unit 134 files / 1440 passed; `tsc` and `eslint` clean; API domain gate 12 suites / 291 passed; Playwright self-contained on reviewer-created throwaway DBs (`sp_rev_ep16_1795048000`, `sp_rev_ep16b_1795048900`, both dropped afterwards): two full runs with 1–2 load-flake failures each, all failing journeys plus journeys 6–7 green in isolation/single-file runs (details in § Reviewer-executed verification).
2. **Landing flow** — **Executed — e2e evidence (`today.spec.ts` (a)(d), reviewer runs)**: sign in → `/today`, title "Today", hero first; `/` and `/dashboard` while signed in → `/today`. Manual browser confirmation: Not executed — user instructions: sign in, visit `/` and `/dashboard`, confirm both land on Today and Back does not bounce.
3. **Plan flow** — **Executed — e2e evidence (`plan-flow.spec.ts`, `today.spec.ts` (b))**: no plan → Plan my week → "Your proposed week" → Use this plan → Today shows the next session immediately (no stale cache); lock a session → Replan → "What this plan keeps" lists it and it survives confirm; Not now makes no confirm request; `/plan/health*`, `/catch-up*` redirect per the matrix.
4. **Cross-student cache reset (EP16G)** — **Executed — reviewer-run unit/integration tests on the real store** (`resetOnUserChange.test.ts`, `TodayPage.crossStudent.test.tsx`). Manual browser confirmation: Not executed — user instructions: sign in as student A, open Today, sign out, sign in as student B within a minute on the same tab — B sees a loading state then B's plan; A's titles never appear; `/onboarding` shows B's wizard state.
5. **Session strip and nudge (EP16D/H/I)** — Structural halves **Executed** (unit + `navigation.spec.ts`: live-sentence text, tab order, 44 px, strip on `/calendar` not `/focus`). Screen-reader read-once and the 15-minute nudge in real time: Not executed — user instructions (user-accepted 2026-11-18): start a session, go to Calendar — "Running · mm:ss" ticks, announced once; pause > 15 min → "Paused a while" + Resume; with a target, "12:34 of 25 min" then "· target reached" (≥ 640 px widths).
6. **Tab bar (EP16E)** — Structural halves **Executed** (unit + e2e @360: one Primary landmark per width, five tabs, aria-current, bar flush to bottom). VoiceOver/TalkBack reading and 320×568 label fit: Not executed — user instructions (user-accepted 2026-11-18).
7. **360×640 hero visibility (V-16-3)** — **Executed — e2e with the email banner dismissed** (boundingBox assertion, reviewer runs). With the banner (unverified student): Not executed — user-accepted 2026-11-18; residual tracked as BL-16-08 (R-EP16-03).
8. **Error-state contrast (R-EP16-01)** — **Executed — 2026-11-18, code inspection + computation + axe precedent**: `text-danger` (rgb 220 38 38) on `bg-danger/10` over white ≈ 4.14:1 (< 4.5:1); the identical pair was axe-measured serious in F-EP16F-04. To see it: stop the API and open `/plan` (saved-week error card) or `/plan/proposal` (proposal error card) — the red text on the pink tint is the failing pair.
9. **Negative/edge cases** — **Executed — unit/e2e evidence**: forbidden-word audits in every tested state; same-id `setUser` does not reset caches; failed `current` read renders no strip; empty regions render nothing; 409 keeps edits and reports once; uniform-404/ownership — Not applicable at the API layer (no API change this epic; server scoping pre-existing and untouched).
