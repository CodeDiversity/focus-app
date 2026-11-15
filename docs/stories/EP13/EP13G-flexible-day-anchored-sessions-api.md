# EP13G — Flexible Day-Anchored Sessions (Model + Engine + API)

**Story ID:** EP13G
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend
**Status:** Implemented — awaiting parent review (2026-11-15; record `./artifacts/EP13G/implementation.md`)
**D13-4:** resolved as **option (b)** — user instruction 2026-11-15, taking the planner's recorded recommendation (suggested times + `anchor` + optional `windowHint`).
**Dependencies:** EP13F implemented. D13-4 resolved.
**Jira key:** Pending creation

## Summary

A session pinned at "Tuesday 9:00" is a promise that can be broken at 9:01;
for ADHD users every pinned block is a scheduled opportunity to fail. This
story makes most generated sessions **day-anchored intentions**: they belong
to a day (optionally a part of day), can be started whenever the student is
ready, cannot be "missed" at a clock time, and roll forward at day end via
EP13C's reconciliation. Deadline-critical sessions (and sessions the student
pins or locks) remain clock-fixed. Under recommended option (b) of D13-4,
`PlannedSession` gains `anchor` (`FIXED`|`FLEX_DAY`, default FIXED) and
`windowHint` (`MORNING|AFTERNOON|EVENING`, flex only); `startTime`/`endTime`
stay non-nullable as the *suggested* slot, so calendars and conflict math
keep working.

## Scope

**In scope (assuming option (b); re-cut if D13-4 rules otherwise):**
- Additive migration: `anchor` + `windowHint` enums on `PlannedSession`.
- Engine: placement v2 emits `FLEX_DAY` by default; a session is emitted
  `FIXED` when its assignment's remaining work has no slack before the due
  date (deterministic rule: deficit-adjacent placements pin).
- Semantics: flex sessions are excluded from clock-overlap conflict checks
  but count toward the day's density/cap budgets; starting one (EP13B
  endpoint) fixes it at the actual time; unstarted flex rolls forward at day
  end exactly like other sessions (EP13C — no new rollover machinery).
- Save/preview/today/catch-up payloads carry `anchor`/`windowHint`; manual
  editor moves respect the anchor (a flex session moved to a clock slot
  becomes FIXED).
- Tests (TR-E13-07).

**Out of scope:**
- All presentation (EP13H). Energy (EP13J). Notification of day-end.

## Source requirement references

- Epic AC-E13-09, AC-E13-14. Shared DoD 1, 2, 3, 4, 8, 9. TR-E13-07.

## Acceptance criteria

1. The engine deterministically partitions output into FLEX_DAY (default) and
   FIXED (no-slack rule); identical inputs yield identical partitions.
2. Flex sessions never produce or suffer clock-overlap conflicts, but their
   minutes count toward density and daily caps; fixed sessions keep EP06
   conflict semantics unchanged.
3. Starting a flex session fixes its actual start time (EP13B transaction);
   day-end rollover of unstarted flex needs no new code path (EP13C's
   civil-date rule covers it — proven by test, not by assertion).
4. Window hints are honest suggestions: validation accepts a flex session
   with or without a hint; hints never create conflicts.
5. All payloads and the save/confirm DTOs round-trip `anchor`/`windowHint`
   with validation (enum values; hint only on flex); ownership and uniform
   404 unchanged.

## Tests (TR-E13-07)

- Partition determinism; no-slack pinning rule (boundary: due tomorrow with
  exactly-fitting work pins; slack unpins).
- Conflict matrix: flex×fixed, flex×class/blocked/confirmed (budget-only vs
  clock), unchanged fixed behavior.
- Start-fixes-time; rollover-by-reconciliation proof; locked flex (locked
  implies FIXED — validation rule).
- DTO validation matrix (bad enum, hint on fixed → 400); migration default
  backfill (existing rows FIXED).

## Technical notes

- **Inspected (2026-11-14):** `PlannedSession` schema (343–361: non-nullable
  times — the fact that makes D13-4 material); `conflicts.ts` per EP08
  baseline; EP06D save DTO shape (D06-23).
- **Proposed:** enums + two columns; engine partition in `scheduler.ts`
  output typing; conflict filter by anchor in `findConflicts` call sites.
- **D13-4 options (decision needed before implementation):**
  (a) nullable times for flex — honest model, bigger migration, every
  consumer handles nulls; (b) suggested times + anchor — smaller change,
  calendar renders suggestions, "missedness" keys off anchor. **Planner
  recommends (b).** The ruling re-cuts ACs 2–5 only in wording, not in
  substance.

## Definition of Done

1. Functional criteria pass (AC-E13-09 backend).
2. DTO validation for the new fields.
3. Ownership scoping unchanged and tested on new paths.
4. Actionable errors (validation messages name the field and rule).
5–7. N/A (backend only).
8. Automated tests (TR-E13-07).
9. Migration + contract documented.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** sessions can be day-anchored intentions that cannot be missed at a clock time, deterministically pinned only when deadlines demand it.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 4 — cross-cutting semantics (conflicts, budgets, rollover, DTOs) on a settled model.
- **Production files:** `schema.prisma` + migration, `scheduler.ts`, `conflicts.ts` call sites, study-plans DTOs/service.
- **Test files:** scheduler/conflicts/service specs (extend).
- **Minimal start context:** this story, the D13-4 ruling, EP13 README contracts, EP13F record, `conflicts.ts`, save DTO.
- **Verification:** `pnpm --filter @studypilot/api test`, lint, typecheck, `pnpm db:generate`.
- **Dependencies:** EP13F; D13-4 ruling. Blocks EP13H.
- **Exclusions:** UI (EP13H); energy (EP13J).

## Tracker reference

Jira key: Pending creation (no sync authorized).
