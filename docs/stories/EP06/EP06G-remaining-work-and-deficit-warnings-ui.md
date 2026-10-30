# EP06G: Remaining-Work & Deficit-Warning Surfaces

**Story ID:** EP06G
**Title:** Frontend — the remaining-work list and the workload-deficit warnings on the study-plan page
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** Needs refinement — a `ui-refiner` pass is required before implementation (D06-15).
**Dependencies:** EP06B implemented (the `GET /study-plans/remaining-work` read) and EP06F implemented (the plan page that hosts the two sections).
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

Two things the epic asks for are about understanding, not scheduling: the student must see how much work is left on each assignment, and the student must be told when work cannot fit before a deadline. EP06B owns the numbers; this story renders them — a per-assignment remaining-work list and a warnings section — on the plan page, with the flagged assignments marked rather than hidden.

## Description & bounded scope

### In scope

1. **The entity client extension** — `listRemainingWork()` in `apps/web/src/entities/study-plan/api/studyPlanApi.ts` → `GET /study-plans/remaining-work`.
2. **The remaining-work section** `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` — one row per unfinished assignment: its title, its course, its due date, its estimate, its confirmed study time and what is left, plus a **flagged marker** when the assignment is missing the information needed to schedule it (`MISSING_ESTIMATE` / `MISSING_DUE_DATE`).
3. **The warnings section** `apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx` — the preview's `warnings` (`NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`) and the `deferred` list, each with the minutes involved and a calm, factual explanation. The copy is the frontend's — the API returns structured facts and minutes, never prose (D06-11).
4. **The mount** — both sections are added to the existing plan page (`apps/web/src/pages/plan/ui/PlanPage.tsx`) as their own blocks, following EP06F's layout. EP06G **extends** the page that EP06F created; the two children are sequential and one writer owns them.
5. **The states** — the loading state (the remaining work is not yet known), the empty state (nothing is unfinished — a calm, expected state, not an error), and the error state (the read failed).
6. **Tests** — the component tests (TR-E06-07).

### Out of scope

- The engine, the remaining-work calculation and the read API — **EP06B**.
- The preview, the editing and the save — **EP06F**.
- The preferences surface — **EP06E**.
- The copy of the warnings being decided by the planner — it is the `ui-refiner`'s and the product's; this story implements whatever that pass settles.
- The EP08 catch-up workflow (the "unfinished-work recovery summary" is EP08's) — this story shows the **current** remaining work only.
- The calendar read model and the dashboard widget — **not EP06's** (D06-18, seam V-05-1).

## Source requirement references

- **Epic AC-E06-02** ("The system calculates remaining estimated work from assignment estimates and confirmed study time") — the frontend half.
- **Epic AC-E06-07** ("The system reports work that cannot fit before a deadline") — the frontend half.
- **Epic AC-E06-09** ("Assignments missing necessary scheduling information are flagged rather than silently scheduled") — the visible marker.
- **TR-E06-07** (this child's test obligations) and **TR-E06-09** (the recorded manual accessibility pass).
- **Shared DoD** — items 1, 2, 4, 5, 6, 7, 8 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-2 (one assignment's work spread across sessions), D06-7 (the unattributed confirmed minutes), D06-10 (the overdue report), D06-11 (the three deficit categories and the deferred list), D06-15 (this story's `Needs refinement` status); and the parent README's **Shared API/data contract** → *The study-preferences shape* is not involved here; the relevant parts are the `RemainingWorkItem` payload, the `PlanPreview` payload's `warnings` and `deferred`, and *The engine's rules* 6–9.

## Acceptance criteria

1. The plan page shows a remaining-work section with one row per unfinished assignment: its title, its course (when it has one), its due date, its estimate, its confirmed study time and its remaining minutes; the confirmed time is shown as `0` when nothing has been confirmed (D06-7), not as a missing value.
2. An assignment that is missing the estimate or the due date is shown with a **visible, non-colour-only marker** naming the reason, and its estimate/remaining values read as "not set" rather than `0` (AC-E06-09).
3. The warnings section shows the preview's warnings, each with the assignment, the reason category and the minutes involved; the three categories are distinguished in the wording (`NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`) and the deferred list is shown separately from the warnings, because deferred work is not a warning.
4. The warnings and the remaining-work rows are **factual and blame-free**: no wording states that the student is behind, has failed or has wasted time (EP08's "useful feedback without blame or punitive messaging" principle, applied here because EP06's warnings are the first thing a student reads when a plan does not fit).
5. The remaining-work section loads independently of the preview: a student who has never generated a plan still sees how much work is left.
6. The empty state (nothing unfinished) is calm and factual — it is not an error and it does not offer an action that does not exist.
7. Every control and every link in the two sections is reachable and operable with the keyboard, has a visible focus ring and an accessible name; the sections are usable at a 375px viewport.
8. The component tests cover the row content, the flagged marker, the three warning categories, the deferred list, the empty state and the error state.

## Tests to add / update

- `apps/web/src/features/study-plan/ui/RemainingWorkSection.test.tsx` (new) — the component tests:
  - one row per item with the title, the course, the due date, the estimate, the confirmed minutes and the remaining minutes;
  - the confirmed minutes render as `0` (not as a dash) when nothing is confirmed;
  - a `MISSING_ESTIMATE` item shows the marker and reads "not set" for its estimate and its remaining minutes;
  - a `MISSING_DUE_DATE` item shows the marker and keeps its estimate;
  - the empty state renders when there are no items;
  - the error state renders a readable message;
  - the marker is not colour-only (it carries text).
- `apps/web/src/features/study-plan/ui/WorkloadWarnings.test.tsx` (new) — the component tests:
  - each warning category renders with its assignment and its minutes;
  - the deferred list renders separately from the warnings;
  - the empty state renders when there are neither warnings nor deferred work;
  - the error state renders a readable message.
- `apps/web/src/pages/plan/ui/PlanPage.test.tsx` (modify) — the page renders both sections and the remaining-work read happens on mount, independently of the preview.

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` and `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.tsx` (EP05) — the closest existing precedent for a list section on a page: a labelled region, a per-row layout, an `EmptyState` with its own icon and content, and a cap with a "see all" link.
- `apps/web/src/features/dashboard/ui/dashboardEmptyStates.tsx:51-58` — the empty-state copy convention (calm and factual; a state may not read as a broken feature).
- `apps/web/src/shared/ui/` — the EP10 primitives (`Card`, `Badge`, `EmptyState`, `Button`, `Dialog`); `Badge` is the marker primitive and its colour must never be the only signal (EP04's AC-E04-08 convention).
- `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx:14-20` and `CalendarEventChip.tsx:26-31` — the icon + label convention for a status ("Completed", "Overdue") and the non-colour-only rule.
- `apps/web/src/shared/lib/errors.ts` — `getErrorMessage(err)` for the error state; `apps/web/src/shared/lib/datetime.ts` — `formatDateTime` for the due-date rendering.
- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — the existing assignment-row precedent (title, status, deadline formatting) that this section's row may borrow in spirit without importing upward (a shared row belongs to the `assignments` feature; this section renders its own row inside the `study-plan` feature).
- `apps/web/.eslintrc.cjs` — the FSD layer rules; the section lives in `features/study-plan/ui/` and may import downward only.

### Implementation notes (concrete)

1. **The client.** `listRemainingWork(): Promise<RemainingWorkResponse>` → `GET /study-plans/remaining-work`; the response is `{ items: RemainingWorkItem[]; unattributedConfirmedMinutes: number }`.
2. **The two sections are independent.** The remaining-work section reads on mount (or when the page mounts), independently of the preview: a student who has not generated a plan still sees what is left. The warnings section renders the preview's `warnings`/`deferred` — it has nothing to show before a preview exists, and it says so with its empty state rather than with an error.
3. **The minutes are formatted, not printed raw.** The remaining minutes and the warning minutes are rendered as hours and minutes (`3 h 20 min`, `45 min`) through a shared helper in the feature's `lib/` folder; the raw minute count stays in the API.
4. **The marker.** A flagged assignment carries a `Badge` **with text** ("No estimate", "No due date") — never colour alone (EP04's AC-E04-08 convention and the invariants table's non-colour-only rule).
5. **The warning wording.** The three categories map to three student-facing sentences, settled by the `ui-refiner`:
   - `NO_AVAILABLE_TIME` — there is no free study time in the coming week for this work;
   - `INSUFFICIENT_TIME_BEFORE_DEADLINE` — N minutes of this work do not fit before its deadline;
   - `OVERDUE` — this work was due on <date> and N minutes remain.
   None of them blames the student (EP08's principle).
6. **`ui-refiner` pass.** This story's row design, the section order on the page, the marker, the wording, the empty/loading/error states, the responsive behaviour and the keyboard behaviour are settled by the `ui-refiner` **before** implementation, and this file is amended in place by that pass.

### Risks / open questions (none blocking)

- **The confirmed minutes read `0` until EP07A lands (D06-07, V-07-3).** The section shows `0` — an honest value, since no study time can be logged today — and the `unattributedConfirmedMinutes` total is not surfaced as a separate line in this story (it is a diagnostic, not a student-facing number). If the `ui-refiner` pass judges that the total deserves a line, it is a copy decision, not an API change.
- **The remaining-work list grows with the student's coursework.** A student with thirty unfinished assignments gets a long list. The cap + "see all" convention of EP05's dashboard is a precedent, but the epic asks for no cap here; the `ui-refiner` may settle one, and a cap would need a full list behind it.
- **This section overlaps EP08's "unfinished-work recovery summary".** EP08 owns the *recovery* workflow; this section is the current remaining work only, and it must not grow into a catch-up surface (the epic's scope, and EP08's dependency on EP06).

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled — the section takes no user input; the read's error state is rendered (the API's own validation is EP06B's).
3. Academic data is scoped to the authenticated student — the endpoint is scoped server-side (EP06B); the client sends no user id.
4. API errors produce actionable messages — the error state renders a readable message through the shared `getErrorMessage` helper.
5. Loading, empty and error states are handled — the loading state, the calm empty state and the error state for both sections.
6. Core interactions support keyboard accessibility — every control and link is a native element with a visible focus ring and an accessible name; the markers are text, not colour.
7. Responsive layouts work on desktop and mobile — the sections are usable at 375px and at desktop widths.
8. Business rules have automated tests — the two component test files and the page test additions (TR-E06-07).
9. API changes are documented — not applicable in this story (no API change); the payloads are EP06B's/EP06D's and live in the parent README.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the student can see, on the plan page, how much work is left on each assignment, which assignments cannot be scheduled and why, and how much work does not fit before a deadline — in calm, factual wording that marks the problem instead of blaming the student.

- **Request/token estimate:** 1 request/token — a client call, two sections, a minutes-formatting helper, the mount into the existing page and three test files. The uncertainty is the copy and the row design, which the `ui-refiner` settles.
- **Model recommendation:** 2 — two list sections over settled payload shapes, using the app's existing empty-state, badge and formatting patterns. A value-tier model can carry it out once the `ui-refiner` has settled the copy and the row design.
- **Files:**
  - `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (modify — the remaining-work call);
  - `apps/web/src/entities/study-plan/model/types.ts` (modify — the remaining-work types);
  - `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` (new);
  - `apps/web/src/features/study-plan/ui/RemainingWorkSection.test.tsx` (new);
  - `apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx` (new);
  - `apps/web/src/features/study-plan/ui/WorkloadWarnings.test.tsx` (new);
  - `apps/web/src/features/study-plan/lib/formatMinutes.ts` (new — the shared hours-and-minutes formatter);
  - `apps/web/src/pages/plan/ui/PlanPage.tsx` (modify — mount the two sections).
- **Start context:** this story file; the parent README's shared API/data contract → the `RemainingWorkItem` payload, the `PlanPreview` payload's `warnings`/`deferred`, and the decision register (D06-2, D06-7, D06-10, D06-11, D06-15); EP06B's story file (the read endpoint); EP06F's story file (the page this story extends and its layout conventions); `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.tsx` and `dashboardEmptyStates.tsx` (the list-section and empty-state precedents); `apps/web/src/shared/ui/Badge.tsx` and `EmptyState.tsx`; `apps/web/src/shared/lib/datetime.ts`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter web test -- RemainingWork` and `pnpm --filter web test -- WorkloadWarnings` (the component tests); `pnpm --filter web test` (the whole web suite); `pnpm --filter web typecheck`; `pnpm --filter web lint`; a manual browser pass at a 375px viewport and with the keyboard only (recorded as part of TR-E06-09's evidence).
- **Dependencies / exclusions:** EP06B implemented (the read) and EP06F implemented (the host page). Excludes the remaining-work calculation (EP06B), the preview and the editing (EP06F), the preferences surface (EP06E), EP08's catch-up workflow, and the calendar read model (D06-18).

## UI/UX gaps for the `ui-refiner`

**This story needs a `ui-refiner` pass before implementation (D06-15).** The gaps, recorded here so the pass can settle them:

1. **The remaining-work row's content and order.** Which fields the row shows and in which order (title, course, due date, estimate, confirmed, remaining); whether the remaining minutes lead the row; how a long title is handled.
2. **The marker.** The wording of the `MISSING_ESTIMATE` and `MISSING_DUE_DATE` markers, their placement in the row, and whether the estimate/remaining cells read "not set" or show an em dash.
3. **The section's position on the page.** Whether the remaining-work list sits above or below the week, and how the two sections relate visually (they answer different questions: "what is planned" versus "what is left").
4. **The warning wording.** The three sentences for the three categories, the deferred list's wording, and whether the warnings are shown before a plan is generated (the warnings only exist after a preview — the empty state must say so calmly).
5. **The units.** How the minutes are rendered ("3 h 20 min", "3h 20m", "200 minutes"), and whether a day-level or week-level total is shown.
6. **The scale.** Whether the list is capped with a "see all" affordance (EP05's dashboard precedent) or shows every item.
7. **The empty, loading and error copy.** The exact wording for the calm empty states (nothing unfinished, nothing to schedule), the loading state and the error state.
8. **The responsive behaviour.** The row layout at 375px (a stacked row versus a truncated row), the badge placement, and the touch-target sizes.
9. **The keyboard behaviour.** The tab order across the sections, whether the list is a semantic list, and the focus behaviour after a section's data loads.
