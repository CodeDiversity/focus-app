# EP08A — Missed-Session Identification and Recovery Summary Read API

**Story ID:** EP08A
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Backend
**Status:** Queued
**Dependencies:** EP06 (complete, parent review passed 2026-10-30) and EP07 (complete, parent review passed 2026-10-30). No UI decisions (D08-7). No `ui-refiner` pass required.
**Jira key:** Pending creation

## Summary

Backend read-side spine for catch-up and recovery. Identifies **missed planned study sessions** (a planned session whose civil date is before today, still `SCHEDULED`, and whose assignment is still unfinished) without treating a completed assignment's planned sessions as unfinished work. Aggregates them, together with the unfinished-work list (reusing EP06's remaining-work classification) and the total confirmed study time, into a single **recovery summary** that the frontend can render as a neutral, non-blaming "here's where you are" view and that the replanning flow (EP08B/C) consumes as its input.

This story owns the missed-session query, the completed-assignment exclusion, the recovery summary shape and its endpoint. It does not replan, persist changes, or touch historical logs.

## Scope

**In scope:**
- Missed-session identification query (PlannedSession → StudyPlan → Assignment).
- Recovery summary aggregation endpoint `GET /study-plans/recovery-summary`.
- Confirmed-minutes total sourced from the session log (same source as EP06, V-08-5).
- Ownership scoping and uniform 404.
- Unit + data-scoping + API tests.

**Out of scope:**
- Replanning / rescheduling (EP08B/C).
- Any UI (EP08D/E).
- Any write to `StudySession`, `Assignment`, `Task` or `PlannedSession` (read-only story).
- No write to `StudySession`, `Assignment`, `Task` or `PlannedSession` data beyond the additive `locked` migration owned here (PR-001); the toggle value itself is written by EP08C.

## Source requirement references

- Epic AC-E08-01 (missed sessions identified; completed assignments excluded) — primary owner.
- Epic AC-E08-02 (manual replanning initiation) — supplies the read data the entry point consumes.
- Shared DoD items 1, 2, 3, 4, 8, 9 (item 10/11 belong to the combined EP08 parent review).
- TR-E08-01, TR-E08-02.

## Acceptance criteria

1. `GET /study-plans/recovery-summary` returns 200 with a `RecoverySummary` for the authenticated student.
2. A `PlannedSession` is included in `missedSessions` iff: its `StudyPlan.date` (stored as UTC midnight of the civil date string, EP06 convention) is strictly before `new Date(`${formatToday(timeZone)}T00:00:00.000Z`)` (the civil "today" rendered as a UTC-midnight `Date` — do **not** convert a profile-zone midnight to an instant); its `status === 'SCHEDULED'`; and its linked `Assignment.status` is `PENDING` or `IN_PROGRESS`.
3. A planned session linked to a `COMPLETED` assignment is **never** included in `missedSessions` and does not contribute to `missedCount` (AC-E08-01).
4. `unfinishedWork` reuses EP06's remaining-work classification and ordering (same items and order as `GET /study-plans/remaining-work`), so the two views never disagree about what is "next".
5. `confirmedMinutes` (top-level on `RecoverySummary`) is the **total** confirmed minutes from the student's `StudySession` log (same source as EP06's `unattributedConfirmedMinutes` aggregation). Per-assignment `confirmedMinutes` on `RemainingWorkItem` follows EP06's current State-A aggregation (always `0`) until the cross-epic State-B upgrade lands (V-08-5); EP08A does not re-implement the aggregation and does not block on it. EP08A is not blocked by V-08-5 for the total, but per-assignment confirmed time is deferred to that upgrade.
6. `message` is a neutral, non-blaming string. The API may ship a placeholder neutral string that EP08D can override client-side, but the placeholder itself must pass the same non-blaming term check (no "you missed"/"you failed"/"overdue" shaming). EP08D's client-side override (if the `ui-refiner` settles one) is tested in EP08D's TR-E08-05. (V-08-4 settled: decline is client-side.)
7. The query is scoped to the authenticated student; a missing or foreign record returns the uniform 404 `Resource not found` (no 403, no existence oracle).
8. The endpoint is read-only: no `StudySession`, `Assignment`, `Task` or `PlannedSession` row is written.
9. An empty result (no missed sessions, no unfinished work) returns 200 with empty arrays and `missedCount: 0`, not an error.

## Tests

- **TR-E08-01** Missed-session identification: past-date + SCHEDULED classification; completed-assignment exclusion; unfinished-assignment inclusion; SKIPPED/RESCHEDULED/IN_PROGRESS/COMPLETED sessions excluded; locked sessions still reported as missed (with `locked: true` in the projection); ownership-scoped query; uniform 404 for missing/foreign principal; empty case; **migration shape and reversibility (additive `locked` column, default false, rollback drops the column)**.
- **TR-E08-02** Recovery summary: missed-session aggregation; unfinished-work reuse of EP06's classification and ordering (compare against `GET /study-plans/remaining-work`); confirmed-minutes total; empty state; API-boundary loading/error (401, 404).
- Unit tests beside the module (`*.service.spec.ts`, `*data-scoping.spec.ts`); API e2e in the module folder.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/api/src/modules/study-plans/study-plans.service.ts` — `getRemainingWork`, `gatherPlanData`, ownership pattern, civil-date conversion (`toCivilDate`, `resolveTimeZone`).
  - `apps/api/src/domain/study-planning/remaining-work.ts` (`classifyAssignments`), `ordering.ts` (`compareAssignments`).
  - `apps/api/prisma/schema.prisma` — `PlannedSession`, `StudyPlan`, `StudySession`, `Assignment.status`.
  - `apps/api/src/common/ownership/ownership.ts` — `ownedWhere`/`assertOwned`/`assertAffected`, `RESOURCE_NOT_FOUND`.
  - `apps/api/src/common/lib/civil-date.ts` — `toCivilDate`, `resolveTimeZone`.
- **Proposed (new):** `getRecoverySummary(userId)` method on `StudyPlansService` (or a sibling `CatchUpService` registered in the same module — implementation detail; the contract is the endpoint). Query: `prisma.plannedSession.findMany({ where: { studyPlan: { userId, date: { lt: new Date(`${formatToday(timeZone)}T00:00:00.000Z`) } }, status: 'SCHEDULED', assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }, include: { studyPlan, assignment } })`. The bound is the civil "today" rendered as a UTC-midnight `Date` (EP06 convention) — do **not** convert a profile-zone midnight to an instant. Same as EP06's `formatToday` returning a civil date string then `new Date(`${date}T00:00:00.000Z`)`.
- **Confirmed minutes:** total from the session log (same source as EP06's `unattributedConfirmedMinutes`). Per-assignment `confirmedMinutes` on `RemainingWorkItem` stays State A (always 0) until the cross-epic State-B upgrade lands (V-08-5); EP08A does not re-implement the aggregation. Do not introduce a second aggregation.
- **Migration owned here (PR-001):** EP08A adds the additive `locked Boolean @default(false)` column to `PlannedSession` (reversible; backfill = default). EP08C consumes the column (confirm writes / toggle) and does not re-add it. EP08A's missed-session query selects `locked` so `MissedSession.locked` is populated from the first release. Sequencing stays EP08A → EP08C.
- **Civil-date discipline (D06-24):** dates are civil in the profile zone; the weekday/date boundary uses `getUTCDay()` on UTC midnight (the calendar's `dayOfWeekOf`). No browser clock.

## Definition of Done

1. Functional criteria pass (AC-E08-01, AC-E08-02 read side).
2. Invalid input handled (no body/query; principal validation).
3. Student data scoped (userId in every where).
4. Actionable API errors (401, uniform 404).
5. Loading/empty/error states at API boundary (empty arrays, not errors).
6. Keyboard/accessibility N/A (backend).
7. Responsive N/A (backend).
8. Automated tests (TR-E08-01, TR-E08-02).
9. API/migration documentation (recovery contract in EP08 README — done; migration steps + rollback for the additive `locked` column in this story's implementation record — PR-001).
10. Integrated review — combined EP08 parent review (EP08F + reviewer).
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable backend read-side outcome (missed-session query + recovery summary endpoint + tests).
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — moderate complexity (multi-table join, civil-date boundary, reuse of EP06 classification); ownership and uniform-404 discipline; no novel algorithm.
- **Production files:** `apps/api/src/modules/study-plans/study-plans.service.ts` (extend) or new `apps/api/src/modules/catch-up/` module; controller/route registration in `apps/api/src/app.module.ts`; DTO if any; **migration folder** adding `locked Boolean @default(false)` to `PlannedSession` (owned here, PR-001); `apps/api/prisma/schema.prisma`.
- **Test files:** `study-plans.service.spec.ts` / `catch-up.service.spec.ts`, `*data-scoping.spec.ts`, `*e2e.spec.ts`.
- **Minimal start context:** this story file, EP08 README shared contract, EP06 README remaining-work section, `study-plans.service.ts`, `remaining-work.ts`, `ordering.ts`, `ownership.ts`, `civil-date.ts`, `schema.prisma`.
- **Verification commands:** `npm run test --workspace=apps/api` (unit + data-scoping), `npm run test:e2e --workspace=apps/api` (if applicable), `npm run typecheck --workspace=apps/api`, `npm run lint --workspace=apps/api`.
- **Dependencies:** EP06, EP07 complete. Blocks EP08B (inputs), EP08C (data gathering), EP08D (UI).
- **Exclusions:** no UI, no replanning, no writes to `StudySession`/`Assignment`/`Task`/`PlannedSession` data, no Jira sync. (The additive `locked` migration on `PlannedSession` is in scope here — PR-001.)

## Tracker reference

Jira key: Pending creation (no sync authorized).