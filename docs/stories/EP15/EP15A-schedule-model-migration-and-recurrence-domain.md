# EP15A — Schedule Model, Copy Migration and Recurrence Domain

**Story ID:** EP15A
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Backend (persistence + pure domain)
**Status:** Blocked — EP14 review unit not yet passed (D15-11); plan review pending (new migration)
**Dependencies:** none inside EP15. Epic decisions D15-2, D15-4, D15-5, D15-13 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** three new tables (`day_bounds`, `schedule_blocks`, `schedule_block_exceptions`) with Prisma models; one migration that also copies every `availability_slots` row into `schedule_blocks`; a pure domain module `apps/api/src/domain/schedule/` that expands blocks into dated occurrences and reads day bounds with defaults.
- **Why it improves it:** every later child verifies against real migrated data instead of empty tables (product continuity, AC-E15-13); recurrence and defaults are one tested pure function instead of logic scattered across the calendar and planner services (code).
- **Decisions needing you:** none ▲ — D-A1…D-A4 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Lay the persistence and the pure recurrence logic the rest of EP15 stands
on. The migration is additive: `availability_slots` stays until EP15I so the
old page keeps working during the interim (D15-15). The domain module knows
no clock, no Prisma and no Nest.

## Scope

**In:** schema models and relations per [contracts.md](./contracts.md#data-model-ep15a-creates-and-copies-ep15i-drops); migration `…_schedule_blocks_and_day_bounds` (tables + copy); `domain/schedule/recurrence.ts` (`expandBlocks`, `readDayBounds`, `dayBoundsFor`, weekday bitmask helpers) and its spec; migration round-trip test (V-15-2).
**Out:** any HTTP route (EP15B), engine changes (EP15C), dropping the old table (EP15I).

## Source requirement references

AC-E15-01 (default reader), AC-E15-03 (model), AC-E15-13 (copy); TR-E15-01; DoD-3, DoD-8, DoD-9.

## Acceptance criteria

1. The migration creates `day_bounds`, `schedule_blocks` and `schedule_block_exceptions` exactly as specified in contracts.md (columns, enums, uniques, indexes, cascades); the Prisma models and the `User`/`Course` relations exist; `pnpm db:generate`, typecheck and every existing API suite stay green.
2. The same migration copies every `availability_slots` row into `schedule_blocks`: `kind` = `STUDY` when `isAvailable` else `BUSY`; `energy` kept for STUDY and `NORMAL` for BUSY; `weekdays` = `1 << dayOfWeek`; `startDate` = `createdAt::date`; `title` null; times verbatim; `userId` preserved. On a seeded database the row count matches and every field pair matches (V-15-2). `availability_slots` is not modified.
3. `expandBlocks(blocks, from, to)` is a pure function returning occurrences per contracts.md: one-off on its date only; weekly on set weekdays from `startDate` through `endDate` (open when null); exception dates skipped; `"24:00"` → 1440; sorted by `date`, `startMinute`, `blockId`; a DST transition date yields the same minutes as any other date.
4. `readDayBounds(rows)` returns seven entries with `08:00`–`23:00` for any missing or invalid weekday and `configured` only when all seven rows exist; `dayBoundsFor(days, date)` returns the half-open `[wake, sleep)` interval for that civil date.

## Tests (TR-E15-01)

- Migration round-trip (gated on `DATABASE_URL`): seed slots covering `dayOfWeek 0` and `6`, both kinds, `energy HIGH`/`LOW`; execute the copy statement; assert counts and per-field equality; assert the old table is unchanged.
- `expandBlocks`: one-off in/out of range; weekly with multiple weekdays; `endDate` boundary inclusive; exception skipped; `24:00`; DST date (e.g. `2026-03-08` in `America/New_York` is irrelevant to minutes — asserted); sort order; purity (no imports from `@nestjs/*`, Prisma or `Date.now` — lint/grep assertion like `scheduler.ts`).
- `readDayBounds`: empty rows → seven defaults, `configured: false`; six rows → the missing weekday defaults, `configured: false`; invalid pair (`sleep ≤ wake`) → default for that day; seven valid rows → `configured: true`.

## Technical notes

- **Inspected:** `schema.prisma` (`AvailabilitySlot` L325–341, `ClassMeeting`, `PlannedSession`, `EnergyLevel` enum), `prisma/migrations/20261116120000_availability_slot_energy` (last migration), `common/lib/calendar-date.ts` (`addDays`, `dayOfWeekOf`, `parseCalendarDate`), `domain/study-planning/preferences.ts` (defensive-reader precedent, D06-14).
- **Proposed:** the copy is a single `INSERT … SELECT` between `-- copy:start` / `-- copy:end` marker comments in `migration.sql`, so the gated test can execute exactly that statement against a seeded table. Ids via `gen_random_uuid()` (D-A3). The domain module lives beside `study-planning/` as `domain/schedule/` with its own `types.ts`.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-A1 | Weekday storage: (a) `Int` bitmask (bit n = weekday n); (b) `Int[]`; (c) a join table | **(a)** — one column, indexable, trivially validated; the API exposes an array | Proposed |
| D-A2 | `startDate` for migrated weekly rows: (a) `createdAt::date`; (b) a fixed sentinel date; (c) the earliest semester start | **(a)** — the honest first date the student had the slot; the planner only looks forward | Proposed |
| D-A3 | Row ids in the copy: (a) `gen_random_uuid()` (Postgres 13+ built-in); (b) application-generated via a Prisma script | **(a)** — one SQL file, replayable; CI's Postgres service version is unverified — if < 13, fall back to `md5(random()::text || clock_timestamp()::text)::uuid` in the same statement | Proposed |
| D-A4 | Midnight end: (a) the literal `"24:00"` allowed in `sleepTime`/`endTime` (string compare stays chronological: `"24:00" > "23:59"`); (b) a boolean `endsAtMidnight` | **(a)** — one representation, no extra column (D15-4) | Proposed |

## Definition of Done

1 (functional), 3 (`userId` preserved on every copied row), 8 (TR-E15-01), 9 (migration documented in contracts.md and the API README schema list). 2/4/5/6/7 N/A (no HTTP, no UI). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the schedule tables exist with the students' data in them, and recurrence is one pure, tested function.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<ts>_schedule_blocks_and_day_bounds/migration.sql` (new), `apps/api/src/domain/schedule/{types,recurrence}.ts` (new) + `recurrence.spec.ts` (new), `apps/api/src/modules/schedule/schedule-migration.e2e.spec.ts` (new, gated), `docs/stories/EP15/contracts.md` (migration note).
- **Start context:** this story; contracts.md "Data model" and "Recurrence semantics"; `calendar-date.ts`; `preferences.ts` as the reader precedent.
- **Verification:** `pnpm --filter @studypilot/api db:generate && pnpm --filter @studypilot/api typecheck && pnpm --filter @studypilot/api test` (gated suites with `DATABASE_URL`, `--runInBand`) — all green; the round-trip test passes against a seeded database.
- **Dependencies / exclusions:** EP14 review passed (D15-11). API → EP15B; engine → EP15C; drop → EP15I.
