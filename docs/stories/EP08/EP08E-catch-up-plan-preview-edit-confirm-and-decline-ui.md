# EP08E — Catch-Up Plan Preview, Edit, Confirm and Decline (UI)

**Story ID:** EP08E
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Frontend (+ one scoped backend note — the lock-toggle PATCH, user decision 2026-10-31)
**Status:** Ready for implementer — UI/UX decisions (ui-refiner, 2026-10-31) and technical refinement (refiner, 2026-10-31) complete. Queue reconciliation is the coordinator's.
**Refined:** 2026-10-31 (technical, refiner): every AC grounded against the actual code; the PATCH lock endpoint fully specified (DTO, service steps, spec placement); the test map names concrete files and cases. Two planner-owned open questions kept (non-blocking). UI/UX decisions settled earlier the same day (ui-refiner, commit `5dd603f`); D08-7 closed for EP08E.
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
- **Scoped backend note (user decision 2026-10-31):** one minimal ownership-scoped lock-toggle endpoint — `PATCH /study-plans/sessions/:sessionId/lock` — added with this story (see Technical Notes). No API route today can persist `PlannedSession.locked` (code-verified 2026-10-31: no service code path writes `locked: true`; the only writes to `locked` are `catchUpConfirm`'s create rows with `locked: false` at `study-plans.service.ts:1029` and, in `save`'s create rows, omission of the field so the schema default `@default(false)` applies — `apps/api/prisma/schema.prisma:355`).
- Confirm (call `POST /study-plans/catch-up/confirm`) and decline (no call) controls.
- Loading, empty, error states; keyboard accessibility; responsive layout.
- Component tests + endpoint tests for the PATCH note.

**Out of scope:**
- The backend preview/confirm API (EP08C — implemented; mirror it exactly).
- The recovery summary (EP08D — implemented).
- Any scheduling logic.
- A lock toggle on the plan page (EP06 surface) — see open questions.
- Shared-contract changes in the EP08 README (planner/coordinator-owned; the PATCH record below is this story's contribution to it).

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

All frontend tests are vitest + `@testing-library/react`, colocated `*.test.tsx`, mocking the entity client with `vi.mock('@/entities/study-plan/api/studyPlanApi', …)` + `vi.mocked(…)` exactly as `RecoverySummary.test.tsx:8-12` does; router-dependent views render inside `MemoryRouter`. Narrow-screen/keyboard checks follow the existing EP08D test patterns.

**Frontend (TR-E08-06):**

- `apps/web/src/features/catch-up/ui/CatchUpPreview.test.tsx` (new):
  - "fetches the preview on mount and renders proposed sessions grouped by day" — deep-link case: mount at the route with no prior navigation self-fetches (AC 1).
  - "editing a proposed session then confirming posts the exact four-field body" — `confirmCatchUpPlan` called with `from`/`to` and `sessions: [{ assignmentId, date, startTime, endTime }]` only, derived from the edited rows (AC 2, 6).
  - "'Not now' makes no request and returns to /catch-up" (AC 7).
  - "a 409 conflict marks the offending rows and lists reasons; edits are preserved" — mock rejects with `response.data = { error: 'Conflict', conflicts: [...] }` (AC 6).
  - "WINDOW_ROLLED_OVER shows the banner and 'Create new plan' re-runs the preview" — `response.data = { error: 'WINDOW_ROLLED_OVER' }` (AC 8).
  - "a 400 field error surfaces the server message" via the `getErrorMessage` toast path (decision 13).
  - "shows the skeleton with `aria-busy` while generating" (AC 9).
  - "shows the empty state when no sessions are proposed" (AC 9).
  - "shows the danger card with 'Try again' when the preview fetch fails" (AC 9).
  - "is keyboard operable — Tab/Enter reach and operate every header/editor/toggle control" (AC 10).
  - "copy contains no blaming terms" — assert absence of "you missed", "failed", "overdue"-shaming phrasing (mirrors the EP08D provisional check; D08-8).
- `apps/web/src/features/catch-up/ui/CatchUpPreservationCard.test.tsx` (new): counts render from `lockedPreserved`/`completedPreserved`; absent when both counts are 0 and no preview missed session is locked; locked session cards are read-only (no time/day inputs, no delete); locked sessions never appear in `PlanSessionEditor` (AC 4).
- `apps/web/src/features/catch-up/ui/CatchUpLockToggle.test.tsx` (new): toggle fires `setPlannedSessionLock(sessionId, nextLocked)`; success updates `aria-pressed` and adjusts the locked count by ±1; failure reverts and shows the inline `role="alert"` error; toggle is disabled while pending (AC 5).
- `apps/web/src/features/study-plan/ui/PlanSessionEditor.test.tsx` (existing file, additive cases): the new optional `conflicts` prop marks the matching row (`sessionIndex`) with `border-danger` + the textual `CONFLICT_REASON_LABEL`; behavior/markup unchanged when the prop is absent — the five existing cases are the EP06 regression guard and must stay green untouched.
- `apps/web/src/pages/catch-up/ui/CatchUpPage.test.tsx` (existing file, updated): mocks both views; renders a `MemoryRouter` whose route config mirrors the new `App.tsx` nesting; asserts the index route renders the summary mock and `/catch-up/preview` renders the preview mock.
- `apps/web/src/entities/study-plan/api/studyPlanApi.test.ts` (existing file, additive cases, axios-adapter-stub pattern as for `previewStudyPlan`/`saveStudyPlan`): `previewCatchUp` POSTs `/study-plans/catch-up/preview` and returns the body; `confirmCatchUpPlan` POSTs `/study-plans/catch-up/confirm` with the exact `{ from, to, sessions }` body; `setPlannedSessionLock` PATCHes `/study-plans/sessions/:id/lock` with `{ locked }`, returns `{ id, locked }`, and propagates errors unchanged.

**Backend (PATCH endpoint note; existing spec files, no new spec file):**

- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (unit, mocked PrismaService) — new `describe('setSessionLock (PATCH /study-plans/sessions/:id/lock)')`:
  - "flips `locked` on the caller's own session" — `plannedSession.updateMany` called with `where { id, studyPlan: { userId } }` and `data` containing **only** `locked`; returns exactly `{ id, locked }`.
  - "missing or foreign session id → the uniform 404" — `updateMany` count 0 → `NotFoundException(RESOURCE_NOT_FOUND)`; nothing else written.
  - "non-boolean or missing `locked` → 400 field error with nothing written" — the service-side `dtoErrors` re-check path.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (HTTP harness, `main.ts` parity, `DATABASE_URL`-gated like its siblings) — new describe: no token → 401 (global guard); `{}`, `{ locked: 'yes' }`, `{ locked: 1 }` and an unknown extra body field → 400 with the field-level `errors` map (global `FieldValidationPipe`); happy path → 200 `{ id, locked }` (exactly two keys) on the student's own seeded session.
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (two-student matrix, `DATABASE_URL`-gated) — new describe: A's PATCH flips only the `locked` column on A's row (all other columns asserted field-for-field unchanged); B PATCHing A's session id → 404 with the generic `Resource not found` and A's row untouched; a valid-uuid nonexistent id → the identical 404 status and message (no existence oracle, never 403). **Tests use syntactically valid uuids for missing/foreign ids** (see the param-format note below).

**Traceability:** the six frontend files map to TR-E08-06 (generate → preview → edit → confirm, decline no-op, feasibility-warning display, locked indicator, loading/empty/error, keyboard, narrow screen). The TR-E08-08 manual accessibility pass (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) is recorded for the preview surface in this story's implementation record. The three backend spec additions cover DoD 2/3/4/8 for the PATCH note. TR-E08-04 (preview/confirm API tests) remains EP08C's/EP08F's scope — note that EP08C shipped **no** new API tests for preview/confirm (`artifacts/EP08C/implementation.md`, "Tests: None added"); this story does not re-test those endpoints beyond client mocks, and EP08F's Playwright suite remains the cross-layer proof. Do not hunt for existing preview/confirm backend tests — they do not exist yet.

## Technical notes

### Scoped backend note — lock-toggle endpoint (user decision 2026-10-31; fully specified by the technical refiner pass)

No existing route persists `PlannedSession.locked`. This story adds exactly one minimal endpoint, following the ownership convention (`apps/api/src/common/ownership/ownership.ts`; `PlannedSession` has no `userId` column and is scoped through `studyPlan.userId`):

```
PATCH /study-plans/sessions/:sessionId/lock
```

- **Controller:** `StudyPlanController` (`@Controller('study-plans')`, `apps/api/src/modules/study-plans/study-plan.controller.ts`). Add `Patch` (and `Param` — currently not imported there) to the `@nestjs/common` import and:

  ```ts
  @Patch('sessions/:sessionId/lock')
  @HttpCode(200)
  setSessionLock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SetSessionLockDto,
  ) {
    return this.studyPlansService.setSessionLock(user.id, sessionId, dto);
  }
  ```

  Global `APP_GUARD` (`auth.module.ts:47`) handles 401 — deliberately no class-level `@UseGuards` (existing convention). Raw `@Param('sessionId') sessionId: string` mirrors every existing id route in the repo (no `ParseUUIDPipe` anywhere).
- **Path param:** `:sessionId` is the `PlannedSession.id` — the only planned-session id the client ever sees (`MissedSession.id`, `study-plans.service.ts:778`). Deliberately **no `:planId`**: the client never sees `StudyPlan.id` (`SavedPlanDay` in `entities/study-plan/model/types.ts` exposes none), so a plan-nested path would force a contract change for nothing.
- **Body / DTO:** new `apps/api/src/modules/study-plans/dto/set-session-lock.dto.ts`:

  ```ts
  export class SetSessionLockDto {
    @IsBoolean({ message: 'locked must be a boolean' })
    locked!: boolean;
  }
  ```

  The `@Body()` metatype makes the global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`, D106-6) apply: missing, non-boolean, or unknown-field bodies → 400 with the field-level `errors` map.
- **Service:** `setSessionLock(userId: string, sessionId: string, dto: SetSessionLockDto)` on `StudyPlansService`, in the established order:
  1. Defense-in-depth re-check for non-HTTP callers: `dtoErrors(dto, new SetSessionLockDto())` → `throwFieldErrors` (the exact preview/save convention, `study-plans.service.ts:145-165`).
  2. `await this.prisma.plannedSession.updateMany({ where: { id: sessionId, studyPlan: { userId } }, data: { locked: dto.locked } })` — `userId` inside the `where` through the parent relation, per the ownership header comment.
  3. `assertAffected(userId, result.count)` — count 0 (missing **or** foreign) throws the uniform 404 `Resource not found`. **Never 403 and never a distinct message** (existence-oracle rule).
  4. Scoped echo read: `findMany({ where: { id: sessionId, studyPlan: { userId } }, select: { id: true, locked: true } })`; return the first row, or throw the uniform 404 if absent. Response body is exactly `{ "id": "<PlannedSession.id>", "locked": <boolean> }`. (`findMany`, not `findUnique`: Prisma only allows relation filters on the non-unique finders.)
- **Semantics:** sets only `locked`; never touches `status`, times, or `StudySession`/`Assignment`/`Task`. The endpoint is status-agnostic on purpose: confirm only ever deletes `SCHEDULED && !locked` rows (`study-plans.service.ts:1012-1018`), so locking a non-SCHEDULED row is persisted but has no scheduling effect, and the preview only surfaces SCHEDULED rows (via `missedSessions[]`) for toggling anyway. No status validation is added.
- **Param format note:** a syntactically invalid uuid would reach Prisma and surface as a 500 — the same behavior as **every** existing id route in the repo (`AllExceptionsFilter` normalizes only Prisma P2025, `all-exceptions.filter.ts:98`). Fixing that globally is out of scope for EP08E; tests therefore use valid-uuid missing ids.
- **Module wiring:** none. `StudyPlansModule` already registers `StudyPlanController` + `StudyPlansService` (`study-plans.module.ts:16-17`).
- **Contract record (DoD 9):** this section is the endpoint's contract record. The implementer mirrors it into the EP08 README contract table at coordination time — that README edit is the coordinator's/planner's, not this story's.

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

### Seams and wiring (technical refinement — resolves what the implementer must not guess)

- **Route nesting** (`App.tsx`, replacing today's flat line 66):

  ```tsx
  <Route path="/catch-up" element={<CatchUpPage />}>
    <Route index element={<RecoverySummary />} />
    <Route path="preview" element={<CatchUpPreview />} />
  </Route>
  ```

  `App.tsx` gains `RecoverySummary` and `CatchUpPreview` imports alongside the existing `CatchUpPage` import.
- **Layout conversion (`CatchUpPage.tsx`):** replace the current `RecoverySummary` import and `<section aria-labelledby="catch-up-heading">` wrapper with `import { Outlet } from 'react-router-dom'` and a plain container: `<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><Outlet /></div>`. The layout deliberately carries **no** `aria-labelledby` — the target ids live inside the views, and one id would dangle on the other route. `RecoverySummary.tsx` is untouched (its h1 keeps `id="catch-up-heading"`); `CatchUpPreview.tsx` renders its own `<section aria-labelledby="catch-up-preview-heading">` with `<h1 id="catch-up-preview-heading" tabIndex={-1} ref={…}>Catch-up plan</h1>` and focuses that h1 on mount (decision 20).
- **`preview.ts` extraction** (decision 3): new `apps/web/src/features/study-plan/lib/preview.ts` exporting `flattenPreview(p: PlanPreview): ProposedSession[]` and `projectSessions(sessions: ProposedSession[]): ProposedSessionInput[]`, bodies verbatim from `PlanPage.tsx:25-49` (that file then imports them; the local copies are deleted). Behavior-identical; the existing `PlanPage.test.tsx` case "save posts projected four-field sessions and renders saved week" is the regression guard. `CatchUpPreview.tsx` imports both from the feature lib (FSD: features→features lib is a legal downward import within the same layer).
- **Entity type additions** (`entities/study-plan/model/types.ts`, after `RecoverySummary`):

  ```ts
  export interface CatchUpPreview extends PlanPreview {
    missedSessions: MissedSession[]; // existing interface, types.ts:140-149
    lockedPreserved: number;
    completedPreserved: number;
  }
  export interface PlannedSessionLock {
    id: string;
    locked: boolean;
  }
  ```

  Mirror of the exported service types at `study-plans.service.ts:246-250`. Add `type CatchUpPreview` and `type PlannedSessionLock` to the re-export block in `studyPlanApi.ts:10-30`.
- **Client functions** (`entities/study-plan/api/studyPlanApi.ts`, same plain-axios pattern as lines 41-68):

  ```ts
  export async function previewCatchUp(): Promise<CatchUpPreview> {
    const response = await api.post<CatchUpPreview>('/study-plans/catch-up/preview');
    return response.data;
  }
  export async function confirmCatchUpPlan(
    from: string, to: string, sessions: ProposedSessionInput[]
  ): Promise<SavedPlan> {
    const response = await api.post<SavedPlan>('/study-plans/catch-up/confirm', { from, to, sessions });
    return response.data;
  }
  export async function setPlannedSessionLock(
    sessionId: string, locked: boolean
  ): Promise<PlannedSessionLock> {
    const response = await api.patch<PlannedSessionLock>(
      `/study-plans/sessions/${sessionId}/lock`, { locked });
    return response.data;
  }
  ```
- **Error-response seams** (all read off `err.response.data`, exactly as `PlanPage.tsx:116-133`):
  | Response | Server source | Client handling |
  |---|---|---|
  | 409 `{ error: 'Conflict', conflicts: PlanConflict[] }` | `study-plans.service.ts:977-987` | decision 11 (toast + summary card + row marking); `edited` unchanged |
  | 409 `{ error: 'WINDOW_ROLLED_OVER', message }` | `study-plans.service.ts:884-892` | decision 12 banner; "Create new plan" re-runs `previewCatchUp()` |
  | 400 `{ errors: Record<string, string[]> }` | `throwFieldErrors`, `study-plans.service.ts:158-165` | `getErrorMessage(err)` toast (decision 13) |
  | 401 | global `APP_GUARD` | rides the shared `httpClient` refresh/auth handling — no surface-level code |
  | PATCH failure (any) | — | decision 7 revert + inline alert |
- **`sessionIndex` semantics:** `PlanConflict.sessionIndex` indexes the **submitted** `sessions` array, i.e. the current `edited` state in the exact order passed to `projectSessions` (`findConflicts` input order, service line 966-976). `PlanSessionEditor` renders rows in that same array order, so conflict marking matches rows by `sessionIndex === row index`. Do not sort, filter or re-key `edited` between confirm and conflict render.
- **`WorkloadWarnings` render rule:** render it only while a preview is loaded (its empty state's "Generate a plan…" copy would be wrong before a preview exists, and row 15's empty-state description refers to the warnings below a loaded preview). Do **not** pass its `errorMessage` prop on this surface — the decision-16 danger card is the single preview-error affordance (PlanPage double-renders the error; do not copy that).
- **Confirm success flow:** 201 → `toast.success('Catch-up plan saved.')` → `navigate('/catch-up')`. No local plan cache; `RecoverySummary` refetches on mount (its `load()` on every mount, `RecoverySummary.tsx:32-34`).
- **Lock-count sync:** the toggle adjusts the displayed `lockedPreserved` count locally (±1); the server truth re-syncs on the next preview generation (decision 7). No refetch on toggle success.

### Inspected code paths (all re-verified against the actual code, 2026-10-31)

- **Backend:** `apps/api/src/modules/study-plans/study-plan.controller.ts` (full file — `@Controller('study-plans')`, preview `@HttpCode(200)`, confirm uses `SaveStudyPlanDto` at line 79; no `Patch`/`Param` import today); `study-plans.service.ts` (`MissedSession` 106-115, `dtoErrors`/`throwFieldErrors` 145-165, `CatchUpPreview` 246-250, `catchUpPreview` 756-868, `catchUpConfirm` 870-1036 incl. rollover 884-892, conflict re-check 972-987, preserving `deleteMany` 1012-1018, create rows with `locked: false` 1020-1032; `save` create rows 1170-1180 omit `locked` → schema default); `study-plans.module.ts:16-17` (both controllers + service already registered — no module change); `dto/save-study-plan.dto.ts` (confirm body DTO); `apps/api/prisma/schema.prisma:343-355` (`PlannedSession.locked Boolean @default(false)`); `common/ownership/ownership.ts` (full file — `assertAffected`, `RESOURCE_NOT_FOUND`); `common/filters/all-exceptions.filter.ts:98` (only P2025 normalized); `modules/auth/auth.module.ts:47` (global `APP_GUARD`); spec conventions in `study-plans.service.spec.ts` (mocked PrismaService), `study-plans-e2e.spec.ts` and `study-plans-data-scoping.spec.ts` (both `DATABASE_URL`-gated, real DB).
- **Frontend:** `apps/web/src/pages/plan/ui/PlanPage.tsx` (flatten/project 25-49; save/rollover/conflict flow 103-137; skeletons 147-163/314-326; `WorkloadWarnings` placement 328-333) + `PlanPage.test.tsx` (7 cases incl. the four-field save projection guard); `features/study-plan/ui/PlanSessionEditor.tsx` (full file — props 9-15, clamps 22-28, live region 110-112, row markup 113-217; no `conflicts` prop today) + its 5 tests; `PlanWeek.tsx`/`WeekGrid.tsx` (props `days`/`timeZone`); `WorkloadWarnings.tsx` (props 6-12, copy 14-26, "Nothing to report." 53-60); `features/recovery/ui/RecoverySummary.tsx` (navigate 55; skeleton 70-75; error card 95-102) + `RecoverySummary.test.tsx` (mock pattern 8-12); `MissedSessionRow.tsx:23-28` (Locked badge); `pages/catch-up/ui/CatchUpPage.tsx` (current section wrapper) + `CatchUpPage.test.tsx` (mocks RecoverySummary — must be updated for the Outlet layout); `app/App.tsx` (line 66 registers only `/catch-up`; wildcard line 74); `entities/study-plan/model/types.ts` (`PlanPreview` 44-58, `PlanConflict`/`CONFLICT_REASON_LABEL` 101-117, `MissedSession` 140-149; no `CatchUpPreview`); `entities/study-plan/api/studyPlanApi.ts` + `studyPlanApi.test.ts` (axios adapter-stub client tests); `shared/ui/` (`Button` variants incl. `ghost`, `isLoading`, `focus-visible:ring-2`, `max-sm:min-h-[44px]` — no Switch; `Badge`, `Card`, `EmptyState`, `Dialog` unused, `Input`, `Select`); `shared/api/httpClient.ts` (`/api` base URL, refresh handling). `features/catch-up/` does not exist yet (new slice).
- **Upstream evidence:** `artifacts/EP08C/implementation.md` (preview/confirm implemented, no new API tests added), `artifacts/EP08D/implementation.md` + `checkpoint.md` (recovery surface + test/verification commands).

### Known limitations / open questions

1. **Locking an upcoming in-window session from the preview is not possible with today's payload.** The only per-session `locked` data in `CatchUpPreview` is `missedSessions[]` (always in the past); upcoming SCHEDULED sessions within `[from, to]` are replaced by confirm without ever being listed with ids (and `SavedPlanSession` has no `locked` field — verified `study-plans.service.ts:252-260`). The PATCH endpoint is generic and ready for such rows, but surfacing them needs a small shared-contract extension (e.g. list current-window SCHEDULED sessions with `{id, locked}` in `CatchUpPreview`, or add `locked` to `SavedPlanSession`). **Owner: planner** (shared-contract section of the EP08 README). Non-blocking: the flow this story ships (toggle operates on locked/missable past sessions listed in `missedSessions[]`; preview/edit/confirm/decline are intact) needs no contract change.
2. **Plan-page lock toggle** (locking sessions from `/plan`): the same endpoint serves it, but that is the EP06 surface — **owner: planner/user** as a separate decision, out of EP08E scope.
3. Malformed-uuid path params 500 through `AllExceptionsFilter` repo-wide (P2025-only normalization). Repo-wide convention, not EP08E's to fix; flagged for future tech-debt awareness.

## Definition of Done

1. Functional criteria pass (AC-E08-05, AC-E08-06, AC-E08-07, AC-E08-09).
2. Invalid input handled (client-side mirror of the session matrix; PATCH body validated 400).
3. Student data scoping — applies to the PATCH note: ownership-scoped `updateMany` through `studyPlan: { userId }` + `assertAffected`, uniform 404 (frontend itself stays N/A; APIs enforce).
4. Actionable API errors (400/409/404/lock-failure surfaced with actions).
5. Loading, empty, and error states handled (preview, confirm, toggle).
6. Keyboard accessibility (incl. toggle `aria-pressed` and focus-on-route-entry).
7. Responsive layouts (desktop + mobile).
8. Automated tests (TR-E08-06 + PATCH endpoint specs; TR-E08-08 recorded manual pass).
9. API/migration documentation — the PATCH endpoint spec above is the contract record; the implementer mirrors it into the EP08 README contract section (coordinator/planner owns README). No migration (the `locked` column landed with EP08A).
10. Integrated review — combined EP08 parent review.
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable outcome — the catch-up preview/edit/confirm/decline surface with the lock toggle, backed by one minimal lock-persistence endpoint. The 11 ACs were inspected against the sizing rule and serve that single observable outcome (preview → edit → confirm/decline on one surface plus its one endpoint); the negative cases live in the test matrix, not separate outcomes — no split warranted.
- **Estimate:** 3 requests/tokens (checkpoint 1: PATCH endpoint + the three spec additions; checkpoint 2: preview surface + edit/confirm/decline + states + route wiring; checkpoint 3: preservation/toggle + a11y/responsive + remaining tests + records). Cohesive because the toggle UX is meaningless without the endpoint and vice versa (sizing rule: one atomic capability, one slice).
- **Model recommendation:** 4 — editing/conflict/state complexity plus an ownership-scoped endpoint; UI decisions now settled.
- **Production files:** new `apps/web/src/features/catch-up/ui/{CatchUpPreview,CatchUpPreservationCard,CatchUpLockToggle}.tsx`; `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx` (layout conversion); `apps/web/src/app/App.tsx` (nested routes); `apps/web/src/entities/study-plan/model/types.ts` + `api/studyPlanApi.ts` (types + 3 client functions); new `apps/web/src/features/study-plan/lib/preview.ts` (extracted helpers) + `apps/web/src/pages/plan/ui/PlanPage.tsx` (import swap only) + `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx` (additive `conflicts?` prop); API: `study-plan.controller.ts`, `study-plans.service.ts`, new `dto/set-session-lock.dto.ts`.
- **Test files:** new colocated `apps/web/src/features/catch-up/ui/{CatchUpPreview,CatchUpPreservationCard,CatchUpLockToggle}.test.tsx`; additive cases in `PlanSessionEditor.test.tsx`, `studyPlanApi.test.ts`; updated `CatchUpPage.test.tsx`; API additive cases in `study-plans.service.spec.ts`, `study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`.
- **Minimal start context:** this story; EP08 README shared contract (endpoints/shapes/confirm transaction/D08-4/D08-8); `PlanPage.tsx`; `PlanSessionEditor.tsx`; `RecoverySummary.tsx` + `RecoverySummary.test.tsx`; `entities/study-plan/{model/types.ts,api/studyPlanApi.ts}`; `study-plan.controller.ts` + `catchUpConfirm`/`catchUpPreview`; `common/ownership/ownership.ts`; `shared/ui` primitives; FSD rules (`docs/epics/README.md` → Frontend architecture).
- **Verification commands:** `npm run test --workspace=apps/web`, `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`; and `npm run test --workspace=apps/api`, `npm run typecheck --workspace=apps/api`, `npm run lint --workspace=apps/api` for the PATCH note (its two DB-gated specs self-skip without `DATABASE_URL` — the unit spec carries the logic assertions locally). Pass = new specs green with the EP06/EP08 suites still green (esp. `PlanPage.test.tsx` after the extraction).
- **Dependencies / exclusions:** EP08C (implemented). Blocks EP08F (E2E). No other backend work, no scheduling logic, no plan-page changes beyond the import swap, no shared-contract changes (open question 1 is the planner's).

## Tracker reference

Jira key: Pending creation (no sync authorized).
