# EP16 — parent implementation index (review unit)

**Epic:** [EP16 Today-First Simplification](../../../../epics/EP16-today-first-simplification.md) · **Breakdown:** [README](../../README.md) · **Contracts:** [contracts.md](../../contracts.md) · **History:** [history.md](../../history.md)
**Written by:** EP16F's implementer (live session), 2026-11-18, per [review-cadence](../../../../../.agents/review-cadence.md).
**Status:** ready for the combined review of EP16A–EP16G. Optional children EP16H–EP16K (D16-20) join this unit only if the user accepts their ▲ rows; none has been implemented.

## 1. Child inventory

| # | Child | Outcome | Record | State |
|---|---|---|---|---|
| 1 | [EP16A](../../EP16A-today-page-and-landing-route.md) | `/today` replaces the dashboard; every landing path; `features/dashboard` → `features/today`; Button accessible name | [implementation.md](../EP16A/implementation.md) | Implemented — awaiting parent review |
| 2 | [EP16G](../../EP16G-reset-student-data-on-logout.md) | **Security (D16-19):** every per-student RTK cache + onboarding reset on logout / account switch | [implementation.md](../EP16G/implementation.md) | Implemented — awaiting parent review |
| 3 | [EP16B](../../EP16B-today-secondary-content.md) | Plan note, momentum row, Coming up, Classes today; `expectNoForbiddenWords` helper | [implementation.md](../EP16B/implementation.md) | Implemented — awaiting parent review |
| 4 | [EP16C](../../EP16C-one-planning-flow.md) | One proposal surface (`/plan/proposal`) on the catch-up data path; `/plan` rebuilt; plan-health & catch-up retired behind redirects | [implementation.md](../EP16C/implementation.md) | Implemented — awaiting parent review |
| 5 | [EP16D](../../EP16D-navigation-and-session-indicator.md) | Today · Plan · Calendar · Work ▾; header session strip; Semesters / Study history / Go to Today links; BL-14-07 fixed | [implementation.md](../EP16D/implementation.md) | Implemented — awaiting parent review |
| 6 | [EP16E](../../EP16E-mobile-bottom-tab-bar.md) | Bottom tab bar (five flat tabs); one Primary landmark per width; Account-only drawer | [implementation.md](../EP16E/implementation.md) | Implemented — awaiting parent review |
| 7 | [EP16F](../../EP16F-cross-layer-e2e-and-parent-index.md) | `today.spec.ts`, `navigation.spec.ts`, `plan-flow.spec.ts`; redirect matrix; axe stops; this index; four defects found and fixed in owning children | [implementation.md](../EP16F/implementation.md) | Implemented — awaiting parent review |
| — | EP16H / EP16I / EP16J / EP16K | Optional ADHD upgrades (7/10, 6/10, 5/10, 8/10) | — | Queued — awaiting ▲ acceptance (D16-20) |

## 2. Combined Git scope

Baseline `8d69995` (EP15K pass 2 committed) → final EP16F commit (see the EP16F record). All on `hfi/01ef21ed-b0fb-4c35-8eb9-a0fa397366f0/elm`. API untouched throughout (D16-13): `git diff --stat 8d69995..HEAD -- apps/api` is empty.

| Child | Commits (code + records + queue row) | Diff range |
|---|---|---|
| EP16A | `d35970a` | `8d69995..d35970a` |
| EP16G | `07541aa` | `d35970a..07541aa` (docs `69bc401` in between: EP16D refined, EP16G added) |
| EP16B | `e272a6e` | `07541aa..e272a6e` |
| EP16C | `5764e1b` | `e272a6e..5764e1b` |
| EP16D | `55e7819` (+ `ae202b0` efficiency row; `bc9f43d` EP16E ratifications) | `5764e1b..ae202b0` |
| EP16E | `a9f3543` (+ `90161c0` efficiency row) | `ae202b0..90161c0` |
| EP16F | this commit + its efficiency row | `90161c0..HEAD` |

Planning-only commits in the range: `ea91c27` (EP16B/C/E refined), `69bc401` (EP16D refined, EP16G added, A-EP16-02), `bc9f43d` (D-E4…7 ratified), the optional-children docs commit (EP16H–K, D16-20).

## 3. Test commands per child

All in `apps/web` unless stated. Every child ran `npx tsc --noEmit -p tsconfig.json`, `npx eslint src --max-warnings=0`, `npx vitest run` (full) and the full Playwright suite; counts are in each record (the only home for counts).

| Child | Focused unit suites | Web suite at closeout | Playwright at closeout |
|---|---|---|---|
| EP16A | `src/pages/today`, `src/features/today`, `src/shared/ui/Button.test.tsx`, landing tests | 1321 / 0 | 62 / 0 ×3 (external stack) |
| EP16G | `src/app/store` (`resetOnUserChange`, cross-student journey) | 1325 / 0 | — (store only; e2e in EP16B) |
| EP16B | `src/features/today`, `src/test/forbiddenWords` | 1355 / 0 | 62 / 0 ×2 (+1 cold-start timeout) |
| EP16C | `src/features/plan-proposal`, `src/pages/plan`, `src/app/appRoutes.test.tsx` | 1356 / 0 | 61 / 0 + 1 fixme ×2 |
| EP16D | `src/widgets/header`, `src/widgets/session-indicator`, `src/entities/study-session`, `src/pages/focus`, `src/pages/courses` | 1396 / 0 | 61 / 0 + 1 fixme |
| EP16E | `src/widgets/tab-bar`, `src/shared/lib/useMediaQuery`, `src/widgets/layout`, `src/widgets/header` | 1428 / 0 | 61 / 0 + 1 fixme (narrow journeys incl.) |
| EP16F | `src/features/plan-proposal`, `src/features/today-plan` (defect fixes) | 1429 / 0 | self-contained ×3 — see the EP16F record |
| API gate | `apps/api`: `npx jest src/domain/study-planning` (EP13J identity, EP15 determinism) | 12 suites, 291 / 0 (EP16F, 2026-11-18) | — |

Reviewer reproduction: `cd apps/web && npx vitest run` then `DATABASE_URL=<postgres url to an existing dev db> JWT_SECRET=<any> pnpm test:e2e` (self-contained; this worktree has no `.env.local`, so both must come from the shell — F-EP16D-01).

## 4. AC / TR / DoD ownership

The README's [ownership table](../../README.md#epic-acceptance-criteria--ownership) is authoritative; delivered as follows.

| Epic AC | Owner(s) | Delivered by | Verified by |
|---|---|---|---|
| AC-E16-01 | EP16A, EP16D, EP16F | `/today` route + redirects; nav first entry | `today.spec.ts` (a)(d); `navigation.spec.ts` |
| AC-E16-02 | EP16A, EP16F | hero first; 360×640 check | `today.spec.ts` (a) — **with the banner dismissed; F-EP16F-01 / BL-16-08** |
| AC-E16-03 | EP16B | regions, cap 5, Past due, no counts, copy audit | unit; `today.spec.ts` |
| AC-E16-04 | EP16A, EP16B (+ F-EP16F-03 fix) | badge once + momentum row | `today.spec.ts` (c) |
| AC-E16-05 | EP16A, EP16B | Add assignment; row details | unit |
| AC-E16-06 | EP16C (+ F-EP16F-02/04 fixes) | one proposal, Use/Not now, lock kept, 409 | `plan-flow.spec.ts` |
| AC-E16-07 | EP16A, EP16B, EP16C | Plan my week → proposal; note → `/plan` | `today.spec.ts` (b) |
| AC-E16-08 | EP16C | four redirects, page removed | `plan-flow.spec.ts` route matrix |
| AC-E16-09 | EP16D, EP16A | nav contract; reachability | `navigation.spec.ts` |
| AC-E16-10 | EP16D | strip; silent otherwise; Focus empty → Today | `navigation.spec.ts` |
| AC-E16-11 | EP16E | tab bar; Account drawer | `navigation.spec.ts` @360 |
| AC-E16-12 | all frontend; EP16F axe | keyboard, live regions, reduced motion, labels | axe stops on `/today` (4 states), `/plan`, `/plan/proposal` (incl. 409), `/courses` @360, `/calendar`, `/profile` |
| AC-E16-13 | all; EP16F | no API change | `git diff -- apps/api` empty; API domain gate 291/0 |
| AC-E16-14 | EP16F | all journeys green; new journeys | self-contained ×3 (EP16F record) |

TR-E16-01/02/05/06 — unit, per child records. TR-E16-03 — EP16F. **TR-E16-04 (manual, screen reader + 360 px): not executed by EP16D or EP16E** (no interactive environment); owed to the reviewer's **How to verify by hand** / the user — see § 6. DoD-3 — EP16G (store reset) + EP16D-AC3 (indicator); DoD-9 — contracts § One planning flow (EP16C) and this index; DoD-10/11 — the combined review.

## 5. Decisions and deviations the reviewer should check

- **Ratified by default / by grant:** D-B5…10, D-C5…10 (default, 2026-11-18); D-D5…8, D-E4…7 (user, "ratify remaining"); D-C11/D-C12 added under a user tweak grant (EP16C).
- **F-EP16E-01 (recorded deviation):** the signed-in mobile menu button is md-gated (story said CSS-only hide) so "Open account menu" is unique in the DOM.
- **F-EP16D-01/02, F-EP16E-02:** test-run and harness notes, no product impact.
- **EP16F defect fixes in owning children:** F-EP16F-02 (`PlanProposal` resets Today's RTK caches on confirm — EP16C), F-EP16F-03 (done block no longer repeats the minutes — EP16A hero), F-EP16F-04 (`danger-strong` token on the conflict summary — EP16C). Each has a unit test and an e2e assertion.
- **BL-14-07** closed by EP16D with a reproduction-first regression test (`Header.postLogin.test.tsx`).

## 6. Known gaps

1. **TR-E16-04 manual passes (EP16D strip, EP16E tab bar)** — not executed; structural halves unit-tested. Needs VoiceOver/TalkBack at 360×640 and the 320×568 "Assignments" label check.
2. **BL-16-08** — the email-verification banner pushes Today's hero below the fold on phones for unverified students (F-EP16F-01). Outside EP16's children.
3. **Pre-existing `text-danger` on `bg-danger/10`** error blocks (`TodayPlanCard`, `FocusPage`, `PlanPage`) are not reached by any axe stop; the 409 state's twin was fixed (F-EP16F-04). A sweep belongs to a follow-up.
4. **Harness:** `pnpm start:e2e`'s Nest grandchild outlives Playwright's exit, so back-to-back self-contained runs collide on :4100 unless a stale sweep runs between them (F-EP16F-05; BL-15-08 family).
5. **BL-16-07** — Today flashes before `/onboarding` for new students (double post-login redirect); EP16D fixed only the menu symptom.
6. Optional children EP16H–EP16K await ▲ acceptance (D16-20); if accepted after this review, they are re-reviewed with the unit.
