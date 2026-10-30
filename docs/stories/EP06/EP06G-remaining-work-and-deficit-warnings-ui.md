# EP06G: Remaining-Work & Deficit-Warning Surfaces

**Story ID:** EP06G
**Title:** Frontend — the remaining-work list and the workload-deficit warnings on the study-plan page
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** Needs refinement — `ui-refiner` pass complete (2026-10-30); technical refinement pending before implementation (D06-15).
**Dependencies:** EP06B implemented (the `GET /study-plans/remaining-work` read) and EP06F implemented (the plan page that hosts the two sections).
**Jira key:** Pending creation
**Refined:** 2026-10-30 (ui-refiner pass). Technical refinement satisfied by the planner's breakdown and the shared contract (D06-15).

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
- **Decisions:** D06-2 (one assignment's work spread across sessions), D06-7 (the unattributed confirmed minutes), D06-10 (the overdue report), D06-11 (the three deficit categories and the deferred list), D06-15 (this story's `Needs refinement` status), D06-24 (the due date is a profile-zone civil date at every EP06 boundary); and the parent README's **Shared API/data contract** → *The study-preferences shape* is not involved here; the relevant parts are the `RemainingWorkItem` payload, the `PlanPreview` payload's `warnings` and `deferred`, *The window, the dates and the time representation* and *The engine's rules* 6–9.

## Acceptance criteria

1. The plan page shows a remaining-work section with one row per unfinished assignment: its title, its course (when it has one), its due date, its estimate, its confirmed study time and its remaining minutes; the confirmed time is shown as `0` when nothing has been confirmed (D06-7), not as a missing value. The due date is the **profile zone's civil date** the API returns (a `YYYY-MM-DD` string, D06-24) and is rendered as that date — the client never re-anchors it to an instant and re-renders it in another zone (the calendar page's recorded lesson).
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
  - the error state renders a readable message with a "Try again" button that re-runs the read;
  - the marker is not colour-only (it carries text);
  - **(ui-refiner)** the summary line renders `<total> of work left` when at least one item has a numeric `remainingMinutes`, and is omitted when every item is flagged;
  - **(ui-refiner)** a loading skeleton is shown before the read resolves and does not flash "0 items";
  - **(ui-refiner)** the due date is rendered verbatim as the `YYYY-MM-DD` string the API returned (no zone shift);
  - **(ui-refiner)** at a 375px viewport the rows stack and the badge wraps rather than truncating the title.
- `apps/web/src/features/study-plan/ui/WorkloadWarnings.test.tsx` (new) — the component tests:
  - each warning category renders with its assignment and its minutes;
  - the deferred list renders separately from the warnings, under the `Continues in a later plan` heading;
  - the empty state renders when there are neither warnings nor deferred work;
  - the error state renders a readable message when `errorMessage` is supplied;
  - **(ui-refiner)** the three category sentences match the settled wording (no blame, factual);
  - **(ui-refiner)** before a preview exists the empty state reads `Generate a plan to see what doesn't fit before a deadline.`;
  - **(ui-refiner)** when a preview produced no warnings/deferred the empty state reads `Everything fits in this week.`;
  - **(ui-refiner)** the deferred row reads `<title> — <minutes>`.
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
3. **The minutes are formatted, not printed raw.** The remaining minutes and the warning minutes are rendered as hours and minutes (`3 h 20 min`, `45 min`) through a shared helper in the feature's `lib/` folder; the raw minute count stays in the API. **The due date is rendered as the civil date the API returned** (`YYYY-MM-DD` → the student's date) — the client does not convert it to an instant and back, and it does not shift it into the browser's zone (D06-24); the page states the profile zone so the date is unambiguous.
4. **The marker.** A flagged assignment carries a `Badge` **with text** ("No estimate", "No due date") — never colour alone (EP04's AC-E04-08 convention and the invariants table's non-colour-only rule).
5. **The warning wording.** The three categories map to three student-facing sentences, settled by the `ui-refiner`:
   - `NO_AVAILABLE_TIME` — there is no free study time in the coming week for this work;
   - `INSUFFICIENT_TIME_BEFORE_DEADLINE` — N minutes of this work do not fit before its deadline;
   - `OVERDUE` — this work was due on <date> and N minutes remain.
   None of them blames the student (EP08's principle).
6. **`ui-refiner` pass.** This story's row design, the section order on the page, the marker, the wording, the empty/loading/error states, the responsive behaviour and the keyboard behaviour are settled by the `ui-refiner` **before** implementation, and this file is amended in place by that pass.

### UI/UX specification (ui-refiner pass, 2026-10-30)

**Element decisions**

- **Reuse** `Card` for each section container; `Badge` (with text) for the flagged marker; `EmptyState` for both calm empty states; `Button` (`variant="outline"`, `size="sm"`) for "Try again"; `getErrorMessage` for the error state; the shared `twMerge`/`clsx` token classes for layout.
- **Reuse** the civil-date rendering rule from `PlanWeek.formatDateLabel` (UTC-midnight derivation, no browser clock) for the due date — it is rendered as the `YYYY-MM-DD` string the API returns, with the weekday derived in UTC, and the section labels the profile zone so the date is unambiguous (D06-24).
- **New** `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (modify) — `listRemainingWork(): Promise<RemainingWorkResponse>` → `GET /study-plans/remaining-work`, unwrapping `{ items, unattributedConfirmedMinutes }`.
- **New** `apps/web/src/entities/study-plan/model/types.ts` (modify) — `RemainingWorkItem`, `RemainingWorkResponse`, `RemainingWorkFlag` (`null | 'MISSING_ESTIMATE' | 'MISSING_DUE_DATE'`), `PlanWarning` (the preview's warning shape, narrowed from the loose `PlanPreviewWarning`), `PlanDeferred`.
- **New** `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` — owns its own fetch on mount, its own loading/empty/error/data states; renders one row per item; no props beyond an optional `className`.
- **New** `apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx` — pure presentational: takes `warnings`, `deferred` and an optional `errorMessage`; renders the three categories, the deferred list and the calm empty state.
- **New** `apps/web/src/features/study-plan/lib/formatMinutes.ts` — `formatMinutes(total): string` returning `"3 h 20 min"`, `"45 min"`, `"0 min"`; used by both sections and their tests.
- **New** `apps/web/src/pages/plan/ui/PlanPage.tsx` (modify) — mounts `RemainingWorkSection` above the week view and `WorkloadWarnings` below it, passing `preview?.warnings` / `preview?.deferred` (and `previewError` as the optional error).
- **No new primitive.** No dialog, no new shared component, no chart. `Badge` carries text; colour is never the only signal (EP04 AC-E04-08).

**Layout & hierarchy**

- Page order on `/plan` (top → bottom): page heading + generate/save controls; **Remaining work** section; the week view (preview or saved); **Workload warnings** section. Remaining work leads because it is available on mount and frames the plan ("what is left"); warnings follow the week because they are a property of a preview.
- Remaining-work section (`Card`, `p-4 sm:p-6`):
  - Heading: `Remaining work` (`h2`, `text-lg font-semibold text-text`), with a one-line sub-caption: `How much is left on each assignment.` (`text-sm text-text-muted`).
  - A single summary line above the list (when items exist): `<total> of work left` (e.g. `3 h 20 min of work left`), `text-sm text-text-muted`.
  - The list is a semantic `<ul>` of rows. Each row is a `<li>` with a two-line layout:
    - Line 1: the assignment title (`text-sm font-medium text-text`, truncated with `truncate` + `title` attribute for the full text) and, when present, the course code as a muted inline label `· <courseCode>`; the flagged `Badge` sits at the end of line 1.
    - Line 2 (a `flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted` row): due date (`Due <date>` or `No due date`), then `Estimate <value>`, `Confirmed <value>`, `Left <value>`. For a flagged item the estimate/remaining cells read `not set` (text, not an em dash); the confirmed cell still reads `0` when nothing is confirmed (D06-7).
  - Rows are separated by `divide-y divide-border`; each row has `py-3`.
- Workload-warnings section (`Card`, `p-4 sm:p-6`):
  - Heading: `Workload warnings` (`h2`, `text-lg font-semibold text-text`), sub-caption: `Work that does not fit before a deadline.` (`text-sm text-text-muted`).
  - Warnings render as a `<ul>` of alert-style rows (border-l-4, `border-warning/60`, `bg-warning/5`) — factual, not punitive. Each row: the assignment title (`text-sm font-medium text-text`), then the category sentence (`text-sm text-text`), then `N min` (`text-xs text-text-muted`). Due date, when present, is shown as `due <date>`.
  - The deferred list renders as a separate `<ul>` beneath the warnings, headed by a small `h3` `Continues in a later plan` (`text-xs font-semibold text-text-muted uppercase tracking-wide`), with rows `text-sm text-text-muted`: `<title> — <minutes>`.

**States**

- **Remaining work — loading:** render the `Card` with a skeleton: three rows of `h-4 animate-pulse rounded bg-surface-muted` placeholders inside `space-y-3`, plus `aria-busy="true"` on the section. Never render "0 items" before the read resolves.
- **Remaining work — empty (no unfinished assignments):** `EmptyState` with title `Nothing left to do.` and description `Every assignment is finished or has no remaining work.` No action button (there is no action to take — AC 6).
- **Remaining work — error:** a `role="alert"` block inside the card (`border border-danger/30 bg-danger/10 p-4`) with `We could not load your remaining work. Try again.` and a "Try again" button that re-runs `GET /study-plans/remaining-work`.
- **Workload warnings — empty (no warnings and no deferred):** `EmptyState` with title `Nothing to report.` and description `Generate a plan to see what doesn't fit before a deadline.` No action button. (When a preview exists but produced no warnings/deferred, the description reads `Everything fits in this week.`)
- **Workload warnings — before a preview:** the same empty state with the "Generate a plan…" description (calm, not an error).
- **Workload warnings — error:** when an `errorMessage` is supplied, render a `role="alert"` block with the message and no list.

**Accessibility**

- The remaining-work list is a semantic `<ul>`/`<li>`; each row's marker `Badge` carries its text ("No estimate" / "No due date") and is not colour-only (the badge variant `warning` is accompanied by the word).
- The due date is the civil string the API returned; it is never re-anchored to an instant and re-rendered in another zone (D06-24). The section's `aria-label` states the profile zone when it is known (the page passes `timeZone` from the preview/saved plan; when absent, the label is `Remaining work`).
- Keyboard: every "Try again" button is a native `Button` with a visible focus ring; the list itself has no interactive rows (no false affordances). Tab order follows DOM order: remaining-work "Try again" → week controls → warnings (none interactive). Focus is not moved programmatically after the fetch resolves; the outcome is announced by the `role="alert"`/`role="status"` region where applicable.
- Non-colour-only: flagged rows carry the text badge **and** the "not set" cells; warnings use the warning border **plus** the sentence; the empty states use text only.
- Reduced motion: the skeleton uses `motion-reduce:animate-none`; no other animation.
- Touch targets: "Try again" uses `max-sm:min-h-[44px]`; rows are not tappable.

**Responsive**

- Mobile (<640px): the remaining-work row stacks — title on line 1, the due/minute cells wrap to multiple lines (`flex-wrap`); the badge wraps to the next line rather than truncating the title. The section padding drops to `p-4`.
- `sm:` and up: title and badge share line 1; the minute cells sit on one line.
- The warnings rows are single-column at all widths; the deferred list is single-column.
- Both sections inherit the page container (`max-w-5xl`) and never exceed the week view's width.

**Copy (concrete)**

- Remaining-work heading: `Remaining work`
- Remaining-work sub-caption: `How much is left on each assignment.`
- Summary line: `<total> of work left` (e.g. `3 h 20 min of work left`) — only when at least one item has a numeric `remainingMinutes`; omitted entirely when all items are flagged.
- Row cells: `Due <YYYY-MM-DD>` or `No due date`; `Estimate <value>`; `Confirmed <value>`; `Left <value>`, where `<value>` is `formatMinutes(n)` or the literal `not set` (estimate/remaining) or `0 min`-formatted `0` (confirmed, via `formatMinutes(0)` → `0 min`).
- Flagged badges: `No estimate` (`MISSING_ESTIMATE`), `No due date` (`MISSING_DUE_DATE`).
- Empty (nothing unfinished): title `Nothing left to do.` / description `Every assignment is finished or has no remaining work.`
- Error: `We could not load your remaining work. Try again.` / button `Try again`
- Loading: no text (skeleton only).
- Warnings heading: `Workload warnings`
- Warnings sub-caption: `Work that does not fit before a deadline.`
- Category sentences (calm, blame-free, factual):
  - `NO_AVAILABLE_TIME`: `No free study time this week for "<title>" — <minutes> of work remain.`
  - `INSUFFICIENT_TIME_BEFORE_DEADLINE`: `<minutes> of "<title>" do not fit before its <dueDate> deadline.`
  - `OVERDUE`: `"<title>" was due on <dueDate> and <minutes> remain.`
- Deferred heading: `Continues in a later plan`
- Deferred row: `<title> — <minutes>`
- Warnings empty (preview exists, nothing to report): title `Nothing to report.` / description `Everything fits in this week.`
- Warnings empty (no preview yet): title `Nothing to report.` / description `Generate a plan to see what doesn't fit before a deadline.`
- Warnings error: the supplied message (defaults to `We could not load the workload warnings. Try again.`).

### Decisions

- **Section order:** Remaining work above the week view; Workload warnings below it. (ui-refiner, 2026-10-30)
- **Scale:** show every unfinished assignment; no cap, no "See all" (the epic asks for no cap and there is no full-list destination). (ui-refiner, 2026-10-30)
- **Units:** minutes render as `"<h> h <m> min"` (e.g. `3 h 20 min`, `45 min`, `0 min`) via `formatMinutes`; a one-line summary `<total> of work left` sits above the list and is omitted when no item has a numeric `remainingMinutes`. (ui-refiner, 2026-10-30)
- **Flagged marker:** `Badge` (variant `warning`) with the text `No estimate` / `No due date`, placed at the end of the title line; estimate and remaining cells read the literal `not set` (not `0`, not an em dash); the confirmed cell always renders `formatMinutes(confirmedMinutes)` (`0 min` when nothing is confirmed, per D06-7). (ui-refiner, 2026-10-30)
- **Row content & order:** title (truncated, full text via `title`) + course code (when present) on line 1; due date, estimate, confirmed, remaining on a wrapping line 2 in that order; remaining is not promoted above the title. (ui-refiner, 2026-10-30)
- **Due date rendering:** the civil `YYYY-MM-DD` string the API returns, rendered as-is with a UTC-derived weekday and labelled with the profile zone; never re-anchored to an instant (D06-24). (ui-refiner, 2026-10-30)
- **Warning wording:** three calm, blame-free, factual sentences per category (above); the deferred list is a separate `<ul>` headed `Continues in a later plan` with rows `<title> — <minutes>`; deferred work is never called a warning. (ui-refiner, 2026-10-30)
- **Warnings availability:** warnings only exist after a preview; before one, the section shows the calm empty state with `Generate a plan to see what doesn't fit before a deadline.` — never an error. (ui-refiner, 2026-10-30)
- **Empty states:** both are calm and factual and offer no action that does not exist (remaining work: `Nothing left to do.`; warnings: `Nothing to report.`). (ui-refiner, 2026-10-30)
- **Loading state:** skeleton rows for remaining work (no "0 items" flash); no spinner text. (ui-refiner, 2026-10-30)
- **Error state:** `role="alert"` block with a "Try again" button that re-runs the read (remaining work); warnings surface an `errorMessage` prop when supplied. (ui-refiner, 2026-10-30)
- **Responsive:** rows stack and wrap below 640px; badge wraps rather than truncating the title; both sections inherit the page container width. (ui-refiner, 2026-10-30)
- **Keyboard:** no interactive rows; only the "Try again" buttons are focusable, each with a visible focus ring; tab order follows DOM order; no programmatic focus movement after load. (ui-refiner, 2026-10-30)
- **Assumption (total):** the summary total sums only items whose `remainingMinutes` is a number; flagged items contribute 0 and, when every item is flagged, the summary line is omitted rather than showing `0 min of work left`. (ui-refiner, 2026-10-30)
- **Assumption (WorkloadWarnings error prop):** the component accepts an optional `errorMessage`; when present it renders the alert and no list, so the error path is unit-testable without a fetch. The page passes `previewError` through it (the top-level preview-error card remains as the generate-action surface). (ui-refiner, 2026-10-30)
- **Assumption (no cap):** the list renders every item and scrolls with the page; no virtualisation, no pagination. (ui-refiner, 2026-10-30)

### Risks / open questions (none blocking)

- **The confirmed minutes read `0` until EP07A lands (D06-7, V-07-3).** The section shows `0` — an honest value, since no study time can be logged today — and the `unattributedConfirmedMinutes` total is not surfaced as a separate line in this story (it is a diagnostic, not a student-facing number; settled by the ui-refiner pass).
- **The remaining-work list grows with the student's coursework.** A student with thirty unfinished assignments gets a long list. Settled by the ui-refiner pass: no cap and no "See all" — the list renders every item and scrolls with the page (no virtualisation, no pagination); a cap would need a full-list destination that does not exist.
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

All nine gaps recorded for this pass are settled — see Technical Notes → **UI/UX specification (ui-refiner pass)** and **Decisions** above. No open UI/UX question remains for this story.
