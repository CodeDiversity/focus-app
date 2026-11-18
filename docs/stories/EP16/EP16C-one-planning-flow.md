# EP16C — One Planning Flow

**Story ID:** EP16C
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Needs refinement — proposal surface composition, heading copy and the `/plan` header are the refiner's (D16-15). ▲ D16-4 and ▲ D16-9 `Proposed`. Implementation after EP16B.
**Dependencies:** EP16B implemented (the plan note has left `/plan`). Epic decisions D16-4 (▲, pending — recommended (a)), D16-5 (ratified a), D16-9 (▲, pending — recommended (a)), D16-12, D16-13.

## Plan at a glance

- **What this changes:** `/plan` shows the saved week, Remaining work and one primary action (**Plan my week** / **Replan my week**); the action opens `/plan/proposal`, one surface with **Use this plan** and **Not now** that shows the proposed week, the editor, conflicts, what the plan keeps (locked/completed, with lock toggles), what moved forward, the calibration note and workload warnings; confirming lands on Today; `/plan/health*` and `/catch-up*` redirect; the plan-health page and the old preview mode are deleted; every proposal uses the catch-up preview/confirm pair.
- **Why it improves it:** one vocabulary for one job — a student never meets "Generate / Save" on one page and "Regenerate / Use this plan" on another (product, AC-E16-06…08); `PlanPage`'s preview mode and `CatchUpPreview` (two copies of the same composition) become one `PlanProposal`, and a page with no content of its own is deleted (code).
- **Decisions needing you:** ▲ D16-4 (one data path — recommended: catch-up pair), ▲ D16-9 (keep Plan separate from Calendar — recommended yes). Story rows D-C1…D-C4 are not ▲.
- **How to change this plan:** edit a Ruling cell below or in the epic register; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Merge the two planning flows into one and give the merged surface a home
students reach from one button. Both flows already run the same engine and
the same selective replace (contracts § One planning flow); this child is a
frontend consolidation with redirects, not a behaviour change.

## Scope

**In:** `features/plan-proposal/` (new: `ui/PlanProposal.tsx`, `model/useProposal.ts`, moved `WhatThisKeepsCard` (ex-`CatchUpPreservationCard`), `CatchUpLockToggle`, `MovedForwardList`); `/plan/proposal` route; `PlanPage` rebuild (saved week, Remaining work, one action; preview mode, `TodayPlanCard` mount and `WeekSkeleton`-for-preview removed); redirects per contracts § Route matrix; deletion of `pages/plan-health/**`, `features/plan-health/ui/**`, `features/catch-up/**` (after moves), `UnfinishedWorkList` (Remaining work already covers it); `@deprecated` tags on `previewStudyPlan`/`saveStudyPlan`; EP16A's **Plan my week** constant → `/plan/proposal`; minimal `catch-up.spec.ts` URL re-point (contracts § Known windows); contracts.md § One planning flow confirmed against the shipped code.
**Out:** engine or API changes (D16-13); e2e rewrite (EP16F); rendering the proposal on the EP15 grid (BL-16-02).

## Source requirement references

AC-E16-06, AC-E16-07, AC-E16-08 (primary); AC-E16-12, AC-E16-13. TR-E16-01, TR-E16-02, TR-E16-05. DoD-1, 4, 5, 6, 7, 8, 9 (contracts note).

## Acceptance criteria

1. `/plan` renders: `h1` "Plan", the saved week (`PlanWeek`, or the sentence "No plan yet — Plan my week to see proposed sessions" when empty), `RemainingWorkSection`, and exactly one primary action labelled **Plan my week** when no saved session exists and **Replan my week** otherwise; no `TodayPlanCard`, no preview mode, no "Generate plan"/"Save plan" controls, no plan note; the saved-week read keeps its own loading/error states (F-EP14C-03 ordering guard preserved where still relevant).
2. `/plan/proposal` renders `PlanProposal`: on entry it calls `previewCatchUp()` (▲ D16-4 (a)) and moves focus to its `h1`; it shows the window line, **Use this plan** and **Not now**, `PlanWeek`, `PlanSessionEditor` (with conflicts marking), **What this plan keeps** (locked/completed counts and per-locked-session lock toggles — only when non-empty), **Moved forward into this plan** (only when `missedSessions` is non-empty), `CalibrationNote`, `WorkloadWarnings`; the empty proposal ("Nothing new to schedule") and `WINDOW_ROLLED_OVER` ("Create new plan") states behave as `CatchUpPreview` does today; **Not now** → `/plan` with no request.
3. **Use this plan** calls `confirmCatchUpPlan(from, to, projectSessions(edited))`; on success it toasts "Plan saved." and navigates to `/today`; 409 conflicts keep the edits and mark the rows with the summary; other errors toast the server message; the confirm button shows the busy state and is the only disabled control while in flight.
4. Redirects: `/plan/health` → `/plan`; `/plan/health/catch-up` → `/plan/proposal`; `/catch-up` → `/plan`; `/catch-up/preview` → `/plan/proposal` (all `replace`); `pages/plan-health`, `features/plan-health/ui`, `features/catch-up` no longer exist (their surviving components live under `features/plan-proposal`); a search for `plan-health`, `PlanHealthView`, `CatchUpPreview` finds only redirects, records under `docs/`, and e2e files pending EP16F.
5. `previewStudyPlan` and `saveStudyPlan` have no caller in `apps/web/src` other than their definitions (V-16-4) and carry `@deprecated` JSDoc pointing at BL-16-01; `expectNoForbiddenWords` passes over `/plan` and `/plan/proposal` in every tested state.

## Tests (TR-E16-01, TR-E16-02, TR-E16-05)

- `PlanPage.test.tsx` (rewritten): saved/empty/loading/error; action label by saved-session presence; action navigates to `/plan/proposal`; no hero, no preview controls (negatives).
- `PlanProposal.test.tsx`: loads via `previewCatchUp`; focus on `h1`; sections present/absent by payload; lock toggle updates the kept card (±1); confirm success → toast + `/today`; 409 → edits kept + rows marked; rolled-over → "Create new plan" reloads; empty proposal; Not now → `/plan` without a confirm call (negative); copy audit.
- `appRoutes.test.tsx`: the four redirects.
- `entities/study-plan/api/studyPlanApi.test.ts` (if present) unchanged; V-16-4 grep recorded in the implementation record.

## Technical notes

- **Inspected:** `PlanPage.tsx` (modes `initial|generating|preview|saved`, `actedRef` guard, header `:197-218`, `TodayPlanCard` mount `:224-230`, note `:233-245`, preview/saved renders `:277-380`); `CatchUpPreview.tsx` (load/confirm/lock handlers `:48-130`, layout `:132-260+`, return targets `/plan/health`); `CatchUpPreservationCard.tsx` (renders null when nothing kept); `PlanHealthView.tsx` (lead sentence, `MovedForwardList`, `UnfinishedWorkList`, "Regenerate my week"); `study-plans.service.ts:1123` (`preview`), `:1186` (`catchUpPreview`), `:1292` (`catchUpConfirm`), `:1509` (`save`) — both confirms `deleteMany` only `SCHEDULED && !locked`; `studyPlanApi.ts:46-117`.
- **Proposed:** `useProposal()` hook holds `preview`, `edited`, `phase`, `conflicts`, `rolledOver`, `isConfirming` and exposes `load`, `confirm`, `setEdited`, `onLockedChange` — the `CatchUpPreview` state, lifted; `PlanProposal` is presentational over it. The "Replan" label rule reads the saved plan already fetched by `/plan`; `/plan/proposal` reached by deep link does not need it.
- **Known window:** `catch-up.spec.ts` URL constants re-pointed and plan-health-heading journeys `test.fixme`'d naming EP16F (contracts § Known windows).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-C1 | Proposal location: (a) its own route `/plan/proposal` (deep-linkable, Back returns to `/plan`, focus-to-`h1` on entry as EP08E did); (b) page state on `/plan` | **(a)** — the redirects from `/plan/health/catch-up` and `/catch-up/preview` need a target, and Back behaviour is predictable | Proposed |
| D-C2 | Post-confirm landing: (a) `/today` + toast; (b) stay on `/plan` showing the saved week | **(a)** — D16-5; the next action is on Today | Proposed |
| D-C3 | `UnfinishedWorkList`: (a) delete — `RemainingWorkSection` on `/plan` shows the same items with more detail; (b) move into the proposal | **(a)** — one list per question | Proposed |
| D-C4 | Deprecated entity functions: (a) keep with `@deprecated` + BL-16-01 pointer; (b) delete now | **(a)** — the API still exists; deleting the client first would make BL-16-01's grep trivial but hide the dependency | Proposed |

## Definition of Done

1, 4, 5, 6, 7, 8 (TR-E16-01/02/05), 9 (contracts § One planning flow confirmed). 2, 3 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** planning is one button, one proposal, one confirm — and the plan-health page is gone without losing a sentence of information.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx`, `WhatThisKeepsCard.tsx` (moved), `CatchUpLockToggle.tsx` (moved), `MovedForwardList.tsx` (moved), `model/useProposal.ts` (new; + tests), `apps/web/src/pages/plan/ui/PlanPage.tsx` (+ test), `apps/web/src/pages/plan/ui/PlanProposalPage.tsx` (thin route wrapper, new), `apps/web/src/app/App.tsx` (+ `appRoutes.test.tsx`), `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (JSDoc), `apps/web/src/features/today-plan/ui/TodayPlanCard.tsx` (link constant), `apps/web/e2e/catch-up.spec.ts` (URL constants, fixmes), `docs/stories/EP16/contracts.md`; deletions: `apps/web/src/pages/plan-health/**`, `apps/web/src/features/plan-health/ui/**`, `apps/web/src/features/catch-up/**`.
- **Start context:** this story; contracts.md § Route matrix, § One planning flow, § Known windows; `PlanPage.tsx`, `CatchUpPreview.tsx`, `PlanHealthView.tsx`.
- **Verification:** web typecheck/lint/test green; V-16-4 grep output recorded; manual: no plan → Plan my week → Use this plan → lands on Today with a next session; lock a session → Replan → the locked session is listed under "What this plan keeps" and survives confirm.
- **Dependencies / exclusions:** EP16B; ▲ D16-4, ▲ D16-9 ruled. E2E rewrite → EP16F; API removal → BL-16-01; proposal on the grid → BL-16-02.
