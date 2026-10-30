# EP07 Story Breakdown — Focus Sessions & Time Tracking

**Epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Milestone:** M3 (Study planning and focus sessions)
**Epic dependency:** EP03 (Assignment & Task Management) — complete. Integrates with EP06 (Study Planning & Scheduling — not yet broken down).
**Status:** Planning — breakdown complete (2026-10-29). EP07A and EP07B implemented (awaiting parent review); EP07F ready to implement; EP07C, EP07D and EP07E are `Needs refinement` pending their `ui-refiner` pass (D07-5).
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP07/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP07A/`, `./artifacts/EP07B/`, `./artifacts/EP07C/`, `./artifacts/EP07D/`, `./artifacts/EP07E/`, `./artifacts/EP07F/`, plus `./artifacts/EP07/` for the parent implementation index, combined review and walkthrough.

**Active substory:** None.

**Next substory:** EP07C — needs ui-refiner pass (D07-5), then implement.

**Implementation owner:** `implementer`, one sequential writer across all layers (the Backend/Frontend/Integration labels are scope, not concurrent roles).

**Final review:** one combined review for the EP07 parent review unit — all six children — after EP07F is implemented. Reviewer artifacts: `./artifacts/EP07/review.md` + `./artifacts/EP07/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP07A](./EP07A-focus-session-persistence-and-lifecycle-api.md) | Implemented — awaiting parent review | EP03 complete (assignments/tasks exist). D07-1…D07-4 settled. Technical refinement captured 2026-10-30. | EP07B implement (unblocked) | `./artifacts/EP07A/` |
| [EP07B](./EP07B-completion-confirmed-time-and-read-apis.md) | Implemented — awaiting parent review | EP07A implemented (e52abde). Technical refinement captured 2026-10-30. | (done) EP07B: finish + confirmed-time + history APIs | `./artifacts/EP07B/` |
| [EP07C](./EP07C-start-focus-session-from-an-assignment.md) | Needs refinement | EP07A + EP07B implemented. `ui-refiner` pass required (D07-5). | `ui-refiner` pass on EP07C, then implement | `./artifacts/EP07C/` (pending) |
| [EP07D](./EP07D-focus-mode-interface-and-timer-controls.md) | Needs refinement | EP07A + EP07B + EP07C implemented (EP07C navigates into this route). `ui-refiner` pass required (D07-5). | `ui-refiner` pass on EP07D, then implement | `./artifacts/EP07D/` (pending) |
| [EP07E](./EP07E-completion-confirm-adjust-and-study-history.md) | Needs refinement | EP07A + EP07B + EP07D implemented. `ui-refiner` pass required (D07-5). | `ui-refiner` pass on EP07E, then implement | `./artifacts/EP07E/` (pending) |
| [EP07F](./EP07F-cross-layer-e2e-calendar-regression-and-parent-index.md) | Queued | EP07A–EP07E implemented; the EP09 self-contained E2E stack must be runnable. | Implement EP07F: cross-layer E2E + calendar regression + parent index | `./artifacts/EP07F/` (pending) |

Sequence (one writer): EP07A → EP07B → EP07C → EP07D → EP07E → EP07F. EP07A and EP07B are the contract/persistence spine; the three frontend children consume it; EP07F verifies the whole stack and owns the parent index.

**Do not start EP07C, EP07D or EP07E before their `ui-refiner` pass** — focus-mode layout and information hierarchy, timer presentation, distraction reduction, subtask visibility, history layout, empty/loading/error states, copy, responsive behavior and keyboard behavior are deliberately undecided (D07-5). EP07A, EP07B and EP07F are backend/integration work and need no `ui-refiner` pass.

**One accepted inter-commit transient.** EP07C's start action navigates into the focus route, but the route and the focus page land with EP07D. Between those two commits the navigation falls through to the catch-all redirect (`apps/web/src/app/App.tsx:63`). This is a work-in-progress state inside one sequential implementation, not a release: the combined EP07 review is the gate, and EP07C is explicitly not releasable on its own.

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP07A](./EP07A-focus-session-persistence-and-lifecycle-api.md) | 1. Implement focus-session creation and startup (persistence + lifecycle half) | Backend | Pending creation |
| [EP07B](./EP07B-completion-confirmed-time-and-read-apis.md) | 4. Implement session completion and time logging (API half) | Backend | Pending creation |
| [EP07C](./EP07C-start-focus-session-from-an-assignment.md) | 1. Implement focus-session creation and startup (frontend half) | Frontend | Pending creation |
| [EP07D](./EP07D-focus-mode-interface-and-timer-controls.md) | 2. Implement timer controls and recovery after interruption + 3. Build the distraction-reduced focus interface | Frontend | Pending creation |
| [EP07E](./EP07E-completion-confirm-adjust-and-study-history.md) | 4. Implement session completion and time logging (frontend half) + 5. Display study history (the history surface + the per-assignment confirmed-time contribution; the **full** remaining-work view stays EP06's per D07-3) | Frontend | Pending creation |
| [EP07F](./EP07F-cross-layer-e2e-calendar-regression-and-parent-index.md) | Cross-layer verification of all five proposed stories + the EP07 parent index | Integration | Pending creation |

All five of the epic's proposed stories are covered. The split follows the epic's own three-way seam: persistence (backend), HTTP surface (backend), and student-facing surfaces (frontend), plus one integration child.

**Why a separate integration child exists (not a padded verification child):** EP07F adds a **new Playwright spec suite** against the self-contained EP09 stack (`apps/web/e2e/study-sessions.spec.ts`) with timing-sensitive assertions that no unit/component test can cover, plus the **EP04 calendar regression harness** for sessions with a null `endTime`, plus the parent implementation index. That is real integration implementation and a substantial new test harness, not a status/verification-only child.

## Epic acceptance criteria — ownership

Original wording from [EP07](../../epics/EP07-focus-sessions-and-time-tracking.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can start a focus session from an assignment. | AC-E07-01 | **EP07A** (create endpoint + assignment link), **EP07C** (assignment-surface entry points). |
| Students can start, pause, resume, and finish a timer. | AC-E07-02 | **EP07A** (start/pause/resume), **EP07B** (finish), **EP07D** (timer controls). |
| The current assignment and unfinished subtasks remain accessible in focus mode. | AC-E07-03 | **EP07D** (focus-mode surface shows the linked assignment + its unfinished subtasks). |
| Students can confirm or adjust recorded study time. | AC-E07-04 | **EP07B** (finish endpoint accepts a bounded confirmed/adjusted value), **EP07E** (confirm/adjust UI). |
| Recorded study time is associated with the correct assignment. | AC-E07-05 | **EP07A** (assignment FK on the session, ownership-checked at create), **EP07B** (confirmed-time read is per assignment), **EP07E** (history shows the assignment), **EP07F** (cross-layer proof). |
| Reloading the app does not automatically mark a session complete. | AC-E07-06 | **EP07A** (recovery is a read of stored state; completion only happens through the finish endpoint), **EP07D** (reload restores, never completes), **EP07F** (cross-layer proof). |
| A study session can be finished without marking the assignment complete. | AC-E07-07 | **EP07B** (finish writes only the session row), **EP07E** (the completion flow never completes the assignment), **EP07F** (cross-layer proof that the assignment is unchanged). |
| Actual study time contributes to remaining-work calculations. | AC-E07-08 | **EP07B** (per-assignment confirmed-time endpoint — the EP06 read seam), **EP07E** (per-assignment remaining-work contribution in the EP07 surface), **EP07F** (recorded time reaches the endpoint). |

## Requirement and test traceability

The epic defines no test requirements (TR-*); stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| AC-E07-01 | Start a focus session from an assignment | EP07A, EP07C |
| AC-E07-02 | Start, pause, resume, finish a timer | EP07A, EP07B, EP07D |
| AC-E07-03 | Current assignment + unfinished subtasks accessible in focus mode | EP07D |
| AC-E07-04 | Confirm or adjust recorded study time | EP07B, EP07E |
| AC-E07-05 | Recorded time associated with the correct assignment | EP07A, EP07B, EP07E, EP07F |
| AC-E07-06 | Reloading does not mark a session complete | EP07A, EP07D, EP07F |
| AC-E07-07 | Finish without marking the assignment complete | EP07B, EP07F |
| AC-E07-08 | Actual study time contributes to remaining-work calculations | EP07B, EP07E, EP07F |
| TR-E07-01 | Lifecycle API tests: start/pause/resume/current, timestamp-derived elapsed, ownership 404 uniformity, invalid-transition 409, lost-race on a double pause | EP07A |
| TR-E07-02 | Completion + read API tests: finish with bounded confirm/adjust, assignment untouched, history list filter/order/page, confirmed-time aggregation, ownership | EP07B |
| TR-E07-03 | Start-from-assignment UI tests: entry points, duration selection, start call, navigation into focus mode, loading/error states | EP07C |
| TR-E07-04 | Focus-mode interface tests: timer display derived from server timestamps, start/pause/resume/finish controls, assignment + unfinished subtasks accessible, reload recovery, keyboard operability, reduced motion | EP07D |
| TR-E07-05 | Completion confirm/adjust + history surface tests: adjust bounds and validation, confirmed value round-trip, history list states, per-assignment remaining contribution | EP07E |
| TR-E07-06 | Cross-layer E2E: start→pause→resume→finish against the real stack; reload-does-not-complete; finish-without-completing-assignment; recorded time reaching the confirmed-time endpoint | EP07F |
| TR-E07-07 | EP04 calendar regression: an in-progress (null `endTime`) session is handled explicitly; existing calendar specs stay green | EP07F (verification); the calendar compatibility change itself is owned by EP07A |
| TR-E07-08 | Manual accessibility pass recorded for the focus-mode surface (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) | EP07D, EP07F (evidence collected for the combined review) |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP07A (start body, `plannedMinutes` bounds), EP07B (`confirmedMinutes` bounds, list/confirmed-time query), EP07C (duration selection), EP07E (adjust input) |
| 3 student data scoping | EP07A, EP07B, EP07F |
| 4 actionable API errors | EP07A, EP07B, EP07C, EP07D, EP07E |
| 5 loading, empty, and error states | EP07C, EP07D, EP07E |
| 6 keyboard accessibility | EP07C, EP07D, EP07E |
| 7 responsive layouts | EP07C, EP07D, EP07E |
| 8 automated tests | All children (TR-E07-01…07); TR-E07-08 is a recorded manual pass owned by EP07D with EP07F collecting the evidence |
| 9 API/migration documentation | EP07A (migration, backfill, rollback), EP07B (read/finish contract), EP07F (parent index) |
| 10 integrated review | EP07 parent review unit (all six children) |
| 11 reviewer walkthrough | Reviewer, once for the EP07 parent review unit |

## Shared API and data contract

This is the seam between EP07A/EP07B (which implement it) and EP07C/EP07D/EP07E (which consume it) and EP07F (which verifies it end to end). Field names, statuses and status codes below are the stable part; the exact presentation is settled by the `ui-refiner` pass (D07-5).

### Data model (EP07A — extends `StudySession` in place, D07-1)

No new table. `StudySession` becomes the **actual-time log**; planned sessions stay in EP06's `StudyPlan`/`ScheduledTask` (the epic's "separate planned sessions from actual time logs" requirement is already satisfied by that schema split).

```prisma
model StudySession {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignmentId String?
  assignment  Assignment? @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
  taskId      String?
  task        Task?       @relation(fields: [taskId], references: [id], onDelete: SetNull)
  startTime   DateTime
  endTime     DateTime?          // nullable (D07-1): null while the session is open
  status      StudySessionStatus @default(ACTIVE)
  elapsedSeconds Int @default(0) // server-derived, UNCONFIRMED elapsed time
  durationMinutes Int @default(0) // CONFIRMED minutes; 0 until the session is finished
  plannedMinutes Int?            // target/planned duration (D07-1)
  notes       String?
  isFocusMode Boolean  @default(true)
  rating      Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, status])
  @@index([userId, startTime])
  @@map("study_sessions")
}

enum StudySessionStatus { ACTIVE PAUSED COMPLETED }
```

- `endTime` becomes nullable; `Assignment` gains `studySessions StudySession[]`; `Task` gains `studySessions StudySession[]`.
- `elapsedSeconds` is the **raw, server-derived** accumulator. `durationMinutes` (existing column, comment "Calculated") holds the **confirmed** minutes written by the finish endpoint. The client never posts elapsed time — only the optional confirmed adjustment.
- `assignmentId`/`taskId` use `onDelete: SetNull`: deleting an assignment must not delete the study log (EP08's "Completed work and historical study logs remain unchanged").
- **Backfill (existing rows):** every pre-migration row has `endTime` and `durationMinutes` set → set `status = 'COMPLETED'`, `elapsedSeconds = durationMinutes * 60`, keep `startTime`/`endTime`/`durationMinutes` unchanged. `assignmentId`/`taskId` stay null (historical rows have no verified assignment link — the epic never linked them).
- **Rollback:** the migration is reversible — restore `endTime NOT NULL` (all backfilled rows have it), drop the added columns/indexes, restore `status` default. `elapsedSeconds` is derived from `durationMinutes`, so no unique data is lost.

### Timestamp bookkeeping (the epic's "use timestamps rather than relying entirely on browser timer intervals")

- `startTime` = the instant the session was created.
- The running segment is measured by the server: at pause/finish the service adds `floor((now - segmentStart) / 1000)` to `elapsedSeconds`, where `segmentStart` is the instant the current ACTIVE segment began (session creation, or the last resume). The segment start is persisted (a `resumedAt DateTime?` column on `StudySession`, set at create/resume and cleared at pause/finish) so it survives a reload.
- A browser tab that is throttled, backgrounded or closed cannot change the recorded time: the number the server computes is derived from stored timestamps, never from client ticks.
- The client may display a *smoothly ticking* counter, but the displayed value is always re-anchored to the server's `elapsedSeconds` after every pause/resume/finish/reload.

### Lifecycle

`ACTIVE` → `PAUSED` → `ACTIVE` → `COMPLETED`. `COMPLETED` is terminal. A session is **open** while its status is `ACTIVE` or `PAUSED`.

### Endpoints

Paths are relative to the API root; the web client calls them through the `/api` Vite proxy (`apps/web/vite.config.ts` strips `/api`).

| Method & path | Owner | Body / query | Success | Errors |
|---|---|---|---|---|
| `POST /study-sessions` | EP07A | `{ assignmentId?, taskId?, plannedMinutes? }` | 201 → `StudySessionProjection` | 400 field errors; 404 uniform (assignment/task not owned); 409 (an open session already exists — provisional, D07-6) |
| `POST /study-sessions/:id/pause` | EP07A | — | 200 → `StudySessionProjection` (`status: PAUSED`) | 404 uniform; 409 invalid transition / lost race |
| `POST /study-sessions/:id/resume` | EP07A | — | 200 → `StudySessionProjection` (`status: ACTIVE`) | 404 uniform; 409 invalid transition |
| `GET /study-sessions/current` | EP07A | — | 200 → `StudySessionProjection \| null` (null when no open session) | 401 unauthenticated |
| `POST /study-sessions/:id/finish` | EP07B | `{ confirmedMinutes? }` | 200 → `StudySessionProjection` (`status: COMPLETED`, `endTime` set, `durationMinutes` = confirmed) | 400 field errors; 404 uniform; 409 invalid transition |
| `GET /study-sessions` | EP07B | query `assignmentId?`, `from?`, `to?`, `limit?` (1–100, default 50), `offset?` | 200 → `{ items: StudySessionProjection[]; total: number }`, COMPLETED sessions only, `startTime` desc | 400 invalid query; 404 uniform (a given `assignmentId` that is not owned) |
| `GET /study-sessions/confirmed-time` | EP07B | query `assignmentId?` | 200 → without the param `{ assignments: [{ assignmentId, confirmedMinutes, sessionCount }] }`; with the param `{ assignmentId, confirmedMinutes, sessionCount }` | 404 uniform (a given assignment that is not owned) |

`StudySessionProjection` (never exposes `userId`):

```jsonc
{
  "id": "string",
  "assignmentId": "string | null",
  "taskId": "string | null",
  "status": "ACTIVE | PAUSED | COMPLETED",
  "startTime": "ISO-8601",
  "endTime": "ISO-8601 | null",     // null until finished
  "elapsedSeconds": 0,              // server-derived, unconfirmed
  "durationMinutes": 0,             // confirmed minutes; 0 until finished
  "plannedMinutes": 60 | null,
  "notes": "string | null",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Rules

1. **Ownership.** Every query carries the authenticated student's `userId` (`ownedWhere` / `assertOwned` / `assertAffected`, `apps/api/src/common/ownership/ownership.ts`). A missing or foreign record returns the same uniform 404 `Resource not found` — never 403, never a distinct message (no existence oracle).
2. **Confirmed time is the session log (D07-2).** `Assignment.actualHours` and `Task.actualMinutes` are **not** written by any EP07 endpoint (today no API writes them, and `PATCH /assignments` rejects `actualHours` as a lifecycle field). The confirmed time of an assignment is `SUM(durationMinutes)` over its COMPLETED sessions — exposed by `GET /study-sessions/confirmed-time`. No denormalized copy is stored on the assignment.
3. **Finishing never completes the assignment (AC-E07-07).** The finish endpoint writes only `StudySession` fields. It never touches `Assignment.status`, `Assignment.actualHours` or `Task.actualMinutes`.
4. **Transitions are race-safe.** Pause/resume/finish read the session scoped to the owner (404 when missing/foreign), validate the transition (409 when illegal), then apply a **status-guarded** `updateMany` (`where: { id, userId, status: <expected> }`) and assert the affected count. A lost race affects 0 rows → 409 with an actionable message ("the session changed; reload and try again"), never a double-counted elapsed time.
5. **Validation.** `plannedMinutes`: integer, `5 ≤ n ≤ 480`. `confirmedMinutes`: integer, `0 ≤ n ≤ 1440`; omitted → `round(elapsedSeconds / 60)`. Unknown body/query fields are rejected with 400 by the global `FieldValidationPipe` (repo convention), and the service re-runs the DTO constraint set for non-HTTP callers (`apps/api/src/modules/availability/availability.service.ts` precedent).
6. **Errors are actionable.** 400 carries a field-level `errors` map; 404 is the uniform `Resource not found`; 409 carries a human-readable reason ("This session is already paused." / "A focus session is already in progress.").
7. **The open-session invariant (provisional, D07-06).** Starting a session while another is `ACTIVE`/`PAUSED` returns 409. This backs the singular focus-mode model ("the current assignment" in focus mode). It is a reversible service check, recorded as provisional.

### EP06 seam (provisional — D07-4)

| Seam | EP07 side (implemented now) | EP06 side (not yet broken down) | Verification task |
|---|---|---|---|
| Session-duration default | EP07 reads `User.preferences.studyDefaults` when present and well-formed, else its own fallback default | EP06 defines the final preference shape | V-07-1: when EP06's preference shape lands, re-check the EP07 default resolution against it (the bag is currently only validated as a plain object of bounded size — `apps/api/src/modules/users/dto/update-user.dto.ts`) |
| Confirmed-time read API | EP07B ships `GET /study-sessions/confirmed-time` | EP06 consumes it to compute remaining work | V-07-2: when EP06 lands, point its remaining-work calculation at this endpoint instead of `Assignment.actualHours` |

Both seams are recorded as **provisional**: EP07's own acceptance criteria do not depend on EP06, so EP07's implementation is unblocked. EP05 (student dashboard) is also not yet broken down; the dashboard's "Today's study sessions" widget stays EP05's (D07-3).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D07-1 | **Extend `StudySession` in place; no new table.** The migration makes `endTime` nullable and adds a session status (ACTIVE / PAUSED / COMPLETED), an assignment link (nullable FK to `Assignment`), an optional task/subtask link, an elapsed-seconds accumulator and a planned/target duration. Planned sessions stay in EP06's `StudyPlan`/`ScheduledTask`; `StudySession` is the actual-time log — the epic's "separate planned from actual" requirement is already satisfied by that schema split. | User decision (settled 2026-10-29). |
| D07-2 | **The session is the source of truth for confirmed time.** `Assignment.actualHours` and `Task.actualMinutes` stay untouched (no API writes them today; `PATCH /assignments` rejects `actualHours` as a lifecycle field — `apps/api/src/modules/assignments/dto/update-assignment.dto.ts`). EP06 computes remaining work by summing confirmed session time. No denormalized copy on the assignment. | User decision (settled 2026-10-29). |
| D07-3 | **EP07 owns a study-history surface plus a read-only API for EP06.** The dashboard "Today's study sessions" widget stays EP05's; the full remaining-work view stays EP06's. EP07 delivers a history list for the student and an endpoint EP06 can consume for per-assignment confirmed time. | User decision (settled 2026-10-29). |
| D07-4 | **Plan EP07 now with a provisional EP06 seam.** EP07's own ACs do not need EP06. The seam is recorded with explicit verification tasks V-07-1 (session-duration default) and V-07-2 (confirmed-time read API). | User decision (settled 2026-10-29). |
| D07-5 | **EP07C, EP07D and EP07E are `Needs refinement`.** Focus-mode layout and information hierarchy, timer presentation, distraction reduction, subtask visibility, history layout, empty/loading/error states, copy, responsive behavior and keyboard behavior are deliberately undecided; the `ui-refiner` records them before implementation. EP07A, EP07B and EP07F are backend/integration work and need no `ui-refiner` pass. | Planner skill UI/UX handoff rule. |
| D07-6 | **One open session at a time** (provisional). Starting a session while another is `ACTIVE`/`PAUSED` returns 409. Backs the singular focus-mode model; reversible service check. | Planner-recorded contract detail derived from the epic's singular focus mode; provisional pending product confirmation. |
| D07-7 | **`elapsedSeconds` (raw, server-derived) and `durationMinutes` (confirmed)** are separate columns. `durationMinutes` is the existing "Calculated" column and becomes the confirmed log written by the finish endpoint; `elapsedSeconds` is the accumulator D07-1 adds. The client posts elapsed time never — only the optional confirmed adjustment. | Planner-recorded contract detail implementing D07-1 and D07-2; the epic's "persist confirmed elapsed time" requirement is met by `durationMinutes`. |
| D07-8 | **The calendar's null-`endTime` compatibility change is owned by EP07A**, because making `endTime` nullable is what breaks the EP04 calendar filter (`endTime: { gt: rangeStart }` excludes rows whose `endTime` is NULL). EP07F owns the **regression verification** of that behavior and the parent index. Keeping the code change with the migration avoids a window in which an in-progress session is silently missing from the calendar. | Planner-recorded ownership decision (sizing policy: one implementation owner per outcome; verification stays with the integration child). |
| D07-9 | **The dashboard's "Start Focus Session" quick action stays non-functional.** It is a dashboard surface, EP05 owns the dashboard, and EP05 is not yet broken down. It is not an EP07 acceptance criterion; EP07C's entry points are the assignments list and the course-detail surface. | Planner-recorded scope boundary derived from D07-3. |

## Code baseline (inspected 2026-10-29, not proposed)

- **Schema** `apps/api/prisma/schema.prisma`:
  - `model StudySession { id, userId (FK User, Cascade), startTime DateTime, endTime DateTime, durationMinutes Int @default(0), notes String?, isFocusMode Boolean @default(true), rating Int?, createdAt, updatedAt }` — **no assignment link, no status, both times required**.
  - `model Assignment { id, userId, courseId?, title, description?, dueDate DateTime?, estimatedHours Float?, actualHours Float?, status, priority, type, tasks Task[] }`.
  - `model Task { id, userId, assignmentId?, title, description?, dueDate DateTime?, estimatedMinutes Int?, actualMinutes Int?, status, priority, orderIndex }`.
  - `User.timeZone String @default("UTC")`, `User.preferences Json?` (schema comment: "future minimal prefs (EP06 study defaults)").
  - `StudyPlan` / `ScheduledTask` exist (EP06's planned-session tables) — `StudySession` is not linked to them.
- **No focus-session API exists.** `apps/api/src/modules/` = assignments, auth, availability, calendar, courses, email, onboarding, prisma, semesters, users. There is no `study-sessions` module.
- **Calendar reads `StudySession`** — `apps/api/src/modules/calendar/calendar.service.ts:204-209` queries `prisma.studySession.findMany({ where: { userId, startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } } })` and emits `type: 'STUDY_SESSION'` events (`:310-324`, `focus: s.isFocusMode` at `:322`). The mapping calls `zoneDateParts(s.endTime, timeZone)` at `:300` — with a nullable `endTime` this must be handled explicitly. Prisma's `gt` on a NULL column excludes the row, so an in-progress session silently disappears from the calendar. **Required cross-module change** (owned by EP07A per D07-8; verified by EP07F per TR-E07-07). Existing calendar specs: `calendar.service.spec.ts`, `calendar-data-scoping.spec.ts`, `calendar-e2e.spec.ts`.
- **Ownership convention** — `apps/api/src/common/ownership/ownership.ts`: every academic query carries the authenticated `userId` (`ownedWhere` / `assertOwned` / `assertAffected`); a missing and a foreign record both return the same uniform 404 `Resource not found` (never 403 — no existence oracle). `StudySession` is already named in that convention's scope list.
- **Assignments API** — `apps/api/src/modules/assignments/assignments.controller.ts`: `POST /assignments`, `GET /assignments` (filter/sort DTO), `PATCH /assignments/:id` (partial merge), `DELETE /assignments/:id`, and `GET|POST|PATCH|DELETE /assignments/:id/subtasks` (the 6-key subtask projection). `GET /assignments/:id/subtasks` exists, but the checklist UI reads the course projection instead (D120-5).
- **Module pattern to copy** — `apps/api/src/modules/availability/` (`availability.controller.ts`, `availability.service.ts`, `availability.module.ts`, `dto/`, `*.service.spec.ts`, `*data-scoping.spec.ts`, `*e2e.spec.ts`) is the closest precedent for a new CRUD-ish module: DTO re-validation for non-HTTP callers, `ConflictException` for state conflicts, `assertAffected` for scoped writes, and a projection function that never exposes `userId`. Registration point: `apps/api/src/app.module.ts`.
- **Frontend routes** — `apps/web/src/app/App.tsx`: the `ProtectedRoute` block holds `/dashboard`, `/semesters`, `/courses`, `/courses/:id`, `/assignments`, `/calendar`, `/availability`, `/profile`, `/onboarding`. **No focus route exists.**
- **Frontend entry surfaces** — `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` renders `AssignmentRow` (`apps/web/src/features/assignments/ui/AssignmentRow.tsx`) which renders `RowActionsMenu` and `SubtaskChecklist`; the course-detail page renders `AssignmentsSection` (`apps/web/src/features/assignments/ui/AssignmentsSection.tsx`) → the same `AssignmentRow`. `apps/web/src/pages/dashboard/ui/DashboardPage.tsx:38-43` renders a non-functional "Start Focus Session" quick-action button (D07-9).
- **Frontend data layer** — `apps/web/src/entities/assignment/api/assignmentApi.ts` holds the assignment/subtask client functions over the shared axios transport `apps/web/src/shared/api/httpClient.ts` (base URL `/api`; the Vite proxy strips `/api` — `apps/web/vite.config.ts:15-26`). `apps/web/src/shared/types/academic.ts` holds the shared web types (it already declares a `StudySession` interface that mirrors the old schema and will need updating).
- **FSD layers enforced** by `apps/web/.eslintrc.cjs` (`import/no-restricted-paths`); `@/` alias; new work goes in `features/` / `pages/` / `entities/`, never flat top-level.
- **Design system (EP10, implemented and parent-reviewed)** — semantic tokens in `apps/web/tailwind.config.js` + `apps/web/src/index.css`; primitives in `apps/web/src/shared/ui/` (`Button, Input, Select, Card, Dialog, Badge, EmptyState`); reduced motion via token durations; tap targets ≥44px; visible focus rings. EP07 UI must use these — no ad-hoc colors or spacing.
- **Testing conventions** — API unit/data-scoping specs beside the module (`*.service.spec.ts`, `*data-scoping.spec.ts`), API e2e specs in the module folder (`assignments-e2e.spec.ts`, `subtasks-e2e.spec.ts`), web component tests beside components, and browser e2e in `apps/web/e2e/` (`login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`) against the self-contained EP09 stack.
- **Unverified (not inspected / not decided here):** the exact `ui-refiner` presentation decisions for EP07C/D/E; EP06's final preference shape and its remaining-work calculation (EP06 is not broken down); EP05's dashboard widget shape; browser rendering of any proposed focus-mode layout (no screenshots taken).

## Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A student's session is unreachable by another student | Student B pauses student A's session id, or queries `GET /study-sessions/confirmed-time?assignmentId=<A's assignment>` | Every query carries the authenticated `userId` (`ownedWhere` / `assertOwned` / `assertAffected`); missing and foreign records return the identical uniform 404 `Resource not found` — never 403, never a distinct message | TR-E07-01, TR-E07-02 |
| Finishing a session never silently completes the assignment | A student finishes a session and the assignment's `status` flips to `COMPLETED` (or `actualHours` changes) | The finish endpoint writes only `StudySession` fields; it never writes `Assignment.status` / `actualHours` / `Task.actualMinutes` (D07-2). The test asserts the assignment row is unchanged field-for-field | TR-E07-02, TR-E07-06 |
| A reloaded session is never auto-completed | The browser reloads `/focus` while a session is ACTIVE; the session becomes COMPLETED with a bogus elapsed time | Reload performs only `GET /study-sessions/current`; elapsed time is re-derived from stored timestamps; a session becomes COMPLETED only through `POST /study-sessions/:id/finish` | TR-E07-04, TR-E07-06 |
| Elapsed time is not counted from browser ticks | The tab is throttled or backgrounded and the recorded minutes drift from reality | The server measures the running segment from persisted timestamps at pause/finish; the client never submits elapsed time (only the optional confirmed adjustment) | TR-E07-01, TR-E07-04 |
| A concurrent double-submit cannot double-count time | Two pause requests race and the elapsed segment is added twice | Pause/resume/finish apply a status-guarded `updateMany` (`where: { id, userId, status }`) and assert the affected count; the loser affects 0 rows → 409 | TR-E07-01 |
| An in-progress session cannot silently vanish from the calendar | `endTime` is null and the calendar's `endTime: { gt: rangeStart }` filter excludes the row | The calendar query handles open sessions explicitly and the event mapping renders an in-progress end time (EP07A code change; D07-8) | TR-E07-07 |
| Confirmed time reaches remaining-work calculations | EP06 sums `Assignment.actualHours` (never written) and always gets 0 | The session log is the source of truth (D07-2); `GET /study-sessions/confirmed-time` returns per-assignment confirmed minutes; EP06 consumes that endpoint (provisional seam V-07-2) | TR-E07-02, TR-E07-06 |
| Only one session is open at a time | The student starts a second session while one is ACTIVE and the two timers run at once | The start endpoint rejects a second open session with 409 (provisional, D07-6) | TR-E07-01 |
| The focus-mode surface is operable without a mouse | A student cannot start, pause, resume or finish the timer using only the keyboard | Every control is a native button with a visible focus ring; the timer exposes a live region; EP07D's ACs and TR-E07-04/08 verify it | TR-E07-04, TR-E07-08 |

## Plan correction log

(First plan of this epic. No plan-review pass yet.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | No findings yet. | — | — | — |

## Quality gate (2026-10-29)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP07C, EP07D and EP07E are `Needs refinement` (D07-5): the focus-mode layout and information hierarchy, the timer presentation, the distraction-reduction approach, the subtask visibility, the history layout, the empty/loading/error states, the copy, the responsive behavior and the keyboard behavior are deliberately undecided and must be settled by the `ui-refiner` before those children are implemented. EP07A, EP07B and EP07F carry no UI decisions and are ready to implement. **No implementation blocker exists** beyond refinement: EP03 is complete, and the EP06 seam stays provisional (V-07-1, V-07-2) because EP07's own acceptance criteria do not depend on EP06. EP05 is also not yet broken down, so the dashboard's "Start Focus Session" quick action stays non-functional by decision (D07-9).

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Six children, each a substantive outcome (persistence/lifecycle API, completion/read API, start entry points, focus-mode interface, completion+history surface, cross-layer E2E + calendar regression + parent index). No README-only/status-only/evidence-only child. Each split has a stated reason: the backend/frontend seam (substantial independent work on each side), the focus interface as its own screen, and the integration child (a **new Playwright suite** plus the calendar regression harness plus the parent index — real integration implementation and a substantial new test harness, not routine verification). |
| 2 | Original AC/TR coverage | Pass | All eight epic ACs mapped to owners above; eight TRs assigned (TR-E07-01…08). Every AC has at least one owning child and every TR has a named owner. |
| 3 | Definition of Done | Pass | DoD map above; items 10/11 belong to the combined EP07 parent review; the per-child DoD lists carry a justified N/A reason for every item that does not apply to that layer. |
| 4 | Contract consistency | Pass | One shared API/data contract section (endpoints, projection, lifecycle, timestamp bookkeeping, validation bounds, error contract); EP07A/EP07B implement, EP07C/D/E consume, EP07F verifies. The EP06 seam is recorded with its two verification tasks. |
| 5 | Code paths inspected | Pass | Code baseline section above (schema, calendar query and mapping, ownership helpers, assignments API, module pattern, routes, entry surfaces, entity clients, FSD, EP10 design system, testing conventions). Unverified items are disclosed there: the `ui-refiner` decisions, EP06's preference shape, EP05's widget shape, and any browser rendering (no screenshots taken). |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table above — nine claims with concrete counterexamples: cross-student access, no assignment completion, no auto-complete on reload, server-derived time, the lost race on a double pause, the calendar's null `endTime`, the confirmed-time read, one open session, and keyboard operability. |
| 7 | Dependencies | Pass | EP07A → EP07B → EP07C → EP07D → EP07E → EP07F, with the one-way frontend dependency (EP07C navigates into EP07D's route) and the accepted inter-commit transient recorded. EP06/EP05 are not broken down; the EP06 seam stays provisional (V-07-1, V-07-2). EP03 is complete. |
| 8 | Material decisions | Blocked | D07-1…D07-4 are settled user decisions (2026-10-29). D07-5 (the three frontend children's UI/UX) is unresolved and is the `ui-refiner`'s to settle — this is what keeps the verdict at `Draft`. D07-6 (one open session at a time) is provisional and reversible. |
| 9 | Correction log | Pass | First plan of this epic; no plan-review pass yet. The log is initialized with no findings. |
| 10 | Jira identity | Not applicable | No sync authorized; the epic key is STUDY-13 and all six child keys are `Pending creation`. |

## Implementation review log

(No implementation yet.)

## Final implementation review unit

One combined review for the EP07 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP07](./README.md) | EP07A, EP07B, EP07C, EP07D, EP07E, EP07F | `./artifacts/EP07/` | EP07F (writes `./artifacts/EP07/implementation.md`, including the cross-layer E2E and calendar-regression evidence) | One combined EP07 review after all six children (`review.md` + `walkthrough.md`) |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP07C, EP07D and EP07E must complete their `ui-refiner` pass before implementation.

## Autopilot

```yaml
version: 1
scope:
  parent: EP07
  descendants: [EP07A, EP07B, EP07C, EP07D, EP07E, EP07F]
  entry: planning
  limits: enclosing parent review unit
stage: plan
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: "8e31c0d"
  head: "535ffa2"
active_dispatch:
  name: ep07-planner-1
  role: planner
  status: returned
  pointer: docs/stories/EP07/README.md
  session: ""
  assignment: plan
last_result:
  evidence: "Breakdown committed: 6e0088d (EP07A + README), f5e8e42 (EP07B), 80b1dc6 (EP07C), 94d3f3a (EP07D), 617673c (EP07E), 1a97087 (EP07F + README consolidation), 535ffa2 (EP07E scope vs the EP06 remaining-work boundary). All commits touch docs/stories/EP07/** only; the unrelated dirty apps/api/tsconfig.json was preserved unstaged."
  findings: "None. Planner recorded D07-1…D07-9 (D07-1…D07-4 user-settled; D07-5 the ui-refiner handoff; D07-6 one-open-session provisional; D07-7 elapsed vs confirmed columns; D07-8 the calendar compatibility change owned by EP07A; D07-9 the dashboard quick action stays EP05's)."
  scope_note: "Planning only — no implementation, no Jira sync (children stay `Pending creation`). Verdict Draft: EP07A/EP07B/EP07F ready; EP07C/D/E await the ui-refiner pass (D07-5). EP06 seam recorded as provisional (V-07-1, V-07-2)."
  cycles: 0
  same_findings: unknown
gates:
  breakdown: true
  plan: draft
  ui: unknown
  refinement: false
  child_unfinished: false
  eligible_child_state: Queued
  closeout: unknown
  integration: unknown
  all_descendants_implemented: false
  review: absent
  findings_owner: none
  open_findings: false
  walkthrough: missing
  judged_at_head: "535ffa2"
  queue_hash: "ep07-queue-v1"
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
