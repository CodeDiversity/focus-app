# EP13 shared contracts, invariants and code baseline

Field names and semantics here are the stable seam between EP13 children; the live plan is [README.md](./README.md).


Field names and semantics below are the stable seam; presentation belongs to the `refiner` pass (D13-14). All date work uses EP12A's civil-date helpers; the engine stays in "civil date + minute of day".

## Data model (additive migrations; owner in parentheses)

```prisma
// (EP13B) StudySession gains an optional link to the planned session it executes.
model StudySession {
  // ... existing fields ...
  plannedSessionId String?
  plannedSession   PlannedSession? @relation(fields: [plannedSessionId], references: [id], onDelete: SetNull)
}

// (EP13G — D13-4 ruled (b), implemented) PlannedSession gains a day-anchor. Option (b):
// keep startTime/endTime non-nullable as the *suggested* slot; anchor controls semantics.
model PlannedSession {
  // ... existing fields ...
  anchor     PlannedSessionAnchor @default(FIXED)   // FIXED | FLEX_DAY
  windowHint PartOfDay?                              // MORNING | AFTERNOON | EVENING (flex only)
}

// (EP13J) AvailabilitySlot gains an energy level.
model AvailabilitySlot {
  // ... existing fields ...
  energy EnergyLevel @default(NORMAL)   // HIGH | NORMAL | LOW
}

// (EP14E, D-E1a) Assignment gains the student's "hard" flag. Nullable, no default:
// null = Auto (the D13-10 type/size rule decides), true = Hard, false = Not hard.
model Assignment {
  // ... existing fields ...
  hard Boolean?
}
```

Preferences bag (`preferences.studyDefaults`, EP06 contract in `domain/study-planning/preferences.ts`) gains additive keys with defensive-reader defaults (EP13F; same bounds style as D06-4): `breakMinutes` (default 15, bounds 0–60), `densityPercent` (default 80, bounds 50–100), and (EP13K) `dailyGoalMinutes` (default 60, bounds 5–480), `weeklyGoalDays` (default 3, bounds 1–7). Existing keys and the 4096-byte bag cap are unchanged.

## Status lifecycle (EP13B + EP13C; uses the existing `PlannedSessionStatus` enum — no enum migration)

- `SCHEDULED` → `IN_PROGRESS`: a linked focus session starts from the planned session.
- `IN_PROGRESS`/`SCHEDULED` → `COMPLETED`: a linked focus session finishes with ≥1 confirmed minute (D13-3 provisional).
- `SCHEDULED` → `RESCHEDULED`: the daily reconciliation rolls an unstarted past session forward (D13-2 provisional; the row is preserved — history is never deleted).
- `SKIPPED`: reserved for an explicit student dismissal (the EP13D "not doing this one" affordance was not shipped — D-D5).
- Reconciliation and lifecycle transitions never write `StudySession`, `Assignment` or `Task` (extends AC-E08-03).

## Reconciliation (EP13C)

Runs lazily and idempotently at the start of every plan read/preview/save and the today read (no scheduled jobs — D13-8 keeps job infrastructure out of scope): every owned `PlannedSession` with `status === 'SCHEDULED'`, civil date strictly before today (EP08's missed boundary, D08-5), and no linked completed `StudySession` flips to `RESCHEDULED`. No minute arithmetic happens here — remaining work already flows from estimate − confirmed (EP13A), so rolling forward is purely a status/reporting change. Locked past rows follow V-13-2. `GET /study-plans/recovery-summary` remains for the informational plan-health view but reports rolled-forward totals instead of an accumulating missed list.

## Endpoints (additive)

| Method & path | Owner | Purpose | Success | Errors |
|---|---|---|---|---|
| `POST /study-sessions/from-planned/:plannedSessionId` | EP13B | Start a focus session linked to a planned session (duration defaults to the planned duration) | 201 → ActiveSession | 401; 404 uniform; 409 open-session |
| `GET /study-plans/today` | EP13C | Today's reconciled sessions + the single recommended next session (first unfinished by start time, then ordering comparator) | 200 | 401 |
| `POST /study-sessions/:id/absorb-next` | EP13I | Absorb the next planned session of the same assignment into the running session (D13-13) | 200 | 401; 404 uniform; 409 no-candidate |
| `GET /study-sessions/momentum` | EP13K | Read-only (D-K5). `{ date, timeZone, today: { confirmedMinutes, goalMinutes, goalMet }, week: { startDate (Monday), days[] (the week's seven civil dates, Monday first — EP14B D-B4), studyDays[] (civil dates, ascending), studyDayCount, goalDays, goalMet }, run: { currentWeeks, bestWeeks, currentWeekCounted, capped? (true only at the 52-week horizon, D-K4) }, hasHistory }`. COMPLETED sessions only, bucketed by `toCivilDate(startTime, profileZone)`; a study day needs a session with ≥ 1 minute (D-K1); Monday-start week (D-K2); run per D-K3. No percentage field exists. | 200 | 401; 404 uniform (missing user) |

Existing endpoints keep their shapes; `POST /study-plans/preview` and the remaining-work payload gain `calibration` annotations (EP13L: `{ assignmentType, multiplier, samples }[]`; the saved-plan read carries no calibrated value and is not annotated — F-EP13L-01, C-EP13-10) and per-session `anchor`/`windowHint` fields (EP13G). EP13J (D-J5/D-J6): `AvailabilitySlot` responses always carry `energy` (`HIGH`|`NORMAL`|`LOW`; NORMAL for pre-EP13J rows); `POST/PATCH /availability-slots` accept optional `energy` (400 `energy must be one of HIGH, NORMAL, LOW`; an energy-only PATCH is a valid body); `GET /calendar/events` sets an `AVAILABILITY` event's `subtitle` to `"High energy"`/`"Low energy"` (null for NORMAL and for `BLOCKED_TIME`). Migration `20261116120000_availability_slot_energy` (additive enum + column, default NORMAL). EP14E (D-E1, D-E4): the assignment projection is **12 keys** — `hard` after `type` — on `POST/PATCH /assignments`, `GET /assignments` items (plus `course`, `subtasks`) and `GET /courses/:id` assignments (plus `subtasks`); `hard` is always present, `null` for every pre-EP14E row (Auto). `POST /assignments` accepts optional `hard` (`true`/`false`/`null`/omitted; null and omitted store null); `PATCH /assignments/:id` accepts it too and **`hard` is the one field where null is a value**: `{ hard: null }` returns the assignment to Auto, an omitted key keeps the stored value, and a hard-only body is a non-empty patch. Wrong types (`"true"`, `1`, `"yes"`) are a field-level 400 `hard must be true, false or null` (EP14B D-B1 — nothing coerced, nothing written). Migration `20261116130000_assignment_hard_flag` (additive nullable column, no default, no backfill; rollback `DROP COLUMN "hard"`). The remaining-work payload and the plan payload shapes do not change.

## Placement v2 (EP13F — engine rules, all deterministic)

1. **Breaks:** consecutive placed sessions on a day are separated by ≥ `breakMinutes` (treated as consumed free time, not stored rows).
2. **Density cap:** per day, placed minutes ≤ `densityPercent`% of that day's free minutes (after classes/blocked/busy), and never above `dailyCapMinutes`.
3. **Interleaving:** within a day, after placing a block for one assignment, prefer a different schedulable assignment for the next block (round-robin over the EP06 ordering comparator). Deadline feasibility overrides variety: if interleaving would push an assignment past its due date, fall back to deadline order (TR-E13-06 negative case).
4. **Min/max honored:** every placed block is ≥ `minSessionMinutes` and ≤ `maxSessionMinutes`; a tail shorter than min merges into the previous block (up to max) or is dropped into the deficit report — never placed.
5. Purity and tie-break totality preserved; `schedule()`'s signature grows, EP08's `replan` passes through unchanged semantics.

**Energy (EP13J, D-J1…D-J3; EP14E, D-E1…D-E3, D-E7):** free intervals carry their window's energy and the algebra merges only equal levels (touching HIGH|NORMAL stay two intervals; overlapping different levels are clipped, earlier keeps its span). *Demanding* = type PAPER/PROJECT/EXAM or input remaining > 120 min, **unless the student sets `Assignment.hard`** — `hard` overrides type and size (`true` demanding, `false` light; `null` = Auto keeps the rule exactly). Demanding work scans HIGH → NORMAL → LOW gaps, light work LOW → NORMAL → HIGH, earliest-first within a level. **Light-work timing guard (EP14E-AC3, day-centric):** within one day's gap list, the anchor is that day's earliest NORMAL gap that can host a legal block (≥ `minSessionMinutes`); a LOW gap keeps first rank only when it lies in the same part of the day (`windowHintOf`: MORNING < 12:00 ≤ AFTERNOON < 17:00 ≤ EVENING) as the anchor, otherwise it ranks after every NORMAL gap and still before HIGH (a preference, never a constraint). No usable NORMAL gap that day → the guard does not apply. Which day a block lands on is decided by the existing per-day loop and budgets, never by the guard. Critical work (rule 3) ignores energy, the flag and the guard. Budgets, density and pinning never read energy or `hard`; all-NORMAL output is byte-identical to pre-EP13J, flags present or not (EP13J-AC3, EP14E-AC2).

## Code baseline (inspected 2026-11-14, not proposed)

- `apps/api/prisma/schema.prisma`: `PlannedSession` (status enum SCHEDULED/IN_PROGRESS/COMPLETED/SKIPPED/RESCHEDULED, `locked`), `StudySession` (`assignmentId?`, `taskId?`, `durationMinutes`, `plannedMinutes?`, no planned-session link), `AvailabilitySlot` (no energy field at inspection; EP13J added it), `StudyPlan`.
- `apps/api/src/modules/study-plans/study-plans.service.ts`: the State-A empty confirmed-time maps at lines 492–494 and 652–653 (in-code comments mark the seam); `gatherPlanData`, `preview`, `save`, `getRemainingWork`, EP08 recovery/catch-up methods.
- `apps/api/src/domain/study-planning/`: `preferences.ts` (the four `studyDefaults` keys, bounds, defensive reader — read 2026-11-14), `scheduler.ts`, `intervals.ts`, `ordering.ts`, `remaining-work.ts`, `conflicts.ts`, `catch-up.ts` (per EP08 baseline).
- `apps/web/src/features/focus-session/model/resolveDefaultSessionMinutes.ts`: reads `studyDefaults.sessionMinutes` — a key EP06 never writes (contract key is `sessionLengthMinutes`), so the saved preference is ignored (V-07-1 re-check outcome; fixed by EP13D).
- `apps/web/src/pages/calendar/` + `calendar.service.ts`: no PLANNED_SESSION event type (EP06's V-05-1 still open; EP13D closes it).
- `apps/web/src/widgets/header/ui/navGroups.ts`: no nav entry for `/focus` or `/catch-up` (EP13E).
- Unverified (disclosed): exact RTK Query slice layout for study plans/dashboard (explored at summary level, not line level); the EP13K refiner outcome (D13-14); browser rendering (no screenshots).

## Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A student cannot start/absorb/read sessions against another student's plan rows | Student B posts `from-planned/:id` with A's planned-session id | `ownedWhere`/`assertOwned` on every new query; uniform 404 `Resource not found` | TR-E13-02, TR-E13-10 |
| Reconciliation never mutates history | A rollover edits a `StudySession` or flips an `Assignment` | Reconciliation writes only `PlannedSession.status`; `StudySession`/`Assignment`/`Task` untouched; test asserts rows unchanged field-for-field | TR-E13-03 |
| Concurrent start-from-planned cannot open two sessions | Two simultaneous `from-planned` posts | EP07's existing one-open-session guard (409) retained around the linked create, in one transaction | TR-E13-02 |
| Rollover is idempotent under concurrent reads | Two simultaneous plan reads both reconcile | Status flip is a conditional `updateMany` (`status: SCHEDULED`, date < today); second writer matches 0 rows | TR-E13-03 |
| Calibration cannot inflate or corrupt estimates | A 10× outlier ratio or 1-sample history | Median + clamp [0.5, 3.0] + ≥3-sample gate; assignments never written | TR-E13-12 |
| Determinism holds across every new rule | Same inputs, different plan across runs | No clock/randomness in the engine; round-robin and energy preferences use the existing total-order tie-breaks | TR-E13-06, TR-E13-09, TR-E13-12 |
| No shaming or compliance framing | A surface shows "you completed 40% of your plan" or "you missed 11 sessions" | D13-9: copy reviewed per surface; tests assert absence of compliance % and shaming terms | TR-E13-04, TR-E13-05, TR-E13-11 |

