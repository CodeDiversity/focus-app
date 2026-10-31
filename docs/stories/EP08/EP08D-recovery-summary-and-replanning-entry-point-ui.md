# EP08D — Recovery Summary and Replanning Entry Point (UI)

**Story ID:** EP08D
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Frontend
**Status:** Ready
**Refined:** 2026-10-31 (ui-refiner, 2026-10-31) / Technical refined: 2026-10-31
**Dependencies:** EP08A implemented (read API) — verified (see evidence below). **`ui-refiner` pass completed** (D08-7, 2026-10-31). No open UI/UX decisions.
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

- **MissedSessionsList/MissedSessionRow**: one row per `MissedSession` with date (`<time>`), assignment title, time range `{startTime} – {endTime}`, `formatMinutes(durationMinutes)`, and neutral "Locked" badge with `Lock` icon when `locked`. Locked badge has text (not color-only). Tooltip on truncated title.
- **UnfinishedWorkList**: rows reuse EP06 shape/order (title, courseCode, due date, estimate/confirmed/remaining, flagged badge). MISSING_ESTIMATE/MISSING_DUE_DATE badges render correctly. "Confirmed" and "Left" labels formatted via `formatMinutes`.
- **Confirmed-minutes total**: "X minutes studied so far" renders when `confirmedMinutes > 0`, placed above unfinished work list; omitted when 0.
- **Message banner**: API `message` renders verbatim in muted Card; omitted in empty state. Assert non-blaming copy; shaming terms absent (`failed`, `overdue`, `you missed`, `behind` as blame).
- **Entry point navigation**: clicking "Create catch-up plan" calls `navigate('/catch-up/preview')`. Button disabled with `aria-disabled="true"` when empty (no missed sessions and no unfinished work).
- **Loading state**: skeletons with `aria-busy="true"`, `motion-reduce:animate-none`; no empty-state flash while loading.
- **Empty state**: "You're all caught up." with description "No missed sessions or unfinished work." (via `EmptyState`); header button remains rendered but disabled.
- **Error state**: `role="alert"` card with danger styling, fallback message "We could not load your recovery summary. Try again." or from `getErrorMessage`, "Try again" button re-runs `getRecoverySummary()`.
- **Keyboard operability**: header button is focusable and activates on Enter/Space (native button). Focus rings visible via shared classes.
- **Accessibility**: section `aria-labelledby="catch-up-heading"`, lists use `<ul>/<li>`, locked badge has text, `aria-busy` on loading sections.
- **Narrow-screen layout**: header stacks (`flex-col-reverse` on mobile), button full-width on mobile, wraps on narrow screens.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/web/src/pages/plan/ui/PlanPage.tsx` (existing plan surface to mirror layout, loading/error patterns).
  - `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` (row shape/order to reuse; uses `RemainingWorkItem` from entity types).
  - `apps/web/src/entities/study-plan/api/studyPlanApi.ts` and `model/types.ts` (client precedent; `RemainingWorkItem`/`RemainingWorkResponse` already exist).
  - `apps/web/src/shared/ui/*` (design-system primitives: `Button`, `Badge`, `Card`, `EmptyState`).
  - `apps/web/src/app/App.tsx` (routes, ProtectedRoute usage).
  - `apps/api/src/modules/study-plans/study-plans.service.ts` (EP08A implementation — verified `MissedSession`, `RecoverySummary` types; `getRecoverySummary` returns shape as specified).
  - `apps/api/src/modules/study-plans/study-plan.controller.ts` (route registered `GET /study-plans/recovery-summary`).
  - FSD layers (`apps/web/src/features`, `entities`, `pages`).

- **Backend contract mirror (verified against EP08A):**
  - Endpoint: `GET /study-plans/recovery-summary` (relative to API root; called via `/api` proxy). Auth required; ownership-scoped; uniform 404 `Resource not found`.
  - `MissedSession` (from `apps/api/src/modules/study-plans/study-plans.service.ts:105-115`): `{ id, assignmentId, assignmentTitle, date: "YYYY-MM-DD", startTime: "HH:mm", endTime: "HH:mm", durationMinutes: number, locked: boolean }` (never exposes `userId`).
  - `RecoverySummary` (from `apps/api/src/modules/study-plans/study-plans.service.ts:117-124`): `{ missedSessions: MissedSession[], missedCount: number, unfinishedWork: RemainingWorkItem[], confirmedMinutes: number, message: string }`. `unfinishedWork` reuses EP06 `RemainingWorkItem[]` (via `getRemainingWork`); `confirmedMinutes` is `remaining.unattributedConfirmedMinutes` (State A total until EP06 State-B upgrade; per PR-003). Message is neutral placeholder.
  - Missed-session query (service:540-566): `studyPlan: { userId, date: { lt: bound } }` with `bound = new Date(\`\${todayCivil}T00:00:00.000Z\`)` (civil date as UTC midnight, no zone conversion), `status: 'SCHEDULED'`, `assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } }`. Ordered by `studyPlan.date asc`, `startTime asc`. Locked sessions are included if they meet criteria (locked does not change missed-ness).

- **Entity client/types (exact to implement):**
  - `apps/web/src/entities/study-plan/model/types.ts` — add:
    ```ts
    export interface MissedSession {
      id: string;
      assignmentId: string;
      assignmentTitle: string;
      date: string; // YYYY-MM-DD (civil, profile zone)
      startTime: string; // HH:mm
      endTime: string; // HH:mm
      durationMinutes: number;
      locked: boolean;
    }

    export interface RecoverySummary {
      missedSessions: MissedSession[];
      missedCount: number;
      unfinishedWork: RemainingWorkItem[]; // reuse existing type
      confirmedMinutes: number;
      message: string;
    }
    ```
    (Mirror field names/order as appropriate; `unfinishedWork` must use the existing `RemainingWorkItem` type to avoid duplication.)
  - `apps/web/src/entities/study-plan/api/studyPlanApi.ts` — add export types `MissedSession`, `RecoverySummary` in the re-exports block; add:
    ```ts
    export async function getRecoverySummary(): Promise<RecoverySummary> {
      const response = await api.get<RecoverySummary>('/study-plans/recovery-summary');
      return response.data;
    }
    ```
    Follow existing pattern (plain axios via `api`, no RTK Query unless project convention changes; current pattern is plain functions).

- **Route wiring:**
  - `apps/web/src/app/App.tsx` — import `CatchUpPage` from `@/pages/catch-up/ui/CatchUpPage` and add route inside the ProtectedRoute block: `<Route path="/catch-up" element={<CatchUpPage />} />`. Place near `/plan` or in logical order (no special routing constraints). Must remain inside `ProtectedRoute` (same as `/plan`).

- **Component scaffolding (new files):**
  - Page: `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx` (+ test `CatchUpPage.test.tsx`) — thin wrapper rendering `<RecoverySummary />` inside `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12`, mirroring `PlanPage` structure (section with aria-labelledby, header). Title "Catch up".
  - Feature: `apps/web/src/features/recovery/ui/RecoverySummary.tsx` (+ test `RecoverySummary.test.tsx`) — fetches via `getRecoverySummary()` on mount, manages `isLoading`/`error`/`data` state. Renders header (title + subtitle + primary button), message banner (muted Card, API `message` verbatim, omitted in empty state), "Missed sessions" list, "Unfinished work" list with confirmed-minutes total above it when `> 0`, empty state when no missed sessions and no unfinished work. Entry button: "Create catch-up plan" — primary, right side on `sm+`, full-width on mobile, disabled with `aria-disabled="true"` when empty (both arrays empty). On click `navigate('/catch-up/preview')` (flag for EP08E to confirm route if different; current ui-refiner decision says `/catch-up/preview`).
  - Feature: `apps/web/src/features/recovery/ui/MissedSessionsList.tsx` (+ test) and `MissedSessionRow.tsx` (+ test) — presentational. Row shows date in `<time dateTime={date}>{date}</time>`, time range `{startTime} – {endTime}`, duration via `formatMinutes(durationMinutes)` (import from `@/features/study-plan/lib/formatMinutes` like RemainingWorkSection), assignment title truncated with `title` tooltip. Locked rows get neutral `Badge` with `Lock` icon from `lucide-react` and text "Locked" (text, not color-only).
  - Feature: `apps/web/src/features/recovery/ui/UnfinishedWorkList.tsx` (+ test) — presentational over `RemainingWorkItem[]`, mirrors `RemainingWorkSection` row markup/order (title, course code, due date, estimate/confirmed/remaining, flagged badge). Prefer reusing logic; duplicate markup acceptable if extraction would change behavior. Confirmed-minutes total "X minutes studied so far" rendered by parent when `confirmedMinutes > 0`.

- **Utilities/patterns:**
  - Use `getErrorMessage(err)` for error messages (like PlanPage/RemainingWorkSection).
  - Use existing primitives: `Button`, `Badge`, `Card`, `EmptyState` from `@/shared/ui/*`.
  - Icons: `lucide-react` (already used in project).
  - Formatting: `formatMinutes` from `@/features/study-plan/lib/formatMinutes`.
  - Navigation: `useNavigate()` from `react-router-dom`.
  - States: skeletons with `aria-busy="true"`, `motion-reduce:animate-none`; error with `role="alert"`; lists use `<ul>/<li>`; section has `aria-labelledby`.

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