# EP17B — Engine: per-assignment daily pacing

**Story ID:** EP17B
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Backend (pure domain)
**Status:** Queued
**Dependencies:** EP17A (the `spreadPercent` lever must exist).

## Plan at a glance

- **What this changes:** the scheduling engine stops filling each day to its budget before looking at the next one. A per-assignment **daily pacing target** — its remaining minutes shared over the days of its horizon — becomes a soft ceiling in the day loop (`scheduler.ts:539`), so a week with slack reads as several moderate days instead of two full ones and a hollow Thursday. The feasibility override, the deficit categories, the ordering comparator, breaks, energy, study blocks and the anchor pass are all untouched.
- **Why it improves it:** a student with ADHD who sees Monday at 240 minutes abandons the plan on Monday; an even week is a week they can keep (product). In the code it replaces an implicit "earliest-feasible" objective — which no comment ever claimed and no test ever named — with a stated rule 9 in the engine's documented rule list, and a pure function that reproduces the old behaviour exactly at `spreadPercent = 0` (code).
- **Decisions needing you:** none still ▲ in this story — ▲ D17-3 (minute-based pacing, no session-count ceiling) is already **Ruled (user, 2026-11-19)**. D-B1…D-B4 below are non-material and ratify by default.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Add rule 9 — pacing — to `schedule()`. For each assignment the engine
computes, from run-start inputs only, an even share of its remaining minutes
over the usable days of its horizon, then caps what that assignment may take
on a day by a blend of that share and the day's budget, weighted by
`spreadPercent`. Critical work (rule 3's feasibility override) ignores the
cap entirely. Minutes the cap declines flow into the existing
deficit/deferred classification, so nothing is lost. At `spreadPercent = 0`
the output is byte-identical to the pre-EP17 engine.

## Scope

**In:** `scheduler.ts` (the pacing computation, the day loop's use of it, the
rule-list doc comment), `scheduler.spec.ts` (deliberate expectation updates +
new cases), a frozen pre-EP17 baseline fixture for the compatibility test.

**Out:** study-day selection (EP17C); service wiring (EP17D); any change to
`ordering.ts`, `intervals.ts`, the energy ranking, the FLEX/FIXED partition
or the deficit categories; intra-gap placement (D17-9 — `commitBlock` still
starts at `interval.startMinute`).

## Source requirement references

AC-E17-01, AC-E17-02, AC-E17-03, AC-E17-04, AC-E17-14; TR-E17-01, TR-E17-02,
TR-E17-07; DoD-1, DoD-8, DoD-9.

## Acceptance criteria

1. For an assignment with slack in its horizon, the engine places no more
   than its pacing target on any one day, computed as
   [contracts §3](./contracts.md#3-the-pacing-rule-ep17b-owns-the-definition)
   states. Concretely: one 300-minute assignment due in five days, on five
   days of equal generous availability, receives minutes on at least four of
   those days instead of exhausting the first two days' budgets.
2. The rule 3 feasibility override is unchanged and runs first: an assignment
   whose remaining work exceeds `capacityAfter` on a day is still served
   before any rotation and **ignores** its pacing target. In the normal pass,
   a day's take for an assignment is floored at
   `max(paceTarget, remaining − capacityAfter)` ([contracts §3](./contracts.md#3-the-pacing-rule-ep17b-owns-the-definition)'s
   feasibility floor), so pacing never voluntarily defers minutes the later
   horizon days cannot nominally absorb. **Bounded claim (R-EP17-01):**
   because `capacityAfter` (`scheduler.ts:317-332`) stays optimistic about gap
   fragmentation and competing assignments, the guarantee is that pacing is
   **no worse than the rule 3 guarantee the engine already makes** — a fixture
   whose deadline is met by the pre-EP17 engine and whose final-day capacity
   is real (not an artifact of that optimism) is still met after pacing; the
   residual-optimism cases are pinned by the adversarial fixture below.
3. For every run the minutes are accounted for **per deficit category**
   (R-EP17-02, matching `scheduler.ts:594-628`): for a non-overdue
   assignment, `placedMinutes + deficitMinutes + deferredMinutes =` input
   `remainingMinutes`; for an `OVERDUE` assignment,
   `deficitMinutes = remainingMinutes` whatever was placed
   (`scheduler.ts:594-596`) and `placedMinutes` is reported alongside. The
   category set is exactly the pre-EP17 set. Minutes the pacing target
   declines are reported as `INSUFFICIENT_TIME_BEFORE_DEADLINE` by the
   existing branch (`scheduler.ts:612-618`) — never dropped, never a new
   category.
4. `schedule()` remains pure and deterministic: no clock, no randomness, no
   I/O, no `@nestjs/*` or Prisma import; the same input yields byte-identical
   output across repeated runs; and with `spreadPercent = 0` the output is
   byte-identical to the recorded pre-EP17 baseline over the whole fixture
   battery.
5. **The D17-3 counterexample holds:** a week of twelve small assignments
   (15–30 min each) places the same total minutes as the pre-EP17 engine and
   the same number of sessions — pacing throttles a *large* assignment's
   share of a day, never the number of distinct pieces of work a day may
   hold.

## Tests

In `scheduler.spec.ts` (TR-E17-01, TR-E17-02, TR-E17-07):

- *spreads one large assignment across its horizon* — the EP17B-AC1 fixture;
  asserts per-day minutes, not just the total.
- *does not spread a tight-deadline assignment* — remaining ≈ capacity; the
  placement matches the pre-EP17 expectation exactly (EP17B-AC2).
- *never introduces a deadline miss* — a battery of fixtures run at
  `spreadPercent` 0 and 100; no fixture gains a deficit category at 100
  (EP17B-AC2, negative).
- *pacing under optimistic capacity — the fragmentation counterexample*
  (**owning adversarial test for EP17B-AC2 / R-EP17-01**): plan-review pass
  1's counterexample 1 — 100 min due Tue, Mon holds one 100-min gap, Tue has
  140 free minutes in 10-min gaps (`minSessionMinutes = 15`), so
  `dayBudgetOf(Tue)` is nominal only. At `spreadPercent = 100` the fixture
  pins the chosen behaviour under the feasibility floor and documents the
  bounded claim; a companion case covers counterexample 2 (two 60-min
  assignments sharing a tight Tuesday).
- *accounts for every minute* — property-style sum assertion across the
  battery, **per deficit category** (EP17B-AC3, R-EP17-02): non-overdue —
  `placed + deficit + deferred = remaining`; `OVERDUE` —
  `deficit = remaining` and `placed` asserted alongside.
- *is byte-identical at `spreadPercent = 0`* — `JSON.stringify` compared to
  the frozen baseline (EP17B-AC4, TR-E17-02).
- *is byte-identical across two runs of the same input* at `spreadPercent`
  70 and 100 (EP17B-AC4, determinism).
- *does not throttle many small assignments* — the D17-3 counterexample
  (EP17B-AC5): totals and session count equal the pre-EP17 run.
- *overdue work still uses the whole window* and *work due after the window
  is still `deferred`* — unchanged-behaviour guards.
- **Updated existing cases:** each changed expectation carries a comment of
  the form `// EP17B rule 9: <why this moved>` (TR-E17-07). An existing case
  whose expectation changes without such a reason is a defect, not an update.

## Technical notes

- Inspected `scheduler.ts` end to end. The insertion points:
  - rule list doc comment `:16-88` — rule 9 is appended there, in the same
    voice as rules 1–8.
  - `baselineFreeMinutes` `:290-293` and `dayBudgetOf` `:296-299` — run-start
    data, the only inputs `evenShare` may read (purity, EP17B-AC4).
  - `Progress` `:213-226` — the natural home for the per-assignment
    per-day target cache; it must be derived from run-start values, **not**
    from `item.remaining`, which mutates during the run.
  - `placeBlock` `:482-529` and `desiredFor` `:410-411` — the cap applies to
    the desired block length and to the assignment's running total for the
    day; a per-assignment per-day counter is needed (the existing
    `budgetLeft` map is per-day across all assignments).
  - the critical pass `:547-553` calls `placeBlock(..., false)` — that
    `preferEnergy = false` path is the existing "feasibility, not preference"
    channel; pacing must be bypassed on the same condition (D-B2).
  - deficit classification `:584-628` — unchanged; `:612-618` already
    documents "everything the rules declined to place … is reported here".
- **Proposed:** the blend formula of [contracts §3](./contracts.md#3-the-pacing-rule-ep17b-owns-the-definition)
  rather than a hard `evenShare` cap, so `spreadPercent` is a continuous
  lever with an exact "off" value.
- Risk: `scheduler.spec.ts` is 1035 lines and pins current placement. Under
  D17-7 (a) expectations are updated case by case with a named reason, and a
  frozen baseline fixture preserves the pre-EP17 behaviour as a test, not as
  folklore. Expect a substantial, deliberate spec diff — it is the work, not
  a surprise.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-B1 | Pacing granularity: (a) per assignment per day (each assignment takes at most its share of a day); (b) per day across all work (cap the day's total below its budget) | **(a)** — (b) is just a lower `densityPercent` and would throttle the many-small-assignments student the user protected in D17-3; (a) smooths each piece of work across its own horizon, which is what "spread my week" means | Ratified (user, 2026-11-19) |
| D-B2 | Critical work and pacing: (a) the rule 3 critical pass bypasses the pacing cap entirely (the existing `preferEnergy = false` channel); (b) critical work gets a raised cap | **(a)** — a deadline is a constraint and smoothness is a preference; mixing them is how a scheduler starts missing deadlines "slightly" | Ratified (user, 2026-11-19) |
| D-B3 | Where `evenShare`'s denominator comes from: (a) the days of the assignment's horizon that have a non-zero day budget at run start; (b) every calendar day of the horizon | **(a)** — (b) would hand a share to a day the student has no free time on and silently under-plan the rest of the week | Ratified (user, 2026-11-19) |
| D-B4 | Rounding: (a) `ceil` the even share, so rounding can never leave a residue that no day may absorb; (b) `floor`; (c) distribute the remainder | **(a)** — simplest rule that cannot lose minutes; any residue is absorbed by the last days of the horizon, and the deficit report catches what is genuinely unplaceable | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-1 (ACs), DoD-8 (automated tests, including the determinism and
compatibility gates), DoD-9 (rule 9 documented in the engine's rule list and
in [contracts.md §3](./contracts.md#3-the-pacing-rule-ep17b-owns-the-definition)).
DoD-2/3/4/5/6/7 N/A — a pure function with no input surface, no persistence
and no UI. DoD-10/11 at the EP17 parent review.

## Sizing

- **Outcome:** the engine spreads an assignment's work across its horizon
  instead of front-loading it, provably without losing minutes or missing a
  deadline.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/domain/study-planning/scheduler.ts`,
  `scheduler.spec.ts`, `types.ts` (if the input gains the lever), and a
  **new** frozen pre-EP17 baseline fixture under the domain test folder.
- **Start context:** this story,
  [contracts.md §1 and §3](./contracts.md), `scheduler.ts` in full, and the
  placement sections of `scheduler.spec.ts`.
- **Verification:** `pnpm --filter @studypilot/api test -- scheduler` green;
  the byte-identical baseline case passes; V-17-1, V-17-2 and V-17-3 observed
  and recorded in `implementation.md`.
- **Dependencies / exclusions:** needs EP17A's lever. Study-day selection is
  EP17C; the service never calls the new behaviour until EP17D.
