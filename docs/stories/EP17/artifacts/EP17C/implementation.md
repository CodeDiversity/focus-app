# EP17C — Engine: study-day selection — implementation record

**Implementer:** implementer session, 2026-11-19. **Branch:**
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/oak` (worktree), base `c965a3d`.

## Completed behavior

The scheduling engine gained **rule 9b — study-day selection** (contracts §4;
▲ D17-2 (a), D-C1, ▲ D-C2 (a)), documented in `scheduler.ts`'s rule-list doc
comment next to EP17B's rule 9. Once per run, from run-start data only:

```text
studyDays(window) = the `weeklyGoalDays` days of the window with the most
                    baseline free minutes; ties broken by the earlier date
```

implemented as the exported pure helper `selectStudyDays(days, freeMinutesOf,
count)` (sort key pair `(−freeMinutes, windowIndex)` — total, so the result
cannot depend on sort stability or on input order).

**The narrowed budget is pass-aware (R-EP17-03).** One new reader,
`normalBudgetOf(item, date)`, returns the real `dayBudgetOf(date)` on a
selected day (or for a full-horizon-fallback assignment) and `0` otherwise.
The four sites the story names:

| Site | Reads | Why |
|---|---|---|
| normal rotation (`placeBlock`) | narrowed — `preferEnergy && normalBudgetOf(item, date) <= 0 → return 0` | the student's study-day count shapes normal placement |
| rule 3 critical pass (`placeBlock(..., preferEnergy = false)`) | the **real** `budgetLeft` | a deadline always beats the preference |
| `capacityAfter` | narrowed | so "can this still fit?" is asked of the days the plan may normally use — which is exactly what lets rule 3 *notice* a deadline the selection alone would miss |
| anchor pass (`horizonCapacity`) | narrowed | ▲ D-C2 (a): less slack legitimately pins more sessions `FIXED` |

Plus two sites the coordinator's mid-task check and EP17B's code made
necessary:

- **`evenShareOf`'s `|usableDays(A)|`** reads `normalBudgetOf` (see the
  verification note below) — contracts §3's definition ("days surviving the
  §4 selection") rather than EP17B's D-B3 approximation ("horizon days with a
  non-zero run-start budget"), which coincided with it only while every day
  was usable. `dayTakeOf`'s day budget is likewise the narrowed one.
- **the EP15C course-tie branch** in `placeBlock`: the out-of-turn owner is
  still a normal-pass placement, so its own day must be usable too.

**Full-horizon fallback (contracts §4).** An assignment with no selected day
of positive budget inside its horizon is added to `fullHorizonFallback` at
run start, and `normalBudgetOf` hands it the real budget on every day.
Smoothness never manufactures a miss. Its visible effect is *not*
reachability (the critical pass would reach those days anyway) but
**quality**: a fallback assignment stays out of the critical set, so it is
still paced across its horizon and still emitted `FLEX_DAY` instead of being
bunched and pinned. The fixture asserts exactly that.

**Compatibility.** `weeklyGoalDays` is read with a defensive fallback of
**7** — every day usable, the pre-EP17C engine byte for byte — clamped to
the `1…7` bounds of `STUDY_PREFERENCE_BOUNDS`. A window shorter than the
count selects the whole window.

Not touched: ordering, gap choice, the energy ranking, the preferred tier,
breaks, the density cap, min/max block length, `tryMergeTail`, the
deficit/deferred classification *(including `NO_AVAILABLE_TIME`, which still
asks about the **unnarrowed** baseline — "did the student have free time at
all?" — so no assignment changes category because of the selection alone)*,
`types.ts`, and the service (EP17D owns wiring and the `pacing` payload).

## AC-by-AC outcome

- **EP17C-AC1 — met.** `UNEVEN_MINUTES` (a week of 60/300/120/240/30/210/90
  free minutes, one window per date) with `weeklyGoalDays: 3` places on
  **exactly** `2026-10-31`, `2026-11-02`, `2026-11-04` — the three richest
  days — 100 minutes each, 300 placed, no deficit. Ties: a fixture with two
  days tied at 120 and `N = 2` never touches the later tied day; the
  `selectStudyDays` unit case pins the ranking directly. The two carve-outs
  have their own fixtures (AC3 below).
- **EP17C-AC2 — met.** Over the whole 19-fixture battery at `spreadPercent`
  0, 70 and 100, the output at `weeklyGoalDays: 7` is byte-identical to the
  output with the key **absent** and with it `NaN`; the frozen
  `pacing-baseline.snapshot.json` (19/19 byte-identical at `spreadPercent 0`)
  and the EP15C `identity.snapshot.json` both still pass unchanged. A short
  window is fully selected (`N = 2` over a two-day window ≡ `N = 7`).
- **EP17C-AC3 — met.** *Critical carve-out:* `N = 1` selecting only
  `2026-10-30` (240 min) with 300 minutes due `2026-10-31` places 240 + 60 —
  the 60 on the **unselected** `10-31` — with `deficitMinutes: 0` and a
  `null` category. A naive zeroing of `dayBudgetOf` reports a 60-minute
  deficit here; this fixture is the executable form of R-EP17-03.
  *Fallback carve-out:* `N = 1` selecting `11-01` with work due `10-31`
  (horizon `{10-30, 10-31}`, no selected day) paces 60 + 60 across the full
  horizon, `FLEX_DAY`, no deficit. *Negative:* over the whole battery at
  `N = 3` and `N = 1`, every assignment's deficit category is identical to
  its category at `N = 7` — **no exception was needed**, including for the
  two adversarial EP17B fixtures. *Boundary:* `N = 1` with two 300-minute
  assignments reports the shortfall through
  `INSUFFICIENT_TIME_BEFORE_DEADLINE` only, with
  `placed + deficit + deferred = remaining` per assignment and the session
  minutes summing to the reported `placedMinutes` — no minutes vanish and no
  new category appears.
- **EP17C-AC4 — met.** Byte-identical across two runs of every battery
  fixture at `N ∈ {1, 3, 5}`; identical output when the two assignments are
  handed in reversed; the input object is not mutated. The selection reads
  only `baselineFreeMinutes` (built before any placement, never mutated) and
  `preferences`; the sort is over the window array with a total key pair. No
  clock, no randomness, no I/O — the existing source-text purity boundary
  test still passes.
- **EP17C-AC5 — met.** One statement per consumer, and they agree:
  `preferences.ts`'s `weeklyGoalDays` comment now says it is both the
  momentum yardstick and the rule 9b planning instruction (the sentence
  "They gate nothing" is gone); the engine's rule list carries rule 9b with
  the same definition; contracts §4 is the cited source. **Momentum read
  confirmed unaffected** (the story asked for this before changing the
  documentation): `momentum.ts:52,78,122` and
  `study-sessions.service.ts:695-715` read `weeklyGoalDays` through
  `readStudyPreferences` for the streak yardstick only, never through the
  scheduler; `momentum.spec.ts:42` already pins that, and all 12
  `study-planning` suites plus the momentum service suite pass unchanged.

### Coordinator's binding check — `evenShareOf` reads the narrowed budget

Confirmed, implemented and pinned by its own test
(*"divides the even share over the **selected** days, not every day with free
time"*). The `UNEVEN_MINUTES` fixture is the discriminating case the
coordinator asked for: **seven** days of positive run-start budget but
**three** selected days. Narrowed (shipped) → share `300/3 = 100`, and the
first selected day places 100. Unnarrowed → share `ceil(300/7) = 43`, floored
to one sitting (60), and the same day would place 60. The test asserts `100`
and explicitly asserts `not 60`. No contracts change is needed: §3 as amended
already defines `|usableDays(A)|` as the days surviving §4, and the code now
matches it — EP17B's D-B3 wording ("non-zero run-start budget") is the
*implementation* of that definition under the narrowed budgets.

### TR-E17-07 — the `scheduler.spec.ts` diff

**No existing expectation changed.** As with EP17B, the compatibility value
does the work: every pre-existing engine fixture now stores
`weeklyGoalDays: 7`, carrying the comment
`// EP17C rule 9b: 7 = every day usable — the pre-EP17C engine (TR-E17-02).`
That single-value edit (7 files, one line each: `scheduler.spec.ts`,
`pacing-fixtures.ts`, `identity-fixtures.ts`, `catch-up.spec.ts`,
`calibration.spec.ts`, `preferred.spec.ts`, `energy.spec.ts`) is the whole
"updated existing cases" set — it changes the fixture's *input*, never an
expectation, and every suite passed unchanged on the first run after it. The
rest of the spec diff is additive: one new
`describe('17. study-day selection (EP17C rule 9b)')` section. One EP17B
comment was extended to record the F-EP17B-02 re-check (below).

## Changed paths

- `apps/api/src/domain/study-planning/scheduler.ts` — rule 9b in the rule-list
  doc comment; exported `selectStudyDays`; `weeklyGoalDays` normalisation
  (fallback 7, clamp 1…7); the run-start `studyDays` set; the
  `fullHorizonFallback` set and `normalBudgetOf`; narrowed `capacityAfter`,
  `evenShareOf`, `dayTakeOf` and anchor-pass `horizonCapacity`; the
  normal-pass guard and the course-tie owner guard in `placeBlock`.
- `apps/api/src/domain/study-planning/scheduler.spec.ts` — new section 17
  (16 new `it` blocks → 33 runtime cases); `weeklyGoalDays: 7` in `PREFS`;
  one F-EP17C-01 comment on EP17B's feasibility-floor case.
- `apps/api/src/domain/study-planning/pacing-fixtures.ts` —
  `runFixture(f, spreadPercent, weeklyGoalDays?)`; `weeklyGoalDays: 7`.
- `apps/api/src/domain/study-planning/preferences.ts` — **documentation
  only** (the `weeklyGoalDays` default's comment). No key, bound, default
  value, validator or reader behaviour changed.
- `apps/api/src/domain/study-planning/{identity-fixtures,catch-up.spec,calibration.spec,preferred.spec,energy.spec}.ts`
  — the one-line compatibility value.
- `docs/stories/EP17/artifacts/EP17C/implementation.md`, the EP17C story's
  Status + sizing, the README queue row, `artifacts/efficiency.md`.

## Verification

All commands run from
`/Users/michaelrobert/.cache/claude-hfi/-Users-michaelrobert-Desktop-focus-app/oak/apps/api`
at the final working tree (the commit below).

| Command | Result |
|---|---|
| `npx jest scheduler.spec` | PASS — 1 suite, **129 tests passed, 0 failed** (96 pre-existing, all unchanged, + 33 new) |
| `npx jest src/domain/study-planning` | PASS — 12 suites, **372 tests passed, 0 failed** |
| `npx jest` (whole API suite) | PASS — 56 suites passed, 29 skipped (DB-gated `describeIntegration`); **1338 tests passed, 533 skipped, 0 failed** |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS (eslint, `--max-warnings 0`) |
| `pnpm format` | PASS ("All matched files use Prettier code style") |

Test counts (this record is the only home): **129** in `scheduler.spec.ts`
(33 of them new for EP17C), **372** across the twelve `study-planning`
suites, **1338 passing / 0 failing** across the whole API jest run — EP17B's
1305 plus the 33 new cases, no regression. No web file changed, so `apps/web`
was not re-run; F-EP17A-01's four pre-existing `apps/web` e2e lint failures
are untouched and still open.

Gates re-run: the frozen `pacing-baseline.snapshot.json` (19/19 byte-identical
at `spreadPercent 0`) and the EP15C `identity.snapshot.json` both pass
unchanged — TR-E17-02 holds at the compatibility values
(`spreadPercent 0`, `weeklyGoalDays 7`).

**One-off experiment (not committed), for F-EP17C-01:** `dayTakeOf`'s
feasibility floor was temporarily replaced with `const floored = paceTarget;`
and `npx jest src/domain/study-planning` was re-run — **372 passed, 0
failed**, i.e. no test in the suite distinguishes the engine with the floor
from the engine without it. The file was restored from a scratch copy and the
suite re-run green.

## Deviations

1. **The compatibility value is carried in the fixtures, not in the engine
   default.** The engine's fallback for a missing `weeklyGoalDays` is `7`,
   while `readStudyPreferences` defaults it to `3`. The two differ on purpose
   and for the same reason EP17B's `spreadPercent` does: the engine must be
   byte-compatible for fixtures and non-HTTP callers, while the student's
   stored preference must mean what it says. See F-EP17C-02.
2. **`selectStudyDays` is exported** (like `byEnergyPreference`) so the spec
   can pin the ranking and the tie-break without going through a whole run.
   EP17D may reuse it for contracts §5's `studyDays`, but nothing outside the
   domain imports it today.
3. **No `FRAGMENTED_FIXTURE` exception in the AC3 negative.** The story's
   wording allowed for one; measurement showed none is needed.

## Findings

- **F-EP17C-01** — source: the dispatch's hand-off of F-EP17B-02 (re-check
  the feasibility floor once budgets are pass-aware); paths:
  `scheduler.ts` `dayTakeOf` / the critical filter in the day loop,
  `scheduler.spec.ts` ("never defers below what the later horizon days can
  nominally absorb"); issue: the floor
  `max(paceTarget, remaining − capacityAfter)` is **still** subsumed by rule
  3's critical test. The expectation was that pass-awareness would separate
  them, but contracts §4 narrows `capacityAfter` for *both* consumers
  (deliberately — the critical test must see the narrowed estimate or rule 3
  could not notice a deadline the selection alone would miss), so the two
  predicates remain literally the same expression on the same day-start
  snapshot: an item is either critical (and exempt from pacing) or has
  `remaining ≤ capacityAfter`, which makes the floor's second term ≤ 0;
  disposition: **kept, not removed.** It is the belt to rule 3's braces,
  costs nothing, and is what contracts §3 specifies; the deletion experiment
  above is recorded as the evidence that it is non-binding rather than left
  as an assertion. It stops being redundant only if a future story gives the
  two consumers different capacity estimates; owner: planner / live session
  (whether contracts §3 should note that the floor is currently inert —
  this role may not edit `contracts.md`); closure evidence: this record + the
  owning test's comment.
- **F-EP17C-02** — source: tracing `schedule()`'s callers at closeout; paths:
  `study-plans.service.ts:1129-1137` (`preview`, `catchUpPreview`),
  `preferences.ts:67`; issue: the service forwards the whole preferences
  object and `readStudyPreferences` defaults `weeklyGoalDays` to **3**, so
  from this commit **real students' previews are narrowed to three study
  days**, before EP17D wires anything and before EP17G surfaces the control
  with its new meaning — which is precisely the proviso attached to ▲ D17-2
  (a). This is the `weeklyGoalDays` twin of F-EP17B-03 and widens that
  window: a student who set the key as a *momentum yardstick* now has it
  instructing the planner; disposition: expected and acceptable on the
  development branch (contracts §7's "the engine paces but no student can
  change the lever", opening EP17B, closing EP17G) and no code change is
  warranted here, but it is the ▲ D17-2 proviso's dependency and should be
  named at the parent review; owner: EP17G (surface the control), EP17H
  (journey); closure evidence: pending.
- **F-EP17C-03** — source: the coordinator's mid-task binding check; paths:
  `scheduler.ts` `evenShareOf`, contracts §3's `|usableDays(A)|` vs EP17B's
  D-B3; issue: EP17B's D-B3 phrasing ("horizon days with a non-zero
  **run-start** budget") and contracts §3's ("days surviving the §4
  selection") coincided only while every day was usable; left unchanged,
  `evenShareOf` would have divided a three-day student's work over seven
  days and produced thin, under-filled sessions; disposition: **resolved in
  code** — `evenShareOf` reads `normalBudgetOf`, pinned by its own
  discriminating test (7 budgeted days, 3 selected; 100 min/day, asserted not
  60). No contracts change needed: the amended §3 already says the right
  thing and the code now matches it; owner: closed by this story; closure
  evidence: `scheduler.spec.ts` §17 EP17C-AC1, case *"divides the even share
  over the selected days, not every day with free time"*.

## Remaining

None for EP17C. EP17D is the next child and is **not** started.
