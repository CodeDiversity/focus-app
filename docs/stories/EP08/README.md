# EP08 Story Breakdown — Catch-Up & Recovery

**Epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4 (Catch-up workflow and complete MVP)
**Epic dependency:** EP06 (Study Planning & Scheduling — complete, parent review passed 2026-10-30) and EP07 (Focus Sessions & Time Tracking — complete, parent review passed 2026-10-30). EP08 reuses the EP06 scheduling engine and the EP07 session log; it adds no new scheduling algorithm.
**Status:** Breakdown complete (planner). Plan-review gate: **Changes Required** (pass 2, 2026-10-30) — planner correction pass applied (PR-001…PR-011); awaiting independent re-review. Jira keys: Pending creation (no sync authorized for this planning task).
**Jira keys:** Pending creation.

## Execution queue

**Delivery home:** `docs/stories/EP08/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP08A/`, …, `./artifacts/EP08F/`, plus `./artifacts/EP08/` for the parent implementation index, combined review and walkthrough.

**Active substory:** None.

**Next substory:** [EP08A](./EP08A-missed-sessions-and-recovery-summary-read-api.md) — refine/implement (backend read-side spine; no UI decisions; no `ui-refiner` pass required).

**Implementation owner:** `implementer`, one sequential writer across all layers (Backend/Frontend/Integration labels are scope, not concurrent roles).

**Final review:** one combined review for the EP08 parent review unit — all six children — after EP08F is implemented. Reviewer artifacts: `./artifacts/EP08/review.md` + `./artifacts/EP08/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP08A](./EP08A-missed-sessions-and-recovery-summary-read-api.md) | Queued | EP06 + EP07 complete/reviewed. D08-1…D08-8 recorded below. No UI decisions (D08-7). | Refine then implement (backend read-side spine). | — |
| [EP08B](./EP08B-deterministic-workload-rescheduling.md) | Queued | EP06 engine (`domain/study-planning/scheduler.ts`, `intervals.ts`, `ordering.ts`) and EP08A's recovery summary (the missed/unfinished inputs). | Implement after EP08A (pure domain module; independently testable). | — |
| [EP08C](./EP08C-catch-up-plan-preview-confirmation-and-feasibility-api.md) | Queued | EP08A + EP08B implemented. EP06 save/conflict primitives reused. | Implement after EP08B (backend API + transactional persistence). | — |
| [EP08D](./EP08D-recovery-summary-and-replanning-entry-point-ui.md) | Needs refinement | EP08A implemented (the read API). **`ui-refiner` pass required** (D08-7) — layout, copy/tone (non-blaming), states, a11y, responsive. | `ui-refiner` on EP08D before implementation. | — |
| [EP08E](./EP08E-catch-up-plan-preview-edit-confirm-and-decline-ui.md) | Needs refinement | EP08C implemented (the preview/confirm API). **`ui-refiner` pass required** (D08-7). | `ui-refiner` on EP08E before implementation. | — |
| [EP08F](./EP08F-cross-layer-e2e-and-parent-index.md) | Queued | EP08A–EP08E implemented. | Implement after EP08E (new Playwright spec + parent index). | — |

Sequence (one writer): EP08A → EP08B → EP08C → EP08D → EP08E → EP08F. EP08A is the read-side spine; EP08B is the pure-domain rescheduler; EP08C is the API/persistence spine; the two frontend children consume them; EP08F verifies the whole stack and owns the parent index.

**Do not start EP08D or EP08E before their `ui-refiner` pass** — the recovery summary's layout and information hierarchy, the "behind" messaging tone (non-blaming, no punitive copy), the replanning entry point, the catch-up preview/edit/confirm/decline interaction model, the feasibility-warning presentation, the empty/loading/error states, the responsive behavior and the keyboard behavior are deliberately undecided (D08-7). EP08A, EP08B, EP08C and EP08F are backend/domain/integration work and need no `ui-refiner` pass.

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP08A](./EP08A-missed-sessions-and-recovery-summary-read-api.md) | 1. Implement missed-session identification + 2. Build an unfinished-work recovery summary (backend halves) | Backend | Pending creation |
| [EP08B](./EP08B-deterministic-workload-rescheduling.md) | 3. Implement deterministic workload rescheduling (pure domain) | Backend (pure domain module) | Pending creation |
| [EP08C](./EP08C-catch-up-plan-preview-confirmation-and-feasibility-api.md) | 4. Build catch-up plan preview and confirmation (backend half) + 5. Implement deadline feasibility and conflict warnings (backend half) | Backend | Pending creation |
| [EP08D](./EP08D-recovery-summary-and-replanning-entry-point-ui.md) | 2. Build an unfinished-work recovery summary (frontend half) + manual replanning trigger | Frontend | Pending creation |
| [EP08E](./EP08E-catch-up-plan-preview-edit-confirm-and-decline-ui.md) | 4. Build catch-up plan preview and confirmation (frontend half) + 5. Implement deadline feasibility and conflict warnings (frontend half) | Frontend | Pending creation |
| [EP08F](./EP08F-cross-layer-e2e-and-parent-index.md) | Cross-layer verification of all five proposed stories + the EP08 parent index | Integration | Pending creation |

All five of the epic's proposed stories are covered. The split follows the epic's own seams: missed-session/recovery read side (backend), the deterministic rescheduler (a pure domain module reusing the EP06 engine), the preview/confirm/feasibility API (backend), the student-facing surfaces (frontend), plus one integration child.

**Why the rescheduler is its own child (EP08B) rather than folded into EP08C.** The epic's Technical Notes require reusing the EP06 scheduling engine rather than creating a separate algorithm; the catch-up replan is a pure function over unfinished assignments + locked/completed sessions + current availability. Keeping it as a pure domain module (like EP06C) makes it independently unit-testable (ordering, locked preservation, completed preservation, determinism) and lets EP08C own only the HTTP/persistence concerns. Folding it into EP08C would bury the reuse contract and the invariants (AC-E08-03, AC-E08-06, AC-E08-08) in service code.

**Why a separate integration child exists (not a padded verification child).** EP08F adds a **new Playwright spec suite** against the self-contained EP09 stack (`apps/web/e2e/catch-up.spec.ts`) covering the full replan journey (missed sessions → preview → edit → confirm → reload, decline leaving the plan unchanged, locked-session preservation, feasibility-warning display, completed-assignment exclusion), plus the **parent implementation index**. That is real integration implementation and a substantial new test harness, not routine verification.

## Epic acceptance criteria — ownership

Original wording from [EP08](../../epics/EP08-catch-up-and-recovery.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Missed planned study sessions can be identified without treating a completed assignment as unfinished. | AC-E08-01 | **EP08A** (missed-session query + completed-assignment exclusion), **EP08D** (display), **EP08F** (cross-layer proof). |
| Students can initiate replanning manually. | AC-E08-02 | **EP08D** (entry point), **EP08C** (endpoint), **EP08F**. |
| Completed work and historical study logs remain unchanged. | AC-E08-03 | **EP08C** (confirm writes only planned sessions; never `StudySession`/`Assignment`), **EP08B** (engine is pure — no writes), **EP08F** (cross-layer proof that sessions/assignments are unchanged). |
| Replacement sessions respect current availability and existing commitments. | AC-E08-04 | **EP08B** (engine uses current availability + busy from confirmed sessions/locked sessions), **EP08C** (gathers current data), **EP08F**. |
| Students can preview changes before confirming them. | AC-E08-05 | **EP08C** (side-effect-free preview), **EP08E** (preview UI), **EP08F**. |
| Manually locked sessions are preserved during replanning. | AC-E08-06 | **EP08C** (confirm preserves locked sessions), **EP08B** (locked treated as busy / never moved), **EP08F** (cross-layer proof). |
| The app reports any work that cannot be accommodated before its deadline. | AC-E08-07 | **EP08C** (feasibility warnings in the preview payload), **EP08E** (display), **EP08F**. |
| Replanning never silently extends assignment deadlines. | AC-E08-08 | **EP08B** (engine is pure — no write path to assignments), **EP08C** (service writes only plan rows; test asserts assignment rows are unchanged), **EP08F**. |
| Students can decline proposed schedule changes. | AC-E08-09 | **EP08C** (preview is side-effect-free; decline = no confirm call), **EP08E** (decline control), **EP08F**. |

## Requirement and test traceability

The epic defines no test requirements (TR-*); stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| AC-E08-01 | Missed planned sessions identified; completed assignments excluded | EP08A, EP08D, EP08F |
| AC-E08-02 | Manual replanning initiation | EP08D, EP08C, EP08F |
| AC-E08-03 | Completed work and historical study logs unchanged | EP08C, EP08B, EP08F |
| AC-E08-04 | Replacement sessions respect availability and commitments | EP08B, EP08C, EP08F |
| AC-E08-05 | Preview changes before confirming | EP08C, EP08E, EP08F |
| AC-E08-06 | Manually locked sessions preserved | EP08C, EP08B, EP08F |
| AC-E08-07 | Report work that cannot be accommodated before its deadline | EP08C, EP08E, EP08F |
| AC-E08-08 | Replanning never extends assignment deadlines | EP08B, EP08C, EP08F |
| AC-E08-09 | Decline proposed schedule changes | EP08C, EP08E, EP08F |
| TR-E08-01 | Missed-session identification tests: the past-date + SCHEDULED classification, the completed-assignment exclusion, the unfinished-assignment inclusion, the ownership-scoped query, the uniform 404, the empty case | EP08A |
| TR-E08-02 | Recovery-summary tests: the missed-session aggregation, the unfinished-work reuse of EP06's remaining-work classification, the confirmed-minutes total, the non-blaming message presence, the empty/loading/error states at the API boundary | EP08A |
| TR-E08-03 | Rescheduling engine tests: reuse of `schedule()` (no second algorithm), locked-session preservation (never moved/deleted), completed-session preservation (treated as busy), completed-assignment exclusion, determinism across runs, purity (no writes, no clock, no randomness), deficit/feasibility categories surfaced | EP08B |
| TR-E08-04 | Catch-up API tests: preview side-effect-free, confirm atomic and preserves completed + locked sessions, conflict re-check on confirm (409) with per-session reasons, **unedited confirm succeeds with no conflicts**, malformed-session matrix (400), window-rollover (409 `WINDOW_ROLLED_OVER`), foreign-assignment uniform 404, assignment rows unchanged after confirm (AC-E08-08), decline leaves state unchanged, missed-session list correctness | EP08C |
| TR-E08-05 | Recovery-summary UI tests: missed sessions list, unfinished-work rows, non-blaming copy, entry point to replan, loading/empty/error states, keyboard operability, narrow-screen layout | EP08D |
| TR-E08-06 | Catch-up plan UI tests: generate → preview → edit → confirm, decline leaves plan unchanged, feasibility-warning display, locked-session indicator, loading/empty/error states, keyboard operability, narrow-screen layout | EP08E |
| TR-E08-07 | Cross-layer E2E against the real stack: the full replan journey, decline, locked preservation, feasibility warning, completed-assignment exclusion, saved plan surviving a reload, API and web suites and pre-existing E2E specs staying green | EP08F |
| TR-E08-08 | Manual accessibility pass recorded for the recovery and catch-up surfaces (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) | EP08D, EP08E (recorded), EP08F (collected for the combined review) |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP08A (query validation), EP08C (session matrix, range caps), EP08D (client-side mirror), EP08E (edit inputs) |
| 3 student data scoping | EP08A, EP08C, EP08F |
| 4 actionable API errors | EP08A, EP08C, EP08D, EP08E |
| 5 loading, empty, and error states | EP08D, EP08E |
| 6 keyboard accessibility | EP08D, EP08E |
| 7 responsive layouts | EP08D, EP08E |
| 8 automated tests | All children (TR-E08-01…07); TR-E08-08 is a recorded manual pass owned by EP08D/EP08E with EP08F collecting the evidence |
| 9 API/migration documentation | EP08A (recovery contract + migration, locked field), EP08C (catch-up contract), EP08F (parent index) |
| 10 integrated review | EP08 parent review unit (all six children) |
| 11 reviewer walkthrough | Reviewer, once for the EP08 parent review unit |

## Shared API and data contract

This is the seam between EP08A/EP08B/EP08C (which implement it) and EP08D/EP08E (which consume it) and EP08F (which verifies it end to end). Field names, bounds and status codes below are the stable part; the presentation is settled by the `ui-refiner` pass (D08-7).

### Data model (EP08A owns the additive migration; EP08C consumes it — D08-4, settled 2026-10-30)

One additive migration: `PlannedSession` gains a `locked` flag. No new table; no change to `StudySession` (historical logs stay untouched — AC-E08-03).

```prisma
model PlannedSession {
  // ... existing EP06 fields ...
  locked Boolean @default(false)
}
```

- `locked` defaults to `false`; existing rows are unaffected (backfill = default).
- A locked session is **never** moved, resized or deleted by replanning: it stays where it is and is treated as busy (so new placements cannot overlap it). It is also never re-generated by the engine.
- Rollback: drop the column; no data loss beyond the flag.
- **Settled (D08-4, 2026-10-30):** "locked" is an explicit student toggle (not derived from status) — V-08-1 resolved by user decision. The toggle affordance itself is a UI decision and must be settled by the `ui-refiner` (EP08E) before implementation.

### Missed session (derived, not stored)

A `PlannedSession` is **missed** when all of the following hold:
- its `StudyPlan.date` (stored as UTC midnight of the civil date string, EP06 convention) is strictly before `new Date(`${formatToday(timeZone)}T00:00:00.000Z`)` — the civil "today" rendered as a UTC-midnight `Date`. Do **not** convert a profile-zone midnight to an instant (that shifts the boundary for non-UTC profiles).
- its `status === 'SCHEDULED'` (not `COMPLETED`, `SKIPPED`, `RESCHEDULED` or `IN_PROGRESS`);
- its linked `Assignment.status` is `PENDING` or `IN_PROGRESS` (a `COMPLETED` assignment's planned sessions are **not** missed work — AC-E08-01).

`locked` does not change missed-ness; a locked past session is still reported as missed but is never replaced.

### Endpoints

Paths are relative to the API root; the web client calls them through the `/api` Vite proxy.

| Method & path | Owner | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /study-plans/recovery-summary` | EP08A | — | 200 → `RecoverySummary` | 401, 404 uniform |
| `POST /study-plans/catch-up/preview` | EP08C | — (no body; no window input) | 200 → `CatchUpPreview` | 401, 404 uniform |
| `POST /study-plans/catch-up/confirm` | EP08C | `{ from, to, sessions: [{ assignmentId, date, startTime, endTime }] }` (same shape as `POST /study-plans`, D06-23) | 201 → `SavedPlan` | 400 field-level errors; 409 conflicts; 409 `WINDOW_ROLLED_OVER`; 404 uniform; 401 |
| `GET /study-plans` (existing) | EP06D | unchanged — the saved catch-up plan is read through the existing endpoint | 200 → `SavedPlan` | unchanged |

Declining a proposal is **client-side**: the preview is side-effect-free, so declining is simply not calling `confirm`. No server-side decline endpoint is required (settled 2026-10-30, V-08-4 resolved by user decision accepting the planner's recommendation).

### Shapes

`MissedSession` (never exposes `userId`):
```jsonc
{
  "id": "string",                 // PlannedSession.id
  "assignmentId": "string",
  "assignmentTitle": "string",
  "date": "YYYY-MM-DD",           // profile zone civil date
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "durationMinutes": 60,
  "locked": false
}
```

`RecoverySummary`:
```jsonc
{
  "missedSessions": [ MissedSession ],
  "missedCount": 0,
  "unfinishedWork": [ RemainingWorkItem ],   // reuse EP06's shape/ordering
  "confirmedMinutes": 0,                      // total confirmed minutes (session log)
  "message": "string"                         // neutral, non-blaming copy (D08-8)
}
```

`CatchUpPreview` (extends `PlanPreview` with catch-up specifics):
```jsonc
{
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "timeZone": "string",
  "generatedAt": "ISO-8601",
  "preferences": { ... },                     // EP06 shape
  "days": [ { "date", "targetMinutes", "sessions": [ { "assignmentId", "assignmentTitle", "startTime", "endTime", "durationMinutes" } ] } ],
  "warnings": [ { "assignmentId", "assignmentTitle", "category", "minutes", "dueDate" } ],   // reuse EP06 categories
  "deferred": [ { "assignmentId", "minutes" } ],
  "missedSessions": [ MissedSession ],
  "lockedPreserved": 0,                       // count of locked sessions left untouched
  "completedPreserved": 0                     // count of completed sessions left untouched
}
```

`missedSessions` in the preview lists the sessions being recovered from; `lockedPreserved`/`completedPreserved` are counts only (the sessions themselves are not duplicated in `days`).

### Reuse of the EP06 engine (D08-1)

EP08B does **not** implement a new scheduler. It builds a `replan(...)` function that:
1. Collects the unfinished assignments (EP06's `classifyAssignments` → schedulable), excluding completed assignments.
2. Builds the busy set from **current** availability data: blocked windows, class meetings, confirmed `StudySession` intervals, **completed** `PlannedSession` intervals and **locked** `PlannedSession` intervals.
3. Calls EP06's `schedule(...)` (the same function) with the unfinished assignments and that busy set, over the same 7-day window.
4. Returns the proposed sessions + the engine's deficit/feasibility warnings unchanged.

The engine stays pure; `replan` is pure too (no writes, no clock, no randomness — "today" and the window are supplied by the caller). All reuse is through the named helpers `schedule`, `classifyAssignments`, `compareAssignments`, `freeIntervals` — no copy of the subtraction logic.

### Confirm transaction (EP08C)

On confirm, inside one Prisma transaction:
1. Validate the window (same rules as EP06D save, including `WINDOW_ROLLED_OVER`).
2. Run the conflict re-check using EP06's `findConflicts` (same helper), with the busy set = confirmed `StudySession`s + completed `PlannedSession`s + locked `PlannedSession`s + the *other submitted* sessions. **Excluded from busy:** the SCHEDULED non-locked `PlannedSession`s in `[from, to]` that are being replaced — including them would make every unedited confirm return 409. (PR-002)
3. Delete only `PlannedSession` rows whose `status === 'SCHEDULED'` **and** `locked === false` within `[from, to]`. Completed, in-progress, skipped, rescheduled and locked rows are preserved.
4. Upsert `StudyPlan` rows per day, with `targetHours = (sum of submitted session durations on that day) / 60` computed from `dto.sessions` in the transaction — not carried over from the preview. Days with no submitted sessions get `targetHours = 0`. (PR-007)
5. Insert the submitted proposed sessions with `status: 'SCHEDULED'`, `locked: false`.
6. Never touch `StudySession`, `Assignment`, `Task` or any historical log (AC-E08-03, AC-E08-08).

The conflict re-check attributes reasons with EP06's `overlaps` primitive in the same precedence order.

### Decision register

| ID | Decision | Provenance |
|---|---|---|
| D08-1 | **Reuse the EP06 scheduling engine; no separate algorithm.** Catch-up replan is a proposed plan over unfinished assignments produced by calling EP06's `schedule(...)` with a busy set that includes completed + locked sessions. | Epic Technical Notes (settled). |
| D08-2 | **Replanning is a proposed change set.** Preview is side-effect-free; confirm persists transactionally; decline persists nothing. | Epic Technical Notes (settled). |
| D08-3 | **Completed work and historical study logs are never touched.** Confirm writes only `StudyPlan`/`PlannedSession` rows; `StudySession`, `Assignment`, `Task` are read-only in EP08. | Epic AC (settled). |
| D08-4 | **Manually locked sessions are preserved** — settled 2026-10-30. Add `locked Boolean @default(false)` to `PlannedSession`; locked sessions are never moved/deleted and are treated as busy. **Locked is an explicit student toggle** (not derived from `IN_PROGRESS`/`COMPLETED` status) — V-08-1 resolved by user decision 2026-10-30. The toggle affordance is a UI decision and must be settled by the `ui-refiner` (EP08E) before implementation. | User decision 2026-10-30 accepting the planner's recommendation (explicit toggle). |
| D08-5 | **Missed session definition** — provisional (date boundary only). A `PlannedSession` is missed when its civil date < today, status `SCHEDULED`, and its assignment is `PENDING`/`IN_PROGRESS` (assignment-status filter settled by reuse of EP06's `isUnfinishedStatus`; PR-005). Verification task V-08-2 confirms the date boundary only. | Planner-recorded provisional definition; derived from AC-E08-01. |
| D08-6 | **Catch-up window = next 7 days starting today** (same as EP06) — settled 2026-10-30 (V-08-3 resolved by user decision accepting the planner's recommendation). Work that cannot fit before its deadline is reported via the engine's deficit categories. | User decision 2026-10-30 accepting the planner's recommendation (7 days for consistency with EP06). |
| D08-7 | **EP08D and EP08E are `Needs refinement`.** Recovery-summary layout, the "behind" messaging tone (neutral, non-blaming, no punitive copy), the replanning entry point, the catch-up preview/edit/confirm/decline interaction model, feasibility-warning presentation, empty/loading/error states, copy, responsive behavior and keyboard behavior are deliberately undecided; the `ui-refiner` records them before implementation. EP08A, EP08B, EP08C and EP08F are backend/domain/integration work and need no `ui-refiner` pass. | Planner skill UI/UX handoff rule. |
| D08-8 | **No blame or punitive messaging.** All user-facing copy in the recovery and catch-up surfaces must be neutral/encouraging; no "you missed", "you failed", "overdue" shaming. The `RecoverySummary.message` and warning copy are subject to the `ui-refiner`. | Epic description (settled product requirement). |

### Verification tasks

- **V-08-1:** Resolved 2026-10-30 by user decision — "locked" is an explicit student toggle (not derived from status). (D08-4)
- **V-08-2:** Confirm the missed-session date boundary (strictly before today vs. end of the session's day). The assignment-status filter is settled by reuse of EP06's `isUnfinishedStatus` (PENDING/IN_PROGRESS only; COMPLETED/SUBMITTED/GRADED excluded) — not an open product decision (PR-005).
- **V-08-3:** Resolved 2026-10-30 by user decision — catch-up horizon = 7 days (consistent with EP06). (D08-6)
- **V-08-4:** Resolved 2026-10-30 by user decision — decline is client-side (no server-side audit record). (settled)
- **V-08-5:** When EP08 lands, ensure EP06's `gatherPlanData`/`getRemainingWork` confirmed-time aggregation is upgraded to the State-B shape (EP07 sessions) if not already — EP06's provisional seam V-07-2. EP08 reuses the same confirmed-time source. (cross-epic)

### Code baseline (inspected, not proposed)

- **Schema** `apps/api/prisma/schema.prisma`: `PlannedSession` (EP06) with `status PlannedSessionStatus` (SCHEDULED/IN_PROGRESS/COMPLETED/SKIPPED/RESCHEDULED), `StudyPlan` per-day container, `StudySession` (EP07) with nullable `endTime`, `status`, `assignmentId`, `elapsedSeconds`, `durationMinutes`. `Assignment.status` (PENDING/IN_PROGRESS/COMPLETED/...). `User.timeZone`, `User.preferences`.
- **EP06 engine** `apps/api/src/domain/study-planning/`: `scheduler.ts` (`schedule`), `intervals.ts` (`freeIntervals`, `overlaps`, `mergeIntervals`, `subtractIntervals`), `ordering.ts` (`compareAssignments`), `remaining-work.ts` (`classifyAssignments`), `conflicts.ts` (`findConflicts`), `types.ts`, `preferences.ts`.
- **EP06 service** `apps/api/src/modules/study-plans/study-plans.service.ts`: `getPreferences`, `updatePreferences`, `getRemainingWork`, `preview`, `save`, `getPlan`, `gatherPlanData`. EP08 extends this module (or a sibling) with recovery/catch-up methods. `gatherPlanData` is private; EP08 may need to refactor it for reuse — record as implementation detail, not a contract change.
- **EP07 session log** `apps/api/src/modules/study-sessions/`: `GET /study-sessions/confirmed-time` returns per-assignment confirmed minutes. EP06 currently owns its own read of the session log (State A/B); EP08 reuses the same confirmed-time source (V-08-5).
- **Ownership** `apps/api/src/common/ownership/ownership.ts`: `ownedWhere`/`assertOwned`/`assertAffected`; uniform 404 `Resource not found`. `PlannedSession` is scoped through `studyPlan.userId`.
- **Frontend** `apps/web/src/pages/plan/ui/PlanPage.tsx`, `apps/web/src/features/study-plan/...`, routes in `apps/web/src/app/App.tsx` (`/plan`). EP08 adds recovery/catch-up surfaces; routes to be added by implementer (`/catch-up` or section on `/plan` — provisional, ui-refiner decides).
- **E2E stack** `apps/web/e2e/study-plan.spec.ts`, `study-sessions.spec.ts` against the self-contained EP09 stack (`global-setup.ts`/`global-teardown.ts`, `helpers.ts`, `test-env.ts`).
- **Design system (EP10, implemented)** semantic tokens, primitives in `shared/ui/`. EP08 UI must use them.

Unverified (not inspected / not decided here): the `ui-refiner` decisions for EP08D/E; the missed-session date boundary and assignment-status filter (V-08-2); browser rendering of any proposed layout (no screenshots taken). (V-08-1, V-08-3 and V-08-4 resolved 2026-10-30.)

### Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A student cannot read or replan another student's plan | Student B calls `GET /study-plans/recovery-summary` or `POST /study-plans/catch-up/preview` with A's data in play | Every query carries the authenticated `userId` (`ownedWhere`/`assertOwned`/`assertAffected`); foreign records return the uniform 404 `Resource not found` | TR-E08-01, TR-E08-04 |
| Confirm never touches historical logs or assignments | A confirm call silently flips an assignment to COMPLETED or deletes a `StudySession` | Confirm writes only `StudyPlan`/`PlannedSession` rows in one transaction; `StudySession`/`Assignment`/`Task` are never written (AC-E08-03, AC-E08-08); test asserts assignment rows unchanged field-for-field | TR-E08-04, TR-E08-07 |
| Replanning never extends a deadline | A rescheduled session lands after the assignment's due date and the assignment's due date moves | The engine never writes assignments; due dates are inputs, not outputs; confirm writes only plan rows | TR-E08-03, TR-E08-04 |
| Locked sessions survive replanning | A locked session is moved or deleted by confirm | Confirm deletes only `SCHEDULED && !locked` rows; locked rows are preserved and treated as busy | TR-E08-03, TR-E08-04, TR-E08-07 |
| Declining leaves state unchanged | A declined preview partially persists sessions | Preview is side-effect-free; decline = no confirm call; no server-side mutation | TR-E08-04, TR-E08-06 |
| Completed assignments are not "unfinished work" | A completed assignment's planned sessions are counted as missed | Missed-session and recovery-summary queries filter assignment status to `PENDING`/`IN_PROGRESS` | TR-E08-01, TR-E08-07 |
| No blame/punitive messaging | UI copy shames the student for missed sessions | Copy is neutral/encouraging by requirement (D08-8); `ui-refiner` settles wording; tests assert absence of shaming terms (provisional) | TR-E08-05, TR-E08-06 |

### Final implementation review unit

One combined review for the EP08 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP08](./README.md) | EP08A, EP08B, EP08C, EP08D, EP08E, EP08F | `./artifacts/EP08/` | EP08F (writes `./artifacts/EP08/implementation.md`, including the cross-layer E2E evidence) | One combined EP08 review after all six children |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP08D and EP08E must complete their `ui-refiner` pass before implementation.

### Quality gate (planner)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP08D and EP08E are `Needs refinement` (D08-7) and one verification task (V-08-2) is open. EP08A, EP08B, EP08C and EP08F carry no UI decisions and are ready to implement once upstream dependencies land. D08-4, D08-6 and V-08-1/V-08-3/V-08-4 were settled by user decision 2026-10-30. Implementation blocker (PR-003): EP08A's per-assignment `confirmedMinutes` depends on the EP06 State-B upgrade (V-08-5); EP08A delivers the total only until that upgrade lands. EP06 and EP07 are complete and parent-reviewed; the EP06 engine is the reuse target.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Six children, each a substantive outcome (read-side API, pure-domain rescheduler, preview/confirm API, recovery UI, catch-up UI, cross-layer E2E + parent index). No README-only/status-only/evidence-only child. Each split has a stated reason. |
| 2 | Original AC/TR coverage | Pass | All nine epic ACs mapped to owners above; eight TRs assigned (TR-E08-01…08). Every AC has at least one owning child and every TR has a named owner. |
| 3 | Definition of Done | Pass | DoD map above; items 10/11 belong to the combined EP08 parent review; per-child DoD lists carry a justified N/A reason for every item that does not apply to that layer. |
| 4 | Contract consistency | Pass | One shared API/data contract section (endpoints, shapes, missed-session definition, engine reuse, confirm transaction, migration). EP08A/B/C implement, EP08D/E consume, EP08F verifies. |
| 5 | Code paths inspected | Pass | Code baseline section above (schema, EP06 engine + service, EP07 session log, ownership helpers, frontend routes, E2E stack, design system). Unverified items disclosed (ui-refiner decisions, V-08-1…4, browser rendering). |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table above — seven claims with concrete counterexamples: cross-student access, historical-log immutability, deadline non-extension, locked preservation, decline no-op, completed-assignment exclusion, non-blaming copy. |
| 7 | Dependencies | Pass (with blocker noted) | EP08A → EP08B → EP08C → EP08D → EP08E → EP08F, with the one-way frontend dependencies and the `ui-refiner` gate recorded. EP06/EP07 complete and parent-reviewed. **Implementation blocker (PR-003):** EP08A's per-assignment `confirmedMinutes` depends on the EP06 State-B upgrade (V-08-5); EP08A delivers the total only until that upgrade lands. Option (a) an EP06 follow-up before EP08A is recommended; option (b) recorded here. |
| 8 | Material decisions | Blocked (provisional) | D08-1, D08-2, D08-3, D08-8 settled. D08-4, D08-6 settled by user decision 2026-10-30 (V-08-1, V-08-3, V-08-4 resolved). D08-5 provisional with verification task V-08-2. D08-7 (UI/UX for EP08D/E) unresolved and is the `ui-refiner`'s to settle. |
| 9 | Correction log | Pass | First plan of this epic; no plan-review pass yet. The log is initialized with no findings. |
| 10 | Jira identity | Not applicable | No sync authorized; the epic key is STUDY-17 and all six child keys are `Pending creation`. |

### Plan correction log

(First plan of this epic. Plan-review pass 1 (2026-10-30) returned `Changes Required` with findings PR-001…PR-008; the corrections below are the planner's pass. See `plan-review.md` for the reviewer's original findings and dispositions.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PR-001 | 2026-10-30 | Should-fix | `README.md` shared contract `MissedSession` shape (`locked`); `EP08A` technical notes ("No new migration in this story"); `EP08C` scope (owns the migration) | `MissedSession` promises `locked`, but EP08A claimed migration-independence and could not select the column before EP08C's migration landed. | Moved the additive `locked` migration into EP08A (PR-001); EP08C consumes the column. Updated contract heading, EP08A scope/out-of-scope/technical notes, EP08C summary/scope/technical notes. | Cross-file comparison: README data-model heading + EP08A "Migration owned here" note + EP08C "Consumes the `locked` column" note now agree; dependency order stays EP08A → EP08C. | Addressed — awaiting re-review |
| PR-002 | 2026-10-30 | Should-fix | `README.md` confirm transaction step 2; `EP08C` AC #4, technical notes "Conflict re-check" | Busy set described as "adds completed + locked" without stating that the replaced SCHEDULED non-locked sessions are excluded, so an implementer could include all planned sessions and make every confirm return 409. | Stated the complete busy set (confirmed `StudySession`s + completed `PlannedSession`s + locked `PlannedSession`s + the *other submitted* sessions) and the explicit exclusion of replaced SCHEDULED non-locked sessions in README step 2 and EP08C AC #4. Added a no-conflict confirm test note. | README step 2 + EP08C AC #4 now name the complete busy set and the exclusion; unedited-confirm case noted. | Addressed — awaiting re-review |
| PR-003 | 2026-10-30 | Should-fix | `README.md` V-08-5; `EP08A` AC #5; `README.md` quality gate row 7 | V-08-5 (EP06 State-B upgrade) is an unacknowledged implementation blocker; quality gate denied any blocker. | Recorded V-08-5 as an implementation blocker (option (b)): EP08A delivers the total `confirmedMinutes` only; per-assignment `confirmedMinutes` stays State A until the upgrade lands. Updated EP08A AC #5 and quality-gate row 7 + verdict line. | EP08A AC #5 + README quality gate row 7 + verdict line now state the blocker and the deferred semantics. | Addressed — awaiting re-review |
| PR-004 | 2026-10-30 | Should-fix | `EP08A` technical notes ("Today's midnight is computed in the profile zone then converted to a UTC instant"); `README.md` missed-session definition | Wording invited converting a profile-zone midnight to a UTC instant, shifting the missed-session boundary for non-UTC profiles. | Rewrote the hint to EP06's convention: bound is `new Date(`${formatToday(timeZone)}T00:00:00.000Z`)` (civil date string rendered as UTC midnight); no zone conversion. Updated README missed-session definition and EP08A AC #2. | README missed-session definition + EP08A AC #2 + technical note now use the UTC-midnight-of-civil-date bound. | Addressed — awaiting re-review |
| PR-005 | 2026-10-30 | Polish | `README.md` D08-5, V-08-2; `EP08A` AC #2 | V-08-2 implied the assignment-status filter was an open product decision, but it is settled by reuse of EP06's `isUnfinishedStatus`. | Narrowed V-08-2 to the date boundary only; recorded the status filter as settled by reuse in D08-5 and V-08-2. | README D08-5 + V-08-2 + EP08A AC #2 reflect the narrowed scope. | Addressed — awaiting re-review |
| PR-006 | 2026-10-30 | Polish | `EP08B` technical notes input shape (`busy` + separate `lockedSessions`) | Passing a subset (`lockedSessions`) independently of its superset (`busy`) risks a silent mismatch in `lockedPreserved`. | Removed the separate `lockedSessions` input; locked intervals now carry `locked: true` inside `busy`, so `lockedPreserved` is derived and cannot drift. | EP08B input-shape note + `busy` description updated. | Addressed — awaiting re-review |
| PR-007 | 2026-10-30 | Polish | `README.md` confirm transaction step 4; `EP08C` AC #4 step 5 | "target hours from placed minutes" left implicit whether `targetHours` is recomputed from submitted sessions or carried over from the preview. | Stated that `targetHours = (sum of submitted session durations on that day) / 60` computed from `dto.sessions` in the transaction (0 for days with no submitted sessions). Updated README step 4 and EP08C AC #4. | README step 4 + EP08C AC #4 now state the recomputation. | Addressed — awaiting re-review |
| PR-008 | 2026-10-30 | Polish | `EP08A` AC #6; TR-E08-02 | The API's placeholder `message` was not required to pass the non-blaming term check, and EP08D's override testing was unspecified. | Added the requirement that the placeholder pass the non-blaming term check, and that EP08D's client-side override (if any) is tested in EP08D's TR-E08-05. | EP08A AC #6 updated. | Addressed — awaiting re-review |
| PR-009 | 2026-10-30 | Should-fix | `EP08A` sizing (Exclusions/Production files); `EP08C` sizing (Production files, DoD item 9, TR-E08-04); `README.md` DoD row 9 | PR-001's migration-ownership move did not fully propagate: EP08A still excluded "migration" and EP08C still referenced "migration folder"; DoD row 9 and the migration-shape test still pointed at EP08C. | EP08A now owns the migration in sizing (production files + exclusions + TR-E08-01); EP08C sizing/DoD/TR updated to consume it; README DoD row 9 reassigned. | Cross-file comparison: EP08A sizing + EP08C sizing + README DoD row 9 + TR-E08-01/04 now agree on ownership. | Addressed — awaiting re-review |
| PR-010 | 2026-10-30 | Polish | `EP08C` technical notes (no-conflict confirm test); TR-E08-04 | The no-conflict confirm test was only in technical notes, not in the TR list. | Added "unedited confirm succeeds with no conflicts" to TR-E08-04 (README) and to EP08C's test list. | README TR-E08-04 + EP08C test list updated. | Addressed — awaiting re-review |
| PR-011 | 2026-10-30 | Polish | `EP08E` technical notes (locked-session toggle affordance) | Stale "if V-08-1 settles" wording after V-08-1 was resolved 2026-10-30. | Reworded to state locked is an explicit toggle (V-08-1 resolved) and the toggle UI lives in EP08E subject to ui-refiner. | EP08E updated. | Addressed — awaiting re-review |

### Implementation review log

(Not yet implemented.)

### Autopilot

```yaml
version: 1
scope:
  parent: EP08
  descendants: [EP08A, EP08B, EP08C, EP08D, EP08E, EP08F]
  entry: planning
  limits: enclosing parent review unit
stage: planning
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: ""
  head: ""
active_dispatch:
  name: ep08-planner-1
  role: planner
  status: returned
  pointer: docs/stories/EP08/README.md
  session: ""
  assignment: plan
last_result:
  evidence: "Breakdown created: EP08A…EP08F (docs/stories/EP08/). No implementation, no Jira sync (children stay `Pending creation`)."
  findings: "Verdict Draft: EP08A/EP08B/EP08C/EP08F ready (pending upstream deps); EP08D/EP08E await ui-refiner pass (D08-7). Four provisional decisions (D08-4…D08-6, V-08-1…4)."
  scope_note: "Planning only — no implementation, no Jira sync. EP06 and EP07 complete and parent-reviewed; EP08 reuses the EP06 engine."
  cycles: 0
  same_findings: unknown
gates:
  breakdown: true
  plan: draft
  ui: false
  refinement: false
  child_unfinished: true
  eligible_child_state: Queued
  closeout: true
  integration: false
  all_descendants_implemented: false
  review: not_started
  findings_owner: none
  open_findings: false
  walkthrough: not_started
  judged_at_head: ""
  queue_hash: "ep08-queue-draft-2026-10-30"
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