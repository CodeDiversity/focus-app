# EP06C: Deterministic Scheduling Engine & Conflict Rules

**Story ID:** EP06C
**Title:** Backend — the pure TypeScript scheduling engine, the free-interval computation and the conflict rules
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend (pure domain module)
**Status:** Queued
**Dependencies:** EP06A implemented (the shared `StudyPreferences` type and the domain folder) and EP06B implemented (the schedulable/flagged classification the engine consumes). EP03 + EP04 complete.
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

The epic's heart: a deterministic scheduling algorithm that spreads a student's remaining work across the coming week, inside their available windows, without touching classes, blocked time or confirmed study sessions, and reports the work that cannot fit before a deadline. It is a **pure TypeScript domain module** — no HTTP, no React, no database, no clock, no randomness — exactly as the epic's Technical Notes require, so it can be unit-tested exhaustively and reused later by EP08's replanning.

## Description & bounded scope

### In scope

1. **The interval algebra** — `apps/api/src/domain/study-planning/intervals.ts`: `mergeIntervals`, `subtractIntervals`, `overlaps`, `minutesBetween`, all over half-open `[start, end)` minute intervals. This is the shared primitive behind both the placement and the conflict rules.
2. **The conflict rules** (the epic's proposed story 4) — the computation of a day's **free intervals**: the student's available `AvailabilitySlot` windows for that weekday, minus the blocked windows (`isAvailable: false`), minus the `ClassMeeting` windows of active courses, minus the confirmed `StudySession` intervals, minus the sessions the run has already placed. The rules are specified once and used twice — by the placement and by the save-time re-check in EP06D.
3. **The engine** — `apps/api/src/domain/study-planning/scheduler.ts`: the deterministic ordering, the placement loop, the session-length rule, the daily cap, the deadline horizon, the deficit categories and the deferred list.
4. **The engine's types** — added to `apps/api/src/domain/study-planning/types.ts` (created in EP06A): `SchedulerInput`, `SchedulerOutput`, `WeeklyWindow`, `DatedInterval`, `SchedulableAssignment`, `PlannedSessionProposal`, `DeficitCategory`.
5. **The unit tests** — the exhaustive engine test matrix (TR-E06-03).

### Out of scope

- Every form of I/O: the engine does not read the database, does not call the clock and does not touch HTTP. The NestJS service that gathers the academic data and persists the result is **EP06D**.
- The remaining-work calculation and the confirmed-time aggregation — **EP06B**.
- The plan persistence, the preview, the save and the save-time re-check — **EP06D**.
- Any frontend work.
- The time-zone arithmetic — the service converts the confirmed sessions into wall-clock intervals before calling the engine (D06-17's module boundary).
- Writing anything, including assignment due dates (AC-E06-08 — the engine has no write path at all).

## Source requirement references

- **Epic AC-E06-03** ("The scheduler places work only inside available study windows"), **AC-E06-04** ("Proposed sessions do not overlap classes, blocked time, or existing confirmed sessions"), **AC-E06-05** ("The scheduler prioritizes upcoming deadlines with deterministic tie-breaking rules"), **AC-E06-07** (the deficit computation), **AC-E06-08** ("The scheduler does not change assignment due dates"), **AC-E06-09** (the flagged assignments are not scheduled).
- **TR-E06-03** (this child's test obligations).
- **Shared DoD** — items 1, 8 apply (plus item 3 by construction: the engine has no user context to scope — the ownership scoping happens in EP06B/EP06D's queries); items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-1 (assignments, not subtasks), D06-2 (one assignment splits across several sessions and days), D06-3 (the 7-day rolling window), D06-5 (the preview's edit model), D06-9 (the ordering and the tie-breaks), D06-10 (overdue last), D06-11 (the deficit categories), D06-17 (the module's location); and the parent README's **Shared API and data contract** → *The engine's rules*, *The pure domain module*.

## Acceptance criteria

1. The engine is a pure function: given the same input it returns the same output, with no clock, no randomness, no database, no HTTP and no import from `@nestjs/*` or the Prisma client. "Today" and every time window are supplied by the caller.
2. The engine places work only inside the student's **available** windows (AC-E06-03) and never inside a blocked window, a class window or a confirmed session (AC-E06-04); every placed session is inside a free interval of its date.
3. The ordering is fully deterministic (AC-E06-05): on-time assignments first by due date ascending, then overdue assignments; within a group by priority descending, then `createdAt` ascending, then `assignmentId` ascending. The last key makes the order total.
4. One assignment's remaining work may be placed in several sessions on several days (D06-2), each of the session length `min(sessionLengthMinutes, remaining work)`, with the final tail session allowed to be shorter than `minSessionMinutes`; a session is never split across two intervals and is never placed in an interval too short for it.
5. The total planned minutes on a day never exceeds `dailyCapMinutes`, and the cap is consumed in interval order.
6. An on-time assignment is placed only on dates at or before its due date; the work that does not fit before its deadline is reported as `INSUFFICIENT_TIME_BEFORE_DEADLINE` with its minutes, an assignment with no free time at all in the window as `NO_AVAILABLE_TIME`, and an overdue assignment as `OVERDUE` with its full remaining minutes. Work that is not placed but whose deadline lies beyond the window is reported as `deferred`, not as a deficit.
7. A flagged assignment (no estimate, or no due date) is never placed, and the engine never produces a session for it.
8. The engine never changes an assignment's due date — it has no write path at all (AC-E06-08).
9. The unit test matrix covers the ordering and every tie-break, the window placement, the splitting across days, the daily cap, the interval arithmetic, the conflict avoidance, the deficit categories and the flag refusal.

## Tests to add / update

- `apps/api/src/domain/study-planning/intervals.spec.ts` (new) — the interval algebra:
  - merging overlapping and touching intervals; merging unsorted input;
  - subtracting an interval that is inside, that overlaps one end, that spans the whole set, and one that misses entirely;
  - `overlaps` for touching intervals (half-open: touching is **not** an overlap);
  - `minutesBetween` for a same-day range.
- `apps/api/src/domain/study-planning/scheduler.spec.ts` (new) — the engine matrix (TR-E06-03):
  1. **ordering** — three assignments with the same due date are ordered by priority, then `createdAt`, then `id`; an overdue assignment is processed after every on-time one (D06-10);
  2. **placement** — a session lands in the earliest free interval of the earliest eligible day;
  3. **window restriction** — no session is placed outside an available window, inside a blocked window, inside a class window or on top of a confirmed session;
  4. **splitting (D06-2)** — an assignment with more work than one session fits is placed in several sessions, on several days when the window allows, and the total placed equals the total remaining;
  5. **session length** — the default length, the shortened tail session, and the rule that an interval too short for a session is left unused;
  6. **daily cap** — a day never exceeds `dailyCapMinutes`, and the cap is consumed in interval order;
  7. **deadline horizon** — no session is placed after its assignment's due date;
  8. **deficits** — `INSUFFICIENT_TIME_BEFORE_DEADLINE` with the right minutes, `NO_AVAILABLE_TIME` when the week has no free time, `OVERDUE` for a past deadline, and `deferred` for a deadline beyond the window;
  9. **flagged work** — a flagged assignment produces no session and no placement;
  10. **purity** — the same input produces byte-identical output across repeated calls, and the input objects are not mutated.

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/api/prisma/schema.prisma:292-305` — `AvailabilitySlot { dayOfWeek Int (0-6), startTime String ("HH:mm"), endTime String, isAvailable Boolean @default(true) }`; the available windows and the recurring blocked times are the same resource, distinguished by the flag (EP04's D404-5 — weekly-recurring only, no dated one-off blocks).
- `apps/api/prisma/schema.prisma:167-181` — `ClassMeeting { courseId, dayOfWeek, startTime, endTime }`, all times as `HH:mm` strings, `endTime` strictly after `startTime` on the same day (no midnight wrap — the `availability` service's `validateSlotTimes` rule).
- `apps/api/prisma/schema.prisma:187-210` — `Assignment { dueDate, estimatedHours, status, priority, createdAt }` — the ordering keys the engine uses.
- `apps/api/src/modules/calendar/calendar.service.ts:47-66` — `zoneDateParts(date, timeZone)` (the wall-clock rendering used by the calendar) and `:105-132` — `wallToInstant` / `tzOffsetMs` (the zone arithmetic). The engine does **not** use them: the service converts the confirmed sessions into wall-clock intervals before calling the engine, so the engine stays zone-free (D06-17).
- `apps/api/src/modules/availability/availability.service.ts:87-113` — `validateSlotTimes`, the `HH:mm` + same-day rule the engine's window builder must apply when it converts the stored strings into minute offsets.
- `apps/api/src/modules/assignments/` — the assignment projection and the `AssignmentStatus` values (`PENDING, IN_PROGRESS, COMPLETED, SUBMITTED, GRADED`).

### Implementation notes (concrete)

1. **The module boundary.** `apps/api/src/domain/study-planning/` imports nothing from `@nestjs/*` and nothing from the Prisma client. The files are `types.ts` (shared types), `preferences.ts` (EP06A), `remaining-work.ts` (EP06B), `intervals.ts` and `scheduler.ts` (this story). A lint rule or a reviewer check must confirm that the domain folder has no framework import — this is the epic's Technical Note, made mechanical.
2. **The input.** `SchedulerInput`:
   ```ts
   interface SchedulerInput {
     days: string[];                       // the 7 civil dates, ascending (D06-3)
     assignments: SchedulableAssignment[]; // { id, title, dueDate, remainingMinutes, priority, createdAt }
     availability: WeeklyWindow[];         // { dayOfWeek, startMinute, endMinute }  (isAvailable = true only)
     blocked: WeeklyWindow[];              // { dayOfWeek, startMinute, endMinute }  (isAvailable = false)
     classes: WeeklyWindow[];              // { dayOfWeek, startMinute, endMinute, courseId }
     busy: DatedInterval[];                // { date, startMinute, endMinute } — the confirmed sessions, in wall clock
     preferences: StudyPreferences;
   }
   ```
   The caller converts `HH:mm` strings to minute offsets and converts the confirmed sessions into wall-clock intervals; the engine works in minutes from midnight.
3. **The ordering (D06-9).** Two groups: `dueDate >= days[0]` (on time) and `dueDate < days[0]` (overdue). On-time first, then overdue. Within a group: `dueDate` ascending (the on-time group only — the overdue group is already past), then priority descending (`URGENT` 4 → `HIGH` 3 → `MEDIUM` 2 → `LOW` 1), then `createdAt` ascending, then `id` ascending (a total order).
4. **The free intervals of a date.** `available(dayOfWeek)` merged, minus `blocked(dayOfWeek)`, minus `classes(dayOfWeek)`, minus `busy(date)`, minus the sessions already placed that date. The result is a sorted, disjoint list of half-open intervals.
5. **The daily cap.** The day's budget starts at `preferences.dailyCapMinutes` and is decremented by each placed session's length. A session is only placed when the day's remaining budget covers it. Because the free intervals are consumed in order, the cap binds deterministically.
6. **The placement loop for one assignment.**
   - the horizon = the dates in `days` that are `≤ dueDate` (for an overdue assignment: all the dates in `days`, because the work still needs doing — D06-10);
   - `capacity` = the total free minutes in the horizon **measured before this assignment's own placements** (i.e. after the earlier assignments took their pick) — this is the number the deficit is computed against;
   - the session length = `min(preferences.sessionLengthMinutes, remaining)`; if that is below `minSessionMinutes`, the tail is placed as one shorter session;
   - the sessions are placed into the earliest free interval that fits the whole length, in date order and then interval order;
   - the interval is consumed, the day's budget is decremented, and the loop continues until the work is exhausted or no interval fits;
   - the deficit for an on-time assignment = `max(0, remaining − capacity)` when the due date is inside the window; for an assignment whose deadline is beyond the window, the unplaced work is `deferred` instead of a deficit.
7. **The output.**
   ```ts
   interface SchedulerOutput {
     sessions: PlannedSessionProposal[];    // { assignmentId, assignmentTitle, date, startMinute, endMinute, durationMinutes }
     results: AssignmentScheduleResult[];   // per assignment: { assignmentId, placedMinutes, deferredMinutes, deficitMinutes, deficitCategory | null }
   }
   ```
   `deficitCategory` ∈ `NO_AVAILABLE_TIME | INSUFFICIENT_TIME_BEFORE_DEADLINE | OVERDUE | null`.
8. **The deficit categories (D06-11).** `NO_AVAILABLE_TIME` when the whole window has zero free minutes; `INSUFFICIENT_TIME_BEFORE_DEADLINE` when the free capacity before the deadline is short of the remaining work; `OVERDUE` when the due date is before today (the whole remaining work is reported, whatever was placed). The API returns structured facts and minutes — **not** user-facing prose; the copy belongs to the frontend (EP06G, settled by the `ui-refiner`).
9. **No mutation.** The engine copies its inputs into local structures and never mutates the caller's objects — the input is reused across the preview and the save.

### Risks / open questions (none blocking)

- **DST days.** The engine works in wall-clock minutes, so a 23- or 25-hour day is treated as a normal day and the session times are wall-clock times. The plan is a wall-clock plan; the exact instants are derived by the service when it persists them. This is an accepted simplification for the MVP and is recorded, not hidden.
- **The confirmed sessions' wall-clock conversion** happens in the service, so a session that crosses midnight in the profile zone is attributed to the local day it starts in. Recorded as a boundary of the conversion, not of the engine.
- **The cap and the window interact.** When both bind, the cap wins for the number of minutes placed and the window wins for where they are placed. The tests pin both directions.
- **An assignment whose due date falls outside the window** (before `days[0]` is the overdue case; after `days[last]` is the deferred case) has no third behaviour — the tests cover both.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled — the engine is total: it returns an empty result rather than throwing for an empty window, an assignment with no remaining work, or an empty availability list. There is no client input in this story (the API's validation is EP06D's).
3. Academic data is scoped to the authenticated student — not applicable in this story: the engine is a pure function with no user context and no query. The scoping happens in EP06B/EP06D's reads, which feed it.
4. API errors are actionable — not applicable in this story: the engine returns structured results (including the deficit categories), not HTTP errors.
5. Not applicable — no frontend async states in this story.
6. Not applicable — no UI in this story.
7. Not applicable — no UI in this story.
8. Business rules have automated tests — the interval-algebra unit tests and the ten-group engine matrix (TR-E06-03), including the purity and the no-mutation checks.
9. API changes and migrations are documented — not applicable in this story (no schema, no endpoint). The engine's contract and its rules are documented in the parent README's shared API/data contract section.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** a deterministic, exhaustively unit-tested scheduling engine that spreads remaining work across the coming week inside the student's free windows, avoids every hard conflict, and reports the work that cannot fit before a deadline.

- **Request/token estimate:** 2–3 requests/tokens — the interval algebra, the free-interval computation, the ordering, the placement loop, the deficit computation and a ten-group unit-test matrix. The upper end of the band is warranted because the placement rules interact (the cap, the window, the horizon and the tail session) and a wrong rule shows up as a plausible-looking plan rather than an error.
- **Model recommendation:** 4 — the algorithm is not large, but it is a deterministic rules engine whose correctness is judged only by its tests; the interactions between the cap, the deadline horizon, the tail-session rule and the deficit accounting are exactly where a frontier-level model earns its place. A frontier model is recommended for the placement loop and the deficit accounting; the interval algebra is ordinary work.
- **Files:**
  - `apps/api/src/domain/study-planning/intervals.ts` (new);
  - `apps/api/src/domain/study-planning/intervals.spec.ts` (new);
  - `apps/api/src/domain/study-planning/scheduler.ts` (new);
  - `apps/api/src/domain/study-planning/scheduler.spec.ts` (new);
  - `apps/api/src/domain/study-planning/types.ts` (modify — the scheduler's types).
- **Start context:** this story file; the parent README's shared API/data contract → *The engine's rules* and *The pure domain module*, and the decision register (D06-1, D06-2, D06-3, D06-5, D06-9, D06-10, D06-11, D06-17); EP06A's story (the domain folder and the `StudyPreferences` type); EP06B's story (the `schedulable` classification the engine consumes); `apps/api/prisma/schema.prisma:167-181`, `:187-210`, `:292-305`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api test -- scheduler` (the engine matrix); `pnpm --filter api test -- intervals` (the algebra); `pnpm --filter api test` (the full API suite — the domain folder must not break the build); `pnpm --filter api typecheck`; `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP06A + EP06B implemented. Excludes every form of I/O (the service and the endpoints are EP06D's), the remaining-work calculation (EP06B), the plan persistence (EP06D), all frontend work, the time-zone arithmetic (the service's job), and any write path — including assignment due dates (AC-E06-08).

## UI/UX gaps for the `ui-refiner`

None — this is a backend/domain story with no user-facing surface. The **presentation** of the engine's output (the week view, the session card, the move/resize interaction) is EP06F's and needs its own `ui-refiner` pass.
