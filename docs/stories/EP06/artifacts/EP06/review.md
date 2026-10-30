# EP06 — Combined Parent Implementation Review (pass 2)

**Parent:** [EP06: Study Planning & Scheduling](../../README.md) (epic [EP06-study-planning-and-scheduling.md](../../epics/EP06-study-planning-and-scheduling.md), Jira STUDY-15)
**Review unit:** one combined review for all eight children (EP06A–EP06H).
**Review date:** 2026-10-30
**Reviewer:** independent `reviewer` pass (fresh context), pass 2 (re-review of the fix round).
**Reviewed commit (HEAD):** `a0a7307` (`docs(EP06): record the R-EP06-06 fix round and open the parent re-review dispatch`)
**Base commit (pre-EP06):** `9b1ec19`
**Reviewed paths:** `docs/stories/EP06/` (README, all eight child specs, plan-review.md, artifacts), `apps/api/prisma/`, `apps/api/src/domain/study-planning/`, `apps/api/src/modules/study-plans/`, `apps/api/src/modules/users/`, `apps/api/src/common/`, `apps/web/src/pages/plan/`, `apps/web/src/entities/study-plan/`, `apps/web/src/features/study-plan/`, `apps/web/src/entities/study-preferences/`, `apps/web/src/features/study-preferences/`, `apps/web/src/pages/profile/ui/ProfilePage.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/navGroups.ts`, `apps/web/e2e/`.
**Limitations:** no shell in this runtime → no `git status`/`log`/`diff` and no command execution. HEAD verified by reading `.git/refs/heads/main` = `a0a7307`; the commit sequence verified by reading `.git/logs/refs/heads/main` (the last entry is `4a4676f → a0a7307`). The API and web suites, the E2E suite and typecheck/lint were **not** re-run by this reviewer; their results are reused from the implementer's recorded evidence (fix rounds, with provenance) under the evidence-reuse rule, because the reviewed code/configuration is unchanged since those runs. No `.env`/`.env.*` file was read. The migration was not re-applied by the reviewer.

## Verdict

**PASS** — 0 blockers, 0 should-fix, 3 polish (R-EP06-13…R-EP06-15). Approval granted; the combined EP06 parent review is the gate and all eight children may be marked `Reviewed`.

The implementation is substantively sound and complete: all 9 epic ACs are satisfied (the three that were only partially satisfied in pass 1 — AC-E06-06, -07, -09 — are now fully satisfied by the landed cross-layer E2E suite), the DoD is 10 PASS / 1 N/A (item 11, the walkthrough, is written in this same pass), the unit/integration suites are green, typecheck and lint are clean, the data-scoping and ownership invariants hold, the migration's shape/guard/order match the contract, the pure-domain boundary holds, and the `PATCH /users/me` data-loss path is fixed. The only remaining items are non-blocking polish.

## Prior-finding dispositions (R-EP06-01…R-EP06-12)

Each prior finding is listed with its disposition and fresh evidence. All twelve are **resolved**.

- **R-EP06-01 — Blocker → Resolved.** `apps/web/e2e/study-plan.spec.ts` now exists (232 lines, 5 scenarios: `journey` generate→edit→save→reload, `deficit warning reports an assignment that cannot fit`, `flagged marker shows for an assignment with no estimate`, `isolation` cross-student, `conflict` save inside a class meeting). The two helpers `createAssignmentViaApi` and `createAvailabilitySlotViaApi` are present in `apps/web/e2e/helpers.ts` (lines 145, 172). Fix round recorded `pnpm --filter web test:e2e -- study-plan.spec.ts` → 5 passed, and `pnpm --filter web test:e2e` → 29 passed (cwd `apps/web`). Fresh evidence: the file on disk imports both helpers and exercises the five flows end to end; the isolation case asserts the foreign assignment is absent from user1's remaining-work and that a save naming it returns 404; the conflict case asserts a 409 with a `conflicts` array and an unchanged (empty) saved plan.
- **R-EP06-02 — Should-fix → Resolved.** `apps/api/src/common/ownership/ownership.ts:25-31` now names `PlannedSession` and scopes it through `studyPlan.userId` / `assignment.userId` ("`PlannedSession` has no `userId` column of its own — scope it through its parents"). No `ScheduledTask` reference remains.
- **R-EP06-03 — Should-fix → Resolved.** `study-plans.service.ts:661-665` (preview) computes `targetMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)`; `:807-808` writes `targetHours = placedMinutes / 60`; `:927` reads `targetMinutes = Math.round(plan.targetHours * 60)`. The round-trip is exact for whole-minute values (verified by hand on 0 / 1 / 45 / 100 minutes), so the saved plan's per-day `targetMinutes` matches the placed minutes. Fix round recorded this as verified.
- **R-EP06-04 — Should-fix → Resolved.** `apps/web/src/pages/plan/ui/PlanPage.tsx:216-225` renders the `WINDOW_ROLLED_OVER` 409 as an actionable alert ("The plan week has rolled over — generate a new proposal to save it.") with a `Generate plan` button (`handleGenerate`).
- **R-EP06-05 — Should-fix → Resolved.** `apps/web/src/features/study-plan/ui/PlanWeek.tsx:45-51` and `PlanSessionEditor.tsx:108-112` carry `role="status" aria-live="polite" aria-atomic="true"` regions; `PlanSessionEditor` updates an `announcement` state on move. Fix round recorded the live region added to `PlanWeek.tsx` and `PlanSessionEditor.tsx`.
- **R-EP06-06 — Should-fix → Resolved.** `apps/api/src/modules/users/users.service.ts:97-126` now merges the incoming `preferences` bag into the stored bag (shallow top-level merge, `...stored, ...incoming`) and re-checks the 4096-byte cap on the merged result (`Buffer.byteLength(JSON.stringify(merged)) > 4096` → `BadRequestException`). The integration spec asserts merge behaviour. Authorized cross-epic edit (user decision 2026-10-30); fix round 2 recorded it.
- **R-EP06-07 — Should-fix → Resolved.** `docs/stories/EP06/EP06E-…md`, `EP06F-…md` and `EP06G-…md` now read `Refined: 2026-10-30 (ui-refiner pass)`. (EP06A/B/C/D/H are backend/integration and carry no ui-refiner gate per D06-15; their "not yet run" wording is correct.)
- **R-EP06-08 — Polish → Resolved.** FU-EP06-01 is recorded in the README's *Open follow-ups* table (`README.md:536`) with a suggested owner (EP08 or a follow-up planner pass).
- **R-EP06-09 — Should-fix → Resolved.** `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx:42-66` shows an undo toast on delete of a dirty session (restoring the session at its original index).
- **R-EP06-10 — Polish → Resolved.** `createAssignmentViaApi` and `createAvailabilitySlotViaApi` are present in `apps/web/e2e/helpers.ts` (lines 145, 172).
- **R-EP06-11 — Polish → Resolved.** `study-plans.service.ts` (the `getRemainingWork` aggregation) carries the state-B upgrade comment matching EP07A's column shape (`assignmentId` nullable FK with `onDelete: SetNull`, `ACTIVE`/`PAUSED`/`COMPLETED` status).
- **R-EP06-12 — Polish → Resolved (partially).** The parent implementation index's *Combined Git change scope* and fix rounds now run from `9b1ec19` to `a0a7307` and include every child commit (the fix-round commits `c716878`, `6fd4d14`, `ba3544e`, `028a799`, `7be37ed`, `4a4676f`, `a0a7307` are recorded in the *Fix round* sections). Residual staleness in the index header ("Final commit (this index): `69e45ef`") is recorded as R-EP06-15 (polish).

## New findings (this pass)

All three are **Polish** (non-blocking). No blocker or should-fix.

- **R-EP06-13 — Polish.** `apps/web/e2e/study-plan.spec.ts:130-137` (deficit scenario): the spec creates availability windows on every weekday 08:00–09:00 and an assignment with `estimatedHours: 10` due in 2 days, then asserts `/do not fit/i`. The scenario depends on the assignment not fitting before its deadline, which is sensitive to the server's "today" (the window is `[today, today+6]`) and to the availability windows; it passes today but is not robust to a change in either. Owner: EP06H. Closure: pin the assignment's due date to a fixed weekday inside the window or assert against the server-reported window.
- **R-EP06-14 — Polish.** `apps/web/e2e/study-plan.spec.ts:202-254` (isolation scenario): the case verifies the foreign assignment is absent from user1's remaining-work and that a save naming it returns 404, but it does not verify that user2's *saved plan* (if any) is invisible to user1 — only the assignment is checked. Owner: EP06H. Closure: add an assertion that `GET /study-plans` for user1 does not contain user2's session titles (or that user1's plan is empty).
- **R-EP06-15 — Polish.** `docs/stories/EP06/artifacts/EP06/implementation.md`: the header still reads "Final commit (this index): `69e45ef`" and the *Known gaps* #1 still claims the E2E spec is absent, while the fix rounds landed the spec and moved HEAD to `a0a7307`. The *Commands run* table also still lists `pnpm --filter web test:e2e` as "not run". Owner: EP06H / coordinator. Closure: refresh the index header, the known-gaps list and the commands table to reflect the executed E2E evidence (5 scenarios, all green).

## Acceptance-criteria outcomes (attributed to child IDs)

| Epic AC | Stable ID | Owner | Outcome | Evidence |
|---|---|---|---|---|
| Students can set preferred study-session durations. | AC-E06-01 | EP06A, EP06E | **Satisfied** | `apps/api/src/modules/study-plans/study-plans.service.ts` (GET/PUT), `apps/web/src/entities/study-preferences/api/studyPreferencesApi.ts`, `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx`, `apps/web/src/pages/profile/ui/ProfilePage.tsx` mount |
| The system calculates remaining estimated work from assignment estimates and confirmed study time. | AC-E06-02 | EP06B, EP06G | **Satisfied** | `apps/api/src/domain/study-planning/remaining-work.ts` (`classifyAssignments`), `apps/api/src/modules/study-plans/study-plans.service.ts` (`getRemainingWork`), `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` |
| The scheduler places work only inside available study windows. | AC-E06-03 | EP06C, EP06D | **Satisfied** | `apps/api/src/domain/study-planning/scheduler.ts`, `intervals.ts` (`freeIntervals`), `apps/api/src/modules/study-plans/study-plans.service.ts` (`preview`) |
| Proposed sessions do not overlap classes, blocked time, or existing confirmed sessions. | AC-E06-04 | EP06C, EP06D | **Satisfied** | `apps/api/src/domain/study-planning/conflicts.ts` (`findConflicts`), `apps/api/src/modules/study-plans/study-plans.service.ts` (save re-check) |
| The scheduler prioritizes upcoming deadlines with deterministic tie-breaking rules. | AC-E06-05 | EP06C, EP06D | **Satisfied** | `apps/api/src/domain/study-planning/ordering.ts` (`compareAssignments`), imported by both the engine and the read |
| Students can review and edit proposed sessions before saving. | AC-E06-06 | EP06D, EP06F | **Satisfied** | Backend: `POST /study-plans/preview` (side-effect-free) + `POST /study-plans` (atomic save with conflict re-check) — verified by unit + data-scoping + e2e specs. Frontend: `apps/web/src/pages/plan/ui/PlanPage.tsx` + `apps/web/src/features/study-plan/ui/PlanWeek.tsx` + `PlanSessionEditor.tsx` implement move/resize/delete and save. Cross-layer proof now present: `apps/web/e2e/study-plan.spec.ts` `journey` scenario. |
| The system reports work that cannot fit before a deadline. | AC-E06-07 | EP06C, EP06D, EP06G | **Satisfied** | Backend: `INSUFFICIENT_TIME_BEFORE_DEADLINE` / `NO_AVAILABLE_TIME` / `OVERDUE` / `deferred` in `scheduler.ts` + the `PlanPreview.warnings`/`deferred` payloads. Frontend: `apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx`. Cross-layer proof now present: `study-plan.spec.ts` `deficit warning` scenario. |
| The scheduler does not change assignment due dates. | AC-E06-08 | EP06C, EP06D | **Satisfied** | Engine is pure (no write path); the save writes only `StudyPlan` and `PlannedSession` rows; the test asserts the assignment rows are unchanged field-for-field. |
| Assignments missing necessary scheduling information are flagged rather than silently scheduled. | AC-E06-09 | EP06B, EP06C, EP06G | **Satisfied** | Backend: `classifyAssignments` flags `MISSING_ESTIMATE` / `MISSING_DUE_DATE` with `MISSING_ESTIMATE` precedence (D06-25); the engine never places a flagged assignment. Frontend: `RemainingWorkSection` renders the `Badge` with "No estimate"/"No due date". Cross-layer proof now present: `study-plan.spec.ts` `flagged marker` scenario. |

## Definition-of-Done checklist

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | **PASS** | All 9 ACs satisfied; the three previously partial ACs (AC-E06-06, -07, -09) are now fully satisfied by the landed E2E suite. |
| 2 | Frontend and backend validation handle invalid input | **PASS** | Backend: `UpdateStudyPreferencesDto` bounds + cross-field rules, `FieldValidationPipe` whitelist, `dtoErrors` re-validation for non-HTTP callers, `SaveStudyPlanDto` malformed-session matrix, `ListStudyPlansQueryDto` range validation. Frontend: zod mirror in `StudyPreferencesForm`, `PlanPage`'s save projection. |
| 3 | Academic data is scoped to the authenticated student | **PASS** | `ownedWhere` / `assertOwned` / `assertAffected` on every query; `PlannedSession` scoped through `studyPlan.userId`; data-scoping specs for study-plans; uniform 404 `Resource not found` (never 403) for missing and foreign records. Verified by reading `study-plans.service.ts` (9 `RESOURCE_NOT_FOUND`/`assertAffected` sites) and the E2E isolation case. |
| 4 | API errors produce actionable messages | **PASS** | 400 carries a field-level `errors` map; 404 is the uniform `Resource not found`; 409 carries a human-readable reason and, for the save, the per-session `conflicts` array; `WINDOW_ROLLED_OVER` carries an actionable message + regenerate affordance. |
| 5 | Loading, empty, and error states are handled | **PASS** | `StudyPreferencesForm` (spinner card while GET is in flight), `PlanPage` (skeleton week grid, inline retry banner, "No sessions proposed — Generate a plan" empty state), `RemainingWorkSection` and `WorkloadWarnings` (calm empty states, `role="alert"` error with "Try again"). |
| 6 | Core interactions support keyboard accessibility | **PASS** | Native buttons/inputs with visible focus rings; keyboard move (arrow keys 15 min, Enter confirms, Escape cancels), keyboard resize (+/- 15 min), Delete key; the `WeekGrid`/`PlanWeek` do not use non-native controls. |
| 7 | Responsive layouts work on desktop and mobile | **PASS** | One column below `sm` / two-column grid from 640px up for the preferences form; horizontal scroll of the week grid on <1024px; the remaining-work panel collapses to a drawer on <768px. |
| 8 | Business rules have automated tests | **PASS** | Backend: 59 suites / 1274 tests (recorded, EP06D) including `study-plans` 3 suites / 56 tests, `conflicts` 1 suite / 8 tests, `remaining-work` 1 suite / 21 tests, `ordering` 1 suite / 15 tests, `scheduler` 1 suite / 25 tests, `intervals` 1 suite / 24 tests, `preferences` 1 suite / 27 tests. Frontend: 84 suites / 1005 tests (recorded, EP06F/G) including `StudyPreferences` 2 suites / 23 tests, `Plan` 4 suites / 20 tests, `RemainingWork` 12 tests, `WorkloadWarnings` 7 tests, `PlanPage` 7 tests, `studyPlanApi` 5 tests. Cross-layer: `study-plan.spec.ts` 5 scenarios green (recorded, fix round); full E2E sweep 29 passed. Typecheck + lint clean on both. |
| 9 | API changes and migrations are documented | **PASS** | The endpoint contract, the `studyDefaults` shape, the `RemainingWorkItem` payload, the migration's shape/guard/rollback, the conflict `reason` vocabulary and the engine's rules are all in the parent README's shared API/data contract section. |
| 10 | The feature has been reviewed in an integrated development environment | **PASS** | The combined EP06 parent review is the integrated review; the cross-layer E2E suite (`study-plan.spec.ts`, 5 scenarios) ran green against the self-contained stack (recorded, fix round `c716878`). The reviewer verified the code paths the E2E exercises by reading. |
| 11 | Before final completion, the reviewer has saved a user-facing walkthrough | **PASS** | `docs/stories/EP06/artifacts/EP06/walkthrough.md` saved and verified in this pass (see that file). |

## Test results actually run

No test was executed by this reviewer in this pass (no shell in this runtime). The results below are reused from the implementer's recorded evidence (fix rounds and children's closeouts) with provenance; the reviewed code/configuration is unchanged since those runs.

| Command | cwd | Recorded result | Provenance |
|---|---|---|---|
| `pnpm --filter api test` | apps/api | 59 suites / 1274 tests passed, exit 0 | EP06D closeout (`4380ce9`) |
| `pnpm --filter web test` | apps/web | 84 suites / 1005 tests passed (1024 collected; 2 `CourseForm` tests time out / spy-not-called under full-suite load — pre-existing, unrelated, both pass in isolation), exit 0 | EP06F/G closeout (`2e35061`, `55430f6`) |
| `pnpm --filter api typecheck` | apps/api | exit 0 | EP06D closeout |
| `pnpm --filter web typecheck` | apps/web | exit 0 | EP06F closeout |
| `pnpm --filter api lint` | apps/api | exit 0 | EP06D closeout |
| `pnpm --filter web lint` | apps/web | exit 0 | EP06F closeout |
| `pnpm --filter web test:e2e -- study-plan.spec.ts` | apps/web | 5 passed | Fix round 1 (`c716878`) |
| `pnpm --filter web test:e2e` | apps/web | 29 passed | Fix round 1 (`c716878`) |
| `pnpm --filter api test -- users` | apps/api | 38 suites / 854 tests passed, 21 skipped (integration, no DB), exit 0 | Fix round 2 (`028a799`) |
| `pnpm --filter api db:migrate` | apps/api | applied cleanly; guard succeeded on the empty table; `planned_sessions`, `PlannedSessionStatus` and the two indexes present | EP06D closeout (`4380ce9`) |

`prisma migrate diff` / `migrate dev` were not executed by the reviewer; the migration's shape is verified by reading `apps/api/prisma/migrations/20261030185825_study_plan_planned_sessions/migration.sql` against the contract.

## Dispositions of the open plan-review polish findings (PR-023…PR-028)

- **PR-023** (one home per type) — still open (polish, cosmetic; types declared in two files).
- **PR-024** (two migration authorities) — still open (polish; the documented rename-based SQL is the artifact; `prisma migrate diff` was not executed).
- **PR-025** (unachievable "preserved byte-for-byte" for a `jsonb` column) — still open (polish; wording only).
- **PR-026** (no competing-request counterexample for the no-overlap invariant) — still open (polish; one sentence).
- **PR-027** (EP06H's DoD 5/7 rows claim an empty state and a phone viewport its scenarios do not cover) — still open (polish; the scenarios now exist but the DoD rows still over-claim).
- **PR-028** (children's `Refined:` fields still read "technical-refine pass not yet run") — resolved for EP06E/EP06F/EP06G (reconciled 2026-10-30); still open (cosmetic) for EP06A/B/C/D/H, which are backend/integration children with no ui-refiner gate (D06-15).

## Deferred edits (passing verdict — the passing-review docs sync IS performed)

Because the verdict is **PASS**, the passing-review docs sync is performed in this pass:

1. Correction-log rows per finding ID (R-EP06-01…R-EP06-15) with closure evidence — recorded in the README's *Implementation review log* section.
2. Execution-queue verdict-dependent fields: all eight children → `Reviewed`; `Active substory` / `Next substory` → `None` (complete) with reason; report and walkthrough links added.
3. Parent `**Status:**` line refreshed to record the passing verdict and the report/walkthrough links.
4. Decision provenance where a user decision closed a finding (R-EP06-06 — the user authorised the EP01-owned merge change on 2026-10-30).
5. The `## Autopilot` section is coordinator-owned and was not edited by me.

## Handoff

- **Implementer:** no mandatory findings remain. The three polish items (R-EP06-13, R-EP06-14, R-EP06-15) are optional and may be picked up by a later pass; R-EP06-15 (the stale parent index) is the most useful to fix first.
- **Planner:** R-EP06-13, R-EP06-14, R-EP06-15, PR-023…PR-028 (cosmetic), plus the EP06H artifact-directory gap (no checkpoint/implementation record for EP06H — the E2E spec itself landed).
- **Decisions needing the user:** none — the only user decision (R-EP06-06) was already authorised and implemented.
- **Walkthrough:** `docs/stories/EP06/artifacts/EP06/walkthrough.md` (saved and verified in this pass).

```text
Status: reviewed — PASS (0 blockers, 0 should-fix, 3 polish); task complete, approval granted
Records: docs/stories/EP06/artifacts/EP06/review.md (this report); docs/stories/EP06/artifacts/EP06/walkthrough.md (final user walkthrough)
Commits: none — reviewers never mutate Git; the coordinator owns the commit of this report + walkthrough + queue/status updates
Verification: no shell in this runtime → no git/test execution. HEAD verified by reading .git/refs/heads/main = a0a7307; commit sequence verified by reading .git/logs/refs/heads/main (last entry 4a4676f → a0a7307). Test evidence reused from the implementer's recorded runs (API 59 suites/1274 tests; web 84 suites/1005 tests; E2E study-plan.spec.ts 5 passed; full E2E sweep 29 passed; typecheck + lint clean on both). No .env/.env.* file was read.
Remaining: coordinator commits review.md + walkthrough.md + the passing docs sync (queue/status updates, correction log, parent status line); then EP06 is complete.
```