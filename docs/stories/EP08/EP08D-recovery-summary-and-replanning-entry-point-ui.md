# EP08D — Recovery Summary and Replanning Entry Point (UI)

**Story ID:** EP08D
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Frontend
**Status:** Needs refinement
**Refined:** 2026-10-31 (ui-refiner)
**Dependencies:** EP08A implemented (read API). **`ui-refiner` pass required** (D08-7) before implementation.
**Jira key:** Pending creation

## Summary

Student-facing recovery summary: shows missed planned sessions and unfinished work with neutral, non-blaming copy, and provides the manual entry point to start replanning. Reuses EP06's remaining-work presentation where applicable. Does not itself replan or persist changes. The recovery summary lives on a dedicated protected route `/catch-up` and leads with missed sessions, then unfinished work, with a primary "Create catch-up plan" action in the page header.

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

- Missed sessions list rendering: one row per `MissedSession` with date, assignment title, time range, `formatMinutes(durationMinutes)`, and a "Locked" badge when `locked`.
- Unfinished-work rows + remaining-hours formatting + flagged marker (MISSING_ESTIMATE / MISSING_DUE_DATE), reusing EP06's row shape/order.
- Confirmed-minutes total line renders when `confirmedMinutes > 0`.
- Non-blaming copy present; shaming terms absent (`failed`, `overdue`, `you missed`, `behind` as blame) — assert the API `message` renders and no shaming term appears.
- Entry point navigation into the catch-up flow: clicking "Create catch-up plan" calls `navigate('/catch-up/preview')` (or the route EP08E settles — see Decisions).
- Loading state: skeletons with `aria-busy`, no empty-state flash.
- Empty state: "You're all caught up." with description "No missed sessions or unfinished work."
- Error state: `role="alert"` with fallback message and "Try again" that re-runs the read.
- Keyboard operability: header button is focusable and activates on Enter/Space.
- Narrow-screen layout: header stacks and button becomes full-width below `sm`.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/web/src/pages/plan/ui/PlanPage.tsx` (existing plan surface to mirror layout, loading/error patterns).
  - `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` (row shape/order to reuse).
  - `apps/web/src/entities/study-plan/api/studyPlanApi.ts` and `model/types.ts` (client precedent).
  - `apps/web/src/shared/ui/*` (design-system primitives: `Button`, `Badge`, `Card`, `EmptyState`).
  - `apps/web/src/app/App.tsx` (routes).
  - FSD layers (`apps/web/src/features`, `entities`, `pages`).

- **Proposed (new):**
  - Route: `apps/web/src/app/App.tsx` → `<Route path="/catch-up" element={<CatchUpPage />} />` inside `ProtectedRoute`.
  - Page: `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx` (+ test) — thin wrapper rendering `<RecoverySummary />` inside the standard `max-w-5xl` container, mirroring `PlanPage`.
  - Feature: `apps/web/src/features/recovery/ui/RecoverySummary.tsx` (+ test) — fetches `getRecoverySummary()`, owns loading/empty/error state, renders the neutral message, missed-sessions list, unfinished-work list, confirmed total, and the entry-point button.
  - Feature: `apps/web/src/features/recovery/ui/MissedSessionsList.tsx` and `MissedSessionRow.tsx` — presentational; locked rows render a neutral `Badge` ("Locked") with a `Lock` icon from `lucide-react`.
  - Feature: `apps/web/src/features/recovery/ui/UnfinishedWorkList.tsx` — presentational list over `RemainingWorkItem[]` mirroring `RemainingWorkSection` row markup/order (title, course code, due date, estimate, confirmed, remaining, flagged badge). Does not re-fetch. If a shared `RemainingWorkRow` can be extracted from `RemainingWorkSection` without behavior change, prefer extraction; otherwise duplicate markup is acceptable.
  - Entity: `apps/web/src/entities/study-plan/api/studyPlanApi.ts` → add `getRecoverySummary(): Promise<RecoverySummary>` calling `GET /study-plans/recovery-summary`.
  - Entity: `apps/web/src/entities/study-plan/model/types.ts` → add `MissedSession` and `RecoverySummary` interfaces mirroring the backend contract (`missedSessions`, `missedCount`, `unfinishedWork: RemainingWorkItem[]`, `confirmedMinutes`, `message`).

- **UI/UX decisions (settled by `ui-refiner`, 2026-10-31):**
  - **Surface placement:** dedicated protected route `/catch-up` (not a section on `/plan`), keeping the weekly plan page focused. Page title "Catch up".
  - **Information hierarchy (top → bottom):** (1) page header with title + subtitle + primary action; (2) neutral message banner (only when non-empty); (3) "Missed sessions" list; (4) "Unfinished work" list with confirmed-minutes total line above it; (5) empty state replacing lists 3–4 when both are empty. Missed sessions lead because they are the trigger for replanning.
  - **Message banner:** render the API `message` verbatim inside a muted `Card` (`bg-surface-muted`), no `role="alert"` (informational). Omitted in the empty state to avoid redundancy with the empty copy.
  - **Missed session row:** date rendered verbatim as `YYYY-MM-DD` inside a `<time dateTime={date}>`; time range `{startTime} – {endTime}`; duration via `formatMinutes(durationMinutes)`; assignment title truncated with `title` tooltip; locked rows get a neutral `Badge` with a `Lock` icon and the text "Locked" (text, not colour-only).
  - **Unfinished-work rows:** reuse EP06's shape/order; total line "X minutes studied so far" via `formatMinutes(confirmedMinutes)` shown only when `confirmedMinutes > 0`, placed above the list.
  - **Entry point:** primary `Button` ("Create catch-up plan") in the page header, right side on `sm+`, full-width on mobile, disabled with `aria-disabled="true"` when the summary is empty (nothing to replan). On click, `navigate('/catch-up/preview')`. **Flag for EP08E:** if EP08E settles a different route for the preview flow, update this navigation target and the EP08E entry accordingly — both stories must agree.
  - **Empty state:** `EmptyState` with title "You're all caught up." and description "No missed sessions or unfinished work." (no icon required; optional check icon allowed). Header button remains rendered but disabled.
  - **Loading state:** three pulsing skeleton rows inside the missed-sessions and unfinished-work cards, `aria-busy="true"` on the section, `motion-reduce:animate-none`; no empty-state flash (render skeletons while `isLoading`).
  - **Error state:** `role="alert"` card with danger styling, message from `getErrorMessage(err)` or fallback "We could not load your recovery summary. Try again.", and an outline "Try again" button that re-runs the read.
  - **Accessibility (WCAG 2.2 AA):** page `<section aria-labelledby="catch-up-heading">`; lists are real `<ul>`/`<li>`; native buttons/links only (no custom key handling); visible focus rings via the shared `focus-visible:ring-*` classes; locked badge carries text; skeletons use `aria-busy` and `motion-reduce`; colour is never the only signal.
  - **Responsive:** container `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12`; header uses `flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between`; button `w-full sm:w-auto`; rows use `flex flex-wrap` so content wraps on narrow screens.
  - **Copy (non-blaming, D08-8):** title "Catch up"; subtitle "See what's behind and create a plan to get back on track." (factual, not shaming); section headings "Missed sessions" and "Unfinished work"; empty "You're all caught up." / "No missed sessions or unfinished work."; error fallback as above; button "Create catch-up plan". Avoid `failed`, `overdue`, `you missed`, and punitive phrasing. The API `message` is rendered verbatim and is the source of truth for the neutral banner.

- **Decisions (ui-refiner, 2026-10-31):**
  - D08-7 (surface placement): dedicated `/catch-up` route. Reason: keeps `/plan` focused and mirrors the existing page-per-concern pattern; EP08E can share the route family.
  - D08-7 (information hierarchy): missed sessions first, then unfinished work. Reason: missed sessions are the trigger; unfinished work provides context for the replan.
  - D08-7 (entry point): primary button "Create catch-up plan" in the header, disabled when empty. Reason: matches the backend message and keeps the action always discoverable.
  - D08-7 (locked treatment): neutral `Badge` with `Lock` icon + "Locked" text. Reason: non-colour-only, consistent with EP05's overdue badge pattern.
  - D08-7 (confirmed total): show "X minutes studied so far" above unfinished work when `> 0`. Reason: reinforces progress without blaming; omits awkward zero line.
  - D08-7 (empty copy): "You're all caught up." / "No missed sessions or unfinished work." Reason: encouraging and neutral.
  - D08-8 (non-blaming copy): all labels above avoid punitive terms; the API `message` is the source of truth for the banner.

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
- **Production files:** `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx`; `apps/web/src/features/recovery/ui/*`; RTK Query/plain-client additions in `entities/study-plan/api/studyPlanApi.ts` and `model/types.ts`; route in `App.tsx`.
- **Test files:** component tests beside components (`RecoverySummary.test.tsx`, `MissedSessionsList.test.tsx`, etc.).
- **Minimal start context:** this story file, EP08 README, EP06F/EP06G frontend patterns, `PlanPage.tsx`, design-system primitives, FSD rules.
- **Verification commands:** `npm run test --workspace=apps/web`, `npm run typecheck --workspace=apps/web`, `npm run lint --workspace=apps/web`.
- **Dependencies:** EP08A. Blocks EP08E (entry point navigates into it) and EP08F (E2E).
- **Exclusions:** no backend, no replanning logic, no UI decisions (ui-refiner owns them).

## Tracker reference

Jira key: Pending creation (no sync authorized).