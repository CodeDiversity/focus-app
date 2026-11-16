# EP13 combined review — Adaptive Scheduling for ADHD (parent review unit)

**Date:** 2026-11-16 · **Pass:** 1 · **Reviewed commit:** `210f76c` (clean tree)
**Scope:** EP13A–EP13N incl. EP13H2 (15 application children; EP13P/EP13Q outside the unit, D13-18/D13-19)
**Reviewer:** `reviewer` role, assignment `parent_review`, from the parent index [`implementation.md`](./implementation.md)

## Verdict

**Does not pass.** Three conditions fail:

1. **R-EP13-01** — the `DATABASE_URL`-gated API suites, executed by this review for the first time anywhere in this delivery chain, are **red: 8 failed / 1572 passed (6 suites)**, and four of the eight failures are EP13-caused.
2. **R-EP13-02** — eight child records dispositioned their unexecuted gated suites as "CI executes them on every push"; CI (`.github/workflows/ci.yml`) triggers only on push/PR to `main`/`develop`, so **no CI run has ever executed these suites for this chain**. The recorded dispositions are inaccurate evidence claims.
3. **R-EP13-05** — TR-E13-14's user-run accessibility checklist (screen reader, reduced motion, narrow screen) has no recorded evidence; a required manual gate stays **CANNOT VERIFY**.

Everything else is in good shape: all seven cross-layer journeys pass under this reviewer's own run, unit suites are fully green (api 1104/0, web 1264/0), the three migrations are additive, documented and deploy cleanly to a fresh database (verified live), and ownership scoping with the uniform 404 was verified in code on every EP13 endpoint. No blocker-severity finding exists; closure of R-EP13-01/-02 is test/record work, not feature work.

## Findings

| ID | Severity | Finding (requirement → observed gap) | Owner | Closure condition |
|---|---|---|---|---|
| R-EP13-01 | Should-fix | DoD-8 / each child's "gated suites updated" claim: the gated live-DB suites are red at `210f76c` — 8 failed / 1572 passed. Four failures are EP13-caused (details below); production behavior is correct in three of the four, the committed tests are stale or isolation-broken; the fourth (d) is an internal inconsistency inside EP13C's own change set. | implementer | The full gated run (`cd apps/api && DATABASE_URL=… npx jest --runInBand` against a freshly migrated DB) passes, or each remaining failure is explicitly dispositioned as a pre-existing finding with baseline evidence. |
| R-EP13-02 | Should-fix | Accurate records (core.md "Missing records are unverified, not done"): F-EP13A-03, F-EP13B-02, F-EP13C-02, F-EP13F-02, F-EP13G-03, F-EP13I-03, F-EP13K-02 and F-EP13J-01 are all dispositioned "CI executes them on every push". `ci.yml` runs only on `push: branches: [main, develop]` / PRs to those branches; this chain lives on `hfi/*` branches. The claimed compensating evidence never existed, and the suites in fact fail. | implementer (records), planner (CI policy) | Correct the dispositions in the eight records (or add a CI trigger that actually covers delivery branches), and land R-EP13-01's fix with a real executed run recorded. |
| R-EP13-03 | Should-fix (pre-existing, outside this unit) | Four of the eight gated failures pre-date EP13 (verified identical at baseline `9ffd854`): (1) `study-plans-e2e.spec.ts` lock 400-case — the global pipe's `enableImplicitConversion: true` (scaffold-era, `main.ts:19`/`test-http.ts:108`) coerces `locked: "yes"`/`1` to `true`, so invalid bodies answer 200: a real app-wide validation weakness; (2)+(3) `study-plans-e2e.spec.ts` lock happy-path and `study-plans-data-scoping.spec.ts` lock scoping — `seedPlannedSession` does `studyPlan.create` on a fixed date and is called twice per student → unique-constraint `study_plans_userId_date_key` collision; (4) `study-plans-e2e.spec.ts` bag-survival — the spec's premise "PATCH /users/me replaces the column verbatim" was obsoleted by the R-EP06-06 merge fix (`users.service.ts:97–126`). | planner (follow-up story) | A fix story repairs the fixtures, re-decides the implicit-conversion policy for boolean/number bodies (or pins the coercion as contract), and updates the bag-survival spec to the merge contract. Does not gate the EP13 unit (same standing as F-EP13M-01/-02/-06, D-M5). |
| R-EP13-04 | Polish | `docs/stories/EP13/README.md` line 27 still names `./artifacts/EP13/walkthrough.md` as a reviewer artifact; D13-19 (EP13Q) folded the walkthrough into `review.md`. | planner | Drop the stale artifact name from the queue header. |
| R-EP13-05 | Should-fix (CANNOT VERIFY) | TR-E13-14 / DoD-8 ("recorded manual pass"): the automated half is executed and verified (axe + keyboard inside the journeys, re-run by this reviewer); the user-run half (screen reader, reduced motion, 375px checks — index §TR-E13-14, items 1–7) has no recorded evidence. Agents cannot produce it. | user | The user signs the 7-item checklist in the parent index with date + result; any defect found becomes follow-up work. |

### R-EP13-01 details — the four EP13-caused gated failures

All reproduced twice (deterministic) on a fresh `ep13_review_gated` database at `210f76c`:

- **(a) `study-plans-catch-up-e2e.spec.ts:688`** — the EP08 "P-03 pin" asserts the SavedPlan session key set without `anchor`/`windowHint`; EP13G intentionally added both to the saved-plan read (EP13G-AC5, `study-plans.service.ts` projections). EP13C and EP13L both edited this file afterwards without updating the pin. Production is per contract; the pin is stale.
- **(b) `study-plans-catch-up-data-scoping.spec.ts:257`** — asserts `missedCount: 1` for a seeded past row; EP13C's read-time reconciliation now rolls it (`missedCount: 0`). The behavior change is EP13C's AC; this sibling spec was never updated (no EP13 commit touches it).
- **(c) `study-sessions-planned-link-e2e.spec.ts:277`** — EP13I's absorb journey expects `plannedMinutes` 50+60=110 but gets 100: earlier tests in the same file leave a SCHEDULED 50-minute row for the same student/assignment/day, and `absorbNext` deterministically absorbs the *earliest* candidate (`study-sessions.service.ts:365–374`) — the leftover, not the seeded `next`. Production matches D13-13/D-I8; the test lacks fixture isolation.
- **(d) `study-plans-rollover-e2e.spec.ts:163`** — EP13C's own journey asserts `missedCount: 0` after reconciliation, but the recovery summary's legacy missed query (`study-plans.service.ts:758–763`) does not carry the reconciliation predicate's "actually done" exclusion (`:502` — `studySessions: { none: { status: 'COMPLETED', durationMinutes: { gte: 1 } } }`). A past SCHEDULED row protected from rollover by that guard still reports as "missed". Reachable only with hand-crafted history (EP13B normally completes such rows), but the committed test and committed code disagree — one of them must change.

## Reviewer-executed verification (evidence discipline)

All commands at commit `210f76c`, clean tree, this worktree, 2026-11-16. Reviewer-executed unless labeled otherwise.

| Command (cwd) | Result |
|---|---|
| `npx jest` (`apps/api`) | **1104 passed, 0 failed**, 476 skipped (27 gated suites self-skip), exit 0 |
| `createdb ep13_review_gated` → `DATABASE_URL=… npx prisma migrate deploy` (`apps/api`) | **All migrations applied successfully** to a fresh database — incl. the three EP13 migrations (closes the migration half of F-EP13B-02/F-EP13G-03/F-EP13J-01) |
| `DATABASE_URL=… JWT_SECRET=… JWT_REFRESH_SECRET=… npx jest --runInBand` (`apps/api`) | **8 failed, 1572 passed, 1580 total; 6 suites failed**, exit 1 — run twice, identical results (R-EP13-01/-03). Database dropped afterwards. |
| `pnpm test` (`apps/web`, run solo) | **1264 passed, 0 failed** (111 files), exit 0. (A first run concurrent with the API suites flaked 3 `CourseForm.test.tsx` timeouts; solo rerun and the file alone are green — load flake, not a defect.) |
| `pnpm lint` + `pnpm typecheck` (both apps) | clean, exit 0 (tree unchanged afterwards) |
| `DATABASE_URL=… npx playwright test e2e/adaptive-scheduling.spec.ts` (`apps/web`) | **7 passed** (15.2s); throwaway `postgres_e2e_test` created and dropped by the harness |
| Live endpoint probe (`ts-node src/main.ts` on :4999, curl) | `{}` → 400, `{locked:true,extra:…}` → 400, `{locked:"yes"}` → **passes validation** (404 on a random id = the service ran) — isolates R-EP13-03's coercion mechanism |

Implementer-provided evidence accepted as recorded (not re-derived, per the review brief): the full-parallel E2E baseline comparison for F-EP13M-01/-02/-06 (four pre-existing failures + two parallel flakes, each verified by the implementer at `9ffd854` or in files EP13 never touched); per-child red-first/test-count claims inside each record.

## Child-by-child AC dispositions

Format: child — ACs — disposition (evidence: reviewer-executed tests `[T]`, reviewer code inspection `[C]`, reviewer-run E2E journey `[E#]`, implementer record `[R]`).

| Child | ACs | Disposition |
|---|---|---|
| EP13A | 5/5 satisfied | Confirmed-time groupBy scoped by `userId`+COMPLETED; locked-future subtraction; save preserves locked (`study-plans.service.ts`, `confirmedTimeByAssignment`/`gatherPlanData`) [C]; `study-plans-reality.service.spec.ts` + unit pins green [T]; journey 1 (180→120 placed) [E1] |
| EP13B | 5/5 satisfied | `startFromPlanned` fully inspected: scoped read `{ id, studyPlan: { userId } }` (:191), uniform 404, open-session 409 inside the transaction (:242–251), conditional status move (:285–292), today-rule with profile zone (:218–226) [C]; 14 unit tests green [T]; gated journeys red only on EP13I's absorb isolation (R-EP13-01c) [T]; journey 3 start→finish→COMPLETED [E3] |
| EP13C | 5/5 satisfied; one internal inconsistency | Predicate verified at `study-plans.service.ts:496–507` (conditional `updateMany`, idempotent, no history writes); `getToday` (:853) scoped with reconcile-first [C]; reconciliation unit suite green [T]; journey 2 (missedCount 0, rolledForwardCount 1) [E2]. Open: R-EP13-01(b)/(d) — the missed-query/guard mismatch and the un-updated sibling spec |
| EP13D | 5/5 satisfied | TodayPlanCard/one-tap/calendar emission tests green [T]; calendar emission scoped `studyPlan: { userId … }` (`calendar.service.ts:166`) [C]; `resolveDefaultSessionMinutes` reads `sessionLengthMinutes` (V-07-1 closed) [R+T]; journeys 3, 4 [E] |
| EP13E | 5/5 satisfied | Plan-health informational view, redirects, no-digit return note — component/route tests green incl. `not.toMatch(/\d/)` [T]; journey 7 (redirects, nav, nothing count-led) [E7] |
| EP13F | 5/5 satisfied | scheduler.spec (breaks §10, density §11, interleaving §12, min/max §13, determinism/purity §14) green [T]; defaults/bounds in `preferences.ts:55,74` [C]; journey 1 exercises the engine end to end [E1] |
| EP13G | 5/5 satisfied | Anchor migration verified additive + deployed [T]; flex partition/conflict-exemption/start-fixes-time suites green [T]; `fixFlex` in one conditional write (`study-sessions.service.ts:277–292`) [C]; journey 4 (flex overlaps a FIXED row without conflict, "Anytime" rendering, startable) [E4]. Open: R-EP13-01(a) — the stale P-03 pin his change broke |
| EP13H | 5/5 satisfied | `sessionTimeLabel` vocabulary + negative clock-time assertions green [T]; journey 4 [E4] |
| EP13H2 | 3/3 satisfied | CalendarEventDetails flex conditional + the 12 CalendarPage tests green in the full solo run [T]; the Date-freeze repair is test-only [C via record + diff scope] |
| EP13I | 5/5 satisfied | `absorbNext` fully inspected: `ownedWhere`, uniform 404, both conditional writes in one transaction, earliest-candidate determinism (:327–410) [C]; absorb unit suite (9) green [T]; journey 5 (micro-start 10 → absorb → `plannedMinutes` 40, 12 min shrink) [E5]. Open: R-EP13-01(c) — his gated journey's fixture isolation |
| EP13L | 5/5 satisfied | `calibration.spec.ts` (24) green: median, ≥3 gate, clamp [0.5, 3.0], fallback, determinism, no `assignment.update` [T]; scale-then-subtract at both classification sites [R+T]; F-EP13L-01 contracts wording already fixed in plan (C-EP13-10) [C] |
| EP13N | 5/5 satisfied | Radio-card fieldset, preset→integer mapping, custom derivation, keyboard arrows, no-percent primary labels — 30 component tests green [T] |
| EP13K | 5/5 satisfied | `momentum.ts` pure (imports only civil-string helpers — F-EP13K-04 confirmed acceptable) [C]; `momentum()` scoped `where { userId, status: COMPLETED }` with profile-zone bucketing (:685–718) [C]; momentum/preferences/card/celebration suites green incl. no-`%` assertions [T]; journey 6 [E6] |
| EP13J | 5/5 satisfied | Energy migration additive + deployed [T]; `energy.spec.ts` incl. the all-NORMAL byte-identity (EP13J-AC3) green [T]; availability CRUD scoping verified (`availability.service.ts:151–315`) [C]; enum-only 400 via DTO `@IsIn` [C+T]. V-13-5 stays open (planner-owned, reported) |
| EP13M | 4/4 satisfied | All seven journeys re-executed by this reviewer: 7/7 passed [E1–E7]; axe gate real (`helpers.ts` axeViolations, serious/critical, two exact-pattern exclusions matching F-EP13M-04/-05) [C]; parent index accurate except the CI claim it repeats (R-EP13-02); F-EP13M-07 now **closed by execution — with a red result** (R-EP13-01) |

Epic ACs: AC-E13-01…14 all covered by the owners above; cross-layer halves verified by journeys 1–7 (reviewer-run). Open product follow-ups raised by children (F-EP13F-01/-04, F-EP13G-02/-04, F-EP13H-02, F-EP13I-02, F-EP13J-02/-03/-04, F-EP13K-01/-03, F-EP13E-03, F-EP13C-01) are each dispositioned in their records with owners; none re-litigated here, none blocks.

## DoD table

| DoD | Disposition | Evidence |
|---|---|---|
| 1 functional criteria | PASS | AC table above; unit suites + journeys reviewer-run |
| 2 invalid-input validation | PASS for EP13 endpoints (enum/bounds/DTO tests green; service-level double validation in preferences/from-planned) — with the pre-existing app-wide coercion caveat (R-EP13-03, boolean/number bodies) | `[T]`+`[C]`; probe run |
| 3 student data scoping | PASS | Code inspection of all six EP13 endpoints + calendar emission (file:line above); scoping suites green at unit level; gated scoping failures are fixture/stale-expectation issues, not scoping violations |
| 4 actionable API errors | PASS | 409/400 messages inspected (`study-sessions.service.ts:221–235,342–346`); tests pin them |
| 5 loading/empty/error states | PASS | Component suites (card/health/momentum/form) green |
| 6 keyboard accessibility | PASS (automated half) | Component tests + journeys 3/7 keyboard paths (reviewer-run); human half → R-EP13-05 |
| 7 responsive layouts | PASS (code level: stacking/44px classes test-pinned); 375px human check → R-EP13-05 | `[T]` |
| 8 automated tests | **FAIL** — unit/component/E2E green, but the gated suites are red (R-EP13-01) and TR-E13-14's recorded manual pass is half-missing (R-EP13-05) | reviewer-executed gated run |
| 9 API/migration documentation | PASS | Three migrations additive with in-file docs + rollback notes (read in full); `contracts.md` endpoint rows current (C-EP13-10 applied); payload contracts in records |
| 10 integrated review | PASS | Reviewer-run journeys 7/7 + implementer's recorded full-suite runs at this commit |
| 11 walkthrough + How to verify by hand | This report (below), per D13-19 |

## Walkthrough (D13-19 — reviewer narrative)

The unit delivers what the epic promised, as one coherent spine. **Reality accounting (A→B→C):** confirmed COMPLETED minutes now flow through one aggregation into remaining work, previews, saves, recovery and catch-up; planned rows link to the focus sessions that execute them; unstarted past rows flip to `RESCHEDULED` lazily and idempotently on any read, so "missed" stops accumulating structurally rather than cosmetically. **Surfaces (D/E/H/H2):** the dashboard and plan page lead with today and a one-tap start; plan health is informational and never gates anything; flex sessions read "Anytime" everywhere a clock time would shame. **Engine (F/G/J/L):** placement v2 adds breaks, a density budget, round-robin interleaving with a feasibility override, honored min/max, a deterministic flex/fixed partition, energy-preferring gap scans, and median-clamped calibration — all pure, all order-independent, all proven at unit level (109 scheduler/energy/calibration/momentum domain tests, reviewer-run). **Experience (I/K/N):** micro-start and absorption replace overrun flags; momentum counts showing up with a repairable week; the preference controls speak named choices instead of percentages. The cross-layer journeys prove the stack end to end and passed under this reviewer's own run.

The unit's one systemic weakness is evidential, not functional: every child deferred its live-database proof to a CI that never watches these branches, and the first actual execution (this review) found six suites red — four EP13's own doing. Nothing there is a product defect a student would hit (two stale pins, a fixture bleed, and one hand-crafted-data edge where EP13C's test and code disagree), but a green gate that was never run is not a gate, and eight records say it was. That, plus the still-unsigned human half of the accessibility pass, is what stands between this unit and sign-off.

## Prior findings disposition (from the index's known-gaps list)

- F-EP13M-07 (gated suites never executed): **closed by execution — result red** → superseded by R-EP13-01/-02/-03.
- F-EP13M-01/-02/-06 (pre-existing E2E failures/flakes): provenance accepted as recorded; still open with planner.
- F-EP13D-02/F-EP13E-01/F-EP13H-01/F-EP13I-01 + deferred a11y evidence (EP13N/EP13K): consolidated into R-EP13-05 (user checklist).
- Migration halves of F-EP13B-02/F-EP13G-03/F-EP13J-01: **closed** — `prisma migrate deploy` verified by this reviewer on a fresh database.
- V-13-5: open, planner-owned (reported, not blocking).

## How to verify by hand

Use a disposable local account/database only. Prereqs: Postgres on :5432 (trust auth), `pnpm install` done; API `cd apps/api && DATABASE_URL=postgresql://$USER@localhost:5432/studypilot_dev npx prisma migrate deploy` then start api+web (`pnpm dev` per app, or use the E2E harness).

1. **Plans count reality (AC-E13-01).** `Executed — 2026-11-16, reviewer, journey 1 (E2E, local stack)`: create an assignment with a 180-minute estimate → generate+save a plan → finish a 60-minute focus session for it → regenerate: the preview places ~120 minutes; the finished work is never rescheduled.
2. **Miss a day (AC-E13-04).** `Executed — journey 2`: seed a planned session yesterday, open the dashboard: no redirect, no "missed" counter; `/plan/health` shows one "Moved forward" row; the plan page's note has no digits.
3. **One-tap start/finish (AC-E13-03/05).** `Executed — journey 3`: keyboard-Tab to "Start focus" (visible ring), Enter → `/focus` running; finish → planned row reads Completed, "{n} min studied today" chip updates.
4. **Flex sessions (AC-E13-09).** `Executed — journey 4`: in the plan editor press "Make flexible", save over a fixed row at the same clock time — no conflict error; calendar chip and dashboard read "Anytime"; Start works.
5. **Micro-start + absorption (AC-E13-11).** `Executed — journey 5`: "Just 10 min of …" → timer target 10; at target with a second same-assignment session planned today, the offer appears; accepting grows the target and completes the absorbed row; declining changes nothing.
6. **Momentum (AC-E13-12).** `Executed — journey 6`: finish ≥1 minute → celebration "You studied N minutes." with daily/weekly lines; dashboard "Your momentum" card shows minutes/days — verify no percent sign anywhere.
7. **Preferences.** `Executed — reviewer probe + component tests`: `/profile` → pick "Relaxed" and save → reload shows Relaxed; PUT body carries integers (devtools); an out-of-range `breakMinutes` (61) shows "Must be between 0 and 60."
8. **Energy windows.** `Not executed — user instructions`: on `/availability` create a window, set Energy = High; the list row and its calendar chip show "High energy"; generate a plan with one demanding assignment (PAPER or >120 min remaining) and confirm it lands in the HIGH window first.
9. **Ownership negative case.** `Executed — gated scoping suites (passing cases) + code inspection`: with two accounts, POST `/study-sessions/from-planned/<other student's id>` → 404 `Resource not found` (never 403, no existence oracle).
10. **Screen reader / reduced motion / 375px.** `Not executed — user instructions`: run the 7-item checklist in the [parent index §TR-E13-14](./implementation.md#tr-e13-14--combined-accessibility-record-d-m1) and sign each line with date + result (R-EP13-05).
11. **Gated API suites (after the R-EP13-01 fix).** `Executed by this review — currently red`: `psql -c "create database ep13_gated"`, `cd apps/api && DATABASE_URL=postgresql://$USER@localhost:5432/ep13_gated npx prisma migrate deploy && DATABASE_URL=… JWT_SECRET=$(openssl rand -hex 32) JWT_REFRESH_SECRET=$(openssl rand -hex 32) npx jest --runInBand`; expect 0 failures once fixed; drop the database afterwards.
