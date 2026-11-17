# EP15D — One Gathering Seam: Planner Inputs and the Calendar Read Model

**Story ID:** EP15D
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Backend
**Status:** Queued
**Dependencies:** EP15A, EP15B, EP15C implemented. Epic decisions D15-1, D15-3, D15-12 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** one helper `scheduleInputs(userId, from, to)` turns day bounds, blocks (expanded, exceptions applied), class meetings, confirmed sessions and preserved planned sessions into intervals; `gatherPlanData` and the calendar service both call it. `GET /calendar/events` gains `days[]` (bounds + free time) and the `EVENT`/`STUDY_BLOCK` types, and loses `AVAILABILITY`/`BLOCKED_TIME`.
- **Why it improves it:** what the calendar labels "free" is what the planner may use — by construction, not by convention (AC-E15-08); the planner stops reading `availability_slots` (product: AC-E15-02/05 become real).
- **Decisions needing you:** none ▲ — D-D1…D-D3 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Wire the new model into both readers through a single seam and prove the
free-time identity (V-15-1). After this child the old slot table has no
reader (D15-15).

## Scope

**In:** `modules/schedule/schedule-inputs.service.ts` (exported from `ScheduleModule`); `study-plans.service.ts` `gatherPlanData` on the seam, replacing EP15C's thin adapter (preview, save incl. its dating loop at `:1634–1644`, catch-up `:1409–1419`, today pass through); `calendar.service.ts` payload per contracts.md; removal of the slot-event assertions in `apps/web/e2e/calendar.spec.ts:180–215` (test-only, pointer to EP15J — contracts.md § Known windows); API contract docs; specs incl. V-15-1.
**Out:** engine rules (EP15C), the web client (EP15E), dropping the old table (EP15I).

## Source requirement references

AC-E15-02, AC-E15-05, AC-E15-07, AC-E15-08, AC-E15-09 (server), AC-E15-14; TR-E15-04; V-15-1, V-15-4; DoD-3, DoD-8, DoD-9.

## Acceptance criteria

1. `scheduleInputs(userId, from, to)` is the only code that turns `DayBounds`, `ScheduleBlock` (+ exceptions), `ClassMeeting`, `StudySession` and preserved `PlannedSession` rows into intervals; `gatherPlanData` uses it, EP15C's adapter is deleted, and the service no longer reads `availability_slots`; preview, save, catch-up preview/confirm and `today` keep their contracts and their existing suites stay green with fixtures moved to the new tables.
2. `GET /calendar/events` returns `days[]` (one per date in range: `wakeTime`, `sleepTime`, `free[]`) and emits `EVENT` and `STUDY_BLOCK` events with `blockId`, `recurring` and (study) `energy`, course fields and default titles `Busy`/`Study`; `AVAILABILITY` and `BLOCKED_TIME` no longer appear; range cap, ownership and profile-zone semantics are unchanged.
3. For one fixture containing a DST transition date, a cancelled weekly occurrence, a one-off event and a `24:00` bound, the calendar's `free` equals `freeIntervals` over the planner's inputs for the same dates with `placed` = the current FIXED `SCHEDULED`/`IN_PROGRESS` planned sessions (V-15-1), minute for minute.
4. Every row the seam reads is scoped by `userId` (directly, or through `block`/`studyPlan`); a second student's blocks, bounds or exceptions never appear in either output (V-15-4).

## Tests (TR-E15-04)

- Seam: unit test that `gatherPlanData`'s engine input equals the seam's intervals (bounds as base, blocked dated, preferred with energy/course); a grep-style assertion that `study-plans.service.ts` and `calendar.service.ts` contain no `availabilitySlot` read.
- Calendar: `days[]` shape and count for a 7-day and a 31-day range; `EVENT`/`STUDY_BLOCK` fields; exception date omitted; one-off on its date only; old types absent; default titles.
- V-15-1 identity test as specified in EP15D-AC3.
- Data scoping spec (two students) for both endpoints.
- Existing `study-plans*.spec.ts`, `calendar*.spec.ts` green after fixture migration.

## Technical notes

- **Inspected:** `study-plans.service.ts` `gatherPlanData` (~L1016–1150: slot → `available`/`blocked` weekly windows, classes, busy incl. preserved planned rows), the two per-date dating loops — `catchUpConfirm` (~L1409–1419) and `save` (~L1634–1644) — both of which read `data.blocked` weekly and must take the seam's dated `blocked` instead, `calendar.service.ts` (`list`: range validation, zone resolution, slot expansion per date, planned-session filter, sort), `civil-date.ts` exports.
- **Proposed:** the seam returns `{ timeZone, dayBounds, blocked, preferred, classes, busy }` (contracts.md); the calendar computes `free` via `freeIntervals` from `domain/study-planning/intervals.ts`; the catch-up dating loop uses `blocked` directly (already dated) instead of re-dating weekly windows.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-D1 | `placed` for displayed free time: (a) current FIXED `SCHEDULED`/`IN_PROGRESS` planned sessions only — flex sessions occupy no clock time; (b) all current planned sessions; (c) none | **(a)** — matches EP13G's conflict semantics; flex chips sit in the day's "Anytime" row | Proposed |
| D-D2 | Seam location: (a) `modules/schedule/schedule-inputs.service.ts`, exported by `ScheduleModule`, imported by `CalendarModule` and `StudyPlansModule`; (b) a function in `common/` | **(a)** — it needs Prisma and the zone; a provider is the repo's pattern | Proposed |
| D-D3 | Default titles: (a) server fills `Busy`/`Study` when `title` is null; (b) client fallback | **(a)** — one fallback for every client and test | Proposed |

## Definition of Done

1, 3 (scoping on every seam read), 8 (TR-E15-04), 9 (contracts.md payload; API README). 2/4 N/A (no new inputs; existing error shapes). 5/6/7 N/A. 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** both readers see one truth, and the calendar can show free time the planner will honour.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/modules/schedule/schedule-inputs.service.ts` (new) + spec, `schedule.module.ts`, `apps/api/src/modules/study-plans/study-plans.service.ts` + specs/fixtures, `apps/api/src/modules/calendar/{calendar.service,calendar.module}.ts` + specs, `docs/stories/EP15/contracts.md`.
- **Start context:** this story; contracts.md § Calendar read model and § shared gathering seam; `gatherPlanData`; `calendar.service.list`.
- **Verification:** `pnpm --filter @studypilot/api test` (gated, `--runInBand`) green incl. the V-15-1 identity and both scoping specs.
- **Dependencies / exclusions:** EP15A–C. Client rendering → EP15E. Old-table drop → EP15I.
