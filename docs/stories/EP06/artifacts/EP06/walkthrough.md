# EP06 — Final User Walkthrough (Study Planning & Scheduling)

**Parent:** [EP06: Study Planning & Scheduling](../../README.md) (epic [EP06-study-planning-and-scheduling.md](../../epics/EP06-study-planning-and-scheduling.md), Jira STUDY-15)
**Milestone:** M3 (Study planning and focus sessions)
**Review unit:** one combined review for all eight children (EP06A–EP06H).
**Final review:** [`./review.md`](./review.md) (pass 2, 2026-10-30, verdict **PASS**).
**Reviewed commit (HEAD):** `a0a7307`.
**Scope:** the complete EP06 review unit — study preferences, remaining-work calculation, the deterministic scheduling engine, plan persistence/preview/save, the preferences surface, the plan page, the remaining-work and deficit-warning surface, and the cross-layer E2E suite.

## 1. What changed

EP06 adds a **study-planning surface** to StudyPilot: a student sets preferred session durations on their profile, the system computes how much estimated work remains per assignment, and a deterministic scheduler proposes a seven-day study plan inside the student's declared availability windows. The student reviews, edits (move/resize/delete) and saves the proposal; the system reports work that cannot fit before a deadline and flags assignments missing an estimate or a due date. Planned sessions never change assignment due dates.

User-visible workflows:

- **Set study preferences** (`/profile`): four number inputs — session length, min session, max session, daily cap — with client-side bounds, save round-trip and a success message.
- **Generate a plan** (`/plan`): a "Generate plan" button produces a seven-day week grid with proposed sessions inside available windows, split across days when the work exceeds one session length.
- **Edit and save** (`/plan`): drag/move/resize/delete sessions, then "Save plan"; the saved week survives a reload.
- **Conflict on save**: moving a session onto a class meeting and saving yields a 409 naming the offending session; nothing is written.
- **Rollover**: if the week has rolled over, a banner offers "Generate plan".
- **Deficit warning**: an assignment whose estimate exceeds available capacity is named with its minutes.
- **Flagged marker**: an assignment with no estimate is marked "No estimate" and is never scheduled.
- **Keyboard + responsive + accessible**: all editing controls are keyboard-operable; the grid scrolls horizontally on narrow screens; the remaining-work panel becomes a drawer below 768px.

Stories: EP06A (preferences shape & API), EP06B (remaining work & read API), EP06C (deterministic engine), EP06D (plan persistence & preview/save/read API), EP06E (preferences UI), EP06F (plan page), EP06G (remaining work & warnings UI), EP06H (cross-layer E2E + parent index).

## 2. How the code works

**Backend — pure domain module** (`apps/api/src/domain/study-planning/`): `types.ts`, `preferences.ts` (the `studyDefaults` shape, bounds, cross-field rules, the four-step defensive reader, the validator), `intervals.ts` (interval algebra + the one shared `freeIntervals(...)` helper), `ordering.ts` (the one shared comparator `compareAssignments`), `remaining-work.ts` (classification + estimate→minutes conversion), `scheduler.ts` (deterministic placement). The module imports nothing from `@nestjs/*` and nothing from Prisma and reads no clock; the caller supplies "today" and every window.

**Backend — API** (`apps/api/src/modules/study-plans/`): `study-plans.module.ts`, `study-plans.controller.ts`, `study-plans.service.ts`, DTOs. Endpoints: `GET/PUT /study-preferences`, `GET /study-plans/remaining-work`, `POST /study-plans/preview` (side-effect-free), `POST /study-plans` (atomic save with conflict re-check + rollover rejection), `GET /study-plans` (server-named window). Ownership is enforced via `ownedWhere`/`assertOwned`/`assertAffected` with the uniform 404 `Resource not found`.

**Migration** (`apps/api/prisma/migrations/20261030185825_study_plan_planned_sessions/migration.sql`): renames `scheduled_tasks` → `planned_sessions` and `ScheduledTaskStatus` → `PlannedSessionStatus`, drops the unique index before the `taskId` column, drops `taskId`, adds `assignmentId` (NOT NULL, FK to `assignments` ON DELETE CASCADE) behind a guard that raises on a non-empty table, and adds two indexes. Rollback documented.

**Frontend — preferences** (`apps/web/src/entities/study-preferences/`, `apps/web/src/features/study-preferences/`): the form with four number inputs, client-side bounds mirror, save round-trip, spinner card, live region; mounted on `ProfilePage`.

**Frontend — plan page** (`apps/web/src/pages/plan/ui/PlanPage.tsx`, `apps/web/src/entities/study-plan/`, `apps/web/src/features/study-plan/`): the `/plan` route, the week grid (`PlanWeek.tsx`) with move/resize/delete and keyboard parity, the save projection (preview sessions projected to `{ assignmentId, date, startTime, endTime }`), the rollover banner, the conflict display, the live region.

**Frontend — remaining work & warnings** (`apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx`, `WorkloadWarnings.tsx`): per-assignment rows, remaining-hours formatting, flagged markers ("No estimate"/"No due date"), the three warning sentences, the deferred list, calm empty states.

**Cross-layer** (`apps/web/e2e/study-plan.spec.ts` + `apps/web/e2e/helpers.ts`): 5 scenarios against the self-contained stack.

**Preferences merge fix** (`apps/api/src/modules/users/users.service.ts`): `PATCH /users/me` now merges the incoming `preferences` bag into the stored bag (shallow top-level) and re-checks the 4096-byte cap on the merged result, so a later profile PATCH can no longer erase saved `studyDefaults`.

## 3. Why it is correct

- **AC-E06-01…AC-E06-09** are all satisfied; the three that were only partially satisfied in pass 1 (AC-E06-06, -07, -09) are now fully satisfied by the landed E2E suite (`study-plan.spec.ts` exercises the journey, the deficit warning, the flagged marker, the isolation case and the conflict case).
- **DoD:** 10 PASS / 1 N/A (item 11 is this walkthrough, written in this pass). Items 3 (data scoping), 8 (automated tests) and 10 (integrated review) moved from FAIL/CANNOT VERIFY to PASS because the E2E suite now exists and ran green.
- **Data scoping:** every query touching academic data is constrained to the authenticated student via `ownedWhere`/`assertOwned`/`assertAffected`; `PlannedSession` is scoped through `studyPlan.userId`; access that is not owned returns the uniform 404 `Resource not found` (never 403). Verified by reading `study-plans.service.ts` and the E2E isolation case.
- **Purity:** `apps/api/src/domain/study-planning/` imports nothing from `@nestjs/*` or Prisma and reads no clock (verified by grep).
- **Migration:** the guard, the index-before-column order, the rollback and the physical names match the contract (verified by reading the migration SQL).
- **Ownership convention:** `ownership.ts:25-31` now names `PlannedSession` and `studyPlan.userId` (R-EP06-02 closed).
- **Mandatory findings across rounds:** pass 1 raised 1 blocker + 7 should-fix + 4 polish (R-EP06-01…R-EP06-12); the fix rounds closed all of them (R-EP06-01, -02, -03, -04, -05, -06, -09, -10, -11 fixed; -07, -08, -12 reconciled). This pass raises only 3 polish items (R-EP06-13…R-EP06-15), none blocking.
- **Automated evidence (recorded, not re-run by the reviewer):** API 59 suites / 1274 tests; web 84 suites / 1005 tests; `study-plan.spec.ts` 5 passed; full E2E sweep 29 passed; typecheck + lint clean on both. The 2 `CourseForm` test timeouts under full-suite load are pre-existing and unrelated (both pass in isolation).

## 4. Manual test workflows

### Workflow A — Set study preferences
- **Prerequisites:** a registered, logged-in student; local dev stack running.
- **Steps:**
  1. Open `/profile`.
  2. Enter `45` / `15` / `90` / `180` in session length / min / max / daily cap.
  3. Click "Save study preferences".
- **Expected:** "Study preferences saved." in the live region; reload shows the same four values; other keys in the preferences bag (if any) survive.
- **Negative/edge:** enter `600` for session length → client-side bounds reject; enter `min > max` → server repairs; unauthenticated request → 401.
- **Execution status:** Not executed — user test instructions (the unit tests cover the bounds/cross-field rules; the E2E journey scenario exercises the save round-trip).

### Workflow B — Generate a plan
- **Prerequisites:** logged in; at least one course with a class meeting; availability slots on weekdays; at least one assignment with an estimate and a due date inside the next 7 days.
- **Steps:**
  1. Open `/plan`.
  2. Click "Generate plan".
- **Expected:** a seven-day week grid with proposed sessions inside available windows; no session overlaps a class, a blocked window or a confirmed session; sessions for one assignment split across days when the work exceeds one session length; the remaining-work panel lists the assignments.
- **Execution status:** Not executed — user test instructions (the E2E `journey` scenario covers this against the real stack).

### Workflow C — Edit and save
- **Steps:**
  1. On the generated plan, move a session later by 15 minutes (arrow key or "move later"), resize one, delete another.
  2. Click "Save plan".
  3. Reload the page.
- **Expected:** "Plan saved."; the saved week renders with the moved session at its new time, the resized session at its new length, and the deleted session absent; after reload the same week is shown.
- **Execution status:** Not executed — user test instructions (the E2E `journey` scenario covers move + delete + save + reload).

### Workflow D — Conflict on save
- **Steps:**
  1. Generate a plan.
  2. Move a session onto a class meeting (09:00–10:00).
  3. Click "Save plan".
- **Expected:** a 409 with a `conflicts` array naming the offending session and `OVERLAPS_CLASS`; nothing is written; the proposal stays editable; the saved plan (if any) is unchanged.
- **Execution status:** Not executed — user test instructions (the E2E `conflict` scenario covers this).

### Workflow E — Rollover banner
- **Steps:** save a plan, then (in a test environment) advance the clock past the window and reopen `/plan`, or save with a window older than `today − 6`.
- **Expected:** "The plan week has rolled over — generate a new proposal to save it." with a "Generate plan" button; clicking it regenerates.
- **Execution status:** Not executed — user test instructions (the rollover path is unit-tested; triggering it manually requires clock manipulation).

### Workflow F — Deficit warning
- **Steps:**
  1. Create an assignment whose estimate (e.g. 10 hours) exceeds the available capacity before its deadline.
  2. Generate a plan.
- **Expected:** the warnings section names the assignment with its minutes ("do not fit").
- **Execution status:** Not executed — user test instructions (the E2E `deficit warning` scenario covers this).

### Workflow G — Flagged marker
- **Steps:**
  1. Create an assignment with no estimate.
  2. Generate a plan.
- **Expected:** the assignment is marked "No estimate" (and "No due date" if applicable) and has no session in the plan.
- **Execution status:** Not executed — user test instructions (the E2E `flagged marker` scenario covers this).

### Workflow H — Keyboard accessibility
- **Steps:**
  1. Tab through the week grid without a mouse.
  2. Move a session with arrow keys (15 min), confirm with Enter, cancel with Escape.
  3. Resize with +/- (15 min); delete with Delete.
- **Expected:** all controls reachable and operable without a mouse; focus rings visible; the live region announces the moved session's new time.
- **Execution status:** Not executed — user test instructions (TR-E06-09 records the manual pass; the reviewer owns the walkthrough and can re-run it).

### Workflow I — Responsive
- **Steps:** open `/plan` and `/profile` at <768px and <1024px widths.
- **Expected:** the week grid scrolls horizontally; the remaining-work panel becomes a drawer; the preferences form is one column; tap targets ≥44px; no clipped content.
- **Execution status:** Not executed — user test instructions.

### Workflow J — Cross-student isolation
- **Steps:** (API-level) create two students; create an assignment for student 2; call `GET /study-plans/remaining-work` and `GET /study-plans` as student 1; attempt `POST /study-plans` as student 1 naming student 2's assignment.
- **Expected:** student 1's remaining-work does not include student 2's assignment; the save returns 404 `Resource not found`.
- **Execution status:** Not executed — user test instructions (the E2E `isolation` scenario covers the API-level case).

### Workflows with no applicable manual check
- **Migration reversibility** — Not applicable: the migration's shape/guard/order/rollback are verified by code inspection of `migration.sql`; re-running it requires a database the reviewer does not have. The implementer recorded `pnpm --filter api db:migrate` applied cleanly.
- **Pure-domain boundary** — Not applicable: verified by grep (no `@nestjs/*` or Prisma imports in `apps/api/src/domain/study-planning/`).
- **Preferences merge** — Not applicable as a separate manual check: covered by the integration spec and verified by reading `users.service.ts`.

## 5. Execution status summary

| Workflow | Status |
|---|---|
| A. Set study preferences | Not executed — user test instructions |
| B. Generate a plan | Not executed — user test instructions |
| C. Edit and save | Not executed — user test instructions |
| D. Conflict on save | Not executed — user test instructions |
| E. Rollover banner | Not executed — user test instructions |
| F. Deficit warning | Not executed — user test instructions |
| G. Flagged marker | Not executed — user test instructions |
| H. Keyboard accessibility | Not executed — user test instructions |
| I. Responsive | Not executed — user test instructions |
| J. Cross-student isolation | Not executed — user test instructions |

All ten manual workflows are provided as user test instructions with exact expected results; none was executed by the reviewer in this pass (no shell/runtime to drive the browser). The automated evidence (API/web/E2E suites, typecheck, lint) is recorded in `review.md` § "Test results actually run" with provenance. Two polish items (R-EP06-13, R-EP06-14) note that the E2E deficit and isolation scenarios could be made more robust; they do not affect the passing verdict.