# EP15A implementation record

**Story:** [EP15A — Schedule Model, Copy Migration and Recurrence Domain](../../EP15A-schedule-model-migration-and-recurrence-domain.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** `apps/api/prisma/schema.prisma` + migration `20261117120000_schedule_blocks_and_day_bounds`; new pure domain `apps/api/src/domain/schedule/{types,recurrence}.ts` + `recurrence.spec.ts`; new gated spec `apps/api/src/modules/schedule/schedule-migration.e2e.spec.ts`; `docs/stories/EP15/contracts.md` (migration note), root `README.md` (schema list); this record; story Status/Decisions rulings/sizing; README queue row + Active/Next fields; `efficiency.md`.

Decisions applied: D-A1, D-A4 (ratified by user grant 2026-11-16, D15-17); D-A2, D-A3 (ratified by default 2026-11-17 at implementation start, on the user's instruction to ratify outstanding decisions). Epic D15-4, D15-5, D15-13 as written. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15A-AC1 — three tables exactly per contracts.md; Prisma models + `User`/`Course` relations; generate, typecheck and every existing suite green; rollback documented beside the migration | **Done.** `ScheduleBlockKind` enum, `DayBounds`, `ScheduleBlock`, `ScheduleBlockException` models (columns, `@db.Date`, uniques `[userId, dayOfWeek]` / `[blockId, date]`, index `[userId, startDate]`, cascades Cascade/Cascade/SetNull/Cascade) added verbatim from contracts.md; `User.dayBounds`, `User.scheduleBlocks`, `Course.studyBlocks` relations. The migration's DDL is the verbatim `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` output; after `migrate deploy` the same diff reports **No difference detected**. Rollback (`DROP TABLE … ; DROP TYPE "ScheduleBlockKind";`) is in the migration header and in contracts.md (DoD-9). | `prisma validate` ✓; `migrate deploy` on a throwaway database ✓; diff-empty check ✓; `prisma generate` ✓; `tsc --noEmit` ✓; gated run 1663/0 below |
| EP15A-AC2 — the same migration copies every `availability_slots` row (`kind`, `energy`, `weekdays = 1 << dayOfWeek`, `startDate = createdAt::date`, `title` null, times verbatim, `userId` preserved); counts and fields match on a seeded database (V-15-2); old table untouched | **Done.** One `INSERT … SELECT` between the `-- copy:start` / `-- copy:end` lines; ids `gen_random_uuid()::text` (D-A3); `createdAt`/`updatedAt` carried over. The gated spec reads exactly that statement from `migration.sql`, seeds six slots (`dayOfWeek` 0 and 6, both kinds, `HIGH`/`LOW`/`NORMAL`) for a fresh user inside one interactive transaction, executes it, asserts per-user count = 6 = blocks, global `blocks after − before = total slots`, every field pair (kind, energy rule, weekday bit, times, nulls, `startDate` = `createdAt` UTC date, uuid shape, `userId`), `availability_slots` byte-identical before/after, then rolls back and asserts nothing survived — so it is safe on a database where the real copy already ran. | `schedule-migration.e2e.spec.ts` (1 case, gated); throwaway database counts `0 / 0 / 0` after the run |
| EP15A-AC3 — `expandBlocks(blocks, from, to)` pure: one-off on its date; weekly on set weekdays from `startDate` through `endDate` (open when null); exceptions skipped; `"24:00"` → 1440; sorted by `date`, `startMinute`, `blockId`; DST date identical | **Done.** `recurrence.ts` `expandBlocks` (inclusive `from…to`, string-date arithmetic via `calendar-date.ts` `addDays`/`dayOfWeekOf`, no instant ever constructed); `timeToMinutes` maps `"24:00"` to `1440`; total comparator. | `recurrence.spec.ts` — one-off in/at-bounds/out (4), weekly: weekdays set, `startDate` later than `from`, inclusive `endDate`, open-ended, exceptions, Sunday/Saturday bits, `24:00`, DST 2026-03-08 + 2026-11-01 vs a plain Sunday (8), ordering / interleaving / inverted range / determinism + no mutation (4) |
| EP15A-AC4 — `readDayBounds(rows)` → seven entries, `08:00`–`23:00` for any missing or invalid weekday, `configured` only when all seven rows exist; `dayBoundsFor(days, date)` → half-open `[wake, sleep)` for that civil date | **Done.** Defensive reader: non-integer / out-of-range `dayOfWeek` ignored, first row per weekday wins, invalid pair (malformed, `sleep ≤ wake`, `wake ≥ 24:00`, `sleep > 24:00`) → default for that day and `configured: false`. `dayBoundsFor` reads the date's weekday entry (default when absent or invalid), `"24:00"` → `1440`. | `recurrence.spec.ts` — empty, six rows, seven rows in reverse order, invalid pair + inverted pair, malformed/out-of-range batch, `00:00`–`24:00` (6); `dayBoundsFor` (3); helpers (6); purity grep over `recurrence.ts` and `types.ts` (1) |

**Semantics note (AC4):** "configured only when all seven rows exist" is implemented as *seven valid rows* — an invalid stored pair counts as missing for `configured` too, because the EP15F prompt should reappear when a weekday is silently reading its default. The API (EP15B) rejects invalid pairs on write, so the two readings coincide for every row the product can store.

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD ce87858` + the uncommitted changes that form this commit (final content for every run; the domain and gated specs were run again after the only post-run edit, a prettier pass on the gated spec).

- **Migration:** `createdb postgres_gate_oak_ep15a` → `DATABASE_URL=postgresql://<local user>@localhost:5432/postgres_gate_oak_ep15a npx prisma migrate deploy` (cwd `apps/api`; applies `20261117120000_schedule_blocks_and_day_bounds` on top of the chain) → `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → **No difference detected**, exit 0. Local Postgres 14.21; CI uses `postgres:15-alpine` (F-EP15A-01). No `.env*` file exists in this worktree; `DATABASE_URL` was shell-only.
- **Gated API (full, single worker):** `DATABASE_URL=… npx jest --runInBand` (cwd `apps/api`) → **82 suites, 1663 passed, 0 failed** (33 new: 32 domain + 1 gated; 1630 before this change, derived). The gated spec alone: 1 passed, throwaway database left at 0 slots / 0 blocks / 0 users.
- **Ungated API:** `npx jest` without `DATABASE_URL` (cwd `apps/api`) → 53 suites run / 29 skipped, **1178 passed, 0 failed** (485 gated skipped, the new round-trip spec among them).
- **Static:** `npx prisma validate` ✓; `npx prisma generate` ✓; `npx tsc --noEmit` ✓; `npx eslint "src/**/*.ts" --max-warnings 0` ✓; prettier check on the four new files ✓.
- **Red-first:** the domain spec was written against the contract and run against the module in one step (pure functions with fixed fixtures); the gated spec failed once on its own extractor (the header prose also names the marker text, so `indexOf` caught the comment) — fixed to whole-line markers, then green. No existing test changed.

## Changed paths

- Backend: `apps/api/prisma/schema.prisma` (+67 lines, no reflow), `apps/api/prisma/migrations/20261117120000_schedule_blocks_and_day_bounds/migration.sql` (new); `apps/api/src/domain/schedule/types.ts`, `apps/api/src/domain/schedule/recurrence.ts` (new).
- Specs: `apps/api/src/domain/schedule/recurrence.spec.ts` (new, 32), `apps/api/src/modules/schedule/schedule-migration.e2e.spec.ts` (new, 1, gated).
- Docs (DoD-9): `docs/stories/EP15/contracts.md` (Migration 1 paragraph: file name, copy markers, `createdAt`/`updatedAt`), root `README.md` (Database Schema list: `DayBounds`, `ScheduleBlock`, `ScheduleBlockException`); this record; story Status, D-A2/D-A3 Ruling cells, sizing; README queue row, Active/Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15A-01 | D-A3 ("CI's Postgres service version is unverified"); `.github/workflows/ci.yml:17` | The decision left the `gen_random_uuid()` availability open. | **Closed, no change:** CI runs `postgres:15-alpine` and local is 14.21, both ≥ 13, so the built-in is available and the `md5(...)` fallback is not shipped. | — |
| F-EP15A-02 | `schedule-migration.e2e.spec.ts`; migration copy statement | The copy statement copies *every* `availability_slots` row, so re-running it in a test on a database where the migration already ran would duplicate other students' rows. | **Fixed in the spec design:** seed, copy and assertions run inside one interactive transaction that is rolled back; the spec also asserts the rollback. Product unchanged. | — |
| F-EP15A-03 | Story DoD-9 wording "the API README schema list" | No `apps/api/README.md` exists; the schema list lives in the root `README.md` → *Database Schema*. | **Done there:** three bullets added. Parent review to note the pointer. | parent review |

## Deviations

1. **D-A2 wording refined, not changed:** `createdAt` is a zone-less `TIMESTAMP(3)` holding the UTC instant, so `createdAt::date` is the UTC civil date regardless of the session zone — the stated assumption holds by construction. Recorded in the migration header; the decision text is untouched.
2. **`expandBlocks` trusts its rows** (times validated on write by EP15B) while `readDayBounds` is defensive, exactly as the story's AC3/AC4 split asks; a malformed time in a block reads as `00:00` / `24:00` rather than throwing, so a bad row can never take the calendar down.
3. The domain module imports `addDays`/`dayOfWeekOf` from `common/lib/calendar-date.ts` (contracts.md: "all date work uses EP12A's civil-date helpers"); the existing `study-planning` domain inlines the same arithmetic. The purity grep covers the import graph either way.
