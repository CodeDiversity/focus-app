# EP08E — Catch-Up Plan Preview, Edit, Confirm and Decline (UI)

**Story ID:** EP08E
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** EP08C implemented (preview/confirm API). **`ui-refiner` pass required** (D08-7) before implementation.
**Jira key:** Pending creation

## Summary

Student-facing catch-up flow: generates a preview of the proposed replan, lets the student review and edit the proposed sessions, shows feasibility warnings and locked/completed-preservation indicators, and provides confirm and decline controls. Confirm persists the change set; decline leaves the plan unchanged.

## Scope

**In scope:**
- Catch-up preview generation (call `POST /study-plans/catch-up/preview`).
- Preview rendering reusing EP06's plan-page editing interactions (move/resize/delete of a proposed session).
- Feasibility-warning display (reuse EP06's warning categories/copy).
- Locked-session and completed-session preservation indicators.
- Confirm (call `POST /study-plans/catch-up/confirm`) and decline (no call) controls.
- Loading, empty, error states.
- Keyboard accessibility, responsive layout.
- Component tests.

**Out of scope:**
- The backend preview/confirm API (EP08C).
- The recovery summary (EP08D).
- Any scheduling logic.

## Source requirement references

- Epic AC-E08-05 (preview before confirm).
- Epic AC-E08-06 (locked sessions preserved) — indicator.
- Epic AC-E08-07 (report infeasible work).
- Epic AC-E08-09 (decline).
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, 9 (items 10/11 belong to the combined EP08 parent review).
- TR-E08-06, TR-E08-08.

## Acceptance criteria

1. The student can generate a catch-up preview that calls `POST /study-plans/catch-up/preview` and renders the proposed sessions grouped by day.
2. The student can edit a proposed session (move/resize/delete) before confirming, reusing EP06's editing interaction model.
3. Feasibility warnings are displayed with the same categories and copy as EP06 (`NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`).
4. Locked and completed sessions that are preserved are indicated (counts and, where applicable, markers) without being editable.
5. Confirm calls `POST /study-plans/catch-up/confirm` with the (possibly edited) sessions and shows success; on 409 conflicts, the conflicting sessions are highlighted with their reason.
6. Decline leaves the plan unchanged: no confirm call is made and no local mutation persists (the preview is discarded).
7. `WINDOW_ROLLED_OVER` (409) is surfaced with an actionable message prompting regeneration.
8. Loading, empty and error states are handled.
9. All controls are keyboard-operable with visible focus rings; the surface is usable on narrow screens.
10. No `StudySession`/`Assignment`/`Task` data is mutated by this surface beyond the confirm call.

## Tests (TR-E08-06)

- Generate → preview → edit → confirm journey.
- Decline leaves the plan unchanged.
- Feasibility-warning display.
- Locked-session indicator.
- Conflict (409) handling and highlighting.
- `WINDOW_ROLLED_OVER` handling.
- Loading/empty/error states.
- Keyboard operability.
- Narrow-screen layout.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/web/src/pages/plan/ui/PlanPage.tsx` and its tests (editing interactions to mirror).
  - `apps/web/src/features/study-plan/...` (RTK Query + editing model).
  - `apps/web/src/entities/study-plan/model/types.ts` (warning copy constants).
  - `apps/web/src/shared/ui/*` (design-system primitives).
  - FSD layers.
- **Proposed (new):** catch-up feature folder (`features/catch-up/...`) consuming the preview/confirm endpoints; reuse EP06's plan-page components where possible.
- **UI/UX gaps (to be settled by `ui-refiner`):** layout of the preview vs. current plan; the edit interaction model (reuse EP06's or a simplified one); feasibility-warning presentation; locked/completed preservation indicators; confirm/decline affordances and copy; empty/loading/error states; responsive behavior; keyboard behavior. **Do not implement before the `ui-refiner` pass.**
- **Locked-session toggle affordance (D08-4):** locked is an explicit student toggle (V-08-1 resolved 2026-10-30); the toggle UI lives here and is subject to the `ui-refiner`.

## Definition of Done

1. Functional criteria pass (AC-E08-05, AC-E08-06, AC-E08-07, AC-E08-09).
2. Invalid input handled (client-side mirror of the session matrix where applicable).
3. Student data scoping N/A (frontend; API enforces).
4. Actionable API errors (400/409/404 surfaced).
5. Loading, empty, and error states handled.
6. Keyboard accessibility.
7. Responsive layouts (desktop + mobile).
8. Automated tests (TR-E08-06).
9. API/migration documentation N/A.
10. Integrated review — combined EP08 parent review.
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable frontend outcome (catch-up preview/edit/confirm/decline + tests).
- **Estimate:** 3 requests/tokens.
- **Model recommendation:** 4 — high complexity (editing interactions, conflict handling, multiple states, a11y, responsive); UI decisions deferred to ui-refiner.
- **Production files:** `apps/web/src/features/catch-up/...`; RTK Query additions; possibly a new route in `App.tsx`.
- **Test files:** component tests beside components.
- **Minimal start context:** this story file, EP08 README, EP06F plan-page + tests, EP06G warning surfaces, `entities/study-plan/model/types.ts`, design-system primitives, FSD rules.
- **Verification commands:** `npm run test --workspace=apps/web`, `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`.
- **Dependencies:** EP08C. Blocks EP08F (E2E).
- **Exclusions:** no backend, no scheduling logic, no UI decisions (ui-refiner owns them).

## Tracker reference

Jira key: Pending creation (no sync authorized).