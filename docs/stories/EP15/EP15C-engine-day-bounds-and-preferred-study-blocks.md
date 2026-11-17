# EP15C — Engine: Day-Bounds Base, Dated Busy Time and Preferred Study Blocks

**Story ID:** EP15C
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Backend (pure domain)
**Status:** Queued
**Dependencies:** EP15A implemented (shares `domain/schedule` types). Epic decisions D15-1, D15-6, D15-7, D15-8 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** `SchedulerInput` takes `dayBounds` (dated) as the base, `blocked` as dated intervals, and a new `preferred` list (study blocks with energy and optional course); placement ranks preferred gaps first, then EP13J's energy order, then earliest; inside a course-tied gap that course's work goes first. With no study blocks and bounds equal to the old windows the output is byte-identical to today's.
- **Why it improves it:** the planner finally places into the whole free day and honours the blocks the student said they would keep (product, AC-E15-02/05/06/07); the change is one base swap plus one ranking key on top of an unchanged algebra, pinned by an identity test (code).
- **Decisions needing you:** none ▲ — D-C1…D-C3 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Teach the pure engine the new world without touching its rules: breaks,
density, interleaving, min/max, flex partition and energy all stay as
shipped. The base becomes the day's bounds, busy time arrives dated, and
study blocks become a ranking preference carried through the interval
algebra like energy already is.

## Scope

**In:** `types.ts` (input shape, `PreferredInterval`, `courseId` pass-through on assignments), `intervals.ts` (merge keyed on energy **and** `preferredKey`; intersection helper), `scheduler.ts` (base swap, dated blocked, ranking, course tie), `catch-up.ts`/`replan` pass-through, specs incl. the identity test.
**Out:** persistence and gathering (EP15D), `conflicts.ts` and the save-time re-check (unchanged, D15-8).

## Source requirement references

AC-E15-02, AC-E15-05, AC-E15-06, AC-E15-07, AC-E15-14; TR-E15-03; V-15-3; DoD-8.

## Acceptance criteria

1. `SchedulerInput` matches contracts.md (`dayBounds: DatedInterval[]`, `blocked: DatedInterval[]`, `preferred: PreferredInterval[]`, `classes`/`busy`/`preferences` unchanged; `SchedulableAssignment.courseId?`); every existing caller (`preview`, `save`, `replan`, `today`) compiles against it; `conflicts.ts` is untouched; the module still imports nothing from `@nestjs/*` or Prisma and reads no clock.
2. Nothing is placed outside `dayBounds` for a day, over a `blocked` interval (a one-off event blocks only its date), a class or a `busy` interval; a day with zero bound minutes yields `NO_AVAILABLE_TIME`; a `24:00` bound end is a legal `1440` edge.
3. Free pieces inside a `preferred` interval are tried before pieces outside it, then by EP13J's energy order with the block's energy, then earliest; inside a course-tied piece the round-robin serves that course's assignments first; critical work (EP13F rule 3) still goes first everywhere; the total free minutes of a day are the same with and without a study block over free time (AC-E15-07).
4. With `preferred` empty and `dayBounds` equal to the former available windows, output is byte-identical to the EP13J engine on every existing scheduler fixture (incl. `anchor`/`windowHint`); two runs on inputs with events and study blocks are byte-identical (V-15-3).

## Tests (TR-E15-03)

- Bounds base: placement stays inside; zero-minute day; `1440` edge; one-off blocked on one date only.
- Preferred: preferred-first vs an earlier non-preferred gap; energy inside block vs NORMAL outside; course tie reorders candidates only inside the tied piece; critical work ignores preference; free-minute total unchanged by a study block.
- Algebra: `mergeIntervals` keeps pieces with different `preferredKey` apart, merges equal (energy, key); intersection splits a free interval at block edges.
- Identity (EP15C-AC4) over the existing `scheduler.spec.ts` fixtures by adapter; determinism across two runs; purity grep.

## Technical notes

- **Inspected:** `scheduler.ts` (`weeklyToDated`, `byEnergyPreference`, `Progress`, day-centric loop header), `intervals.ts` (`mergeIntervals` energy tie order, `freeIntervals` base kinds), `types.ts` (`WeeklyWindow`, `DatedInterval.energy`, `FreeIntervalBase`, `SchedulerInput`), EP13J-AC3 identity test shape.
- **Proposed:** `DatedInterval` gains optional `preferredKey?: string` and `courseId?: string | null`; `piece()` copies them; `ENERGY_TIE_ORDER` sort extended by key for totality; `byEnergyPreference` becomes `rankGaps(free, demanding)` adding the preferred rank in front; the candidate list for a gap is reordered by `courseId` match before the round-robin pointer is applied.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-C1 | Carrying preference through the algebra: (a) `preferredKey` on `DatedInterval`, merge only equal (energy, key) — the EP13J D-J2 mechanism extended; (b) a parallel map re-derived by intersection | **(a)** — one algebra, already proven for energy | Proposed |
| D-C2 | Ranking order: (a) preferred → energy → earliest; (b) energy → preferred → earliest | **(a)** — "fill my study blocks first" is the student's explicit intent; energy is a heuristic | Proposed |
| D-C3 | Course tie: (a) candidate reorder inside the tied piece only, feasibility first; (b) hard reservation (only that course may use the piece) | **(a)** — a reservation would leave the block empty when the course has no work (D15-6) | Proposed |

## Definition of Done

1, 8 (TR-E15-03), 9 (contracts.md engine section). 2–7 N/A (pure domain). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the engine places into the whole free day, honours study blocks first, and proves it changed nothing else.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/domain/study-planning/{types,intervals,scheduler}.ts`, `catch-up.ts` (pass-through), `{intervals,scheduler,energy,catch-up}.spec.ts` (+ a new `preferred.spec.ts`).
- **Start context:** this story; contracts.md § Engine input; `scheduler.ts` ranking hook; EP13J story's Review note (merge hazard).
- **Verification:** `pnpm --filter @studypilot/api test -- domain/study-planning` green; identity and determinism tests pass; `typecheck` green (callers compile — EP15D adapts the service).
- **Dependencies / exclusions:** EP15A types. Gathering → EP15D. `conflicts.ts` unchanged (D15-8).
