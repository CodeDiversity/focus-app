# EP15C — Engine: Day-Bounds Base, Dated Busy Time and Preferred Study Blocks

**Story ID:** EP15C
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Backend (pure domain)
**Status:** Implemented — awaiting parent review (2026-11-17); record: [artifacts/EP15C/implementation.md](./artifacts/EP15C/implementation.md)
**Dependencies:** EP15A implemented (shares `domain/schedule` types). Epic decisions D15-1, D15-6, D15-7, D15-8 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** `SchedulerInput` takes `dayBounds` (dated) as the base, `blocked` as dated intervals, and a new `preferred` list (study blocks with energy and optional course); placement scans the preferred tier first and applies EP14E's energy order and light-work guard unchanged within each tier; inside a course-tied gap that course's work goes first; a thin adapter keeps the planning service compiling until EP15D. With no study blocks and bounds equal to the old windows the output is byte-identical to today's (EP14E) engine.
- **Why it improves it:** the planner finally places into the whole free day and honours the blocks the student said they would keep (product, AC-E15-02/05/06/07); the change is one base swap plus one ranking key on top of an unchanged algebra, pinned by an identity test (code).
- **Decisions needing you:** none — D-C1…D-C3 ratified by default 2026-11-17 at implementation start.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Teach the pure engine the new world without touching its rules: breaks,
density, interleaving, min/max, flex partition and energy all stay as
shipped. The base becomes the day's bounds, busy time arrives dated, and
study blocks become a ranking preference carried through the interval
algebra like energy already is.

## Scope

**In:** `types.ts` (input shape, `PreferredInterval`, `courseId` pass-through on assignments), `intervals.ts` (merge keyed on energy **and** `preferredKey`; intersection helper; D-J2-style overlap resolution for preferred intervals), `scheduler.ts` (base swap, dated blocked, two-tier ranking around EP14E's `byEnergyPreference(free, demanding, minBlock)`, course tie), `catch-up.ts`/`replan` pass-through, **a thin adapter in `study-plans.service.ts`** (contracts.md § Known windows: hull-plus-gaps bounds, `blocked` dated through the existing loops at `:1409–1419` and `:1634–1644`, `preferred: []`) so the service compiles and every suite stays green, specs incl. the identity test.
**Out:** the real gathering seam and the calendar payload (EP15D replaces the adapter), `conflicts.ts` and the save-time re-check (unchanged, D15-8).

## Source requirement references

AC-E15-02, AC-E15-05, AC-E15-06, AC-E15-07, AC-E15-14; TR-E15-03; V-15-3; DoD-8.

## Acceptance criteria

1. `SchedulerInput` matches contracts.md (`dayBounds: DatedInterval[]`, `blocked: DatedInterval[]`, `preferred: PreferredInterval[]`, `classes`/`busy`/`preferences` unchanged; `SchedulableAssignment.courseId?`); every existing caller (`preview`, `save`, `replan`, `today`) compiles against it through this story's thin adapter in `study-plans.service.ts` (replaced by EP15D) and every existing API suite stays green; `conflicts.ts` is untouched; the domain module still imports nothing from `@nestjs/*` or Prisma and reads no clock.
2. Nothing is placed outside `dayBounds` for a day, over a `blocked` interval (a one-off event blocks only its date), a class or a `busy` interval; a day with zero bound minutes yields `NO_AVAILABLE_TIME`; a `24:00` bound end is a legal `1440` edge.
3. Free pieces inside a `preferred` interval form the first tier and pieces outside the second; within each tier EP14E's `byEnergyPreference(free, demanding, minBlock)` applies unchanged with the block's energy on preferred pieces (its light-work anchor computed within the tier); inside a course-tied piece the round-robin serves that course's assignments first; overlapping study blocks resolve by the D-J2 rule (earlier start keeps its span, tie by `blockId`); critical work (EP13F rule 3) still goes first everywhere; the total free minutes of a day are the same with and without a study block over free time (AC-E15-07).
4. With `preferred` empty and the former available windows expressed as bounds (adapter rule: hull `[min start, max end)` per weekday plus the inter-window gaps as `blocked`), output is byte-identical to the **EP14E** engine on every existing scheduler fixture, with `hard` flags present or not (incl. `anchor`/`windowHint`); two runs on inputs with events and study blocks are byte-identical (V-15-3).

## Tests (TR-E15-03)

- Bounds base: placement stays inside; zero-minute day; `1440` edge; one-off blocked on one date only.
- Preferred: preferred-first vs an earlier non-preferred gap; energy inside block vs NORMAL outside; course tie reorders candidates only inside the tied piece; critical work ignores preference; free-minute total unchanged by a study block.
- Tier/guard interaction (R-EP15-01): light work, Monday, study block 20:00–22:00 LOW (preferred, no course) and free 09:00–12:00 NORMAL (not preferred) → the preferred evening piece is tried first; within the non-preferred tier alone the EP14E guard still anchors on 09:00 (EP14E-AC3 case reproduced with `preferred` present).
- Overlap (R-EP15-04): Mon 09:00–12:00 HIGH tied to course A over Mon 10:00–11:00 NORMAL tied to course B → the 10–11 piece belongs to A (earlier start); swapping input order yields byte-identical pieces.
- Algebra: `mergeIntervals` keeps pieces with different `preferredKey` apart, merges equal (energy, key); intersection splits a free interval at block edges.
- Identity (EP15C-AC4) over the existing `scheduler.spec.ts` fixtures by adapter; determinism across two runs; purity grep.

## Technical notes

- **Inspected:** `scheduler.ts` (`weeklyToDated`, `byEnergyPreference`, `Progress`, day-centric loop header), `intervals.ts` (`mergeIntervals` energy tie order, `freeIntervals` base kinds), `types.ts` (`WeeklyWindow`, `DatedInterval.energy`, `FreeIntervalBase`, `SchedulerInput`), EP13J-AC3 identity test shape.
- **Inspected (2026-11-16, post-EP14E):** `byEnergyPreference(free, demanding, minBlock)` (`scheduler.ts:142–165`, the light-work anchor = earliest NORMAL gap ≥ `minBlock`, off-part-of-day LOW ranks after NORMAL), `isDemanding` honouring `hard` (`:109–114`), `SchedulableAssignment.hard?` (`types.ts`).
- **Proposed:** `DatedInterval` gains optional `preferredKey?: string` and `courseId?: string | null`; `piece()` copies them; `mergeIntervals` keys on (energy, preferredKey) and resolves preferred overlaps by the D-J2 rule; a `rankGaps(free, demanding, minBlock)` wrapper splits `free` into the preferred and non-preferred tiers and calls the unchanged `byEnergyPreference` on each; the candidate list for a gap is reordered by `courseId` match before the round-robin pointer is applied; the service adapter is a small private function in `study-plans.service.ts` next to `gatherPlanData`.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-C1 | Carrying preference through the algebra: (a) `preferredKey` on `DatedInterval`, merge only equal (energy, key) — the EP13J D-J2 mechanism extended; (b) a parallel map re-derived by intersection | **(a)** — one algebra, already proven for energy | Ratified by default, 2026-11-17 (implementation start) |
| D-C2 | Ranking order: (a) preferred → energy → earliest; (b) energy → preferred → earliest | **(a)** — "fill my study blocks first" is the student's explicit intent; energy is a heuristic | Ratified by default, 2026-11-17 (implementation start) |
| D-C3 | Course tie: (a) candidate reorder inside the tied piece only, feasibility first; (b) hard reservation (only that course may use the piece) | **(a)** — a reservation would leave the block empty when the course has no work (D15-6) | Ratified by default, 2026-11-17 (implementation start) |

## Definition of Done

1, 8 (TR-E15-03), 9 (contracts.md engine section). 2–7 N/A (pure domain). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the engine places into the whole free day, honours study blocks first, and proves it changed nothing else.
- **Actual at closeout:** one window, one commit, 2026-11-17; files as planned plus `legacy-windows.ts` (shared adapter), `identity-fixtures.ts` + `identity.snapshot.json`, `remaining-work.ts` (`courseId` carry); 43 new tests (23 preferred + 17 identity + 3 algebra), 342 pre-existing domain/service cases unchanged; gated API 1810/0, ungated 1261/0; 0 open findings (F-EP15C-01 resolved, -02 fixed, -03 noted for the planner). Row in [efficiency.md](./artifacts/efficiency.md).
- **Files:** `apps/api/src/domain/study-planning/{types,intervals,scheduler}.ts`, `catch-up.ts` (pass-through), `{intervals,scheduler,energy,catch-up}.spec.ts` (+ a new `preferred.spec.ts`), `apps/api/src/modules/study-plans/study-plans.service.ts` (thin adapter only).
- **Start context:** this story; contracts.md § Engine input; `scheduler.ts` ranking hook; EP13J story's Review note (merge hazard).
- **Verification:** `pnpm --filter @studypilot/api test` (full, gated) green with the adapter in place; identity, tier/guard, overlap and determinism tests pass; `typecheck` green.
- **Dependencies / exclusions:** EP15A types. Gathering → EP15D. `conflicts.ts` unchanged (D15-8).
