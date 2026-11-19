# EP17B — Engine: per-assignment daily pacing — implementation record

**Implementer:** implementer session, 2026-11-19. **Branch:**
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/oak` (worktree), base `3d10130`.

## Completed behavior

The scheduling engine gained **rule 9 — daily pacing** (contracts §3,
D17-3, D-B1…D-B4), documented in `scheduler.ts`'s rule-list doc comment in
the same voice as rules 1–8. For each assignment `A`, computed **once from
run-start inputs only**:

```text
usableDays(A)   = days of A's horizon whose run-start dayBudgetOf > 0     (D-B3)
evenShare(A)    = max(oneSitting(A), ceil(A.remainingAtRunStart / |usableDays(A)|))  (D-B4)
paceTarget(A,D) = dayBudget(D) - floor((dayBudget(D) - evenShare(A)) * spreadPercent/100)
dayTake(A,D)    = clamp(max(paceTarget(A,D), A.remaining - capacityAfter(A,D)), 0, dayBudget(D))
```

`dayTake` is seeded into a per-day, per-assignment allowance map at the top
of each day of the placement loop, from each candidate's state **at the
start of that day**, and is consumed by `commitBlock` on whatever path
placed the minutes (the rotation, or a course tie serving an item out of
turn). `placeBlock` narrows the day's budget to `min(budgetLeft, allowance)`
for the normal pass only. Behaviour preserved exactly:

- **Rule 3's critical pass ignores pacing entirely (D-B2).** The day's
  critical set is left out of the allowance map, so critical work is
  uncapped on the critical pass *and* in the rotation that follows.
- **Pacing only ever lowers a take.** `budgetLeft` / `dayBudgetOf` remain
  the hard per-day cap; `dayTake` is clamped to the day budget.
- **No minutes are lost.** Declined minutes fall through the untouched
  classification at `scheduler.ts:584-628` and surface as
  `INSUFFICIENT_TIME_BEFORE_DEADLINE`. No new category; the category set is
  the pre-EP17 set.
- **`spreadPercent = 0` short-circuits to `dayBudget`** — the pre-EP17
  engine byte for byte. The defensive fallback for a missing/non-finite key
  is also `0`, so a JavaScript caller or an older fixture gets the engine it
  was written against.
- One deliberate addition to contracts §3's formula: the **`oneSitting(A)`
  floor** (`min(A.remainingAtRunStart, sessionLengthMinutes)`, never below
  `minSessionMinutes`). Without it EP17B-AC5 / D17-3 fails outright — twelve
  15–30-minute assignments would each be paced to 3–6 minutes a day, below
  `minSessionMinutes`, and nothing would be placed at all. See F-EP17B-01.

Not touched: ordering, gap choice, the energy ranking, the preferred tier,
breaks, the density cap, min/max block length, `tryMergeTail`, the
deficit/deferred classification, the FLEX/FIXED anchor pass, `types.ts`
(EP17A already added `spreadPercent`), and the service (EP17D owns wiring
and the payload).

## AC-by-AC outcome

- **EP17B-AC1 — met.** `SPREAD_FIXTURE` (300 minutes due in five days; five
  days of 300 free minutes, budget 240): at `spreadPercent 100` the engine
  places **60 minutes on each of the five days**; the same fixture at `0`
  places 240 + 60 on two days (the pre-EP17 shape, asserted side by side).
  At `70` the lever is continuous — the target is 114 min/day, the work
  lands on three days and no day exceeds its target. Tests: *spreads one
  large assignment across its horizon*, *front-loads the same fixture with
  pacing off*, *is a continuous lever*.
- **EP17B-AC2 — met, as the bounded claim (R-EP17-01).**
  - Rule 3 unchanged and first: a 480-minute assignment due tomorrow over
    two 240-minute budgets produces **byte-identical** output at
    `spreadPercent` 0 and 100 (*does not spread a tight-deadline
    assignment*).
  - Battery negative: every fixture of the 19-fixture battery except the two
    adversarial ones has an identical `results` array at 0 and at 100 — no
    assignment gains a deficit category or loses placed minutes (*never
    introduces a deadline miss across the fixture battery*).
  - Feasibility floor implemented and pinned (*never defers below what the
    later horizon days can nominally absorb*): 200 minutes over a 240-minute
    today and a 60-minute tomorrow stays whole on day one, identically to
    pre-EP17. See F-EP17B-02 — the floor is currently subsumed by rule 3's
    critical test, which fires on the same condition.
  - **Adversarial fixture 1 (fragmentation):** 100 minutes due Tue; Monday
    one usable 100-minute gap; Tuesday 140 free minutes in fourteen 10-minute
    slivers, all below `minSessionMinutes = 15`. `dayBudgetOf(Tue)` reads 140,
    so `capacityAfter` is nominal and the floor does not fire. At
    `spreadPercent 100` the engine places 60 on Monday and reports 40 as
    `INSUFFICIENT_TIME_BEFORE_DEADLINE`, where pre-EP17 placed all 100. This
    is exactly the residual optimism the bounded claim names; the fixture
    pins the chosen behaviour rather than claiming it away.
  - **Adversarial fixture 2 (shared capacity):** two 60-minute assignments
    due Tue sharing a 30-minute Tuesday. Rule 3 sees both as critical on
    Monday (60 > 30) and the critical pass ignores pacing, so output at 100
    is byte-identical to 0 and both are placed in full — pacing is no worse
    than the rule 3 guarantee the engine already makes.
- **EP17B-AC3 — met (R-EP17-02).** A property-style assertion over the whole
  battery at `spreadPercent` 0, 70 and 100, **per deficit category**:
  non-overdue → `placed + deficit + deferred = remaining`; `OVERDUE` →
  `deficit = remaining` (whatever was placed) with `placed` asserted
  alongside and `deferred = 0`. Every emitted category is in the pre-EP17 set
  `{null, OVERDUE, NO_AVAILABLE_TIME, INSUFFICIENT_TIME_BEFORE_DEADLINE}`. A
  focused case asserts the minutes a pacing target declines are reported by
  the existing `INSUFFICIENT_TIME_BEFORE_DEADLINE` branch.
- **EP17B-AC4 — met.** `schedule()` stays pure: the new code reads only
  `preferences`, the run-start day budgets and the run-start
  `remainingMinutes`; no clock, no randomness, no I/O, no `@nestjs/*` or
  Prisma import (the existing source-text boundary test at
  `scheduler.spec.ts` §14 still passes). New frozen fixture
  `pacing-baseline.snapshot.json`, generated from the **pre-EP17B engine at
  `3d10130`** over all 19 battery fixtures: every fixture is byte-identical
  to it at `spreadPercent 0`. Two runs of the same input are byte-identical
  at 70 and at 100 over the whole battery, and the input is not mutated. The
  separate EP15C `identity.spec` snapshot still passes unchanged.
- **EP17B-AC5 — met (D17-3).** `MANY_SMALL_FIXTURE` (twelve assignments of
  15–30 minutes across a week) at `spreadPercent 100` places the same total
  minutes, the **same 12 sessions** and an identical `results` array as at 0.
  A companion case shows the discrimination directly: with one 300-minute and
  three 20-minute assignments on the same day, each small one still finishes
  in one sitting while the large one is held to its share (60).

### TR-E17-07 — the `scheduler.spec.ts` diff

**No existing expectation changed.** The spec's `PREFS` literal has carried
`spreadPercent: 0` since EP17A, and `0` is the documented compatibility value
(D17-6), so every pre-existing case already runs against the pre-EP17 engine
by construction. The diff is therefore purely additive (+342 lines, 0
deletions): one new `describe('16. daily pacing (EP17B rule 9)')` section. The
D17-15 expectation of a large deliberate rewrite did not materialise — the
pre-EP17 behaviour is preserved as an executable test (the new frozen
baseline) rather than by moving assertions. No case carries a
`// EP17B rule 9: <why this moved>` comment because no case moved; that is
reported here rather than manufactured.

## Changed paths

- `apps/api/src/domain/study-planning/scheduler.ts` — rule 9 in the rule-list
  doc comment; `spreadPercent` / `sittingLength` normalisation; `evenShareOf`
  (run-start, per assignment); `dayTakeOf` (blend + feasibility floor + day
  budget clamp); the per-day `paceLeft` allowance map, seeded in the day loop
  with the critical set excluded; `placeBlock` narrowing and its course-tie
  branch; `commitBlock` allowance consumption.
- `apps/api/src/domain/study-planning/pacing-fixtures.ts` — **new.** The
  19-fixture battery (the 15 EP15C identity shapes + the four EP17B fixtures:
  AC1 spread, fragmentation, shared capacity, twelve small) and `runFixture`.
- `apps/api/src/domain/study-planning/pacing-baseline.snapshot.json` —
  **new, frozen.** The pre-EP17B engine's output over the battery, generated
  once at `3d10130` with a throwaway `ts-node` script before `scheduler.ts`
  was edited. Regenerating it is a review event, not a routine fix.
- `apps/api/src/domain/study-planning/scheduler.spec.ts` — additive section 16
  (18 new `it` blocks → 39 runtime cases).

## Verification

All commands run from
`/Users/michaelrobert/.cache/claude-hfi/-Users-michaelrobert-Desktop-focus-app/oak/apps/api`
at the final working tree (the commit below).

| Command | Result |
|---|---|
| `npx jest scheduler.spec` | PASS — 1 suite, **96 tests passed, 0 failed** (57 pre-existing, all unchanged, + 39 new) |
| `npx jest identity.spec preferred.spec energy.spec catch-up.spec calibration.spec intervals.spec ordering.spec preferences.spec study-plans.service.spec` | PASS — 9 suites, **233 tests passed, 0 failed** |
| `npx jest` (whole API suite) | PASS — 56 suites passed, 29 skipped (DB-gated `describeIntegration`); **1305 tests passed, 533 skipped, 0 failed** |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS (eslint, `--max-warnings 0`) |
| `pnpm format` | PASS ("All matched files use Prettier code style") |

Test counts (this record is the only home): **96** in `scheduler.spec.ts`
(39 of them new for EP17B), **233** across the nine engine/service suites
re-run as regression, **1305 passing / 0 failing** across the whole API jest
run. No web file changed, so `apps/web` was not re-run; F-EP17A-01's four
pre-existing `apps/web` e2e lint failures are untouched and still open.

Verification tasks: **V-17-1** (pacing smoke) observed — AC1 fixture, five
even days at 100 vs two front-loaded days at 0. **V-17-2** (many-small
counterexample) observed — identical totals, session count and results.
**V-17-3** (byte-identical baseline) observed — 19/19 fixtures byte-identical
at `spreadPercent 0` against the frozen pre-EP17 snapshot, plus the unchanged
EP15C `identity.spec` snapshot.

## Deviations

1. **`oneSitting` floor added to contracts §3's `evenShare`** — required by
   the frozen EP17B-AC5; see F-EP17B-01. Documented in the engine rule list.
2. **New fixture module + frozen snapshot** rather than fixtures inline in
   the spec — the story's sizing block anticipated "a **new** frozen pre-EP17
   baseline fixture under the domain test folder"; the battery module is what
   lets the baseline, the sum invariant and the determinism gate share one
   fixture set.
3. **No `types.ts` change** — EP17A already added `spreadPercent` to
   `StudyPreferences`.

## Findings

- **F-EP17B-01** — source: implementing contracts §3 against EP17B-AC5;
  paths: `docs/stories/EP17/contracts.md` §3, `scheduler.ts` (rule 9 doc
  comment + `sittingLength` / `evenShareOf`); issue: contracts §3's
  `evenShare(A, D) = ceil(A.remainingAtRunStart / |usableDays(A)|)` is
  unsatisfiable together with EP17B-AC5 — a 15-minute assignment with a
  five-day horizon gets a 3-minute target, below `minSessionMinutes`, so the
  D17-3 student's twelve small assignments would place **nothing**;
  disposition: implemented the minimal fix (floor the share at one sitting
  for that assignment) because the AC is frozen and the formula is the
  derived artifact, and documented it in the engine's rule list;
  **contracts §3 needs a one-line amendment** which this role may not write;
  owner: planner / live session; closure evidence: pending — the contract
  amendment.
- **F-EP17B-02** — source: writing the feasibility-floor fixture; paths:
  `scheduler.ts` `dayTakeOf` and the critical filter in the day loop; issue:
  the feasibility floor `max(paceTarget, remaining − capacityAfter)` is
  strictly subsumed by rule 3's critical test, which fires on exactly the
  same predicate (`item.remaining > capacityAfter(item, date)`) and exempts
  the assignment from pacing altogether — so the floor is implemented per
  contract but is never the binding constraint today; disposition:
  implemented and kept (it is the belt to rule 3's braces, costs nothing, and
  stops being redundant the moment the two consumers of `capacityAfter`
  diverge — which contracts §4 makes EP17C do), recorded here and in the
  owning test's comment rather than left as folklore; owner: EP17C's
  implementer (re-check once the budget becomes pass-aware); closure
  evidence: pending.
- **F-EP17B-03** — source: tracing `schedule()`'s callers at closeout; paths:
  `apps/api/src/modules/study-plans/study-plans.service.ts:1129-1137`
  (`preview`) and `catchUpPreview`; issue: the service already forwards the
  whole `preferences` object, and `readStudyPreferences` defaults
  `spreadPercent` to `70`, so **real students' previews start pacing at
  EP17B**, before EP17D wires anything and before EP17G gives them the
  control; disposition: expected and acceptable — this is precisely the
  window contracts §7 records ("the engine paces but no student can change
  the lever", opens EP17B, closes EP17G) on a development branch where EP17
  ships as one review unit; no code change; `study-plans.service.spec`
  (42 tests) passes unchanged; owner: EP17G; closure evidence: pending.

## Remaining

None for EP17B. EP17C is the next child and is not started.
