# EP15 shared contracts, invariants and code baseline

Field names and semantics here are the stable seam between EP15 children; the live plan is [README.md](./README.md). Presentation belongs to the refiner passes (D15-16). All date work uses EP12A's civil-date helpers (`apps/api/src/common/lib/civil-date.ts`, `calendar-date.ts`); the engine stays in "civil date + minute of day".

## Data model (EP15A creates and copies; EP15I drops)

```prisma
enum ScheduleBlockKind { BUSY STUDY }

// Per-weekday wake/sleep (D15-1, D15-4, D15-13). Missing rows read as the default 08:00–23:00.
model DayBounds {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dayOfWeek Int      // 0–6, Sunday = 0 (schema convention)
  wakeTime  String   // HH:mm, 00:00–23:59
  sleepTime String   // HH:mm, strictly after wakeTime; "24:00" allowed (midnight end, D15-4)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([userId, dayOfWeek])
  @@map("day_bounds")
}

// A student-created block: BUSY (event) or STUDY (study block). One-off or weekly (D15-5).
model ScheduleBlock {
  id        String            @id @default(uuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      ScheduleBlockKind
  title     String?           // ≤ 60 chars after trim; null → UI shows "Busy" / "Study"
  courseId  String?           // STUDY only; the student's own course
  course    Course?           @relation(fields: [courseId], references: [id], onDelete: SetNull)
  energy    EnergyLevel       @default(NORMAL) // STUDY only; BUSY rows stay NORMAL and are never read
  startDate DateTime          @db.Date // one-off: the date; weekly: the first date of the series
  endDate   DateTime?         @db.Date // weekly only; null = open-ended
  weekdays  Int?              // bitmask, bit n = weekday n (Sunday = bit 0); null = one-off
  startTime String            // HH:mm
  endTime   String            // HH:mm, strictly after startTime; "24:00" allowed
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  exceptions ScheduleBlockException[]
  @@index([userId, startDate])
  @@map("schedule_blocks")
}

// A cancelled occurrence of a weekly block (D15-5). Ownership through the block (PlannedSession precedent).
model ScheduleBlockException {
  id      String        @id @default(uuid())
  blockId String
  block   ScheduleBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
  date    DateTime      @db.Date
  @@unique([blockId, date])
  @@map("schedule_block_exceptions")
}
```

`User` gains `dayBounds DayBounds[]` and `scheduleBlocks ScheduleBlock[]`; `Course` gains `studyBlocks ScheduleBlock[]`.

**Migration 1 (EP15A, `20261117120000_schedule_blocks_and_day_bounds` — applied 2026-11-17; the rollback below is documented in its header):** creates the three tables and copies every `availability_slots` row into `schedule_blocks` — `kind` = `STUDY` when `isAvailable` else `BUSY`; `energy` kept for STUDY, `NORMAL` for BUSY; `weekdays` = `1 << dayOfWeek`; `startDate` = `createdAt::date` (D-A2 — cast in the database session zone, UTC, not the profile zone; accepted: at worst one civil day late for a slot created near local midnight, visible only on the migration day — R-EP15-08); `title` null; times verbatim; `createdAt`/`updatedAt` carried over; the copy is the single `INSERT … SELECT` between the `-- copy:start` / `-- copy:end` lines, which the gated round-trip spec executes verbatim. `availability_slots` is left in place (the old API keeps serving it until EP15I). **Rollback of Migration 1:** `DROP TABLE schedule_block_exceptions, schedule_blocks, day_bounds; DROP TYPE "ScheduleBlockKind";` — a full restore, because `availability_slots` was never modified (R-EP15-05). **Migration 2 (EP15I, `…_drop_availability_slots`):** drops `availability_slots` and the `AvailabilitySlot` model/relation. No other table changes. **Migration 2 is irreversible by design** (R-EP15-05): one-off blocks, multi-weekday series and exceptions have no slot representation, so no reverse copy restores the table faithfully and none is provided. Stance: the deploy that applies Migration 2 takes a pre-drop backup (`pg_dump -t availability_slots`) first; recovery is restore-from-backup, never a reverse migration. EP15A-AC1 and EP15I-AC4 reference these statements.

## Recurrence semantics (pure domain `apps/api/src/domain/schedule/`, EP15A)

- A block has an **occurrence** on civil date `d` iff — one-off: `d === startDate`; weekly: `startDate ≤ d ≤ endDate` (when `endDate` is set), the bit for `dayOfWeekOf(d)` is set in `weekdays`, and no exception row has `date === d`.
- `expandBlocks(blocks, from, to): Occurrence[]` — `Occurrence = { blockId, kind, title, courseId, energy, date, startMinute, endMinute, recurring }`, sorted by `date`, `startMinute`, `blockId`. Times are wall-clock minutes of the civil day (`"24:00"` → 1440); a DST transition never shifts them (D404-4 precedent). Pure: no clock, no I/O.
- `readDayBounds(rows): { configured: boolean, days: DayBound[7] }` — a missing weekday reads as the default `08:00`–`23:00` (D15-13); an invalid stored pair also reads as the default. `configured` is `true` when all seven rows exist.
- `dayBoundsFor(days, date): DatedInterval` — `[wakeMinute, sleepMinute)` on that date.

## API (EP15B; all routes behind the global JWT guard, `userId` from the principal, unknown body fields 400)

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /schedule/day-bounds` | — | 200 `{ configured, days: [{ dayOfWeek, wakeTime, sleepTime }] }` (seven entries, 0…6) | 401 |
| `PUT /schedule/day-bounds` | `{ days: [ exactly seven { dayOfWeek, wakeTime, sleepTime }, one per weekday ] }` | 200 same shape, `configured: true` | 400 field-level (`days` must hold each weekday once; `HH:mm`; `sleepTime` after `wakeTime`; `sleepTime ≤ 24:00`; `wakeTime < 24:00`); 401 |
| `GET /schedule/blocks` | — | 200 `[ScheduleBlock]` ordered `startDate`, `startTime`, `id` | 401 |
| `POST /schedule/blocks` | `{ kind, title?, courseId?, energy?, startDate, endDate?, weekdays?, startTime, endTime }` | 201 `ScheduleBlock` | 400 field-level; 404 uniform when `courseId` is not the student's course; 401 |
| `PATCH /schedule/blocks/:id` | any subset of the POST fields except `kind`, plus `effectiveFrom?` (weekly only) | 200 the block that now holds the chosen date | 400 (empty body; `kind` present; `effectiveFrom` on a one-off or after `endDate`; merged-value rules); 404 uniform; 401 |
| `DELETE /schedule/blocks/:id?from=YYYY-MM-DD` | — | 204 | 400 (`from` malformed); 404 uniform; 401 |
| `DELETE /schedule/blocks/:id/occurrences/:date` | — | 204 (idempotent) | 400 (`date` is not an occurrence of the block); 404 uniform; 401 |

**`ScheduleBlock` response:** `{ id, kind, title, courseId, energy, startDate, endDate, weekdays: number[] | null, startTime, endTime, createdAt, updatedAt }` — `weekdays` is an array of weekday numbers in the API (ascending, 0…6); the bitmask is storage only. `userId` is never exposed.

**Field rules (backend authoritative; the client mirrors them):** `kind` ∈ `BUSY | STUDY`, immutable after create (D-B1); `title` trimmed, ≤ 60, empty → `null`; `courseId` and `energy` only when `kind === 'STUDY'` (400 `applies to study blocks only`); `energy` ∈ `HIGH | NORMAL | LOW`; `weekdays` 1–7 unique integers 0…6 (weekly) or omitted/`null` (one-off); `endDate` requires `weekdays` and is `≥ startDate`; dates strict `YYYY-MM-DD`; `startTime < endTime`, `startTime < 24:00`, `endTime ≤ 24:00`.

**PATCH semantics (D15-5, D-B2):** a one-off block, a body without `effectiveFrom`, or `effectiveFrom ≤ startDate` → update the row in place (validation on the merged values). Otherwise, in one transaction: the original row's `endDate := effectiveFrom − 1 day`; a new row is created from the merged values with `startDate := effectiveFrom` (and `endDate` = the patched value, else the original); exception rows dated `≥ effectiveFrom` move to the new row. The response is the new row. **Weekly → one-off (D-G10 / R-EP15-10):** a patch carrying `weekdays: null` on a weekly block must carry `effectiveFrom` (400 otherwise) and `endDate: null` explicitly (an omitted `endDate` keeps the original value, which the one-off rule rejects with a 400); it follows the same split rule and its successor is a one-off whose `startDate` is `effectiveFrom`. **DELETE `?from=`:** a one-off, no `from`, or `from ≤ startDate` → delete the row (exceptions cascade); otherwise `endDate := from − 1 day` and exceptions `≥ from` are deleted; `from` after `endDate` is a no-op 204. **Occurrence cancel:** on a weekly block inserts the exception row (idempotent); on a one-off whose `startDate === date` deletes the row; any other `date` → 400.

Ownership: every read/write carries the principal's `userId` (`where: { id, userId }` or `block: { userId }` for exceptions); missing, foreign and malformed ids are the uniform 404 `Resource not found`.

**As implemented (EP15B, 2026-11-17):** `PUT /schedule/day-bounds` entry errors are keyed `days[<i>].<field>` (plus `days` for the one-per-weekday rule; unknown keys inside an entry are rejected like top-level ones). On `PATCH`, `title`, `courseId`, `endDate` and `weekdays` take an explicit `null` as a value; `null` on `energy`, `startDate`, `startTime`, `endTime` or `effectiveFrom` reads as omitted (a body holding only those is the empty-body 400). A split whose successor is a **one-off** (`weekdays: null`) drops the exceptions dated `≥ effectiveFrom` instead of moving them — a one-off has no occurrences to cancel, so a moved row would be unreachable. `kind` in a PATCH body is a 400 with the message `kind cannot be changed after a block is created; delete the block and add it again` (D-B1). `DELETE …/occurrences/:date` with a malformed `date`, and `?from=` malformed, are field-level 400s (`date` / `from`) checked before the ownership lookup; the uniform 404 still wins for a foreign block with a well-formed date.

## Calendar read model (`GET /calendar/events?from&to`, EP15D)

```ts
interface ListResult {
  timeZone: string; today: string; from: string; to: string;
  days: { date: string; wakeTime: string; sleepTime: string; free: { startTime: string; endTime: string }[] }[]; // one per date in range, ascending
  events: CalendarEvent[];
}
type CalendarEventType = 'CLASS' | 'ASSIGNMENT_DEADLINE' | 'EXAM_DEADLINE' | 'STUDY_SESSION' | 'PLANNED_SESSION' | 'EVENT' | 'STUDY_BLOCK';
// AVAILABILITY and BLOCKED_TIME are removed. CalendarEvent gains three nullable fields:
//   blockId: string | null; recurring: boolean | null; energy: 'HIGH' | 'NORMAL' | 'LOW' | null
```

- `EVENT`: id `event:<blockId>:<date>`, `title` = block title ?? `"Busy"`, `subtitle` null, `link` null, `blockId`, `recurring`.
- `STUDY_BLOCK`: id `study-block:<blockId>:<date>`, `title` = block title ?? `"Study"`, `subtitle` = course code or null, `courseId`/`courseName`/`courseColor` from the tied course, `energy`, `blockId`, `recurring`.
- `days[].free` = `freeIntervals({ date, base: { kind: 'declared', windows: [dayBoundsFor(date)] }, blocked: EVENT occurrences, classes, busy: confirmed sessions + COMPLETED/locked planned rows, placed: current FIXED planned sessions (SCHEDULED | IN_PROGRESS) })`, rendered `HH:mm` (1440 → `"24:00"`). Flex sessions occupy no clock time and are not subtracted (D-D1). Pieces are returned raw; display thresholds are the refiner's.
- `today`, `from`, `to` keep EP04's meaning (D404-2/3). The client derives the visible week and its headers from `today`/`from`/`to` by civil-date string arithmetic only (AC-E15-09).

**The shared gathering seam (EP15D):** one service-level helper `scheduleInputs(userId, from, to)` returns `{ timeZone, dayBounds: DatedInterval[], blocked: DatedInterval[], preferred: PreferredInterval[], classes: WeeklyWindow[], busy: ReplanBusyInterval[] }` and is the only place `DayBounds`, `ScheduleBlock`, `ClassMeeting`, `StudySession` and preserved `PlannedSession` rows are turned into intervals. `calendar.service.list` and `study-plans.service.gatherPlanData` (hence preview, save, catch-up and `today`) both call it — AC-E15-08's invariant holds by construction and is pinned by V-15-1.

## Engine input (EP15C, pure domain `apps/api/src/domain/study-planning/`)

```ts
type PreferredInterval = DatedInterval & { courseId?: string | null }; // energy as on DatedInterval

type SchedulerInput = {
  days: string[];
  assignments: SchedulableAssignment[];   // gains courseId?: string | null (pass-through like assignmentType)
  dayBounds: DatedInterval[];             // one per day in `days` — replaces `availability: WeeklyWindow[]`
  blocked: DatedInterval[];               // dated (was WeeklyWindow[]) — events after expansion + exceptions
  classes: WeeklyWindow[];                // unchanged
  busy: DatedInterval[];                  // unchanged
  preferred: PreferredInterval[];         // NEW — study blocks after expansion
  preferences: StudyPreferences;
};
```

Rules (all deterministic; added on top of EP13F/EP13G/EP13J/EP14E, which are unchanged — the current ranking hook is `byEnergyPreference(free, demanding, minBlock)` with EP14E's day-centric light-work guard, and `isDemanding` honours `Assignment.hard`; R-EP15-01):

1. **Base = day bounds.** The day's free intervals are `freeIntervals({ base: { kind: 'declared', windows: dayBounds-for-day }, blocked, classes, busy, placed })`. A zero-minute day still yields `NO_AVAILABLE_TIME`.
2. **Preferred pieces.** Free intervals are intersected with `preferred`; a piece inside a preferred interval carries `{ energy: block.energy, preferredKey: blockId, courseId }`, a piece outside carries no key and energy `NORMAL`. `mergeIntervals` merges only pieces with equal energy **and** equal `preferredKey` (extends EP13J D-J2). **Overlapping study blocks** (R-EP15-04) resolve exactly as D-J2 resolves overlapping energy windows: the block with the earlier `startMinute` keeps its whole span (tie: the lexically smaller `blockId`); the later block's remainder, if any, keeps its own key. The rule is total, so pieces are stable across runs.
3. **Gap ranking** per day, in two tiers (R-EP15-01): the **preferred tier** (pieces with a `preferredKey`) is scanned before the non-preferred tier; **within each tier** EP14E's `byEnergyPreference(free, demanding, minBlock)` applies unchanged — energy order per D-J3 and the light-work guard with its anchor (earliest NORMAL gap ≥ `minBlock`) computed **within that tier**; earliest-first inside a level. So for light work a LOW preferred evening piece still wins over a NORMAL non-preferred morning gap (the student asked for that block), while inside the non-preferred tier the guard keeps easy work from drifting late exactly as EP14E-AC3 specifies. Critical work (EP13F rule 3) ignores energy but still fills the preferred tier first. "Fills study blocks first" (AC-E15-06) is therefore **per day**: placement is day-centric (EP13F), so a study block on Thursday never pulls work away from a free Tuesday (R-EP15-16).
4. **Course tie.** Inside a piece whose `courseId` is set, the round-robin candidate order places that course's assignments first (comparator order within), then the rest; feasibility still wins.
5. **Identity.** With `preferred` empty and the former available windows expressed as bounds, output is byte-identical to the **EP14E** engine, with `hard` flags present or not (EP15C-AC4) — the safety net for every existing test fixture. **Adapter rule** (R-EP15-07): a weekday with several former windows becomes `dayBounds` = their hull `[min start, max end)` plus the gaps between them appended to `blocked`, which reproduces the old free intervals exactly.
6. Budgets, density, breaks, min/max, anchor partition and `windowHint` never read `preferred`.

**As implemented (EP15C, 2026-11-17):** `preferredPieces(free, preferred, date)` in `intervals.ts` is the rule-2 intersection; `mergeIntervals` keys on (energy, `preferredKey`) and, for two **preferred** blocks that start together, the lexically smaller key wins outright (energy decides ties only among unkeyed/energy windows, the EP13J rule). Rule 3's course tie works by turn-swapping inside the rotation: when the gap the current candidate would take is tied to another candidate's course, that candidate commits first (comparator order among several) and the current one retries on what is left; critical work never defers. The interim adapter (`legacy-windows.ts`) hands the service's former available windows over as **both** the hull bounds + gap blocks **and** `preferred` intervals carrying their energy tag (one tier), not `preferred: []` as the Known-windows note said — `preferred: []` would have dropped EP13J/EP14E's slot-energy placement for the interim and failed `study-plans-energy.service.spec.ts` (F-EP15C-01). EP15D deletes the adapter. Identity (rule 5) is pinned against a frozen EP14E output snapshot (`identity.snapshot.json`, 15 fixtures) rather than a live copy of the old engine.

`conflicts.ts` and the save-time re-check keep the `whole-day` base (D15-8). EP08's `replan` passes the new input through unchanged.

## Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A "just this day" edit never loses the occurrence | The one-off create succeeds and the occurrence cancel then fails (network loss, 404) — or the reverse order fails after cancelling | EP15G-AC2 orders **create first, cancel second**; a failed create changes nothing (error in the sheet); a failed cancel leaves a visible duplicate for that day with an announcement naming the next step — never a hole | EP15G (TR-E15-07 partial-failure case) |
| Overlapping study blocks never make placement order-dependent | Two STUDY blocks over the same hour with different energy/course | Rule 2's D-J2 resolution (earlier start keeps its span, tie by `blockId`) | EP15C (TR-E15-03 overlap test, V-15-3) |
| A student never reads or writes another student's blocks, exceptions or bounds | `PATCH /schedule/blocks/<other's id>`; `DELETE …/occurrences/<date>` on a foreign block | Every query carries `userId` (direct, or `block: { userId }`); the loser gets the uniform 404 with no write | EP15B (TR-E15-02 ownership matrix) |
| A study block cannot be tied to a course the student does not own | `POST /schedule/blocks { courseId: <foreign> }` | Scoped `course.findFirst({ id, userId })` before the write; miss → uniform 404 | EP15B |
| The calendar's free time equals the planner's free time | A cancelled occurrence or a DST day computed differently on the two paths | One `scheduleInputs` helper + one `freeIntervals` call; V-15-1 compares both outputs on one fixture | EP15D (TR-E15-04) |
| The planner never places outside day bounds or over busy time | A one-off event on a date whose weekday has none; a 24:00 sleep value | `blocked` is dated after expansion; base is the day's bounds; `1440` end is a legal half-open bound | EP15C (TR-E15-03), EP15D |
| Migration loses no availability data | A slot with `energy HIGH` or `dayOfWeek 0` | Row-count and field-equality check on a seeded database | EP15A (TR-E15-01, V-15-2) |
| Determinism | Two runs with events + study blocks | Total tie-breaks (`date`, `startMinute`, `blockId`); byte-identity test | EP15C (V-15-3) |
| No colour-only meaning; keyboard parity for every grid action | A pointer-only drag-create | Form path for every action (EP15G) precedes the pointer path (EP15H); text/icon kind markers | EP15E/G/H (TR-E15-05…07), EP15J axe gate |

## Known windows between sequential children (R-EP15-02)

- **Typecheck:** EP15C changes `SchedulerInput`; EP15C itself ships a thin adapter inside `study-plans.service.ts` (the hull-plus-gaps rule above, `blocked` dated through the existing per-date loops, `preferred: []`) so `gatherPlanData`, `save` (`study-plans.service.ts:1634–1644` dating loop) and `catchUpConfirm` (`:1409–1419`) compile and every suite stays green; EP15D replaces the adapter with the seam. No red window.
- **E2E:** `apps/web/e2e/calendar.spec.ts:180–215` asserts availability slots appear as `AVAILABILITY`/`BLOCKED_TIME` events; EP15D removes those assertions (test-only) with a pointer to EP15J, which rewrites the spec. `calendar.spec.ts:22` expects "Manage availability"; EP15I removes it together with the links (EP15I-AC4).
- **E2E seeding (R-EP15-12):** `apps/web/e2e/helpers.ts:173–191` (`createAvailabilitySlotViaApi` → `POST /api/availability-slots`) seeds availability for the `adaptive-scheduling`, `catch-up` and `study-plan` specs; from EP15D the planner no longer reads slots, so those journeys would plan against the default bounds — EP15D re-points the helper to `PUT /schedule/day-bounds` (and, where a journey needs a narrow window, a `BUSY` block via `POST /schedule/blocks`) in the same commit. `adaptive-scheduling.spec.ts:445–449` runs an axe stop on `/availability`; EP15I retargets it to `/calendar` when it deletes the page. No red window is left unowned.

## Code baseline

See the epic's [Inspected baseline](../../epics/EP15-schedule-and-availability-redesign.md#inspected-baseline-2026-11-16-not-proposed). Unverified (disclosed): the exact `WeekGrid` component shape on the plan page (`features/study-plan/ui/WeekGrid.tsx`, read at summary level); Playwright helpers for seeding (`apps/web/e2e/helpers.ts`, not read line by line).
