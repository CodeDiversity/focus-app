# EP13F implementation record

**Story:** [EP13F — ADHD-Aware Placement Engine v2](../../EP13F-adhd-aware-placement-engine-v2.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/api/src/domain/study-planning/` (scheduler rewrite, preferences, types + three specs), `apps/api/src/modules/study-plans/` (DTO, preference projection, three specs incl. two gated), `apps/web/src/{entities,features}/study-preferences/` (type, form, two specs), EP13F docs/queue updates. **No migration** — the two new keys live in the existing `preferences.studyDefaults` JSON bag.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — consecutive sessions separated by ≥ `breakMinutes`; breaks are consumed free time, not rows | **Done.** The break is a search-time buffer: every already-placed interval of the day is expanded by `breakMinutes` on both sides before the free-interval subtraction, so the stored session keeps its own minutes and the gap is implied. The buffer applies only between *placed* sessions — a session may still start the minute a class ends. | `scheduler.spec.ts` §10 (gap ≥ break, no stored break row, `breakMinutes: 0` back-to-back edge, no break against a class) |
| 2 — placed minutes ≤ `densityPercent`% of the day's free minutes and ≤ `dailyCapMinutes`; lost capacity reported | **Done.** Per day: `budget = min(dailyCapMinutes, floor(freeMinutes × densityPercent / 100))`, where `freeMinutes` is the day's free time **before** this run places anything. Work the budget declines lands in `INSUFFICIENT_TIME_BEFORE_DEADLINE` — `placed + deficit` is asserted to be the whole remaining work. | `scheduler.spec.ts` §11 (60% cap, tighter daily cap wins, `densityPercent: 100` reproduces cap-only, no silent loss) |
| 3 — round-robin interleaving over the ordering comparator; feasibility beats variety | **Done.** Within a day the engine rotates over the schedulable assignments in comparator order. Before rotating it serves *critical* work — an assignment whose remaining minutes exceed an **optimistic** upper bound on the capacity of its later horizon days — in deadline order, without rotation. Optimistic on purpose: the override fires only when variety would really cost a deadline. | `scheduler.spec.ts` §12 (consecutive blocks differ, rotation follows the comparator, the due-today assignment takes the whole day, shortfall still reported) |
| 4 — every block within [min, max]; sub-minimum tail merges or is reported, never placed | **Done.** Blocks are bounded by `sessionLengthMinutes`, the work left, the day's budget and `maxSessionMinutes`, and a gap that cannot host `minSessionMinutes` is skipped rather than half-filled. A tail below the minimum tries to grow this run's previous block for the same assignment (within max, on free time directly after it, inside the day's budget); failing that it is reported in the deficit. | `scheduler.spec.ts` §13 + the two reconciled v1 cases (70 min → one 70-minute block; a 10-minute assignment with no block to merge into → deficit 10) |
| 5 — purity and determinism; EP08 `replan` passes through | **Done.** Every iteration is over a sorted structure and every tie-break is total. `replan` is untouched and its EP08B suite passes against v2 with the real defaults. | `scheduler.spec.ts` §14 (three identical runs byte-identical, output independent of input order, input not mutated, all rules hold at once, import-graph purity check); `catch-up.spec.ts` green |

## Verification (2026-11-15)

- `apps/api`: `pnpm jest` → **980 passed**, 471 skipped (the gated live-DB suites — they self-skip without `DATABASE_URL` and are CI-executed), 0 failed. `pnpm typecheck`, `pnpm lint`, `pnpm format` clean.
- `apps/web`: `pnpm vitest run` → **1160 passed**, 8 failed — the pre-existing `CalendarPage` suite (F-EP13D-01/F-EP13E-02), untouched by this story. `pnpm typecheck`, `pnpm lint`, `pnpm format` clean.
- Manual engine sanity check (throwaway spec, not committed): a 5-hour evening window with three assignments produces `pset 17:00–18:00 | essay 18:15–19:15 | reading 19:30–20:30 | pset 20:45–21:45` — breaks honoured, assignments interleaved, deadline order preserved, no deficits.

New/changed tests: `scheduler.spec.ts` (+20 EP13F cases, 2 v1 expectations reconciled, 46 total), `preferences.spec.ts` (+8 EP13F cases, 6 literals widened, 35 total), `catch-up.spec.ts` (fixture gains the two keys), `study-plans.service.spec.ts` (+3 cases for the new keys, 34 total), `study-plans-e2e.spec.ts` + `study-plans-data-scoping.spec.ts` (gated: preference-payload expectations), `StudyPreferencesForm.test.tsx` (+4 cases, 20 total), `studyPreferencesApi.test.ts` (fixtures).

## Deviations from the plan (each with why)

1. **`NO_AVAILABLE_TIME` changed meaning slightly.** v1 computed each assignment's capacity *after* earlier assignments had taken their pick, so a week consumed by other work made the next assignment report "you have no available time". The day-centric loop has no such ordering, and the honest reading is the student's own free time: v2 keys the category off the assignment's horizon capacity in the **original** inputs. A week eaten by other work is now `INSUFFICIENT_TIME_BEFORE_DEADLINE`. Both existing category tests still pass.
2. **Gap-fitting replaced whole-length-fitting.** v1 required a gap to host the entire desired block or it skipped the day. v2 shortens the block to the gap as long as it stays ≥ `minSessionMinutes`, so real availability is used instead of abandoned. The "interval too short unused" guarantee survives — a gap below the minimum is still skipped.
3. **The two new keys ship through the whole stack, not only the domain.** The story scoped the profile form as a "small supporting edit"; the DTO, the preference projection, the client type and the form all carry them, and the gated e2e payload expectations were updated with them (CI-executed, not run locally — see F-EP13F-02).
4. **The cross-field validation gate now reads only the four D06-4 keys.** `validateStudyPreferences` evaluated its rules only when *every* contract key was present; with six keys that would have silently stopped evaluating the rules for a four-key body. The gate now checks the keys the rules actually read, which is both the pre-EP13F behaviour and the more correct rule.
5. **No `docs/` contract edit beyond the story/queue.** The EP13 README already specifies the two keys (defaults, bounds, defensive-reader fallback), and the canonical in-code contract lives in `preferences.ts`/`types.ts`, both updated. EP06's README still describes a "four-key object" — planner-owned, routed as F-EP13F-03.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13F-01 | A sub-minimum tail that cannot merge is reported as `INSUFFICIENT_TIME_BEFORE_DEADLINE`, but the real reason is "shorter than your minimum session length" — the student may have plenty of time. The deficit vocabulary has only three categories, and adding a fourth changes the warning contract the UI renders (EP06/EP08 surfaces). Bounded: at most `minSessionMinutes − 1` minutes per assignment, and only when no earlier block can absorb them. | Open, routed to the planner as a copy/contract question for a later child (EP13L/EP13M touch the same warning surface). Non-blocking. |
| F-EP13F-02 | The two gated suites (`study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`) were updated for the six-key preference payload but **not executed locally** — no `DATABASE_URL`. | Open evidence item for the EP13 parent review unit; CI executes them on every push. Same disposition as F-EP13A-03/F-EP13B-02/F-EP13C-02. |
| F-EP13F-03 | `docs/stories/EP06/README.md` still documents the `studyDefaults` contract as a **four-key** object ("writes the complete four-key object", D06-4's key list). EP13F made it six. The planner owns that file. | Routed to the planner for a contract-doc reconciliation. Non-blocking: the EP13 README, `preferences.ts` and `types.ts` all carry the current contract. |
| F-EP13F-04 | A student whose availability is a single short window can now see a deficit warning for the minutes the density cap reserves (e.g. a 60-minute window at 80% yields 48 placeable minutes and a 12-minute shortfall). This is the literal AC-2 behaviour and the lever is theirs to raise, but it is a new way for a plan to report "not enough time" to someone who technically has it. | Open, surfaced to the user with the story summary. Mitigation available without code: `densityPercent: 100`. |

## Changed paths

- `apps/api/src/domain/study-planning/scheduler.ts` — **placement v2** (day-centric loop, breaks, density, interleaving + feasibility override, min/max with tail merge-or-drop, reclassified deficits).
- `apps/api/src/domain/study-planning/preferences.ts`, `types.ts` — the two keys: defaults, bounds, validator, defensive reader, cross-field gate.
- `apps/api/src/domain/study-planning/{scheduler,preferences,catch-up}.spec.ts` — reconciled + TR-E13-06.
- `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts` — the two optional fields with their bounds.
- `apps/api/src/modules/study-plans/study-plans.service.ts` — `toStudyPreferencesResponse` projects the two keys.
- `apps/api/src/modules/study-plans/{study-plans.service,study-plans-e2e,study-plans-data-scoping}.spec.ts` — expectations.
- `apps/web/src/entities/study-preferences/model/types.ts` (+ api spec fixtures), `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` (+ spec) — the "How your days are filled" fieldset.
- Docs: this record, `checkpoint.md`, the EP13 README queue row, the EP13F story status.

## Correction (2026-11-16, R-EP13-02)

This record dispositioned its unexecuted `DATABASE_URL`-gated suites as
CI-executed. That claim was wrong: `.github/workflows/ci.yml` triggers only on
`main`/`develop`, which never ran for this delivery chain. The suites were
first executed by the combined EP13 review at `210f76c` (red — R-EP13-01) and
are green after the R-EP13-01 fix commit, except the four pre-existing
failures dispositioned as R-EP13-03. Evidence: `artifacts/EP13/review.md` and
the fix commit's record in `history.md`.
