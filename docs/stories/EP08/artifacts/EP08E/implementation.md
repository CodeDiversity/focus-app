# EP08E implementation record
Updated: 2026-10-31 (evening, local)
Story: docs/stories/EP08/EP08E-catch-up-plan-preview-edit-confirm-and-decline-ui.md
Status: Implemented — awaiting parent review (combined EP08 review after EP08F)
Checkpoint: ./checkpoint.md
Commits: backend `dde6780` (PATCH endpoint + specs + queue); frontend + closeout docs with the closeout commit (hash in the closeout handoff / `git log`, "feat(EP08E)")

## AC-by-AC outcomes
- AC 1: Preview self-fetches on mount (`previewCatchUp` → `POST /study-plans/catch-up/preview`) and renders proposed sessions grouped by day — Done (`CatchUpPreview` deep-link test "fetches the preview on mount and renders proposed sessions grouped by day": 7 day columns + editor rows + server window line). Week grid + editable list mirror `PlanPage` via shared `PlanWeek`/`PlanSessionEditor` and the extracted `features/study-plan/lib/preview.ts` (`flattenPreview`/`projectSessions`).
- AC 2: Edit proposed sessions (move/resize/delete) before confirming — Done (reuses `PlanSessionEditor` unchanged interaction model; test "editing a proposed session then confirming posts the exact four-field body" moves a row to 09:15–10:15 and confirms the edited value).
- AC 3: Feasibility warnings via `WorkloadWarnings` with preview `warnings`/`deferred` — Done (rendered under the editor while the preview is loaded; same component/categories/copy as EP06; component is EP06-tested, no behavior forked).
- AC 4: Preserved-session indicators — Done (`CatchUpPreservationCard`: `lockedPreserved`/`completedPreserved` neutral count lines + read-only card per locked missed session; tests prove no inputs/selects, no delete, and that locked sessions never appear in `PlanSessionEditor` rows).
- AC 5: Explicit lock toggle (D08-4) — Done (`CatchUpLockToggle`: `aria-pressed` button → `setPlannedSessionLock(sessionId, next)` → `PATCH /study-plans/sessions/:id/lock`; success updates local state and syncs the surface ±1 without refetch — locked card leaves the list; failure reverts `aria-pressed` and shows the inline `role="alert"` "We couldn't update that session's lock. Try again."; disabled/busy while pending; sr-only live announcement). 5 toggle tests + preview failure/sync tests green.
- AC 6: Confirm posts `{ from, to, sessions: [{ assignmentId, date, startTime, endTime }] }` from edited proposals — Done (test asserts exact four-field objects, no extra keys; success toast + navigate `/catch-up`). 409 conflicts: offending rows marked via new additive `conflicts` prop on `PlanSessionEditor` (`border-danger` + `CONFLICT_REASON_LABEL` text) and listed in a `role="alert"` summary; edits preserved; toast `Confirm rejected: …`.
- AC 7: Decline = no request, no persisted mutation — Done ("'Not now' makes no request and returns to /catch-up"; preview is flow-local state discarded on unmount; V-08-4 side-effect-free).
- AC 8: `WINDOW_ROLLED_OVER` surfaced with regeneration prompt + working "Create new plan" — Done (banner `role="alert"` with the server message; action re-runs the preview; test proves proposal replaced then regenerated).
- AC 9: Loading/empty/error for generation, confirm and toggle — Done (skeleton with `aria-busy`; "Nothing new to schedule" empty state; danger card + "Try again" on preview fetch failure; confirm button loading/disabled state; toggle busy/disabled + inline error).
- AC 10: Keyboard-operable, visible focus, narrow screens, non-blaming copy (D08-8) — Done (keyboard test drives header/editor/toggle via Tab/Enter; focus moves to the `<h1>` on entry — decision 20; responsive header/grid mirror `PlanPage` breakpoints; "copy contains no blaming terms" test asserts absence of shaming phrasing). See TR-E08-08 record below for manual-label honesty.
- AC 11: No `StudySession`/`Assignment`/`Task` mutation beyond confirm + lock PATCH — Done (surface calls only `previewCatchUp` (side-effect-free), `confirmCatchUpPlan`, `setPlannedSessionLock`; backend PATCH writes only the `locked` column — data-scoping spec asserts field-for-field).
- Scoped backend note (PATCH endpoint) — Done at `dde6780`: `SetSessionLockDto` (@IsBoolean), `@Patch('sessions/:sessionId/lock')` `@HttpCode(200)`, service `setSessionLock` with dtoErrors re-check → scoped `updateMany { id, studyPlan: { userId } }` (`data` = `{ locked }` only) → `assertAffected` → scoped `findMany` echo `{ id, locked }` / uniform 404. Unit spec 3/3 green locally.

## Changed paths
Backend (commit `dde6780`):
- apps/api/src/modules/study-plans/dto/set-session-lock.dto.ts (new)
- apps/api/src/modules/study-plans/study-plan.controller.ts (`@Patch` route)
- apps/api/src/modules/study-plans/study-plans.service.ts (`setSessionLock`)
- apps/api/src/modules/study-plans/study-plans.service.spec.ts (unit describe, 3 cases)
- apps/api/src/modules/study-plans/study-plans-e2e.spec.ts (401/400s/happy describe — DATABASE_URL-gated)
- apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts (two-student matrix describe — DATABASE_URL-gated)

Frontend (closeout commit):
- apps/web/src/features/catch-up/ui/CatchUpPreview.tsx + .test.tsx (new, 14 tests)
- apps/web/src/features/catch-up/ui/CatchUpPreservationCard.tsx + .test.tsx (new, 3 tests)
- apps/web/src/features/catch-up/ui/CatchUpLockToggle.tsx + .test.tsx (new, 5 tests)
- apps/web/src/features/study-plan/lib/preview.ts (new — extracted from PlanPage; PlanPage.test.tsx is the regression guard)
- apps/web/src/entities/study-plan/model/types.ts (`CatchUpPreview`, `PlannedSessionLock`, adapter re-export)
- apps/web/src/entities/study-plan/api/studyPlanApi.ts (`previewCatchUp`, `confirmCatchUpPlan`, `setPlannedSessionLock`) + studyPlanApi.test.ts (additive adapter-stub cases)
- apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx (additive optional `conflicts` prop) + .test.tsx (additive cases; existing five untouched and green = EP06 regression guard)
- apps/web/src/pages/plan/ui/PlanPage.tsx (import swap to `lib/preview`)
- apps/web/src/pages/catch-up/ui/CatchUpPage.tsx + .test.tsx (Outlet layout; nested-route mirror)
- apps/web/src/app/App.tsx (nested `/catch-up` route: index → RecoverySummary, `preview` → CatchUpPreview)
- docs/stories/EP08/artifacts/EP08E/{checkpoint,implementation}.md, docs/stories/EP08/README.md (queue, own hunks only)

## Verification (executed on the final tree, 2026-10-31)
- Apps/api (cwd apps/api): `npx jest src/modules/study-plans` → 30 passed / 36 skipped; full `npm test` → 897 passed / 443 skipped / 0 failed (41 suites); `tsc --noEmit` clean; `npx eslint src/modules/study-plans --max-warnings 0` clean.
- Apps/web (cwd apps/web): `npx vitest run` → 1131 passed / 100 files; `tsc --noEmit` clean; `npx eslint src --max-warnings 0` clean; no React "not wrapped in act" warnings in the catch-up suites.
- Skips are honest: the PATCH e2e + data-scoping describes sit in the repo's `DATABASE_URL`-gated suites and self-skip locally (no DATABASE_URL in this environment). Behavior is pinned locally by the unit spec (scoped where, `data` = `{ locked }` only, uniform 404, 400 field errors). They will execute in any environment with `DATABASE_URL`.

## TR-E08-08 manual accessibility pass (honest execution labels)
- Keyboard operability — EXECUTED (automated): "is keyboard operable" test drives Tab through Use-this-plan/Not-now and Enter on editor move + lock toggle.
- Focus on entry — EXECUTED (automated): heading receives programmatic focus (`document.activeElement` asserted); visible focus styling uses the shared `focus-visible` button/card conventions already shipped on EP06 surfaces — visual ring itself NOT eyeballed in a real browser.
- Screen-reader structure — EXECUTED (automated structure): section `aria-labelledby`, toggle `aria-pressed` + sr-only `role="status"` announcements, `role="alert"` on errors/conflicts. Full VoiceOver walkthrough NOT executed — recommended manual step for the parent review: route `/catch-up/preview`, listen for heading announcement, toggle a lock, hear "Lock saved", force a 409 and hear the conflict summary.
- Reduced motion — NOT executed: skeleton pulses use `motion-reduce:animate-none` (code-verified, same pattern as PlanPage). Manual check: enable OS reduce-motion, generate a preview, confirm no pulsing.
- Narrow screen — NOT executed: header/controls use the shipped `flex-col-reverse` + `sm:` responsive conventions. Manual check: 320px viewport, confirm header stacks (Not now below Use this plan), week grid scrolls horizontally, toggle remains tappable. EP08F's Playwright viewport matrix is the durable cross-layer proof.

## Findings / deviations
1. Preservation count copy adapts singular/plural from the decision-5 templates ("1 locked session stays exactly where it is." / "2 locked sessions stay exactly where they are."; same for completed) — decision templates were plural-only; singular is required for count 1 and keeps D08-8 tone.
2. Lock-toggle failure surfaces an inline `role="alert"` error (per AC 5's "actionable inline error"), not a toast; the toast path is reserved for confirm/preview errors.
3. 409 handling follows the existing EP08D client error shape (`error.response.data = { error, conflicts: [{ sessionIndex, date, startTime, reason }] }`); `sessionIndex` keys into the edited-array order at confirm time — not re-keyed (per story decision). Conflict summary toast: `Confirm rejected: <date> <startTime> — <label>[; …]`.
4. Running the repo's own lint pipeline (`eslint --fix`, what lint-staged runs on commit) normalized pre-existing prettier drift in `PlanSessionEditor.tsx` beyond the added prop; markup semantics unchanged, the five EP06 regression cases are byte-identical and green.
5. `WorkloadWarnings` deliberately not given `errorMessage` (story note) and rendered only while a preview is loaded.
6. Out of scope, untouched (planner-owned open questions, unchanged): in-window SCHEDULED `{id, locked}` list extension; plan-page lock toggle. Malformed-uuid params 500 repo-wide (known tech debt) — new tests use valid uuids.
7. Foreign uncommitted work preserved untouched: `.agents/skills/autopilot/SKILL.md`, `.agents/workflow-graph.md`, and the coordinator's `### Autopilot` hunk in `docs/stories/EP08/README.md` (README staged via hunk-filtered patch, own hunks only).

## Definition of Done (child-level 1–9; parent gate 10/11 later)
1. Story implemented per settled decisions ✓ 2. Ownership-scoped backend query (userId-scoped updateMany/findMany, `assertAffected`) ✓ 3. Auth via global guard, e2e spec pins 401 ✓ 4. No cross-tenant leakage (uniform 404; data-scoping spec) ✓ 5. Automated tests added and green ✓ 6. Typecheck + lint clean both apps ✓ 7. Checkpoint/queue/implementation records current ✓ 8. TR-E08-06 automated; TR-E08-08 recorded with honest labels ✓ 9. No scope expansion (no contract change, no EP08C behavior change, no plan-page toggle, no EP08F start) ✓
