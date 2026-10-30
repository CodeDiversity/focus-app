# EP06 Story Breakdown — Study Planning & Scheduling

**Epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Milestone:** M3 (Study planning and focus sessions)
**Epic dependency:** EP03 (Assignment & Task Management) — complete. EP04 (Academic Calendar & Availability) — complete. Integrates with EP07 (Focus Sessions & Time Tracking — planned, not implemented) and EP05 (Student Dashboard — complete).
**Status:** Planning — breakdown complete (2026-10-30). EP06A–EP06D and EP06H are `Queued`; EP06E, EP06F and EP06G are `Needs refinement` pending their `ui-refiner` pass (D06-15). No implementation started.
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP06/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP06A/`, `./artifacts/EP06B/`, `./artifacts/EP06C/`, `./artifacts/EP06D/`, `./artifacts/EP06E/`, `./artifacts/EP06F/`, `./artifacts/EP06G/`, `./artifacts/EP06H/`, plus `./artifacts/EP06/` for the parent implementation index, combined review and walkthrough.

**Active substory:** None.

**Next substory:** EP06A — implement (backend study-preferences shape and API).

**Implementation owner:** `implementer`, one sequential writer across all layers (the Backend/Frontend/Integration labels are scope, not concurrent roles).

**Final review:** one combined review for the EP06 parent review unit — all eight children — after EP06H is implemented. Reviewer artifacts: `./artifacts/EP06/review.md` + `./artifacts/EP06/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP06A](./EP06A-study-preferences-shape-and-api.md) | Queued | EP03/EP04 complete. D06-1…D06-16 recorded in the decision register below. | Implement EP06A: the `studyDefaults` shape, validation and `GET/PUT /study-preferences` | `./artifacts/EP06A/` (pending) |
| [EP06B](./EP06B-remaining-work-calculation-and-read-api.md) | Queued | EP06A implemented (the `StudyPreferences` type is shared with the engine). No dependency on EP07 — the confirmed-time aggregation reads `StudySession` directly (D06-6). | Implement EP06B: the remaining-work calculation and `GET /study-plans/remaining-work` | `./artifacts/EP06B/` (pending) |
| [EP06C](./EP06C-deterministic-scheduling-engine.md) | Queued | EP06A + EP06B implemented (the engine consumes the shared `StudyPreferences` type and the schedulable-assignment classification). | Implement EP06C: the pure scheduling engine and the conflict rules | `./artifacts/EP06C/` (pending) |
| [EP06D](./EP06D-study-plan-persistence-and-preview-save-api.md) | Queued | EP06A + EP06B + EP06C implemented. EP03/EP04 complete. | Implement EP06D: the migration, the plan service and the preview/save/read API | `./artifacts/EP06D/` (pending) |
| [EP06E](./EP06E-study-preferences-ui.md) | Needs refinement | EP06A implemented. `ui-refiner` pass required (D06-15). | `ui-refiner` pass on EP06E, then implement | `./artifacts/EP06E/` (pending) |
| [EP06F](./EP06F-study-plan-page-preview-edit-and-save.md) | Needs refinement | EP06D implemented (the preview/save/read API). `ui-refiner` pass required (D06-15). | `ui-refiner` pass on EP06F, then implement | `./artifacts/EP06F/` (pending) |
| [EP06G](./EP06G-remaining-work-and-deficit-warnings-ui.md) | Needs refinement | EP06B implemented (the remaining-work read) and EP06F implemented (the plan page hosts the sections). `ui-refiner` pass required (D06-15). | `ui-refiner` pass on EP06G, then implement | `./artifacts/EP06G/` (pending) |
| [EP06H](./EP06H-cross-layer-e2e-and-parent-index.md) | Queued | EP06A–EP06G implemented; the EP09 self-contained E2E stack must be runnable. | Implement EP06H: cross-layer E2E + the regression sweep + the parent index | `./artifacts/EP06H/` (pending) |

Sequence (one writer): EP06A → EP06B → EP06C → EP06D → EP06E → EP06F → EP06G → EP06H. EP06A/EP06B/EP06C/EP06D are the contract and persistence spine; the three frontend children consume it; EP06H verifies the whole stack and owns the parent index.

**Do not start EP06E, EP06F or EP06G before their `ui-refiner` pass** — the plan page's layout and information hierarchy, the move/resize/delete interaction model for a proposed session, the remaining-work row design, the warning copy, the empty/loading/error states, the responsive behavior and the keyboard behavior are deliberately undecided (D06-15). EP06A, EP06B, EP06C, EP06D and EP06H are backend/domain/integration work and need no `ui-refiner` pass.

**EP06 is not independently releasable before its combined review.** EP06D's API without the plan page, and the plan page without EP06H's cross-layer proof, are intermediate states inside one sequential implementation. The combined EP06 review is the gate.

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP06A](./EP06A-study-preferences-shape-and-api.md) | 1. Implement study preferences and session-duration settings (backend half) | Backend | Pending creation |
| [EP06B](./EP06B-remaining-work-calculation-and-read-api.md) | 2. Implement remaining-work calculations (backend half) | Backend | Pending creation |
| [EP06C](./EP06C-deterministic-scheduling-engine.md) | 3. Build the deterministic scheduling engine + 4. Implement calendar conflict detection (the engine's placement primitives) | Backend (pure domain module) | Pending creation |
| [EP06D](./EP06D-study-plan-persistence-and-preview-save-api.md) | 5. Build study-plan preview, editing, and confirmation (backend half) | Backend | Pending creation |
| [EP06E](./EP06E-study-preferences-ui.md) | 1. Implement study preferences and session-duration settings (frontend half) | Frontend | Pending creation |
| [EP06F](./EP06F-study-plan-page-preview-edit-and-save.md) | 5. Build study-plan preview, editing, and confirmation (frontend half) | Frontend | Pending creation |
| [EP06G](./EP06G-remaining-work-and-deficit-warnings-ui.md) | 2. Implement remaining-work calculations (frontend half) + 6. Implement workload deficit warnings (frontend half) | Frontend | Pending creation |
| [EP06H](./EP06H-cross-layer-e2e-and-parent-index.md) | Cross-layer verification of all six proposed stories + the EP06 parent index | Integration | Pending creation |

All six of the epic's proposed stories are covered. The split follows the epic's own seams: the deterministic core (a pure domain module), the HTTP/persistence spine, the student-facing surfaces, plus one integration child.

**Why conflict detection is merged into the engine (EP06C) rather than split out.** The epic's proposed story 4 ("calendar conflict detection") is not an independently testable outcome of its own: the conflict rules *are* the engine's placement primitives (the free-interval computation), and the same rules are re-used verbatim by the save-time re-check in EP06D. Splitting them would create a pure-function-to-pure-function dependency with no outcome that can be verified without the engine anyway. The rules are still specified, tested and owned as first-class content of EP06C (the conflict rules section of the shared contract below, TR-E06-03, TR-E06-04).

**Why a separate integration child exists (not a padded verification child).** EP06H adds a **new Playwright spec suite** against the self-contained EP09 stack (`apps/web/e2e/study-plan.spec.ts`) that must pin a *date-dependent* 7-day rolling plan — the fixture must create availability, classes and assignments whose due dates land inside the generated window, and the assertions must be made against the window the server computed, not against wall-clock dates — plus the **parent implementation index**. That is real integration implementation and a substantial new test harness, not routine verification.

## Epic acceptance criteria — ownership

Original wording from [EP06](../../epics/EP06-study-planning-and-scheduling.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can set preferred study-session durations. | AC-E06-01 | **EP06A** (the `studyDefaults` shape, validation, `GET/PUT /study-preferences`), **EP06E** (the preferences surface). |
| The system calculates remaining estimated work from assignment estimates and confirmed study time. | AC-E06-02 | **EP06B** (the remaining-work calculation and its read API; the confirmed-time aggregation), **EP06G** (the remaining-work surface). |
| The scheduler places work only inside available study windows. | AC-E06-03 | **EP06C** (the engine's window placement), **EP06D** (the service that supplies the windows and persists the result). |
| Proposed sessions do not overlap classes, blocked time, or existing confirmed sessions. | AC-E06-04 | **EP06C** (the conflict rules), **EP06D** (the save-time re-check). |
| The scheduler prioritizes upcoming deadlines with deterministic tie-breaking rules. | AC-E06-05 | **EP06C** (the ordering and tie-breaks), **EP06D** (the service that feeds the engine). |
| Students can review and edit proposed sessions before saving. | AC-E06-06 | **EP06D** (the preview, the save with the conflict re-check), **EP06F** (the preview, the edit interactions, the save). |
| The system reports work that cannot fit before a deadline. | AC-E06-07 | **EP06C** (the capacity/deficit computation), **EP06D** (the warnings in the preview payload), **EP06G** (the warnings surface). |
| The scheduler does not change assignment due dates. | AC-E06-08 | **EP06C** (the engine is pure — it has no write path), **EP06D** (the service writes only plan rows; the test asserts the assignment rows are unchanged). |
| Assignments missing necessary scheduling information are flagged rather than silently scheduled. | AC-E06-09 | **EP06B** (the flagging of a missing estimate / due date), **EP06C** (the engine refuses to schedule a flagged assignment), **EP06G** (the flag is shown). |

## Requirement and test traceability

The epic defines no test requirements (TR-*); stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| AC-E06-01 | Preferred study-session durations | EP06A, EP06E |
| AC-E06-02 | Remaining estimated work from estimates and confirmed study time | EP06B, EP06G |
| AC-E06-03 | Placement only inside available study windows | EP06C, EP06D |
| AC-E06-04 | No overlap with classes, blocked time or confirmed sessions | EP06C, EP06D |
| AC-E06-05 | Deadline priority with deterministic tie-breaking | EP06C, EP06D |
| AC-E06-06 | Review and edit proposed sessions before saving | EP06D, EP06F |
| AC-E06-07 | Report work that cannot fit before a deadline | EP06C, EP06D, EP06G |
| AC-E06-08 | The scheduler never changes assignment due dates | EP06C, EP06D |
| AC-E06-09 | Flag assignments missing scheduling information | EP06B, EP06C, EP06G |
| TR-E06-01 | Study-preferences API tests: the bounds matrix, the cross-field rules, the merge-on-partial-update rule, the defensive read of a missing/partial/malformed bag, the bag's other keys surviving, ownership scoping, uniform 404/401 | EP06A |
| TR-E06-02 | Remaining-work tests: the estimate→minutes conversion, the confirmed-minutes subtraction, the unattributed total, the flagged classifications, the unfinished-status filter, the ownership-scoped `StudySession` aggregation (D06-6), the uniform 404 | EP06B |
| TR-E06-03 | Engine unit tests: the ordering and every tie-break, the window placement, the splitting of one assignment across several days (D06-2), the daily cap, the interval arithmetic (merge/subtract/overlap), the conflict avoidance, the deficit categories, the flag refusal, the purity of the engine (no writes, no clock, no randomness) | EP06C |
| TR-E06-04 | Plan API tests: the preview is side-effect free, the save is atomic and replaces the window, the conflict re-check on save (409) with per-session reasons, the malformed-session matrix (400), the migration's shape and reversibility, the uniform 404, the assignment rows unchanged after a save (AC-E06-08) | EP06D |
| TR-E06-05 | Preferences-surface tests: the four fields, the client-side bounds mirror, the save round-trip, the loading/error/success states, the keyboard operability | EP06E |
| TR-E06-06 | Plan-page tests: generate → preview → move → resize → delete → save, the saved-plan view, the empty/loading/error states, the keyboard operability of the editing controls, the narrow-screen layout | EP06F |
| TR-E06-07 | Remaining-work and warning-surface tests: the per-assignment row, the remaining-hours formatting, the flagged marker, the warning categories and their copy, the empty states | EP06G |
| TR-E06-08 | Cross-layer E2E against the real stack: the whole generate→edit→save journey, the deficit warning appearing, the saved plan surviving a reload, the API and web suites and the pre-existing E2E specs staying green | EP06H |
| TR-E06-09 | Manual accessibility pass recorded for the plan surface (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) | EP06F, EP06G (recorded), EP06H (collected for the combined review) |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP06A (the bounds + cross-field rules), EP06B (the query validation), EP06D (the session matrix, the range caps), EP06E (the client-side mirror), EP06F (the edit inputs), EP06G (the read inputs) |
| 3 student data scoping | EP06A, EP06B, EP06D, EP06H |
| 4 actionable API errors | EP06A, EP06B, EP06D, EP06E, EP06F, EP06G |
| 5 loading, empty, and error states | EP06E, EP06F, EP06G |
| 6 keyboard accessibility | EP06E, EP06F, EP06G |
| 7 responsive layouts | EP06E, EP06F, EP06G |
| 8 automated tests | All children (TR-E06-01…08); TR-E06-09 is a recorded manual pass owned by EP06F/EP06G with EP06H collecting the evidence |
| 9 API/migration documentation | EP06A (the preference contract), EP06B (the read contract), EP06D (the migration, its guard and its rollback, the plan contract), EP06H (the parent index) |
| 10 integrated review | EP06 parent review unit (all eight children) |
| 11 reviewer walkthrough | Reviewer, once for the EP06 parent review unit |

## Shared API and data contract

This is the seam between EP06A/EP06B/EP06C/EP06D (which implement it) and EP06E/EP06F/EP06G (which consume it) and EP06H (which verifies it end to end). Field names, bounds and status codes below are the stable part; the presentation is settled by the `ui-refiner` pass (D06-15).

### Data model (EP06D — one migration)

`StudyPlan` is kept as the per-day container (D06-3: the rolling week is seven per-day rows, `@@unique([userId, date])`). The legacy `ScheduledTask` model is reshaped into an **assignment-linked planned session** (D06-1, D06-2) and renamed, because "task" is materially wrong once the row references an `Assignment` and no longer references a `Task`:

```prisma
model StudyPlan {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        DateTime @db.Date
  targetHours Float    // Target study hours for this day
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sessions PlannedSession[]

  @@unique([userId, date])
  @@map("study_plans")
}

model PlannedSession {
  id          String   @id @default(uuid())
  studyPlanId String
  studyPlan   StudyPlan @relation(fields: [studyPlanId], references: [id], onDelete: Cascade)
  assignmentId String
  assignment  Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  startTime   DateTime
  endTime     DateTime
  durationMinutes Int
  status      PlannedSessionStatus @default(SCHEDULED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([studyPlanId])
  @@index([assignmentId])
  @@map("planned_sessions")
}

enum PlannedSessionStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  SKIPPED
  RESCHEDULED
}
```

- `Task.scheduledTasks` is removed; `Assignment` gains `plannedSessions PlannedSession[]`.
- `PlannedSession` has no `userId` of its own — it is scoped through `studyPlan.userId` (and, secondarily, `assignment.userId`). The ownership convention's header comment (`apps/api/src/common/ownership/ownership.ts:26-29`) names `ScheduledTask` and its parents and **must be updated in the same change** to name `PlannedSession` and `studyPlan.userId`.
- **Migration steps** (one migration folder, e.g. `apps/api/prisma/migrations/<timestamp>_study_plan_planned_sessions/migration.sql`):
  1. `ALTER TABLE "scheduled_tasks" RENAME TO "planned_sessions";`
  2. `ALTER TYPE "ScheduledTaskStatus" RENAME TO "PlannedSessionStatus";`
  3. `ALTER TABLE "planned_sessions" DROP COLUMN "task_id";` (the FK constraint goes with the column).
  4. `ALTER TABLE "planned_sessions" ADD COLUMN "assignment_id" TEXT;` — then a **guard** that raises an exception if any row exists (`DO $$ BEGIN IF EXISTS (SELECT 1 FROM "planned_sessions") THEN RAISE EXCEPTION 'planned_sessions must be empty before the EP06 migration'; END IF; END $$;`) — then `ALTER TABLE "planned_sessions" ALTER COLUMN "assignment_id" SET NOT NULL;` and the FK to `assignments(id)` with `ON DELETE CASCADE`.
     The guard is not defensive noise: the table is provably empty in every deployed environment (no API or web code references `StudyPlan`/`ScheduledTask` — see the code baseline), and a silent delete would destroy data if that were ever untrue.
  5. Drop the unique index on `(study_plan_id, task_id)`; add `@@index([studyPlanId])` and `@@index([assignmentId])`.
- **Backfill:** none — there are no rows to backfill.
- **Rollback:** drop the EP06-created `planned_sessions` rows, restore `scheduled_tasks`/`ScheduledTaskStatus` with the original `task_id NOT NULL` column and the original unique index. The original table was empty, so the rollback loses nothing that existed before EP06. The rollback is documented in EP06D's implementation record.
- `PlannedSessionStatus` keeps its five values so that EP08's miss detection has room; **EP06 only ever writes `SCHEDULED`**.

### The pure domain module

The epic's Technical Notes require the scheduling algorithm to be a pure TypeScript domain module, independent of HTTP, React and the database. It lives in `apps/api/src/domain/study-planning/` (a new top-level folder, deliberately outside `modules/`, so the "no Nest, no Prisma, no clock, no randomness" boundary is visible in the import graph):

| File | Contents |
|---|---|
| `types.ts` | `StudyPreferences`, `SchedulableAssignment`, `WeeklyWindow`, `DatedInterval`, `SchedulerInput`, `SchedulerOutput`, `PlannedSessionProposal`, `DeficitCategory` |
| `preferences.ts` | the `StudyPreferences` defaults, the bounds, the cross-field rules, the defensive reader and the validator |
| `intervals.ts` | the interval algebra: `mergeIntervals`, `subtractIntervals`, `overlaps`, `minutesBetween` |
| `remaining-work.ts` | the remaining-work classification (`schedulable` vs `flagged`) and the estimate→minutes conversion |
| `scheduler.ts` | the deterministic placement engine |
| `*.spec.ts` | the unit tests (TR-E06-03) |

The module imports nothing from `@nestjs/*`, nothing from Prisma and reads no clock: the caller supplies "today" and every time window. The NestJS service retrieves the academic data, invokes the engine and persists the confirmed result through a Prisma transaction (the epic's Technical Notes, third paragraph).

### The study-preferences shape (D06-4 — the final shape for seam V-07-1)

Stored in `User.preferences.studyDefaults`. The bag is validated today only as a plain object of bounded size (`apps/api/src/modules/users/dto/update-user.dto.ts:17-20`), so EP06 owns the concrete shape, its validation and its own endpoint.

```jsonc
{
  "studyDefaults": {
    "sessionLengthMinutes": 60,   // integer, 5..480  — the default session length (D06-4's "duration default")
    "minSessionMinutes": 15,      // integer, 5..480  — the shortest session the student wants
    "maxSessionMinutes": 120,     // integer, 5..480  — the longest session the student wants
    "dailyCapMinutes": 240        // integer, 5..1440 — the most planned minutes per day
  }
}
```

- **Defaults** (used when the bag is missing, when a key is missing, or when a key's value is invalid): `60 / 15 / 120 / 240`.
- **Cross-field rules:** `minSessionMinutes ≤ sessionLengthMinutes ≤ maxSessionMinutes`; `dailyCapMinutes ≥ minSessionMinutes`.
- **Read behaviour (defensive):** a missing, partial or malformed `studyDefaults` never fails a request and never yields an invalid value — each field falls back to its default independently. The bag's **other** keys are never read and never written by EP06.
- **Write behaviour:** `PUT /study-preferences` accepts any subset of the four keys, merges it onto the **current effective** values and validates the merged result (the `availability` module's precedent — "validation runs on the merged values"), then writes the complete four-key object into `preferences.studyDefaults` and leaves every other key of the bag untouched.
- **V-07-1 (EP07's re-check) is now mechanical:** EP07 reads `User.preferences.studyDefaults.sessionLengthMinutes` as its session-duration default. EP06's default is **60 minutes**, so EP07's own fallback default must be 60 minutes to agree; and EP07's bounds check must accept `5 ≤ sessionLengthMinutes ≤ 480` (the same band EP07 already uses for `plannedMinutes`).

### Endpoints

Paths are relative to the API root; the web client calls them through the `/api` Vite proxy (`apps/web/vite.config.ts` strips `/api`).

| Method & path | Owner | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /study-preferences` | EP06A | — | 200 → `{ sessionLengthMinutes, minSessionMinutes, maxSessionMinutes, dailyCapMinutes }` (the effective values, defaults filled in) | 401 unauthenticated |
| `PUT /study-preferences` | EP06A | `{ sessionLengthMinutes?, minSessionMinutes?, maxSessionMinutes?, dailyCapMinutes? }` | 200 → the effective values | 400 field-level `errors` map (bounds + the cross-field rules); 401 |
| `GET /study-plans/remaining-work` | EP06B | — | 200 → `{ items: RemainingWorkItem[]; unattributedConfirmedMinutes: number }` | 401 |
| `POST /study-plans/preview` | EP06D | — (no body) | 200 → `PlanPreview` | 401 |
| `POST /study-plans` | EP06D | `{ sessions: [{ assignmentId, date, startTime, endTime }] }` | 201 → `SavedPlan` | 400 field-level errors (a malformed session); 409 with a `conflicts` array; 401 |
| `GET /study-plans?from&to` | EP06D | `from`, `to` (`YYYY-MM-DD`; the inclusive span ≤ 31 days) | 200 → `SavedPlan` | 400 (invalid range); 401 |

`RemainingWorkItem` (never exposes `userId`):

```jsonc
{
  "assignmentId": "string",
  "title": "string",
  "courseCode": "string | null",
  "dueDate": "ISO-8601 | null",
  "estimatedMinutes": 180 | null,      // null exactly when flagged MISSING_ESTIMATE
  "confirmedMinutes": 0,
  "remainingMinutes": 180 | null,      // null exactly when flagged MISSING_ESTIMATE
  "status": "PENDING | IN_PROGRESS",
  "flagged": null | "MISSING_ESTIMATE" | "MISSING_DUE_DATE"
}
```

The items are ordered by due date ascending (nulls last), then priority descending, then `id` ascending — the same deterministic key the engine uses (D06-9), so the read and the plan agree on which work is "next".

`PlanPreview`:

```jsonc
{
  "from": "2026-10-30",
  "to": "2026-11-05",
  "timeZone": "America/New_York",
  "generatedAt": "ISO-8601",
  "preferences": { "sessionLengthMinutes": 60, "minSessionMinutes": 15, "maxSessionMinutes": 120, "dailyCapMinutes": 240 },
  "days": [
    {
      "date": "2026-10-30",
      "targetMinutes": 120,
      "sessions": [
        { "assignmentId": "string", "assignmentTitle": "string", "startTime": "09:00", "endTime": "10:00", "durationMinutes": 60 }
      ]
    }
  ],
  "warnings": [
    { "assignmentId": "string", "assignmentTitle": "string", "category": "NO_AVAILABLE_TIME | INSUFFICIENT_TIME_BEFORE_DEADLINE | OVERDUE", "minutes": 90, "dueDate": "2026-11-01 | null" }
  ],
  "deferred": [ { "assignmentId": "string", "minutes": 60 } ]
}
```

`SavedPlan` (the `POST /study-plans` response and the `GET /study-plans` body):

```jsonc
{
  "from": "2026-10-30",
  "to": "2026-11-05",
  "timeZone": "America/New_York",
  "days": [
    {
      "date": "2026-10-30",
      "targetMinutes": 120,
      "sessions": [
        { "id": "string", "assignmentId": "string", "assignmentTitle": "string", "startTime": "09:00", "endTime": "10:00", "durationMinutes": 60, "status": "SCHEDULED" }
      ]
    }
  ]
}
```

### The engine's rules

1. **Window (D06-3).** The plan covers the next **7 days starting today**, where "today" is the civil date in the student's profile `timeZone`. The seven dates are `[today, today+6]`. The window is fixed — there is no `from` parameter on the preview or the save.
2. **Order (AC-E06-05).** Assignments are processed in a fully deterministic order: **on-time assignments first** (due date ascending), then **overdue assignments** (due date before today) last; within each group by priority descending (`URGENT` > `HIGH` > `MEDIUM` > `LOW`), then by `createdAt` ascending, then by `assignmentId` ascending. The last key makes the order total — no two runs can differ.
3. **Free intervals (AC-E06-03, AC-E06-04).** For each date in the window, the day's free intervals are the student's **available** `AvailabilitySlot` windows for that weekday, minus the **blocked** `AvailabilitySlot` windows (`isAvailable: false`), minus the `ClassMeeting` windows of active courses, minus the confirmed `StudySession` intervals, minus the sessions this run has already placed. All of it is computed in the profile zone's wall-clock minutes; the service converts the confirmed sessions to wall-clock intervals before calling the engine.
4. **Daily cap.** The total planned minutes on a day may not exceed `dailyCapMinutes`. The day's remaining budget is consumed in interval order, so the cap binds deterministically. The cap is a **generator** rule (see rule 9).
5. **Session length.** A session's length is `min(sessionLengthMinutes, remaining work)`. If that is below `minSessionMinutes`, the tail of the work is placed as one final, shorter session — the minimum is a preference for the typical session, not a reason to leave the last minutes of an assignment unschedulable. A session is only placed in an interval that fits its whole length (no splitting a session across two intervals); an interval that is too short is left unused, and the unused capacity shows up in the deficit report.
6. **Splitting across days (D06-2).** One assignment's remaining work may be placed in several sessions, on several days, inside the window — that is the "spread my work across the week" behaviour.
7. **Deadline horizon.** An on-time assignment is placed only on dates `≤ its due date`. Work that cannot be placed before the due date is reported as `INSUFFICIENT_TIME_BEFORE_DEADLINE` (the deficit is `remaining − capacity available before the deadline`, measured at the moment the assignment is processed, i.e. after the earlier-deadline assignments took their pick). An assignment with no free time at all in the window is reported as `NO_AVAILABLE_TIME`.
8. **Overdue.** An assignment whose due date is before today is still placed, but **after** every on-time assignment (so it never takes capacity an on-time assignment needs), and it is reported as `OVERDUE` with its full remaining minutes. The report is factual and blame-free (EP08's principle).
9. **Deferred.** Work that is not placed but whose deadline lies beyond the window is reported as `deferred` (it continues in a later plan), not as a deficit.
10. **Flagged (AC-E06-09).** An assignment with no `estimatedHours` (or a non-positive one) or no `dueDate` is **flagged** (`MISSING_ESTIMATE` / `MISSING_DUE_DATE`) and never scheduled. Both fields are "necessary scheduling information": the epic's ACs are assignment-centric over "assignment estimates and due dates", and without a deadline the capacity-before-deadline question cannot be answered at all.
11. **Unfinished only.** Assignments whose status is `COMPLETED`, `SUBMITTED` or `GRADED` are not candidates.
12. **No due-date writes (AC-E06-08).** The engine has no write path at all; the service writes only `StudyPlan` and `PlannedSession` rows. `Assignment.dueDate` — and every other assignment field — is never written by EP06.

### The save, the edits and the conflict re-check (D06-5)

- The preview is a **proposal held by the client**; the student may move, resize and delete a proposed session in the preview. There is **no free-form session creation** — the epic does not require it, so no create affordance is built. (The save endpoint accepts the edited session list, so a crafted request could introduce a session; that is not reachable through the product, and the endpoint still validates every submitted session against the rules below. The rule is a **scope** rule, not a security invariant — see D06-11.)
- **The save is atomic.** `POST /study-plans` upserts the seven `StudyPlan` rows for the window, deletes the window's existing `PlannedSession` rows and inserts the submitted ones, in **one Prisma transaction**. A failure rolls the whole thing back; a partially replaced week is never persisted.
- **Conflicts are re-checked on save (D06-5).** Every submitted session is re-validated against the current state:
  - a malformed session (a date outside the window, a non-increasing time range, a duration that does not match the range, a missing/blank assignment id) → **400** with a field-level `errors` map;
  - an assignment that is not the student's → the **uniform 404** `Resource not found`;
  - an overlap with a class, a blocked window, a confirmed session or another submitted session → **409** with a `conflicts` array naming each offending session (`sessionIndex`, `date`, `startTime`, `reason`).
- **Manual edits are bounded by the hard conflicts only.** A moved or resized session must not overlap a class, blocked time, a confirmed session or another planned session. The **availability window** and the **daily cap** are *generator* rules: a student may deliberately study outside their declared availability, so a manual edit is not rejected for that (D06-11).
- **Replace semantics (D06-12).** A save replaces exactly the sessions whose date falls inside the window. Sessions outside the window (including a previous window that has since rolled forward) are untouched and remain readable through `GET /study-plans?from&to`.

### Rules

1. **Ownership.** Every query carries the authenticated student's `userId` (`ownedWhere` / `assertOwned` / `assertAffected`, `apps/api/src/common/ownership/ownership.ts`). A missing or a foreign record returns the same uniform 404 `Resource not found` — never 403, never a distinct message (no existence oracle). `PlannedSession` is scoped through `studyPlan.userId`.
2. **The scheduler schedules assignments (D06-1).** A planned session references an `Assignment`. Subtasks stay EP03's checklist and are never scheduled.
3. **Confirmed time comes from the session log (D07-2 honoured).** `Assignment.actualHours` and `Task.actualMinutes` are **never read** as confirmed time (no API writes them today, and `PATCH /assignments` rejects `actualHours` as a lifecycle field). EP06 aggregates the `StudySession` log itself (D06-6).
4. **Remaining work (AC-E06-02).** `remainingMinutes = max(0, round(estimatedHours × 60) − confirmedMinutes)`.
5. **EP06 owns its confirmed-time read (D06-6).** EP06 reads `StudySession` directly through its own ownership-scoped aggregation and does **not** consume EP07B's `GET /study-sessions/confirmed-time` (seam V-07-2). This keeps EP06 and EP07 parallel in M3. EP07's endpoint remains authoritative for EP07's own surfaces.
6. **Purity.** The engine is a pure function: no clock, no randomness, no database, no HTTP. The same inputs always produce the same plan (AC-E06-05's determinism).
7. **The assignment's due date is never changed (AC-E06-08).**
8. **Flagged work is never silently scheduled (AC-E06-09).**
9. **Errors are actionable.** 400 carries a field-level `errors` map; 404 is the uniform `Resource not found`; 409 carries a human-readable reason and, for the save, the per-session `conflicts` array.
10. **The plan is one review unit.** No child is independently released; the combined EP06 review is the gate.

### Cross-epic seams

| Seam | EP06 side | Other side | Verification task |
|---|---|---|---|
| **V-05-1** (EP05) — the calendar read model | EP06 exposes the planned sessions through `GET /study-plans` and **does not change the calendar service**. | EP04 owns `GET /calendar/events`; EP05's dashboard widget reads `STUDY_SESSION` events. | **The recorded mechanism is a new calendar event type `PLANNED_SESSION`, not a reuse of `STUDY_SESSION`.** `STUDY_SESSION` means "actual study time logged" (EP07's log), so reusing it would make EP05's "Today's study sessions" widget render *planned* sessions as if they were *actual* — a truthfulness defect, and the widget's focus flag has no meaning for a proposal. A distinct type keeps planned and actual apart, which is the same principle as EP07's Technical Note ("separate planned sessions from actual time logs"). The change, when EP05's owner takes it: `apps/api/src/modules/calendar/calendar.service.ts` emits `PLANNED_SESSION` events for the student's planned sessions in the range; the web icon+label map (`apps/web/src/features/calendar/ui/CalendarEventChip.tsx:26-31`, `CalendarEventDetails.tsx:14-20`) gains the type; EP05's dashboard selector decides whether the widget shows planned sessions (and revisits its "see all" target, currently `/calendar`). **EP05's impact:** until that lands, the dashboard widget keeps its empty state (D05-2/D05-13) and the planned sessions are visible only on EP06's `/plan` page. Owner: EP05's owner / the coordinator — **not** EP06. |
| **V-07-1** (EP07) — the session-duration default | EP06 defines the **final** `studyDefaults` shape (above) and writes it through `PUT /study-preferences`. | EP07 reads `User.preferences.studyDefaults` as its session-duration default. | Re-check EP07's default resolution against the final shape: the key is `sessionLengthMinutes`, the default is **60**, the bounds are `5..480` (the band EP07 already uses for `plannedMinutes`). EP07's own fallback default must be 60 to agree. |
| **V-07-2** (EP07) — the confirmed-time read API | EP06 does **not** consume `GET /study-sessions/confirmed-time`; it aggregates `StudySession` itself (D06-6). | EP07B owns that endpoint. | No action for EP07 — the seam is closed by D06-6's own aggregation. EP07's endpoint stays authoritative for EP07's own surfaces. |
| **V-07-3** (EP07, raised here) — the `StudySession.assignmentId` column | EP06's per-assignment confirmed-time attribution needs a session→assignment link. **Today `StudySession` has none** (the schema has `userId`, `startTime`, `endTime`, `durationMinutes`, `notes`, `isFocusMode`, `rating` — no `assignmentId`, no `status`), and EP07A's migration is what adds it (EP07's D07-1). | EP07A adds `StudySession.assignmentId` (nullable FK, `onDelete: SetNull`) and the `ACTIVE/PAUSED/COMPLETED` status. | Until EP07A lands, EP06 attributes **no** confirmed minutes to an assignment (every session is unattributed) — which is unobservable in practice, because **nothing writes `StudySession` today** (no API creates one; the only writes in the repo are calendar test fixtures). When EP07A lands, EP06B's aggregation is upgraded by the named change in its story (select `assignmentId`, group by it, count only `COMPLETED` sessions). Owner: EP06's implementer, after EP07A. |
| **D404-5** (EP04) — recurring-only availability | EP06's conflict detection reads `AvailabilitySlot` as-is: `isAvailable: true` = a free window, `isAvailable: false` = a recurring blocked time. | EP04's model is weekly-recurring; one-off dated blocks are out of scope for EP04 (the user confirmed recurring-only on 2026-10-28). | **This is a limit of the conflict rules, not a gap EP06 fills:** there is no dated one-off block source, so "blocked time" means "recurring blocked time on this weekday". A dated exception (a one-off block on a specific date) cannot be represented and cannot be detected. If the product later wants dated blocks, EP04's model changes first and EP06's window builder follows. |

## Decision register

Provenance convention: **User decision (settled 2026-10-30)** marks the six decisions the user confirmed with the coordinator before this breakdown was written; **Planner-recorded** marks a decision this planner made from the epic's own wording and the inspected code, each cited to its grounding and reversible; **Provisional** marks a decision that is reversible and recorded as a starting point, not an approved policy.

| ID | Decision | Provenance |
|---|---|---|
| D06-1 | **The scheduler schedules assignments, not subtasks.** A planned session references an `Assignment`; the legacy `ScheduledTask.taskId` → `Task` FK is replaced by an assignment link, and the row is renamed `PlannedSession` because "task" is materially wrong once it references an assignment (D06-2 needs the assignment link and the multi-session-per-assignment shape). Subtasks stay EP03's checklist. | **User decision (settled 2026-10-30).** Grounded in AC-E06-02/AC-E06-05 ("assignment estimates and due dates"), the coordinator's reading of the assignment-centric ACs, and EP07's D07-3 (the cross-assignment remaining-work view stays EP06's). |
| D06-2 | **One assignment's remaining work may be split across multiple sessions on different days.** The legacy `@@unique([studyPlanId, taskId])` (one slot per item per plan-day) is dropped; a planned session carries an `assignmentId`, and the unique constraint is replaced by plain indexes plus the save-time conflict re-check. | **User decision (settled 2026-10-30).** Grounded in the epic's "so that I can spread my work across the week" and the legacy `@@unique([studyPlanId, taskId])` in `apps/api/prisma/schema.prisma:337`. |
| D06-3 | **A generated plan covers the next 7 days starting today** — a fixed rolling week, with "today" being the civil date in the student's profile `timeZone`. The seven per-day `StudyPlan` rows (`@@unique([userId, date])`, `targetHours`) are the containers. | **User decision (settled 2026-10-30).** Grounded in the legacy per-day `StudyPlan` model (`schema.prisma:307-322`) and the epic's "across the week" wording. |
| D06-4 | **Study preferences = duration default + min/max + daily cap**, stored in `User.preferences.studyDefaults` as `{ sessionLengthMinutes, minSessionMinutes, maxSessionMinutes, dailyCapMinutes }` with the defaults `60 / 15 / 120 / 240`, the bounds `5..480 / 5..480 / 5..480 / 5..1440`, and the cross-field rules `min ≤ sessionLength ≤ max` and `dailyCap ≥ min`. This is the **final** shape for seam V-07-1. | **User decision (settled 2026-10-30)**, formalised with the exact keys, types and bounds here (the user settled the four fields; the names, bounds and defaults are this planner's formalisation, recorded so EP07's re-check is mechanical). |
| D06-5 | **In the plan preview the student may move, resize and delete a proposed session; conflicts are re-checked on save.** No free-form session creation. The preview is a client-held proposal; the save is atomic and re-validates every submitted session. | **User decision (settled 2026-10-30).** Grounded in AC-E06-06 ("review and edit proposed sessions before saving") and the epic's scope list ("Plan preview and confirmation"). |
| D06-6 | **EP06 reads `StudySession` directly for confirmed study time**, through its own ownership-scoped aggregation, and does not consume EP07B's `GET /study-sessions/confirmed-time` (seam V-07-2). EP06 therefore does not depend on EP07B and EP06/EP07 can proceed in parallel in M3. `Assignment.actualHours` is never read as confirmed time (D07-2 honoured). | **User decision (settled 2026-10-30).** |
| D06-7 | **The confirmed-time aggregation has two states, and EP06 is honest about the first one.** *State A (today's schema):* `StudySession` has no `assignmentId` and no `status`, so confirmed minutes **cannot be attributed** to an assignment; EP06 reports the student's confirmed minutes as `unattributedConfirmedMinutes` and attributes none of them, so `remainingMinutes = estimatedMinutes`. This is unobservable in practice because **nothing writes `StudySession` today** (no API creates one). *State B (after EP07A):* the aggregation selects `assignmentId`, groups by it and counts only `COMPLETED` sessions. The upgrade is a named change in EP06B and seam **V-07-3**. | **Planner-recorded**, from the coordinator's explicit instruction to decide and record the two states, grounded in the inspected schema (`schema.prisma:276-290`), EP07's D07-1/D07-7 and the repo-wide search that found no `StudySession` write outside calendar test fixtures. |
| D06-8 | **The plan's persistence is one per-day `StudyPlan` row plus assignment-linked `PlannedSession` rows**, with the model, table and enum renamed from `ScheduledTask` / `scheduled_tasks` / `ScheduledTaskStatus`. `StudyPlan` keeps its shape; `PlannedSession` drops `taskId`, gains a required `assignmentId` and drops the per-plan unique constraint. | **Planner-recorded.** The rename follows D06-1/D06-2 (the old name refers to a relation that no longer exists); the tables are empty and unreferenced anywhere in `apps/api/src` or `apps/web/src`, so the migration carries no data risk. **Cross-epic note:** EP07's README (D07-1) refers to "EP06's `StudyPlan`/`ScheduledTask`" — after this migration the planned-session table is `planned_sessions`. No EP07 code depends on the name; the EP07 owner may update that sentence (recorded as a finding, not changed here). |
| D06-9 | **The engine's ordering is fully deterministic:** on-time assignments first (due date ascending), overdue assignments last; within a group by priority descending, then `createdAt` ascending, then `assignmentId` ascending. The last key makes the order total. | **Planner-recorded** to satisfy AC-E06-05 ("deterministic tie-breaking rules"). Grounded in the stored fields (`dueDate`, `priority`, `createdAt`, `id` — `schema.prisma:187-210`). Reversible. |
| D06-10 | **Overdue assignments are scheduled last, not first.** An assignment whose due date is before today is placed after every on-time assignment (so it never consumes capacity an on-time assignment needs) and is reported as `OVERDUE` with its full remaining minutes. The report is factual and blame-free. | **Planner-recorded.** The epic does not mention overdue work; EP08 ("Catch-Up & Recovery", "useful feedback without blame or punitive messaging") owns the recovery workflow, so EP06 must not pre-empt it — but it must not silently starve on-time work either. Reversible; the flagging stays in the report either way. |
| D06-11 | **The deficit report has three categories** — `NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE` and `OVERDUE` — plus a separate `deferred` list for work whose deadline lies beyond the window. Work that cannot be placed before a deadline is reported with its **minutes**, and the API returns structured facts, not user-facing prose (the copy is the frontend's, settled by the `ui-refiner`). | **Planner-recorded**, satisfying AC-E06-07 and AC-E06-09 without inventing a warning vocabulary the epic does not define. |
| D06-12 | **A manual edit is bounded by the hard conflicts only.** A moved or resized session must not overlap a class, blocked time, a confirmed session or another planned session (409). The **availability window** and the **daily cap** are generator rules and are not enforced against a manual edit. | **Planner-recorded** from the epic's own wording: AC-E06-03 ("the *scheduler* places work only inside available study windows") and AC-E06-04 (the conflict list is classes / blocked time / confirmed sessions), plus D06-5's "conflicts are re-checked on save". The student may deliberately study outside their declared availability; rejecting that would make the edit feature nearly unusable. Reversible. |
| D06-13 | **A save replaces exactly the sessions inside the window** (atomic, one Prisma transaction); sessions outside the window are untouched and stay readable through `GET /study-plans?from&to`. `StudyPlan.targetHours` holds the day's **planned** hours (the placed minutes ÷ 60), recomputed on every save. | **Planner-recorded.** "Preview and confirmation" implies the confirmed set replaces the proposal; keeping the rest of the student's history intact is the conservative reading. `targetHours` as the day's plan target matches the field's comment ("Target study hours for this day"); the daily cap is a separate, configured value. Reversible. |
| D06-14 | **`User.preferences.studyDefaults` is written through `PUT /study-preferences`, and EP06's reader is defensive.** A missing, partial or malformed bag never fails a request: each field falls back to its default independently, and the bag's other keys are neither read nor written by EP06. `PATCH /users/me` keeps its free-form `preferences` bag (SP106's D106-1) and is **not** narrowed by EP06. | **Planner-recorded.** The bag is validated today only as "a plain object of bounded size" (`apps/api/src/modules/users/dto/update-user.dto.ts:17-20`), and SP106's own integration spec round-trips a `studyDefaults` key of a *different* shape (`apps/api/src/modules/users/users-profile-integration.spec.ts:147-160`), so narrowing `PATCH /users/me` would have required editing an EP01-owned test. The defensive reader makes the second writer harmless instead. **Residual risk recorded:** `PATCH /users/me` can write a `studyDefaults` that EP06's reader ignores field-by-field — the student's stored value may then differ from the value the planner used, until they re-save it in the preferences surface. If the coordinator wants a single writer, EP01's integration spec must change with it (see the findings). |
| D06-15 | **EP06E, EP06F and EP06G are `Needs refinement`.** The preferences form's control choice and copy, the plan page's layout and information hierarchy, the **move/resize/delete interaction model** for a proposed session, the remaining-work row design, the warning copy, the empty/loading/error states, the responsive behavior and the keyboard behavior are deliberately undecided; the `ui-refiner` records them before implementation. EP06A, EP06B, EP06C, EP06D and EP06H are backend/domain/integration work and need no `ui-refiner` pass. | **Planner skill's UI/UX handoff rule.** |
| D06-16 | **The `studyDefaults` key names are chosen to be compatible with the shape EP01 already used** (`sessionLengthMinutes`), so a `studyDefaults` object written through `PATCH /users/me` is at least *partially* recognisable to EP06's reader rather than wholly foreign. | **Planner-recorded.** Grounded in `apps/api/src/modules/users/users-profile-integration.spec.ts:149` (`studyDefaults: { sessionLengthMinutes: 45 }`). This is why D06-4's "duration default" is named `sessionLengthMinutes`. |
| D06-17 | **The domain module lives in `apps/api/src/domain/study-planning/`**, outside `modules/`, so the "independent of HTTP, React and the database" requirement of the epic's Technical Notes is visible in the import graph and EP08 can import the engine directly. | **Planner-recorded.** Grounded in the epic's Technical Notes (first and third paragraphs) and EP08's Technical Note ("Reuse the EP06 scheduling engine instead of creating a separate scheduling algorithm"). |
| D06-18 | **EP06 does not change the calendar read model.** The mechanism by which planned sessions would reach `GET /calendar/events` is recorded (a new `PLANNED_SESSION` event type) and the impact on EP05's widget is recorded, but the change belongs to EP05's owner (seam **V-05-1**). EP06's own surface is the `/plan` page. | **Planner-recorded.** The coordinator's seam note classifies V-05-1 as cross-epic and EP05-owned; the calendar service and its web icon/label map are EP04's files and EP05's widget is EP05's file, so a change there from EP06 would reopen two reviewed epics. |
| D06-19 | **The plan preview and the saved plan are two different reads.** The preview (`POST /study-plans/preview`) is computed and returned without writing anything; the saved plan (`GET /study-plans`) is the persisted week. The client holds the proposal and its edits until the save. | **Planner-recorded.** A server-side draft would need a draft status, a draft lifecycle and stale-draft cleanup — all outside the epic's scope ("Plan preview and confirmation"). **Consequence recorded as FU-EP06-01:** a manual edit is lost when the student regenerates the week, and a saved session cannot be edited without regenerating; EP08 owns "proposed schedule changes" for saved plans. |

## Code baseline (inspected 2026-10-30 at HEAD `9b1ec19`, not proposed)

- **Schema** `apps/api/prisma/schema.prisma`:
  - `model User` (`:17-53`): `timeZone String @default("UTC")`, `preferences Json?` (the schema comment names "future minimal prefs (EP06 study defaults)"), and the relations `studySessions`, `studyPlans`, `availabilitySlots`, `classMeetings`.
  - `model Assignment` (`:187-210`): `estimatedHours Float?`, `actualHours Float?`, `dueDate DateTime?`, `status AssignmentStatus`, `priority AssignmentPriority`, `type AssignmentType?`, `tasks Task[]`.
  - `model Task` (`:237-257`): `assignmentId String?`, `estimatedMinutes Int?`, `actualMinutes Int?`, `scheduledTasks ScheduledTask[]` (the relation this epic removes).
  - `model StudySession` (`:276-290`): `userId`, `startTime DateTime`, `endTime DateTime` (both **required**), `durationMinutes Int @default(0)` ("Calculated"), `notes String?`, `isFocusMode Boolean @default(true)`, `rating Int?` — **no `assignmentId`, no `status`, no assignment link at all**.
  - `model AvailabilitySlot` (`:292-305`): `dayOfWeek Int` (0-6), `startTime`/`endTime` as `HH:mm` strings, `isAvailable Boolean @default(true)`, `@@unique([userId, dayOfWeek, startTime])`.
  - `model ClassMeeting` (`:167-181`): `courseId`, `dayOfWeek`, `startTime`/`endTime` strings, `@@unique([courseId, dayOfWeek, startTime])`; the course relation cascades.
  - `model StudyPlan` (`:307-322`): `userId`, `date DateTime @db.Date`, `targetHours Float`, `notes String?`, `@@unique([userId, date])`, `scheduledTasks ScheduledTask[]`.
  - `model ScheduledTask` (`:324-339`): `studyPlanId`, `taskId`, `startTime`, `endTime`, `durationMinutes Int`, `status ScheduledTaskStatus @default(SCHEDULED)`, `@@unique([studyPlanId, taskId])`.
  - `enum ScheduledTaskStatus` (`:341-347`): `SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED, RESCHEDULED`.
- **`StudyPlan` and `ScheduledTask` are used nowhere in the application.** A repo-wide search of `apps/api/src` and `apps/web/src` finds them only in the ownership convention's header comment (`apps/api/src/common/ownership/ownership.ts:26-29`) and in the EP05/EP07 documents. Both tables are empty in every deployed environment.
- **No focus-session API exists and nothing writes `StudySession`.** `apps/api/src/modules/` = assignments, auth, availability, calendar, courses, email, onboarding, prisma, semesters, users. The only `studySession.create` calls in the repo are calendar test fixtures (`apps/api/src/modules/calendar/calendar-data-scoping.spec.ts:52`, `calendar-e2e.spec.ts:108`).
- **Ownership convention** `apps/api/src/common/ownership/ownership.ts`: `ownedWhere(userId, id)` (`:37`), `assertOwned(userId, record)` (`:46`), `assertAffected(userId, count)` (`:60`), `RESOURCE_NOT_FOUND = 'Resource not found'` (`:34`); a missing and a foreign record produce the identical 404 (never 403 — no existence oracle). The header comment names `StudyPlan` and `ScheduledTask` and must be updated with the schema change.
- **Module precedent to copy** `apps/api/src/modules/availability/`: `toSlotResponse` (`:35-45`, a projection that never exposes `userId`), `dtoErrors` (`:56-67`, re-runs the DTO constraint set with `validateSync({ whitelist: true, forbidNonWhitelisted: true })` for non-HTTP callers), `throwFieldErrors` (`:69-76`), `validateSlotTimes` (`:87-113`, the cross-field rule a single-field decorator cannot express), `ConflictException` for a state conflict (`:193`), `assertAffected` for a scoped write (`:300`), and the "validation runs on the **merged** values" rule for a PATCH (`:242`). Registration: `apps/api/src/app.module.ts:13-33` and the parity list in `apps/api/src/test/test-http.ts:72-89` (**both** must be updated, or the integration specs cannot see the new routes).
- **Users module** `apps/api/src/modules/users/`: `users.controller.ts:12-27` (`GET /users/me`, `PATCH /users/me`), `users.service.ts:87-115` (the partial update — only the provided fields are written), `dto/update-user.dto.ts:17-20` (`preferences?: Record<string, unknown>`), `dto/validate-bounded-size.validator.ts` (the 4096-byte serialized cap), `dto/validate-plain-object.validator.ts` ("preferences must be a plain object"). `dto/update-user.dto.spec.ts:67-73` asserts that a `studyDefaults`-keyed bag is *accepted* by the DTO; `users-profile-integration.spec.ts:147-160` asserts that such a bag round-trips through `PATCH /users/me` unchanged (its example shape is `{ sessionLengthMinutes: 45 }`).
- **Calendar read model** `apps/api/src/modules/calendar/calendar.service.ts`: the `CalendarEvent` type union (`:7-28`) is `CLASS | ASSIGNMENT_DEADLINE | EXAM_DEADLINE | STUDY_SESSION | AVAILABILITY | BLOCKED_TIME`; the session query (`:204-210`) filters `startTime < rangeEnd AND endTime > rangeStart`; the `STUDY_SESSION` mapping (`:298-325`) emits `link: null`. `events[].link` is populated for classes, deadlines and availability. EP06 does not change this file (D06-18).
- **Frontend routes** `apps/web/src/app/App.tsx:37-60`: the `ProtectedRoute` block holds `/dashboard`, `/semesters`, `/courses`, `/courses/:id`, `/assignments`, `/calendar`, `/availability`, `/profile`, `/onboarding` — **no plan route exists**.
- **Frontend navigation** `apps/web/src/widgets/header/ui/navGroups.ts:74-84`: the shared `Planning` group holds `Calendar` (`/calendar`) and `Availability` (`/availability`); the account menu (`:95-106`) is the secondary surface. The nav contract is EP11's shared file and is edited additively.
- **Frontend profile** `apps/web/src/pages/profile/ui/ProfilePage.tsx`: the M1 form is `name` + `timeZone` with a zod resolver (`:21-27`); the save sends only those two fields and **deliberately leaves `preferences` untouched** (`:111-129`, D106-9). It is the natural host for EP06's preferences section.
- **Frontend data layer** `apps/web/src/entities/<entity>/api/` (the `assignmentApi.ts` / `availabilityApi.ts` / `calendarApi.ts` pattern) over the shared axios transport `apps/web/src/shared/api/httpClient.ts` (base URL `/api`; the Vite proxy strips `/api` — `apps/web/vite.config.ts:15-26`); the shared web types live in `apps/web/src/shared/types/academic.ts` (which already declares a `StudySession` interface mirroring the old schema — EP07's to update, not EP06's).
- **FSD layers** are enforced by `apps/web/.eslintrc.cjs` (`import/no-restricted-paths`); the `@/` alias points at `apps/web/src`; new work goes in `entities/` / `features/` / `pages/`, never in flat top-level folders.
- **Design system (EP10, implemented and parent-reviewed)** — semantic tokens in `apps/web/tailwind.config.js` + `apps/web/src/index.css`; the primitives in `apps/web/src/shared/ui/` (`Button, Input, Select, Card, Dialog, Badge, EmptyState`); reduced motion through token durations; tap targets ≥ 44px; visible focus rings. EP06's UI must use these — no ad-hoc colors or spacing.
- **Testing conventions** — API unit and data-scoping specs beside the module (`*.service.spec.ts`, `*data-scoping.spec.ts`), API e2e specs in the module folder (`assignments-e2e.spec.ts`, `availability-e2e.spec.ts`), web component tests beside components, and browser e2e in `apps/web/e2e/` (`login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`) against the self-contained EP09 stack (`docs/stories/EP09/README.md` — the real, unmocked stack).
- **Commands** — `apps/api/package.json`: `test` (jest), `typecheck` (`tsc --noEmit`), `lint`, `db:generate`, `db:migrate` (`dotenv -e .env.local -- prisma migrate dev`). `apps/web/package.json`: `test` (vitest run), `test:e2e` (playwright test), `typecheck`, `lint`.
- **Unverified / not decided here** — the `ui-refiner`'s presentation decisions for EP06E/EP06F/EP06G; any browser rendering of a proposed plan layout (no screenshots taken); the exact EP07A migration timestamp and its `StudySession.assignmentId` backfill (EP07's plan, not implemented); the EP05 owner's decision on the `PLANNED_SESSION` calendar event (V-05-1).

## Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Another student's plan is unreachable | Student B reads or replaces student A's plan, or saves a session for one of A's assignments | Every query carries the authenticated `userId` (`ownedWhere` / `assertOwned` / `assertAffected`); `PlannedSession` is scoped through `studyPlan.userId`; a missing and a foreign record return the identical uniform 404 `Resource not found` — never 403, never a distinct message | TR-E06-01, TR-E06-02, TR-E06-04, TR-E06-08 |
| The scheduler never moves a deadline | A plan is generated or saved and an assignment's `dueDate` (or any other assignment field) changes | The engine is a pure function with no write path; the service writes only `StudyPlan` and `PlannedSession` rows. The save's test compares the assignment rows field-for-field before and after | TR-E06-03, TR-E06-04 |
| A saved plan contains no overlapping sessions | The student saves two sessions at the same time, or moves a session onto a class, a blocked window or a confirmed session | The conflict re-check on save rejects the whole save with 409 and a per-session reason; the transaction never persists a partially conflicting plan | TR-E06-04 |
| A generated session never lands outside an available window | The engine places a session in a blocked window, during a class, or on top of a confirmed study session | The free-interval computation subtracts blocked windows, class windows and confirmed sessions before any placement; the engine's unit tests cover each subtraction | TR-E06-03, TR-E06-04 |
| A malformed preferences bag cannot break the planner | The stored `studyDefaults` is a string, a number, an object with an out-of-range value, or has `min > max` | The reader validates each field independently and falls back to that field's default; no EP06 read path throws on a malformed bag; `PUT /study-preferences` validates the merged values and rejects an invalid combination with a field-level 400 | TR-E06-01 |
| Confirmed study time is never read from the wrong source | EP06 sums `Assignment.actualHours` (never written by any API) and always reports zero remaining work after time was spent | The session log is the source of truth (D07-2, D06-6); EP06 aggregates `StudySession` through its own ownership-scoped query and never reads `Assignment.actualHours` | TR-E06-02 |
| Another student's study time cannot inflate this student's remaining work | The aggregation queries `StudySession` without the `userId` and sums every row in the table | The aggregation's `where` clause carries the authenticated `userId`; the data-scoping spec asserts that a second student's session is invisible | TR-E06-02, TR-E06-08 |
| Flagged work is never silently scheduled | An assignment with no estimate or no due date appears in the plan as a session | The engine receives only the schedulable classification; the flagged items are reported with their reason and are absent from the plan | TR-E06-02, TR-E06-03 |
| The plan surface is operable without a mouse | A student cannot move, resize or delete a proposed session, or reach the generate/save controls, using only the keyboard | Every control is a native button/input with a visible focus ring; the `ui-refiner` settles the editing interaction model; EP06F/EP06G's ACs and TR-E06-09 verify it | TR-E06-06, TR-E06-07, TR-E06-09 |

## Plan correction log

(First plan of this epic. No plan-review pass yet.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | No findings yet. | — | — | — |

## Quality gate (2026-10-30)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP06E, EP06F and EP06G are `Needs refinement` (D06-15): the plan page's layout and information hierarchy, the move/resize/delete interaction model, the remaining-work row design, the warning copy, the empty/loading/error states, the responsive behavior and the keyboard behavior are deliberately undecided and must be settled by the `ui-refiner` before those children are implemented. EP06A, EP06B, EP06C, EP06D and EP06H carry no UI decisions and are ready to implement. **No implementation blocker exists** beyond refinement: EP03 and EP04 are complete, and EP06 does not depend on EP07 (D06-6) — the one EP07 coupling is the *seam* V-07-3, which is unobservable until EP07A lands (D06-7). EP05's dashboard widget stays as it is until its owner takes seam V-05-1 (D06-18).

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Eight children, each a substantive outcome: the preference shape + API, the remaining-work calculation + read API, the pure scheduling engine, the plan persistence + preview/save/read API, the preferences surface, the plan page's generate/edit/save journey, the remaining-work + deficit surfaces, and a cross-layer E2E suite + the parent index. No README-only/status-only/evidence-only child. Each split has a stated reason: the backend/frontend seam, the pure-domain boundary the epic's Technical Notes require, the plan page's size, and the integration child (a **new Playwright suite** against the real stack plus the parent index — real integration implementation and a substantial new test harness, not routine verification). |
| 2 | Original AC/TR coverage | Pass | All nine epic ACs mapped to owners above; nine TRs assigned (TR-E06-01…09). Every AC has at least one owning child and every TR has a named owner. The epic's six proposed stories are all covered. |
| 3 | Definition of Done | Pass | DoD map above; items 10/11 belong to the combined EP06 parent review; the per-child DoD lists carry a justified N/A reason for every item that does not apply to that layer. |
| 4 | Contract consistency | Pass | One shared API/data contract section (the data model and the migration, the pure domain module, the `studyDefaults` shape, the endpoints and the three payload shapes, the engine's rules, the save/edit/conflict rules, the numbered rules); EP06A/B/C/D implement, EP06E/F/G consume, EP06H verifies. The cross-epic seams (V-05-1, V-07-1, V-07-2, V-07-3, D404-5) each carry a named verification task and an owner. |
| 5 | Code paths inspected | Pass | Code baseline section above (schema, the empty `StudyPlan`/`ScheduledTask` tables, the absence of any `StudySession` writer, the ownership helpers, the availability module precedent, the users module and its preferences bag, the calendar read model, the routes, the nav contract, the profile page, the entity clients, FSD, the EP10 design system, the testing conventions, the commands). Unverified items are disclosed there: the `ui-refiner` decisions, any browser rendering, EP07A's migration details, and the EP05 owner's calendar decision. |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table above — nine claims with concrete counterexamples: cross-student access, deadline mutation, overlapping sessions, out-of-window placement, a malformed preferences bag, the wrong confirmed-time source, cross-student study time, silently scheduled flagged work, and keyboard operability. |
| 7 | Dependencies | Pass | EP06A → EP06B → EP06C → EP06D → EP06E → EP06F → EP06G → EP06H, one writer. EP03 + EP04 complete. **EP06 does not depend on EP07** (D06-6): V-07-3 is a one-way, unobservable-until-EP07A coupling and V-07-1 is EP07's re-check. EP05 is not a dependency (D06-18, seam V-05-1). EP07's and EP05's documents are not edited by this plan. |
| 8 | Material decisions | Blocked (partially) | D06-1…D06-6 are settled user decisions (2026-10-30). D06-15 (the three frontend children's UI/UX) is unresolved and is the `ui-refiner`'s to settle — this is what keeps the verdict at `Draft`. D06-7, D06-8, D06-9…D06-14 and D06-16…D06-19 are planner-recorded, grounded and reversible. **Three items need the coordinator's confirmation** and are listed as findings below: the `StudySession.assignmentId` coupling (V-07-3 / D06-7), the free-form `preferences` bag's second writer (D06-14), and the `ScheduledTask` → `PlannedSession` rename's effect on EP07's README sentence (D06-8). |
| 9 | Correction log | Pass | First plan of this epic; no plan-review pass yet. The log is initialized with no findings. The coordinator's factual findings are recorded as **decisions and seams** (D06-7, D06-8, D06-14, D06-18, V-05-1, V-07-3) rather than as plan defects. |
| 10 | Jira identity | Not applicable | No sync authorized; the epic key is STUDY-15 and all eight child keys are `Pending creation`. |

## Implementation review log

(No implementation yet.)

## Final implementation review unit

One combined review for the EP06 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP06](./README.md) | EP06A, EP06B, EP06C, EP06D, EP06E, EP06F, EP06G, EP06H | `./artifacts/EP06/` | EP06H (writes `./artifacts/EP06/implementation.md`, including the cross-layer E2E and regression evidence) | One combined EP06 review after all eight children (`review.md` + `walkthrough.md`) |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP06E, EP06F and EP06G must complete their `ui-refiner` pass before implementation.

## Autopilot

```yaml
version: 1
scope:
  parent: EP06
  descendants: []
  entry: planning
  limits: enclosing parent review unit
stage: plan
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: "9b1ec19"
  head: "9b1ec19"
active_dispatch:
  name: ep06-planner-1
  role: planner
  status: pending
  pointer: docs/stories/EP06/README.md
  session: ""
  assignment: plan
last_result:
  evidence: ""
  findings: ""
  scope_note: ""
  cycles: 0
  same_findings: unknown
gates:
  breakdown: false
  plan: unknown
  ui: unknown
  refinement: unknown
  child_unfinished: unknown
  eligible_child_state: none
  closeout: unknown
  integration: unknown
  all_descendants_implemented: false
  review: absent
  findings_owner: none
  open_findings: false
  walkthrough: missing
  judged_at_head: ""
  queue_hash: ""
writer: none
session_live: unknown
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: ""
judgment_attempts: 0
```
