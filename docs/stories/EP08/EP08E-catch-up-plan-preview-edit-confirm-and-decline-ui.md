# EP08E — Catch-Up Plan Preview, Edit, Confirm and Decline (UI)

**Story ID:** EP08E
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Frontend (+ one scoped backend note — the lock-toggle PATCH, user decision 2026-10-31)
**Status:** Needs refinement — **UI/UX decisions settled (ui-refiner, 2026-10-31)**; technical refinement (refiner) may still be needed
**Refined:** UI/UX decisions settled (ui-refiner, 2026-10-31). D08-7 closed for EP08E. Technical refinement (wiring, DTO details) may still be needed; this story is **not** declared Ready.
**Dependencies:** EP08C implemented (preview/confirm API — verified in code). `ui-refiner` pass complete 2026-10-31.
**Jira key:** Pending creation

## Summary

Student-facing catch-up flow: generates a preview of the proposed replan, lets the student review and edit the proposed sessions, shows feasibility warnings and locked/completed-preservation indicators (including the explicit lock toggle), and provides confirm and decline controls. Confirm persists the change set; decline leaves the plan unchanged.

## Scope

**In scope:**
- Catch-up preview generation (call `POST /study-plans/catch-up/preview`).
- Preview rendering reusing EP06's plan-page editing interactions (move/resize/delete of a proposed session).
- Feasibility-warning display (reuse `WorkloadWarnings` verbatim — same categories/copy).
- Locked-session and completed-session preservation indicators, **including the explicit lock toggle** (D08-4) wired to a new minimal PATCH endpoint.
- **Scoped backend note (user decision 2026-10-31):** one minimal ownership-scoped lock-toggle endpoint — `PATCH /study-plans/sessions/:sessionId/lock` — added with this story (see Technical Notes). No API exists today that persists `PlannedSession.locked` (code-verified: `study-plans.service.ts` sets `locked: false` only on create, lines 1029/1029-equivalent in `save`).
- Confirm (call `POST /study-plans/catch-up/confirm`) and decline (no call) controls.
- Loading, empty, error states; keyboard accessibility; responsive layout.
- Component tests + endpoint tests for the PATCH note.

**Out of scope:**
- The backend preview/confirm API (EP08C — implemented; mirror it exactly).
- The recovery summary (EP08D — implemented).
- Any scheduling logic.
- A lock toggle on the plan page (EP06 surface) — see open questions.

## Source requirement references

- Epic AC-E08-05 (preview before confirm).
- Epic AC-E08-06 (locked sessions preserved) — indicator + explicit toggle affordance (D08-4).
- Epic AC-E08-07 (report infeasible work).
- Epic AC-E08-09 (decline).
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, 9 (items 10/11 belong to the combined EP08 parent review).
- TR-E08-06, TR-E08-08.

## Acceptance criteria

1. The student can generate a catch-up preview that calls `POST /study-plans/catch-up/preview` and renders the proposed sessions grouped by day (week grid + editable list, mirroring `PlanPage`).
2. The student can edit a proposed session (move/resize/delete) before confirming, reusing `PlanSessionEditor`'s interaction model.
3. Feasibility warnings are displayed by reusing `WorkloadWarnings` with the preview's `warnings`/`deferred` (same categories and copy as EP06: `NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`).
4. Preserved sessions are indicated: `lockedPreserved`/`completedPreserved` counts plus read-only cards for the preview's locked sessions — never editable rows in the editor.
5. The lock state of a listed session is an explicit student toggle (D08-4): toggling calls `PATCH /study-plans/sessions/:sessionId/lock`; success updates local state and the count; failure reverts the toggle and shows an actionable inline error.
6. Confirm calls `POST /study-plans/catch-up/confirm` with `{ from, to, sessions: [{ assignmentId, date, startTime, endTime }] }` from the (possibly edited) proposals and shows success; on 409 conflicts, the conflicting sessions are marked and the reasons listed (via `CONFLICT_REASON_LABEL`).
7. Decline leaves the plan unchanged: no confirm call is made and no local mutation persists (the preview is discarded on leaving the route).
8. `WINDOW_ROLLED_OVER` (409) is surfaced with the regeneration prompt and a working "Create new plan" action.
9. Loading, empty and error states are handled for generation, confirm and the lock toggle.
10. All controls are keyboard-operable with visible focus; the surface is usable on narrow screens; copy is non-blaming (D08-8).
11. No `StudySession`/`Assignment`/`Task` data is mutated by this surface beyond the confirm call and the lock PATCH.

## Tests (TR-E08-06 + PATCH note)

Frontend (vitest + `@testing-library/react`, colocated `*.test.tsx`, mocking the entity client as in `RecoverySummary.test.tsx`):

- `CatchUpPreview.test.tsx`: generate on mount → preview renders grouped by day; edit a proposed session then confirm sends the exact 4-field session body (decline-path: "Not now" makes **no** request and returns to `/catch-up`); 409 conflict response marks the conflicting rows and lists reasons; `WINDOW_ROLLED_OVER` shows the banner and regenerates; loading skeleton / empty / error states; deep-link to `/catch-up/preview` self-fetches; keyboard operability (Tab/Enter reach and operate every control); copy contains no blaming terms (assert absence of "you missed", "failed", "overdue"-shaming phrasing — mirrors the EP08D provisional check).
- `CatchUpPreservationCard.test.tsx`: counts render from `lockedPreserved`/`completedPreserved`; locked session cards are read-only (no time/day inputs, no delete); locked sessions never appear in `PlanSessionEditor`.
- `CatchUpLockToggle.test.tsx`: toggle fires `setPlannedSessionLock(sessionId, locked)`; success updates `aria-pressed` and adjusts the locked count by ±1; failure reverts and shows the inline error; toggle is disabled while pending.
- `PlanSessionEditor.test.tsx` (additions): optional `conflicts` prop marks the matching rows (`sessionIndex`) with the reason; behavior unchanged when the prop is absent (EP06 regression guard).
- Narrow-screen/keyboard checks follow the existing EP08D test patterns; TR-E08-08 manual accessibility pass recorded for the preview surface.

Backend (endpoint note, `apps/api`): scoped spec — 200 flips `locked` on the caller's own session and changes nothing else (field-for-field assert); missing and foreign session ids both return the uniform 404 `Resource not found` (no existence oracle, never 403); non-boolean/missing `locked` → 400 field error; 401 unauthenticated.

## Technical notes

### Scoped backend note — lock-toggle endpoint (user decision 2026-10-31)

No existing route persists `PlannedSession.locked` (verified: `study-plans.service.ts` only ever writes `locked: false` on create; `study-plan.controller.ts` exposes no lock route). This story adds exactly one minimal endpoint, following the ownership convention (`apps/api/src/common/ownership/ownership.ts`; `PlannedSession` is scoped through `studyPlan.userId`):

```
PATCH /study-plans/sessions/:sessionId/lock
```

- **Controller:** `StudyPlanController` (`@Controller('study-plans')` in `apps/api/src/modules/study-plans/study-plan.controller.ts`) — `@Patch('sessions/:sessionId/lock')`, `@HttpCode(200)`, `@CurrentUser()`; global `APP_GUARD` handles 401.
- **Path param:** `:sessionId` is the `PlannedSession.id` — the only planned-session id the client ever sees (`MissedSession.id`, `study-plans.service.ts:778`). Deliberately **no `:planId`**: the client never sees `StudyPlan.id` (`SavedPlanDay` in `entities/study-plan/model/types.ts` exposes no plan id), so a plan-nested path would force a contract change for nothing.
- **Body:** `{ "locked": boolean }` — required boolean (`SetSessionLockDto` with `@IsBoolean()`; missing/non-boolean → 400 via the existing `throwFieldErrors` pattern).
- **Success:** `200 → { "id": "<PlannedSession.id>", "locked": <boolean> }` — minimal status echo of the updated fields.
- **Errors:** `401` unauthenticated; `400` malformed body; `404` uniform `Resource not found` when the session is missing **or** owned by another student (ownership-scoped `updateMany` through `studyPlan: { userId }` + `assertAffected`, or scoped fetch + `assertOwned`). **Never 403 and never a distinct message** (existence-oracle rule).
- **Semantics:** sets only `locked`; no change to `status`, times, or anything else; never touches `StudySession`/`Assignment`/`Task`.

### Decisions (UI/UX settled — ui-refiner, 2026-10-31)

| # | Question | Settled answer (code anchor) |
|---|---|---|
| 1 | Where does the preview live? | Nested route **`/catch-up/preview`** under the existing `CatchUpPage`. `RecoverySummary.tsx:55` already navigates there, but `App.tsx` registers only `/catch-up` (the wildcard currently bounces `/catch-up/preview` to `/`) — this story registers the route. No new top-level route; EP08D's layout contract is unchanged. |
| 2 | How is the route wired? | `CatchUpPage.tsx` becomes a layout (section wrapper + `<Outlet/>`); `App.tsx` nests `<Route path="/catch-up">` with `index` → `RecoverySummary` and `preview` → `CatchUpPreview`. Each view owns its own `<h1>` (the summary keeps `catch-up-heading`). Deep-linking `/catch-up/preview` works: the view fetches on mount. |
| 3 | Edit model for proposed sessions | Reuse `PlanSessionEditor` as-is (`sessions: ProposedSession[]`, `days: string[]`, `onChange`) over `CatchUpPreview.days[].sessions` flattened to `ProposedSession[]` — the same flatten/project pattern as `PlanPage.tsx:25-49`. Extract `flattenPreview`/`projectSessions` into `apps/web/src/features/study-plan/lib/preview.ts` and reuse from both pages (additive refactor, no behavior change). Proposed sessions are the **only** editable rows. |
| 4 | Locked/completed preserved sessions in the editor? | Never rendered as editable rows. The preview payload gives them only as counts (`lockedPreserved`/`completedPreserved`, `study-plans.service.ts:246-250`) — rendered as indicators (rows 5–7), not editor entries. |
| 5 | Preservation indicators | New `features/catch-up/ui/CatchUpPreservationCard.tsx`, rendered when either count > 0 or any preview missed session is locked: heading "What stays as it is" + count lines "{n} locked sessions stay exactly where they are." / "{n} completed sessions are kept unchanged." (neutral, factual — D08-8). |
| 6 | Per-session locked cards | The preview's `missedSessions[]` rows with `locked: true` are the only per-session lock data the client has (each carries `id` + `locked`, `study-plans.service.ts:106-115`). Render each as a read-only card (title, date, time, duration) reusing the `Badge` + lucide `Lock` pattern from `features/recovery/ui/MissedSessionRow.tsx:23-28`. No inputs, no delete. |
| 7 | Lock toggle (D08-4, V-08-1) | `features/catch-up/ui/CatchUpLockToggle.tsx` on each card from row 6: a `Button` (secondary, size sm) with `aria-pressed={locked}` and label `Keep "{assignmentTitle}" locked` (a native toggle button — `shared/ui/` has no Switch primitive). Helper line: "Locked sessions are never moved or replaced." Clicking calls the PATCH endpoint via `setPlannedSessionLock(sessionId, locked)`: pending → `isLoading`; success → local state flips and the `lockedPreserved` display count adjusts ±1 (regeneration re-syncs truth); failure → toggle reverts + inline `role="alert"` error "We couldn't update that session's lock. Try again." (clicking again retries). The change persists server-side; it does not require re-generating the preview. |
| 8 | Feasibility warnings | Reuse `features/study-plan/ui/WorkloadWarnings.tsx` verbatim with `warnings`/`deferred` from the preview — its copy is already neutral and its empty state ("Nothing to report.") is correct. Placement mirrors `PlanPage.tsx:328-333` (below the editor, `className="mt-6"`). No copy fork in EP08E. |
| 9 | Confirm affordance + body | Header primary button **"Use this plan"** (`isLoading` while pending), mirroring `PlanPage`'s save flow. Body: `confirmCatchUpPlan(preview.from, preview.to, projectSessions(edited))` → exactly `{ from, to, sessions: [{ assignmentId, date, startTime, endTime }] }` (`SaveStudyPlanDto`, consumed at `study-plan.controller.ts:79`; same projection as `saveStudyPlan`, `studyPlanApi.ts:46-53`). 201 → `toast.success('Catch-up plan saved.')` (PlanPage precedent) + navigate back to `/catch-up` (summary refetches on mount; saved plan is readable via existing `GET /study-plans`). |
| 10 | Decline affordance + body | Ghost button **"Not now"** → `navigate('/catch-up')`; no API call (decline is client-side — EP08 README; V-08-4) and state is discarded on unmount. Browser back behaves identically. |
| 11 | 409 conflicts display | Server shape verified (`study-plans.service.ts:977-987`): `{ error: 'Conflict', conflicts: PlanConflict[] }`. Mirror `PlanPage`'s toast + summary card (`role="alert"`, `data-testid="conflict-summary"`, `CONFLICT_REASON_LABEL`, `types.ts:112-117`) with the softer heading "Some sessions clash with your calendar. Adjust them and try again:", **plus** mark the offending editor rows: additive optional prop `conflicts?: PlanConflict[]` on `PlanSessionEditor` (rows where `sessionIndex` matches get `border-danger` + the reason inline). Edits are preserved on conflict. |
| 12 | `WINDOW_ROLLED_OVER` display | Same detection as `PlanPage.tsx:118-124` (`data.error === 'WINDOW_ROLLED_OVER'`, server message `study-plans.service.ts:884-892`): warning banner (`role="alert"`, warning palette) with the server wording "The plan week has rolled over — generate a new proposal to save it." + primary button **"Create new plan"** that re-runs the preview. Edits are discarded (the window is gone; the server message says so). |
| 13 | 400 field errors | Surfaced via `getErrorMessage(err)` toast (exact `PlanPage.tsx:133` precedent); the editor already clamps end>start and 00:00–23:59 client-side (`PlanSessionEditor.tsx:22-28,85-98`). |
| 14 | Loading state | Skeleton week grid on mount: 7 columns × 3 pulse blocks, `grid-cols-7 overflow-x-auto min-w-[140px]`, `animate-pulse motion-reduce:animate-none`, `aria-busy="true"` — combining the `PlanPage.tsx:151-163` grid skeleton with the `RecoverySummary.tsx:70-74` reduced-motion class (PlanPage's own skeleton lacks it; do not copy that gap). |
| 15 | Empty state | `EmptyState` when `preview.days.every(d => d.sessions.length === 0)`: title "Nothing new to schedule", description "Your unfinished work didn't need any new sessions this week. Check the workload warnings below.", secondary button "Back to catch-up". (RecoverySummary already disables the entry button when there is nothing to recover, so this covers the warnings-only case.) |
| 16 | Error states | Preview fetch failure: danger card (`role="alert"`, `border-danger/30 bg-danger/10`, the `RecoverySummary.tsx:95-102` pattern) — "We couldn't build a catch-up plan. Try again." + "Try again" + "Back to catch-up". Confirm failures per rows 11–13; lock failures per row 7. 401 rides the global `httpClient` auth handling. |
| 17 | Layout & hierarchy | Order: header (h1 "Catch-up plan" + window line `{from} – {to} · {timeZone}` + action buttons) → proposed week grid (`PlanWeek`) → editable session list (`PlanSessionEditor`) → preservation card → `WorkloadWarnings`. First thing the student sees: the proposed week and what it costs them; confirm/decline live in the header. |
| 18 | Component placement (FSD) | New slice `apps/web/src/features/catch-up/ui/`: `CatchUpPreview.tsx` (orchestrator: fetch, edit state, conflicts, confirm/decline — the flow-local-state pattern of `PlanPage`, no new store needed), `CatchUpPreservationCard.tsx`, `CatchUpLockToggle.tsx`. Page layer keeps `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx` (converted to layout + Outlet). Shared logic reuse into `features/study-plan/lib/preview.ts` (row 3). |
| 19 | Entity/API additions | `entities/study-plan/model/types.ts`: add `CatchUpPreview` (`extends PlanPreview` + `missedSessions: MissedSession[]` + `lockedPreserved: number` + `completedPreserved: number`) mirroring the service type at `study-plans.service.ts:246-250`. `entities/study-plan/api/studyPlanApi.ts` (plain-axios entity-client precedent, **not RTK Query**): `previewCatchUp()`, `confirmCatchUpPlan(from, to, sessions)`, `setPlannedSessionLock(sessionId, locked)`. Re-export `CatchUpPreview` in the type re-export block. |
| 20 | Keyboard & focus | Every control is a native button/input (editor pattern already has `aria-label`s + an `sr-only` live region for moves, `PlanSessionEditor.tsx:110-112`). On entering the preview route, move focus to the `<h1 tabIndex={-1}>`. Alerts use `role="alert"`; lock-toggle results announce via an `sr-only` `aria-live` status ("Lock saved" / the failure text). Focus rings come from the Button primitive's `focus-visible:ring-2`. |
| 21 | Screen reader / non-color | Toggle: `aria-pressed` + per-session label (row 7) — state never conveyed by color alone; the Locked `Badge` carries the word "Locked" (MissedSessionRow precedent). Conflict marking pairs `border-danger` with the textual reason. |
| 22 | Reduced motion | Every pulse/spin gets `motion-reduce:animate-none` (Button spinner already has it; add it to any new skeleton). |
| 23 | Responsive | Grid: `overflow-x-auto` with `min-w-[140px]` columns (PlanPage precedent). Editor fields already stack `grid-cols-1 sm:grid-cols-3`. Header: `flex-col-reverse sm:flex-row` with `w-full sm:w-auto` buttons (RecoverySummary precedent); Button gives `max-sm:min-h-[44px]` touch targets. |
| 24 | Copy tone (D08-8) | No shaming vocabulary anywhere: "proposed sessions", "what stays as it is", "Use this plan" / "Not now". Never "you missed", "failed", "punitive overdue". The EP08D summary remains the place missed sessions are named. |

### Inspected code paths (verified)

- `apps/web/src/pages/plan/ui/PlanPage.tsx` (generate/save/rollover/conflict flow, skeletons, layout); `PlanSessionEditor.tsx` (edit interactions, clamps, aria, undo-on-delete toast); `WeekGrid.tsx`/`PlanWeek` (grid); `WorkloadWarnings.tsx` (categories/copy/empty state).
- `apps/web/src/features/recovery/ui/RecoverySummary.tsx` (entry button already navigates to `/catch-up/preview`; error-card + skeleton patterns), `MissedSessionRow.tsx` (Locked badge pattern), `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx`, routes in `apps/web/src/app/App.tsx`.
- `apps/web/src/entities/study-plan/model/types.ts` (`PlanPreview`, `MissedSession`, `ProposedSession(Input)`, `PlanConflict` + `CONFLICT_REASON_LABEL`; **no `CatchUpPreview` type yet** — added here), `studyPlanApi.ts` (axios entity client).
- `apps/web/src/shared/ui/`: `Button` (variants, `isLoading`, focus rings), `Badge` (neutral variant + icon slot), `Card`, `EmptyState`, `Dialog` (unused — no confirm modal: confirm is a one-step header action like EP06 save), `Input`, `Select`. No Switch primitive exists → toggle button.
- Backend: `apps/api/src/modules/study-plans/study-plan.controller.ts` (preview `@HttpCode(200)`, confirm 201 default, DTO `SaveStudyPlanDto`), `study-plans.service.ts` (`CatchUpPreview` type 246-250, `catchUpPreview` 756-868, `catchUpConfirm` 870-1036 incl. `findConflicts` re-check 972-987, rollover 884-892, delete-preserving-locked 1012-1018), `apps/api/src/common/ownership/ownership.ts`.
- Tests: vitest + RTL colocated; `CatchUpPage.test.tsx` (will need updating for the layout-route change), `RecoverySummary.test.tsx`, `MissedSessionsList.test.tsx` (Locked-badge assertion pattern).

### Known limitations / open questions

1. **Locking an upcoming in-window session from the preview is not possible with today's payload.** The only per-session `locked` data in `CatchUpPreview` is `missedSessions[]` (always in the past); upcoming SCHEDULED sessions within `[from, to]` are replaced by confirm without ever being listed with ids (and `SavedPlanSession` has no `locked` field). The PATCH endpoint is generic and ready for such rows, but surfacing them needs a small contract extension (e.g. list current-window SCHEDULED sessions with `{id, locked}` in `CatchUpPreview`, or add `locked` to `SavedPlanSession`). **Left as an open question for the planner/backend** — not fabricated into this story.
2. **Plan-page lock toggle** (locking sessions from `/plan`): the same endpoint serves it, but that is the EP06 surface — a separate planner decision, out of EP08E scope.
3. The README queue row for EP08E still says "ui-refiner pass required"; reconciling the queue is the coordinator's, not this story's.

## Definition of Done

1. Functional criteria pass (AC-E08-05, AC-E08-06, AC-E08-07, AC-E08-09).
2. Invalid input handled (client-side mirror of the session matrix; PATCH body validated 400).
3. Student data scoping — **now applies to the PATCH note**: ownership-scoped, uniform 404 (frontend itself stays N/A; APIs enforce).
4. Actionable API errors (400/409/404/lock-failure surfaced with actions).
5. Loading, empty, and error states handled (preview, confirm, toggle).
6. Keyboard accessibility (incl. toggle `aria-pressed` and focus-on-route-entry).
7. Responsive layouts (desktop + mobile).
8. Automated tests (TR-E08-06 + PATCH endpoint spec; TR-E08-08 recorded manual pass).
9. API/migration documentation — the PATCH endpoint note above is the contract record; the implementer mirrors it into the EP08 README contract section (coordinator/planner owns README).
10. Integrated review — combined EP08 parent review.
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable outcome — the catch-up preview/edit/confirm/decline surface with the lock toggle, backed by one minimal lock-persistence endpoint.
- **Estimate:** 3 requests/tokens (checkpoint 1: PATCH endpoint + spec; checkpoint 2: preview surface + edit/confirm/decline + states; checkpoint 3: preservation/toggle + a11y/responsive + tests). Cohesive because the toggle UX is meaningless without the endpoint and vice versa (sizing rule: one atomic capability, one slice).
- **Model recommendation:** 4 — editing/conflict/state complexity plus an ownership-scoped endpoint; UI decisions now settled.
- **Production files:** new `apps/web/src/features/catch-up/**`; `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx` (layout conversion); `apps/web/src/app/App.tsx` (nested routes); `apps/web/src/entities/study-plan/model/types.ts` + `api/studyPlanApi.ts` (types + 3 client functions); `apps/web/src/features/study-plan/lib/preview.ts` (extracted helpers) + `PlanSessionEditor.tsx` (additive `conflicts?` prop); API: `study-plan.controller.ts`, `study-plans.service.ts`, new `dto/set-session-lock.dto.ts`.
- **Test files:** colocated `*.test.tsx` for the three new components + `PlanSessionEditor`/`CatchUpPage` updates; API spec additions in `apps/api/src/modules/study-plans/`.
- **Minimal start context:** this story; EP08 README shared contract (endpoints/shapes/confirm transaction/D08-4/D08-8); `PlanPage.tsx`; `PlanSessionEditor.tsx`; `RecoverySummary.tsx`; `entities/study-plan/{model/types.ts,api/studyPlanApi.ts}`; `study-plan.controller.ts` + `catchUpConfirm`; `shared/ui` primitives; FSD rules.
- **Verification commands:** `npm run test --workspace=apps/web`, `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`, and the `apps/api` test/typecheck/lint equivalents for the PATCH note; pass = focused specs green with EP06/EP08 suites still green.
- **Dependencies / exclusions:** EP08C (implemented). Blocks EP08F (E2E). No other backend work, no scheduling logic, no plan-page changes.

## Tracker reference

Jira key: Pending creation (no sync authorized).
