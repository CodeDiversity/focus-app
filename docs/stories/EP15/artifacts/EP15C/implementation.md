# EP15C implementation record

**Story:** [EP15C — Engine: Day-Bounds Base, Dated Busy Time and Preferred Study Blocks](../../EP15C-engine-day-bounds-and-preferred-study-blocks.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** `apps/api/src/domain/study-planning/{types,intervals,scheduler,catch-up,remaining-work}.ts`; new `legacy-windows.ts` (adapter), `identity-fixtures.ts` + `identity.snapshot.json` + `identity.spec.ts`, `preferred.spec.ts`; existing specs `scheduler/energy/calibration/catch-up/intervals.spec.ts` (input helpers through the adapter, 3 algebra cases); `apps/api/src/modules/study-plans/study-plans.service.ts` (thin adapter only); `docs/stories/EP15/contracts.md` (as-implemented notes); this record; story Status/Decisions rulings/sizing; README queue row + Next; `efficiency.md`.

Decisions applied: D-C1, D-C2, D-C3 (ratified by default 2026-11-17 at implementation start). Epic D15-1, D15-6, D15-7, D15-8 as written. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15C-AC1 — `SchedulerInput` per contracts.md; `SchedulableAssignment.courseId?`; every caller compiles through a thin service adapter; every API suite green; `conflicts.ts` untouched; domain still pure | **Done.** `dayBounds: DatedInterval[]`, `blocked: DatedInterval[]`, `preferred: PreferredInterval[]`; `courseId` carried on `AssignmentFacts`/`ClassifiedAssignment` only when supplied (the `hard` rule). `legacyEngineInputs(data)` in `study-plans.service.ts` feeds `preview` and `replan` (`save`/`catchUpConfirm` keep their own dating loops for `findConflicts`, unchanged). `conflicts.ts`: no diff. `ReplanInput` passes the three fields through. | `tsc --noEmit` ✓; gated API 87 suites 1810/0; `preferred.spec.ts` purity grep over `scheduler.ts`, `intervals.ts`, `legacy-windows.ts` |
| EP15C-AC2 — nothing outside `dayBounds`, over `blocked` (one-off only its date), classes or busy; zero-minute day → `NO_AVAILABLE_TIME`; `24:00` = `1440` edge | **Done.** `freeFor` uses `base: { kind: 'declared', windows: input.dayBounds }` and dated `blocked`; the rest of `freeIntervals` is unchanged. | `preferred.spec.ts` rule 1 (5 cases) |
| EP15C-AC3 — preferred tier first, EP14E energy order + guard within each tier with the block's energy; course tie inside the tied piece; D-J2 overlap resolution; critical first everywhere; free minutes unchanged by a block | **Done.** `preferredPieces` (rule 2) + `rankGaps` (two tiers around the unchanged `byEnergyPreference`); course tie as a turn-swap in the rotation (D-C3, feasibility first; critical pass never defers); `mergeIntervals` keyed on (energy, key) with the same-start tie by key; `baselineFreeMinutes` reads the unsplit free list, so a block cannot change a day's budget (AC-E15-07). | `preferred.spec.ts` rules 2–3 (9), rule 4 (5), overlap (3); `energy.spec.ts` (all 30 EP13J/EP14E pins pass unchanged through the single-tier adapter — "within a tier `byEnergyPreference` applies unchanged"); `intervals.spec.ts` (+3) |
| EP15C-AC4 — byte-identical to the EP14E engine with `preferred` empty and windows as hull + gaps, `hard` present or not, incl. `anchor`/`windowHint`; two runs identical (V-15-3) | **Done.** `identity.snapshot.json` = the EP14E engine's output at `b2fed52` over 15 fixtures (single/multi/touching windows, blocked, classes, busy, `hard` true/false/null, overdue/beyond-window/FIXED, tails, density/breaks, v1 prefs, `24:00`, empty and fully blocked days), generated before the engine changed; `identity.spec.ts` replays them through `boundsFromWeeklyWindows` and asserts `JSON.stringify` equality and a second identical run. Every pre-existing fixture in `scheduler/calibration/catch-up.spec.ts` also runs through the adapter with its expectations untouched. | `identity.spec.ts` 17 cases; 342 pre-existing domain + planning-service cases unchanged and green |

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD b2fed52` + the uncommitted changes that form this commit (final content for every run).

- **Gated API (full, single worker):** `createdb <random-suffixed>` → `DATABASE_URL=… npx prisma migrate deploy` → `DATABASE_URL=… npx jest --runInBand` (cwd `apps/api`) → **87 suites, 1810 passed, 0 failed** (43 new: 23 preferred + 17 identity + 3 algebra; 1767 at EP15B). Database dropped afterwards. No `.env*` in this worktree; `DATABASE_URL` shell-only.
- **Ungated API:** `npx jest` → 56 suites run / 31 skipped, **1261 passed, 0 failed** (549 gated skipped).
- **Static:** `npx tsc --noEmit` ✓; `npx eslint "src/**/*.ts" --max-warnings 0` ✓; prettier check on every changed file ✓.
- **Red-first:** the snapshot was generated from the untouched engine first (a temporary generator spec, deleted). The first run of `preferred.spec.ts` failed 5 cases: four fixture mistakes on my side (single-day windows make every assignment critical, which bypasses the course tie; a deadline beyond the window is *deferred*, not `NO_AVAILABLE_TIME`; the critical case fills both halves of a split block first) and one product defect — the same-start tie between two blocks resolved by energy before key (F-EP15C-02); fixed in `classOrder`, then 385/385 ungated.

## Changed paths

- Domain: `types.ts` (input shape, `PreferredInterval`, `DatedInterval.preferredKey/courseId`, `courseId` on facts), `intervals.ts` (`piece` copies keys; `sameClass`/`classOrder`; `preferredPieces`), `scheduler.ts` (rules 7–8 doc; `freeFor` base swap; `rankGaps`; `pickGap`/`commitBlock`/`placeBlock` split with the course tie; rotation clean-up), `catch-up.ts` (pass-through), `remaining-work.ts` (carry `courseId`); new `legacy-windows.ts`.
- Specs: new `identity-fixtures.ts`, `identity.snapshot.json`, `identity.spec.ts`, `preferred.spec.ts`; `scheduler.spec.ts`, `energy.spec.ts`, `calibration.spec.ts`, `catch-up.spec.ts` (input helpers only — no expectation changed), `intervals.spec.ts` (+3).
- Service: `study-plans.service.ts` (`legacyEngineInputs` + two call sites; `gatherPlanData` untouched).
- Docs: `contracts.md` (*As implemented* under § Engine input); this record; story Status, D-C1…D-C3 rulings, sizing; README row + Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15C-01 | contracts.md § Known windows ("`preferred: []`"); `study-plans-energy.service.spec.ts` | With `preferred: []` the interim adapter would drop the energy tags of EP13J/EP14E availability slots (a hull carries no energy), so the service-level energy pins (HIGH slot at 18:00 for hard work, light work at 09:00) would fail until EP15D. | **Resolved:** the adapter also hands every former available window over as a preferred interval with its tag (`windowsAsPreferred`). One tier → EP13J/EP14E ranking reproduced exactly; all 30 `energy.spec.ts` and the 8 service energy cases pass unchanged. Documented in contracts.md; EP15D deletes the adapter. | parent review to note |
| F-EP15C-02 | `intervals.ts` `classOrder`; surfaced by the R-EP15-04 same-start test | Two preferred blocks starting the same minute were ordered by energy (the EP13J rule) before block id; the contract says "tie: the lexically smaller `blockId`". | **Fixed:** for two keyed intervals the key decides outright; the energy order still governs unkeyed/energy windows, so EP13J behaviour and the identity snapshot are untouched. | — |
| F-EP15C-03 | Story Tests section: "within the non-preferred tier alone the EP14E guard still anchors on 09:00" | Non-preferred pieces are always NORMAL (rule 2), so the guard cannot have a LOW gap to act on in that tier — the case is unobservable as worded. | **Reproduced where it is observable:** two preferred blocks (NORMAL 09–11, LOW 22–23) → light work lands 09:00; plus the adapter-driven `energy.spec.ts` pins. Story text left as-is (the planner's). | planner (wording) |

## Deviations

1. **Adapter lives in the domain, not only in the service** (`legacy-windows.ts`): one pure implementation of the hull-plus-gaps rule serves the service's interim path, the identity test and the four pre-existing spec helpers, instead of four copies. The service keeps the "thin" function the story asked for (`legacyEngineInputs`, 6 lines).
2. **Identity is pinned against a frozen snapshot**, not a live copy of the EP14E engine: 15 fixtures, generated from the engine before any change, committed as JSON. A reviewer can regenerate the snapshot from `b2fed52` to audit it.
3. **Adapter carries windows as preferred** (F-EP15C-01) — a deliberate departure from the Known-windows note, because its literal reading breaks existing green suites.
4. **Course tie implemented as a turn-swap** rather than a reorder of the candidate list: the owner of the tied piece commits first and the current candidate retries; when the owner's work is done it leaves the rotation. Same observable result as "that course's assignments first", with the comparator order outside the piece untouched (pinned).
