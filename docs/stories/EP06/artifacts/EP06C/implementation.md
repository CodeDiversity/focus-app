# EP06C implementation record

**Status:** implementation complete — awaiting parent review (2026-10-30). This child's own review is not a gate: the **combined EP06 parent review** (after EP06H) is.
**Story:** [EP06C — Deterministic Scheduling Engine & Conflict Rules](../../EP06C-deterministic-scheduling-engine.md)
**Parent:** [EP06 — Study Planning & Scheduling](../../README.md) (the execution queue, the shared API/data contract, the decision register)
**Review unit:** EP06 combined parent review — `../EP06/review.md` + `../EP06/walkthrough.md` (after EP06H). EP06C is one of the eight children of that unit.
**Checkpoint:** [checkpoint.md](./checkpoint.md) (the discoveries, the decisions and the resume state)
**Code commit:** (see the returned handoff — the code commit carries the application code and the tests; the closeout commit carries this record, the final checkpoint, the queue/status updates and the child's status line, and is identified in the returned handoff).

## What was built

The pure TypeScript scheduling engine and the conflict rules (EP06C — the epic's heart): a deterministic algorithm that spreads a student's remaining work across the coming week, inside their available windows, avoiding every hard conflict, and reporting the work that cannot fit before a deadline. It is a **pure domain module** with no HTTP, React, database, clock, randomness or framework imports (D06-17), so it can be unit-tested exhaustively and reused by EP08's replanning.

| Piece | Where | What it owns |
|---|---|---|
| The shared types | `apps/api/src/domain/study-planning/types.ts` (modified) | `WeeklyWindow`, `DatedInterval`, `FreeIntervalBase`, `DeficitCategory`, `PlannedSessionProposal`, `AssignmentScheduleResult`, `SchedulerInput`, `SchedulerOutput` — added by this child (the file's header already named EP06C as their owner). |
| The interval algebra + the **one** shared free-interval helper | `apps/api/src/domain/study-planning/intervals.ts` (new) | `mergeIntervals`, `subtractIntervals`, `overlaps`, `minutesBetween`, and `freeIntervals(...)` — "available − blocked − classes − confirmed − already placed" for one date. The single implementation the placement (here) and EP06D's save-time re-check both call. |
| The engine | `apps/api/src/domain/study-planning/scheduler.ts` (new) | `schedule(input)` — the deterministic ordering (via the shared comparator), the placement loop, the session-length rule, the daily cap, the deadline horizon, the deficit categories and the deferred list. |
| The tests | `apps/api/src/domain/study-planning/intervals.spec.ts` (new, 24 tests), `apps/api/src/domain/study-planning/scheduler.spec.ts` (new, 25 tests) | the interval algebra + the helper's two base modes, subtraction order, `placed` input, date filtering, merge; and the nine-group engine matrix (TR-E06-03). |

### The weekly → dated expansion (D06-24, the weekday mapping)

`WeeklyWindow.dayOfWeek` is `0`–`6` with **Sunday = 0** (the schema's own convention). For each of the seven dates the engine takes the windows whose `dayOfWeek` equals that date's weekday, which is `getUTCDay()` on the date's UTC midnight — the calendar's own `dayOfWeekOf` (`calendar.service.ts:83-85`, used by the calendar at `:229-232` and `:253`). The engine expands each matching window into a `DatedInterval` for that date before calling `freeIntervals(...)`. The mapping is a pure function of the input — no clock, no zone — and EP06D's re-check performs the same expansion, so the two agree on which windows apply to a date.

### The free-interval helper (the "specified once, used twice" seam)

`freeIntervals({ date, base, blocked, classes, busy, placed })` filters **every** input by `date` (so a caller can hand in a whole week without leaking another day's windows), builds the base (`{ kind: 'declared', windows }` → the merged declared windows; an empty array means the student declared no availability for that weekday, so the day has no free time; `{ kind: 'whole-day' }` → `[00:00, 1440)`), then subtracts `blocked → classes → busy → placed` in that order with the shared `subtractIntervals`. `placed` is **required** and is what makes the helper safe for both call sites: the engine passes the sessions it has already placed on that date in this run (so its second placement on a day can never overlap its first), and EP06D's re-check passes the **other** submitted sessions (the session under test is excluded from its own `placed` set, so a submitted session never conflicts with itself). The result is sorted, disjoint and merged (touching intervals merge; `overlaps` treats touching intervals as **not** overlapping).

### The placement (D06-20, D06-2, D06-9, D06-10, D06-11, D06-24)

- Assignments are sorted by the **one** shared comparator (`compareAssignments` from `ordering.ts`) — on-time first (due date ascending), then overdue, then undated; within a group priority descending, then `createdAt` ascending, then `id` ascending. The engine does not define a second ordering.
- For each assignment, in that order: the horizon is the dates `≤ dueDate` (both civil dates); an overdue assignment uses all the window dates. The day's budget starts at `dailyCapMinutes` and is decremented by each placed session.
- Session length = `min(sessionLengthMinutes, remainingWork, remainingDailyBudget)`: the daily cap **truncates** a session, it never skips it; a session shorter than `minSessionMinutes` is still placed when the work's remaining tail or the day's remaining budget cannot support a longer one; a session is never split across two intervals and is never placed in an interval too short for it.
- The sessions are placed into the earliest free interval that fits the whole length, in date order then interval order; after each placement the day's free intervals are recomputed with the newly placed session added to the helper's `placed` input, so the next placement on the same day sees the earlier ones and can never overlap them.
- The deficit for an on-time assignment = `max(0, remainingWork − placedMinutes)` over its horizon; the minutes the cap truncated **were placed** and are not a deficit. `NO_AVAILABLE_TIME` when the whole window has zero free minutes; `INSUFFICIENT_TIME_BEFORE_DEADLINE` when the free capacity before the deadline is short of the remaining work (the reported minutes are `remaining − placed`); `OVERDUE` when the civil due date is before today's civil date (the **full** remaining work is reported, whatever was placed); `deferred` for work that is not placed but whose deadline lies beyond the window. A flagged assignment (no estimate, or no due date) is never scheduled — the engine receives only the schedulable classification.
- The engine has no write path at all: `Assignment.dueDate` and every other assignment field are never written (AC-E06-08).
- The engine copies its inputs into local structures and never mutates the caller's objects (the input is reused across the preview and the save).

### The conflict rules (the epic's proposed story 4)

The free-interval computation subtracts the blocked windows (`AvailabilitySlot.isAvailable = false`), the `ClassMeeting` windows of active courses, the confirmed `StudySession` intervals and the sessions the run has already placed, before any placement — so every placed session is inside a free interval of its date. The same helper is what EP06D's save-time re-check calls with `base: { kind: 'whole-day' }` (the availability-omitted mode — a manual edit is not bounded by the declared availability, D06-12) and `placed` = the other submitted sessions, so the placement and the re-check cannot drift. The conflict **reason** is attributed with the same module's `overlaps` primitive (precedence `OVERLAPS_CLASS → OVERLAPS_BLOCKED_TIME → OVERLAPS_CONFIRMED_SESSION → OVERLAPS_PLANNED_SESSION`); the **verdict** comes from the shared helper and the **reason** from the shared primitive — there is still no second implementation of the subtraction.

## Acceptance criteria — outcome

| AC | Outcome | Evidence |
|---|---|---|
| **1** — pure function: same input → same output, no clock, no randomness, no database, no HTTP, no import from `@nestjs/*` or the Prisma client; "today" and every time window supplied by the caller | **Met.** `schedule` and `freeIntervals` read no clock and import only from `./types` and `./ordering`/`./intervals`; the domain folder has no `@nestjs` or `@prisma` import. | `scheduler.spec.ts` group 9 (byte-identical output across repeated calls; input not mutated); `pnpm --filter api lint` (no framework import in the domain folder); `pnpm --filter api typecheck`. |
| **2** — places work only inside the available windows (AC-E06-03); never inside a blocked window, a class window or a confirmed session (AC-E06-04); every placed session is inside a free interval of its date; the free intervals come from the **one** shared helper `freeIntervals(...)`, whose base is the **declared** available windows and whose required `placed` input carries the sessions already placed | **Met.** The placement calls `freeIntervals({ base: { kind: 'declared', windows }, …, placed: placedSessions })` for every date and only places into intervals returned by the helper. | `intervals.spec.ts` (declared base, empty → empty, whole-day base, subtraction order, `placed` subtraction, date filtering, merge); `scheduler.spec.ts` groups 2 and 3 (placement in the earliest free interval; non-overlap with blocked/class/busy and with an earlier session on the same day). |
| **3** — fully deterministic ordering (AC-E06-05, D06-22): **one** comparator, shared with the remaining-work read — on-time first by due date ascending, then overdue, then undated; inside a group priority descending, then `createdAt` ascending, then `assignmentId` ascending (total order) | **Met.** The engine calls `compareAssignments` from `ordering.ts` and defines no second ordering. | `scheduler.spec.ts` group 1 (priority/createdAt/id tie-break; overdue after on-time; identical order for reversed input); `ordering.spec.ts` (the shared comparator, 15 tests). |
| **4** — one assignment's remaining work may be placed in several sessions on several days (D06-2); each session's length is `min(sessionLengthMinutes, remainingWork, remainingDailyBudget)` (D06-20): the daily cap **truncates** a session, never skips it; a session shorter than `minSessionMinutes` is placed when the tail or the budget leaves no longer session possible; a session is never split across two intervals and never placed in an interval too short for it | **Met.** | `scheduler.spec.ts` group 4 (splitting; total placed = remaining); group 5 (default length; shortened tail; truncating cap; short session on tail; short session on budget; unused short interval; the worked example → 60 + 40, 100 placed, 100 deficit). |
| **5** — the total planned minutes on a day never exceeds `dailyCapMinutes`; the day's remaining budget is consumed in interval order; the minutes the cap truncates **were placed** and are therefore not a deficit | **Met.** `dailyBudget` starts at `dailyCapMinutes` and is decremented by each placed session's length; a session is only placed when `budget ≥ length`. | `scheduler.spec.ts` group 5 (the truncating cap; the worked example's placed/deficit minutes). |
| **6** — an on-time assignment is placed only on dates at or before its due date (both civil dates, `YYYY-MM-DD`); the work that does not fit before its deadline is reported as `INSUFFICIENT_TIME_BEFORE_DEADLINE` with its minutes (`remainingWork − placedMinutes`); an assignment with no free time at all as `NO_AVAILABLE_TIME`; an overdue assignment as `OVERDUE` with its full remaining minutes; work that is not placed but whose deadline lies beyond the window as `deferred`, not as a deficit | **Met.** The horizon filters `days` to `≤ dueDate` (overdue uses all days); civil dates are compared as strings. | `scheduler.spec.ts` group 6 (no session after the due date; civil-date horizon); group 7 (`INSUFFICIENT_TIME_BEFORE_DEADLINE` with the right minutes; `NO_AVAILABLE_TIME`; `OVERDUE` with the full remaining minutes; `deferred` for a beyond-window deadline). |
| **7** — a flagged assignment (no estimate, or no due date) is never placed and the engine never produces a session for it | **Met.** The engine's input is `SchedulableAssignment[]` (a flagged assignment is not a candidate); `classifyAssignments` (EP06B) is the only producer of schedulable assignments. The engine produces no session for an empty input. | `scheduler.spec.ts` group 8; `remaining-work.ts` (`classifyAssignments`); `remaining-work.spec.ts`. |
| **8** — the engine never changes an assignment's due date — it has no write path at all (AC-E06-08) | **Met.** `schedule` returns `{ sessions, results }` and mutates no input; there is no persistence, no `Assignment` write and no due-date field in the output. | `scheduler.spec.ts` group 9 (input not mutated); inspection of `scheduler.ts` (no write path). |
| **9** — the unit test matrix covers the ordering and every tie-break, the window placement, the splitting across days, the daily cap, the interval arithmetic, the conflict avoidance, the deficit categories and the flag refusal | **Met.** | `intervals.spec.ts` (24 tests) + `scheduler.spec.ts` (25 tests) — see the test groups. |

## Verification

All commands were run from the repository root `/Users/michaelrobert/Desktop/focus-app` against the working tree (HEAD `7007aa0`, the pre-existing unrelated `apps/api/tsconfig.json` left modified and unstaged).

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `pnpm --filter api test -- scheduler` | `/Users/michaelrobert/Desktop/focus-app` | **1 suite / 25 tests passed**, exit 0 | the engine matrix (TR-E06-03) — ordering, placement, window restriction, splitting, session length and the daily cap, the deadline horizon, the deficits, the flag refusal, purity. |
| `pnpm --filter api test -- intervals` | `/Users/michaelrobert/Desktop/focus-app` | **1 suite / 24 tests passed**, exit 0 | the interval algebra and the shared `freeIntervals(...)` helper — merge, subtract, `overlaps`, `minutesBetween`, both base modes, subtraction order, the `placed` input, date filtering, merge. |
| `pnpm --filter api test -- study-plans` | `/Users/michaelrobert/Desktop/focus-app` | **3 suites / 56 tests passed**, exit 0 | the existing module specs stay green (the engine is pure and changes no module). `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` supplied on the command line so the two integration suites executed against the real local database. |
| `pnpm --filter api test` | `/Users/michaelrobert/Desktop/focus-app` | **58 suites / 1266 tests passed**, exit 0 | the whole API suite with `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` (the baseline before this child was 56 suites / 1217 tests; the two new domain specs add 49 tests). |
| `pnpm --filter api typecheck` | `/Users/michaelrobert/Desktop/focus-app` | **exit 0** (`tsc --noEmit`, no output) | the committed tree. |
| `pnpm --filter api lint` | `/Users/michaelrobert/Desktop/focus-app` | **exit 0** (`eslint --max-warnings 0`, no output, no file rewritten) | the committed tree — the domain folder has no `@nestjs/*` or Prisma import. |
| `pnpm --filter api format` | `/Users/michaelrobert/Desktop/focus-app` | **exit 0** (all matched files use Prettier code style) | the committed tree. |

No `.env`/`.env.*` file was read at any point; the database URL was supplied on the command line. `prettier --check "src/**/*.ts"` is clean.

## Changed paths

**Application code**

- `apps/api/src/domain/study-planning/types.ts` (modified) — the shared types EP06C adds (`WeeklyWindow`, `DatedInterval`, `FreeIntervalBase`, `DeficitCategory`, `PlannedSessionProposal`, `AssignmentScheduleResult`, `SchedulerInput`, `SchedulerOutput`).
- `apps/api/src/domain/study-planning/intervals.ts` (new) — the interval algebra and the shared `freeIntervals(...)` helper.
- `apps/api/src/domain/study-planning/scheduler.ts` (new) — the deterministic placement engine.

**Tests**

- `apps/api/src/domain/study-planning/intervals.spec.ts` (new, 24 tests).
- `apps/api/src/domain/study-planning/scheduler.spec.ts` (new, 25 tests).

**Artifacts (the closeout commit)**

- `docs/stories/EP06/artifacts/EP06C/checkpoint.md` (new).
- `docs/stories/EP06/artifacts/EP06C/implementation.md` (new — this file).
- `docs/stories/EP06/README.md` (modified — the execution queue's EP06C and EP06D rows, `Active substory`, `Next substory` only).
- `docs/stories/EP06/EP06C-deterministic-scheduling-engine.md` (modified — the `**Status:**` line and the artifact pointers only).

**Not touched:** `apps/api/tsconfig.json` (a pre-existing, unrelated dirty path — left modified and unstaged), the `## Autopilot` section of the parent README (the coordinator's), the epic file, the decision register, the acceptance criteria, the AC/TR traceability, the shared contract, the correction log and the reviewer's `plan-review.md`. No schema, no migration, no endpoint, no frontend.

## Commit scope

- (code commit) — `feat(api): add the deterministic scheduling engine and conflict rules (EP06C)` (5 files: the application code and the tests). The pre-commit hook (`lint-staged` → eslint + prettier) ran on the staged files only; the unrelated dirty paths stayed unstaged and unmodified.
- The closeout commit (this record, the final checkpoint, the queue/status updates and the child's status line) — its hash is returned in the handoff (a commit's own hash is not written into its own record).

## Deviations

1. **`AssignmentScheduleResult` is added to `types.ts` even though the parent README names only `SchedulerInput`/`SchedulerOutput`/`PlannedSessionProposal`/`DeficitCategory`.** The child spec's implementation note 4 and output shape (`SchedulerOutput.results: AssignmentScheduleResult[]`) require a per-assignment result type, and the README's *The engine's rules* 7 names the per-assignment result fields. The type is named `AssignmentScheduleResult` (the child spec's own name). *Behavioural impact: none — it is the named shape the preview/deficit reporting depends on.*
2. **`minutesBetween` is polymorphic (two numbers or one interval).** The shared contract does not fix its signature; the child spec only requires "minutes for a same-day range". Accepting both forms keeps the helper usable by callers that hand it an interval and by callers that hand it two offsets. *Behavioural impact: none.*
3. **`mergeIntervals` / `subtractIntervals` group by date.** The interval algebra is dated, so intervals on different civil dates are never merged or subtracted across each other. This matches the helper's "every input is filtered by `date`" rule and prevents a free interval from leaking across days. *Behavioural impact: none — the helper filters by date first anyway.*
4. **The `NO_AVAILABLE_TIME` classification uses the free capacity measured *before* this assignment's own placements.** When an on-time assignment within its deadline has zero free minutes in its horizon it is reported as `NO_AVAILABLE_TIME` with its full remaining work; when it has free minutes but cannot place all of its work it is `INSUFFICIENT_TIME_BEFORE_DEADLINE`. A deferred (beyond-window) assignment with no free time is still reported as deferred, not as a deficit, because its deadline is beyond the window. *Behavioural impact: matches D06-11's three categories and the separate `deferred` list.*

## Findings and dispositions

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| F-C-1 | The child spec's implementation note 1 (the calendar's `dayOfWeekOf`) vs. D06-17/D06-18 (the engine is zone-free and does not change the calendar) | `apps/api/src/modules/calendar/calendar.service.ts` (read-only), `apps/api/src/domain/study-planning/scheduler.ts` | The calendar's `dayOfWeekOf` is module-private, so the engine cannot import it. | **resolved (interpretation, no behavioural deviation)** — the engine computes the weekday with `getUTCDay()` on the date's UTC midnight, the identical arithmetic the calendar uses, so a Sunday window day uses the Sunday windows. The duplication is recorded, not created silently. | implementer | `scheduler.spec.ts` (the horizon/civil-date cases) + the helper's date filtering in `intervals.spec.ts`. |
| F-C-2 | The child spec's test list ("leaves an interval too short unused") vs. the tail/budget rules | `apps/api/src/domain/study-planning/scheduler.spec.ts` | A 10-minute free interval cannot fit a 60-minute session even though the assignment's remaining work is 120 minutes; the engine leaves it unused. The category is `INSUFFICIENT_TIME_BEFORE_DEADLINE` (free capacity 10 > 0) rather than `NO_AVAILABLE_TIME`. | **resolved (test expectation, no code deviation)** — the test asserts `INSUFFICIENT_TIME_BEFORE_DEADLINE` with the full 120 minutes of deficit, matching the rule that `NO_AVAILABLE_TIME` applies only when the horizon has zero free minutes. | implementer | `scheduler.spec.ts` group 5 ("leaves an interval too short unused"). |
| F-C-3 | The test environment (`DATABASE_URL` unset in the shell) | the integration specs | Without `DATABASE_URL` every integration spec self-skips, so the study-plans evidence would be vacuous. | **resolved** — the integration runs supplied `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` on the command line; no `.env*` file was read. | implementer | the verification table above (the study-plans suites report 56 tests, not the self-skipped count). |
| F-C-4 | The parent README's top `**Status:**` line (observed while reconciling the queue) | `docs/stories/EP06/README.md:6` | The line still reads "EP06A is `Ready` … No implementation started", which EP06A's implementation already made stale. | **recorded — not fixed** (the delivery state assigns the stale **parent status line** to the reviewer's passing-review docs sync; the implementer's narrow exception covers the execution fields, the queue row and the active child's status). | **coordinator / reviewer** (EP06's combined review) | this record's note; the queue row and the child's `**Status:**` line are accurate. |

**Findings/deviations:** the four deviations above (the result type name, the polymorphic `minutesBetween`, the dated grouping, the `NO_AVAILABLE_TIME` measurement point) and the four findings F-C-1…F-C-4. No finding is open inside EP06C's scope: F-C-1 is resolved in code and documented, F-C-2 and F-C-3 are verification conditions, and F-C-4 is outside the implementer's write boundary.

## Notes for the next child (EP06D)

- `freeIntervals(...)` in `apps/api/src/domain/study-planning/intervals.ts` is the helper to call for the save-time re-check: `base: { kind: 'whole-day' }`, `placed` = the **other** submitted sessions on that date (the session under test is excluded from its own `placed` set, otherwise every submitted session would conflict with itself). The verdict comes from the helper; the reason comes from the same module's `overlaps` primitive in the precedence `OVERLAPS_CLASS → OVERLAPS_BLOCKED_TIME → OVERLAPS_CONFIRMED_SESSION → OVERLAPS_PLANNED_SESSION`.
- `schedule(input)` in `apps/api/src/domain/study-planning/scheduler.ts` is the engine to call for the preview: build `SchedulerInput` with the seven civil dates, the schedulable assignments (`classifyAssignments` → `schedulable`), the declared available windows, the blocked windows, the class meetings, the confirmed sessions (as `DatedInterval[]` in wall-clock minutes), and the read study preferences. The output's `sessions` are the proposed sessions; `results` carry the deficit/deferred minutes and categories for the preview's warnings.
- `WeeklyWindow` is `{ dayOfWeek, startMinute, endMinute }` (Sunday = 0); `DatedInterval` is `{ date, startMinute, endMinute }`. The service converts the stored `HH:mm` strings to minute offsets and the confirmed sessions to wall-clock intervals before calling the engine (D06-17).
- The engine's due-date input is a civil `YYYY-MM-DD` **string** (D06-24); the service converts `Assignment.dueDate` once, with `toCivilDate` (`apps/api/src/common/lib/civil-date.ts`).
- `compareAssignments(a, b, today)` (`apps/api/src/domain/study-planning/ordering.ts`) is the comparator to reuse for ordering the remaining-work read (already wired in EP06B) and any preview ordering.