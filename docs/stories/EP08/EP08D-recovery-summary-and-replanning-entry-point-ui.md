# EP08D — Recovery Summary and Replanning Entry Point (UI)

**Story ID:** EP08D
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** EP08A implemented (read API). **`ui-refiner` pass required** (D08-7) before implementation.
**Jira key:** Pending creation

## Summary

Student-facing recovery summary: shows missed planned sessions and unfinished work with neutral, non-blaming copy, and provides the manual entry point to start replanning. Reuses EP06's remaining-work presentation where applicable. Does not itself replan or persist changes.

## Scope

**In scope:**
- Recovery summary surface (missed sessions list, unfinished-work rows, confirmed-minutes total, neutral message).
- Manual "replan" entry point that navigates into EP08E's catch-up preview flow.
- Loading, empty, error states.
- Keyboard accessibility, responsive layout.
- Component tests.

**Out of scope:**
- The catch-up preview/edit/confirm flow (EP08E).
- Any backend (EP08A).
- Any scheduling logic.

## Source requirement references

- Epic AC-E08-01 (missed sessions displayed; completed assignments excluded).
- Epic AC-E08-02 (manual replanning initiation).
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, 9 (items 10/11 belong to the combined EP08 parent review).
- TR-E08-05, TR-E08-08.

## Acceptance criteria

1. The recovery summary surface renders the missed sessions returned by `GET /study-plans/recovery-summary` (date, assignment, duration, locked indicator).
2. Completed assignments' planned sessions are never shown as missed (AC-E08-01) — verified via the API contract, not client-side filtering.
3. Unfinished-work rows reuse EP06's remaining-work shape and ordering.
4. A neutral, non-blaming message is shown when there are missed sessions or unfinished work; no punitive copy (D08-8).
5. An empty state is shown when there is nothing to recover (no missed sessions, no unfinished work).
6. Loading and error states are handled with actionable messages.
7. A manual "replan"/"catch up" control is present and navigates into the catch-up preview flow (EP08E).
8. All controls are keyboard-operable with visible focus rings; the surface is usable on narrow screens.
9. No `StudySession`/`Assignment`/`Task` data is mutated by this surface.

## Tests (TR-E08-05)

- Missed sessions list rendering.
- Unfinished-work rows + remaining-hours formatting + flagged marker.
- Non-blaming copy present; shaming terms absent (provisional assertion, copy settled by `ui-refiner`).
- Entry point navigation into the catch-up flow.
- Loading/empty/error states.
- Keyboard operability.
- Narrow-screen layout.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/web/src/pages/plan/ui/PlanPage.tsx` (existing plan surface to mirror).
  - `apps/web/src/entities/study-plan/...` (RTK Query client).
  - `apps/web/src/app/App.tsx` (routes).
  - `apps/web/src/shared/ui/*` (design-system primitives).
  - FSD layers (`apps/web/src/features`, `entities`, `pages`).
- **Proposed (new):** RTK Query endpoint for recovery summary; a `recovery` feature folder (`features/recovery/...`) or a section on the plan page; route decision provisional (ui-refiner decides whether it's a new `/catch-up` route or a section).
- **UI/UX gaps (to be settled by `ui-refiner`):** layout and information hierarchy of the missed-sessions list vs. unfinished-work list; the "behind" messaging tone and exact copy; the replanning entry point placement and affordance; empty/loading/error presentation; keyboard behavior; responsive behavior; whether locked sessions get a distinct visual treatment. **Do not implement before the `ui-refiner` pass.**
- **Non-blaming copy is a hard requirement (D08-8)** regardless of the ui-refiner's wording choice.

## Definition of Done

1. Functional criteria pass (AC-E08-01, AC-E08-02 read side).
2. Invalid input N/A (frontend consumes API; client-side mirror of bounds where applicable).
3. Student data scoping N/A (frontend; API enforces).
4. Actionable API errors (surface API errors to the user).
5. Loading, empty, and error states handled.
6. Keyboard accessibility.
7. Responsive layouts (desktop + mobile).
8. Automated tests (TR-E08-05).
9. API/migration documentation N/A.
10. Integrated review — combined EP08 parent review.
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable frontend outcome (recovery summary surface + entry point + tests).
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — moderate complexity (data fetching, states, a11y, responsive); UI decisions deferred to ui-refiner.
- **Production files:** `apps/web/src/features/recovery/...` or `apps/web/src/pages/catch-up/...`; RTK Query additions in `entities/study-plan/api/...`; route in `App.tsx`.
- **Test files:** component tests beside components.
- **Minimal start context:** this story file, EP08 README, EP06F/EP06G frontend patterns, `PlanPage.tsx`, design-system primitives, FSD rules.
- **Verification commands:** `npm run test --workspace=apps/web`, `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`.
- **Dependencies:** EP08A. Blocks EP08E (entry point navigates into it) and EP08F (E2E).
- **Exclusions:** no backend, no replanning logic, no UI decisions (ui-refiner owns them).

## Tracker reference

Jira key: Pending creation (no sync authorized).